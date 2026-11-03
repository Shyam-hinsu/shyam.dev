/**
 * Canvas overlay renderer: cursors, labels, trails, click ripples, selection
 * boxes with eight handles, dimension pills and alignment guides.
 * All drawing happens in viewport coordinates on a device-pixel-ratio aware
 * canvas; nothing here reads the DOM.
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

  /** Blue (or red while dragging) selection box with handles and size pill. */
  drawSelection(rect, { alpha = 1, dragging = false, hovered = false, color } = {}) {
    if (!rect || rect.w < 2 || rect.h < 2) return
    if (rect.y + rect.h < 0 || rect.y > this.vh) return
    const ctx = this.ctx
    const c = this.config
    const stroke = color || (dragging ? c.dragColor : c.selectionColor)
    const x = Math.round(rect.x) + 0.5
    const y = Math.round(rect.y) + 0.5
    const w = Math.round(rect.w)
    const h = Math.round(rect.h)

    ctx.save()
    ctx.globalAlpha = alpha

    ctx.fillStyle = dragging ? 'rgba(255, 30, 66, 0.07)' : hovered ? 'rgba(59, 130, 246, 0.09)' : 'rgba(59, 130, 246, 0.05)'
    ctx.fillRect(x, y, w, h)

    ctx.strokeStyle = stroke
    ctx.lineWidth = dragging ? 1.5 : 1
    ctx.strokeRect(x, y, w, h)

    if (dragging) {
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

    // Eight handles
    const hs = c.handleSize
    const pts = [
      [x, y], [x + w / 2, y], [x + w, y],
      [x, y + h / 2], [x + w, y + h / 2],
      [x, y + h], [x + w / 2, y + h], [x + w, y + h],
    ]
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    for (const [hx, hy] of pts) {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
      ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs)
    }

    // Dimension pill
    const label = `${w} × ${h}`
    ctx.font = this.fontMono
    const tw = ctx.measureText(label).width
    const pw = tw + 10
    const ph = 16
    const px = Math.max(4, Math.min(this.vw - pw - 4, x + w - pw))
    const py = y + h + 6 < this.vh - ph ? y + h + 6 : y - ph - 6
    ctx.fillStyle = dragging ? '#e11d48' : '#2563eb'
    ctx.beginPath()
    ctx.roundRect(px, py, pw, ph, 3)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, px + 5, py + ph / 2 + 0.5)

    ctx.restore()
  }

  drawTrail(agent, now) {
    const t = agent.trail
    if (t.length < 2) return
    const ctx = this.ctx
    const life = this.config.trailLife
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let i = 1; i < t.length; i++) {
      const age = now - t[i].t
      const a = Math.max(0, 1 - age / life) * 0.55
      if (a <= 0.01) continue
      ctx.strokeStyle = agent.color
      ctx.globalAlpha = a
      ctx.lineWidth = 1 + (i / t.length) * 1.6
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
      const radius = (r.strong ? 30 : 18) * p
      ctx.globalAlpha = (1 - p) * (r.strong ? 0.9 : 0.6)
      ctx.strokeStyle = r.strong ? this.config.dragColor : agent.color
      ctx.lineWidth = r.strong ? 1.8 : 1.2
      ctx.beginPath()
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }

  drawCursor(agent) {
    const ctx = this.ctx
    const fill = agent.pressed ? this.config.dragColor : agent.color
    ctx.save()
    ctx.translate(agent.x, agent.y)
    if (agent.pressed) ctx.scale(0.9, 0.9)
    else if (agent.hovering) ctx.scale(1.06, 1.06)

    // Pointer
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
    ctx.strokeStyle = '#ffffff'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Identity label
    ctx.font = this.fontMono
    const text = agent.label
    const tw = ctx.measureText(text).width
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.roundRect(12, 14, tw + 10, 15, 3.5)
    ctx.fill()
    ctx.fillStyle = '#07070a'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 17, 21.5)

    ctx.restore()
  }
}
