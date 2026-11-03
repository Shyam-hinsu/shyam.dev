import { clamp } from './easing.js'

/**
 * Registry of sections, frames and layers the agents can work on.
 *
 * Markup contract:
 *   <section data-agent-section="projects">            section
 *     <article data-agent-element data-agent-handle="se">  frame (dragged open)
 *       <h3>…</h3> <p>…</p> <li class="tag">…</li>      layers (auto-discovered, tapped in)
 *     </article>
 *   </section>
 *   data-agent-atomic on a frame: treat it as one dragged block, never descend.
 *
 * Frames are revealed with clip-path (dragged open from the handle's opposite
 * corner); layers fade in. Layout is never touched, nothing is distorted.
 */
/** Transform origin (fractions) opposite the drag handle. */
function originOf(handle) {
  const ox = handle.includes('e') ? 0 : handle.includes('w') ? 1 : 0.5
  const oy = handle.includes('s') ? 0 : handle.includes('n') ? 1 : 0.5
  return [ox, oy]
}

export class DOMInspector {
  constructor(config) {
    this.config = config
    this.items = new Map() // el -> item
    this.sections = new Map() // id -> section
    this.dirty = true
    this.viewport = { w: 0, h: 0 }
    this.finaleEl = null
  }

  scan(root = document) {
    const seen = new Set()
    root.querySelectorAll('[data-agent-section]').forEach((el) => {
      const id = el.dataset.agentSection
      let sec = this.sections.get(id)
      if (!sec) {
        sec = { id, el, status: 'idle', items: [], visible: false, rect: null, order: this.sections.size }
        this.sections.set(id, sec)
      } else sec.el = el
      // The agents own every reveal inside a section.
      el.querySelectorAll('.reveal').forEach((r) => {
        r.classList.remove('reveal')
        r.classList.add('is-visible')
      })
      this.walk(el, sec, seen)
    })
    this.finaleEl = root.querySelector('[data-agent-finale]')
    for (const [el, item] of this.items) {
      if (!seen.has(el) || !el.isConnected) {
        this.items.delete(el)
        const i = item.section.items.indexOf(item)
        if (i >= 0) item.section.items.splice(i, 1)
      }
    }
    this.dirty = true
  }

  walk(node, sec, seen, insideFrame = null) {
    for (const el of node.children) {
      if (el.tagName === 'DIALOG' || el.hidden || el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true') continue
      if (el.hasAttribute('data-agent-element')) {
        const atomic = el.hasAttribute('data-agent-atomic')
        seen.add(el)
        if (!this.items.has(el)) this.register(el, sec, atomic ? 'atomic' : 'frame')
        if (!atomic) this.walk(el, sec, seen, el)
        continue
      }
      if (el.matches(this.config.layerSelector) && !el.querySelector('[data-agent-element]')) {
        seen.add(el)
        if (!this.items.has(el)) this.register(el, sec, el.matches('img, picture, canvas, .diagram, pre, blockquote') ? 'media' : 'layer')
        continue
      }
      this.walk(el, sec, seen, insideFrame)
    }
  }

  register(el, section, kind) {
    const handle = el.dataset.agentHandle || (kind === 'layer' ? 'e' : 'se')
    const item = {
      el,
      section,
      kind, // frame | atomic | media | layer
      handle,
      status: 'collapsed', // collapsed | queued | hover | dragging | popping | built
      progress: kind === 'layer' ? this.config.layerStart : this.config.revealStart,
      p0: kind === 'layer' ? this.config.layerStart : this.config.revealStart,
      scale: 1,
      origin: originOf(el.dataset.agentHandle || (kind === 'layer' ? 'e' : 'se')),
      alpha: 1,
      rect: null,
      queuedAt: 0,
      builtAt: 0,
      hovered: false,
      popStart: 0,
      cross: Math.random() < 0.18, // some layers get a "+" crosshair marker
    }
    el.classList.add('agent-el')
    if (section.status === 'done') {
      item.progress = 1
      item.status = 'built'
      item.alpha = 0
    }
    this.applyReveal(item)
    this.items.set(el, item)
    section.items.push(item)
    return item
  }

  collapseSection(section) {
    for (const item of section.items) {
      item.status = 'collapsed'
      item.progress = item.p0
      item.alpha = 1
      item.hovered = false
      this.applyReveal(item)
    }
    section.status = 'idle'
    this.dirty = true
  }

  build(item, now = performance.now()) {
    item.status = 'built'
    item.progress = 1
    item.builtAt = now
    item.hovered = false
    this.applyReveal(item)
  }

  buildAll() {
    for (const item of this.items.values()) {
      this.build(item)
      item.alpha = 0
    }
    for (const sec of this.sections.values()) sec.status = 'done'
  }

  /** Start a layer's pop-in; the agent loop finishes it. */
  pop(item, now) {
    item.status = 'popping'
    item.popStart = now
    const ms = this.config.popMs
    item.el.style.transition = `opacity ${ms}ms ease-out, transform ${ms + 60}ms cubic-bezier(0.22, 1, 0.36, 1)`
    item.el.style.opacity = '1'
    item.el.style.transform = 'scale(1)'
    item.scale = 1
  }

  /**
   * Apply the reveal state to the DOM. Frames and media are scaled from the
   * corner opposite the handle (the cursor "drags" them open); layers start
   * small and transparent and pop in. Transforms never affect layout.
   */
  applyReveal(item) {
    const { el, kind, origin } = item
    const p = clamp(item.progress, 0, 1)
    if (p >= 1 && item.status === 'built') {
      el.style.transform = ''
      el.style.transformOrigin = ''
      el.style.opacity = ''
      el.style.filter = ''
      el.style.willChange = ''
      el.style.transition = ''
      item.scale = 1
      el.classList.remove('agent-el--building')
      return
    }
    el.classList.add('agent-el--building')
    el.style.transformOrigin = `${origin[0] * 100}% ${origin[1] * 100}%`
    if (kind === 'layer') {
      if (item.status === 'popping') return
      el.style.transition = ''
      el.style.opacity = '0'
      el.style.transform = `scale(${p.toFixed(3)})`
      item.scale = p
      return
    }
    el.style.transform = `scale(${p.toFixed(3)})`
    item.scale = p
    if (item.status === 'dragging') {
      el.style.opacity = String((0.35 + 0.65 * p).toFixed(3))
      el.style.filter = 'contrast(112%)'
    } else {
      el.style.opacity = '0.22'
      el.style.filter = 'grayscale(90%) contrast(140%)'
    }
  }

  setViewport(w, h) {
    this.viewport.w = w
    this.viewport.h = h
    this.dirty = true
  }

  /** DOM reads happen only here, and only for what the frame needs. */
  measure(mode) {
    if (!this.dirty) return
    for (const sec of this.sections.values()) {
      const r = sec.el.getBoundingClientRect()
      sec.rect = { x: r.left, y: r.top, w: r.width, h: r.height }
      const near = r.bottom > -this.viewport.h && r.top < this.viewport.h * 2
      if (!near && mode !== 'all') continue
      for (const item of sec.items) {
        if (mode !== 'all' && item.status === 'built' && item.alpha <= 0) continue
        if (item.status === 'popping') continue // mid-transition: keep the base rect
        const b = item.el.getBoundingClientRect()
        // Un-scale to the element's natural box so overlays and handles are stable.
        const s = item.scale || 1
        const w = b.width / s
        const h = b.height / s
        item.rect = { x: b.left - item.origin[0] * (w - b.width), y: b.top - item.origin[1] * (h - b.height), w, h }
      }
    }
    this.dirty = false
  }

  /** The box the element currently occupies on screen (base rect × scale). */
  visualRect(item) {
    const r = item.rect
    if (!r) return null
    if (item.kind === 'layer') return { ...r }
    const s = item.status === 'built' ? 1 : item.scale || 1
    const w = r.w * s
    const h = r.h * s
    return { x: r.x + item.origin[0] * (r.w - w), y: r.y + item.origin[1] * (r.h - h), w, h }
  }

  handlePoint(item) {
    const v = this.visualRect(item)
    if (!v) return null
    if (item.kind === 'layer') {
      // Tap near the left of small layers, the centre of large ones.
      return { x: v.w > 240 ? v.x + v.w * 0.5 : v.x + Math.min(v.w * 0.5, 18), y: v.y + v.h / 2 }
    }
    const h = item.handle
    return {
      x: h.includes('e') ? v.x + v.w : h.includes('w') ? v.x : v.x + v.w / 2,
      y: h.includes('s') ? v.y + v.h : h.includes('n') ? v.y : v.y + v.h / 2,
    }
  }

  isInViewport(rect, margin = 0) {
    return !!rect && rect.y + rect.h > -margin && rect.y < this.viewport.h + margin && rect.w > 1 && rect.h > 1
  }

  get total() {
    return this.items.size
  }

  get builtCount() {
    let n = 0
    for (const item of this.items.values()) if (item.status === 'built') n++
    return n
  }
}
