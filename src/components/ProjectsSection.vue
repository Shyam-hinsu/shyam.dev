<script setup>
import { ref, computed } from 'vue'
import { projects, projectCategories } from '../content/projects.js'
import { useReveal } from '../composables/useReveal.js'
import { useHashRoute } from '../composables/useHashRoute.js'
import SectionHeading from './SectionHeading.vue'
import ProjectCard from './ProjectCard.vue'
import ProjectCaseStudy from './ProjectCaseStudy.vue'

const root = ref(null)
useReveal(root)

const filter = ref('All')
const visible = computed(() =>
  filter.value === 'All' ? projects : projects.filter((p) => p.category === filter.value),
)
const featured = computed(() => visible.value.find((p) => p.featured))
const rest = computed(() => visible.value.filter((p) => p !== featured.value))

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
      <SectionHeading id="projects-title" eyebrow="Selected projects" title="Work that had to <em>scale</em>.">
        Anonymised enterprise work. Company and customer names are withheld and confidential
        screenshots are not published; architecture diagrams show how each system is built.
      </SectionHeading>

      <div class="projects__filters reveal" role="group" aria-label="Filter projects by category" data-agent-element data-agent-handle="e">
        <button
          v-for="c in projectCategories"
          :key="c"
          type="button"
          class="projects__filter"
          :class="{ 'is-active': filter === c }"
          :aria-pressed="filter === c"
          :data-agent-action="c === 'Network Topology' || c === 'All' ? 'click' : null"
          :data-agent-after="c === 'All' ? 4200 : 1600"
          @click="filter = c"
        >
          {{ c }}
        </button>
      </div>

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
      <p v-if="!visible.length" class="muted">No projects in this category yet.</p>
    </div>

    <ProjectCaseStudy :project="current" @close="onClosed" />
  </section>
</template>

<style scoped>
.projects__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: var(--s-6);
}
.projects__filter {
  padding: 0.5rem 0.95rem;
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  font-size: var(--text-sm);
  color: var(--ink-2);
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
}
.projects__filter:hover {
  color: var(--ink);
  border-color: var(--line-strong);
}
.projects__filter.is-active {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--ink-3);
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
