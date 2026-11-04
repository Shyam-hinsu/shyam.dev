<script setup>
import { ref } from 'vue'
import { experience } from '../content/experience.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'

const root = ref(null)
useReveal(root)
</script>

<template>
  <section id="experience" ref="root" class="section experience" aria-labelledby="experience-title" data-agent-section="experience">
    <div class="container">
      <SectionHeading id="experience-title" eyebrow="Professional experience" title="Where the work <em>happened</em>.">
        Engineering contributions rather than job descriptions.
      </SectionHeading>

      <ol class="timeline">
        <li v-for="(job, i) in experience" :key="i" class="job reveal" :style="{ '--reveal-delay': `${i * 80}ms` }">
          <div class="job__when">
            <span class="mono">{{ job.period }}</span>
            <span v-if="job.location" class="job__loc muted">{{ job.location }}</span>
          </div>
          <div class="job__body card" data-agent-element data-agent-handle="se" data-agent-name="Experience card">
            <header class="job__head">
              <div>
                <h3 class="job__role">{{ job.role }}</h3>
                <p class="job__company">
                  {{ job.company }}
                  <span v-if="job.placeholder" class="placeholder-badge" title="Replace in src/content/experience.js">placeholder</span>
                </p>
              </div>
            </header>
            <p class="job__summary">{{ job.summary }}</p>
            <ul class="job__highlights">
              <li v-for="(h, j) in job.highlights" :key="j">{{ h }}</li>
            </ul>
            <ul class="job__stack" aria-label="Technologies">
              <li v-for="t in job.stack" :key="t" class="tag">{{ t }}</li>
            </ul>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.timeline {
  display: grid;
  gap: var(--s-6);
  position: relative;
}
.job {
  display: grid;
  gap: var(--s-3);
}
.job__when {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  align-items: baseline;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.job__body {
  padding: var(--s-5);
  display: grid;
  gap: var(--s-4);
}
.job__role {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--text-xl);
  line-height: 1.1;
}
.job__company {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.3rem;
  color: var(--ink-2);
}
.job__summary {
  color: var(--ink-2);
}
.job__highlights {
  display: grid;
  gap: 0.55rem;
  color: var(--ink-2);
  font-size: var(--text-sm);
}
.job__highlights li {
  position: relative;
  padding-left: 1.2rem;
}
.job__highlights li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.7em;
  width: 0.5rem;
  height: 1px;
  background: var(--accent);
}
.job__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
@media (min-width: 64em) {
  .timeline::before {
    content: '';
    position: absolute;
    left: 13rem;
    top: 0.5rem;
    bottom: 0;
    width: 1px;
    background: var(--line);
  }
  .job {
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: var(--s-7);
    position: relative;
  }
  .job::before {
    content: '';
    position: absolute;
    left: calc(13rem - 4px);
    top: 0.55rem;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px var(--accent-soft);
  }
  .job__when {
    flex-direction: column;
    gap: 0.3rem;
    padding-top: 0.2rem;
  }
}
</style>
