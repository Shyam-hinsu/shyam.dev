import { clamp } from './easing.js'

/**
 * Registry of sections and elements the agents can work on.
 *
 * Markup contract:
 *   <section data-agent-section="projects">
 *     <article data-agent-element data-agent-handle="se">…</article>
 *   </section>
 *
 * Elements are revealed by animating `clip-path: inset(...)` from the handle's
 * opposite corner, so text and images are never distorted — the box is simply
 * "dragged open". Layout is untouched at all times.
 */
export class DOMInspector {
  constructor(config) {
    this.config = config
    this.items = new Map() // el -> item state
    this.sections = new Map() // id -> section state
    this.dirty = true
    this.viewport = { w: 0, h: 0 }
  }

  /** Scan the document for sections/elements; safe to call repeatedly. */
  scan(root = document) {
    const seen = new Set()
    root.querySelectorAll('[data-agent-section]').forEach((el) => {
      const id = el.dataset.agentSection
      let sec = this.sections.get(id)
      if (!sec) {
        sec = { id, el, status: 'idle', items: [], startedAt: 0, visible: false }
        this.sections.set(id, sec)
      } else {
        sec.el = el
      }
      el.querySelectorAll('[data-agent-element]').forEach((node) => {
        if (node.closest('dialog')) return
        seen.add(node)
        if (!this.items.has(node)) this.register(node, sec)
      })
    })
    // Drop elements that left the DOM (filtered lists, re-rendered components).
    for (const [el, item] of this.items) {
      if (!seen.has(el) || !el.isConnected) {
        this.items.delete(el)
        const idx = item.section.items.indexOf(item)
        if (idx >= 0) item.section.items.splice(idx, 1)
      }
    }
    this.dirty = true
  }

  register(el, section) {
    const handle = el.dataset.agentHandle || 'se'
    const p0 = section.id === 'hero' ? this.config.revealStart.hero : this.config.revealStart.default
    const item = {
      el,
      section,
      handle,
      status: 'collapsed', // collapsed | queued | hover | dragging | built
      progress: p0,
      p0,
      alpha: 1, // selection overlay alpha
      rect: null,
      queuedAt: 0,
      builtAt: 0,
      hovered: false,
    }
    // Hand reveal responsibility over from the scroll-reveal system.
    el.classList.remove('reveal')
    el.classList.add('agent-el', 'is-visible')
    // Elements added after their section finished are shown immediately.
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

  /** Reset every element of a section to its collapsed state. */
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

  /** Instantly finish an element (no animation). */
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

  /** Apply the reveal state to the DOM. Called only when progress changes. */
  applyReveal(item) {
    const { el, handle } = item
    const p = clamp(item.progress, 0, 1)
    if (p >= 1) {
      el.style.clipPath = ''
      el.style.opacity = ''
      el.style.willChange = ''
      el.classList.remove('agent-el--building')
      return
    }
    const r = (1 - p) * 100
    const right = handle.includes('e') ? r : 0
    const bottom = handle.includes('s') ? r : 0
    const left = handle.includes('w') ? r : 0
    const top = handle.includes('n') ? r : 0
    el.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`
    el.style.opacity = String(0.8 + 0.2 * p)
    el.classList.add('agent-el--building')
  }

  setViewport(w, h) {
    this.viewport.w = w
    this.viewport.h = h
    this.dirty = true
  }

  /** Measure the rects we need this frame. DOM reads happen only here. */
  measure(mode) {
    if (!this.dirty) return
    for (const item of this.items.values()) {
      const need = mode === 'all' || item.status !== 'built' || item.alpha > 0
      if (!need) continue
      const r = item.el.getBoundingClientRect()
      item.rect = { x: r.left, y: r.top, w: r.width, h: r.height }
    }
    this.dirty = false
  }

  /** Force a fresh measurement of one element (used while dragging). */
  measureItem(item) {
    const r = item.el.getBoundingClientRect()
    item.rect = { x: r.left, y: r.top, w: r.width, h: r.height }
    return item.rect
  }

  /** The currently visible (clipped) box of an element. */
  visualRect(item) {
    const r = item.rect
    if (!r) return null
    const p = clamp(item.progress, 0, 1)
    const h = item.handle
    let { x, y, w, hgt = r.h } = { x: r.x, y: r.y, w: r.w }
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

  /** Where a cursor must grab to drag this element open. */
  handlePoint(item) {
    const v = this.visualRect(item)
    if (!v) return null
    const h = item.handle
    const x = h.includes('e') ? v.x + v.w : h.includes('w') ? v.x : v.x + v.w / 2
    const y = h.includes('s') ? v.y + v.h : h.includes('n') ? v.y : v.y + v.h / 2
    return { x, y }
  }

  isInViewport(item, margin = 0) {
    const r = item.rect
    if (!r) return false
    return r.y + r.h > -margin && r.y < this.viewport.h + margin && r.w > 2
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
