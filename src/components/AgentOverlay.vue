<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ScrollAnimationController } from '../agents/ScrollAnimationController.js'
import { CONFIG, LEAD_AGENTS } from '../agents/AnimationConfig.js'
import { site } from '../content/site.js'
import IconGlyph from './IconGlyph.vue'

/**
 * Mounts the shared swarm engine on a full-viewport canvas, shows the intro
 * splash and the control dock. With the engine off, the page is simply shown.
 */
const canvas = ref(null)
const open = ref(false)
let controller = null

const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}')
  } catch {
    return {}
  }
}
function savePrefs() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({ enabled: state.enabled, trails: state.trails, speed: state.speed }))
  } catch {
    /* storage unavailable */
  }
}

const prefs = loadPrefs()
const state = reactive({
  enabled: prefs.enabled ?? !reduced,
  paused: false,
  phase: 'idle',
  mode: 'auto',
  tour: true,
  speed: prefs.speed === 2 ? 2 : 1,
  trails: prefs.trails ?? true,
  agents: 0,
  built: 0,
  total: 0,
  elapsedMs: 0,
  section: '',
})

onMounted(() => {
  controller = new ScrollAnimationController({ canvas: canvas.value, root: document.getElementById('main'), state })
  if (state.enabled) controller.init()
  else {
    state.phase = 'off'
  }
})

onBeforeUnmount(() => {
  controller?.destroy()
  controller = null
})

watch(() => [state.enabled, state.trails, state.speed], savePrefs)

function enable() {
  if (!controller) return
  if (!controller.agents.length) {
    state.enabled = true
    controller.init()
    controller.replayAll()
  } else controller.setEnabled(true)
}
const disable = () => controller?.setEnabled(false)
const togglePause = () => (state.paused ? controller?.resume() : controller?.pause())
const toggleTrails = () => controller?.setTrails(!state.trails)
const toggleMode = () => controller?.setMode(state.mode === 'auto' ? 'all' : 'auto')
const toggleTour = () => controller?.setTour(!state.tour)
const toggleSpeed = () => controller?.setSpeed(state.speed === 1 ? 2 : 1)
const replaySection = () => controller?.replaySection()
const replayAll = () => controller?.replayAll()
const goLive = () => controller?.goLive()
const gather = () => controller?.gather()
defineExpose({ gather })

const progress = computed(() => (state.total ? Math.round((state.built / state.total) * 100) : 0))
const seconds = computed(() => (state.elapsedMs / 1000).toFixed(1))
const status = computed(() => {
  if (!state.enabled) return 'Agents off'
  if (state.paused) return 'Paused'
  if (state.phase === 'intro') return 'Scanning page…'
  if (state.phase === 'done' || state.phase === 'finale') return `Rebuilt by ${state.agents} agents in ${seconds.value}s`
  return `${state.agents} agents`
})
</script>

<template>
  <canvas ref="canvas" class="agents-canvas" aria-hidden="true" />

  <Transition name="splash">
    <div v-if="state.enabled && state.phase === 'intro'" class="splash" aria-hidden="true">
      <span class="splash__mark display">{{ site.initials }}<i>.</i></span>
      <span class="splash__text mono">Scanning page…</span>
    </div>
  </Transition>

  <div class="dock" :class="{ 'dock--open': open }">
    <div id="agent-dock" class="dock__panel" :hidden="!open">
      <p class="dock__help">
        Simulated UI agents wireframe and build this page while you scroll. Purely visual: no AI, no network.
        Scrolling yourself stops the tour.
      </p>
      <div class="dock__row" role="group" aria-label="Agent controls">
        <button v-if="state.enabled" type="button" class="dock__btn" @click="disable"><IconGlyph name="close" /> Turn off</button>
        <button v-else type="button" class="dock__btn" @click="enable"><IconGlyph name="check" /> Turn on</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="togglePause">{{ state.paused ? 'Resume' : 'Pause' }}</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.mode === 'all'" @click="toggleMode">Inspect: {{ state.mode === 'all' ? 'ALL' : 'AUTO' }}</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.trails" @click="toggleTrails">Trails: {{ state.trails ? 'On' : 'Off' }}</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="replaySection">Replay section</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="replayAll">Replay all</button>
      </div>
      <ul class="dock__legend" aria-label="Lead agents">
        <li v-for="a in LEAD_AGENTS" :key="a.id"><i :style="{ background: a.color }" aria-hidden="true" />{{ a.name }}</li>
      </ul>
    </div>

    <div class="dock__bar" role="group" aria-label="Agent dock">
      <button type="button" class="dock__status" :aria-expanded="open" aria-controls="agent-dock" @click="open = !open">
        <span class="dock__agents" aria-hidden="true"><i v-for="a in LEAD_AGENTS" :key="a.id" :style="{ background: a.color }" /></span>
        <span class="dock__label mono">{{ status }}</span>
      </button>
      <template v-if="state.enabled">
        <span v-if="state.phase !== 'done' && state.phase !== 'finale'" class="dock__layers mono">
          <span class="dock__count">{{ state.built }} / {{ state.total }} layers</span>
          <span class="dock__bar-track" aria-hidden="true"><i :style="{ width: progress + '%' }" /></span>
        </span>
        <template v-if="state.phase === 'done' || state.phase === 'finale'">
          <button type="button" class="dock__chip dock__chip--primary" @click="goLive">Go live</button>
          <button type="button" class="dock__chip" @click="replayAll">Replay</button>
        </template>
        <template v-else>
          <button type="button" class="dock__chip" :class="{ 'is-on': state.tour }" :aria-pressed="state.tour" @click="toggleTour">Touring</button>
          <button type="button" class="dock__chip" @click="toggleSpeed"><span class="sr-only">Speed </span>{{ state.speed }}×</button>
        </template>
        <button type="button" class="dock__chip dock__chip--icon" aria-label="Turn agents off" @click="disable"><IconGlyph name="close" /></button>
      </template>
      <button v-else type="button" class="dock__chip" @click="enable">Turn on</button>
    </div>
  </div>
</template>

<style scoped>
.agents-canvas {
  position: fixed;
  inset: 0;
  z-index: 55;
  pointer-events: none;
}
.splash {
  position: fixed;
  inset: 0;
  z-index: 54;
  display: grid;
  place-content: center;
  gap: 1rem;
  background: #050507;
}
.splash__mark {
  font-size: clamp(3rem, 8vw, 6rem);
  color: var(--ink);
  line-height: 1;
  text-align: center;
}
.splash__mark i {
  color: var(--accent);
  font-style: normal;
}
.splash__text {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-3);
  text-align: center;
}
.splash-leave-active {
  transition: opacity 420ms var(--ease-out);
}
.splash-leave-to {
  opacity: 0;
}

.dock {
  position: fixed;
  left: 50%;
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 56;
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  width: max-content;
  max-width: calc(100vw - 1.5rem);
}
.dock__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.4rem 0.35rem 0.5rem;
  border-radius: var(--r-pill);
  background: rgba(17, 17, 20, 0.88);
  border: 1px solid var(--line-strong);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.9);
  max-width: 100%;
  overflow: hidden;
}
.dock__status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.4rem;
  border-radius: var(--r-pill);
}
.dock__status:hover {
  background: rgba(255, 255, 255, 0.05);
}
.dock__agents {
  display: inline-flex;
}
.dock__agents i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid #111;
  margin-left: -3px;
}
.dock__agents i:first-child {
  margin-left: 0;
}
.dock__label {
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  white-space: nowrap;
}
.dock__layers {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.64rem;
  color: var(--ink-3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.dock__bar-track {
  width: 64px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.dock__bar-track i {
  display: block;
  height: 100%;
  background: #3b82f6;
  transition: width 200ms linear;
}
.dock__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0 0.6rem;
  border-radius: var(--r-pill);
  border: 1px solid var(--line);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--ink-2);
  white-space: nowrap;
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
}
.dock__chip:hover {
  color: var(--ink);
  border-color: var(--line-strong);
}
.dock__chip.is-on {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.dock__chip--primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.dock__chip--icon {
  width: 1.75rem;
  padding: 0;
}
.dock__chip--icon svg {
  width: 0.8rem;
  height: 0.8rem;
}
.dock__panel {
  width: min(22rem, calc(100vw - 1.5rem));
  padding: 0.9rem;
  border-radius: var(--r-lg);
  background: rgba(17, 17, 20, 0.94);
  border: 1px solid var(--line-strong);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.9);
  display: grid;
  gap: 0.75rem;
}
.dock__panel[hidden] {
  display: none;
}
.dock__help {
  font-size: 0.76rem;
  color: var(--ink-3);
}
.dock__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}
.dock__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.25rem;
  padding: 0 0.6rem;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-size: 0.78rem;
  color: var(--ink-2);
}
.dock__btn svg {
  width: 0.85rem;
  height: 0.85rem;
}
.dock__btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--line-strong);
}
.dock__btn[aria-pressed='true'] {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--ink-3);
}
.dock__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.dock__legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem 0.75rem;
  font-size: 0.7rem;
  color: var(--ink-3);
}
.dock__legend li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.dock__legend i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
@media (max-width: 40em) {
  .dock__layers .dock__bar-track {
    display: none;
  }
  .dock__label {
    max-width: 9rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
@media print {
  .agents-canvas,
  .dock,
  .splash {
    display: none;
  }
}
</style>
