'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera, Environment, Html } from '@react-three/drei'
import { useRouter, useSearchParams } from 'next/navigation'
import * as THREE from 'three'
import { BinderRings, BookGroup, CoverOverlay } from '../components/BookComponents'
import { ESSAY } from './essay'

// Fixed tint for the comparative-study cover. Same paper-textured MeshPhysicalMaterial
// the rest of the albums use — only the colour token changes. Adjust to taste; any
// hex compatible with CoverOverlay's tintHex prop works.
const TINT = '#A0D2DB'

// Shifts the entire album scene (cover + rings + title + leaf + shadow) along x.
// Default −2.6 lines the inner leaf up with the screen centre and pushes the
// flipped-open front cover partially off the left edge of the viewport. Bumping
// this toward 0 brings the spine back to the middle; making it more negative
// continues sliding everything left.
const SCENE_X_OFFSET = -2.6

// Signals when the inner Canvas Suspense has actually resolved (textures + HDR loaded).
// Mounts only once Suspense unfreezes, so the parent can hold the white-sheet overlay
// up until the 3D scene is genuinely ready — same pattern as /library to avoid the
// "blank scene flashes through the fade" glitch.
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

// Parses "#rrggbb" into r/g/b so we can re-emit it as rgba(...) with a custom
// alpha for the tinted-plastic back button — same helper /library uses.
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

// Tinted-plastic back button — visually identical to the /library one, only
// pinned to top-right instead of top-left per the design.
function BackButton({ tintColor, onClick, hidden }: { tintColor: string; onClick: () => void; hidden?: boolean }) {
  const [r, g, b] = parseHex(tintColor)
  const tintFill = `rgba(${r}, ${g}, ${b}, 0.4)`
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const scale = pressed ? 0.96 : hovered ? 1.08 : 1
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        // Mirrored to right:24px so it lives in the opposite corner from /library.
        position: 'fixed', top: '24px', right: '24px', zIndex: 100,
        width: '80px', height: '52px',
        borderRadius: '14px',
        cursor: 'pointer',
        background: tintFill,
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        boxShadow: [
          hovered ? '0 10px 26px -2px rgba(0,0,0,0.34)' : '0 6px 18px -2px rgba(0,0,0,0.28)',
          'inset 0 2px 3px 1px rgba(0,0,0,0.22)',
          'inset -8px -6px 12px 1px rgba(255,255,255,0.55)',
          'inset 0 0 0 0.5px rgba(255,255,255,1)',
        ].join(', '),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hidden ? 0 : 1,
        transform: `scale(${scale})`,
        transition: 'opacity 1.2s ease, transform 220ms cubic-bezier(0.34, 1.5, 0.64, 1), box-shadow 220ms ease',
      }}
    >
      <svg
        width="44" height="28" viewBox="0 0 34 22"
        fill="none"
        style={{ filter: 'drop-shadow(0 2px 0 rgba(255,255,255,1)) drop-shadow(0 3px 4px rgba(255,255,255,0.9))' }}
      >
        <path
          d="M11 4 L4 11 L11 18 M4 11 L30 11"
          stroke="rgba(0,0,0,0.32)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// Soft drop shadow under the open album — same canvas-radial-gradient recipe the
// landing page uses for its closed albums, only without the sway animation since the
// open book sits still. Sized for the open spread (~12 units wide).
function AlbumDropShadow({ position = [0, -3.4, -0.5] as [number, number, number] }) {
  const shadowTex = useMemo(() => {
    const size = 489
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(0,0,0,0.30)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])

  return (
    <mesh position={position} raycast={() => null}>
      <planeGeometry args={[15, 2.2]} />
      <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
    </mesh>
  )
}

function ComparativeStudyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?bg=... is forwarded by the landing page so this route renders the SAME
  // blurred thumbnail backdrop the user just saw — no second fetch, no swap.
  // Null if the page was loaded directly without coming from the landing page.
  const backgroundUrl = searchParams.get('bg')
  // Continuous white-sheet transition with the landing page. The sheet stays
  // opaque until SceneReadySignal fires (= Canvas Suspense has resolved its
  // textures/HDR), so the user never sees a half-loaded scene through the fade.
  const [sceneReady, setSceneReady] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  // 5s safety timeout — force-lifts the white sheet if SceneReadySignal never fires (asset
  // 404, network hang). Stuck-on-white is worse than partial content.
  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  function handleBack() {
    if (fadingOut) return
    setFadingOut(true)
    setTimeout(() => router.push('/'), 1200)
  }

  return (
    <>
      <link rel="stylesheet" href="https://use.typekit.net/aex0tjt.css" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #d5d5d7; }
        /* Same local font the landing-page album title uses. */
        @font-face { font-family: 'BitcountGridSingle_Roman-Medium'; src: url('/fonts/BitcountGridSingle_Roman-Medium.ttf') format('truetype'); }

        /* Scroll thumb — same tinted-plastic recipe as the BackButton, scaled
           down to a thin pill. Track stays transparent so it doesn't show
           against the wallpaper. Hardcoded rgb(160,210,219) matches TINT. */
        .essay-scroll::-webkit-scrollbar { width: 10px; }
        .essay-scroll::-webkit-scrollbar-track { background: transparent; margin: 6px 0; }
        .essay-scroll::-webkit-scrollbar-thumb {
          background: rgba(160, 210, 219, 0.45);
          border-radius: 6px;
          /* Same layered stack BackButton uses (drop + top-edge depth + bottom-right gloss + white inset stroke). */
          box-shadow:
            0 2px 5px rgba(0,0,0,0.22),
            inset 0 1px 1.5px rgba(0,0,0,0.22),
            inset -2px -2px 4px rgba(255,255,255,0.6),
            inset 0 0 0 0.5px rgba(255,255,255,1);
        }
        .essay-scroll::-webkit-scrollbar-thumb:hover { background: rgba(160, 210, 219, 0.6); }
      `}</style>

      {/* Blurred-thumbnail backdrop — same recipe as the landing page, only the
          source URL is forwarded via ?bg= rather than fetched again. Sits at
          zIndex 0 behind the canvas and the white sheet. */}
      {backgroundUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
          <img
            src={backgroundUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(40px) brightness(1) saturate(0.75)',
              transform: 'scale(1.12)',
              opacity: 0.55,
              maskImage: 'linear-gradient(180deg, black 0%, black 60%, rgba(0,0,0,0.35) 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 60%, rgba(0,0,0,0.35) 100%)',
            }}
          />
        </div>
      )}

      {/* White-sheet transition overlay — opaque until SceneReadySignal fires
          (Canvas Suspense resolved) AND we're not in the middle of a fade-out
          back to the landing page. Fades over 1.2s, same duration as the
          landing-page sheet, so the seam feels continuous. */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#ffffff',
          zIndex: 100,
          pointerEvents: !sceneReady || fadingOut ? 'auto' : 'none',
          opacity: !sceneReady || fadingOut ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* 3D scene — open album cover filling the viewport. The cover, rings, and
          tint exactly mirror the landing-page album. The two inner leaves are
          rendered as <Html transform> overlays so the essay can use native CSS
          overflow scrolling. */}
      <div style={{ position: 'fixed', inset: 0 }}>
        <Canvas gl={{ alpha: true }}>
          <Suspense fallback={null}>
            {/* Mounts the moment textures/HDR finish loading — flips sceneReady
                true, which then releases the white sheet to fade out. */}
            <SceneReadySignal onReady={() => setSceneReady(true)} />
            <OrthographicCamera
              makeDefault
              zoom={150}
              position={[0, 0, 10]}
              near={0.01}
              far={100}
            />
            <ambientLight intensity={0.65} />
            <directionalLight position={[3, 5, 3]} intensity={1.2} />
            <pointLight position={[-2, 2, 4]} intensity={0.4} color="#fff8f0" />
            <Environment preset="studio" />

            {/* Outer offset group — drop shadow + BookGroup + every child of
                BookGroup (cover, rings, title, leaf) all slide together by
                SCENE_X_OFFSET so the inner leaf centres on the viewport while
                the front cover clips off the left edge. */}
            <group position={[SCENE_X_OFFSET, 0, 0]}>
              {/* Drop shadow sits behind the book on z, below it on y. */}
              <AlbumDropShadow />

              {/* isOpen=true keeps the cover laid flat. currentLeafIndex must be > 0
                  so CoverOverlay flips the front cover open (rotation -PI). pageCount
                  is small because we only have the two static inner leaves. */}
              <BookGroup isOpen={true}>
              <CoverOverlay
                currentLeafIndex={1}
                tintHex={TINT}
                showGhost={false}
                pageCount={2}
              />
              <BinderRings />

              {/* Title on the flipped-open front cover. Rendered with the same
                  <Html transform distanceFactor={4}> recipe BookComponents' Page
                  uses for the landing-page album title, so the 55px CSS scales to
                  the same on-cover size as the landing page.

                  Y-rotation of −π places this in the same coordinate frame as the
                  flipped front cover: from the camera the title reads mirrored
                  (the desired "back of the cover" effect) without a CSS scaleX
                  hack. Local +1.55 → world −1.55 after the rotation, so the title
                  centers on the left half of the open spread. If the cover ever
                  animates open from a closed state, drive this group's rotation
                  with the same lerp as CoverOverlay's internal rotation. */}
              <group rotation={[0, -Math.PI, 0]}>
                <Html
                  transform
                  distanceFactor={4}
                  position={[3.5, 0.2, -0.05]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      fontFamily: "'coral-pixels', sans-serif",
                      fontWeight: 600,
                      fontSize: '75px',
                      textAlign: 'center',
                      width: '320px',
                      color: 'rgba(110, 108, 106, 0.5)',
                      textShadow:
                        '0px -2px 2px rgba(0,0,0,0.2), 0px 3px 5px rgba(255,255,255,1), 0px 5px 10px rgba(255,255,255,0.8)',
                      lineHeight: 1.05,
                      letterSpacing: '0.01em',
                    }}
                  >
                    A critical study
                  </div>
                </Html>
              </group>

              {/* RIGHT LEAF — wallpaper-textured paper sitting on the right half
                  of the open spread (over the back cover). Stadium hole cutouts
                  remain on the SVG's right edge per the design — the leaf reads
                  as a flipped page where the binding hardware visually sits on
                  the outer right. The underlying 3D rings show through the
                  transparent SVG holes because <Html transform> renders the
                  paper as actual DOM, not a canvas texture. */}
              <Html
                transform
                distanceFactor={4}
                position={[2.9, 0, 0.06]}
                style={{ pointerEvents: 'auto' }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 540,
                    height: 600,
                  }}
                >
                  {/* Base paper: wallpaper-textured rectangle with keyhole-shaped
                      cutouts at each ring position. */}
                  <svg
                    width="540"
                    height="600"
                    viewBox="0 0 540 600"
                    style={{
                      display: 'block',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
                    }}
                  >
                    <defs>
                      <mask id="leafHoles">
                        {/* White = visible; black = punched out. Each ring gets a
                            "keyhole" cut: the circle (matching the 3D Page geometry
                            — `absarc(-2.85, y, 0.12)`) lets the ring thread through,
                            and the small rectangle that follows extends the cut to
                            the SVG's left (spine) edge so the ring's top half — the
                            part that visually sits ON TOP of the paper between the
                            spine and the threading point — is not occluded by the
                            paper's DOM stacking. */}
                        <rect width="520" height="600" fill="white" />

                        <circle cx="15" cy="100" r="12" fill="black" />
                        <rect x="0" y="96" width="10" height="7" fill="black" />

                        <circle cx="15" cy="160" r="12" fill="black" />
                        <rect x="0" y="156" width="15" height="7" fill="black" />

                        <circle cx="15" cy="440" r="12" fill="black" />
                        <rect x="0" y="436" width="15" height="7" fill="black" />

                        <circle cx="15" cy="500" r="12" fill="black" />
                        <rect x="0" y="496" width="15" height="7" fill="black" />
                      </mask>
                    </defs>
                    <image
                      href="/placeholders/wallpaper.png"
                      width="540"
                      height="600"
                      preserveAspectRatio="xMidYMid slice"
                      mask="url(#leafHoles)"
                    />
                  </svg>

                  {/* Outer-edge soft shadow + highlight on the RIGHT (page's free
                      edge). Gradient runs from dark at the outer edge → fade →
                      white highlight inside → fade. Same recipe the library
                      leaves use, no top/bottom inset because our leaf has square
                      corners. */}
                  <div
                    style={{
                      position: 'absolute',
                      // Anchored away from the right edge by 8% so the dark/highlight
                      // band sits further into the page (it used to hug right:0).
                      right: '3.7%',
                      top: 0,
                      bottom: 0,
                      width: '18%',
                      pointerEvents: 'none',
                      background:
                        'linear-gradient(to left,' +
                        ' rgba(0,0,0,0.14) 0%,' +
                        ' rgba(0,0,0,0.07) 28%,' +
                        ' rgba(0,0,0,0) 55%,' +
                        ' rgba(255,255,255,0.18) 75%,' +
                        ' rgba(255,255,255,0) 100%)',
                    }}
                  />

                  {/* Spine-side gutter shadow + paper-rise highlight on the LEFT
                      (binder edge). Same gradient stops as the library version.
                      mask-image punches the four binder-hole positions out so the
                      gradient doesn't paint over the ring cutouts. The radial-
                      gradient centres are at 10% horizontal within this 28%-wide
                      strip, which corresponds to the holes' SVG cx=15. Y values
                      (16%/26%/74%/84%) match the four ring positions. */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '28%',
                      pointerEvents: 'none',
                      background:
                        'linear-gradient(to right,' +
                        ' rgba(0,0,0,0.22) 0%,' +
                        ' rgba(0,0,0,0.12) 18%,' +
                        ' rgba(0,0,0,0) 42%,' +
                        ' rgba(255,255,255,0.28) 64%,' +
                        ' rgba(255,255,255,0) 100%)',
                      maskImage:
                        // Circles — the ring threading holes.
                        'radial-gradient(circle 12px at 10% 16.7%, transparent 99%, black 100%),' +
                        'radial-gradient(circle 12px at 10% 26.7%, transparent 99%, black 100%),' +
                        'radial-gradient(circle 12px at 10% 73.3%, transparent 99%, black 100%),' +
                        'radial-gradient(circle 12px at 10% 83.3%, transparent 99%, black 100%),' +
                        // Ellipses — the keyhole stems. Each one matches the page
                        // SVG's rect (x=0 → width, y=cy±3.5) so the shadow stops
                        // painting through the slit and the rings read as sitting
                        // on top of the shadow.
                        'radial-gradient(ellipse 5px 3.5px at 5px 100px, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 7.5px 3.5px at 7.5px 160px, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 7.5px 3.5px at 7.5px 440px, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 7.5px 3.5px at 7.5px 500px, transparent 99%, black 100%)',
                      maskComposite: 'intersect',
                      WebkitMaskImage:
                        'radial-gradient(circle 12px at 10% 16.7%, transparent 99%, black 100%),' +
                        'radial-gradient(circle 12px at 10% 26.7%, transparent 99%, black 100%),' +
                        'radial-gradient(circle 12px at 10% 73.3%, transparent 99%, black 100%),' +
                        'radial-gradient(circle 12px at 10% 83.3%, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 5px 3.5px at 5px 100px, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 7.5px 3.5px at 7.5px 160px, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 7.5px 3.5px at 7.5px 440px, transparent 99%, black 100%),' +
                        'radial-gradient(ellipse 7.5px 3.5px at 7.5px 500px, transparent 99%, black 100%)',
                      WebkitMaskComposite: 'source-in',
                    }}
                  />

                  {/* Scrollable essay body — sits inside the page bounds, clear
                      of the spine binding on the left and the outer shadow on
                      the right. overflow-y:auto gives a native scroll inside
                      the leaf itself; the album cover and rings stay put.
                      essay-scroll class hooks the WebKit scrollbar pseudo-elements
                      defined in the top-level <style> block, which paint the
                      scrollbar thumb in the same tinted-plastic style as the
                      BackButton. */}
                  <div
                    className="essay-scroll"
                    style={{
                      position: 'absolute',
                      left: '18%',
                      right: '8%',
                      top: '8%',
                      bottom: '8%',
                      overflowY: 'auto',
                      // Push content past the top fade band (the maskImage fades
                      // 0-12% to transparent) so the first line of the title
                      // sits in the fully-opaque region on initial paint. Same
                      // padding at the bottom keeps the last line balanced.
                      paddingTop: '14%',
                      paddingBottom: '14%',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '10px',
                      lineHeight: 1.65,
                      color: 'rgba(60, 58, 55, 0.88)',
                      letterSpacing: '0.005em',
                      // Same embossed stack as the cover title (top dark shadow
                      // + bright white drop below + soft white glow), scaled
                      // down for the body size so the letters read as pressed
                      // into the paper.
                      // Trimmed to the 3 cheaper layers — the previous wide
                      // 30px white halo was repainted across ~70 paragraphs
                      // every scroll frame, which was the main cause of the
                      // scroll lag. Keeps the embossed dark top + bright drop
                      // below so the letters still read as pressed into paper.
                      textShadow:
                        '0px -1px 1.5px rgba(0,0,0,0.42),' +
                        ' 0px 1px 2px rgba(255,255,255,1),' +
                        ' 0px 2px 6px rgba(255,255,255,1)',
                      // Soft-focus the wallpaper texture seen through the text
                      // area. backdrop-filter blurs whatever is rendered BEHIND
                      // this div (the SVG paper + shadow gradients), so the
                      // text reads against a calmer paper field while the
                      // rest of the leaf keeps its full grain.
                      // backdrop-filter removed — re-blurring the wallpaper
                      // every scroll frame inside an <Html transform> drops the
                      // frame rate badly. The white text-shadow halo below
                      // already gives the "blurred behind the text" feel.
                      // backdropFilter: 'blur(1px)',
                      // WebkitBackdropFilter: 'blur(1px)',
                      // Promote to its own GPU layer so the browser doesn't
                      // re-rasterise the wallpaper underneath on every scroll.
                      willChange: 'transform',
                      transform: 'translateZ(0)',
                      // Top/bottom fade — soft linear-gradient masks dissolve the
                      // text into transparency at the edges of the scroll
                      // container instead of clipping it on a hard line. The
                      // 12% fade band lets letters appear/disappear over a
                      // generous distance, so paired with the white text-shadow
                      // halo the transition reads as "fading into a blur".
                      maskImage:
                        'linear-gradient(to bottom,' +
                        ' transparent 0%,' +
                        ' black 12%,' +
                        ' black 88%,' +
                        ' transparent 100%)',
                      WebkitMaskImage:
                        'linear-gradient(to bottom,' +
                        ' transparent 0%,' +
                        ' black 12%,' +
                        ' black 88%,' +
                        ' transparent 100%)',
                      // Firefox slim scrollbar; Chrome/Safari will show default.
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(0,0,0,0.18) transparent',
                    }}
                  >
                    {/* Title — DM Mono, two parts. First line is the running
                        head in light weight; subtitle below in bold. Inherits
                        the container's color and embossed text-shadow so it
                        reads with the same pressed-into-paper feel as the body. */}
                    <p style={{
                      fontWeight: 300,
                      fontSize: '13px',
                      lineHeight: 1.35,
                      marginBottom: '0.15em',
                    }}>
                      a critical study on core memories:
                    </p>
                    <p style={{
                      fontWeight: 500,
                      fontSize: '16px',
                      lineHeight: 1.35,
                      marginBottom: '1.6em',
                    }}>
                      a comparative study of human and AI percpetion, exploring the role of lived experince in human capture vs. data sythethesied image making
                    </p>

                    {/* Essay body — generated from essay.ts, which is built from
                        Comparative_Study_Human_AI_Perception.txt (paragraphs
                        + short-line headings). Each section heading renders
                        slightly heavier with extra top margin to separate it
                        from the preceding paragraph. */}
                    {/* content-visibility: auto lets the browser skip painting
                        paragraphs that aren't in the scroll viewport — huge win
                        for long bodies of text with expensive text-shadows.
                        contain-intrinsic-size reserves placeholder space so
                        scroll height stays correct before paragraphs render. */}
                    {ESSAY.map((block, i) => (
                      block.type === 'h' ? (
                        <p
                          key={i}
                          style={{
                            fontWeight: 500,
                            marginTop: i === 0 ? 0 : '1.4em',
                            marginBottom: '0.4em',
                            contentVisibility: 'auto',
                            containIntrinsicSize: 'auto 1.6em',
                          }}
                        >
                          {block.text}
                        </p>
                      ) : (
                        <p
                          key={i}
                          style={{
                            marginBottom: '0.9em',
                            contentVisibility: 'auto',
                            containIntrinsicSize: 'auto 8em',
                          }}
                        >
                          {block.text}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </Html>
              </BookGroup>
            </group>
          </Suspense>
        </Canvas>
      </div>

      {/* Tinted-plastic back button — top-right corner, mirrors the styling
          of the /library BackButton but on the opposite side. Hides during the
          fade-out transition so it doesn't sit on top of the white sheet. */}
      <BackButton tintColor={TINT} onClick={handleBack} hidden={fadingOut} />
    </>
  )
}

// Next.js App Router requires components that read useSearchParams to be wrapped
// in a Suspense boundary so the rest of the tree can pre-render statically.
export default function ComparativeStudyPage() {
  return (
    <Suspense fallback={null}>
      <ComparativeStudyContent />
    </Suspense>
  )
}
