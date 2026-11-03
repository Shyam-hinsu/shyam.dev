/**
 * Technical expertise, grouped by how the technologies are actually used.
 * No percentage bars — each group explains where the skill shows up in real work.
 */
export const skillGroups = [
  {
    id: 'frontend',
    title: 'Frontend',
    blurb: 'The daily toolkit for building enterprise Vue applications.',
    skills: [
      { name: 'Vue.js', note: 'Vue 2 and Vue 3, Options and Composition API, SFC architecture, migration' },
      { name: 'JavaScript', note: 'Modern ES, async patterns, performance-minded code on hot paths' },
      { name: 'HTML5', note: 'Semantic, accessible markup that works for screen readers and keyboards' },
      { name: 'CSS3', note: 'Layout systems, custom properties, responsive and motion design' },
      { name: 'Less', note: 'Theming for Ant Design Vue, token variables shared across modules' },
      { name: 'Tailwind CSS', note: 'Utility-first styling driven by the same design tokens' },
    ],
  },
  {
    id: 'visualization',
    title: 'Visualization',
    blurb: 'Making large, live datasets readable without freezing the browser.',
    skills: [
      { name: 'Highcharts', note: 'Live time-series, in-place updates, shared wrapper layer' },
      { name: 'Cytoscape.js', note: 'Network topology graphs with thousands of nodes' },
      { name: 'D3.js', note: 'Scales, encodings and custom visual helpers' },
      { name: 'Canvas', note: 'Custom rendering when the DOM is too slow' },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture',
    blurb: 'Structure that survives new requirements and bigger datasets.',
    skills: [
      { name: 'Component architecture', note: 'Feature-sliced modules, clear boundaries, composables over mixins' },
      { name: 'State management', note: 'Store modules, normalised view models, URL-restorable state' },
      { name: 'Web Workers', note: 'Off-main-thread layout, aggregation and diffing with transferable buffers' },
      { name: 'Performance optimization', note: 'Profiling, virtualisation, scoped reactivity, batched rendering' },
      { name: 'REST API integration', note: 'Adapters that isolate components from backend shapes' },
    ],
  },
  {
    id: 'tools',
    title: 'Tools',
    blurb: 'Build, ship and collaborate.',
    skills: [
      { name: 'Webpack', note: 'Code splitting, build pipelines for large apps' },
      { name: 'Vite', note: 'This site is built with it' },
      { name: 'Git', note: 'Branching strategies, reviewable commits' },
      { name: 'Azure DevOps', note: 'Pipelines, boards and pull-request workflows' },
      { name: 'Figma', note: 'Working with designers on tokens and component variants' },
    ],
  },
  {
    id: 'ai',
    title: 'AI-assisted development',
    blurb: 'Using AI tools deliberately: faster scaffolding, better reviews, same engineering standards.',
    skills: [
      { name: 'Claude Code', note: 'Agentic workflows for refactors, migrations and documentation' },
      { name: 'Cursor', note: 'In-editor assistance for everyday implementation' },
      { name: 'Automated code review', note: 'AI-assisted review passes before human review' },
      { name: 'AI-assisted workflows', note: 'Prompting, verification and keeping humans accountable for the result' },
    ],
  },
]
