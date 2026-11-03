import { clamp, easeInOutCubic, rand } from './easing.js'

/**
 * One simulated cursor. Owns position, physics, task phase, trail and ripples.
 * Driven by the shared engine loop; never runs its own timers.
 */
export class CursorAgent {
  constructor(def, index, config) {
    this.id = def.id || `w${index}`
    this.name = def.name || 'Worker'
    this.label = def.label || ''
    this.color = def.color
    this.speed = def.speed || rand(0.85, 1.3)
    this.index = index
    this.config = config

    this.x = 0
    this.y = 0
    this.tx = 0
    this.ty = 0
    this.vx = 0
    this.vy = 0
    this.pressed = false
    this.hovering = false
    this.task = null
    this.phase = 'idle' // idle | approach | hover | press | drag | pop | release | orbit
    this.phaseStart = 0
    this.dragMs = 0
    this.hoverMs = 0
    this.trail = []
    this.ripples = []
    this.seed = rand(0, 1000)
    this.orbitAngle = rand(0, Math.PI * 2)
    this.completed = 0
    this.flockOffset = { x: rand(-1, 1), y: rand(-1, 1) }
  }

  place(x, y) {
    this.x = this.tx = x
    this.y = this.ty = y
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
    if (dist < 1.5) step = dist
    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    return dist - step
  }

  /** Boids-style idle flocking around the swarm target. */
  flock(now, dt, env) {
    const c = this.config
    const t = now / 1000
    const target = env.swarmTarget
    const r = c.flockRadius * (env.isMobile ? 0.6 : 1)
    // Loose cloud around the target plus slow wander.
    const gx = target.x + this.flockOffset.x * r + Math.sin(t * 0.7 + this.seed) * 18
    const gy = target.y + this.flockOffset.y * r * 0.7 + Math.cos(t * 0.9 + this.seed * 1.3) * 14
    let ax = (gx - this.x) * 3.2
    let ay = (gy - this.y) * 3.2
    // Separation from neighbours.
    const sep = c.flockSeparation
    for (const o of env.agents) {
      if (o === this) continue
      const dx = this.x - o.x
      const dy = this.y - o.y
      const d2 = dx * dx + dy * dy
      if (d2 < sep * sep && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const f = ((sep - d) / sep) * 420
        ax += (dx / d) * f
        ay += (dy / d) * f
      }
    }
    this.vx = (this.vx + ax * dt) * Math.exp(-dt * 3.4)
    this.vy = (this.vy + ay * dt) * Math.exp(-dt * 3.4)
    const vmax = 520 * this.speed
    const v = Math.hypot(this.vx, this.vy)
    if (v > vmax) {
      this.vx *= vmax / v
      this.vy *= vmax / v
    }
    this.x = clamp(this.x + this.vx * dt, 8, env.vw - 8)
    this.y = clamp(this.y + this.vy * dt, 8, env.vh - 8)
  }

  /** Finale: circle around a point. */
  orbit(now, dt, env) {
    const o = env.orbit
    const speed = 0.9 + (this.index % 5) * 0.12
    this.orbitAngle += dt * speed * (this.index % 2 ? 1 : -1) * 0.5 + dt * speed
    const rr = o.r + Math.sin(now / 400 + this.seed) * 10 + (this.index % 3) * 12
    this.tx = o.x + Math.cos(this.orbitAngle) * rr
    this.ty = o.y + Math.sin(this.orbitAngle) * rr * 0.72
    this.moveTowards(dt, 6, 2400)
  }

  update(now, dt, env) {
    const { inspector, queue } = env
    const c = this.config
    const sp = env.speed || 1
    const sdt = dt * sp

    if (this.ripples.length) this.ripples = this.ripples.filter((r) => now - r.t0 < c.rippleMs)

    if (env.mode === 'orbit' && !this.task) {
      this.orbit(now, sdt, env)
      this.pushTrail(now)
      return
    }

    if (!this.task && !env.frozen) {
      const next = queue.claim(this, inspector)
      if (next) this.assign(next, now)
    }

    if (!this.task) {
      this.flock(now, sdt, env)
      this.pushTrail(now)
      return
    }

    const task = this.task
    const item = task.item
    const elapsed = (now - this.phaseStart) * sp

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
        const remaining = this.moveTowards(sdt, c.approachRate, c.maxSpeed)
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
          this.ripples.push({ t0: now, x: this.x, y: this.y, strong: item.kind !== 'layer' })
          item.status = 'dragging'
          if (item.kind !== 'layer') item.el.style.willChange = 'clip-path'
        }
        break
      }
      case 'press': {
        this.x = hp.x
        this.y = hp.y
        if (elapsed >= c.pressMs) {
          if (item.kind === 'layer') {
            inspector.pop(item, now)
            this.phase = 'pop'
          } else this.phase = 'drag'
          this.phaseStart = now
        }
        break
      }
      case 'pop': {
        // Hold for a beat while the layer fades in, then release.
        if (elapsed >= c.popMs * 0.6) {
          this.pressed = false
          inspector.build(item, now)
          this.phase = 'release'
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
    this.task = null
    this.phase = 'idle'
    this.phaseStart = now
    this.vx = this.vy = 0
    queue.complete(task)
  }

  pushTrail(now) {
    const last = this.trail[this.trail.length - 1]
    if (!last || Math.hypot(last.x - this.x, last.y - this.y) > 0.6) this.trail.push({ x: this.x, y: this.y, t: now })
    const maxLen = this.config.trailLength
    while (this.trail.length > maxLen || (this.trail.length && now - this.trail[0].t > this.config.trailLife)) this.trail.shift()
  }
}
