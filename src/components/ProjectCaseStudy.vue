<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import ArchDiagram from './diagrams/ArchDiagram.vue'
import IconGlyph from './IconGlyph.vue'

const props = defineProps({ project: { type: Object, default: null } })
const emit = defineEmits(['close'])

const dialog = ref(null)
const body = ref(null)

const sections = [
  ['overview', 'Overview'],
  ['problem', 'Business problem'],
  ['challenge', 'Technical challenge'],
  ['responsibilities', 'My responsibilities'],
  ['architecture', 'Architecture & implementation'],
  ['stack', 'Technology stack'],
  ['ux', 'UX decisions'],
  ['performance', 'Performance considerations'],
  ['screenshots', 'Screenshots'],
  ['outcomes', 'Outcomes'],
]

async function sync(p) {
  const el = dialog.value
  if (!el) return
  if (p) {
    if (!el.open) el.showModal()
    document.body.classList.add('is-locked')
    await nextTick()
    body.value?.scrollTo({ top: 0, behavior: 'instant' })
  } else if (el.open) {
    el.close()
  }
}

watch(() => props.project, sync, { flush: 'post' })
onMounted(() => sync(props.project))

function onCancel(e) {
  e.preventDefault() // keep our own close path so the URL hash is updated
  emit('close')
}
function onClose() {
  document.body.classList.remove('is-locked')
  if (props.project) emit('close')
}
function onBackdrop(e) {
  if (e.target === dialog.value) emit('close')
}

onBeforeUnmount(() => document.body.classList.remove('is-locked'))
</script>

<template>
  <dialog ref="dialog" class="cs" :aria-label="project ? `Case study: ${project.title}` : 'Case study'" @cancel="onCancel" @close="onClose" @click="onBackdrop">
    <div v-if="project" class="cs__panel">
      <header class="cs__head">
        <div>
          <p class="eyebrow">{{ project.category }}</p>
          <h3 class="display cs__title">{{ project.title }}</h3>
        </div>
        <button type="button" class="cs__close" aria-label="Close case study" @click="$emit('close')">
          <IconGlyph name="close" />
        </button>
      </header>

      <div ref="body" class="cs__body">
        <div class="cs__visual">
          <ArchDiagram :kind="project.visual" :title="`${project.title} — architecture diagram`" />
        </div>

        <div class="cs__columns">
        <nav class="cs__toc" aria-label="Case study sections">
          <ol>
            <li v-for="([key, label], i) in sections" :key="key">
              <a :href="`#cs-${project.slug}-${key}`"><span class="mono">{{ String(i + 1).padStart(2, '0') }}</span> {{ label }}</a>
            </li>
          </ol>
        </nav>

        <div class="cs__content">
          <section v-for="([key, label], i) in sections" :id="`cs-${project.slug}-${key}`" :key="key" class="cs__section">
            <h4 class="cs__h"><span class="mono">{{ String(i + 1).padStart(2, '0') }}</span>{{ label }}</h4>

            <ul v-if="key === 'stack'" class="cs__stack">
              <li v-for="t in project.stack" :key="t" class="tag tag--accent">{{ t }}</li>
            </ul>

            <template v-else-if="key === 'screenshots'">
              <div v-if="project.screenshots.length" class="cs__shots">
                <figure v-for="s in project.screenshots" :key="s.src">
                  <img :src="s.src" :alt="s.alt" loading="lazy" decoding="async" />
                  <figcaption v-if="s.caption" class="muted">{{ s.caption }}</figcaption>
                </figure>
              </div>
              <p v-else class="cs__confidential">
                <IconGlyph name="lock" />
                <span>
                  Interface screenshots for this product are confidential and are not published. The diagram above
                  shows the system’s structure instead; it is a diagram, not a screenshot.
                </span>
              </p>
            </template>

            <p v-else-if="typeof project.caseStudy[key] === 'string'" class="cs__p">{{ project.caseStudy[key] }}</p>

            <ul v-else class="cs__list">
              <li v-for="(item, j) in project.caseStudy[key]" :key="j">{{ item }}</li>
            </ul>
          </section>
        </div>
        </div>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.cs {
  position: fixed;
  inset: 0;
  z-index: var(--z-dialog);
  width: 100vw;
  max-width: 100vw;
  height: 100dvh;
  max-height: 100dvh;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
}
.cs:not([open]) {
  display: none;
}
.cs::backdrop {
  background: rgba(5, 5, 7, 0.78);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
}
.cs[open] .cs__panel {
  animation: cs-in var(--dur-slow) var(--ease-out);
}
@keyframes cs-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.cs__panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.cs__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-5) var(--gutter) var(--s-4);
  border-bottom: 1px solid var(--line);
  background: rgba(11, 11, 13, 0.9);
}
.cs__title {
  font-size: var(--text-xl);
  margin-top: var(--s-2);
}
.cs__close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.cs__close:hover {
  border-color: var(--ink);
  background: rgba(255, 255, 255, 0.05);
}
.cs__close svg {
  width: 1.1rem;
  height: 1.1rem;
}
.cs__body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--s-5) var(--gutter) var(--s-9);
  scroll-behavior: smooth;
}
.cs__columns {
  display: grid;
  gap: var(--s-6);
  margin-top: var(--s-6);
}
.cs__visual {
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
}
.cs__toc {
  display: none;
}
.cs__toc ol {
  display: grid;
  gap: 0.35rem;
}
.cs__toc a {
  display: flex;
  gap: 0.6rem;
  font-size: var(--text-sm);
  color: var(--ink-3);
  padding: 0.25rem 0;
}
.cs__toc a:hover {
  color: var(--ink);
}
.cs__content {
  display: grid;
  gap: var(--s-6);
  max-width: 68ch;
}
.cs__section {
  scroll-margin-top: 1rem;
}
.cs__h {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: var(--s-3);
  font-size: var(--text-md);
  font-weight: 600;
}
.cs__h .mono {
  font-size: 0.7rem;
  color: var(--accent-hot);
}
.cs__p,
.cs__list {
  color: var(--ink-2);
  text-wrap: pretty;
}
.cs__list {
  display: grid;
  gap: 0.6rem;
}
.cs__list li {
  position: relative;
  padding-left: 1.25rem;
}
.cs__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.7em;
  width: 0.5rem;
  height: 1px;
  background: var(--accent);
}
.cs__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.cs__shots {
  display: grid;
  gap: var(--s-4);
}
.cs__shots img {
  border-radius: var(--r-md);
  border: 1px solid var(--line);
}
.cs__confidential {
  display: flex;
  gap: 0.75rem;
  padding: var(--s-4);
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  color: var(--ink-3);
  font-size: var(--text-sm);
}
.cs__confidential svg {
  flex: none;
  width: 1rem;
  height: 1rem;
  margin-top: 0.2rem;
}
@media (min-width: 64em) {
  .cs {
    padding: 2rem;
    display: grid;
    place-items: center;
  }
  .cs__panel {
    position: relative;
    inset: auto;
    width: min(100%, 72rem);
    height: min(100%, 56rem);
    border: 1px solid var(--line);
    border-radius: var(--r-lg);
    overflow: hidden;
    box-shadow: 0 60px 120px -40px rgba(0, 0, 0, 0.9);
  }
  .cs__head {
    padding-inline: var(--s-7);
  }
  .cs__body {
    padding-inline: var(--s-7);
  }
  .cs__columns {
    grid-template-columns: 12rem minmax(0, 1fr);
    column-gap: var(--s-7);
    align-items: start;
  }
  .cs__toc {
    display: block;
    position: sticky;
    top: 0;
  }
}
</style>
