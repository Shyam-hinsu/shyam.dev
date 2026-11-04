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
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({ enabled: state.enabled, trails: state.trails, dust: state.dust }))
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
  trails: prefs.trails ?? true,
  dust: prefs.dust ?? true,
  agents: 0,
  built: 0,
  total: 0,
  elapsedMs: 0,
  section: '',
  windows: 1,
  log: [],
})

// A ticking clock so the live ticker can fade out on its own.
const clock = ref(Date.now())
let clockTimer = 0
const latest = computed(() => {
  const e = state.log[0]
  return e && clock.value - e.t < 3200 ? e : null
})
const canOpenWindow = typeof window !== 'undefined' && window.matchMedia('(pointer: fine) and (hover: hover)').matches
const openWindow = () => controller?.openWindow()
const fmtTime = (t) => new Date(t).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })

onMounted(() => {
  controller = new ScrollAnimationController({ canvas: canvas.value, root: document.getElementById('main'), state })
  // ?agents-debug exposes the engine for automated checks.
  if (new URLSearchParams(location.search).has('agents-debug')) window.__agentController = controller
  if (state.enabled) controller.init()
  else {
    state.phase = 'off'
  }
  clockTimer = setInterval(() => (clock.value = Date.now()), 400)
})

onBeforeUnmount(() => {
  clearInterval(clockTimer)
  controller?.destroy()
  controller = null
})

watch(() => [state.enabled, state.trails, state.dust], savePrefs)

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
const toggleDust = () => (state.dust = !state.dust)
const toggleMode = () => controller?.setMode(state.mode === 'auto' ? 'all' : 'auto')
const replaySection = () => controller?.replaySection()
const replayAll = () => controller?.replayAll()
const gather = () => controller?.gather()
defineExpose({ gather })

const progress = computed(() => (state.total ? Math.round((state.built / state.total) * 100) : 0))
const seconds = computed(() => (state.elapsedMs / 1000).toFixed(1))
const status = computed(() => {
  if (!state.enabled) return 'Agents off'
  if (state.paused) return 'Paused'
  if (state.phase === 'intro') return 'Scanning page…'
  if (state.phase === 'done') return `Rebuilt by ${state.agents} agents in ${seconds.value}s`
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
        Five simulated UI agents wireframe and build each section as you scroll to it. Purely visual: no AI, no network.
      </p>
      <div class="dock__row" role="group" aria-label="Agent controls">
        <button v-if="state.enabled" type="button" class="dock__btn" @click="disable"><IconGlyph name="close" /> Turn off</button>
        <button v-else type="button" class="dock__btn" @click="enable"><IconGlyph name="check" /> Turn on</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="togglePause">{{ state.paused ? 'Resume' : 'Pause' }}</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.mode === 'all'" @click="toggleMode">Inspect: {{ state.mode === 'all' ? 'ALL' : 'AUTO' }}</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.trails" @click="toggleTrails">Trails: {{ state.trails ? 'On' : 'Off' }}</button>
        <button v-if="canOpenWindow" type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.dust" @click="toggleDust">Dust: {{ state.dust ? 'On' : 'Off' }}</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="replaySection">Replay section</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="replayAll">Replay intro</button>
      </div>
      <ul class="dock__legend" aria-label="Lead agents">
        <li v-for="a in LEAD_AGENTS" :key="a.id"><i :style="{ background: a.color }" aria-hidden="true" />{{ a.name }}</li>
      </ul>
      <div v-if="canOpenWindow" class="dock__windows">
        <p class="dock__help">
          Open a second window and drag it beside this one: the five share one screen, and idle cursors wander between windows.
        </p>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="openWindow">Open companion window</button>
      </div>
      <ol v-if="state.log.length" class="dock__log" aria-label="Agent activity">
        <li v-for="e in state.log" :key="e.t + e.agent">
          <span class="mono dock__log-time">{{ fmtTime(e.t) }}</span>
          <span class="dock__log-agent mono">{{ e.agent }}</span>
          <span class="dock__log-text">{{ e.verb }} {{ e.target }}<span v-if="e.dims" class="muted"> · {{ e.dims }}</span></span>
        </li>
      </ol>
    </div>

    <Transition name="ticker">
      <p v-if="latest && !open" class="dock__ticker mono" aria-live="polite">
        <span class="dock__log-agent">{{ latest.agent }}</span> {{ latest.verb }} {{ latest.target }}<span v-if="latest.dims" class="muted"> · {{ latest.dims }}</span>
      </p>
    </Transition>

    <div class="dock__bar" role="group" aria-label="Agent dock">
      <button type="button" class="dock__status" :aria-expanded="open" aria-controls="agent-dock" @click="open = !open">
        <span class="dock__agents" aria-hidden="true"><i v-for="a in LEAD_AGENTS" :key="a.id" :style="{ background: a.color }" /></span>
        <span class="dock__label mono">{{ status }}</span>
      </button>
      <template v-if="state.enabled">
        <span class="dock__layers mono">
          <span class="dock__count">{{ state.built }} / {{ state.total }} layers</span>
          <span class="dock__bar-track" aria-hidden="true"><i :style="{ width: progress + '%' }" /></span>
        </span>
        <button type="button" class="dock__chip" :class="{ 'is-on': state.mode === 'all' }" :aria-pressed="state.mode === 'all'" @click="toggleMode">Inspect: {{ state.mode === 'all' ? 'ALL' : 'AUTO' }}</button>
        <span v-if="state.windows > 1" class="dock__chip is-on dock__chip--static">{{ state.windows }} windows linked</span>
        <button v-else-if="canOpenWindow" type="button" class="dock__chip dock__chip--section" @click="openWindow">Open window</button>
        <button type="button" class="dock__chip dock__chip--section" @click="replaySection">Replay section</button>
        <button type="button" class="dock__chip" @click="replayAll">{{ state.phase === 'done' ? 'Replay' : 'Replay intro' }}</button>
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
  transition: transform 260ms var(--ease-out);
}
.splash__mark.is-hit {
  transform: scale(1.18);
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
.dock__windows {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--line);
}
.dock__log {
  display: grid;
  gap: 0.3rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--line);
  font-size: 0.7rem;
  color: var(--ink-2);
}
.dock__log li {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.5rem;
  align-items: baseline;
}
.dock__log-time {
  color: var(--ink-4);
  font-size: 0.62rem;
}
.dock__log-agent {
  color: #93c5fd;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
}
.dock__log-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dock__ticker {
  padding: 0.3rem 0.75rem;
  border-radius: var(--r-pill);
  background: rgba(17, 17, 20, 0.86);
  border: 1px solid var(--line);
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  max-width: min(36rem, calc(100vw - 2rem));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ticker-enter-active,
.ticker-leave-active {
  transition: opacity 240ms var(--ease-out), transform 240ms var(--ease-out);
}
.ticker-enter-from,
.ticker-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.dock__chip--static {
  cursor: default;
}
@media (max-width: 48em) {
  .dock__layers .dock__bar-track,
  .dock__chip--section {
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
