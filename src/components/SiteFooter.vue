<script setup>
import { site, nav } from '../content/site.js'
import IconGlyph from './IconGlyph.vue'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <span class="footer__mark display">{{ site.initials }}<i>.</i></span>
        <p class="footer__tag">{{ site.name }} · {{ site.title }}</p>
        <p class="footer__built muted">
          Built with Vue 3 and Vite. No UI framework, self-hosted fonts.
        </p>
      </div>
      <nav class="footer__nav" aria-label="Footer">
        <ul>
          <li v-for="s in nav" :key="s.id"><a :href="`#${s.id}`">{{ s.label }}</a></li>
        </ul>
      </nav>
      <ul class="footer__social" aria-label="Profiles">
        <li v-if="site.links.github">
          <a :href="site.links.github" target="_blank" rel="noopener noreferrer"><IconGlyph name="github" /> GitHub</a>
        </li>
        <li v-if="site.links.linkedin">
          <a :href="site.links.linkedin" target="_blank" rel="noopener noreferrer"><IconGlyph name="linkedin" /> LinkedIn</a>
        </li>
        <li v-if="site.email">
          <a :href="`mailto:${site.email}`"><IconGlyph name="mail" /> Email</a>
        </li>
      </ul>
    </div>
    <div class="container footer__bottom">
      <span class="mono">© {{ year }} {{ site.name }}</span>
      <a href="#top" class="footer__top mono">Back to top ↑</a>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line);
  background: var(--bg-elev);
}
.footer__inner {
  display: grid;
  gap: var(--s-6);
  padding-block: var(--s-7);
}
.footer__mark {
  font-size: 2.5rem;
  line-height: 1;
}
.footer__mark i {
  color: var(--accent);
  font-style: normal;
}
.footer__tag {
  margin-top: var(--s-3);
  font-weight: 500;
}
.footer__built {
  margin-top: var(--s-2);
  font-size: var(--text-sm);
  max-width: 36ch;
}
.footer__nav ul {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 1rem;
}
.footer__nav a,
.footer__social a {
  font-size: var(--text-sm);
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
}
.footer__nav a:hover,
.footer__social a:hover {
  color: var(--ink);
}
.footer__social {
  display: grid;
  gap: 0.5rem;
  align-content: start;
}
.footer__social svg {
  width: 1rem;
  height: 1rem;
}
.footer__bottom {
  display: flex;
  justify-content: space-between;
  gap: var(--s-4);
  padding-block: var(--s-4);
  border-top: 1px solid var(--line);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.footer__top:hover {
  color: var(--ink);
}
@media (min-width: 48em) {
  .footer__inner {
    grid-template-columns: 1.4fr 1fr 1fr;
  }
}
</style>
