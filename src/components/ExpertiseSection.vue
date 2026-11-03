<script setup>
import { ref } from 'vue'
import { skillGroups } from '../content/skills.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'

const root = ref(null)
useReveal(root)
</script>

<template>
  <section id="expertise" ref="root" class="section expertise" aria-labelledby="expertise-title" data-agent-section="expertise">
    <div class="container">
      <SectionHeading id="expertise-title" eyebrow="Technical expertise" title="Tools, and <em>where</em> they earn their place.">
        No percentage bars. Each technology is listed with how it shows up in real work, which says more than a number.
      </SectionHeading>

      <div class="expertise__grid">
        <article
          v-for="(g, i) in skillGroups"
          :key="g.id"
          class="skill-group card reveal"
          data-agent-element
          data-agent-handle="se"
          :class="`skill-group--${g.id}`"
          :style="{ '--reveal-delay': `${(i % 3) * 80}ms` }"
        >
          <header class="skill-group__head">
            <span class="skill-group__num mono">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3 class="skill-group__title">{{ g.title }}</h3>
            <p class="skill-group__blurb">{{ g.blurb }}</p>
          </header>
          <ul class="skill-group__list">
            <li v-for="s in g.skills" :key="s.name" class="skill">
              <span class="skill__name">{{ s.name }}</span>
              <span class="skill__note">{{ s.note }}</span>
            </li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.expertise__grid {
  display: grid;
  gap: var(--s-4);
}
.skill-group {
  padding: var(--s-5);
  display: grid;
  gap: var(--s-4);
  align-content: start;
  transition: border-color var(--dur) var(--ease-out);
}
.skill-group:hover {
  border-color: var(--line-strong);
}
.skill-group__head {
  display: grid;
  gap: 0.35rem;
}
.skill-group__num {
  font-size: 0.68rem;
  color: var(--accent-hot);
  letter-spacing: 0.12em;
}
.skill-group__title {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--text-xl);
  line-height: 1.1;
}
.skill-group__blurb {
  font-size: var(--text-sm);
  color: var(--ink-3);
}
.skill-group__list {
  display: grid;
  border-top: 1px solid var(--line);
}
.skill {
  display: grid;
  gap: 0.15rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--line);
}
.skill__name {
  font-weight: 600;
  font-size: var(--text-sm);
}
.skill__note {
  font-size: 0.8rem;
  color: var(--ink-3);
}
@media (min-width: 48em) {
  .expertise__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 64em) {
  .expertise__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .skill-group {
    grid-column: span 2;
  }
  .skill-group--frontend {
    grid-column: span 3;
  }
  .skill-group--visualization {
    grid-column: span 3;
  }
}
</style>
