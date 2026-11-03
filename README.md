# shyam.dev — portfolio of Shyam Hinsu

Personal portfolio for a frontend engineer specialising in enterprise Vue.js applications.
Built with **Vue 3 + Vite**, no UI framework, self-hosted fonts, one Web Worker, and a canvas-based
multi-cursor "UI agents" animation system that inspects and builds the page as you scroll.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ at http://localhost:4173
```

## Update the content (no component changes needed)

All personal information lives in `src/content/`:

| File | What it holds |
| --- | --- |
| `site.js` | Name, title, links, email, resume path, availability pill, contact-form endpoint, hero and about copy |
| `projects.js` | Project cards and the ten-part case studies, categories, optional screenshots |
| `showcase.js` | Engineering showcase: problem → investigation → decision → implementation → result, with code excerpts |
| `skills.js` | Expertise groups with a note on how each technology is actually used |
| `experience.js` | Experience timeline (entries flagged `placeholder: true` show a visible badge) |
| `philosophy.js` | Engineering principles and the pull quote |
| `achievements.js` | Verified awards, certifications, open source, recognition — the section is omitted while empty |
| `beyond.js` | "Beyond development" cards |
| `contact.js` | Contact section copy |

Fields left as `''` are hidden in the UI rather than shown as fake data. Search for `TODO` in `src/content/` for the
values that still need your real details:

- `site.email`, `site.links.linkedin`, `site.resumeUrl`, `site.availability`
- `experience[0].company` and `period`
- verified outcomes in each project's `caseStudy.outcomes`

### Contact form

The form renders only when it can deliver a message. Set `site.contactForm.endpoint` to a form backend's POST URL
(for example Formspree, Basin or Getform) for in-page submission; otherwise, with `site.email` set, the form composes
a pre-filled email via `mailto:`.

### Images

- Portrait: `public/images/portrait-*.{webp,jpg}` (responsive sizes) and `portrait-square-*.webp`.
- Open Graph image: `public/images/og.png` (1200×630).
- Project screenshots: put files in `public/images/projects/<slug>/` and list them in the project's `screenshots`
  array. Until then, each case study shows a genuine architecture diagram and states that screenshots are withheld.

## Structure

```
src/
  components/      one component per section + shared pieces (nav, code block, diagrams, case study dialog)
  composables/     useReveal, useActiveSection, useHashRoute, useReducedMotion
  content/         all copy and configuration
  styles/          tokens.css (design tokens), base.css (reset + primitives), fonts.css
  workers/         layout.worker.js + simulation.js (force-directed layout for the live demo)
public/            fonts, images, favicon, robots.txt, sitemap.xml, manifest
```

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`
(enable **Settings → Pages → Source: GitHub Actions** once). The base path resolves automatically:
`/` when `public/CNAME` exists (custom domain), otherwise `/<repository-name>/`.

Update the canonical, Open Graph and sitemap URLs in `index.html`, `public/robots.txt` and `public/sitemap.xml`
if you deploy under a different domain.

## Multi-cursor agent animation (`src/agents/`)

Five simulated cursors (UI, DOM Layout, Graphics, Motion, State) select registered elements and drag them open
as each section scrolls into view. One shared `requestAnimationFrame` loop drives everything; the page is fully
usable with the system off.

| Module | Responsibility |
| --- | --- |
| `AnimationConfig.js` | Agent identities and colours, timings, physics, reveal and safety settings |
| `CursorAgent.js` | One cursor: position physics, task phases (approach → hover → press → drag → release), trail, ripples |
| `CursorRenderer.js` | Canvas overlay (DPR-aware): cursors, labels, trails, ripples, selection boxes, eight handles, size pills |
| `DOMInspector.js` | Registry of `[data-agent-section]` / `[data-agent-element]`, cached rects, clip-path reveal |
| `AnimationTaskQueue.js` | Pending tasks, nearest-agent claiming, completion tracking |
| `ScrollAnimationController.js` | IntersectionObserver triggers, task generation, the single loop, controls, cleanup |
| `components/AgentOverlay.vue` | Mounts the engine and renders the control dock |

Register an element:

```html
<section data-agent-section="projects">
  <article data-agent-element data-agent-handle="se">…</article>
</section>
```

`data-agent-handle` is the corner or edge the cursor grabs (`se`, `e`, `s`, `sw`, `ne`, …). Elements are revealed
with `clip-path: inset()` so text, images and layout are never distorted. Sections are not re-triggered while
running; replaying is explicit through the dock (Pause / Resume, Inspect AUTO / ALL, Trails, Replay section,
Replay all, Enable / Disable). Preferences persist in `localStorage`. The system is off by default under
`prefers-reduced-motion`, pauses when the tab is hidden, and force-builds anything the visitor scrolled past.

## Accessibility and motion

Semantic landmarks and headings, keyboard-reachable controls with visible focus, native `<dialog>` for case studies,
`prefers-reduced-motion` honoured everywhere (the live demo settles instantly instead of animating), and no
horizontal overflow at phone widths.
