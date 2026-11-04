<script setup>
/**
 * Finale card: clicking it gathers every agent onto the card.
 * The engine marks the element with [data-agent-finale].
 */
import { LEAD_AGENTS } from '../agents/AnimationConfig.js'
const emit = defineEmits(['gather'])
</script>

<template>
  <button type="button" class="deploy" data-agent-finale data-agent-element data-agent-atomic data-agent-handle="se" data-agent-name="Deploy card" @click="emit('gather')">
    <span class="deploy__meta mono">
      <span>Production deploy queue</span>
      <span>{{ LEAD_AGENTS.length }} agents ready</span>
    </span>
    <span class="deploy__title display">Ship it<br /><em>to prod.</em></span>
    <span class="deploy__foot">
      <span class="mono">Click to gather agents</span>
      <span class="deploy__rocket" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8-.8-.7-2-.7-2.8 0z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.9 12.9 0 0 1 22 2c0 2.7-.9 7.4-6 11a22 22 0 0 1-4 2z" />
          <path d="M9 12H4s.5-3 2-4 4-1 4-1M15 12v5s3-.5 4-2 1-4 1-4" />
        </svg>
      </span>
    </span>
  </button>
</template>

<style scoped>
.deploy {
  position: relative;
  display: grid;
  gap: 1.5rem;
  width: 100%;
  padding: var(--s-5);
  text-align: left;
  border-radius: var(--r-lg);
  border: 1px solid rgba(227, 50, 63, 0.55);
  background: linear-gradient(135deg, #2b0810 0%, #150409 45%, #0b0b0d 100%);
  box-shadow: 0 30px 60px -30px rgba(227, 50, 63, 0.5);
  overflow: hidden;
  transition: transform 200ms var(--ease-out), border-color 200ms, box-shadow 200ms;
}
.deploy:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 95, 106, 0.9);
}
.deploy.is-hit {
  transform: scale(0.98);
  border-color: #fff;
}
.deploy__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 160, 170, 0.75);
}
.deploy__title {
  font-size: var(--text-2xl);
  line-height: 0.95;
}
.deploy__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.deploy__rocket {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 10px 30px -8px var(--accent-glow);
  transition: transform 200ms var(--ease-out);
}
.deploy:hover .deploy__rocket {
  transform: scale(1.1);
}
.deploy__rocket svg {
  width: 1.2rem;
  height: 1.2rem;
}
</style>
