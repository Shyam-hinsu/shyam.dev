/**
 * Dust: a few hundred tiny motes that belong to this window. They drift in a
 * loose halo around the window's centre, give way to the visitor's mouse and,
 * when another window is linked, stream across the gap to the other window's
 * halo and back. Inspired by Bjørn Staal's particle multi-window scene, kept
 * deliberately sparse so the page stays readable. Plain 2D canvas, no deps.
 *
 * All positions are in shared screen coordinates so every window can draw
 * every window's dust where it really is on the monitor.
 */
import { clamp, rand } from '../agents/easing.js'

export const DUST_COLORS = ['236, 52, 68', '52, 211, 153', '96, 165, 250', '251, 191, 36', '192, 132, 252']

export class DustField {
  constructor({ count = 640, travellerShare = 0.5 } = {}) {
    this.count = count
    this.travellers = Math.round(count * travellerShare)
    this.x = new Float32Array(count)
    this.y = new Float32Array(count)
    this.vx = new Float32Array(count)
    this.vy = new Float32Array(count)
    this.phase = new Float32Array(count)
    this.size = new Float32Array(count)
    this.target = new Int8Array(count) // 0 = home, 1 = away (travellers only)
    this.peerIndex = new Int8Array(count)
    this.seeded = false
  }

  seed(core, radius) {
    for (let i = 0; i < this.count; i++) {
      const a = rand(0, Math.PI * 2)
      const d = radius * (0.6 + Math.sqrt(rand(0, 1)) * 0.8)
      this.x[i] = core.x + Math.cos(a) * d
      this.y[i] = core.y + Math.sin(a) * d
      this.vx[i] = -Math.sin(a) * 12
      this.vy[i] = Math.cos(a) * 12
      this.phase[i] = rand(0, Math.PI * 2)
      this.size[i] = rand(0, 1) < 0.12 ? 2.4 : rand(1.3, 1.8)
      this.peerIndex[i] = i % 4
    }
    this.seeded = true
  }

  /**
   * @param dt seconds
   * @param self {x,y,w,h} this window on the screen
   * @param peers other windows' shapes
   * @param pointer {x,y} in screen coords, or null
   */
  update(dt, self, peers, pointer, now) {
    const core = { x: self.x + self.w / 2, y: self.y + self.h / 2 }
    const radius = Math.min(self.w, self.h) * 0.3
    if (!this.seeded) this.seed(core, radius)
    const t = now / 1000
    const linked = peers.length > 0
    const damping = Math.exp(-dt * 1.6)
    const maxV = 260

    for (let i = 0; i < this.count; i++) {
      let px = this.x[i]
      let py = this.y[i]
      let ax = 0
      let ay = 0
      const isTraveller = linked && i < this.travellers

      if (isTraveller) {
        // Stream to the other window's core and back, like a tether.
        const peer = peers[this.peerIndex[i] % peers.length]
        const pc = { x: peer.x + peer.w / 2, y: peer.y + peer.h / 2 }
        const dest = this.target[i] ? pc : core
        const dx = dest.x - px
        const dy = dest.y - py
        const d = Math.hypot(dx, dy) || 1
        const arriveR = Math.min(peer.w, peer.h, self.w, self.h) * 0.16
        if (d < arriveR) this.target[i] ^= 1
        // Pull along the line, with a sideways wobble that gives the stream its width.
        const k = 520
        ax += (dx / d) * k
        ay += (dy / d) * k
        const w = Math.sin(t * 2.2 + this.phase[i] * 3) * 140
        ax += (-dy / d) * w
        ay += (dx / d) * w
      } else {
        // Soft halo: ease towards the ring, swirl around it, breathe a little.
        const dx = px - core.x
        const dy = py - core.y
        const d = Math.hypot(dx, dy) || 1
        const ring = radius * (0.75 + 0.35 * Math.sin(t * 0.4 + this.phase[i]))
        const radial = (ring - d) * 3.2
        ax += (dx / d) * radial
        ay += (dy / d) * radial
        const swirl = 34 + 16 * Math.sin(this.phase[i])
        ax += (-dy / d) * swirl
        ay += (dx / d) * swirl
      }

      // Curl-ish jitter so nothing looks mechanical.
      ax += Math.sin(t * 1.7 + this.phase[i] * 5.1 + py * 0.01) * 26
      ay += Math.cos(t * 1.3 + this.phase[i] * 3.7 + px * 0.01) * 26

      // The visitor's mouse brushes the dust away.
      if (pointer) {
        const dx = px - pointer.x
        const dy = py - pointer.y
        const d2 = dx * dx + dy * dy
        if (d2 < 110 * 110 && d2 > 1) {
          const d = Math.sqrt(d2)
          const f = ((110 - d) / 110) * 900
          ax += (dx / d) * f
          ay += (dy / d) * f
        }
      }

      let vx = (this.vx[i] + ax * dt) * damping
      let vy = (this.vy[i] + ay * dt) * damping
      const v = Math.hypot(vx, vy)
      if (v > maxV) {
        vx *= maxV / v
        vy *= maxV / v
      }
      this.vx[i] = vx
      this.vy[i] = vy
      this.x[i] = px + vx * dt
      this.y[i] = py + vy * dt
    }
  }

  /** Positions for other windows (screen coords, interleaved x,y,size). */
  snapshot() {
    const out = new Float32Array(this.count * 3)
    for (let i = 0; i < this.count; i++) {
      out[i * 3] = this.x[i]
      out[i * 3 + 1] = this.y[i]
      out[i * 3 + 2] = this.size[i]
    }
    return out
  }

  /** Draw a set of motes given in screen coords, offset into this window's viewport. */
  static draw(ctx, buf, offset, rgb, vw, vh, alpha = 0.9) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    // Small motes: crisp squares. Larger ones: a cached glow sprite (cheap, unlike shadowBlur).
    ctx.fillStyle = `rgba(${rgb}, ${alpha})`
    for (let i = 0; i < buf.length; i += 3) {
      const s = buf[i + 2]
      if (s > 2) continue
      const x = buf[i] - offset.x
      const y = buf[i + 1] - offset.y
      if (x < -3 || y < -3 || x > vw + 3 || y > vh + 3) continue
      ctx.fillRect(x, y, s, s)
    }
    const sprite = glowSprite(rgb)
    const half = sprite.width / 2
    ctx.globalAlpha = Math.min(1, alpha + 0.1)
    for (let i = 0; i < buf.length; i += 3) {
      if (buf[i + 2] <= 2) continue
      const x = buf[i] - offset.x
      const y = buf[i + 1] - offset.y
      if (x < -half || y < -half || x > vw + half || y > vh + half) continue
      ctx.drawImage(sprite, x - half, y - half)
    }
    ctx.restore()
  }
}

const sprites = new Map()

/** A small radial-gradient dot, rendered once per colour. */
function glowSprite(rgb) {
  let c = sprites.get(rgb)
  if (c) return c
  const size = 12
  c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, `rgba(${rgb}, 1)`)
  grad.addColorStop(0.35, `rgba(${rgb}, 0.55)`)
  grad.addColorStop(1, `rgba(${rgb}, 0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  sprites.set(rgb, c)
  return c
}

export function dustColor(index) {
  return DUST_COLORS[clamp(index, 0, DUST_COLORS.length - 1)]
}
