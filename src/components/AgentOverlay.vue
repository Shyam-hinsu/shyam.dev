<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import { ScrollAnimationController } from '../agents/ScrollAnimationController.js'
import { CONFIG, AGENT_DEFS } from '../agents/AnimationConfig.js'
import IconGlyph from './IconGlyph.vue'

/**
 * Mounts the shared multi-cursor animation engine on a full-viewport canvas
 * and exposes a small control dock. The page is fully usable with the engine
 * off: every registered element is simply shown.
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
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({ enabled: state.enabled, trails: state.trails, mode: state.mode }))
  } catch {
    /* storage unavailable */
  }
}

const prefs = loadPrefs()
const state = reactive({
  enabled: prefs.enabled ?? !reduced,
  paused: false,
  mode: prefs.mode === 'all' ? 'all' : 'auto',
  trails: prefs.trails ?? true,
  built: 0,
  total: 0,
  section: '',
})

onMounted(() => {
  controller = new ScrollAnimationController({ canvas: canvas.value, root: document.getElementById('main'), state })
  controller.init()
  if (!state.enabled) controller.setEnabled(false)
})

onBeforeUnmount(() => {
  controller?.destroy()
  controller = null
})

watch(() => [state.enabled, state.trails, state.mode], savePrefs)

const toggleEnabled = () => controller?.setEnabled(!state.enabled)
const togglePause = () => (state.paused ? controller?.resume() : controller?.pause())
const toggleTrails = () => controller?.setTrails(!state.trails)
const toggleMode = () => controller?.setMode(state.mode === 'auto' ? 'all' : 'auto')
const replaySection = () => controller?.replaySection()
const replayAll = () => controller?.replayAll()
</script>

<template>
  <canvas ref="canvas" class="agents-canvas" aria-hidden="true" />

  <div class="dock" :class="{ 'dock--open': open }">
    <button type="button" class="dock__toggle" :aria-expanded="open" aria-controls="agent-dock" @click="open = !open">
      <span class="dock__agents" aria-hidden="true">
        <i v-for="a in AGENT_DEFS" :key="a.id" :style="{ background: a.color }" />
      </span>
      <span class="dock__label mono">{{ state.enabled ? (state.paused ? 'Agents paused' : '5 agents online') : 'Agents off' }}</span>
      <span v-if="state.enabled" class="dock__count mono">{{ state.built }}/{{ state.total }}</span>
    </button>

    <div id="agent-dock" class="dock__panel" :hidden="!open">
      <p class="dock__help">
        Five simulated UI agents inspect and build this page as you scroll. Purely visual: no AI, no network.
      </p>
      <div class="dock__row" role="group" aria-label="Agent controls">
        <button type="button" class="dock__btn" :aria-pressed="state.enabled" @click="toggleEnabled">
          <IconGlyph :name="state.enabled ? 'check' : 'close'" /> {{ state.enabled ? 'Enabled' : 'Disabled' }}
        </button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="togglePause">
          {{ state.paused ? 'Resume' : 'Pause' }}
        </button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.mode === 'all'" @click="toggleMode">
          Inspect: {{ state.mode === 'all' ? 'ALL' : 'AUTO' }}
        </button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" :aria-pressed="state.trails" @click="toggleTrails">
          Trails: {{ state.trails ? 'On' : 'Off' }}
        </button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="replaySection">Replay section</button>
        <button type="button" class="dock__btn" :disabled="!state.enabled" @click="replayAll">Replay all</button>
      </div>
      <ul class="dock__legend" aria-label="Agents">
        <li v-for="a in AGENT_DEFS" :key="a.id"><i :style="{ background: a.color }" aria-hidden="true" />{{ a.name }}</li>
      </ul>
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
.dock {
  position: fixed;
  right: max(0.75rem, env(safe-area-inset-right));
  bottom: max(0.75rem, env(safe-area-inset-bottom));
  z-index: 56;
  display: grid;
  justify-items: end;
  gap: 0.5rem;
  max-width: calc(100vw - 1.5rem);
}
.dock__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem 0.5rem 0.6rem;
  border-radius: var(--r-pill);
  background: rgba(17, 17, 20, 0.86);
  border: 1px solid var(--line-strong);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.9);
  transition: border-color var(--dur-fast);
}
.dock__toggle:hover {
  border-color: var(--ink-3);
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
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.dock__count {
  font-size: 0.66rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}
.dock__panel {
  width: min(22rem, calc(100vw - 1.5rem));
  padding: 0.9rem;
  border-radius: var(--r-lg);
  background: rgba(17, 17, 20, 0.92);
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
  font-size: 0.78rem;
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
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
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
@media print {
  .agents-canvas,
  .dock {
    display: none;
  }
}
</style>
