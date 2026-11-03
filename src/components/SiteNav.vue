<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { site, nav } from '../content/site.js'
import { useActiveSection } from '../composables/useActiveSection.js'
import IconGlyph from './IconGlyph.vue'

const props = defineProps({ sections: { type: Array, default: () => nav } })

const active = useActiveSection(props.sections.map((s) => s.id))
const open = ref(false)
const scrolled = ref(false)
const menuRef = ref(null)
const toggleRef = ref(null)

function onScroll() {
  scrolled.value = window.scrollY > 24
}

function close() {
  open.value = false
}

function onKey(e) {
  if (e.key === 'Escape' && open.value) {
    close()
    toggleRef.value?.focus()
  }
}

watch(open, (v) => {
  document.body.classList.toggle('is-locked', v)
  if (v) requestAnimationFrame(() => menuRef.value?.querySelector('a')?.focus())
})

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKey)
  document.body.classList.remove('is-locked')
})
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="nav" :class="{ 'nav--scrolled': scrolled, 'nav--open': open }">
    <div class="container nav__inner">
      <a class="nav__brand" href="#top" @click="close">
        <span class="nav__mark" aria-hidden="true">{{ site.initials }}<i>.</i></span>
        <span class="nav__name">{{ site.name }}</span>
        <span class="sr-only">, back to top</span>
      </a>

      <nav class="nav__links" aria-label="Primary">
        <ul>
          <li v-for="s in sections" :key="s.id">
            <a :href="`#${s.id}`" :class="{ 'is-active': active === s.id }" :aria-current="active === s.id ? 'true' : null">
              {{ s.label }}
            </a>
          </li>
        </ul>
      </nav>

      <div class="nav__actions">
        <span v-if="site.availability.show" class="nav__status">
          <i aria-hidden="true" />{{ site.availability.label }}
        </span>
        <a v-if="site.resumeUrl" class="btn btn--ghost nav__resume" :href="site.resumeUrl" download>
          <IconGlyph name="download" /> Resume
        </a>
        <a class="btn btn--primary nav__cta" href="#contact">Get in touch</a>
        <button
          ref="toggleRef"
          class="nav__toggle"
          type="button"
          :aria-expanded="open"
          aria-controls="mobile-menu"
          @click="open = !open"
        >
          <span class="sr-only">{{ open ? 'Close menu' : 'Open menu' }}</span>
          <IconGlyph :name="open ? 'close' : 'menu'" />
        </button>
      </div>
    </div>

  </header>

  <div id="mobile-menu" ref="menuRef" class="menu" :hidden="!open" @click.self="close">
    <nav class="menu__panel container" aria-label="Mobile">
      <ul class="menu__list">
        <li v-for="(s, i) in sections" :key="s.id" :style="{ '--i': i }">
          <a :href="`#${s.id}`" :class="{ 'is-active': active === s.id }" @click="close">
            <span class="menu__num mono">{{ String(i + 1).padStart(2, '0') }}</span>{{ s.label }}
          </a>
        </li>
      </ul>
      <div class="menu__footer">
        <a v-if="site.resumeUrl" class="btn btn--ghost" :href="site.resumeUrl" download @click="close">
          <IconGlyph name="download" /> Download resume
        </a>
        <a class="btn btn--primary" href="#contact" @click="close">Get in touch</a>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.skip-link {
  position: fixed;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 100;
  padding: 0.6rem 1rem;
  background: var(--accent);
  color: #fff;
  border-radius: var(--r-sm);
  font-weight: 600;
  transform: translateY(-200%);
}
.skip-link:focus {
  transform: none;
}

.nav {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: var(--z-nav);
  height: var(--nav-h);
  transition: background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out);
  border-bottom: 1px solid transparent;
}
.nav--scrolled,
.nav--open {
  background: rgba(11, 11, 13, 0.78);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  border-bottom-color: var(--line);
}
.nav__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
}
.nav__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  border-radius: var(--r-xs);
}
.nav__mark {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  line-height: 1;
}
.nav__mark i {
  color: var(--accent);
  font-style: normal;
}
.nav__name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--ink-2);
}
.nav__links {
  display: none;
}
.nav__links ul {
  display: flex;
  gap: 0.25rem;
}
.nav__links a {
  position: relative;
  display: inline-block;
  padding: 0.45rem 0.7rem;
  font-size: var(--text-sm);
  color: var(--ink-3);
  border-radius: var(--r-pill);
  transition: color var(--dur-fast) var(--ease-out);
}
.nav__links a::after {
  content: '';
  position: absolute;
  left: 0.7rem;
  right: 0.7rem;
  bottom: 0.15rem;
  height: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur) var(--ease-out);
}
.nav__links a:hover,
.nav__links a.is-active {
  color: var(--ink);
}
.nav__links a.is-active::after {
  transform: scaleX(1);
}
.nav__actions {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}
.nav__status {
  display: none;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
}
.nav__status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.18);
}
.nav__resume,
.nav__cta {
  display: none;
  min-height: 2.5rem;
  padding-inline: 1.1rem;
}
.nav__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--r-pill);
  border: 1px solid var(--line-strong);
}
.nav__toggle svg {
  width: 1.25rem;
  height: 1.25rem;
}

.menu {
  position: fixed;
  inset: var(--nav-h) 0 0 0;
  z-index: var(--z-menu);
  background: rgba(11, 11, 13, 0.96);
  overflow-y: auto;
}
.menu[hidden] {
  display: none;
}
.menu__panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-block: var(--s-6) var(--s-7);
}
.menu__list {
  display: grid;
  gap: 0.25rem;
  flex: 1;
}
.menu__list a {
  display: flex;
  align-items: baseline;
  gap: var(--s-4);
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-display);
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 1.1;
  color: var(--ink);
  animation: menu-in 420ms var(--ease-out) both;
  animation-delay: calc(var(--i) * 35ms);
}
.menu__list a.is-active {
  color: var(--accent-hot);
}
.menu__num {
  font-size: 0.75rem;
  color: var(--ink-3);
}
.menu__footer {
  display: grid;
  gap: var(--s-3);
  margin-top: var(--s-6);
}
@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (min-width: 64em) {
  .nav__links {
    display: block;
  }
  .nav__status,
  .nav__cta {
    display: inline-flex;
  }
  .nav__toggle,
  .menu {
    display: none;
  }
}
@media (min-width: 75em) {
  .nav__resume {
    display: inline-flex;
  }
}
@media (max-width: 40em) {
  .nav__name {
    display: none;
  }
}
</style>
