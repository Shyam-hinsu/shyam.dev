/**
 * Configuration for the multi-cursor "UI agents" animation system.
 * Five simulated cursors inspect, select and drag-open registered elements
 * as the visitor scrolls. They are purely visual — no network, no AI calls.
 */
export const AGENT_DEFS = [
  { id: 'ui', name: 'UI Agent', label: 'UI', color: '#3b82f6', speed: 1.0, home: [0.42, 0.4] },
  { id: 'dom', name: 'DOM Layout Agent', label: 'DOM', color: '#ef4444', speed: 0.88, home: [0.36, 0.56] },
  { id: 'gfx', name: 'Graphics Agent', label: 'GFX', color: '#10b981', speed: 1.12, home: [0.52, 0.64] },
  { id: 'motion', name: 'Motion Agent', label: 'MOTION', color: '#f59e0b', speed: 1.28, home: [0.62, 0.42] },
  { id: 'state', name: 'State Agent', label: 'STATE', color: '#a855f7', speed: 0.8, home: [0.68, 0.58] },
]

export const CONFIG = {
  selectionColor: '#3b82f6',
  dragColor: '#ff1e42',
  handleSize: 5,

  // Cursor physics
  approachRate: 9, // exponential approach per second (× agent speed)
  maxSpeed: 2200, // px/s cap (× agent speed)
  approachMinMs: 160,
  hoverMs: [90, 180],
  pressMs: 90,
  releaseMs: 120,
  dragMs: [360, 640],
  idleDrift: 9, // px amplitude of idle wandering
  idleRate: 0.35, // cycles per second

  // Trails and ripples
  trailLength: 16,
  trailLife: 380,
  trailLengthMobile: 8,
  rippleMs: 420,

  // Element reveal
  revealStart: { hero: 0.55, default: 0.16 },
  fadeMs: 420,
  staleTaskMs: 7000, // safety: force-build anything stuck this long
  offscreenMargin: 1.2, // viewport heights; sections this far away are built instantly

  sectionThreshold: 0.18,
  mobileBreakpoint: 768,
  storageKey: 'agents.prefs.v1',
}
