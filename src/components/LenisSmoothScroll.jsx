import React, { createContext, useContext, useEffect, useRef } from 'react'
import Lenis from 'lenis'

const LenisContext = createContext(null)

export function useLenis() {
  return useContext(LenisContext)
}

/** Detect touch-capable devices where native scrolling is preferred */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export default function LenisSmoothScroll({ children }) {
  const leniRef = useRef(null)

  useEffect(() => {
    // Skip Lenis on touch devices — native momentum scrolling is smoother
    if (isTouchDevice()) {
      document.documentElement.style.overflowY = 'auto'
      return
    }

    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 1,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    leniRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      leniRef.current = null
    }
  }, [])

  return (
    <LenisContext.Provider value={leniRef}>
      {children}
    </LenisContext.Provider>
  )
}
