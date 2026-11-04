/**
 * Dust: a particle globe that belongs to this window. Particles are placed
 * from a real land mask of the Earth (Natural Earth 1:110m), dense on the
 * continents with a faint haze over the oceans, and the globe turns slowly
 * on a 23.4° tilted polar axis. When another window is linked and close
 * enough, part of the dust flows through a tube to the other window and forms
 * a smaller sphere of this window's colour inside the other window's sphere,
 * as in Bjørn Staal's particle multi-window scene.
 *
 * Everything is a pure function of a seed and a shared clock, so every window
 * computes every window's dust locally: nothing but window shapes is shared.
 * Positions are in screen coordinates. Plain 2D canvas, no dependencies.
 */
import { clamp } from '../agents/easing.js'
import { isLand } from './landMask.js'

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
    let i = 0
    let guard = 0
    // Rejection-sample the sphere: land points are kept, ocean points mostly dropped.
    while (i < n && guard++ < n * 12) {
      const z = rand() * 2 - 1 // sin(lat), uniform on the sphere
      const lon = rand() * 360 - 180
      const lat = (Math.asin(z) * 180) / Math.PI
      const land = isLand(lon, lat)
      if (!land && rand() > 0.13) continue
      const r = Math.sqrt(1 - z * z)
      const a = (lon * Math.PI) / 180
      // x: lon 0 towards the viewer at t=0, y: north up, z: east
      this.dir[i * 3] = r * Math.cos(a)
      this.dir[i * 3 + 1] = z
      this.dir[i * 3 + 2] = r * Math.sin(a)
      // Coast detection: a neighbour cell in the sea makes this a coastline point.
      const coast = land && !(isLand(lon + 1.2, lat) && isLand(lon - 1.2, lat) && isLand(lon, lat + 1.2) && isLand(lon, lat - 1.2))
      this.bright[i] = land ? (coast ? 0.95 : 0.55 + rand() * 0.25) : 0.16 + rand() * 0.1
      this.phase[i] = rand() * Math.PI * 2
      this.hash[i] = rand()
      this.side[i] = rand() * 2 - 1
      i++
    }
    this.count = i
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
    const R = Math.min(win.w, win.h) * 0.26
    const [cr, cg, cb] = win.color
    const W = this.w
    const H = this.h
    const s = this.scale
    const ox = view.x
    const oy = view.y

    // One rotation every ~80 s about the polar axis, then the 23.4° axial tilt.
    // Each window starts at a different longitude so two globes are not identical.
    const seedRot = (win.created % 1000) / 1000
    const spin = t * 0.08 + seedRot * 6.28
    const tilt = (23.4 * Math.PI) / 180
    const cs = Math.cos(spin)
    const sn = Math.sin(spin)
    const ct = Math.cos(tilt)
    const st = Math.sin(tilt)

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
      // Base direction (x towards viewer, y north, z east); spin about y, then tilt about z.
      const bx0 = f.dir[i * 3]
      const by0 = f.dir[i * 3 + 1]
      const bz0 = f.dir[i * 3 + 2]
      const x1 = bx0 * cs + bz0 * sn
      const z1 = -bx0 * sn + bz0 * cs
      const x = x1 * ct - by0 * st
      const y = x1 * st + by0 * ct
      const z = z1
      const ph = f.phase[i]
      // Screen: z is right, y is up, x is towards the viewer.
      let sx = cx + z * R
      let sy = cy - y * R
      let depth = x // -1 back … 1 front

      // Travellers: flow into the peer sphere along a tube and nest there.
      if (peer && f.hash[i] < travelShare) {
        const u = clamp((travelShare - f.hash[i]) / 0.12, 0, 1) // ease in as the link forms
        // Where along the journey: oscillates home → nest → home, lingering at both ends.
        const cyc = t * 0.06 + f.hash[i] * 7.3
        const w = 2 * Math.abs(cyc - Math.floor(cyc) - 0.5) // triangle wave 0→1→0
        const sPos = w * w * (3 - 2 * w)
        const nestR = peer.R * 0.42
        const ex = peer.cx + z * nestR
        const ey = peer.cy - y * nestR
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
      const big = f.bright[i] > 0.9 && depth > 0.3 && bx < W - 1 && by < H - 1
      // Front particles brighter; filaments brighter still, tinted towards white.
      const front = (depth + 1) * 0.5
      // Rim light: particles near the limb (depth ≈ 0) get a lift so the edge always reads.
      const rim = Math.max(0, 1 - Math.abs(depth) * 6) * 0.35
      const a = (0.08 + 0.92 * front * front + rim) * (0.25 + f.bright[i] * 1.0) * 0.95 * strength
      const white = f.bright[i] * 0.45 * front
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
