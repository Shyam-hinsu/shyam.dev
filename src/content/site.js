/**
 * Central site configuration.
 *
 * Every piece of personal information lives in src/content/*. Nothing in the
 * components is hard-coded. Fields left empty ('') are hidden in the UI rather
 * than shown as fake data — fill them in to switch the feature on.
 *
 * Fields flagged  // TODO  are placeholders that still need your real values.
 */
export const site = {
  name: 'Shyam Hinsu',
  firstName: 'Shyam',
  initials: 'SH',
  title: 'Frontend Engineer',
  tagline: 'Vue.js · Data visualization · Frontend architecture',
  yearsOfExperience: '4',
  location: '', // TODO e.g. 'Ahmedabad, India' — leave empty to hide
  url: 'https://shyam-hinsu.github.io/shyam.dev/', // TODO change if you use a custom domain
  description:
    'Shyam Hinsu is a frontend engineer with about four years of experience building enterprise Vue.js applications: monitoring platforms, network topology visualization, real-time dashboards and design systems.',
  ogImage: '/images/og.png',

  // Contact ---------------------------------------------------------------
  email: '', // TODO your professional email — the contact section hides the email card until set
  links: {
    github: 'https://github.com/Shyam-hinsu',
    linkedin: '', // TODO e.g. 'https://www.linkedin.com/in/your-handle' — hidden until set
  },

  // Resume: place a PDF at public/resume/Shyam-Hinsu-Resume.pdf and set the path here.
  resumeUrl: '', // TODO '/resume/Shyam-Hinsu-Resume.pdf' — the download buttons hide until set

  // Availability pill in the navigation. Only shown when `show` is true.
  availability: {
    show: false, // TODO set true only if accurate
    label: 'Open to new opportunities',
  },

  // Contact form. The form only renders if an endpoint or an email exists.
  // Option A: a form backend such as Formspree/Basin/Getform — paste the POST URL.
  // Option B: leave empty; the form falls back to composing an email via mailto:.
  contactForm: {
    endpoint: '', // TODO e.g. 'https://formspree.io/f/xxxxxxx'
  },
}

export const nav = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'showcase', label: 'Engineering' },
  { id: 'expertise', label: 'Expertise' },
  { id: 'experience', label: 'Experience' },
  { id: 'philosophy', label: 'Approach' },
  { id: 'contact', label: 'Contact' },
]

export const hero = {
  eyebrow: `Frontend Engineer · ~${site.yearsOfExperience} years`,
  // Words wrapped in <em> render in italic crimson.
  headline: 'I build <em>complex</em> frontends that stay fast, clear and maintainable.',
  intro:
    'Vue.js engineer with about four years in enterprise software. I turn dense, data-heavy requirements, from network topologies with thousands of nodes to real-time monitoring dashboards, into interfaces people can actually use.',
  specialization: ['Vue 2 & 3', 'JavaScript', 'Data visualization', 'Web Workers', 'Design systems'],
  primaryCta: { label: 'Explore my work', href: '#projects' },
}

export const about = {
  eyebrow: 'About',
  title: 'Engineering beyond the <em>component</em>.',
  paragraphs: [
    'I am a frontend engineer who gravitates towards the hard parts of a product: the screens with too much data, the flows with too many states, the codebases that have grown faster than their structure.',
    'Most of my work has been on enterprise applications built with Vue.js. Monitoring platforms, topology explorers and dashboard suites where correctness, performance and long-term maintainability matter more than novelty.',
    'I care about architecture: component boundaries that survive new requirements, state that is easy to reason about, and rendering paths that stay smooth when the dataset is ten times larger than the demo.',
    'I work closely with designers, backend engineers and product owners. The best interfaces I have shipped came from agreeing on the data contract and the interaction model early, then iterating on the details together.',
  ],
  facts: [
    { label: 'Focus', value: 'Enterprise Vue.js applications' },
    { label: 'Strengths', value: 'Architecture, visualization, performance' },
    { label: 'Currently', value: 'Vue 3, Composition API, AI-assisted workflows' },
  ],
}
