/**
 * One rotating wireframe cube per linked window, drawn in shared screen
 * space so the cubes sit still on the monitor while windows move around
 * them. A port of Bjørn Staal's "multipleWindow3dScene"
 * (github.com/bgstaal/multipleWindow3dScene) to a plain 2D canvas: the
 * original uses three.js with an orthographic camera, so projection here is
 * a rotation followed by dropping z. No dependencies.
 */
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
]
const CORNERS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
]

const midnight = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})()

/** Seconds since local midnight: every window sees the same clock. */
export function sharedTime() {
  return (Date.now() - midnight) / 1000
}

export class SceneLayer {
  constructor(config = {}) {
    this.falloff = config.falloff ?? 0.05
    this.offset = { x: 0, y: 0 } // eased scene offset, like the original
    this.cubes = new Map() // window id -> eased centre
  }

  /** Call once per frame with this window's shape and every window (self first). */
  draw(ctx, self, windows, { alpha = 0.55 } = {}) {
    const target = { x: -self.x, y: -self.y }
    this.offset.x += (target.x - this.offset.x) * this.falloff
    this.offset.y += (target.y - this.offset.y) * this.falloff
    const t = sharedTime()

    windows.forEach((win, i) => {
      let c = this.cubes.get(win.id)
      const cx = win.x + win.w / 2
      const cy = win.y + win.h / 2
      if (!c) {
        c = { x: cx, y: cy }
        this.cubes.set(win.id, c)
      }
      c.x += (cx - c.x) * this.falloff
      c.y += (cy - c.y) * this.falloff
      const size = (100 + i * 50) / 2
      const hue = (i * 36) % 360
      this.drawCube(ctx, c.x + this.offset.x, c.y + this.offset.y, size, t * 0.5, t * 0.3, `hsla(${hue}, 100%, 60%, ${alpha})`)
    })

    for (const id of this.cubes.keys()) if (!windows.some((w) => w.id === id)) this.cubes.delete(id)
  }

  drawCube(ctx, x, y, s, rx, ry, color) {
    const cx = Math.cos(rx)
    const sx = Math.sin(rx)
    const cy = Math.cos(ry)
    const sy = Math.sin(ry)
    const pts = CORNERS.map(([px, py, pz]) => {
      // rotate around x, then y; orthographic: drop z
      const y1 = py * cx - pz * sx
      const z1 = py * sx + pz * cx
      const x2 = px * cy + z1 * sy
      return [x + x2 * s, y + y1 * s]
    })
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (const [a, b] of EDGES) {
      ctx.moveTo(pts[a][0], pts[a][1])
      ctx.lineTo(pts[b][0], pts[b][1])
    }
    ctx.stroke()
    ctx.restore()
  }
}
