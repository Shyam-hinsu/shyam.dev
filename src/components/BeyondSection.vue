<script setup>
import { ref } from 'vue'
import { beyond } from '../content/beyond.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'

const root = ref(null)
useReveal(root)
</script>

<template>
  <section v-if="beyond.items.length" id="beyond" ref="root" class="section" aria-labelledby="beyond-title" data-agent-section="beyond">
    <div class="container">
      <SectionHeading id="beyond-title" :eyebrow="beyond.eyebrow" :title="beyond.title" />
      <ul class="beyond">
        <li v-for="(item, i) in beyond.items" :key="item.title" class="beyond__item card reveal" data-agent-element data-agent-handle="se" :style="{ '--reveal-delay': `${i * 80}ms` }">
          <h3 class="beyond__title">{{ item.title }}</h3>
          <p class="beyond__text">{{ item.text }}</p>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.beyond {
  display: grid;
  gap: var(--s-4);
}
.beyond__item {
  padding: var(--s-5);
  display: grid;
  gap: var(--s-2);
  align-content: start;
}
.beyond__title {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--text-lg);
}
.beyond__text {
  font-size: var(--text-sm);
  color: var(--ink-2);
  text-wrap: pretty;
}
@media (min-width: 48em) {
  .beyond {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
