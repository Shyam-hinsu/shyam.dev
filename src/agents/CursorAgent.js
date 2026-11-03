import { clamp, easeOutCubic, easeInOutCubic, rand } from './easing.js'

/**
 * One simulated cursor. Movement is time-based tweening with cubic ease-out
 * (fast start, soft landing), the way a hand moves a mouse; idle cursors drift
 * slowly. Tasks are either `build` (drag a frame open / tap a layer in) or
 * `interact` (hover, click or pulse a real control on the page).
 * Driven by the shared engine loop; never runs its own timers.
 */
export class CursorAgent {
  constructor(def, index, config) {
    this.id = def.id || `w${index}`
    this.name = def.name || 'Worker'
    this.label = def.label || ''
    this.color = def.color
    this.speed = def.speed || rand(0.9, 1.2)
    this.index = index
    this.config = config

    this.x = 0
    this.y = 0
    this.sx = 0
    this.sy = 0
    this.pressed = false
    this.hovering = false
    this.task = null
    this.phase = 'idle' // idle | approach | hover | press | drag | pop | act | release
    this.phaseStart = 0
    this.approachMs = 400
    this.dragMs = 0
    this.hoverMs = 0
    this.holdMs = 0
    this.target = { x: 0, y: 0 }
    this.trail = []
    this.ripples = []
    this.orbitPhase = index * 1.25
    this.orbitAngle = rand(0, Math.PI * 2)
    this.completed = 0
    this.cloud = { x: rand(-1, 1), y: rand(-1, 1) }
  }

  place(x, y) {
    this.x = x
    this.y = y
  }

  get busy() {
    return this.task !== null
  }

  /** Start a task: remember where we are and how long the glide should take. */
  assign(task, now, env) {
    this.task = task
    this.phase = 'approach'
    this.phaseStart = now
    this.sx = this.x
    this.sy = this.y
    this.hoverMs = rand(this.config.hoverMs[0], this.config.hoverMs[1])
    this.dragMs = rand(this.config.dragMs[0], this.config.dragMs[1])
    this.holdMs = task.holdMs || 600
    if (task.kind === 'build') {
      task.item.status = 'queued'
      task.item.queuedAt = now
    }
    const t = this.targetPoint(env)
    const dist = t ? Math.hypot(t.x - this.x, t.y - this.y) : 300
    this.approachMs = clamp(220 + dist * 0.55, 320, 1000) / this.speed
  }

  targetPoint(env) {
    const task = this.task
    if (!task) return null
    if (task.kind === 'interact') {
      const r = task.rect
      if (!r) return null
      const [ox, oy] = task.offset || [0.5, 0.5]
      return { x: r.x + r.w * ox, y: r.y + r.h * oy }
    }
    return env.inspector.handlePoint(task.item)
  }

  /** Glide along a cubic ease-out from the start point to the (live) target. */
  glide(p, target) {
    const ep = easeOutCubic(clamp(p, 0, 1))
    this.x = this.sx + (target.x - this.sx) * ep
    this.y = this.sy + (target.y - this.sy) * ep
  }

  /** Idle: slow drift towards the swarm cloud plus a tiny orbit, like a resting hand. */
  idle(now, dt, env) {
    const c = this.config
    const r = c.flockRadius * (env.isMobile ? 0.6 : 1)
    const gx = env.swarmTarget.x + this.cloud.x * r
    const gy = env.swarmTarget.y + this.cloud.y * r * 0.7
    const k = 1 - Math.exp(-dt * 1.4)
    this.x += (gx - this.x) * k
    this.y += (gy - this.y) * k
    this.orbitPhase += dt * 1.1
    this.x += Math.cos(this.orbitPhase + this.index) * 21 * dt
    this.y += Math.sin(this.orbitPhase + this.index) * 21 * dt
    // Keep a polite distance from neighbours.
    const sep = c.flockSeparation
    for (const o of env.agents) {
      if (o === this) continue
      const dx = this.x - o.x
      const dy = this.y - o.y
      const d2 = dx * dx + dy * dy
      if (d2 < sep * sep && d2 > 0.01) {
        const d = Math.sqrt(d2)
        const push = ((sep - d) / sep) * 60 * dt
        this.x += (dx / d) * push
        this.y += (dy / d) * push
      }
    }
    this.x = clamp(this.x, 8, env.vw - 8)
    this.y = clamp(this.y, 8, env.vh - 8)
  }

  /** Finale: circle the deploy card. */
  orbit(now, dt, env) {
    const o = env.orbit
    this.orbitAngle += dt * (0.7 + (this.index % 5) * 0.08)
    const rr = o.r + Math.sin(now / 420 + this.index) * 10 + (this.index % 3) * 12
    const tx = o.x + Math.cos(this.orbitAngle) * rr
    const ty = o.y + Math.sin(this.orbitAngle) * rr * 0.72
    const k = 1 - Math.exp(-dt * 5)
    this.x += (tx - this.x) * k
    this.y += (ty - this.y) * k
  }

  update(now, dt, env) {
    const { inspector, queue } = env
    const c = this.config
    const sp = env.speed || 1
    const sdt = dt * sp

    if (this.ripples.length) this.ripples = this.ripples.filter((r) => now - r.t0 < c.rippleMs)

    if (!this.task) {
      const next = queue.claim(this, inspector)
      if (next) this.assign(next, now, env)
    }
    if (!this.task) {
      if (env.mode === 'orbit') this.orbit(now, sdt, env)
      else this.idle(now, sdt, env)
      this.pushTrail(now)
      return
    }

    const task = this.task
    const item = task.item
    const elapsed = (now - this.phaseStart) * sp

    if (task.kind === 'build' && (!item.el.isConnected || !item.rect)) return this.finish(now, queue, task, true)
    if (task.kind === 'interact' && !task.el.isConnected) return this.finish(now, queue, task, true)
    const target = this.targetPoint(env)
    if (!target) return this.finish(now, queue, task, true)

    switch (this.phase) {
      case 'approach': {
        this.glide(elapsed / this.approachMs, target)
        if (elapsed >= this.approachMs) {
          this.phase = 'hover'
          this.phaseStart = now
          this.hovering = true
          if (item) {
            item.status = 'hover'
            item.hovered = true
          }
          if (task.kind === 'interact' && task.action === 'hover') task.el.classList.add('is-agent-hover')
        }
        break
      }
      case 'hover': {
        this.x = target.x
        this.y = target.y
        if (elapsed >= this.hoverMs) {
          this.phase = 'press'
          this.phaseStart = now
          this.pressed = true
          this.hovering = false
          this.ripples.push({ t0: now, x: this.x, y: this.y, strong: !item || item.kind !== 'layer' })
          if (item) {
            item.status = 'dragging'
            inspector.applyReveal(item)
          } else this.performAction(task, now)
        }
        break
      }
      case 'press': {
        this.x = target.x
        this.y = target.y
        if (elapsed >= c.pressMs) {
          this.phaseStart = now
          if (!item) this.phase = 'act'
          else if (item.kind === 'layer') {
            inspector.pop(item, now)
            this.phase = 'pop'
          } else this.phase = 'drag'
        }
        break
      }
      case 'act': {
        this.x = target.x
        this.y = target.y
        if (elapsed >= this.holdMs) {
          this.endAction(task)
          this.pressed = false
          this.phase = 'release'
          this.phaseStart = now
        }
        break
      }
      case 'pop': {
        this.x = target.x
        this.y = target.y
        if (elapsed >= c.popMs * 0.7) {
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
          this.pressed = false
          inspector.build(item, now)
          this.ripples.push({ t0: now, x: this.x, y: this.y, strong: false })
          this.phase = 'release'
          this.phaseStart = now
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

  performAction(task) {
    const el = task.el
    el.dispatchEvent(new CustomEvent('agent:action', { bubbles: true, detail: { action: task.action, agent: this.id } }))
    switch (task.action) {
      case 'click':
        el.click()
        break
      case 'pulse':
        el.classList.add('is-hit')
        break
      case 'hover':
        el.classList.add('is-agent-hover')
        break
    }
  }

  endAction(task) {
    task.el.classList.remove('is-hit', 'is-agent-hover')
  }

  finish(now, queue, task, aborted) {
    if (task.kind === 'interact') this.endAction(task)
    if (!aborted) this.completed++
    this.pressed = false
    this.hovering = false
    this.task = null
    this.phase = 'idle'
    this.phaseStart = now
    queue.complete(task)
  }

  pushTrail(now) {
    const last = this.trail[this.trail.length - 1]
    if (!last || Math.hypot(last.x - this.x, last.y - this.y) > 0.6) this.trail.push({ x: this.x, y: this.y, t: now })
    const maxLen = this.config.trailLength
    while (this.trail.length > maxLen || (this.trail.length && now - this.trail[0].t > this.config.trailLife)) this.trail.shift()
  }
}
