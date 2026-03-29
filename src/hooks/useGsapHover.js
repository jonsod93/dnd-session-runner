import { useEffect } from 'react'
import gsap from 'gsap'

// Selectors for interactive elements that get ambient hover/focus polish
const BUTTON_SELECTOR = '.btn-neon-gold, .btn-outline, .btn-action'
const CARD_SELECTOR = '.combat-card, .library-card, .stat-card, .condition-badge'
const INPUT_SELECTOR = '.input-field, textarea.input-field'

const ALL_HOVER = [BUTTON_SELECTOR, CARD_SELECTOR].join(', ')

/**
 * Attaches GSAP-powered hover and focus micro-interactions to all
 * interactive elements inside a container via event delegation.
 * No component changes required — just call once at the app root.
 *
 * @param {React.RefObject} containerRef - ref to the outermost DOM node
 */
export function useGsapHover(containerRef) {
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    // Track active tweens so we can kill them on pointerleave/blur
    const activeTweens = new WeakMap()

    // ── Hover: buttons & cards ────────────────────────────
    const handlePointerEnter = (e) => {
      const el = e.target.closest(ALL_HOVER)
      if (!el || !root.contains(el)) return

      // Don't animate elements inside a drag handle or during drag
      if (el.hasAttribute('data-no-gsap')) return

      // Kill any in-flight tween on this element
      activeTweens.get(el)?.kill()

      const isCard = el.matches(CARD_SELECTOR)
      const tween = gsap.to(el, {
        scale: isCard ? 1.008 : 1.04,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      activeTweens.set(el, tween)
    }

    const handlePointerLeave = (e) => {
      const el = e.target.closest(ALL_HOVER)
      if (!el || !root.contains(el)) return

      activeTweens.get(el)?.kill()

      const tween = gsap.to(el, {
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      activeTweens.set(el, tween)
    }

    // ── Focus: inputs ──────────────────────────────────────
    const handleFocusIn = (e) => {
      const el = e.target.closest(INPUT_SELECTOR)
      if (!el || !root.contains(el)) return

      activeTweens.get(el)?.kill()

      const tween = gsap.to(el, {
        scale: 1.01,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      activeTweens.set(el, tween)
    }

    const handleFocusOut = (e) => {
      const el = e.target.closest(INPUT_SELECTOR)
      if (!el || !root.contains(el)) return

      activeTweens.get(el)?.kill()

      const tween = gsap.to(el, {
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: 'auto',
      })

      activeTweens.set(el, tween)
    }

    root.addEventListener('pointerenter', handlePointerEnter, true)
    root.addEventListener('pointerleave', handlePointerLeave, true)
    root.addEventListener('focusin', handleFocusIn, true)
    root.addEventListener('focusout', handleFocusOut, true)

    return () => {
      root.removeEventListener('pointerenter', handlePointerEnter, true)
      root.removeEventListener('pointerleave', handlePointerLeave, true)
      root.removeEventListener('focusin', handleFocusIn, true)
      root.removeEventListener('focusout', handleFocusOut, true)
    }
  }, [containerRef])
}
