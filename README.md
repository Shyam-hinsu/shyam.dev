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

- Portrait: `public/images/portrait-*.{webp,jpg}` (responsive sizes), used once in the hero.
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
public/            fonts, images, favicon, robots.txt, sitemap.xml, manifest
```

## Deployment

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`
(enable **Settings → Pages → Source: GitHub Actions** once). The base path resolves automatically:
`/` when `public/CNAME` exists (custom domain), otherwise `/<repository-name>/`.

Update the canonical, Open Graph and sitemap URLs in `index.html`, `public/robots.txt` and `public/sitemap.xml`
if you deploy under a different domain.

## Multi-cursor agent animation (`src/agents/`)

Five simulated cursors (UI, DOM Layout, Graphics, Motion, State) wireframe and build each section as you
scroll to it, in the spirit of a Figma file being assembled by a team. One shared `requestAnimationFrame`
loop drives everything; nothing ever scrolls the page for you; the page is fully usable with the system off.

Flow: intro splash ("Scanning page…", the five lock onto the monogram and click it) → hero frames are dragged
open → each section you scroll to is wireframed and built → in the contact section the five gather on the
"Ship it to prod." card and click it (clicking the card gathers them again).

| Module | Responsibility |
| --- | --- |
| `AnimationConfig.js` | Cursor identities, timings, physics, reveal settings, `discoverLayers` |
| `CursorAgent.js` | One cursor: eased glides, task phases (approach → hover → press → drag/pop → release), idle circling, trail, ripples |
| `CursorRenderer.js` | DPR-aware canvas: wireframe frames with eight handles, size pills, drag guides, cursors, trails, ripples |
| `DOMInspector.js` | Sections and frames (`data-agent-element`), cached un-scaled rects, scale-based reveal |
| `AnimationTaskQueue.js` | Pending tasks, nearest-cursor claiming, completion tracking |
| `ScrollAnimationController.js` | IntersectionObserver triggers, the single loop, interactions, finale, controls, cleanup |
| `components/AgentOverlay.vue` | Canvas, splash and the control dock |
| `components/DeployCard.vue` | Finale card |

Register a section and its frames:

```html
<section data-agent-section="projects">
  <article data-agent-element data-agent-handle="se">…</article>          <!-- dragged open -->
  <figure data-agent-element data-agent-atomic data-agent-handle="se">…</figure> <!-- one block -->
</section>
```

Frames are revealed by scaling from the corner opposite the handle (transforms only, layout untouched) and
their wireframe fades out when built. Set `discoverLayers: true` in the config to also wireframe every heading,
paragraph, tag and button inside the frames. Controls can opt in to a simulated interaction with
`data-agent-action="hover|click|pulse"` plus an optional `data-agent-after` delay; every simulated action
dispatches an `agent:action` DOM event.

Dock: layer counter, Inspect AUTO/ALL, Replay section, Replay intro, turn off, plus a panel with Pause/Resume,
Trails, an activity log of what each agent did ("DOM_Layout_02 resized Portrait · 453 × 608") and "Open companion
window".

### One screen, many windows

`src/windows/WindowManager.js` shares each window's screen position and cursor positions over BroadcastChannel
(localStorage fallback). Every window renders the others' cursors at their true place on the monitor and draws a
link to each linked window; idle cursors occasionally wander into a neighbouring window and come back. Every desktop window also carries a
sparse field of dust (`src/windows/DustField.js`): a few hundred 1px motes held in a soft halo around the window's
centre that give way to the mouse. When two or more windows are linked, part of each window's dust streams across
the gap to the other window's halo and back, a restrained take on Bjørn Staal's particle
[multi-window scene](https://github.com/bgstaal/multipleWindow3dScene). Open a second
window from the dock and drag it beside the first. Desktop only, same origin only, nothing leaves the browser. Trails and on/off persist in `localStorage`; Inspect mode never does. Off by default under
`prefers-reduced-motion`, paused when the tab is hidden, and anything scrolled past is built instantly so content
never stays hidden.

## Accessibility and motion

Semantic landmarks and headings, keyboard-reachable controls with visible focus, native `<dialog>` for case studies,
`prefers-reduced-motion` honoured everywhere, and no
horizontal overflow at phone widths.
