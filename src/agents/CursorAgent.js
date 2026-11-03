import { clamp, easeInOutCubic, rand } from './easing.js'

/**
 * One simulated cursor. Owns its position, physics, task phase, trail and
 * ripples. `update()` is driven by the shared engine loop — agents never run
 * their own timers or animation frames.
 */
export class CursorAgent {
  constructor(def, index, config) {
    this.id = def.id
    this.name = def.name
    this.label = def.label
    this.color = def.color
    this.speed = def.speed
    this.home = def.home
    this.index = index
    this.config = config

    this.x = 0
    this.y = 0
    this.tx = 0
    this.ty = 0
    this.pressed = false
    this.hovering = false
    this.task = null
    this.phase = 'idle'
    this.phaseStart = 0
    this.dragMs = 0
    this.hoverMs = 0
    this.trail = []
    this.ripples = []
    this.idleSeed = index * 1.7 + rand(0, 3)
    this.anchor = { x: 0, y: 0 }
    this.completed = 0
  }

  place(vw, vh) {
    this.x = this.anchor.x = vw * this.home[0]
    this.y = this.anchor.y = vh * this.home[1]
    this.tx = this.x
    this.ty = this.y
  }

  get busy() {
    return this.task !== null
  }

  assign(task, now) {
    this.task = task
    this.phase = 'approach'
    this.phaseStart = now
    this.dragMs = rand(this.config.dragMs[0], this.config.dragMs[1])
    this.hoverMs = rand(this.config.hoverMs[0], this.config.hoverMs[1])
    task.item.status = 'queued'
    task.item.queuedAt = now
  }

  /** Move towards (tx, ty): exponential approach with a speed cap. */
  moveTowards(dt, rate, maxSpeed) {
    const dx = this.tx - this.x
    const dy = this.ty - this.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.05) {
      this.x = this.tx
      this.y = this.ty
      return 0
    }
    let step = dist * (1 - Math.exp(-dt * rate * this.speed))
    const cap = maxSpeed * this.speed * dt
    if (step > cap) step = cap
    if (step < 0.2 && dist < 1.5) step = dist
    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    return dist - step
  }

  idle(now, dt, vw, vh) {
    const c = this.config
    const t = now / 1000
    const s = this.idleSeed
    // Slow Lissajous wander around the anchor point; keep inside the viewport.
    this.tx = clamp(this.anchor.x + Math.sin(t * c.idleRate * 2 * Math.PI + s) * c.idleDrift * 2, 24, vw - 24)
    this.ty = clamp(this.anchor.y + Math.cos(t * c.idleRate * 1.37 * Math.PI + s * 1.3) * c.idleDrift, 24, vh - 24)
    this.moveTowards(dt, 1.2, 60)
  }

  update(now, dt, env) {
    const { inspector, queue, vw, vh } = env
    const c = this.config

    // Expire ripples
    if (this.ripples.length) this.ripples = this.ripples.filter((r) => now - r.t0 < c.rippleMs)

    if (!this.task) {
      const next = queue.claim(this, inspector)
      if (next) this.assign(next, now)
    }

    if (!this.task) {
      this.idle(now, dt, vw, vh)
      this.pushTrail(now)
      return
    }

    const task = this.task
    const item = task.item
    const elapsed = now - this.phaseStart

    // Element vanished (re-render) — drop the task.
    if (!item.el.isConnected || !item.rect) {
      this.finish(now, queue, task, true)
      return
    }

    const hp = inspector.handlePoint(item)
    if (!hp) {
      this.finish(now, queue, task, true)
      return
    }

    switch (this.phase) {
      case 'approach': {
        this.tx = hp.x
        this.ty = hp.y
        const remaining = this.moveTowards(dt, c.approachRate, c.maxSpeed)
        if (remaining < 1.2 && elapsed > c.approachMinMs) {
          this.phase = 'hover'
          this.phaseStart = now
          this.hovering = true
          item.status = 'hover'
          item.hovered = true
        }
        break
      }
      case 'hover': {
        this.x = hp.x
        this.y = hp.y
        if (elapsed >= this.hoverMs) {
          this.phase = 'press'
          this.phaseStart = now
          this.pressed = true
          this.hovering = false
          this.ripples.push({ t0: now, x: this.x, y: this.y, strong: true })
          item.status = 'dragging'
          item.el.style.willChange = 'clip-path, opacity'
        }
        break
      }
      case 'press': {
        this.x = hp.x
        this.y = hp.y
        if (elapsed >= c.pressMs) {
          this.phase = 'drag'
          this.phaseStart = now
        }
        break
      }
      case 'drag': {
        const p = clamp(elapsed / this.dragMs, 0, 1)
        item.progress = item.p0 + (1 - item.p0) * easeInOutCubic(p)
        inspector.applyReveal(item)
        const np = inspector.handlePoint(item)
        this.x = np.x
        this.y = np.y
        if (p >= 1) {
          this.phase = 'release'
          this.phaseStart = now
          this.pressed = false
          inspector.build(item, now)
          this.ripples.push({ t0: now, x: this.x, y: this.y, strong: false })
        }
        break
      }
      case 'release': {
        if (elapsed >= c.releaseMs) this.finish(now, queue, task, false)
        break
      }
    }
    this.pushTrail(now)
  }

  finish(now, queue, task, aborted) {
    if (!aborted) this.completed++
    this.pressed = false
    this.hovering = false
    this.anchor.x = this.x
    this.anchor.y = this.y
    this.task = null
    this.phase = 'idle'
    this.phaseStart = now
    queue.complete(task)
  }

  pushTrail(now) {
    const last = this.trail[this.trail.length - 1]
    if (!last || Math.hypot(last.x - this.x, last.y - this.y) > 0.6) {
      this.trail.push({ x: this.x, y: this.y, t: now })
    }
    const maxLen = this.config.trailLength
    while (this.trail.length > maxLen || (this.trail.length && now - this.trail[0].t > this.config.trailLife)) {
      this.trail.shift()
    }
  }
}
