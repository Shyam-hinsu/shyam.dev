import { ref, onMounted, onBeforeUnmount } from 'vue'

const query = '(prefers-reduced-motion: reduce)'

/** Reactive flag for the user's reduced-motion preference. */
export function useReducedMotion() {
  const reduced = ref(typeof window !== 'undefined' && window.matchMedia(query).matches)
  let mql
  const onChange = (e) => (reduced.value = e.matches)
  onMounted(() => {
    mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
  })
  onBeforeUnmount(() => mql && mql.removeEventListener('change', onChange))
  return reduced
}
