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
      progress: kind === 'layer' ? 0 : this.config.revealStart,
      p0: kind === 'layer' ? 0 : this.config.revealStart,
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

  /** Start a layer's fade-in; the agent loop finishes it. */
  pop(item, now) {
    item.status = 'popping'
    item.popStart = now
    item.el.style.transition = `opacity ${this.config.popMs}ms ease-out`
    item.el.style.opacity = '1'
  }

  applyReveal(item) {
    const { el, handle, kind } = item
    const p = clamp(item.progress, 0, 1)
    if (p >= 1) {
      el.style.clipPath = ''
      el.style.opacity = ''
      el.style.willChange = ''
      el.style.transition = ''
      el.classList.remove('agent-el--building')
      return
    }
    el.classList.add('agent-el--building')
    if (kind === 'layer') {
      el.style.opacity = '0'
      el.style.clipPath = ''
      return
    }
    const r = (1 - p) * 100
    el.style.clipPath = `inset(${handle.includes('n') ? r : 0}% ${handle.includes('e') ? r : 0}% ${handle.includes('s') ? r : 0}% ${handle.includes('w') ? r : 0}%)`
    el.style.opacity = String(0.85 + 0.15 * p)
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
        const b = item.el.getBoundingClientRect()
        item.rect = { x: b.left, y: b.top, w: b.width, h: b.height }
      }
    }
    this.dirty = false
  }

  visualRect(item) {
    const r = item.rect
    if (!r) return null
    if (item.kind === 'layer') return { ...r }
    const p = clamp(item.progress, 0, 1)
    const h = item.handle
    let x = r.x
    let y = r.y
    let w = r.w
    let hgt = r.h
    if (h.includes('e')) w = r.w * p
    if (h.includes('w')) {
      w = r.w * p
      x = r.x + r.w - w
    }
    if (h.includes('s')) hgt = r.h * p
    if (h.includes('n')) {
      hgt = r.h * p
      y = r.y + r.h - hgt
    }
    return { x, y, w, h: hgt }
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
