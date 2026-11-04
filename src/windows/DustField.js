/**
 * Dust: a translucent sphere of thousands of particles that belongs to this
 * window. Particles sit on a shell, clustered along curved filaments, and the
 * shell slowly turns and breathes. When another window is linked and close
 * enough, part of the dust flows through a tube to the other window and forms
 * a smaller sphere of this window's colour inside the other window's sphere,
 * as in Bjørn Staal's particle multi-window scene.
 *
 * Everything is a pure function of a seed and a shared clock, so every window
 * computes every window's dust locally: nothing but window shapes is shared.
 * Positions are in screen coordinates. Plain 2D canvas, no dependencies.
 */
import { clamp } from '../agents/easing.js'

export const DUST_COLORS = [
  [227, 50, 63], // crimson: the site accent
  [214, 218, 228], // silver
  [201, 168, 106], // sand
  [138, 151, 184], // slate
  [166, 143, 179], // mauve
]

const midnight = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})()

/** Seconds since local midnight: identical in every window. */
export function sharedTime() {
  return (Date.now() - midnight) / 1000
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Random unit vector. */
function randomDir(rand, out, o) {
  const z = rand() * 2 - 1
  const a = rand() * Math.PI * 2
  const r = Math.sqrt(1 - z * z)
  out[o] = r * Math.cos(a)
  out[o + 1] = r * Math.sin(a)
  out[o + 2] = z
}

/**
 * A deterministic particle set: shell directions clustered along filaments.
 * Shared between windows by seeding from the window's creation time.
 */
export class DustField {
  constructor(seed, count) {
    this.count = count
    this.dir = new Float32Array(count * 3) // base direction on the unit sphere
    this.phase = new Float32Array(count)
    this.hash = new Float32Array(count) // 0..1, decides who travels
    this.side = new Float32Array(count) // -1..1 lateral offset inside the tube
    this.bright = new Float32Array(count) // 0..1 filament brightness
    this.seed(seed)
  }

  seed(seed) {
    const rand = mulberry32(seed)
    const n = this.count
    const filaments = 64
    const perFilament = Math.floor((n * 0.78) / filaments)
    let i = 0
    const p = [0, 0, 0]
    const t = [0, 0, 0]
    for (let f = 0; f < filaments; f++) {
      // Start somewhere on the sphere with a random tangent, then random-walk
      // along the surface; the walk is the filament.
      randomDir(rand, p, 0)
      randomDir(rand, t, 0)
      const bright = 0.55 + rand() * 0.45
      for (let k = 0; k < perFilament && i < n; k++, i++) {
        // Keep the tangent on the surface and let it drift.
        const dot = t[0] * p[0] + t[1] * p[1] + t[2] * p[2]
        t[0] -= dot * p[0]
        t[1] -= dot * p[1]
        t[2] -= dot * p[2]
        const tl = Math.hypot(t[0], t[1], t[2]) || 1
        t[0] /= tl
        t[1] /= tl
        t[2] /= tl
        p[0] += t[0] * 0.022
        p[1] += t[1] * 0.022
        p[2] += t[2] * 0.022
        const pl = Math.hypot(p[0], p[1], p[2]) || 1
        p[0] /= pl
        p[1] /= pl
        p[2] /= pl
        t[0] += (rand() - 0.5) * 0.18
        t[1] += (rand() - 0.5) * 0.18
        t[2] += (rand() - 0.5) * 0.18
        const j = 0.003 + rand() * 0.012
        this.dir[i * 3] = p[0] + (rand() - 0.5) * j
        this.dir[i * 3 + 1] = p[1] + (rand() - 0.5) * j
        this.dir[i * 3 + 2] = p[2] + (rand() - 0.5) * j
        this.bright[i] = bright
        this.phase[i] = rand() * Math.PI * 2
        this.hash[i] = rand()
        this.side[i] = rand() * 2 - 1
      }
    }
    // The rest: a diffuse haze over the whole shell.
    for (; i < n; i++) {
      randomDir(rand, this.dir, i * 3)
      this.bright[i] = 0.2 + rand() * 0.25
      this.phase[i] = rand() * Math.PI * 2
      this.hash[i] = rand()
      this.side[i] = rand() * 2 - 1
    }
  }
}

/**
 * Renders any number of fields (one per window) into one additive pixel
 * buffer, then composites it with a cheap bloom onto the target context.
 */
export class DustRenderer {
  constructor() {
    this.buf = document.createElement('canvas')
    this.bufCtx = this.buf.getContext('2d', { willReadFrequently: true })
    this.bloom = document.createElement('canvas')
    this.bloomCtx = this.bloom.getContext('2d')
    this.bloom2 = document.createElement('canvas')
    this.bloom2Ctx = this.bloom2.getContext('2d')
    this.image = null
    this.scale = 1 // buffer resolution relative to CSS pixels
    this.w = 0
    this.h = 0
  }

  resize(vw, vh) {
    this.w = Math.max(2, Math.round(vw * this.scale))
    this.h = Math.max(2, Math.round(vh * this.scale))
    this.buf.width = this.w
    this.buf.height = this.h
    this.image = this.bufCtx.createImageData(this.w, this.h)
    this.bloom.width = Math.max(2, Math.round(this.w / 4))
    this.bloom.height = Math.max(2, Math.round(this.h / 4))
    this.bloom2.width = Math.max(2, Math.round(this.w / 12))
    this.bloom2.height = Math.max(2, Math.round(this.h / 12))
  }

  /**
   * @param ctx target 2D context (CSS pixel space)
   * @param view {x,y,w,h} this window on the screen
   * @param windows [{ id, created, x, y, w, h, field, color }] every window, this one included
   */
  render(ctx, view, windows, vw, vh, strength = 1) {
    if (this.w !== Math.round(vw * this.scale) || this.h !== Math.round(vh * this.scale)) this.resize(vw, vh)
    const data = this.image.data
    data.fill(0)
    const t = sharedTime()
    for (const win of windows) this.plot(data, view, win, windows, t, strength)
    this.bufCtx.putImageData(this.image, 0, 0)

    // Bloom: two downscales and back up, which blurs for free.
    const b = this.bloomCtx
    b.clearRect(0, 0, this.bloom.width, this.bloom.height)
    b.drawImage(this.buf, 0, 0, this.bloom.width, this.bloom.height)
    const b2 = this.bloom2Ctx
    b2.clearRect(0, 0, this.bloom2.width, this.bloom2.height)
    b2.drawImage(this.bloom, 0, 0, this.bloom2.width, this.bloom2.height)

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.imageSmoothingEnabled = true
    ctx.globalAlpha = 0.5 * strength
    ctx.drawImage(this.bloom2, 0, 0, vw, vh)
    ctx.globalAlpha = 0.45 * strength
    ctx.drawImage(this.bloom, 0, 0, vw, vh)
    ctx.globalAlpha = 1
    ctx.drawImage(this.buf, 0, 0, vw, vh)
    ctx.restore()
  }

  /** Plot one window's particles into the additive buffer. */
  plot(data, view, win, windows, t, strength) {
    const f = win.field
    if (!f) return
    const n = f.count
    const cx = win.x + win.w / 2
    const cy = win.y + win.h / 2
    const R = Math.min(win.w, win.h) * 0.22
    const [cr, cg, cb] = win.color
    const W = this.w
    const H = this.h
    const s = this.scale
    const ox = view.x
    const oy = view.y

    // Slow rotation about a tilted axis, seeded per window so spheres differ.
    const seedRot = (win.created % 1000) / 1000
    const ay = t * 0.11 + seedRot * 6.28
    const ax = 0.35 + Math.sin(t * 0.05 + seedRot) * 0.25
    const cay = Math.cos(ay)
    const say = Math.sin(ay)
    const cax = Math.cos(ax)
    const sax = Math.sin(ax)

    // Link: the nearest other window, and how strongly we flow into it.
    let peer = null
    let link = 0
    for (const o of windows) {
      if (o === win) continue
      const ocx = o.x + o.w / 2
      const ocy = o.y + o.h / 2
      const oR = Math.min(o.w, o.h) * 0.22
      const d = Math.hypot(ocx - cx, ocy - cy)
      const near = clamp(1 - (d - (R + oR)) / (6 * (R + oR)), 0, 1)
      if (near > link) {
        link = near
        peer = { cx: ocx, cy: ocy, R: oR, d }
      }
    }
    // Tube frame (unit vector from us to the peer, and its perpendicular).
    let ux = 0
    let uy = 0
    let px = 0
    let py = 0
    if (peer) {
      ux = (peer.cx - cx) / (peer.d || 1)
      uy = (peer.cy - cy) / (peer.d || 1)
      px = -uy
      py = ux
    }
    const travelShare = 0.6 * link

    for (let i = 0; i < n; i++) {
      // Base direction, rotated.
      let x = f.dir[i * 3]
      let y = f.dir[i * 3 + 1]
      let z = f.dir[i * 3 + 2]
      // rotate about x then y
      let y1 = y * cax - z * sax
      let z1 = y * sax + z * cax
      let x2 = x * cay + z1 * say
      let z2 = -x * say + z1 * cay
      x = x2
      y = y1
      z = z2
      // Surface flow: a smooth wobble that moves whole filaments together.
      const ph = f.phase[i]
      const wob = 0.05
      x += Math.sin(y * 3.1 + t * 0.45) * wob + Math.sin(z * 5.3 - t * 0.3) * wob * 0.5
      y += Math.sin(z * 2.7 + t * 0.4) * wob + Math.sin(x * 4.9 + t * 0.35) * wob * 0.5
      z += Math.sin(x * 2.9 + t * 0.5) * wob + Math.sin(y * 4.4 - t * 0.25) * wob * 0.5
      const len = Math.hypot(x, y, z) || 1
      x /= len
      y /= len
      z /= len
      // Breathing radius; the haze sits slightly inside and outside the shell.
      const breathe = 1 + 0.02 * Math.sin(t * 0.7 + ph) + (f.bright[i] < 0.5 ? (f.hash[i] - 0.5) * 0.35 : 0)
      let sx = cx + x * R * breathe
      let sy = cy + y * R * breathe
      let depth = z // -1 back … 1 front

      // Travellers: flow into the peer sphere along a tube and nest there.
      if (peer && f.hash[i] < travelShare) {
        const u = clamp((travelShare - f.hash[i]) / 0.12, 0, 1) // ease in as the link forms
        // Where along the journey: oscillates home → nest → home, lingering at both ends.
        const cyc = t * 0.06 + f.hash[i] * 7.3
        const w = 2 * Math.abs(cyc - Math.floor(cyc) - 0.5) // triangle wave 0→1→0
        const sPos = w * w * (3 - 2 * w)
        const nestR = peer.R * 0.42
        const ex = peer.cx + x * nestR
        const ey = peer.cy + y * nestR
        // Tube: lerp along the line with a lateral offset that pinches in the middle.
        const lx = sx + (ex - sx) * sPos
        const ly = sy + (ey - sy) * sPos
        const pinch = 0.18 + 0.82 * Math.pow(Math.abs(sPos - 0.5) * 2, 1.6) // thin in the middle, wide at the ends
        const twist = Math.sin(t * 0.8 + ph + sPos * 6.3) * 0.5 + f.side[i]
        const lateral = R * 0.5 * pinch * twist * (1 - sPos * 0.5)
        const tx = lx + px * lateral
        const ty = ly + py * lateral
        sx += (tx - sx) * u
        sy += (ty - sy) * u
      }

      // Project to the buffer.
      const bx = (sx - ox) * s
      const by = (sy - oy) * s
      if (bx < 0 || by < 0 || bx >= W || by >= H) continue
      const idx = ((by | 0) * W + (bx | 0)) * 4
      const big = f.bright[i] > 0.5 && depth > 0.2 && bx < W - 1 && by < H - 1
      // Front particles brighter; filaments brighter still, tinted towards white.
      const a = (0.3 + 0.7 * (depth + 1) * 0.5) * (0.3 + f.bright[i] * 0.9) * 0.95 * strength
      const white = f.bright[i] * 0.5 * (depth + 1) * 0.5
      const rr = (cr + (255 - cr) * white) * a
      const gg = (cg + (255 - cg) * white) * a
      const bb = (cb + (255 - cb) * white) * a
      const aa = 255 * a
      data[idx] += rr
      data[idx + 1] += gg
      data[idx + 2] += bb
      data[idx + 3] += aa
      if (big) {
        // Bright front filament particles get a second pixel to the right: a 2px glint.
        data[idx + 4] += rr * 0.6
        data[idx + 5] += gg * 0.6
        data[idx + 6] += bb * 0.6
        data[idx + 7] += aa * 0.6
      }
    }
  }
}

export function dustColor(index) {
  return DUST_COLORS[clamp(index, 0, DUST_COLORS.length - 1)]
}

/** Deterministic particle count from a window's size, same in every window. */
export function dustCountFor(w, h, base) {
  return Math.round(base * Math.max(0.35, Math.min(1, (w * h) / (1440 * 900))))
}
