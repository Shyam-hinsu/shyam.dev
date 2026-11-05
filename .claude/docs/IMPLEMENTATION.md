# Implementation guide

Last updated: 2026-11-05

## Stack and layout

Vue 3 (Composition API, `<script setup>`), Vite 7, plain CSS with design tokens. No UI framework, no runtime dependencies beyond Vue. Built output is static; deployed to GitHub Pages by `.github/workflows/deploy.yml` (base path resolves to `/` with `public/CNAME`, else `/<repo>/`).

```
index.html                 metadata, preloads, JSON-LD, #app mount
src/main.js                createApp + global styles
src/App.vue                section order; wires ContactSection → AgentOverlay.gather()
src/styles/tokens.css      colour, type, space, motion tokens (single source of truth)
src/styles/base.css        reset, typography, buttons, tags, reveal, layering (#app > main is z-index 1)
src/styles/fonts.css       @font-face for self-hosted woff2
src/content/*.js           ALL copy and personal data (see CONTENT.md)
src/components/*.vue       one component per section + shared pieces
src/components/diagrams/   ArchDiagram.vue: inline SVG architecture diagrams (5 kinds)
src/composables/           useReveal, useActiveSection, useHashRoute, useReducedMotion
src/agents/                multi-cursor agent animation system
src/windows/               multi-window world + particle Earth
public/                    fonts, images, favicon, og.png, robots, sitemap, manifest, resume/
```

### Sections and behaviours

- **SiteNav**: sticky, active-section underline via IntersectionObserver, mobile menu rendered outside the header (a `backdrop-filter` ancestor would trap `position: fixed`).
- **HeroSection**: responsive `<picture>` portrait, pointer parallax on fine pointers only.
- **ProjectsSection / ProjectCard / ProjectCaseStudy**: featured + asymmetric grid; case study is a native `<dialog>` deep-linked as `#project/<slug>` (`useHashRoute`). No filters.
- **ShowcaseSection + CodeBlock**: three walkthroughs; CodeBlock is a dependency-free tokenizer.
- **ContactSection**: form renders only with `site.contactForm.endpoint` (POST JSON) or `site.email` (mailto). Honeypot field. Emits `gather` from DeployCard.
- **AchievementsSection / BeyondSection**: render only when their content is non-empty.
- Reveal-on-scroll: `.reveal` + `useReveal`; inside agent sections the agents own reveals instead (DOMInspector strips `.reveal`).

## Agent animation system — `src/agents/`

Five simulated cursors wireframe and build each section as the visitor scrolls to it. One shared `requestAnimationFrame` loop; the page is never scrolled programmatically; everything is visual only (no network, no AI).

| Module | Responsibility |
| --- | --- |
| `AnimationConfig.js` | `LEAD_AGENTS` (5, ivory pointers with a muted identity dot), `CONFIG`: timings, physics, reveal, `discoverLayers` (false), `dustCount`, `layerSelector` |
| `DOMInspector.js` | Registry of `[data-agent-section]` and `[data-agent-element]` frames; cached, un-scaled rects (`measure()` only reads the DOM when `dirty`, for sections near the viewport); scale-based reveal (`applyReveal`) from the corner opposite `data-agent-handle`; `data-agent-atomic` frames are one block; `data-agent-name` gives readable log entries |
| `AnimationTaskQueue.js` | `pending` / `active`; `claim(agent, inspector, vh)` scans the whole queue and takes the nearest task whose target is on or near the screen; `release(task)` returns an abandoned task to the front; `complete(task, agent)` |
| `CursorAgent.js` | One cursor: eased glides (cubic ease-out, duration from distance), phases approach → hover → press → drag/pop/act → release; `idle()` circles its last position; `finish(…, aborted, inspector)` requeues an aborted build with the element reset (without `inspector` the task is dropped: used when the controller cancels a section) |
| `CursorRenderer.js` | DPR-aware canvas: hairline frames (ivory 42%), 8 handles, dark-glass size pills, drag guides in the accent, ivory pointers with glass labels, trails (off by default), ripples |
| `ScrollAnimationController.js` | Orchestration: intro splash (leads click the monogram), IntersectionObserver per section (`triggerSection` once; built sections are re-inspected on re-entry, ≤ once per 6 s), interactions on `[data-agent-action]` controls, finale `gather()` on the deploy card once it is built and in view, housekeeping (far-scrolled idle sections build instantly; stale mid-animation items are force-built after 6 s), controls, the single loop, world/dust rendering |
| `easing.js` | clamp, lerp, easings, rand |
| `components/AgentOverlay.vue` | Two canvases (dust at z-index 0 behind the page, cursors at 55), splash, the dock (one pill + panel), `localStorage` prefs (`agents.prefs.v2`: enabled, trails, dust) |
| `components/DeployCard.vue` | `[data-agent-finale]` card; click → `gather()` |

### Markup contract

```html
<section data-agent-section="projects">
  <article data-agent-element data-agent-handle="se" data-agent-name="Project card">…</article>
  <figure data-agent-element data-agent-atomic data-agent-handle="se">…</figure>
  <button data-agent-action="hover|click|pulse" data-agent-after="1200" data-agent-hold="900">…</button>
</section>
```

Sections: hero, about, projects, showcase, expertise, experience, philosophy, achievements, beyond, contact. Every simulated action dispatches an `agent:action` DOM event.

### Guarantees

- Nothing stays hidden: abandoned builds are requeued; sections scrolled far past are built instantly; content is fully shown with agents off, under `prefers-reduced-motion` (default off), and when the tab is hidden the loop pauses.
- Debug: load with `?agents-debug` → `window.__agentController`.

## Multi-window world — `src/windows/`

- `WindowManager.js`: each window broadcasts its screen position (`screenX/Y`, size) and its cursor positions over `BroadcastChannel` (`localStorage` fallback), heartbeat 300 ms, peers pruned after 1.5 s. Every window draws other windows' cursors at their true screen position; idle cursors occasionally roam into a neighbouring window. Desktop detection is by input capability (`pointer: fine and hover: hover`), not viewport width, so the companion popup (opened from the dock) takes part.
- `DustField.js`: the particle Earth. `DustField(seed, count)` samples the sphere using `landMask.js` (land kept, ocean kept at 13%, coastlines brightest); `DustRenderer` rotates particles (spin ~80 s, 23.4° tilt), projects orthographically into an additive full-res pixel buffer and composites with a two-level bloom; rim light at the limb. When two windows are close, a share of particles flows through a pinched tube and nests inside the other window's globe. Every window computes every window's globe locally from `created` + a shared clock; only shapes are broadcast.
- `landMask.js`: 512×256 1-bit equirectangular land mask rasterised from Natural Earth 1:110m land (public domain), ~24 KB; `isLand(lon, lat)`.

Palette for windows: crimson (site accent), silver, sand, slate, mauve. Toggle: "Dust" in the dock panel.

## Build, test, deploy

- `npm run build` must pass before any commit. Chunks: vue, index; CSS ~45 KB.
- Headless checks (Playwright is preinstalled): load with `?agents-debug`, scroll with `page.mouse.wheel`, assert `inspector.sections.get(id).items` all `built`, no `pageerror`.
- Lighthouse last measured (desktop): 98–100 performance, 96 accessibility, 100 best practices, 100 SEO.
- Deploy: push to `main` → GitHub Pages workflow. Enable Settings → Pages → Source: GitHub Actions once.

## Decisions log

- Five cursors over ~40 frames (not 30 cursors over 245 layers): matches the reference and keeps the page readable. `discoverLayers` keeps the finer mode available.
- No auto-scroll: the visitor drives; the tour mode was removed.
- Dust behind content on its own canvas; tonal palette; one accent.
- Live Web Worker demo and the About portrait were removed on request.
- No three.js: globe is 2D-canvas orthographic projection; cost ~3 ms/frame.
