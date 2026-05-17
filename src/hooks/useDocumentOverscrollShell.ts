import { useEffect, useLayoutEffect, type RefObject } from 'react'

function clearOverscrollShell() {
  document.documentElement.removeAttribute('data-overscroll-shell')
}

/** Login / welcome: match chocolate shell during rubber-band scroll. */
export function useLoginDocumentOverscroll(active: boolean) {
  useEffect(() => {
    if (!active) {
      clearOverscrollShell()
      return
    }
    document.documentElement.dataset.overscrollShell = 'login'
    return clearOverscrollShell
  }, [active])
}

/**
 * Reception / Valima: cream when RSVP dominates the viewport, event shell color
 * when editorial details dominate (overscroll otherwise shows body --bg).
 */
export function useEventDocumentOverscroll(
  detailsRef: RefObject<HTMLElement | null>,
  rsvpRef: RefObject<HTMLElement | null>,
  detailsShell: 'prashar' | 'valima' | 'mehndi',
) {
  useLayoutEffect(() => {
    const details = detailsRef.current
    const rsvp = rsvpRef.current
    if (!details || !rsvp) return

    let raf = 0
    let queued = false

    const visibleOverlap = (rect: DOMRect, vh: number) =>
      Math.max(0, Math.min(vh, rect.bottom) - Math.max(0, rect.top))

    const apply = () => {
      const d = detailsRef.current
      const r = rsvpRef.current
      if (!d || !r) return
      const vh = window.innerHeight
      const vd = visibleOverlap(d.getBoundingClientRect(), vh)
      const vr = visibleOverlap(r.getBoundingClientRect(), vh)
      const shell =
        vr >= vd
          ? 'event-rsvp'
          : detailsShell === 'valima'
            ? 'event-valima'
            : detailsShell === 'mehndi'
              ? 'event-mehndi'
              : 'event-prashar'
      document.documentElement.dataset.overscrollShell = shell
    }

    const schedule = () => {
      if (queued) return
      queued = true
      raf = requestAnimationFrame(() => {
        queued = false
        apply()
      })
    }

    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const ro = new ResizeObserver(schedule)
    ro.observe(details)
    ro.observe(rsvp)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro.disconnect()
      clearOverscrollShell()
    }
  }, [detailsRef, rsvpRef, detailsShell])
}
