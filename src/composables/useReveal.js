import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Reveal-on-scroll. Pass a template ref to a root element; every descendant
 * with the `.reveal` class (and the root itself, if it has the class) gets
 * `.is-visible` once it enters the viewport. One shared IntersectionObserver
 * per mount; elements are unobserved as soon as they are revealed.
 */
export function useReveal(rootRef, { rootMargin = '0px 0px -10% 0px', threshold = 0.1 } = {}) {
  let observer

  onMounted(() => {
    const root = rootRef.value
    if (!root) return
    const targets = [root, ...root.querySelectorAll('.reveal')].filter((el) =>
      el.classList.contains('reveal'),
    )
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'))
      return
    }
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin, threshold },
    )
    targets.forEach((el) => observer.observe(el))
  })

  onBeforeUnmount(() => observer && observer.disconnect())
}
