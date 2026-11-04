/**
 * Shares window geometry and cursor positions between browser windows of this
 * site, so the agents live in one screen-space world: a cursor leaving one
 * window appears in the other at the same place on the monitor.
 *
 * Transport: BroadcastChannel (same origin), with a localStorage fallback.
 * Nothing leaves the browser.
 */
const CHANNEL = 'shyam.dev/agents-world'
const KEY = 'shyam.dev/agents-world'

export class WindowManager {
  constructor({ ttl = 1500, heartbeatMs = 300 } = {}) {
    this.id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    this.created = Date.now()
    this.ttl = ttl
    this.heartbeatMs = heartbeatMs
    this.peers = new Map() // id -> { id, created, x, y, w, h, t, agents }
    this.shape = { x: 0, y: 0, w: 0, h: 0 }
    this.channel = null
    this.timer = 0
    this.listeners = new Set()
    this.onMessage = (e) => this.receive(e.data)
    this.onStorage = (e) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        this.receive(JSON.parse(e.newValue))
      } catch {
        /* ignore */
      }
    }
    this.onUnload = () => this.stop()
  }

  start() {
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = this.onMessage
    } else {
      window.addEventListener('storage', this.onStorage)
    }
    window.addEventListener('pagehide', this.onUnload)
    this.measure(true)
    this.timer = setInterval(() => {
      this.measure(true)
      this.prune()
    }, this.heartbeatMs)
  }

  stop() {
    clearInterval(this.timer)
    this.send({ type: 'bye' })
    this.channel?.close()
    this.channel = null
    window.removeEventListener('storage', this.onStorage)
    window.removeEventListener('pagehide', this.onUnload)
  }

  /** Read this window's place on the screen. Cheap; called every frame. */
  measure(force = false) {
    const s = this.shape
    const x = window.screenX
    const y = window.screenY
    const w = window.innerWidth
    const h = window.innerHeight
    const changed = x !== s.x || y !== s.y || w !== s.w || h !== s.h
    if (changed) {
      s.x = x
      s.y = y
      s.w = w
      s.h = h
    }
    if (changed || force) this.send({ type: 'shape', shape: { ...s } })
    return changed
  }

  /** Broadcast this window's cursor positions in screen coordinates. */
  publishAgents(agents) {
    this.send({ type: 'agents', agents })
  }

  /** Broadcast this window's dust (Float32Array of x, y, size in screen coords). */
  publishDust(buf) {
    if (this.channel) this.channel.postMessage({ type: 'dust', id: this.id, created: this.created, t: Date.now(), buf })
    // No localStorage fallback for dust: too chatty, and the effect is optional.
  }

  send(msg) {
    const payload = { ...msg, id: this.id, created: this.created, t: Date.now() }
    if (this.channel) this.channel.postMessage(payload)
    else {
      try {
        localStorage.setItem(KEY, JSON.stringify(payload))
      } catch {
        /* storage unavailable */
      }
    }
  }

  receive(msg) {
    if (!msg || msg.id === this.id) return
    if (msg.type === 'bye') {
      this.peers.delete(msg.id)
      this.emit()
      return
    }
    let peer = this.peers.get(msg.id)
    if (!peer) {
      peer = { id: msg.id, created: msg.created, x: 0, y: 0, w: 0, h: 0, t: 0, agents: [], dust: null }
      this.peers.set(msg.id, peer)
      // Introduce ourselves so the newcomer learns our shape at once.
      this.send({ type: 'shape', shape: { ...this.shape } })
    }
    peer.t = msg.t
    if (msg.type === 'shape') Object.assign(peer, msg.shape)
    if (msg.type === 'agents') peer.agents = msg.agents
    if (msg.type === 'dust') {
      peer.dust = msg.buf
      return // high-frequency; no listeners needed
    }
    this.emit()
  }

  prune() {
    const now = Date.now()
    let changed = false
    for (const [id, p] of this.peers) {
      if (now - p.t > this.ttl) {
        this.peers.delete(id)
        changed = true
      }
    }
    if (changed) this.emit()
  }

  /** Other windows, oldest first. */
  others() {
    return [...this.peers.values()].filter((p) => p.w > 0).sort((a, b) => a.created - b.created)
  }

  /** Is this the oldest window in the group? */
  get isPrimary() {
    return !this.others().some((p) => p.created < this.created)
  }

  onChange(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    for (const fn of this.listeners) fn(this)
  }

  /** Screen → this window's viewport. */
  toLocal(sx, sy) {
    return { x: sx - this.shape.x, y: sy - this.shape.y }
  }

  toScreen(x, y) {
    return { x: x + this.shape.x, y: y + this.shape.y }
  }
}
