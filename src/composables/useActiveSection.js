import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Tracks which page section is currently in view for the navigation indicator.
 * Uses one IntersectionObserver with a band in the upper part of the viewport.
 */
export function useActiveSection(ids) {
  const active = ref('')
  let observer

  onMounted(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (!sections.length || !('IntersectionObserver' in window)) return
    const ratios = new Map()
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0)
        let best = ''
        let bestRatio = 0
        for (const [id, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r
            best = id
          }
        }
        active.value = best
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    )
    sections.forEach((s) => observer.observe(s))
  })

  onBeforeUnmount(() => observer && observer.disconnect())
  return active
}
