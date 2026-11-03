import { LEAD_AGENTS, WORKER_COLORS, CONFIG } from './AnimationConfig.js'
import { CursorAgent } from './CursorAgent.js'
import { CursorRenderer } from './CursorRenderer.js'
import { DOMInspector } from './DOMInspector.js'
import { AnimationTaskQueue } from './AnimationTaskQueue.js'
import { rand } from './easing.js'

/**
 * Orchestrates the whole show on one requestAnimationFrame loop:
 * intro splash → hero wireframe build → scroll (or tour) through sections,
 * each wireframed and built by a growing swarm → finale gather on the deploy card.
 *
 * `state` is a reactive object the dock binds to:
 *   enabled, paused, phase ('intro'|'building'|'idle'|'finale'|'done'),
 *   mode ('auto'|'all'), tour, speed, trails, agents, built, total, elapsedMs, section
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
    this.agents = []

    this.raf = 0
    this.lastNow = 0
    this.hidden = false
    this.observer = null
    this.mutation = null
    this.rescanTimer = 0
    this.vw = 0
    this.vh = 0
    this.isMobile = false
    this.swarmTarget = { x: 0, y: 0 }
    this.orbit = { x: 0, y: 0, r: 120 }
    this.startedAt = 0
    this.finishedAt = 0
    this.tourTimer = 0
    this.introUntil = 0
    this.nextSectionAt = 0

    this.onScroll = () => {
      this.inspector.dirty = true
    }
    this.onUserScroll = () => {
      if (this.state.tour) this.setTour(false, true)
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
    this.state.total = this.inspector.total
    this.state.built = 0
    this.state.agents = 0

    const n = this.isMobile ? Math.min(8, this.config.initialAgents) : this.config.initialAgents
    for (let i = 0; i < n; i++) this.spawnAgent(true)

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const sec = this.inspector.sections.get(e.target.dataset.agentSection)
          if (!sec) continue
          sec.visible = e.isIntersecting
          if (e.isIntersecting && sec.status === 'idle' && this.state.phase !== 'intro') this.triggerSection(sec)
        }
      },
      { threshold: this.config.sectionThreshold },
    )
    for (const sec of this.inspector.sections.values()) this.observer.observe(sec.el)

    this.mutation = new MutationObserver(() => {
      clearTimeout(this.rescanTimer)
      this.rescanTimer = setTimeout(() => this.rescan(), 120)
    })
    this.mutation.observe(this.root, { childList: true, subtree: true })

    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('wheel', this.onUserScroll, { passive: true })
    window.addEventListener('touchmove', this.onUserScroll, { passive: true })
    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)
    document.fonts?.load?.(this.renderer.fontMono).catch(() => {})

    this.beginIntro()
    this.startLoop()
  }

  destroy() {
    this.stopLoop()
    clearTimeout(this.tourTimer)
    clearTimeout(this.rescanTimer)
    this.observer?.disconnect()
    this.mutation?.disconnect()
    window.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('wheel', this.onUserScroll)
    window.removeEventListener('touchmove', this.onUserScroll)
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
    this.swarmTarget = { x: this.vw / 2, y: this.vh / 2 }
  }

  rescan() {
    this.inspector.scan(this.root)
    for (const sec of this.inspector.sections.values()) this.observer?.observe(sec.el)
    this.state.total = this.inspector.total
    this.state.built = this.inspector.builtCount
  }

  spawnAgent(fromEdge) {
    const i = this.agents.length
    const def = i < LEAD_AGENTS.length ? LEAD_AGENTS[i] : { color: WORKER_COLORS[(i - LEAD_AGENTS.length) % WORKER_COLORS.length] }
    const a = new CursorAgent(def, i, this.config)
    if (fromEdge) {
      const side = i % 4
      a.place(
        side === 0 ? -30 : side === 1 ? this.vw + 30 : rand(0, this.vw),
        side === 2 ? -30 : side === 3 ? this.vh + 30 : rand(0, this.vh),
      )
    } else a.place(this.vw / 2, this.vh / 2)
    this.agents.push(a)
    this.state.agents = this.agents.length
    return a
  }

  growSwarm() {
    const cap = this.isMobile ? Math.min(16, this.config.maxAgents) : this.config.maxAgents
    for (let i = 0; i < this.config.agentsPerSection && this.agents.length < cap; i++) this.spawnAgent(true)
  }

  /* ----- choreography ----- */

  beginIntro() {
    const now = performance.now()
    this.startedAt = now
    this.state.phase = 'intro'
    this.state.elapsedMs = 0
    this.introUntil = now + this.config.introMs
    this.swarmTarget = { x: this.vw / 2, y: this.vh / 2 }
  }

  endIntro() {
    this.state.phase = 'building'
    const hero = this.inspector.sections.get('hero')
    if (hero) this.triggerSection(hero)
    for (const sec of this.inspector.sections.values()) {
      if (sec.visible && sec.status === 'idle') this.triggerSection(sec)
    }
  }

  triggerSection(sec, force = false) {
    if (force) this.inspector.collapseSection(sec)
    if (sec.status === 'running') return
    const todo = sec.items.filter((it) => it.status === 'collapsed')
    if (!todo.length) {
      sec.status = 'done'
      return
    }
    sec.status = 'running'
    this.state.section = sec.id
    this.state.phase = 'building'
    if (sec.id !== 'hero') this.growSwarm()
    // Frames and media first, then the layers inside them, in DOM order.
    const ordered = [...todo.filter((it) => it.kind !== 'layer'), ...todo.filter((it) => it.kind === 'layer')]
    let remaining = ordered.length
    for (const item of ordered) {
      item.status = 'queued'
      item.queuedAt = performance.now()
      this.queue.enqueue({
        item,
        sectionId: sec.id,
        onDone: () => {
          remaining--
          if (remaining <= 0) this.sectionDone(sec)
        },
      })
    }
  }

  sectionDone(sec) {
    sec.status = 'done'
    this.state.built = this.inspector.builtCount
    const all = [...this.inspector.sections.values()].every((s) => s.status === 'done')
    if (all && this.state.phase !== 'done') {
      this.finishedAt = performance.now()
      this.state.elapsedMs = this.finishedAt - this.startedAt
      this.state.phase = 'done'
      this.gather()
      return
    }
    if (this.state.tour) this.scheduleTourStep()
  }

  /** Tour: once a section is built, glide to the next one. */
  scheduleTourStep() {
    clearTimeout(this.tourTimer)
    this.tourTimer = setTimeout(() => {
      if (!this.state.tour || !this.state.enabled || this.state.paused) return
      const next = [...this.inspector.sections.values()].sort((a, b) => a.order - b.order).find((s) => s.status === 'idle')
      if (!next) return
      this.programmaticScroll = true
      next.el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => (this.programmaticScroll = false), 900)
    }, this.config.tourPauseMs / (this.state.speed || 1))
  }

  /** Finale: every agent gathers on the deploy card and clicks it. */
  gather() {
    const el = this.inspector.finaleEl
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > this.vh) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => this.gather(), 700)
      return
    }
    this.orbit = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.max(r.width, r.height) / 2 + 24 }
    this.state.phase = 'finale'
    el.classList.add('is-gathered')
    clearTimeout(this.tourTimer)
    this.tourTimer = setTimeout(() => {
      el.classList.remove('is-gathered')
      if (this.state.phase === 'finale') this.state.phase = 'done'
    }, this.config.finaleOrbitMs)
  }

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
    this.state.phase = 'building'
    this.triggerSection(sec, true)
    this.resume()
  }

  replayAll() {
    clearTimeout(this.tourTimer)
    this.queue.cancelAll()
    for (const a of this.agents) a.task && a.finish(performance.now(), this.queue, a.task, true)
    for (const sec of this.inspector.sections.values()) this.inspector.collapseSection(sec)
    this.inspector.finaleEl?.classList.remove('is-gathered')
    this.state.built = 0
    this.finishedAt = 0
    window.scrollTo({ top: 0, behavior: 'auto' })
    this.inspector.dirty = true
    this.resume()
    this.beginIntro()
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
    this.startLoop()
  }

  setMode(mode) {
    this.state.mode = mode
    this.inspector.dirty = true
  }

  setTour(on, byUser = false) {
    this.state.tour = on
    clearTimeout(this.tourTimer)
    if (on && this.state.phase !== 'intro') {
      const cur = this.currentSection()
      if (cur && cur.status === 'done') this.scheduleTourStep()
    }
    if (!on && byUser) this.state.tourStoppedByUser = true
  }

  setSpeed(s) {
    this.state.speed = s
  }

  setTrails(on) {
    this.state.trails = on
    if (!on) for (const a of this.agents) a.trail.length = 0
  }

  /** "Go live": stop the show and present the finished page. */
  goLive() {
    this.setEnabled(false)
  }

  setEnabled(on) {
    this.state.enabled = on
    if (!on) {
      this.stopLoop()
      clearTimeout(this.tourTimer)
      this.queue.cancelAll()
      for (const a of this.agents) a.task && a.finish(performance.now(), this.queue, a.task, true)
      this.inspector.buildAll()
      this.inspector.finaleEl?.classList.remove('is-gathered')
      this.state.built = this.inspector.builtCount
      this.state.phase = 'off'
      this.renderer.clear()
    } else {
      this.state.paused = false
      this.state.phase = 'idle'
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
    const st = this.state
    const insp = this.inspector
    const mode = st.mode

    if (st.phase === 'intro' && now >= this.introUntil) this.endIntro()
    if (st.phase === 'building' || st.phase === 'intro') st.elapsedMs = now - this.startedAt

    insp.measure(mode)
    this.housekeeping(now)
    this.updateSwarmTarget()

    const env = {
      inspector: insp,
      queue: this.queue,
      agents: this.agents,
      vw: this.vw,
      vh: this.vh,
      isMobile: this.isMobile,
      speed: st.speed || 1,
      swarmTarget: this.swarmTarget,
      orbit: this.orbit,
      mode: st.phase === 'finale' ? 'orbit' : 'work',
      frozen: st.phase === 'intro',
    }
    for (const a of this.agents) a.update(now, dt, env)

    const r = this.renderer
    r.clear()
    this.drawSkeletons(now, dt, mode)
    for (const a of this.agents) {
      if (st.trails) r.drawTrail(a, now)
      r.drawRipples(a, now)
    }
    for (const a of this.agents) r.drawCursor(a, !a.label)

    this.raf = requestAnimationFrame(this.tick)
  }

  updateSwarmTarget() {
    const st = this.state
    if (st.phase === 'intro') {
      this.swarmTarget = { x: this.vw / 2, y: this.vh / 2 }
      return
    }
    // Hover around the section being built, else the middle of the viewport.
    let sec = null
    for (const s of this.inspector.sections.values()) if (s.status === 'running' && s.rect) sec = sec || s
    if (sec) {
      const top = Math.max(0, sec.rect.y)
      const bottom = Math.min(this.vh, sec.rect.y + sec.rect.h)
      this.swarmTarget = { x: this.vw * 0.55, y: (top + bottom) / 2 }
    } else this.swarmTarget = { x: this.vw * 0.55, y: this.vh * 0.5 }
  }

  drawSkeletons(now, dt, mode) {
    const insp = this.inspector
    const r = this.renderer
    const fadeStep = dt * (1000 / this.config.fadeMs)
    for (const sec of insp.sections.values()) {
      if (!sec.rect || !insp.isInViewport(sec.rect)) continue
      for (const item of sec.items) {
        if (!item.rect || !insp.isInViewport(item.rect)) continue
        const building = item.status !== 'built'
        if (mode === 'all') {
          if (item.kind === 'layer') r.drawLayerSkeleton(item.rect, { alpha: 0.9, hovered: item.hovered, pressed: item.status === 'dragging' })
          else r.drawFrame(insp.visualRect(item), { dragging: item.status === 'dragging', hovered: item.hovered, fill: false })
          continue
        }
        if (!building) {
          if (item.alpha > 0) {
            item.alpha = Math.max(0, item.alpha - fadeStep)
            if (item.alpha > 0) {
              if (item.kind === 'layer') r.drawLayerSkeleton(item.rect, { alpha: item.alpha * 0.6 })
              else r.drawFrame(item.rect, { alpha: item.alpha, fill: false })
            }
          }
          continue
        }
        if (item.kind === 'layer') {
          r.drawLayerSkeleton(item.rect, {
            hovered: item.hovered,
            pressed: item.status === 'dragging' || item.status === 'popping',
            cross: item.cross,
          })
        } else {
          r.drawFrame(insp.visualRect(item), { dragging: item.status === 'dragging', hovered: item.hovered })
        }
      }
    }
  }

  /** Safety valves so content never stays hidden. */
  housekeeping(now) {
    const insp = this.inspector
    const margin = this.vh * this.config.offscreenMargin
    // Unclaimed work in sections that left the viewport is finished instantly.
    if (this.queue.pending.length) {
      const keep = []
      for (const t of this.queue.pending) {
        const sec = t.item.section
        const gone = sec.rect && (sec.rect.y + sec.rect.h < -margin || sec.rect.y > this.vh + margin * 2)
        if ((sec.visible === false && gone) && t.item.status === 'queued') {
          insp.build(t.item, now)
          t.item.alpha = 0
          this.queue.active.delete(t)
          t.onDone?.()
        } else keep.push(t)
      }
      this.queue.pending = keep
    }
    for (const sec of insp.sections.values()) {
      // Scrolled far past an untouched section: just show it.
      if (sec.status === 'idle' && sec.rect && sec.rect.y + sec.rect.h < -margin) {
        for (const item of sec.items) {
          insp.build(item, now)
          item.alpha = 0
        }
        sec.status = 'done'
        continue
      }
      for (const item of sec.items) {
        if (item.status !== 'built' && item.status !== 'collapsed' && item.queuedAt && now - item.queuedAt > this.config.staleTaskMs) insp.build(item, now)
      }
      if (sec.status === 'running' && sec.items.every((it) => it.status === 'built')) this.sectionDone(sec)
    }
    this.state.built = insp.builtCount
  }
}
