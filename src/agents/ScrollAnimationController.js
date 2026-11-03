import { AGENT_DEFS, CONFIG } from './AnimationConfig.js'
import { CursorAgent } from './CursorAgent.js'
import { CursorRenderer } from './CursorRenderer.js'
import { DOMInspector } from './DOMInspector.js'
import { AnimationTaskQueue } from './AnimationTaskQueue.js'

/**
 * Orchestrates everything: section observation, task generation, the single
 * shared animation loop, controls and cleanup.
 *
 * `state` is a plain (or Vue-reactive) object the UI can bind to:
 *   { enabled, paused, mode: 'auto'|'all', trails, built, total, section }
 */
export class ScrollAnimationController {
  constructor({ canvas, root, state, config = CONFIG }) {
    this.canvas = canvas
    this.root = root || document.querySelector('main') || document.body
    this.state = state
    this.config = { ...config }

    this.inspector = new DOMInspector(this.config)
    this.queue = new AnimationTaskQueue()
    this.renderer = new CursorRenderer(canvas, this.config)
    this.agents = AGENT_DEFS.map((def, i) => new CursorAgent(def, i, this.config))

    this.raf = 0
    this.lastNow = 0
    this.hidden = false
    this.observer = null
    this.mutation = null
    this.rescanTimer = 0
    this.vw = 0
    this.vh = 0
    this.isMobile = false

    this.onScroll = () => {
      this.inspector.dirty = true
    }
    this.onResize = () => this.resize()
    this.onVisibility = () => {
      this.hidden = document.hidden
      if (this.hidden) this.stopLoop()
      else this.startLoop()
    }
  }

  /* ----- lifecycle ----- */

  init() {
    this.resize()
    this.inspector.scan(this.root)
    this.agents.forEach((a) => a.place(this.vw, this.vh))
    this.state.total = this.inspector.total
    this.state.built = 0

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const sec = this.inspector.sections.get(e.target.dataset.agentSection)
          if (!sec) continue
          sec.visible = e.isIntersecting
          if (e.isIntersecting && sec.status === 'idle') this.triggerSection(sec)
        }
      },
      { threshold: this.config.sectionThreshold },
    )
    for (const sec of this.inspector.sections.values()) this.observer.observe(sec.el)

    // Components that re-render (filters, async chunks) register themselves via a debounced rescan.
    this.mutation = new MutationObserver(() => {
      clearTimeout(this.rescanTimer)
      this.rescanTimer = setTimeout(() => this.rescan(), 120)
    })
    this.mutation.observe(this.root, { childList: true, subtree: true })

    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)

    // Canvas text uses the site's monospace font; make sure it is ready.
    document.fonts?.load?.(this.renderer.fontMono).catch(() => {})

    // The hero builds immediately on load.
    const hero = this.inspector.sections.get('hero')
    if (hero) this.triggerSection(hero)

    this.startLoop()
  }

  destroy() {
    this.stopLoop()
    this.observer?.disconnect()
    this.mutation?.disconnect()
    clearTimeout(this.rescanTimer)
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.inspector.buildAll()
  }

  resize() {
    this.vw = window.innerWidth
    this.vh = window.innerHeight
    this.isMobile = this.vw < this.config.mobileBreakpoint
    this.config.trailLength = this.isMobile ? CONFIG.trailLengthMobile : CONFIG.trailLength
    this.renderer.resize(this.vw, this.vh)
    this.inspector.setViewport(this.vw, this.vh)
    for (const a of this.agents) {
      a.anchor.x = Math.min(a.anchor.x, this.vw - 24)
      a.anchor.y = Math.min(a.anchor.y, this.vh - 24)
    }
  }

  rescan() {
    this.inspector.scan(this.root)
    for (const sec of this.inspector.sections.values()) {
      if (!this.observerHas(sec.el)) this.observer?.observe(sec.el)
    }
    this.state.total = this.inspector.total
  }

  observerHas() {
    // IntersectionObserver has no "is observed" API; observing twice is a no-op.
    return false
  }

  /* ----- sections and tasks ----- */

  triggerSection(sec, force = false) {
    if (force) this.inspector.collapseSection(sec)
    if (sec.status === 'running') return
    const todo = sec.items.filter((it) => it.status === 'collapsed')
    if (!todo.length) {
      sec.status = 'done'
      return
    }
    sec.status = 'running'
    sec.startedAt = performance.now()
    this.state.section = sec.id
    let remaining = todo.length
    todo.forEach((item) => {
      item.status = 'queued'
      item.queuedAt = performance.now()
      this.queue.enqueue({
        type: 'build',
        item,
        sectionId: sec.id,
        onDone: () => {
          remaining--
          if (remaining <= 0) sec.status = 'done'
          this.state.built = this.inspector.builtCount
        },
      })
    })
  }

  /** Section nearest the middle of the viewport. */
  currentSection() {
    let best = null
    let bestD = Infinity
    const mid = this.vh / 2
    for (const sec of this.inspector.sections.values()) {
      const r = sec.el.getBoundingClientRect()
      const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0
      if (d < bestD) {
        bestD = d
        best = sec
      }
    }
    return best
  }

  /* ----- controls ----- */

  replaySection() {
    const sec = this.currentSection()
    if (!sec) return
    this.abandonTasksFor(sec)
    this.triggerSection(sec, true)
    this.resume()
  }

  replayAll() {
    this.queue.cancelAll()
    for (const a of this.agents) a.task && a.finish(performance.now(), this.queue, a.task, true)
    for (const sec of this.inspector.sections.values()) this.inspector.collapseSection(sec)
    this.state.built = 0
    const hero = this.inspector.sections.get('hero')
    if (hero) this.triggerSection(hero)
    const cur = this.currentSection()
    if (cur && cur !== hero) this.triggerSection(cur)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    this.resume()
  }

  abandonTasksFor(sec) {
    this.queue.pending = this.queue.pending.filter((t) => t.sectionId !== sec.id)
    for (const a of this.agents) {
      if (a.task && a.task.sectionId === sec.id) a.finish(performance.now(), this.queue, a.task, true)
    }
  }

  pause() {
    this.state.paused = true
    this.stopLoop()
    this.renderer.clear()
  }

  resume() {
    if (!this.state.enabled) return
    this.state.paused = false
    this.lastNow = 0
    this.startLoop()
  }

  setMode(mode) {
    this.state.mode = mode
    this.inspector.dirty = true
  }

  setTrails(on) {
    this.state.trails = on
    if (!on) for (const a of this.agents) a.trail.length = 0
  }

  setEnabled(on) {
    this.state.enabled = on
    if (!on) {
      this.stopLoop()
      this.queue.cancelAll()
      for (const a of this.agents) a.task && a.finish(performance.now(), this.queue, a.task, true)
      this.inspector.buildAll()
      this.state.built = this.inspector.builtCount
      this.renderer.clear()
    } else {
      this.state.paused = false
      this.startLoop()
    }
  }

  /* ----- the single shared loop ----- */

  startLoop() {
    if (this.raf || this.hidden || this.state.paused || !this.state.enabled) return
    this.lastNow = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  stopLoop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  tick = (now) => {
    this.raf = 0
    const dt = this.lastNow ? Math.min(0.05, (now - this.lastNow) / 1000) : 0.016
    this.lastNow = now

    const insp = this.inspector
    const mode = this.state.mode
    insp.measure(mode)
    this.housekeeping(now)

    const env = { inspector: insp, queue: this.queue, vw: this.vw, vh: this.vh }
    for (const a of this.agents) a.update(now, dt, env)

    // Elements being dragged must be re-measured: their rect does not change
    // (clip-path only), but the viewport may have scrolled since last frame.
    const r = this.renderer
    r.clear()

    for (const item of insp.items.values()) {
      if (!item.rect) continue
      if (mode === 'all') {
        if (insp.isInViewport(item)) r.drawSelection(insp.visualRect(item), { dragging: item.status === 'dragging', hovered: item.hovered })
        continue
      }
      if (item.status === 'built') {
        if (item.alpha > 0) {
          item.alpha = Math.max(0, item.alpha - dt * (1000 / this.config.fadeMs))
          if (item.alpha > 0) r.drawSelection(item.rect, { alpha: item.alpha })
        }
      } else if (item.status !== 'collapsed' || insp.isInViewport(item)) {
        r.drawSelection(insp.visualRect(item), { dragging: item.status === 'dragging', hovered: item.hovered })
      }
    }

    for (const a of this.agents) {
      if (this.state.trails) r.drawTrail(a, now)
      r.drawRipples(a, now)
    }
    for (const a of this.agents) r.drawCursor(a)

    this.raf = requestAnimationFrame(this.tick)
  }

  /** Safety valves so content never stays hidden. */
  housekeeping(now) {
    const insp = this.inspector
    const margin = this.vh * this.config.offscreenMargin
    // The visitor moved on: finish unclaimed work of sections that left the viewport.
    if (this.queue.pending.length) {
      const keep = []
      for (const t of this.queue.pending) {
        if (t.item.section.visible === false && t.item.status === 'queued') {
          insp.build(t.item, now)
          t.item.alpha = 0
          t.onDone?.()
        } else keep.push(t)
      }
      this.queue.pending = keep
    }
    for (const item of insp.items.values()) {
      if (item.status === 'built') continue
      const r = item.rect
      // Scrolled far past before the agents reached it: just build it.
      if (r && r.y + r.h < -margin) {
        insp.build(item, now)
        item.alpha = 0
        continue
      }
      // Stuck for too long (e.g. tab was hidden mid-task): build it.
      if (item.status !== 'collapsed' && item.queuedAt && now - item.queuedAt > this.config.staleTaskMs) {
        insp.build(item, now)
      }
    }
    // Sections whose items are all built are done.
    for (const sec of insp.sections.values()) {
      if (sec.status === 'running' && sec.items.every((it) => it.status === 'built')) sec.status = 'done'
    }
    this.state.built = insp.builtCount
  }
}
