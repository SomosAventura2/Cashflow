/**
 * Mitigaciones iOS Safari / PWA: pinch-zoom y zoom por gestos
 * cuando el meta viewport no basta (especialmente en modo standalone).
 */
export function initIosPwaLocks() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const root = document.documentElement

  const onGestureStart = (e) => {
    e.preventDefault()
  }

  /** Pinch con trackpad (Chrome) / algunos gestos de zoom */
  const onWheel = (e) => {
    if (e.ctrlKey) e.preventDefault()
  }

  root.addEventListener('gesturestart', onGestureStart, { passive: false })
  root.addEventListener('gesturechange', onGestureStart, { passive: false })
  root.addEventListener('gestureend', onGestureStart, { passive: false })
  window.addEventListener('wheel', onWheel, { passive: false })
}
