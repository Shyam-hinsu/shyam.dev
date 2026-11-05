# Content inventory

Last updated: 2026-11-05 (commit: see `git log -1 -- .claude/docs/CONTENT.md`)

Every piece of visible copy and personal data on the site, where it is defined, and its status.
**Status key:** ✅ real (supplied by Shyam) · ✍️ drafted (written by Claude from the brief; review before publishing) · ⚠️ placeholder (must be replaced; shown with a visible badge or hidden until set)

## 1. Identity and contact — `src/content/site.js`

| Field | Value | Status |
| --- | --- | --- |
| `site.name` | Shyam Hinsu | ✅ |
| `site.title` | Frontend Engineer | ✅ |
| `site.tagline` | Vue.js · Data visualization · Frontend architecture | ✍️ |
| `site.yearsOfExperience` | 4 (shown as "~4 years") | ✅ |
| `site.location` | empty → hidden | ⚠️ |
| `site.url` | https://shyam-hinsu.github.io/shyam.dev/ | ⚠️ confirm domain |
| `site.description` | one-paragraph summary used for meta description | ✍️ |
| `site.email` | empty → email card and contact form hidden | ⚠️ |
| `site.links.github` | https://github.com/Shyam-hinsu | ✅ |
| `site.links.linkedin` | empty → hidden | ⚠️ |
| `site.resumeUrl` | empty → all resume buttons hidden; drop a PDF in `public/resume/` | ⚠️ |
| `site.availability` | `show: false` | ⚠️ set true only if accurate |
| `site.contactForm.endpoint` | empty → form falls back to mailto once `email` is set | ⚠️ |

`nav` (same file): About, Projects, Engineering, Expertise, Experience, Approach, Contact.

## 2. Hero — `src/content/site.js` → `hero`

- Eyebrow: "Frontend Engineer · ~4 years" ✍️
- Headline: "I build *complex* frontends that stay fast, clear and maintainable." ✍️
- Intro paragraph: Vue.js engineer, enterprise software, topologies to dashboards. ✍️
- Specialisation chips: Vue 2 & 3, JavaScript, Data visualization, Web Workers, Design systems. ✅ (from brief)
- Primary CTA: "Explore my work" → `#projects`. Resume and LinkedIn buttons appear only when set.
- Portrait: `public/images/portrait-{480,800,1200}.{webp,jpg}` ✅ (supplied photo; used once, in the hero)

## 3. About — `src/content/site.js` → `about`

- Title: "Engineering beyond the *component*." ✍️
- Four paragraphs: hard parts of a product; enterprise Vue work; architecture; collaboration. ✍️
- Facts: Focus / Strengths / Currently. ✍️
- No photo in this section (removed on request).

## 4. Projects — `src/content/projects.js`

Intro (`projectsIntro`): eyebrow "Selected work · 05", title "Work that had to *scale*.", lede about five enterprise network systems, footnote stating the work is confidential and diagrams are redrawn architecture. ✍️

Five projects, all `confidential: true`, no screenshots, each with a ten-part case study (overview, business problem, technical challenge, responsibilities, architecture, stack, UX, performance, screenshots, outcomes):

| Slug | Title | Category | Diagram |
| --- | --- | --- | --- |
| network-monitoring-platform (featured) | Enterprise Network Monitoring Platform | Enterprise Monitoring | monitoring |
| network-topology-visualization | Network Topology Visualization | Network Topology | topology |
| real-time-dashboards | Real-Time Metrics Dashboards | Real-Time Data | dashboards |
| vue2-to-vue3-migration | Vue 2 → Vue 3 Migration | Frontend Architecture | migration |
| component-library-design-system | Component Library & Design Tokens | Design Systems | designsystem |

Status: ✍️ all case-study text is drafted from the technology list in the brief. Outcomes are qualitative only; **no metrics**. Shyam must review each case study and cut anything that is not his work. Real screenshots go in `public/images/projects/<slug>/` and the `screenshots` array.

## 5. Engineering showcase — `src/content/showcase.js`

Three walkthroughs (Problem → Investigation → Decision → Implementation → Result) with code samples:
1. Topology at scale without freezing the UI (Web Worker layout, typed arrays) ✍️
2. Vue 2 mixins to Vue 3 composables (`usePolling`) ✍️
3. Dozens of live charts on one screen (Highcharts in-place updates, batched redraw) ✍️

The live demo that used to accompany item 1 was removed on request.

## 6. Expertise — `src/content/skills.js`

Five groups, each skill with a one-line note on real usage: Frontend (Vue, JS, HTML, CSS, Less, Tailwind), Visualization (Highcharts, Cytoscape.js, D3, Canvas), Architecture (components, state, Web Workers, performance, REST), Tools (Webpack, Vite, Git, Azure DevOps, Figma), AI-assisted development (Claude Code, Cursor, automated review, workflows). ✅ technologies from brief · ✍️ notes

## 7. Experience — `src/content/experience.js`

One entry, `placeholder: true` → renders a visible "placeholder" badge.
- company: "Company name" ⚠️ · period: "Start year — Present" ⚠️ · location: empty ⚠️
- role: Frontend Developer ✅ · highlights (5) and stack ✍️ from brief

## 8. Engineering philosophy — `src/content/philosophy.js`

Pull quote and eight principles (maintainable, reusable, performance, accessible, responsive, collaboration, quality, learning). ✍️

## 9. Achievements — `src/content/achievements.js`

All four lists empty → **section is not rendered**. Add only verified items.

## 10. Beyond development — `src/content/beyond.js`

Three cards: AI-assisted engineering, Visualization experiments, This website. ✍️

## 11. Contact — `src/content/contact.js` + `src/content/site.js`

Title "Let's build something that *lasts*." and intro ✍️. Channels render only for set fields (currently GitHub only). The form renders only with an endpoint or email. The deploy card ("Ship it to prod.", "Click to gather agents") is part of the agent finale — `src/components/DeployCard.vue`.

## 12. Footer — `src/components/SiteFooter.vue`

"Built with Vue 3 and Vite. No UI framework, self-hosted fonts." Links mirror `nav` and `site.links`.

## 13. Metadata and assets

- `index.html`: title, description, Open Graph/Twitter tags, canonical, JSON-LD Person (sameAs: GitHub only). URLs assume GitHub Pages at `/shyam.dev/`. ✍️
- `public/images/og.png` (1200×630, generated from the portrait and headline), `public/favicon.svg`, `public/apple-touch-icon.png`, `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest`.
- Fonts (self-hosted, `public/fonts/`): Instrument Serif, Inter 400/500/600, JetBrains Mono 400/500.

## 14. Agent dock copy — `src/components/AgentOverlay.vue`

Status strings ("Scanning page…", "N agents", "Rebuilt by N agents in Xs"), panel help text, button labels (Pause/Resume, Replay section, Replay intro, Inspect all, Trails, Dust, Turn agents off/on, Open companion window), agent names in `src/agents/AnimationConfig.js` (UI_Agent_01, DOM_Layout_02, Graphics_03, Motion_04, State_05).

## Open items for Shyam

1. Email, LinkedIn, resume PDF, availability flag, location (section 1).
2. Company name and dates (section 7).
3. Review all five case studies and the three showcase walkthroughs; remove anything that is not yours (sections 4, 5).
4. Optional: real screenshots, verified outcomes, achievements, form endpoint, custom domain.
