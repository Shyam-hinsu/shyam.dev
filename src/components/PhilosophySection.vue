<script setup>
import { ref } from 'vue'
import { philosophy } from '../content/philosophy.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'

const root = ref(null)
useReveal(root)
</script>

<template>
  <section id="philosophy" ref="root" class="section philosophy" aria-labelledby="philosophy-title" data-agent-section="philosophy">
    <div class="container">
      <SectionHeading id="philosophy-title" :eyebrow="philosophy.eyebrow" :title="philosophy.title" />

      <blockquote class="philosophy__quote reveal" data-agent-element data-agent-handle="e" data-agent-name="Pull quote">
        <p class="display">“{{ philosophy.quote.text }}”</p>
        <footer class="mono">— {{ philosophy.quote.attribution }}</footer>
      </blockquote>

      <ol class="principles">
        <li
          v-for="(p, i) in philosophy.principles"
          :key="p.title"
          class="principle reveal"
          data-agent-element
          data-agent-handle="se"
          :style="{ '--reveal-delay': `${(i % 4) * 70}ms` }"
        >
          <span class="principle__num display">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3 class="principle__title">{{ p.title }}</h3>
          <p class="principle__text">{{ p.text }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.philosophy {
  background:
    radial-gradient(ellipse 60% 50% at 80% 0%, var(--accent-soft), transparent 70%),
    var(--bg);
}
.philosophy__quote {
  max-width: 44ch;
  margin-bottom: clamp(3rem, 6vw, 5rem);
  padding-left: var(--s-5);
  border-left: 2px solid var(--accent);
}
.philosophy__quote p {
  font-size: var(--text-xl);
  line-height: 1.25;
}
.philosophy__quote footer {
  margin-top: var(--s-3);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.principles {
  display: grid;
  border-top: 1px solid var(--line);
  border-left: 1px solid var(--line);
}
.principle {
  display: grid;
  gap: var(--s-2);
  align-content: start;
  padding: var(--s-5);
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  transition: background-color var(--dur) var(--ease-out);
}
.principle:hover {
  background: rgba(255, 255, 255, 0.025);
}
.principle__num {
  font-size: var(--text-xl);
  color: var(--accent-hot);
  line-height: 1;
}
.principle__title {
  font-size: var(--text-md);
  font-weight: 600;
}
.principle__text {
  font-size: var(--text-sm);
  color: var(--ink-2);
  text-wrap: pretty;
}
@media (min-width: 40em) {
  .principles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 64em) {
  .principles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .principle {
    min-height: 15rem;
  }
}
</style>
