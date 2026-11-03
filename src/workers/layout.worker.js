/**
 * Force-directed graph layout running off the main thread.
 *
 * Messages in:  { type: 'init', n, edges: Uint32Array, width, height, seed }
 *               { type: 'start' } | { type: 'stop' } | { type: 'reset' }
 * Messages out: { type: 'frame', positions: Float32Array, tickMs, alpha }
 *
 * The simulation is deliberately plain: a uniform spatial hash approximates
 * repulsion from nearby nodes, springs act along edges, a weak gravity keeps
 * the cloud centred, and velocities are damped as "alpha" cools.
 */
import { createSimulation } from './simulation.js'

const STEPS_PER_FRAME = 6
let sim = null
let running = false
let timer = 0

function loop() {
  if (!running || !sim) return
  const t0 = performance.now()
  for (let s = 0; s < STEPS_PER_FRAME && sim.alpha > 0.002; s++) sim.tick()
  const tickMs = performance.now() - t0
  const frame = sim.snapshot()
  self.postMessage({ type: 'frame', positions: frame, tickMs, alpha: sim.alpha }, [frame.buffer])
  if (sim.alpha > 0.002) timer = setTimeout(loop, 0)
  else running = false
}

self.onmessage = ({ data }) => {
  switch (data.type) {
    case 'init':
      sim = createSimulation(data)
      break
    case 'start':
      if (!sim) return
      running = true
      clearTimeout(timer)
      loop()
      break
    case 'stop':
      running = false
      clearTimeout(timer)
      break
    case 'reset':
      if (!sim) return
      sim.reset()
      running = true
      clearTimeout(timer)
      loop()
      break
  }
}
