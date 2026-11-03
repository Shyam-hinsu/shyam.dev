<script setup>
import { ref, defineAsyncComponent } from 'vue'
import { showcase } from '../content/showcase.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'
import CodeBlock from './CodeBlock.vue'

// The live demo (canvas + worker) is split into its own chunk and only loaded when rendered.
const TopologyDemo = defineAsyncComponent(() => import('./TopologyDemo.vue'))

const root = ref(null)
useReveal(root)
</script>

<template>
  <section id="showcase" ref="root" class="section showcase" aria-labelledby="showcase-title" data-agent-section="showcase">
    <div class="container">
      <SectionHeading id="showcase-title" eyebrow="Engineering showcase" title="How I actually <em>solve</em> problems.">
        Three recurring problems from enterprise frontend work, each traced from symptom to shipped solution.
        The code is real; the first example runs live on this page.
      </SectionHeading>

      <div class="showcase__list">
        <article v-for="item in showcase" :id="`showcase-${item.id}`" :key="item.id" class="case reveal">
          <header class="case__head">
            <span class="case__kicker display">{{ item.kicker }}</span>
            <div>
              <h3 class="case__title">{{ item.title }}</h3>
              <ul class="case__tags" aria-label="Topics">
                <li v-for="t in item.tags" :key="t" class="tag">{{ t }}</li>
              </ul>
            </div>
          </header>

          <div class="case__grid">
            <ol class="case__steps" data-agent-element data-agent-handle="s">
              <li v-for="(s, i) in item.steps" :key="s.label" class="case__step">
                <span class="case__step-label mono">{{ s.label }}</span>
                <p>{{ s.text }}</p>
                <span v-if="i < item.steps.length - 1" class="case__step-line" aria-hidden="true" />
              </li>
            </ol>
            <div class="case__aside" data-agent-element data-agent-handle="se">
              <CodeBlock :source="item.code.source" :filename="item.code.filename" />
            </div>
          </div>

          <div v-if="item.hasDemo" class="case__demo" data-agent-element data-agent-handle="se">
            <p class="eyebrow">Live demo</p>
            <TopologyDemo />
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.showcase__list {
  display: grid;
  gap: var(--s-8);
}
.case {
  display: grid;
  gap: var(--s-6);
  min-width: 0;
  padding-top: var(--s-6);
  border-top: 1px solid var(--line);
}
.case__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--s-4);
  align-items: start;
}
.case__kicker {
  font-size: var(--text-2xl);
  line-height: 0.9;
  color: var(--accent-hot);
}
.case__title {
  font-size: var(--text-xl);
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.1;
}
.case__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: var(--s-3);
}
.case__grid {
  display: grid;
  gap: var(--s-6);
  min-width: 0;
}
.case__aside,
.case__steps {
  min-width: 0;
}
.case__steps {
  display: grid;
  gap: var(--s-4);
}
.case__step {
  position: relative;
  padding-left: 1.5rem;
}
.case__step::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--bg);
}
.case__step:last-child::before {
  background: var(--accent);
}
.case__step-line {
  position: absolute;
  left: 3.5px;
  top: 1.1rem;
  bottom: -1.1rem;
  width: 1px;
  background: var(--line-strong);
}
.case__step-label {
  display: block;
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-hot);
  margin-bottom: 0.25rem;
}
.case__step p {
  color: var(--ink-2);
  font-size: var(--text-sm);
  text-wrap: pretty;
}
.case__demo {
  display: grid;
  gap: var(--s-4);
}
@media (min-width: 64em) {
  .case__grid {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: var(--s-8);
    align-items: start;
  }
  .case__aside {
    position: sticky;
    top: calc(var(--nav-h) + 1.5rem);
  }
  .case__head {
    grid-template-columns: 6rem 1fr;
  }
}
</style>
