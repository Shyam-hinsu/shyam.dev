<script setup>
import { ref } from 'vue'
import { about, site } from '../content/site.js'
import { useReveal } from '../composables/useReveal.js'
import SectionHeading from './SectionHeading.vue'

const root = ref(null)
useReveal(root)
</script>

<template>
  <section id="about" ref="root" class="section about" aria-labelledby="about-title" data-agent-section="about">
    <div class="container">
      <SectionHeading id="about-title" :eyebrow="about.eyebrow" :title="about.title" />

      <div class="about__grid">
        <div class="about__text" data-agent-element data-agent-handle="s">
          <p
            v-for="(p, i) in about.paragraphs"
            :key="i"
            class="about__p reveal"
            :class="{ 'about__p--lead': i === 0 }"
            :style="{ '--reveal-delay': `${i * 70}ms` }"
          >
            {{ p }}
          </p>
        </div>

        <aside class="about__aside">
          <figure class="about__photo reveal" data-agent-element data-agent-atomic data-agent-handle="se">
            <img
              src="/images/portrait-square-480.webp"
              srcset="/images/portrait-square-480.webp 480w, /images/portrait-square-900.webp 900w"
              sizes="(min-width: 64em) 22vw, 60vw"
              width="900"
              height="900"
              loading="lazy"
              decoding="async"
              :alt="`${site.name} smiling, wearing round glasses and a black jacket`"
            />
          </figure>
          <dl class="about__facts" data-agent-element data-agent-handle="s">
            <div v-for="(f, i) in about.facts" :key="f.label" class="about__fact reveal" :style="{ '--reveal-delay': `${120 + i * 70}ms` }">
              <dt class="mono">{{ f.label }}</dt>
              <dd>{{ f.value }}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about__grid {
  display: grid;
  gap: var(--s-7);
}
.about__text {
  display: grid;
  gap: var(--s-5);
  max-width: 64ch;
}
.about__p {
  color: var(--ink-2);
  font-size: var(--text-md);
  text-wrap: pretty;
}
.about__p--lead {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  line-height: 1.25;
  color: var(--ink);
}
.about__aside {
  display: grid;
  gap: var(--s-5);
  align-content: start;
}
.about__photo {
  width: min(100%, 18rem);
  border-radius: var(--r-md);
  overflow: hidden;
  border: 1px solid var(--line);
}
.about__photo img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  filter: saturate(0.9);
}
.about__facts {
  display: grid;
  border-top: 1px solid var(--line);
}
.about__fact {
  display: grid;
  gap: 0.25rem;
  padding: var(--s-4) 0;
  border-bottom: 1px solid var(--line);
}
.about__fact dt {
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.about__fact dd {
  font-size: var(--text-sm);
  color: var(--ink);
}
@media (min-width: 48em) {
  .about__aside {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}
@media (min-width: 64em) {
  .about__grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: var(--s-9);
  }
  .about__aside {
    grid-template-columns: 1fr;
    padding-top: 0.5rem;
  }
}
</style>
