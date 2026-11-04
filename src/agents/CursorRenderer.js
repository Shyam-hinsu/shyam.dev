/**
 * Canvas overlay renderer. Draws wireframe skeletons (filled frames, layer
 * boxes, handles, size pills, crosshairs), cursors, labels, trails and
 * ripples in viewport coordinates on a DPR-aware canvas. Never reads the DOM.
 */
export class CursorRenderer {
  constructor(canvas, config) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.config = config
    this.vw = 0
    this.vh = 0
    this.dpr = 1
    this.fontMono = '600 10px "JetBrains Mono", ui-monospace, monospace'
    this.fontSmall = '500 9px "JetBrains Mono", ui-monospace, monospace'
  }

  resize(vw, vh) {
    this.vw = vw
    this.vh = vh
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(vw * this.dpr)
    this.canvas.height = Math.round(vh * this.dpr)
    this.canvas.style.width = `${vw}px`
    this.canvas.style.height = `${vh}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  clear() {
    this.ctx.clearRect(0, 0, this.vw, this.vh)
  }

  /** Skeleton box for an unbuilt layer: filled slate rectangle with placeholder lines. */
  drawLayerSkeleton(rect, { alpha = 1, hovered = false, pressed = false, cross = false } = {}) {
    if (!rect || rect.w < 2 || rect.h < 2) return
    const ctx = this.ctx
    const c = this.config
    const x = Math.round(rect.x) + 0.5
    const y = Math.round(rect.y) + 0.5
    const w = Math.round(rect.w)
    const h = Math.round(rect.h)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = pressed ? 'rgba(147, 197, 253, 0.3)' : hovered ? 'rgba(99, 125, 165, 0.36)' : c.wireFill
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = pressed || hovered ? '#dbeafe' : c.wireStroke
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
    // Placeholder "text lines" for taller layers
    if (h > 34 && w > 60) {
      ctx.fillStyle = 'rgba(191, 219, 254, 0.18)'
      const lh = 12
      const rows = Math.min(6, Math.floor((h - 10) / lh))
      for (let i = 0; i < rows; i++) {
        const lw = w * (i === rows - 1 ? 0.55 : 0.9) - 12
        ctx.fillRect(x + 6, y + 6 + i * lh, Math.max(10, lw), 5)
      }
    }
    // Corner handles for hovered layers
    if (hovered || pressed) {
      const hs = 4
      ctx.fillStyle = '#fff'
      for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
      if (w > 120) this.drawPill(`${w} × ${h}`, x, y, w, h, false)
    }
    if (cross) this.drawCross(x + w + 10, y - 6)
    ctx.restore()
  }

  drawCross(x, y) {
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - 4, y)
    ctx.lineTo(x + 4, y)
    ctx.moveTo(x, y - 4)
    ctx.lineTo(x, y + 4)
    ctx.stroke()
    ctx.restore()
  }

  /** Figma-style frame selection: outline, eight handles, size pill, drag guides. */
  drawFrame(rect, { alpha = 1, dragging = false, hovered = false, fill = true } = {}) {
    if (!rect || rect.w < 2 || rect.h < 2) return
    if (rect.y + rect.h < 0 || rect.y > this.vh) return
    const ctx = this.ctx
    const c = this.config
    const stroke = dragging ? c.dragColor : hovered ? '#bfdbfe' : c.wireStroke
    const x = Math.round(rect.x) + 0.5
    const y = Math.round(rect.y) + 0.5
    const w = Math.round(rect.w)
    const h = Math.round(rect.h)
    ctx.save()
    ctx.globalAlpha = alpha
    if (fill) {
      ctx.fillStyle = dragging ? 'rgba(255, 30, 66, 0.06)' : c.wireFillFrame
      ctx.fillRect(x, y, w, h)
    }
    ctx.strokeStyle = stroke
    ctx.lineWidth = dragging ? 1.5 : 1
    ctx.strokeRect(x, y, w, h)
    if (dragging && w > 200) {
      ctx.save()
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = 'rgba(255, 30, 66, 0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + h)
      ctx.lineTo(this.vw, y + h)
      ctx.moveTo(x + w, 0)
      ctx.lineTo(x + w, this.vh)
      ctx.stroke()
      ctx.restore()
    }
    const hs = c.handleSize
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = stroke
    for (const [hx, hy] of [
      [x, y], [x + w / 2, y], [x + w, y],
      [x, y + h / 2], [x + w, y + h / 2],
      [x, y + h], [x + w / 2, y + h], [x + w, y + h],
    ]) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
      ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs)
    }
    this.drawPill(`${w} × ${h}`, x, y, w, h, dragging)
    ctx.restore()
  }

  drawPill(label, x, y, w, h, red) {
    const ctx = this.ctx
    ctx.font = this.fontMono
    const tw = ctx.measureText(label).width
    const pw = tw + 10
    const ph = 16
    const px = Math.max(4, Math.min(this.vw - pw - 4, x + w - pw))
    const py = y + h + 6 < this.vh - ph ? y + h + 6 : y - ph - 6
    ctx.fillStyle = red ? '#e11d48' : '#2563eb'
    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, 3)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, px + 5, py + ph / 2 + 0.5)
  }

  drawTrail(agent, now) {
    const t = agent.trail
    if (t.length < 2) return
    const ctx = this.ctx
    const life = this.config.trailLife
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = agent.color
    for (let i = 1; i < t.length; i++) {
      const a = Math.max(0, 1 - (now - t[i].t) / life) * 0.5
      if (a <= 0.01) continue
      ctx.globalAlpha = a
      ctx.lineWidth = 0.8 + (i / t.length) * 1.4
      ctx.beginPath()
      ctx.moveTo(t[i - 1].x, t[i - 1].y)
      ctx.lineTo(t[i].x, t[i].y)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawRipples(agent, now) {
    if (!agent.ripples.length) return
    const ctx = this.ctx
    const ms = this.config.rippleMs
    ctx.save()
    for (const r of agent.ripples) {
      const p = (now - r.t0) / ms
      if (p >= 1) continue
      ctx.globalAlpha = (1 - p) * (r.strong ? 0.9 : 0.6)
      ctx.strokeStyle = r.strong ? this.config.dragColor : agent.color
      ctx.lineWidth = r.strong ? 1.6 : 1.1
      ctx.beginPath()
      ctx.arc(r.x, r.y, (r.strong ? 26 : 14) * p, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  /** A cursor from another window, drawn where it is on the shared screen. */
  drawRemoteCursor(a) {
    this.drawCursor({ x: a.x, y: a.y, color: a.color, label: a.label, pressed: a.pressed, hovering: false }, !a.label)
  }

  drawRemoteTrail(a, now) {
    if (!a.trail || a.trail.length < 2) return
    this.drawTrail({ color: a.color, trail: a.trail }, now)
  }

  /** Thin link from this window's centre to another window's centre. */
  drawWindowLink(from, to, label) {
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(147, 197, 253, 0.9)'
    ctx.beginPath()
    ctx.arc(from.x, from.y, 3, 0, Math.PI * 2)
    ctx.fill()
    if (label) {
      ctx.font = this.fontSmall
      ctx.fillStyle = 'rgba(191, 219, 254, 0.8)'
      ctx.textBaseline = 'middle'
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2
      ctx.fillText(label, mx + 6, my)
    }
    ctx.restore()
  }

  drawCursor(agent, small = false) {
    const ctx = this.ctx
    const fill = agent.pressed ? this.config.dragColor : agent.color
    ctx.save()
    ctx.translate(agent.x, agent.y)
    const s = (small ? 0.72 : 1) * (agent.pressed ? 0.9 : agent.hovering ? 1.06 : 1)
    ctx.scale(s, s)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, 16)
    ctx.lineTo(4.5, 12.2)
    ctx.lineTo(7.8, 19)
    ctx.lineTo(10.2, 17.8)
    ctx.lineTo(6.8, 11.2)
    ctx.lineTo(12.5, 11.2)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 1.3
    ctx.strokeStyle = '#fff'
    ctx.lineJoin = 'round'
    ctx.stroke()
    if (agent.label) {
      ctx.font = this.fontMono
      const tw = ctx.measureText(agent.label).width
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.roundRect(12, 14, tw + 10, 15, 3.5)
      ctx.fill()
      ctx.fillStyle = '#07070a'
      ctx.textBaseline = 'middle'
      ctx.fillText(agent.label, 17, 21.5)
    }
    ctx.restore()
  }
}
