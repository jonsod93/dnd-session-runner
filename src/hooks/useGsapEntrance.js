import { useRef, useEffect } from 'react'
import gsap from 'gsap'

/**
 * Animates an element on mount with a subtle upward drift + fade.
 * Returns a ref to attach to the animated element.
 *
 * @param {object} [opts]
 * @param {number} [opts.y=10]        - Starting Y offset (px)
 * @param {number} [opts.duration=0.25] - Duration in seconds (≤0.3s)
 * @param {string} [opts.ease='power2.out']
 * @param {number} [opts.delay=0]
 */
export function useGsapEntrance(opts = {}) {
  const ref = useRef(null)
  const { y = 10, duration = 0.25, ease = 'power2.out', delay = 0 } = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Set initial state immediately to prevent flash
    gsap.set(el, { opacity: 0, y })

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration,
      ease,
      delay,
    })

    return () => tween.kill()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return ref
}
