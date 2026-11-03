/**
 * Shared simulation core — used by the worker and, for comparison, by the
 * main thread in the live demo. Pure functions over typed arrays.
 */
export function createSimulation({ n, edges, width, height, seed = 1 }) {
  const x = new Float32Array(n)
  const y = new Float32Array(n)
  const vx = new Float32Array(n)
  const vy = new Float32Array(n)
  let alpha = 1
  let rand = mulberry32(seed)

  const cell = 24
  const cols = Math.max(1, Math.ceil(width / cell))
  const rows = Math.max(1, Math.ceil(height / cell))
  const head = new Int32Array(cols * rows)
  const next = new Int32Array(n)

  function reset() {
    rand = mulberry32(seed)
    const cx = width / 2
    const cy = height / 2
    const r = Math.min(width, height) * 0.42
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2
      const d = Math.sqrt(rand()) * r
      x[i] = cx + Math.cos(a) * d
      y[i] = cy + Math.sin(a) * d
      vx[i] = 0
      vy[i] = 0
    }
    alpha = 1
  }

  function rebuildGrid() {
    head.fill(-1)
    for (let i = 0; i < n; i++) {
      const c = clamp((x[i] / cell) | 0, 0, cols - 1)
      const r = clamp((y[i] / cell) | 0, 0, rows - 1)
      const k = r * cols + c
      next[i] = head[k]
      head[k] = i
    }
  }

  function repulsion(strength) {
    const radius = cell * 1.5
    const r2 = radius * radius
    for (let i = 0; i < n; i++) {
      const ci = clamp((x[i] / cell) | 0, 0, cols - 1)
      const ri = clamp((y[i] / cell) | 0, 0, rows - 1)
      for (let dr = -1; dr <= 1; dr++) {
        const rr = ri + dr
        if (rr < 0 || rr >= rows) continue
        for (let dc = -1; dc <= 1; dc++) {
          const cc = ci + dc
          if (cc < 0 || cc >= cols) continue
          let j = head[rr * cols + cc]
          while (j !== -1) {
            if (j !== i) {
              let dx = x[i] - x[j]
              let dy = y[i] - y[j]
              let d2 = dx * dx + dy * dy
              if (d2 < r2) {
                if (d2 < 0.01) {
                  dx = (rand() - 0.5) * 0.1
                  dy = (rand() - 0.5) * 0.1
                  d2 = 0.01
                }
                const f = (strength * (1 - Math.sqrt(d2) / radius)) / Math.sqrt(d2)
                vx[i] += dx * f
                vy[i] += dy * f
              }
            }
            j = next[j]
          }
        }
      }
    }
  }

  function springs(strength, rest) {
    for (let e = 0; e < edges.length; e += 2) {
      const a = edges[e]
      const b = edges[e + 1]
      const dx = x[b] - x[a]
      const dy = y[b] - y[a]
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01
      const f = ((d - rest) / d) * strength
      vx[a] += dx * f
      vy[a] += dy * f
      vx[b] -= dx * f
      vy[b] -= dy * f
    }
  }

  function gravity(strength) {
    const cx = width / 2
    const cy = height / 2
    for (let i = 0; i < n; i++) {
      vx[i] += (cx - x[i]) * strength
      vy[i] += (cy - y[i]) * strength
    }
  }

  function integrate(damping) {
    for (let i = 0; i < n; i++) {
      vx[i] *= damping
      vy[i] *= damping
      x[i] = clamp(x[i] + vx[i] * alpha, 2, width - 2)
      y[i] = clamp(y[i] + vy[i] * alpha, 2, height - 2)
    }
  }

  function tick() {
    rebuildGrid()
    repulsion(2.2)
    springs(0.05, 18)
    gravity(0.0025)
    integrate(0.82)
    alpha = Math.max(0, alpha * 0.985)
  }

  function snapshot() {
    const out = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) {
      out[i * 2] = x[i]
      out[i * 2 + 1] = y[i]
    }
    return out
  }

  reset()
  return {
    tick,
    snapshot,
    reset,
    get alpha() {
      return alpha
    },
  }
}

export function makeGraph(n, seed = 7) {
  // A clustered graph that looks like a network: hubs with leaves plus
  // a sparse set of cross-links between hubs.
  const rand = mulberry32(seed)
  const hubs = Math.max(4, Math.round(Math.sqrt(n) / 2))
  const list = []
  for (let i = hubs; i < n; i++) {
    const hub = (rand() * hubs) | 0
    list.push(hub, i)
    if (rand() < 0.08) list.push(i, (rand() * n) | 0)
  }
  for (let h = 1; h < hubs; h++) {
    list.push(h, (rand() * h) | 0)
    if (rand() < 0.5) list.push(h, (rand() * hubs) | 0)
  }
  return { edges: Uint32Array.from(list), hubs }
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}
