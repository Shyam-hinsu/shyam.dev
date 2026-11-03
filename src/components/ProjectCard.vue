<script setup>
import ArchDiagram from './diagrams/ArchDiagram.vue'
import IconGlyph from './IconGlyph.vue'

defineProps({
  project: { type: Object, required: true },
  featured: { type: Boolean, default: false },
})
defineEmits(['open'])
</script>

<template>
  <article class="project" :class="{ 'project--featured': featured }" data-agent-element data-agent-handle="se">
    <button type="button" class="project__hit" @click="$emit('open', $event)">
      <div class="project__visual">
        <ArchDiagram :kind="project.visual" :title="`${project.title} — architecture diagram`" />
        <span v-if="project.confidential" class="project__badge mono"><IconGlyph name="lock" /> Confidential · anonymised</span>
      </div>
      <div class="project__body">
        <p class="project__meta mono">
          <span>{{ project.category }}</span>
          <span v-if="featured" class="project__featured">Featured</span>
        </p>
        <h3 class="project__title display">{{ project.title }}</h3>
        <p class="project__summary">{{ project.summary }}</p>
        <ul class="project__stack" aria-label="Technology stack">
          <li v-for="t in project.stack.slice(0, featured ? 9 : 5)" :key="t" class="tag">{{ t }}</li>
        </ul>
        <span class="project__cta btn btn--link">Read case study <IconGlyph name="arrow-up-right" /></span>
      </div>
    </button>
  </article>
</template>

<style scoped>
.project {
  display: flex;
}
.project__hit {
  display: grid;
  width: 100%;
  text-align: left;
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  transition: border-color var(--dur) var(--ease-out), transform var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out);
}
.project__hit:hover {
  border-color: var(--line-strong);
  transform: translateY(-3px);
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.8);
}
.project__hit:focus-visible {
  outline-offset: 4px;
}
.project__visual {
  position: relative;
  border-bottom: 1px solid var(--line);
}
.project__visual :deep(.diagram) {
  border-radius: 0;
}
.project__visual :deep(.diagram__svg) {
  transition: transform var(--dur-slow) var(--ease-out);
}
.project__hit:hover .project__visual :deep(.diagram__svg) {
  transform: scale(1.02);
}
.project__badge {
  position: absolute;
  left: 0.75rem;
  bottom: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  background: rgba(11, 11, 13, 0.8);
  border: 1px solid var(--line);
  border-radius: var(--r-pill);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.project__badge svg {
  width: 0.8rem;
  height: 0.8rem;
}
.project__body {
  display: grid;
  gap: var(--s-3);
  padding: var(--s-5);
}
.project__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--s-3);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.project__featured {
  color: var(--accent-hot);
}
.project__title {
  font-size: var(--text-xl);
}
.project__summary {
  color: var(--ink-2);
  font-size: var(--text-sm);
  text-wrap: pretty;
}
.project__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: var(--s-1);
}
.project__cta {
  margin-top: var(--s-2);
  font-size: var(--text-sm);
}
@media (min-width: 64em) {
  .project--featured .project__hit {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  }
  .project--featured .project__visual {
    border-bottom: 0;
    border-right: 1px solid var(--line);
  }
  .project--featured .project__body {
    padding: var(--s-7);
    align-content: center;
  }
  .project--featured .project__title {
    font-size: var(--text-2xl);
  }
  .project--featured .project__summary {
    font-size: var(--text-base);
  }
}
</style>
