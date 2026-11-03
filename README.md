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

A swarm of simulated cursors wireframes and builds the page while you scroll, in the spirit of a
Figma file being assembled by a team. Five labelled lead agents (UI, DOM Layout, Graphics, Motion, State)
are joined by unlabelled workers as sections trigger, up to 30. One shared `requestAnimationFrame` loop
drives everything; the page is fully usable with the system off.

Flow: intro splash ("Scanning page…", cursors flock in) → hero wireframe → each section's frames are
dragged open and its layers tapped in → tour auto-scrolls to the next section (any wheel or touch scroll
stops the tour) → finale: every agent gathers on the "Ship it to prod." card, and the dock offers
**Go live** / **Replay**.

| Module | Responsibility |
| --- | --- |
| `AnimationConfig.js` | Lead agents, worker palette, swarm size, timings, physics, layer selector |
| `CursorAgent.js` | One cursor: physics, task phases (approach → hover → press → drag/pop → release), flocking, orbit, trail, ripples |
| `CursorRenderer.js` | DPR-aware canvas: wireframe skeletons, frames with eight handles, size pills, crosshairs, cursors, trails, ripples |
| `DOMInspector.js` | Sections, frames (`data-agent-element`) and auto-discovered layers (headings, paragraphs, list items, tags, buttons, images…), cached rects, clip-path/opacity reveal |
| `AnimationTaskQueue.js` | Pending tasks, nearest-agent claiming, completion tracking |
| `ScrollAnimationController.js` | IntersectionObserver triggers, swarm growth, the single loop, tour, finale, controls, cleanup |
| `components/AgentOverlay.vue` | Canvas, splash and the control dock |
| `components/DeployCard.vue` | Finale card: click to gather the agents |

Register a section and (optionally) frames:

```html
<section data-agent-section="projects">
  <article data-agent-element data-agent-handle="se">…</article>          <!-- dragged open, then filled -->
  <figure data-agent-element data-agent-atomic data-agent-handle="se">…</figure> <!-- one block, never descended -->
</section>
```

Layers inside a section are discovered automatically (see `layerSelector` in the config). Frames reveal with
`clip-path: inset()`, layers fade in: text, images and layout are never distorted. Finished wireframes fade out.
Dock: Touring, speed 1×/2×, turn off, and an expanded panel with Pause/Resume, Inspect AUTO/ALL, Trails,
Replay section and Replay all. Trails, speed and on/off persist in `localStorage`; Inspect mode never does.
Off by default under `prefers-reduced-motion`, paused when the tab is hidden, and anything scrolled past is
built instantly so content never stays hidden.

## Accessibility and motion

Semantic landmarks and headings, keyboard-reachable controls with visible focus, native `<dialog>` for case studies,
`prefers-reduced-motion` honoured everywhere (the live demo settles instantly instead of animating), and no
horizontal overflow at phone widths.
