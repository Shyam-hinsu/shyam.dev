/**
 * Selected projects and their case studies.
 *
 * AUTHENTICITY NOTE — these case studies are anonymised: company, product and
 * customer names are withheld and no screenshots of confidential interfaces
 * are published. Every outcome is described qualitatively. Add verified
 * figures to `outcomes` only when you can back them up.
 *
 * To add real screenshots: drop images in public/images/projects/<slug>/ and
 * list them in `screenshots` as { src, alt, caption }.
 *
 * `visual` selects a genuine architecture diagram component (see
 * src/components/diagrams). These are diagrams, never fake screenshots.
 */
export const projectsIntro = {
  eyebrow: 'Selected work',
  title: 'Work that had to <em>scale</em>.',
  lede:
    'Five systems from enterprise network software, each with the problem it solved, the hard part, and how the frontend was built to carry it.',
  footnote:
    'This is confidential product work. Company, customer and product names are withheld and interface screenshots are not published; the diagrams are the real architecture, redrawn.',
}

export const projects = [
  {
    slug: 'network-monitoring-platform',
    featured: true,
    title: 'Enterprise Network Monitoring Platform',
    category: 'Enterprise Monitoring',
    summary:
      'A browser-based console for operations teams to watch large device fleets: live health, alarms, interface metrics and drill-down views, built as a modular Vue application.',
    stack: ['Vue.js', 'Ant Design Vue', 'Highcharts', 'Cytoscape.js', 'Web Workers', 'Less', 'Webpack', 'REST', 'Azure DevOps'],
    visual: 'monitoring',
    confidential: true,
    screenshots: [],
    caseStudy: {
      overview:
        'A monitoring console used by network operations teams to observe thousands of managed devices. Each device exposes status, alarms and time-series metrics, and operators need to move quickly from a fleet-wide overview to a single interface on a single device.',
      problem:
        'Operators were juggling several tools to answer one question: "what is wrong, where, and since when?". The product needed one interface that could present fleet health, alarm streams and topology without becoming slow or cluttered as customers grew.',
      challenge:
        'The frontend had to stay responsive with large, continuously refreshing datasets: alarm tables with tens of thousands of rows, dozens of live charts on one screen, and topology views that cannot be rendered naively. All of it had to work inside an existing enterprise Vue codebase with its own conventions.',
      responsibilities: [
        'Designed and built feature modules as self-contained Vue component trees with clear data contracts to the REST layer.',
        'Implemented the real-time metric views with Highcharts, including polling strategies and series updates that avoid full re-renders.',
        'Built the topology views on Cytoscape.js and moved heavy layout and data-shaping work into Web Workers.',
        'Introduced shared UI primitives on top of Ant Design Vue so new screens inherited consistent behaviour and styling.',
        'Owned frontend performance work: profiling, memoisation, virtualised lists and reduced reactivity overhead on hot paths.',
      ],
      architecture: [
        'Feature-sliced structure: each domain (devices, alarms, topology, reports) owns its components, store module and API adapters.',
        'A thin API layer normalises REST responses into stable view models, so components never depend on raw backend shapes.',
        'Heavy transformations (aggregation, graph layout, diffing of refreshed datasets) run in Web Workers and post typed arrays back to the main thread.',
        'Shared chart wrappers encapsulate Highcharts configuration, theming and update semantics behind small Vue components.',
        'Build pipeline on Webpack with code splitting per feature module; CI on Azure DevOps.',
      ],
      ux: [
        'Progressive disclosure: fleet overview first, then device, then interface, with persistent breadcrumbs so operators never lose context.',
        'Alarm severity uses colour and iconography together, never colour alone.',
        'Dense tables keep row height stable and support keyboard navigation so power users can work without the mouse.',
      ],
      performance: [
        'Virtualised rendering for long alarm and device tables.',
        'Chart series updated in place instead of re-created on every poll.',
        'Expensive computations moved off the main thread; results transferred as ArrayBuffers.',
        'Reactivity scoped carefully: large read-only datasets kept out of deep reactive proxies.',
      ],
      outcomes: [
        'A single console replaced several disconnected monitoring views for operations teams.',
        'Large tables and live charts remained interactive at production data volumes.',
        'Feature modules could be developed and released independently by the team.',
      ],
      // TODO Add verified figures here, e.g. 'Reduced initial load from X s to Y s (measured in Lighthouse)'.
    },
  },
  {
    slug: 'network-topology-visualization',
    featured: false,
    title: 'Network Topology Visualization',
    category: 'Network Topology',
    summary:
      'Interactive maps of network devices and links with thousands of nodes, where layout is computed off the main thread and rendering stays smooth while panning, zooming and filtering.',
    stack: ['Cytoscape.js', 'Web Workers', 'Vue.js', 'D3.js', 'Canvas'],
    visual: 'topology',
    confidential: true,
    screenshots: [],
    caseStudy: {
      overview:
        'A topology explorer that draws the relationships between devices, links and sites as an interactive graph. Operators use it to trace the blast radius of an outage and to understand how traffic flows through the network.',
      problem:
        'Diagrams that were readable with a few hundred nodes became unusable at enterprise scale: layouts took seconds to compute, the browser froze while they ran, and the result was a hairball nobody could interpret.',
      challenge:
        'Force-directed layouts are CPU-intensive, and running them on the main thread blocks every interaction. The graph also needed semantic grouping (by site, by role), level-of-detail rendering and filtering without recomputing everything.',
      responsibilities: [
        'Built the graph view on Cytoscape.js with a custom data adapter from the topology API.',
        'Moved layout computation into a Web Worker that streams positions back as Float32Arrays.',
        'Implemented grouping, collapsing and filtering so operators can start from a site-level overview and expand on demand.',
        'Tuned rendering: level-of-detail labels, throttled viewport updates and batched style changes.',
      ],
      architecture: [
        'The worker owns the simulation; the main thread owns rendering and interaction. Messages are small, typed and transferable.',
        'Graph state (selection, filters, expanded groups) lives in a dedicated store module, so the view can be restored from a URL.',
        'D3 scales and helpers are used for colour and size encodings; Cytoscape handles the scene graph and hit-testing.',
      ],
      ux: [
        'Default view is grouped and quiet; detail appears as the user zooms in or expands a group.',
        'Hover and selection always reveal the same side panel, so the interaction model is predictable.',
        'Filters are additive and visible as chips, making it obvious why the graph looks the way it does.',
      ],
      performance: [
        'Layout computed off the main thread; the UI stays interactive while it converges.',
        'Positions transferred as typed arrays rather than arrays of objects.',
        'Labels hidden below a zoom threshold; style updates batched inside Cytoscape batch calls.',
      ],
      outcomes: [
        'Topology views that previously froze the browser became explorable at real network sizes.',
        'The grouped overview gave operators a readable starting point instead of a hairball.',
      ],
    },
  },
  {
    slug: 'real-time-dashboards',
    featured: false,
    title: 'Real-Time Metrics Dashboards',
    category: 'Real-Time Data',
    summary:
      'Dashboard suite with dozens of live charts per screen: traffic, latency, utilisation and alarms, built on Highcharts with a shared wrapper layer and careful update semantics.',
    stack: ['Highcharts', 'Vue.js', 'D3.js', 'REST', 'Ant Design Vue'],
    visual: 'dashboards',
    confidential: true,
    screenshots: [],
    caseStudy: {
      overview:
        'Configurable dashboards where operators assemble panels of live metrics. Each panel polls a metrics API and renders a chart or a KPI tile; a single screen may host dozens of panels.',
      problem:
        'Early versions re-created every chart on every poll. With many panels the page stuttered, memory climbed, and users lost tooltips and zoom state each refresh.',
      challenge:
        'Keep dozens of charts live without re-rendering them, keep the view stable while data changes, and make it easy for the team to add new panel types without copying chart configuration around.',
      responsibilities: [
        'Designed a chart wrapper layer so Vue components describe intent (series, units, thresholds) and the wrapper handles Highcharts configuration and updates.',
        'Implemented in-place series updates, redraw batching and visibility-aware polling.',
        'Built KPI tiles, threshold bands and consistent tooltips across chart types.',
      ],
      architecture: [
        'One Highcharts instance per panel, created once and updated via setData/addPoint; no re-mounts on data refresh.',
        'A polling scheduler coordinates requests per screen instead of per panel, and pauses when the tab is hidden.',
        'Theme tokens shared between the Less variables and the Highcharts theme so charts match the product UI.',
      ],
      ux: [
        'Zoom, tooltip and legend state survive data refreshes.',
        'Thresholds are drawn as bands with labels, so an alert condition is visible without reading the axis.',
        'Units and number formatting are consistent across all panels.',
      ],
      performance: [
        'In-place series updates instead of chart re-creation.',
        'Redraws batched per animation frame when multiple panels update together.',
        'Polling paused for hidden tabs and off-screen panels.',
      ],
      outcomes: [
        'Screens with many live panels became smooth and stable for long operator sessions.',
        'New panel types could be added by composing the wrapper rather than configuring Highcharts by hand.',
      ],
    },
  },
  {
    slug: 'vue2-to-vue3-migration',
    featured: false,
    title: 'Vue 2 → Vue 3 Migration',
    category: 'Frontend Architecture',
    summary:
      'Incremental migration of a large enterprise codebase from Vue 2 to Vue 3: compatibility build first, then module-by-module rewrites, mixins to composables, and a modern build pipeline.',
    stack: ['Vue 3', 'Composition API', 'Webpack', 'Ant Design Vue', 'Less'],
    visual: 'migration',
    confidential: true,
    screenshots: [],
    caseStudy: {
      overview:
        'A planned, incremental move of a production Vue 2 application to Vue 3, carried out while the product kept shipping features.',
      problem:
        'Vue 2 reached end of life, key dependencies stopped receiving updates, and the mixin-heavy codebase made shared logic hard to trace and test.',
      challenge:
        'Migrate without a feature freeze or a big-bang rewrite, keep third-party UI libraries working, and leave the codebase in a better structural state than before rather than merely "on the new version".',
      responsibilities: [
        'Audited the codebase for breaking changes: filters, event bus usage, $listeners, slot syntax, deep reactivity assumptions.',
        'Introduced the Vue 3 migration build to run the app on Vue 3 with compatibility flags, then removed flags module by module.',
        'Rewrote shared mixins as composables with explicit inputs and outputs.',
        'Upgraded the UI library and build tooling, keeping the Less theme intact.',
      ],
      architecture: [
        'Compatibility build as the bridge: the app ran on Vue 3 immediately, and each warning category became a tracked workstream.',
        'Composables replace mixins; each one owns its state and exposes a small API, which also made unit testing possible.',
        'Global event bus replaced with explicit props/emits and a small store, removing hidden coupling between screens.',
      ],
      ux: [
        'No user-visible regressions as the goal: migration PRs were behaviour-preserving and reviewed against the existing screens.',
      ],
      performance: [
        'Vue 3 proxy-based reactivity and improved compiler output reduced runtime overhead on large component trees.',
        'Migration was used as an opportunity to remove dead code and unused dependencies from the bundle.',
      ],
      outcomes: [
        'The application runs on Vue 3 with the Composition API as the standard for new code.',
        'Shared logic lives in composables that can be reasoned about and tested in isolation.',
      ],
    },
  },
  {
    slug: 'component-library-design-system',
    featured: false,
    title: 'Component Library & Design Tokens',
    category: 'Design Systems',
    summary:
      'An internal component layer on top of Ant Design Vue: design tokens in Less and Tailwind, documented patterns, and shared components that made new screens consistent by default.',
    stack: ['Vue.js', 'Ant Design Vue', 'Less', 'Tailwind CSS', 'Figma'],
    visual: 'designsystem',
    confidential: true,
    screenshots: [],
    caseStudy: {
      overview:
        'A set of shared components, tokens and patterns that sit between a third-party UI library and product screens, so teams build consistent interfaces without re-deciding spacing, colour and behaviour each time.',
      problem:
        'Screens built by different people at different times drifted apart: slightly different tables, modals, empty states and colours. Fixing a pattern meant finding every copy of it.',
      challenge:
        'Wrap a large UI library without hiding its power, keep the theme in one place across Less and utility classes, and make adoption attractive rather than mandatory.',
      responsibilities: [
        'Defined design tokens (colour, spacing, typography, elevation) as Less variables and mirrored them in Tailwind configuration.',
        'Built shared wrapper components for the most-used patterns: data tables, page headers, filter bars, empty and error states.',
        'Worked with design in Figma to align component variants with what engineering actually shipped.',
      ],
      architecture: [
        'Tokens are the only source of truth; both the Less theme for Ant Design Vue and the Tailwind theme are generated from them.',
        'Wrappers expose a narrow, opinionated API and pass through attributes for escape hatches.',
        'Components ship with usage docs and examples so they are discoverable.',
      ],
      ux: [
        'Consistent focus states, keyboard behaviour and loading states across screens.',
        'Empty and error states became first-class components rather than afterthoughts.',
      ],
      performance: [
        'Shared components are tree-shakeable; unused library modules are not bundled.',
      ],
      outcomes: [
        'New screens inherit consistent behaviour and styling by default.',
        'Pattern fixes land in one place and propagate across the product.',
      ],
    },
  },
]
