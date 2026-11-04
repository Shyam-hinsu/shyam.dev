/**
 * Pending build tasks, claimed by the nearest idle agent. Frames are enqueued
 * before the layers inside them so a card is dragged open before it is filled.
 */
export class AnimationTaskQueue {
  constructor() {
    this.pending = []
    this.active = new Set()
    this.completed = 0
  }

  enqueue(task) {
    this.pending.push(task)
  }

  claim(agent, inspector) {
    if (!this.pending.length) return null
    let best = -1
    let bestD = Infinity
    const window = Math.min(this.pending.length, 6)
    for (let i = 0; i < window; i++) {
      const t = this.pending[i]
      const p = t.item ? inspector.handlePoint(t.item) : t.rect ? { x: t.rect.x + t.rect.w / 2, y: t.rect.y + t.rect.h / 2 } : null
      const d = (p ? Math.hypot(p.x - agent.x, p.y - agent.y) : 0) + i * 60
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    const [task] = this.pending.splice(best, 1)
    this.active.add(task)
    return task
  }

  complete(task, agent) {
    if (this.active.delete(task)) this.completed++
    task.onDone?.(agent)
  }

  cancelAll() {
    this.pending.length = 0
    this.active.clear()
  }
}
