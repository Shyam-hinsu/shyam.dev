/**
 * Engineering showcase — how problems actually get solved.
 * Each entry follows Problem → Investigation → Decision → Implementation → Result.
 *
 * Code excerpts are genuine: the topology example is the code running in the
 * live demo on this page. Nothing here reports invented benchmark numbers;
 * the demo measures its own frame times in your browser.
 */
export const showcase = [
  {
    id: 'topology-at-scale',
    kicker: '01',
    title: 'Topology at scale without freezing the UI',
    tags: ['Web Workers', 'Canvas', 'Typed arrays'],
    hasDemo: true,
    steps: [
      {
        label: 'Problem',
        text: 'A force-directed layout for a few thousand nodes needs hundreds of simulation ticks. On the main thread each tick blocks input, so the page freezes until the graph settles.',
      },
      {
        label: 'Investigation',
        text: 'Profiling showed the cost was almost entirely in the simulation, not in drawing. Rendering a few thousand circles on a canvas is cheap; computing their positions is not.',
      },
      {
        label: 'Decision',
        text: 'Split the work along that line: a Web Worker owns the simulation and the main thread owns drawing and interaction. Communicate with typed arrays so the transfer itself is nearly free.',
      },
      {
        label: 'Implementation',
        text: 'The worker runs a spatial-hash approximation of repulsion plus spring forces along edges, then posts a Float32Array of positions as a transferable. The main thread draws the latest frame inside requestAnimationFrame, and only while the canvas is visible.',
      },
      {
        label: 'Result',
        text: 'Interaction stays smooth while the layout converges. Toggle the demo below between worker and main-thread mode and watch the measured frame time in your own browser.',
      },
    ],
    code: {
      language: 'js',
      filename: 'layout.worker.js',
      source: `// Inside the worker: one simulation tick, then hand the frame back.
function tick() {
  grid.rebuild(x, y)                 // spatial hash: O(n) instead of O(n²)
  applyRepulsion(grid, x, y, vx, vy) // neighbours only
  applySprings(edges, x, y, vx, vy)  // edges pull their endpoints together
  integrate(x, y, vx, vy, damping)   // move, cool down

  const frame = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    frame[i * 2] = x[i]
    frame[i * 2 + 1] = y[i]
  }
  // Transfer ownership of the buffer — no copy, no main-thread stall.
  self.postMessage({ type: 'frame', positions: frame }, [frame.buffer])
}`,
    },
  },
  {
    id: 'mixins-to-composables',
    kicker: '02',
    title: 'Vue 2 mixins to Vue 3 composables',
    tags: ['Vue 3', 'Composition API', 'Migration'],
    hasDemo: false,
    steps: [
      {
        label: 'Problem',
        text: 'Shared behaviour lived in mixins. A component using three mixins had properties and methods coming from nowhere, name collisions were silent, and nothing could be unit tested in isolation.',
      },
      {
        label: 'Investigation',
        text: 'Mapped every mixin to the components using it and classified them: pure utilities, stateful behaviour (polling, selection, pagination) and lifecycle glue.',
      },
      {
        label: 'Decision',
        text: 'Run the app on the Vue 3 migration build first so everything kept working, then convert mixins to composables one category at a time with explicit inputs and return values.',
      },
      {
        label: 'Implementation',
        text: 'Each composable owns its reactive state, accepts options and returns a small API. Components call them in setup() and the data flow becomes visible at the call site.',
      },
      {
        label: 'Result',
        text: 'Shared logic became traceable and testable. The same pattern now guides all new code in the codebase.',
      },
    ],
    code: {
      language: 'js',
      filename: 'usePolling.js',
      source: `// Before: a mixin that silently injected $data, methods and lifecycle hooks.
// After: an explicit composable with a visible contract.
import { ref, onMounted, onBeforeUnmount } from 'vue'

export function usePolling(fetcher, { interval = 10_000 } = {}) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)
  let timer = null

  async function refresh() {
    if (document.hidden) return schedule() // don't poll hidden tabs
    loading.value = true
    try {
      data.value = await fetcher()
      error.value = null
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
      schedule()
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(refresh, interval)
  }

  onMounted(refresh)
  onBeforeUnmount(() => clearTimeout(timer))

  return { data, error, loading, refresh }
}`,
    },
  },
  {
    id: 'live-charts',
    kicker: '03',
    title: 'Dozens of live charts on one screen',
    tags: ['Highcharts', 'Rendering', 'Scheduling'],
    hasDemo: false,
    steps: [
      {
        label: 'Problem',
        text: 'Each dashboard panel polled its own endpoint and re-created its chart on every response. With many panels, the page stuttered on each refresh and users lost zoom and tooltip state.',
      },
      {
        label: 'Investigation',
        text: 'Timeline recordings showed clusters of chart construction and layout work landing in the same frames. The data volume was small; the churn was the problem.',
      },
      {
        label: 'Decision',
        text: 'Create each chart once and update series in place. Coordinate polling per screen rather than per panel, and batch redraws into a single animation frame.',
      },
      {
        label: 'Implementation',
        text: 'A wrapper component owns the Highcharts instance, maps new data onto existing series with setData(redraw = false), and a scheduler calls one redraw per frame for all panels that changed.',
      },
      {
        label: 'Result',
        text: 'Refreshes became visually seamless, interaction state survived, and adding a panel type became a matter of describing its series rather than configuring a chart.',
      },
    ],
    code: {
      language: 'js',
      filename: 'useChartUpdates.js',
      source: `// Update series in place and let one rAF flush all pending redraws.
const pending = new Set()
let scheduled = false

export function updateSeries(chart, nextSeries) {
  nextSeries.forEach((s, i) => {
    const existing = chart.series[i]
    if (existing) existing.setData(s.data, false, false, false) // no redraw yet
    else chart.addSeries(s, false)
  })
  pending.add(chart)
  if (!scheduled) {
    scheduled = true
    requestAnimationFrame(() => {
      pending.forEach((c) => c.redraw(false))
      pending.clear()
      scheduled = false
    })
  }
}`,
    },
  },
]
