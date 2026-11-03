<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { site, hero } from '../content/site.js'
import { useReducedMotion } from '../composables/useReducedMotion.js'
import IconGlyph from './IconGlyph.vue'

const reduced = useReducedMotion()
const frame = ref(null)
let raf = 0
let target = { x: 0, y: 0 }

// Subtle pointer parallax on the portrait — desktop pointers only, rAF-throttled,
// disabled for reduced motion.
function onMove(e) {
  if (reduced.value || !frame.value) return
  const r = frame.value.getBoundingClientRect()
  target = {
    x: ((e.clientX - (r.left + r.width / 2)) / r.width) * 2,
    y: ((e.clientY - (r.top + r.height / 2)) / r.height) * 2,
  }
  if (!raf) raf = requestAnimationFrame(apply)
}
function apply() {
  raf = 0
  if (!frame.value) return
  const x = Math.max(-1, Math.min(1, target.x))
  const y = Math.max(-1, Math.min(1, target.y))
  frame.value.style.setProperty('--tx', `${x * -6}px`)
  frame.value.style.setProperty('--ty', `${y * -6}px`)
  frame.value.style.setProperty('--rx', `${y * 2}deg`)
  frame.value.style.setProperty('--ry', `${x * -3}deg`)
}
function onLeave() {
  target = { x: 0, y: 0 }
  if (!raf) raf = requestAnimationFrame(apply)
}

let fine = false
onMounted(() => {
  fine = window.matchMedia('(pointer: fine)').matches
  if (fine) {
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerleave', onLeave)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <section id="top" class="hero" aria-labelledby="hero-title" data-agent-section="hero">
    <div class="grid-bg" aria-hidden="true" />
    <div class="hero__glow" aria-hidden="true" />

    <div class="container hero__inner">
      <div class="hero__copy">
        <p class="eyebrow hero__eyebrow reveal is-visible">{{ hero.eyebrow }}</p>
        <p class="hero__name reveal is-visible" style="--reveal-delay: 80ms">
          <span class="hero__name-text">{{ site.name }}</span>
          <span class="hero__name-title mono">{{ site.title }}</span>
        </p>
        <h1 id="hero-title" class="display hero__title reveal is-visible" style="--reveal-delay: 160ms" data-agent-element data-agent-handle="e" v-html="hero.headline" />
        <p class="lede hero__intro reveal is-visible" style="--reveal-delay: 260ms" data-agent-element data-agent-handle="e">{{ hero.intro }}</p>

        <div class="hero__cta reveal is-visible" style="--reveal-delay: 340ms" data-agent-element data-agent-handle="e">
          <a class="btn btn--primary" :href="hero.primaryCta.href">
            {{ hero.primaryCta.label }} <IconGlyph name="arrow-down" />
          </a>
          <a v-if="site.resumeUrl" class="btn btn--ghost" :href="site.resumeUrl" download>
            <IconGlyph name="download" /> Download resume
          </a>
          <div class="hero__social">
            <a v-if="site.links.github" :href="site.links.github" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
              <IconGlyph name="github" />
            </a>
            <a v-if="site.links.linkedin" :href="site.links.linkedin" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
              <IconGlyph name="linkedin" />
            </a>
          </div>
        </div>

        <ul class="hero__spec reveal is-visible" style="--reveal-delay: 420ms" aria-label="Specialisation" data-agent-element data-agent-handle="e">
          <li v-for="s in hero.specialization" :key="s">{{ s }}</li>
        </ul>
      </div>

      <figure ref="frame" class="hero__figure reveal is-visible" style="--reveal-delay: 200ms" data-agent-element data-agent-atomic data-agent-handle="se">
        <div class="hero__frame">
          <picture>
            <source
              type="image/webp"
              srcset="/images/portrait-480.webp 480w, /images/portrait-800.webp 800w, /images/portrait-1200.webp 1200w"
              sizes="(min-width: 64em) 34vw, (min-width: 48em) 50vw, 86vw"
            />
            <img
              src="/images/portrait-800.jpg"
              srcset="/images/portrait-480.jpg 480w, /images/portrait-800.jpg 800w, /images/portrait-1200.jpg 1200w"
              sizes="(min-width: 64em) 34vw, (min-width: 48em) 50vw, 86vw"
              width="1200"
              height="1608"
              :alt="`Portrait of ${site.name}, ${site.title}, in a dark suit against a black background`"
              fetchpriority="high"
              decoding="async"
            />
          </picture>
          <span class="hero__corner hero__corner--tl" aria-hidden="true" />
          <span class="hero__corner hero__corner--br" aria-hidden="true" />
        </div>
        <figcaption class="hero__plate glass">
          <span class="mono">{{ site.name }}</span>
          <span class="mono muted">{{ site.tagline }}</span>
        </figcaption>
      </figure>
    </div>

  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  padding-top: calc(var(--nav-h) + 1.5rem);
  padding-bottom: 3.5rem;
  overflow: hidden;
}
.hero__glow {
  position: absolute;
  top: -10%;
  right: -10%;
  width: 60vw;
  height: 60vw;
  max-width: 820px;
  max-height: 820px;
  background: radial-gradient(circle at center, var(--accent-glow) 0%, transparent 60%);
  filter: blur(40px);
  opacity: 0.55;
  pointer-events: none;
}
.hero__inner {
  position: relative;
  display: grid;
  gap: var(--s-7);
  align-items: center;
}
.hero__name {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: var(--s-4) 0 var(--s-3);
}
.hero__name-text {
  font-size: var(--text-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}
.hero__name-title {
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-hot);
}
.hero__title {
  font-size: var(--text-3xl);
  max-width: 13ch;
}
.hero__intro {
  margin-top: var(--s-4);
  max-width: 54ch;
}
.hero__cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin-top: var(--s-5);
}
.hero__social {
  display: inline-flex;
  gap: var(--s-2);
  margin-left: var(--s-2);
}
.hero__social a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--ink-2);
  transition: color var(--dur-fast), border-color var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}
.hero__social a:hover {
  color: var(--ink);
  border-color: var(--ink);
  transform: translateY(-2px);
}
.hero__social svg {
  width: 1.1rem;
  height: 1.1rem;
}
.hero__spec {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.2rem;
  margin-top: var(--s-5);
  padding-top: var(--s-4);
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.hero__spec li::before {
  content: '/ ';
  color: var(--accent);
}

.hero__figure {
  position: relative;
  width: min(100%, 26rem);
  margin-inline: auto;
  transform: translate(var(--tx, 0), var(--ty, 0)) rotateX(var(--rx, 0)) rotateY(var(--ry, 0));
  transform-style: preserve-3d;
  transition: transform 600ms var(--ease-out);
}
.hero__frame {
  position: relative;
  border-radius: var(--r-lg);
  overflow: hidden;
  background: #000;
  box-shadow:
    0 40px 80px -30px rgba(0, 0, 0, 0.8),
    0 0 0 1px var(--line);
}
.hero__frame img {
  width: 100%;
  aspect-ratio: 1200 / 1608;
  object-fit: cover;
}
.hero__frame::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(11, 11, 13, 0.55) 0%, transparent 40%);
  pointer-events: none;
}
.hero__corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border: 1px solid var(--accent);
  z-index: 2;
}
.hero__corner--tl {
  top: 14px;
  left: 14px;
  border-right: 0;
  border-bottom: 0;
}
.hero__corner--br {
  top: 14px;
  right: 14px;
  border-left: 0;
  border-bottom: 0;
}
.hero__plate {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.7rem 0.9rem;
  border-radius: var(--r-md);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  z-index: 2;
}
@media (min-width: 48em) {
  .hero__figure {
    width: min(100%, 30rem);
  }
}
@media (min-width: 64em) {
  .hero__inner {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.85fr);
    gap: var(--s-8);
  }
  .hero__figure {
    width: 100%;
    max-width: 30rem;
    margin-inline: auto 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hero__figure {
    transform: none;
    transition: none;
  }
}
</style>
