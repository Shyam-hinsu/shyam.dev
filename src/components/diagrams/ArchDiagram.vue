<script setup>
/**
 * Genuine architecture diagrams, drawn as inline SVG.
 * These stand in for confidential screenshots and are labelled as diagrams.
 */
defineProps({
  kind: { type: String, required: true },
  title: { type: String, default: 'Architecture diagram' },
})

const migrationSteps = [
  { t: 'Audit', d: 'filters, event bus, $listeners, slot syntax, reactivity assumptions' },
  { t: 'Compatibility build', d: 'run on Vue 3 immediately; each warning category becomes a workstream' },
  { t: 'Mixins → composables', d: 'explicit inputs and outputs; unit-testable shared logic' },
  { t: 'Library & tooling upgrade', d: 'Ant Design Vue, Webpack pipeline, Less theme intact' },
  { t: 'Remove flags, delete dead code', d: 'Composition API becomes the standard for new work' },
]

function sparkline(seed, x0, y0) {
  const pts = []
  let v = 30
  for (let i = 0; i <= 12; i++) {
    v += Math.sin(i * 0.9 + seed) * 7 + Math.cos(i * 1.7 + seed * 2) * 4
    pts.push(`${x0 + i * 11},${y0 + 40 - Math.max(4, Math.min(42, v))}`)
  }
  return pts.join(' ')
}
</script>

<template>
  <div class="diagram" role="img" :aria-label="title">
    <svg width="0" height="0" class="diagram__defs" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="dg" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0v20" fill="none" stroke="rgba(255,255,255,.05)" />
        </pattern>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8z" fill="#e3323f" />
        </marker>
      </defs>
    </svg>
    <!-- Monitoring platform: modules, API layer, workers -->
    <svg v-if="kind === 'monitoring'" viewBox="0 0 640 400" class="diagram__svg">
      <rect width="640" height="400" fill="url(#dg)" />
      <g class="d-box" v-for="(m, i) in ['Devices', 'Alarms', 'Topology', 'Reports']" :key="m">
        <rect :x="40 + i * 145" y="40" width="125" height="64" rx="8" />
        <text :x="102 + i * 145" y="66" text-anchor="middle" class="d-t">{{ m }}</text>
        <text :x="102 + i * 145" y="86" text-anchor="middle" class="d-s">feature module</text>
        <line :x1="102 + i * 145" y1="104" :x2="102 + i * 145" y2="150" class="d-l" />
      </g>
      <rect x="40" y="150" width="560" height="52" rx="8" class="d-box-accent" />
      <text x="320" y="172" text-anchor="middle" class="d-t">Shared UI layer · Ant Design Vue wrappers · chart wrappers · tokens</text>
      <text x="320" y="190" text-anchor="middle" class="d-s">consistent behaviour by default</text>
      <line x1="320" y1="202" x2="320" y2="240" class="d-l" />
      <rect x="40" y="240" width="270" height="56" rx="8" class="d-box" />
      <text x="175" y="263" text-anchor="middle" class="d-t">API adapters → view models</text>
      <text x="175" y="282" text-anchor="middle" class="d-s">REST normalised, components never see raw shapes</text>
      <rect x="330" y="240" width="270" height="56" rx="8" class="d-box" />
      <text x="465" y="263" text-anchor="middle" class="d-t">Web Workers</text>
      <text x="465" y="282" text-anchor="middle" class="d-s">aggregation · graph layout · diffing</text>
      <line x1="175" y1="296" x2="175" y2="336" class="d-l" />
      <line x1="465" y1="296" x2="465" y2="336" class="d-l" />
      <rect x="40" y="336" width="270" height="36" rx="8" class="d-box-dim" />
      <text x="175" y="359" text-anchor="middle" class="d-s">REST APIs · polling scheduler</text>
      <rect x="330" y="336" width="270" height="36" rx="8" class="d-box-dim" />
      <text x="465" y="359" text-anchor="middle" class="d-s">Float32Array transfers → main thread</text>
    </svg>

    <!-- Topology: worker / main-thread split -->
    <svg v-else-if="kind === 'topology'" viewBox="0 0 640 400" class="diagram__svg">
      <rect width="640" height="400" fill="url(#dg)" />
      <rect x="30" y="30" width="280" height="340" rx="12" class="d-box-dim" />
      <text x="170" y="60" text-anchor="middle" class="d-t">Main thread</text>
      <rect x="330" y="30" width="280" height="340" rx="12" class="d-box-dim" />
      <text x="470" y="60" text-anchor="middle" class="d-t">Web Worker</text>
      <rect x="55" y="85" width="230" height="60" rx="8" class="d-box" />
      <text x="170" y="110" text-anchor="middle" class="d-t">Cytoscape.js scene</text>
      <text x="170" y="130" text-anchor="middle" class="d-s">hit-testing · pan · zoom · selection</text>
      <rect x="55" y="165" width="230" height="60" rx="8" class="d-box" />
      <text x="170" y="190" text-anchor="middle" class="d-t">Render loop (rAF)</text>
      <text x="170" y="210" text-anchor="middle" class="d-s">draw latest frame · LOD labels</text>
      <rect x="55" y="245" width="230" height="60" rx="8" class="d-box" />
      <text x="170" y="270" text-anchor="middle" class="d-t">Graph state store</text>
      <text x="170" y="290" text-anchor="middle" class="d-s">filters · groups · URL-restorable</text>
      <rect x="355" y="85" width="230" height="60" rx="8" class="d-box-accent" />
      <text x="470" y="110" text-anchor="middle" class="d-t">Force simulation</text>
      <text x="470" y="130" text-anchor="middle" class="d-s">spatial hash · springs · cooling</text>
      <rect x="355" y="165" width="230" height="60" rx="8" class="d-box" />
      <text x="470" y="190" text-anchor="middle" class="d-t">Data shaping</text>
      <text x="470" y="210" text-anchor="middle" class="d-s">grouping · diffing refreshed topology</text>
      <line x1="355" y1="275" x2="585" y2="275" class="d-l-accent" />
      <path d="M355 275 H 290" class="d-l-accent" marker-end="url(#arr)" />
      <text x="470" y="265" text-anchor="middle" class="d-s">postMessage(Float32Array, [buffer]) — transferable</text>
      <line x1="285" y1="330" x2="355" y2="330" class="d-l" />
      <text x="320" y="350" text-anchor="middle" class="d-s">start / stop / reset</text>
    </svg>

    <!-- Dashboards: one chart instance per panel, scheduler -->
    <svg v-else-if="kind === 'dashboards'" viewBox="0 0 640 400" class="diagram__svg">
      <rect width="640" height="400" fill="url(#dg)" />
      <g v-for="i in 6" :key="i">
        <rect :x="40 + ((i - 1) % 3) * 190" :y="40 + Math.floor((i - 1) / 3) * 120" width="170" height="100" rx="8" class="d-box" />
        <text :x="125 + ((i - 1) % 3) * 190" :y="66 + Math.floor((i - 1) / 3) * 120" text-anchor="middle" class="d-t">Panel {{ i }}</text>
        <polyline
          :points="sparkline(i, 60 + ((i - 1) % 3) * 190, 80 + Math.floor((i - 1) / 3) * 120)"
          class="d-spark"
        />
      </g>
      <rect x="40" y="290" width="560" height="44" rx="8" class="d-box-accent" />
      <text x="320" y="310" text-anchor="middle" class="d-t">Polling scheduler · one request wave per screen · pauses when hidden</text>
      <text x="320" y="326" text-anchor="middle" class="d-s">series.setData(redraw=false) → single rAF → chart.redraw()</text>
      <text x="320" y="370" text-anchor="middle" class="d-s">charts created once, updated in place; zoom and tooltip state survive refreshes</text>
    </svg>

    <!-- Migration: path from Vue 2 to Vue 3 -->
    <svg v-else-if="kind === 'migration'" viewBox="0 0 640 400" class="diagram__svg">
      <rect width="640" height="400" fill="url(#dg)" />
      <g v-for="(s, i) in migrationSteps" :key="s.t">
        <rect :x="40" :y="36 + i * 72" width="560" height="56" rx="8" :class="i === 1 ? 'd-box-accent' : 'd-box'" />
        <text :x="64" :y="60 + i * 72" class="d-t">{{ i + 1 }}. {{ s.t }}</text>
        <text :x="64" :y="80 + i * 72" class="d-s">{{ s.d }}</text>
      </g>
    </svg>

    <!-- Design system: tokens → themes → components → screens -->
    <svg v-else-if="kind === 'designsystem'" viewBox="0 0 640 400" class="diagram__svg">
      <rect width="640" height="400" fill="url(#dg)" />
      <rect x="220" y="30" width="200" height="54" rx="8" class="d-box-accent" />
      <text x="320" y="53" text-anchor="middle" class="d-t">Design tokens</text>
      <text x="320" y="72" text-anchor="middle" class="d-s">colour · space · type · elevation</text>
      <line x1="320" y1="84" x2="180" y2="130" class="d-l" />
      <line x1="320" y1="84" x2="460" y2="130" class="d-l" />
      <rect x="80" y="130" width="200" height="54" rx="8" class="d-box" />
      <text x="180" y="153" text-anchor="middle" class="d-t">Less theme</text>
      <text x="180" y="172" text-anchor="middle" class="d-s">Ant Design Vue variables</text>
      <rect x="360" y="130" width="200" height="54" rx="8" class="d-box" />
      <text x="460" y="153" text-anchor="middle" class="d-t">Tailwind theme</text>
      <text x="460" y="172" text-anchor="middle" class="d-s">utilities from the same values</text>
      <line x1="180" y1="184" x2="320" y2="230" class="d-l" />
      <line x1="460" y1="184" x2="320" y2="230" class="d-l" />
      <rect x="120" y="230" width="400" height="54" rx="8" class="d-box" />
      <text x="320" y="253" text-anchor="middle" class="d-t">Shared components</text>
      <text x="320" y="272" text-anchor="middle" class="d-s">tables · page headers · filter bars · empty &amp; error states</text>
      <g v-for="i in 4" :key="i">
        <line :x1="320" y1="284" :x2="110 + (i - 1) * 140" y2="326" class="d-l" />
        <rect :x="60 + (i - 1) * 140" y="326" width="100" height="40" rx="8" class="d-box-dim" />
        <text :x="110 + (i - 1) * 140" y="351" text-anchor="middle" class="d-s">screen {{ i }}</text>
      </g>
    </svg>
    <span class="diagram__label mono">Architecture diagram</span>
  </div>
</template>


<style scoped>
.diagram {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #0d0d10;
  border-radius: var(--r-md);
  overflow: hidden;
}
.diagram__defs {
  position: absolute;
}
.diagram__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  font-family: var(--font-mono);
}
.diagram__label {
  position: absolute;
  top: 0.6rem;
  right: 0.75rem;
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.diagram :deep(.d-box),
.diagram :deep(.d-box rect) {
  fill: #141418;
  stroke: rgba(255, 255, 255, 0.14);
}
.diagram :deep(.d-box-dim) {
  fill: rgba(255, 255, 255, 0.02);
  stroke: rgba(255, 255, 255, 0.1);
  stroke-dasharray: 3 3;
}
.diagram :deep(.d-box-accent) {
  fill: rgba(227, 50, 63, 0.14);
  stroke: rgba(227, 50, 63, 0.7);
}
.diagram :deep(.d-t) {
  fill: #f3f1ec;
  font-size: 12px;
  font-weight: 500;
}
.diagram :deep(.d-s) {
  fill: #8e8b85;
  font-size: 9.5px;
}
.diagram :deep(.d-l) {
  stroke: rgba(255, 255, 255, 0.22);
  stroke-width: 1;
  fill: none;
}
.diagram :deep(.d-l-accent) {
  stroke: #e3323f;
  stroke-width: 1.2;
  fill: none;
}
.diagram :deep(.d-spark) {
  fill: none;
  stroke: #ff5f6a;
  stroke-width: 1.5;
  stroke-linejoin: round;
}
</style>
