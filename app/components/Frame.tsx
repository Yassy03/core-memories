'use client'

import { useEffect, useState } from 'react'

// Shared landing-style "bubble frame" overlay — a white rounded-rect frame that wraps the
// viewport with the outer perimeter extending off-screen, plus an SVG shading overlay that
// paints a tube-cross-section dark/bright/dark gradient onto the frame ring (dark at outer
// edge, bright in middle, dark at inner edge). Used by the landing page and the collective-
// album (library) page so both share the same visual chrome.
//
// IMPORTANT: any pages that use this need to position their interactive elements (BackButtons,
// hints, etc.) inside the frame's hollow area — the frame visually fills the outer ~75px
// of the viewport on top/bottom and ~6vh on the sides. Anything at < ~80px from a viewport
// edge will sit on top of (or under) the frame ring.

export function Frame() {
  return (
    <>
      {/* The white frame surface — a transparent rounded rect with a massive 100vmax white
          box-shadow extending outward so the outer perimeter is off-screen and only the
          rounded INNER edge is visible. */}
      <div style={{
        position: 'fixed',
        // All four insets at 6vh / 6% so the frame's visible width is uniform on every side.
        // Pages that use <Frame /> need top-aligned content to start below ~6vh so it isn't
        // covered by the frame's top band.
        top: '6vh',
        left: '6vh',
        right: '6vh',
        bottom: '6%',
        borderRadius: '60px',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 5,
        boxShadow: [
          '0 0 0 100vmax #ffffff',
          'inset 0 0 0 1.5px rgba(255,255,255,1)',
          'inset 0 0 0 3px rgba(0,0,0,0.08)',
        ].join(','),
      }} />
      <FrameSurfaceShading />
    </>
  )
}

// SVG overlay that paints the dark/bright/dark tube-cross-section shading onto the white
// frame ring only. See Frame() above for the design rationale. The mask is sized to the exact
// CSS frame position (top/left/right: 6vh, bottom: 6%, radius: 60px) via JS-measured
// viewport pixels — SVG attributes can't natively use the mixed % / vh units the CSS uses.
function FrameSurfaceShading() {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  if (size.w === 0) return null

  const sideInset = 0.06 * size.h    // 6vh
  const topInset = 0.06 * size.h     // 6vh (matches sides for uniform visible width)
  const bottomInset = 0.06 * size.h  // 6% of viewport height ≈ 6vh
  const radius = 60                  // matches borderRadius: '60px'
  const holeX = sideInset
  const holeY = topInset
  const holeW = size.w - 2 * sideInset
  const holeH = size.h - topInset - bottomInset

  // Narrow stroke + heavy blur — the blur becomes the dominant effect, turning each dark
  // edge band into a smooth gradient that fades naturally into the bright middle, instead
  // of a uniform-dark block with soft edges.
  const edgeStroke = 18
  const blurAmount = 28
  const strokeColor = 'rgba(0,0,0,0.26)'

  return (
    <svg
      width={size.w}
      height={size.h}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 6 }}
    >
      <defs>
        <filter id="ringBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={blurAmount} />
        </filter>
        <mask id="frameRingMask">
          <rect width={size.w} height={size.h} fill="white" />
          <rect x={holeX} y={holeY} width={holeW} height={holeH} rx={radius} ry={radius} fill="black" />
        </mask>
      </defs>

      {/* Inner-edge dark band — stroke just outside the hole, fading outward into the frame. */}
      <rect
        x={holeX} y={holeY}
        width={holeW} height={holeH}
        rx={radius} ry={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={edgeStroke}
        mask="url(#frameRingMask)"
        filter="url(#ringBlur)"
      />

      {/* Outer-edge dark band — stroke just inside the viewport, fading inward into the frame. */}
      <rect
        x={0} y={0}
        width={size.w} height={size.h}
        fill="none"
        stroke={strokeColor}
        strokeWidth={edgeStroke}
        mask="url(#frameRingMask)"
        filter="url(#ringBlur)"
      />
    </svg>
  )
}
