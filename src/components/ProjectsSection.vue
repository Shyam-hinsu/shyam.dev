<script setup>
import { ref, computed } from 'vue'
import { projects, projectsIntro } from '../content/projects.js'
import { useReveal } from '../composables/useReveal.js'
import { useHashRoute } from '../composables/useHashRoute.js'
import SectionHeading from './SectionHeading.vue'
import ProjectCard from './ProjectCard.vue'
import ProjectCaseStudy from './ProjectCaseStudy.vue'
import IconGlyph from './IconGlyph.vue'

const root = ref(null)
useReveal(root)

const featured = computed(() => projects.find((p) => p.featured))
const rest = computed(() => projects.filter((p) => p !== featured.value))

const { slug, open, close } = useHashRoute()
const current = computed(() => projects.find((p) => p.slug === slug.value) || null)
const lastTrigger = ref(null)

function openProject(project, event) {
  lastTrigger.value = event?.currentTarget || null
  open(project.slug)
}
function onClosed() {
  close()
  lastTrigger.value?.focus?.()
}
</script>

<template>
  <section id="projects" ref="root" class="section projects" aria-labelledby="projects-title" data-agent-section="projects">
    <div class="container">
      <SectionHeading id="projects-title" :eyebrow="`${projectsIntro.eyebrow} · ${String(projects.length).padStart(2, '0')}`" :title="projectsIntro.title">
        {{ projectsIntro.lede }}
      </SectionHeading>

      <div class="projects__grid">
        <ProjectCard
          v-if="featured"
          :key="featured.slug"
          :project="featured"
          featured
          class="reveal"
          @open="openProject(featured, $event)"
        />
        <ProjectCard
          v-for="(p, i) in rest"
          :key="p.slug"
          :project="p"
          class="reveal"
          :style="{ '--reveal-delay': `${(i % 2) * 90}ms` }"
          @open="openProject(p, $event)"
        />
      </div>
      <p class="projects__note reveal">
        <IconGlyph name="lock" />
        <span>{{ projectsIntro.footnote }}</span>
      </p>
    </div>

    <ProjectCaseStudy :project="current" @close="onClosed" />
  </section>
</template>

<style scoped>
.projects__note {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  max-width: 64ch;
  margin-top: var(--s-6);
  padding-top: var(--s-4);
  border-top: 1px solid var(--line);
  font-size: var(--text-sm);
  color: var(--ink-3);
  text-wrap: pretty;
}
.projects__note svg {
  flex: none;
  width: 0.9rem;
  height: 0.9rem;
  margin-top: 0.25rem;
}
.projects__grid {
  display: grid;
  gap: var(--s-5);
}
@media (min-width: 48em) {
  .projects__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .projects__grid > :deep(.project--featured) {
    grid-column: 1 / -1;
  }
}
@media (min-width: 64em) {
  .projects__grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .projects__grid > :deep(.project) {
    grid-column: span 3;
  }
  .projects__grid > :deep(.project--featured) {
    grid-column: 1 / -1;
  }
  /* Asymmetric rhythm: alternate 4/2 column spans after the featured card. */
  .projects__grid > :deep(.project:not(.project--featured):nth-of-type(6n + 2)) {
    grid-column: span 4;
  }
  .projects__grid > :deep(.project:not(.project--featured):nth-of-type(6n + 3)) {
    grid-column: span 2;
  }
  .projects__grid > :deep(.project:not(.project--featured):nth-of-type(6n + 4)) {
    grid-column: span 2;
  }
  .projects__grid > :deep(.project:not(.project--featured):nth-of-type(6n + 5)) {
    grid-column: span 4;
  }
}
</style>
