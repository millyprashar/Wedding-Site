/** Reset window/document scroll (covers mobile quirks where only one of these updates). */
export function resetDocumentScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  const root = document.scrollingElement
  if (root) root.scrollTop = 0
}

/**
 * iOS often leaves the page offset after the keyboard hides; retry across frames and delays.
 */
export function resetDocumentScrollForMobileKeyboard() {
  resetDocumentScroll()
  requestAnimationFrame(() => {
    resetDocumentScroll()
    requestAnimationFrame(resetDocumentScroll)
  })
  window.setTimeout(resetDocumentScroll, 0)
  window.setTimeout(resetDocumentScroll, 120)
  window.setTimeout(resetDocumentScroll, 320)
}
