/**
 * Professional experience.
 *
 * TODO Replace the placeholder company, period and location with real values.
 * Entries with `placeholder: true` render a visible "placeholder" badge so
 * they cannot be mistaken for real data. Remove the flag once updated.
 */
export const experience = [
  {
    placeholder: true,
    company: 'Company name', // TODO
    role: 'Frontend Developer',
    period: 'Start year — Present', // TODO e.g. '2022 — Present'
    location: '', // TODO optional
    summary:
      'Frontend engineer on enterprise monitoring and network management products built with Vue.js.',
    highlights: [
      'Built and maintained feature modules for a large enterprise Vue application: monitoring dashboards, alarm management and topology views.',
      'Delivered complex data visualization with Highcharts, Cytoscape.js and D3.js, moving heavy computation into Web Workers.',
      'Led frontend work on the Vue 2 to Vue 3 migration, replacing mixins with composables and modernising the build.',
      'Established shared components and design tokens on top of Ant Design Vue with Less and Tailwind CSS.',
      'Collaborated with designers, backend engineers and product owners; shipped through Azure DevOps pipelines.',
    ],
    stack: ['Vue.js', 'JavaScript', 'Highcharts', 'Cytoscape.js', 'Web Workers', 'Less', 'Tailwind CSS', 'Webpack', 'Azure DevOps'],
  },
  // Add earlier roles here, most recent first.
]
