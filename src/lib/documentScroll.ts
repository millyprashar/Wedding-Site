/** Reset window/document scroll (covers mobile quirks where only one of these updates). */
export function resetDocumentScroll() {
  const root = document.scrollingElement
  if (root) root.scrollTop = 0

  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0

  const app = document.getElementById('root')
  if (app) (app as HTMLElement).scrollTop = 0

  window.scrollTo(0, 0)
}

/**
 * Use after React Router navigates. Single pass + one rAF — avoids `scrollTo(0,1)` and
 * long timeouts that fight the user’s first scroll on long pages (e.g. event RSVP).
 */
export function resetScrollAfterRouteChange() {
  resetDocumentScroll()
  requestAnimationFrame(() => {
    resetDocumentScroll()
  })
}

/**
 * After the soft keyboard closes — light retries only (no scrollTo 0,1 loop).
 * Avoid firing while focus moves between controls in the same form (see LoginPage blur guard).
 */
export function resetDocumentScrollForMobileKeyboard() {
  resetDocumentScroll()
  requestAnimationFrame(() => {
    resetDocumentScroll()
    syncVisualViewportScrollIfNeeded()
  })
  window.setTimeout(resetDocumentScroll, 90)
  window.setTimeout(() => {
    resetDocumentScroll()
    syncVisualViewportScrollIfNeeded()
  }, 280)
}

/** When the visual viewport moves (e.g. keyboard closes), scroll the layout viewport back to origin. */
export function syncVisualViewportScrollIfNeeded() {
  const vv = window.visualViewport
  if (!vv) return
  if (vv.offsetTop !== 0 || vv.offsetLeft !== 0) {
    window.scrollBy(vv.offsetLeft, vv.offsetTop)
  }
}

type ViewportCleanup = () => void

/**
 * Fire when the on-screen keyboard is likely dismissed (visual viewport grows toward full layout height).
 */
export function onVisualViewportChangeForScroll(
  callback: () => void,
): ViewportCleanup {
  const vv = window.visualViewport
  if (!vv) return () => {}

  let prevH = vv.height

  const run = () => {
    callback()
  }

  const onResize = () => {
    const h = vv.height
    const inner = window.innerHeight
    const wasKeyboardLikely = prevH < inner * 0.82
    const keyboardLikelyGone = h >= inner * 0.88
    prevH = h
    if (wasKeyboardLikely && keyboardLikelyGone) {
      run()
      window.setTimeout(run, 100)
      window.setTimeout(run, 400)
    }
  }

  vv.addEventListener('resize', onResize, { passive: true })
  return () => {
    vv.removeEventListener('resize', onResize)
  }
}
