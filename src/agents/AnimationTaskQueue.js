/**
 * Pending manipulation tasks, distributed to idle agents.
 * Tasks are claimed by the nearest idle cursor so motion looks intentional
 * rather than strictly round-robin.
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

  /** Claim the best task for an agent at (x, y). */
  claim(agent, inspector) {
    if (!this.pending.length) return null
    let best = -1
    let bestD = Infinity
    // Look only at the first few tasks so DOM order is broadly preserved.
    const window = Math.min(this.pending.length, 4)
    for (let i = 0; i < window; i++) {
      const t = this.pending[i]
      const p = t.item ? inspector.handlePoint(t.item) : null
      const d = p ? Math.hypot(p.x - agent.x, p.y - agent.y) + i * 80 : i * 80
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    const [task] = this.pending.splice(best, 1)
    this.active.add(task)
    return task
  }

  complete(task) {
    if (this.active.delete(task)) this.completed++
    task.onDone?.()
  }

  cancelAll() {
    this.pending.length = 0
    this.active.clear()
  }

  hasWork() {
    return this.pending.length > 0 || this.active.size > 0
  }
}
