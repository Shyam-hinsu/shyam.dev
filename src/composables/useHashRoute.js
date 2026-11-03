import { ref, onMounted, onBeforeUnmount } from 'vue'

const PREFIX = '#project/'

/**
 * Minimal deep-linking for project case studies without a router:
 * `#project/<slug>` opens a case study; clearing the hash closes it.
 */
export function useHashRoute() {
  const slug = ref(readSlug())

  function readSlug() {
    const h = typeof window !== 'undefined' ? window.location.hash : ''
    return h.startsWith(PREFIX) ? decodeURIComponent(h.slice(PREFIX.length)) : ''
  }

  function open(nextSlug) {
    if (slug.value === nextSlug) return
    history.pushState({ project: nextSlug }, '', PREFIX + encodeURIComponent(nextSlug))
    slug.value = nextSlug
  }

  function close() {
    if (!slug.value) return
    slug.value = ''
    if (window.location.hash.startsWith(PREFIX)) {
      history.pushState({ project: null }, '', window.location.pathname + window.location.search + '#projects')
    }
  }

  const onPop = () => (slug.value = readSlug())
  onMounted(() => window.addEventListener('popstate', onPop))
  onBeforeUnmount(() => window.removeEventListener('popstate', onPop))

  return { slug, open, close }
}
