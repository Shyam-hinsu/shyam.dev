<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { createSimulation, makeGraph } from '../workers/simulation.js'
import { useReducedMotion } from '../composables/useReducedMotion.js'

/**
 * Live demonstration: a force-directed layout of a clustered graph.
 *
 * "Worker" mode runs the simulation in a Web Worker and the main thread only
 * draws. "Main thread" mode runs the identical simulation code on the main
 * thread inside the render loop so you can feel the difference. The frame-time
 * readouts are measured with performance.now() in your browser; nothing is
 * pre-computed or invented.
 */
const reduced = useReducedMotion()
const canvas = ref(null)
const host = ref(null)

const sizes = [500, 1500, 3000]
// Several simulation steps per drawn frame: converges faster, and makes the
// main-thread cost per frame honest rather than hidden behind a cheap tick.
const STEPS_PER_FRAME = 6
const nodeCount = ref(1500)
const mode = ref('worker') // 'worker' | 'main'
const running = ref(false)
const alpha = ref(1)
const tickMs = ref(0)
const frameMs = ref(0)
const worstFrameMs = ref(0)
const supportsWorker = typeof Worker !== 'undefined'

let worker = null
let mainSim = null
let graph = null
let positions = null
let ctx = null
let raf = 0
let lastFrameAt = 0
let width = 0
let height = 0
let dpr = 1
let visible = false
let io = null
let ro = null
let frameSamples = []

const status = computed(() => {
  if (!running.value) return alpha.value <= 0.002 ? 'settled' : 'paused'
  return 'simulating'
})

function setupCanvas() {
  const el = canvas.value
  const rect = host.value.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = Math.max(320, Math.round(rect.width))
  height = Math.round(width * 0.62)
  el.width = width * dpr
  el.height = height * dpr
  el.style.height = `${height}px`
  ctx = el.getContext('2d', { alpha: false })
}

function buildGraph() {
  graph = makeGraph(nodeCount.value)
}

function initSim() {
  stop()
  buildGraph()
  positions = null
  alpha.value = 1
  tickMs.value = 0
  frameSamples = []
  worstFrameMs.value = 0
  const init = { n: nodeCount.value, edges: graph.edges, width, height, seed: 11 }
  if (mode.value === 'worker' && supportsWorker) {
    if (!worker) {
      worker = new Worker(new URL('../workers/layout.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = ({ data }) => {
        if (data.type !== 'frame') return
        positions = data.positions
        tickMs.value = data.tickMs
        alpha.value = data.alpha
        if (data.alpha <= 0.002) running.value = false
      }
    }
    worker.postMessage({ type: 'init', ...init })
    mainSim = null
  } else {
    mainSim = createSimulation(init)
    positions = mainSim.snapshot()
  }
  draw()
}

function start() {
  if (!visible) return
  running.value = true
  lastFrameAt = 0
  frameSamples = []
  if (mode.value === 'worker' && supportsWorker) worker?.postMessage({ type: 'start' })
  loop()
}

function stop() {
  running.value = false
  worker?.postMessage({ type: 'stop' })
  cancelAnimationFrame(raf)
  raf = 0
  lastFrameAt = 0
}

function reset() {
  initSim()
  if (!reduced.value) start()
  else settleInstantly()
}

/** Reduced motion: compute the final layout without animating it. */
function settleInstantly() {
  if (mode.value === 'worker' && supportsWorker) {
    // Let the worker run to completion; we draw only once it settles.
    running.value = true
    worker?.postMessage({ type: 'start' })
    const check = () => {
      if (alpha.value <= 0.002) draw()
      else setTimeout(check, 50)
    }
    check()
  } else if (mainSim) {
    while (mainSim.alpha > 0.002) mainSim.tick()
    positions = mainSim.snapshot()
    alpha.value = mainSim.alpha
    draw()
  }
}

function loop() {
  cancelAnimationFrame(raf)
  if (!running.value) return
  raf = requestAnimationFrame((now) => {
    if (lastFrameAt) {
      const dt = now - lastFrameAt
      frameSamples.push(dt)
      if (frameSamples.length > 30) frameSamples.shift()
      frameMs.value = frameSamples.reduce((a, b) => a + b, 0) / frameSamples.length
      if (dt > worstFrameMs.value) worstFrameMs.value = dt
    }
    lastFrameAt = now
    if (mainSim) {
      const t0 = performance.now()
      for (let s = 0; s < STEPS_PER_FRAME && mainSim.alpha > 0.002; s++) mainSim.tick()
      tickMs.value = performance.now() - t0
      positions = mainSim.snapshot()
      alpha.value = mainSim.alpha
      if (mainSim.alpha <= 0.002) running.value = false
    }
    draw()
    if (running.value) loop()
    else lastFrameAt = 0
  })
}

function draw() {
  if (!ctx || !positions || !graph) return
  const n = nodeCount.value
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#0d0d10'
  ctx.fillRect(0, 0, width, height)

  // Edges
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  const e = graph.edges
  for (let i = 0; i < e.length; i += 2) {
    const a = e[i] * 2
    const b = e[i + 1] * 2
    ctx.moveTo(positions[a], positions[a + 1])
    ctx.lineTo(positions[b], positions[b + 1])
  }
  ctx.stroke()

  // Leaf nodes
  ctx.fillStyle = '#c9c6bf'
  ctx.beginPath()
  for (let i = graph.hubs; i < n; i++) {
    const x = positions[i * 2]
    const y = positions[i * 2 + 1]
    ctx.moveTo(x + 1.4, y)
    ctx.arc(x, y, 1.4, 0, Math.PI * 2)
  }
  ctx.fill()

  // Hubs
  ctx.fillStyle = '#ff5f6a'
  ctx.beginPath()
  for (let i = 0; i < graph.hubs; i++) {
    const x = positions[i * 2]
    const y = positions[i * 2 + 1]
    ctx.moveTo(x + 3.5, y)
    ctx.arc(x, y, 3.5, 0, Math.PI * 2)
  }
  ctx.fill()
}

watch([nodeCount, mode], reset)

onMounted(() => {
  setupCanvas()
  initSim()
  io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting
      if (visible && alpha.value > 0.002 && !running.value) {
        if (reduced.value) settleInstantly()
        else start()
      } else if (!visible && running.value) {
        stop()
      }
    },
    { threshold: 0.2 },
  )
  io.observe(host.value)
  ro = new ResizeObserver(() => {
    const prev = width
    setupCanvas()
    if (Math.abs(prev - width) > 40) reset()
    else draw()
  })
  ro.observe(host.value)
  document.addEventListener('visibilitychange', onVisibility)
})

function onVisibility() {
  if (document.hidden) stop()
  else if (visible && alpha.value > 0.002) start()
}

onBeforeUnmount(() => {
  stop()
  io?.disconnect()
  ro?.disconnect()
  worker?.terminate()
  worker = null
  document.removeEventListener('visibilitychange', onVisibility)
})

const fmt = (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1))
</script>

<template>
  <div ref="host" class="demo">
    <div class="demo__toolbar">
      <div class="demo__group" role="group" aria-label="Simulation thread">
        <span class="demo__label mono">Thread</span>
        <button type="button" class="demo__opt" :class="{ 'is-active': mode === 'worker' }" :aria-pressed="mode === 'worker'" :disabled="!supportsWorker" @click="mode = 'worker'">
          Web Worker
        </button>
        <button type="button" class="demo__opt" :class="{ 'is-active': mode === 'main' }" :aria-pressed="mode === 'main'" @click="mode = 'main'">
          Main thread
        </button>
      </div>
      <div class="demo__group" role="group" aria-label="Node count">
        <span class="demo__label mono">Nodes</span>
        <button v-for="s in sizes" :key="s" type="button" class="demo__opt" :class="{ 'is-active': nodeCount === s }" :aria-pressed="nodeCount === s" @click="nodeCount = s">
          {{ s.toLocaleString() }}
        </button>
      </div>
      <div class="demo__group demo__group--end">
        <button type="button" class="btn btn--ghost demo__btn" @click="reset">Re-run layout</button>
      </div>
    </div>

    <canvas ref="canvas" class="demo__canvas" aria-label="Animated force-directed network layout" role="img" />

    <dl class="demo__stats" aria-live="polite" aria-atomic="false">
      <div>
        <dt class="mono">Status</dt>
        <dd><span class="demo__dot" :class="`is-${status}`" aria-hidden="true" />{{ status }}</dd>
      </div>
      <div>
        <dt class="mono">Simulation step</dt>
        <dd>{{ fmt(tickMs) }} ms <span class="muted">({{ mode === 'worker' ? 'in worker' : 'on main thread' }})</span></dd>
      </div>
      <div>
        <dt class="mono">Frame time (avg)</dt>
        <dd>{{ fmt(frameMs) }} ms</dd>
      </div>
      <div>
        <dt class="mono">Worst frame</dt>
        <dd>{{ fmt(worstFrameMs) }} ms</dd>
      </div>
    </dl>
    <p class="demo__note">
      Measured live with <code>performance.now()</code> on your device, so the numbers depend on your hardware.
      Each drawn frame runs {{ STEPS_PER_FRAME }} simulation steps. In "Main thread" mode that cost lands inside every
      frame; in worker mode the main thread only draws, so frame time stays close to your display's refresh interval
      while the worker converges at its own pace.
    </p>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: var(--s-4);
  padding: var(--s-4);
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
.demo__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3) var(--s-5);
  align-items: center;
}
.demo__group {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}
.demo__group--end {
  margin-left: auto;
}
.demo__label {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-right: 0.35rem;
}
.demo__opt {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  font-size: var(--text-sm);
  color: var(--ink-3);
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
}
.demo__opt:hover:not(:disabled) {
  color: var(--ink);
}
.demo__opt.is-active {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--ink-3);
}
.demo__opt:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.demo__btn {
  min-height: 2.4rem;
  padding-inline: 1rem;
}
.demo__canvas {
  width: 100%;
  border-radius: var(--r-md);
  border: 1px solid var(--line);
  background: #0d0d10;
}
.demo__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-3);
}
.demo__stats div {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.02);
}
.demo__stats dt {
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.demo__stats dd {
  margin-top: 0.2rem;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: capitalize;
}
.demo__stats dd .muted {
  text-transform: none;
  font-size: 0.72rem;
}
.demo__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-4);
}
.demo__dot.is-simulating {
  background: var(--accent-hot);
}
.demo__dot.is-settled {
  background: var(--ok);
}
.demo__note {
  font-size: var(--text-sm);
  color: var(--ink-3);
  text-wrap: pretty;
}
@media (min-width: 48em) {
  .demo__stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
