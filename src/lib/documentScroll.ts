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
 * WebKit mobile often keeps a stale offset after the keyboard: nudge then zero.
 */
function resetDocumentScrollWebKitNudge() {
  resetDocumentScroll()
  window.scrollTo(0, 1)
  resetDocumentScroll()
}

/**
 * iOS / mobile soft keyboard: aggressive retries + WebKit nudge. Only for login / field blur —
 * not for route changes (conflicts with normal scrolling on event pages).
 */
export function resetDocumentScrollForMobileKeyboard() {
  resetDocumentScrollWebKitNudge()
  requestAnimationFrame(() => {
    resetDocumentScrollWebKitNudge()
    requestAnimationFrame(() => {
      resetDocumentScrollWebKitNudge()
      syncVisualViewportScrollIfNeeded()
    })
  })
  window.setTimeout(() => resetDocumentScrollWebKitNudge(), 0)
  window.setTimeout(() => resetDocumentScrollWebKitNudge(), 100)
  window.setTimeout(() => resetDocumentScrollWebKitNudge(), 280)
  window.setTimeout(() => resetDocumentScrollWebKitNudge(), 450)
  window.setTimeout(() => resetDocumentScrollWebKitNudge(), 600)
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

  const onVVScroll = () => syncVisualViewportScrollIfNeeded()

  vv.addEventListener('resize', onResize, { passive: true })
  vv.addEventListener('scroll', onVVScroll, { passive: true })
  return () => {
    vv.removeEventListener('resize', onResize)
    vv.removeEventListener('scroll', onVVScroll)
  }
}
