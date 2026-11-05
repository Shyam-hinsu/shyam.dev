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

  /**
   * Claim the nearest task whose target is on or near the screen. Work that
   * is scrolled away stays queued until it comes back, instead of being
   * claimed and then abandoned.
   */
  claim(agent, inspector, vh = Infinity) {
    if (!this.pending.length) return null
    let best = -1
    let bestD = Infinity
    // Scan the whole queue: on-screen work may sit behind tasks from sections scrolled away.
    for (let i = 0; i < this.pending.length; i++) {
      const t = this.pending[i]
      const p = t.item ? inspector.handlePoint(t.item) : t.rect ? { x: t.rect.x + t.rect.w / 2, y: t.rect.y + t.rect.h / 2 } : null
      if (!p || p.y < -vh * 0.5 || p.y > vh * 1.5) continue
      const d = Math.hypot(p.x - agent.x, p.y - agent.y) + Math.min(i, 8) * 60
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (best < 0) return null
    const [task] = this.pending.splice(best, 1)
    this.active.add(task)
    return task
  }

  /** Put an abandoned task back at the front of the queue, still owed. */
  release(task) {
    this.active.delete(task)
    this.pending.unshift(task)
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
