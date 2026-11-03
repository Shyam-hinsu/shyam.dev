<script setup>
import { ref, computed } from 'vue'
import { achievements } from '../content/achievements.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'
import IconGlyph from './IconGlyph.vue'

const root = ref(null)
useReveal(root)

const groups = computed(() =>
  [
    ['Awards', achievements.awards],
    ['Certifications', achievements.certifications],
    ['Open source', achievements.openSource],
    ['Recognition', achievements.recognition],
  ].filter(([, items]) => items && items.length),
)
</script>

<template>
  <!-- Rendered only when there is at least one verified item. -->
  <section v-if="groups.length" id="achievements" ref="root" class="section" aria-labelledby="achievements-title" data-agent-section="achievements">
    <div class="container">
      <SectionHeading id="achievements-title" eyebrow="Achievements & recognition" title="Verified, not <em>embellished</em>." />
      <div class="ach__grid">
        <div v-for="[title, items] in groups" :key="title" class="ach__group reveal" data-agent-element data-agent-handle="se">
          <h3 class="ach__title mono">{{ title }}</h3>
          <ul class="ach__list">
            <li v-for="item in items" :key="item.title" class="ach__item">
              <component :is="item.url ? 'a' : 'div'" :href="item.url" :target="item.url ? '_blank' : null" :rel="item.url ? 'noopener noreferrer' : null">
                <span class="ach__name">{{ item.title }} <IconGlyph v-if="item.url" name="arrow-up-right" /></span>
                <span class="ach__meta muted">{{ [item.issuer, item.year].filter(Boolean).join(' · ') }}</span>
              </component>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ach__grid {
  display: grid;
  gap: var(--s-6);
}
.ach__title {
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: var(--s-3);
}
.ach__list {
  display: grid;
  border-top: 1px solid var(--line);
}
.ach__item > * {
  display: grid;
  gap: 0.2rem;
  padding: var(--s-3) 0;
  border-bottom: 1px solid var(--line);
}
.ach__name {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
}
.ach__name svg {
  width: 0.9em;
  height: 0.9em;
}
.ach__meta {
  font-size: var(--text-sm);
}
@media (min-width: 48em) {
  .ach__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
