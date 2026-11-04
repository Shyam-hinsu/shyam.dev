import { LEAD_AGENTS, WORKER_COLORS, CONFIG } from './AnimationConfig.js'
import { CursorAgent } from './CursorAgent.js'
import { CursorRenderer } from './CursorRenderer.js'
import { DOMInspector } from './DOMInspector.js'
import { AnimationTaskQueue } from './AnimationTaskQueue.js'
import { rand } from './easing.js'
import { WindowManager } from '../windows/WindowManager.js'
import { DustField, dustColor } from '../windows/DustField.js'

/**
 * Orchestrates the whole show on one requestAnimationFrame loop:
 * intro splash → hero wireframe build → each section the visitor scrolls to
 * is wireframed and built by the five cursors → finale gather on the deploy card.
 * The page is never scrolled programmatically.
 *
 * `state` is a reactive object the dock binds to:
 *   enabled, paused, phase ('intro'|'building'|'idle'|'done'|'off'),
 *   mode ('auto'|'all'), trails, agents, built, total, elapsedMs, section
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
    this.finaleObserver = null
    this.mutation = null
    this.rescanTimer = 0
    this.vw = 0
    this.vh = 0
    this.isMobile = false
    this.startedAt = 0
    this.finishedAt = 0
    this.timers = new Set()
    this.introUntil = 0
    this.gathered = false
    this.world = null // WindowManager, desktop only
    this.dust = null // DustField: this window's motes
    this.pointer = null // last mouse position (viewport coords), desktop only
    this.lastDustPublish = 0
    this.onPointer = (e) => {
      this.pointer = { x: e.clientX, y: e.clientY }
    }
    this.onPointerLeave = () => {
      this.pointer = null
    }
    this.lastRoamCheck = 0
    this.lastPublish = 0

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
    this.state.total = this.inspector.total
    this.state.built = 0
    this.state.agents = 0

    for (let i = 0; i < this.config.initialAgents; i++) this.spawnAgent(true)

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const sec = this.inspector.sections.get(e.target.dataset.agentSection)
          if (!sec) continue
          sec.visible = e.isIntersecting
          if (!e.isIntersecting || this.state.phase === 'intro') continue
          if (sec.status === 'idle') this.triggerSection(sec)
          else if (sec.status === 'done') this.inspectSection(sec)
        }
      },
      { threshold: this.config.sectionThreshold },
    )
    for (const sec of this.inspector.sections.values()) this.observer.observe(sec.el)

    // The finale fires once the deploy card itself is comfortably in view.
    this.finaleObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) {
            this.gathered = false
            continue
          }
          if (!this.gathered && this.state.phase !== 'intro') this.later(() => this.gather(), 400)
        }
      },
      { threshold: 0.7 },
    )
    if (this.inspector.finaleEl) this.finaleObserver.observe(this.inspector.finaleEl)

    this.mutation = new MutationObserver(() => {
      clearTimeout(this.rescanTimer)
      this.rescanTimer = setTimeout(() => this.rescan(), 120)
    })
    this.mutation.observe(this.root, { childList: true, subtree: true })

    window.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onResize)
    document.addEventListener('visibilitychange', this.onVisibility)
    document.fonts?.load?.(this.renderer.fontMono).catch(() => {})

    if (!this.isMobile && !this.config.disableWorld) {
      this.world = new WindowManager()
      this.dust = new DustField({ count: this.config.dustCount })
      window.addEventListener('pointermove', this.onPointer, { passive: true })
      document.addEventListener('pointerleave', this.onPointerLeave)
      this.world.onChange(() => (this.state.windows = this.world.others().length + 1))
      this.world.start()
      this.state.windows = 1
    }

    this.beginIntro()
    this.startLoop()
  }

  /** Open a companion window next to this one (must be called from a click). */
  openWindow() {
    const w = Math.min(760, Math.round(window.outerWidth * 0.6))
    const h = Math.min(680, Math.round(window.outerHeight * 0.8))
    const left = window.screenX + window.outerWidth - 40
    const top = window.screenY + 60
    const url = new URL(location.href)
    url.hash = '#projects'
    window.open(url.toString(), '_blank', `popup=yes,width=${w},height=${h},left=${left},top=${top}`)
  }

  log(agent, verb, item) {
    const el = item?.el
    const name = el ? el.getAttribute('aria-label') || el.querySelector('h1, h2, h3, .form__title')?.textContent?.trim() || el.dataset.agentName || el.className.split(' ')[0] : ''
    const dims = item?.rect ? `${Math.round(item.rect.w)} × ${Math.round(item.rect.h)}` : ''
    const entry = { t: Date.now(), agent: agent.label || agent.name, verb, target: name.slice(0, 40), dims }
    this.state.log = [entry, ...(this.state.log || [])].slice(0, this.config.logLength)
  }

  later(fn, ms) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  clearTimers() {
    for (const id of this.timers) clearTimeout(id)
    this.timers.clear()
  }

  /** Queue an interaction with a real control on the page. */
  interact(el, action, { offset, holdMs, sectionId } = {}) {
    if (!el || !el.isConnected) return
    const r = el.getBoundingClientRect()
    this.queue.enqueue({
      kind: 'interact',
      el,
      action,
      offset,
      holdMs: holdMs ?? (action === 'hover' ? 900 : 320),
      sectionId: sectionId || '',
      rect: { x: r.left, y: r.top, w: r.width, h: r.height },
    })
  }

  destroy() {
    this.stopLoop()
    this.world?.stop()
    this.world = null
    window.removeEventListener('pointermove', this.onPointer)
    document.removeEventListener('pointerleave', this.onPointerLeave)
    this.clearTimers()
    clearTimeout(this.rescanTimer)
    this.observer?.disconnect()
    this.finaleObserver?.disconnect()
    this.mutation?.disconnect()
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
    for (let i = 0; i < this.config.agentsPerSection && this.agents.length < this.config.maxAgents; i++) this.spawnAgent(true)
  }

  /* ----- choreography ----- */

  beginIntro() {
    const now = performance.now()
    this.startedAt = now
    this.state.phase = 'intro'
    this.state.elapsedMs = 0
    this.introUntil = now + this.config.introMs
    this.gathered = false
    // The leads lock onto the monogram's corners and click it, as in the reference intro.
    this.later(() => {
      const mark = document.querySelector('.splash__mark')
      if (!mark) return
      const corners = [[0, 0], [0, 1], [0.5, 1], [1, 0], [1, 1]]
      corners.forEach((offset, i) => this.interact(mark, i === 0 ? 'pulse' : 'hover', { offset, holdMs: 260, sectionId: 'intro' }))
    }, 450)
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
        kind: 'build',
        item,
        sectionId: sec.id,
        onDone: (agent) => {
          remaining--
          if (agent) this.log(agent, item.kind === 'layer' ? 'placed' : 'resized', item)
          if (remaining <= 0) this.sectionDone(sec)
        },
      })
    }
  }

  sectionDone(sec) {
    if (sec.status === 'done') return
    sec.status = 'done'
    this.state.built = this.inspector.builtCount
    this.scheduleInteractions(sec)
    const all = [...this.inspector.sections.values()].every((s) => s.status === 'done')
    if (all && this.state.phase !== 'done') {
      this.finishedAt = performance.now()
      this.state.elapsedMs = this.finishedAt - this.startedAt
      this.state.phase = 'done'
    }
  }

  /**
   * A built section came back into view: the cursors fly over and inspect
   * its frames (selection box, size pill), then rest there. Mirrors how the
   * reference re-runs its slider and skill-bar routines on every entry.
   */
  inspectSection(sec) {
    const now = performance.now()
    if (now - (sec.lastInspect || 0) < this.config.inspectCooldownMs) return
    sec.lastInspect = now
    const frames = sec.items.filter((it) => it.kind !== 'layer' && it.status === 'built' && it.el.isConnected)
    for (const it of frames) this.inspector.measureItem(it)
    const visible = frames.filter((it) => this.inspector.isInViewport(it.rect, -24))
    if (!visible.length) return
    // Spread the cursors over the section: pick evenly spaced frames.
    const n = Math.min(this.agents.length, visible.length)
    const step = visible.length / n
    for (let i = 0; i < n; i++) {
      const item = visible[Math.floor(i * step)]
      this.queue.enqueue({ kind: 'inspect', item, sectionId: sec.id })
    }
    this.scheduleInteractions(sec)
  }

  /** After a section is built, agents try its real controls ([data-agent-action]). */
  scheduleInteractions(sec) {
    const controls = [...sec.el.querySelectorAll('[data-agent-action]')]
    controls.forEach((el, i) => {
      const after = Number(el.dataset.agentAfter || 0) + i * this.config.interactStaggerMs
      this.later(() => {
        if (!this.state.enabled || this.state.paused) return
        this.interact(el, el.dataset.agentAction, { holdMs: el.dataset.agentHold ? Number(el.dataset.agentHold) : undefined, sectionId: sec.id })
      }, after)
    })
  }

  /**
   * Finale, as in the reference: every cursor moves to its own spot on the
   * deploy card, the first one clicks it, and they rest there afterwards.
   */
  gather(attempt = 0) {
    const el = this.inspector.finaleEl
    if (!el || !this.state.enabled) return
    // Wait until the card itself has been built; its corners mean nothing while it is collapsed.
    const item = this.inspector.items.get(el)
    if (item && item.status !== 'built') {
      if (attempt < 40) this.later(() => this.gather(attempt + 1), 250)
      return
    }
    this.gathered = true
    const spots = [[0.5, 0.5], [0.18, 0.25], [0.85, 0.25], [0.22, 0.82], [0.88, 0.82]]
    this.agents.forEach((a, i) => {
      if (a.task) a.finish(performance.now(), this.queue, a.task, true)
      this.interact(el, i === 0 ? 'pulse' : 'hover', { offset: spots[i % spots.length], holdMs: i === 0 ? 360 : 500, sectionId: 'contact' })
    })
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
    this.clearTimers()
    this.queue.cancelAll()
    for (const a of this.agents) a.task && a.finish(performance.now(), this.queue, a.task, true)
    for (const sec of this.inspector.sections.values()) this.inspector.collapseSection(sec)
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

  setTrails(on) {
    this.state.trails = on
    if (!on) for (const a of this.agents) a.trail.length = 0
  }

  setEnabled(on) {
    this.state.enabled = on
    if (!on) {
      this.stopLoop()
      this.clearTimers()
      this.queue.cancelAll()
      for (const a of this.agents) a.task && a.finish(performance.now(), this.queue, a.task, true)
      this.inspector.buildAll()
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
    this.lastDt = dt
    const st = this.state
    const insp = this.inspector
    const mode = st.mode

    if (st.phase === 'intro' && now >= this.introUntil) this.endIntro()
    if (st.phase === 'building' || st.phase === 'intro') st.elapsedMs = now - this.startedAt

    insp.measure(mode)
    this.housekeeping(now)

    const env = {
      inspector: insp,
      queue: this.queue,
      agents: this.agents,
      vw: this.vw,
      vh: this.vh,
      isMobile: this.isMobile,
      speed: 1,
    }
    for (const a of this.agents) a.update(now, dt, env)
    this.syncWorld(now)

    const r = this.renderer
    r.clear()
    this.drawWorld(now)
    this.drawSkeletons(now, dt, mode)
    for (const a of this.agents) {
      if (st.trails) r.drawTrail(a, now)
      r.drawRipples(a, now)
    }
    for (const a of this.agents) r.drawCursor(a, !a.label)

    this.raf = requestAnimationFrame(this.tick)
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
          if (item.hovered) item.alpha = 1
          if (item.alpha > 0) {
            if (!item.hovered) item.alpha = Math.max(0, item.alpha - fadeStep)
            if (item.alpha > 0) {
              if (item.kind === 'layer') r.drawLayerSkeleton(item.rect, { alpha: item.alpha * 0.6 })
              else r.drawFrame(item.rect, { alpha: item.alpha, hovered: item.hovered, fill: item.hovered })
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

  /* ----- the shared screen-space world ----- */

  syncWorld(now) {
    const w = this.world
    if (!w) return
    w.measure()
    const peers = w.others()
    // Broadcast our cursors in screen coordinates (every frame; local only).
    const agents = this.agents.map((a) => {
      const s = w.toScreen(a.x, a.y)
      const trail = a.trail.slice(-8).map((p) => ({ ...w.toScreen(p.x, p.y), t: p.t }))
      return { x: s.x, y: s.y, color: a.color, label: a.label, pressed: a.pressed, trail }
    })
    w.publishAgents(agents)

    if (this.dust) {
      const ptr = this.pointer ? w.toScreen(this.pointer.x, this.pointer.y) : null
      this.dust.update(this.lastDt, w.shape, peers, ptr, now)
      if (now - this.lastDustPublish > 33) {
        this.lastDustPublish = now
        if (peers.length) w.publishDust(this.dust.snapshot())
      }
    }

    // Idle cursors sometimes wander over to another window.
    if (!peers.length || now - this.lastRoamCheck < this.config.roamIdleMs) return
    this.lastRoamCheck = now
    const away = this.agents.filter((a) => a.away).length
    if (away >= this.config.roamMaxAway) return
    const candidates = this.agents.filter((a) => !a.task && !a.away && a.idleSince && now - a.idleSince > this.config.roamIdleMs)
    if (!candidates.length || Math.random() > this.config.roamChance) return
    const a = candidates[Math.floor(Math.random() * candidates.length)]
    const peer = peers[Math.floor(Math.random() * peers.length)]
    const target = w.toLocal(peer.x + rand(peer.w * 0.15, peer.w * 0.85), peer.y + rand(peer.h * 0.2, peer.h * 0.8))
    a.sendTo(target.x, target.y, now, rand(this.config.roamStayMs[0], this.config.roamStayMs[1]))
    this.log(a, 'visited', null)
    this.state.log[0].target = 'another window'
  }

  drawWorld(now) {
    const w = this.world
    if (!w) return
    const r = this.renderer
    const peers = w.others()
    // Dust: ours and every linked window's, each in its own colour, where it really is on the screen.
    if (this.dust) {
      const order = [{ id: w.id, created: w.created }, ...peers].sort((a, b) => a.created - b.created)
      const colorOf = (id) => dustColor(order.findIndex((o) => o.id === id))
      DustField.draw(r.ctx, this.dust.snapshot(), w.shape, colorOf(w.id), this.vw, this.vh, peers.length ? 0.6 : 0.38)
      for (const p of peers) if (p.dust) DustField.draw(r.ctx, p.dust, w.shape, colorOf(p.id), this.vw, this.vh, 0.6)
    }
    if (!peers.length) return
    for (const p of peers) {
      for (const a of p.agents || []) {
        const l = w.toLocal(a.x, a.y)
        if (l.x < -40 || l.y < -40 || l.x > this.vw + 40 || l.y > this.vh + 40) continue
        if (this.state.trails && a.trail) r.drawRemoteTrail({ color: a.color, trail: a.trail.map((q) => ({ ...w.toLocal(q.x, q.y), t: q.t })) }, now)
        r.drawRemoteCursor({ ...a, x: l.x, y: l.y })
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
        if (!t.item) {
          keep.push(t)
          continue
        }
        if (t.kind === 'inspect') {
          if (t.item.section.visible !== false) keep.push(t)
          else this.queue.active.delete(t)
          continue
        }
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
