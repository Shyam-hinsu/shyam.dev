/**
 * Configuration for the multi-cursor "UI agents" animation system.
 * A swarm of simulated cursors inspects, wireframes and builds the page as
 * the visitor scrolls. Purely visual: no network, no AI calls.
 */

/** The five named lead agents (labelled pointers). */
export const LEAD_AGENTS = [
  // Pointers are all ivory; the colour is a small identity dot on the label.
  { id: 'ui', name: 'UI Agent', label: 'UI_Agent_01', color: '#e3323f', speed: 1.0 },
  { id: 'dom', name: 'DOM Layout Agent', label: 'DOM_Layout_02', color: '#8a97b8', speed: 0.9 },
  { id: 'gfx', name: 'Graphics Agent', label: 'Graphics_03', color: '#8fb3a0', speed: 1.12 },
  { id: 'motion', name: 'Motion Agent', label: 'Motion_04', color: '#c9a86a', speed: 1.25 },
  { id: 'state', name: 'State Agent', label: 'State_05', color: '#a68fb3', speed: 0.85 },
]

/** Unlabelled worker cursors cycle through this palette. */
export const WORKER_COLORS = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#c084fc', '#22d3ee', '#fb7185', '#a3e635', '#e2e8f0']

export const CONFIG = {
  // Exactly five cursors, like the reference. Workers are opt-in.
  initialAgents: 5,
  agentsPerSection: 0,
  maxAgents: 5,

  // Build only the registered frames (data-agent-element). Set true to also
  // wireframe every heading, paragraph, tag and button inside them.
  discoverLayers: false,

  // Colours
  wireStroke: 'rgba(243, 241, 236, 0.42)',
  wireFill: 'rgba(243, 241, 236, 0.06)',
  wireFillFrame: 'rgba(243, 241, 236, 0.025)',
  dragColor: '#e3323f',
  handleSize: 4,

  // Cursor physics (durations in ms at 1x speed)
  approachRate: 10,
  maxSpeed: 2600,
  approachMinMs: 110,
  hoverMs: [80, 160],
  pressMs: 90,
  releaseMs: 110,
  dragMs: [480, 820], // frames, images, atomic blocks
  popMs: 240, // leaf layers pop in
  interactStaggerMs: 450,
  idleRadius: 14, // px: idle cursors circle their last position

  // Trails and ripples
  trailLength: 12,
  trailLengthMobile: 6,
  trailLife: 320,
  rippleMs: 380,

  // Reveal
  revealStart: 0.22,
  layerStart: 0.72,
  fadeMs: 360,
  staleTaskMs: 6000,
  offscreenMargin: 0.8,

  // Choreography
  introMs: 1700,
  inspectCooldownMs: 6000, // a built section is re-inspected at most this often
  inspectHoldMs: [520, 900],

  // Multi-window world: idle cursors occasionally wander into another window.
  roamIdleMs: 2500, // idle this long before considering a trip
  roamChance: 0.35, // per idle check (every roamIdleMs)
  roamMaxAway: 2, // at most this many of ours visiting other windows at once
  roamStayMs: [3000, 7000],
  logLength: 6,
  dustCount: 11000, // particles per window at 1440×900, scaled by area (desktop only)
  sectionThreshold: 0.15,
  mobileBreakpoint: 768,
  storageKey: 'agents.prefs.v2',

  /** Elements that count as individual build layers inside a section. */
  layerSelector:
    'h1, h2, h3, h4, p, li, blockquote, img, picture, pre, canvas, dt, dd, label, input, textarea, ' +
    '.btn, .tag, .eyebrow, .diagram, .projects__filter, .project__meta, .project__cta, .project__badge, .demo__opt',
}
