'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Frame } from '../components/Frame'
import { Environment, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter, useSearchParams } from 'next/navigation'
import { BinderRings, BookGroup, CoverOverlay, Page } from '../components/BookComponents'

type Album = {
  id: number
  user_name: string
  birth_year: string
  memory_text: string
  interpretation_text: string
  response_text: string | null
  scene_description: string | null
  tint_color: string
  image_url: string
}

const PALETTE = ['#545454', '#FFFD82', '#6BA292', '#FF0000', '#C49BBB', '#555358', '#EFC88B', '#A0D2DB', '#63A375']

function GroundShadow() {
  const meshRef = useRef<THREE.Mesh>(null)

  const shadowTex = useMemo(() => {
    const size = 489
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(0,0,0,0.25)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const swayY = Math.sin(t * 0.65) * 0.30
    meshRef.current.position.x = swayY * 2
    meshRef.current.scale.x = 1 - Math.abs(swayY) * 0.25
  })

  return (
    <mesh ref={meshRef} position={[0, -4, 0]}>
      <planeGeometry args={[9, 1.6]} />
      <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
    </mesh>
  )
}

function GentleSway({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.y = Math.sin(t * 0.65) * 0.30
    ref.current.rotation.x = Math.sin(t * 0.38 + 1.2) * 0.07
  })
  return <group ref={ref}>{children}</group>
}

// Signals when the inner Canvas Suspense has actually resolved (textures + HDR loaded).
// Mounts only once Suspense unfreezes, so the parent can hold the white-sheet overlay up until the
// 3D scene is genuinely ready — preventing the title-appears-before-book glitch.
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

// Parses an "#rrggbb" hex string into its r/g/b components so we can re-emit it as rgba(...) with
// a custom alpha. Used by BackButton to tint the translucent plastic with the album's tint color.
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

// Tinted-plastic back button that visually echoes the album cover material — translucent tint,
// frosted backdrop, drop shadow for lift, paired inner shadows (top-edge depth + bottom-right
// highlight) for the 3D plastic feel, and an embossed arrow pressed into the surface.
// Effect values mirror the Figma spec, scaled down from the 697×320 mock to a UI-friendly 80×52.
function BackButton({ tintColor, onClick, hidden }: { tintColor: string; onClick: () => void; hidden?: boolean }) {
  const [r, g, b] = parseHex(tintColor)
  const tintFill = `rgba(${r}, ${g}, ${b}, 0.4)`
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  // Pop on hover, settle on press — gives the plastic a soft springy feedback under the cursor.
  const scale = pressed ? 0.96 : hovered ? 1.08 : 1
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        // Positioned INSIDE the bubble Frame's hollow area (not flush to the viewport edge)
        // so it doesn't get visually covered by the frame's top/left bands. The frame's inner
        // top edge sits at ~1.5% from viewport top and inner left edge at 6vh from viewport
        // left, so 5vh top + 10vh left gives ~38px / 43px clearance from those inner edges.
        position: 'fixed', top: '5vh', left: '10vh', zIndex: 100,
        width: '80px', height: '52px',
        borderRadius: '14px',
        cursor: 'pointer',
        background: tintFill,
        backdropFilter: 'blur(8px) saturate(140%)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        // Layered shadows mirror the Figma stack:
        //   1. Drop shadow (lift)               — Figma: 0 4 / blur 20 / spread 10 / black 25%
        //   2. Inner top-edge dark (depth)      — Figma: 0 4 / blur 7.7 / spread 5 / black 25%
        //   3. Inner bottom-right white (gloss) — Figma: -25 -19 / blur 20.8 / spread 3 / white 63%
        //   4. Inset white stroke (4px Inside)  — Figma: stroke 4 / white / inside
        boxShadow: [
          // Drop shadow puffs out a touch on hover so the lift reads stronger.
          hovered ? '0 10px 26px -2px rgba(0,0,0,0.34)' : '0 6px 18px -2px rgba(0,0,0,0.28)',
          'inset 0 2px 3px 1px rgba(0,0,0,0.22)',
          'inset -8px -6px 12px 1px rgba(255,255,255,0.55)',
          'inset 0 0 0 0.5px rgba(255,255,255,1)',
        ].join(', '),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: hidden ? 0 : 1,
        transform: `scale(${scale})`,
        // Slight overshoot on hover (cubic-bezier with a tiny back-out) gives it the springy "haptic"
        // feel — visual approximation of a click rebound.
        transition: 'opacity 1.2s ease, transform 220ms cubic-bezier(0.34, 1.5, 0.64, 1), box-shadow 220ms ease',
      }}
    >
      {/* Embossed arrow — slightly transparent dark stroke for the recess, plus a 1px white drop
          shadow below the path so the bottom rim of the engraving catches "light". */}
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

function CollectiveLibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tintColor] = useState(() => searchParams.get('tint') ?? PALETTE[Math.floor(Math.random() * PALETTE.length)])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [currentLeafIndex, setCurrentLeafIndex] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const [sceneReady, setSceneReady] = useState(false) // flips true when the Canvas Suspense resolves
  // Static background — always /background.png, same as the landing page. (Previously this
  // fetched a random thumbnail; replaced with the static landing-matching backdrop so the
  // library shares the same visual identity.)
  const backgroundUrl = '/background.png'
  // Client-mount guard: Three.js / drei pieces (Canvas, useTexture, Environment) need the DOM.
  // On a hard reload Next.js prerenders the page on the server first; mounting the Canvas before
  // hydration completes can leave the Suspense tree stuck on its null fallback. Waiting one tick
  // for `mounted` to flip on the client guarantees the 3D scene only initialises in the browser.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // 5s safety timeout — force-lifts the white sheet if either sceneReady or loading hangs
  // (Modal/Supabase outage, asset 404, etc.). Without this, an outage strands users on a
  // blank white screen with no way to recover.
  useEffect(() => {
    const t = setTimeout(() => { setSceneReady(true); setLoading(false) }, 5000)
    return () => clearTimeout(t)
  }, [])

  // Fetch all submitted albums. `cache: 'no-store'` bypasses any browser-cached response from
  // before the API was updated to include new columns — otherwise users see stale data shapes.
  useEffect(() => {
    fetch('/api/albums', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { setAlbums(d.albums ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Background is now static (/background.png) — see backgroundUrl declared above.
  // The random-thumbnail fetch that lived here has been removed.

  // Build the leaves: cover (leaf-0) + one image leaf per album.
  // Total leaves count = 1 (cover) + albums.length.
  const totalLeaves = 1 + albums.length

  function goHome() {
    if (fadingOut) return
    setFadingOut(true)
    // Match the white-sheet transition duration so we route at peak white — no choppy hot-swap.
    setTimeout(() => router.push('/'), 1200)
  }

  // Keyboard navigation — arrow keys turn pages; advancing past the last leaf fades to landing.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        if (currentLeafIndex >= totalLeaves - 1) {
          goHome()
        } else {
          setCurrentLeafIndex(currentLeafIndex + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        setCurrentLeafIndex(Math.max(0, currentLeafIndex - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLeafIndex, totalLeaves])

  function turnNext(index: number) {
    if (index >= totalLeaves - 1) {
      // Past the last leaf — fade out and return to the landing page instead of closing
      // the album in-place (the close animation re-introduces intersection artifacts).
      goHome()
    } else {
      setCurrentLeafIndex(index + 1)
    }
  }

  function turnBack(index: number) {
    setCurrentLeafIndex(Math.max(0, index - 1))
  }

  return (
    <>
      <link rel="stylesheet" href="https://use.typekit.net/aex0tjt.css" />
      <style>{`
        @font-face {
          font-family: 'DM Mono';
          src: url('/fonts/DMMono-Regular.ttf') format('truetype');
          font-style: normal;
          font-weight: 400;
          font-display: swap;
        }
        @font-face {
          font-family: 'DM Mono';
          src: url('/fonts/DMMono-Medium.ttf') format('truetype');
          font-style: normal;
          font-weight: 600 700;
          font-display: swap;
        }
        @font-face {
          font-family: 'DM Mono';
          src: url('/fonts/DMMono-Italic.ttf') format('truetype');
          font-style: italic;
          font-weight: 400;
          font-display: swap;
        }
        @font-face {
          font-family: 'DM Mono';
          src: url('/fonts/DMMono-MediumItalic.ttf') format('truetype');
          font-style: italic;
          font-weight: 600 700;
          font-display: swap;
        }
        @font-face {
          font-family: 'Bitcount Grid';
          src: url('/fonts/BitcountGridSingle_Roman-Medium.ttf') format('truetype');
          font-style: normal;
          font-weight: 500;
          font-display: swap;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: linear-gradient(180deg, #bcbcc0 0%, #ffffff 100%); }
        .cover { position: absolute; inset: 0; }
        .cover-glass { position: absolute; inset: 0; background: transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
        .cover-title {
          font-family: 'coral-pixels', sans-serif;
          font-weight: 600;
          font-size: 55px;
          text-align: center;
          max-width: 320px;
          margin: 0 auto;
          transform: translateX(-20px);
          color: rgba(110, 108, 106, 0.5);
          text-shadow: 0px -2px 2px rgba(0,0,0,0.2), 0px 3px 5px rgba(255,255,255,1), 0px 5px 10px rgba(255,255,255,0.8);
          line-height: 1.05;
          letter-spacing: 0.01em;
        }
        .leaf-face { position: absolute; inset: 0; border-radius: 4px 14px 14px 4px; }
        .leaf-face.back { border-radius: 14px 4px 4px 14px; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes softPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>

      {/* Blurred-thumbnail background — only rendered once a supabase thumbnail URL arrives. */}
      {backgroundUrl && (
        <div style={{
          position: 'fixed', inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}>
          <img
            src={backgroundUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: '100%', height: '100%',
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

      {/* Back-to-landing affordance — translucent plastic button echoing the cover material. */}
      <BackButton tintColor={tintColor} onClick={goHome} hidden={fadingOut} />

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'coral-pixels', sans-serif", fontSize: '24px', fontWeight: 600,
          color: 'rgba(90, 88, 85, 0.55)', letterSpacing: '0.08em',
        }}>
          loading albums...
        </div>
      )}

      <div style={{
        position: 'fixed', inset: 0,
        opacity: fadingOut ? 0 : 1, transition: 'opacity 1.2s ease',
      }}>
        {mounted && (
        <Canvas
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <SceneReadySignal onReady={() => setSceneReady(true)} />
            <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
            <ambientLight intensity={0.65} />
            <directionalLight position={[3, 5, 3]} intensity={1.2} />
            <pointLight position={[-2, 2, 4]} intensity={0.4} color="#fff8f0" />
            <Environment preset="studio" />
            <GroundShadow />
            <GentleSway>
              <BookGroup isOpen={currentLeafIndex > 0}>
                <BinderRings />
                <CoverOverlay
                  currentLeafIndex={currentLeafIndex}
                  tintHex={tintColor}
                  showGhost={false}
                  pageCount={totalLeaves}
                />

                {/* Leaf-0 — the cover with title */}
                <Page
                  key="cover"
                  index={0}
                  currentIndex={currentLeafIndex}
                  totalLeaves={totalLeaves}
                  noHoles
                  frontContent={
                    <div className="cover">
                      <div className="cover-glass">
                        <div className="cover-title">Collective album</div>
                      </div>
                    </div>
                  }
                  backContent={<div style={{ position: 'relative', width: '100%', height: '100%' }} />}
                  onTurnNext={() => turnNext(0)}
                  onTurnBack={() => turnBack(0)}
                  clickAnywhereToTurn
                />

                {/* One leaf per submitted album — image-only, same paper/translucent treatment as leaf-3 */}
                {albums.map((album, i) => {
                  const leafIndex = i + 1
                  return (
                    <Page
                      key={album.id ?? leafIndex}
                      index={leafIndex}
                      currentIndex={currentLeafIndex}
                      totalLeaves={totalLeaves}
                      paperTexturePath="/placeholders/backing.png"
                      paperTextureRotation={Math.PI / 2}
                      // Pass null so PlasticOverlay still renders, but no 3D ImagePlane —
                      // the image lives inside frontContent now so it can be laid out with the text.
                      // Leaf-1 gets a 3D ImagePlane (a WebGL mesh) ONLY while the book is still closed.
                      // 3D meshes blend correctly with the translucent cover via WebGL alpha, which is
                      // why the image used to "peek through". Once the user opens the book past the cover,
                      // we drop back to null so the HTML <img> layout takes over without visual conflict.
                      imagePlaneData={leafIndex === 1 && currentLeafIndex < leafIndex ? album.image_url : null}
                      isMockImage={false}
                      // Match the HTML <img> frame: container at left:45% / top:50%, width 65% / aspect 7:5.
                      // In world units (100 CSS px ≈ 1 world unit, leaf-face centered on Page-local 3.05,0):
                      //   center  = (2.75, 0),  size = (3.9, 2.79)
                      // Through-cover preview only: cover the whole leaf face with a single
                      // pre-baked composite (paper + image, gaussian-blurred together) so the page
                      // visible behind the translucent cover reads as one uniformly fuzzy surface.
                      // Plane = page mesh dimensions: mesh-local x ∈ [-3, 2.3] (width 5.3), y ∈ [-3, 3].
                      // The mesh sits at Page-local (3.05, 0), so the plane centers at (2.7, 0).
                      imagePlanePosition={[2.7, 0, 0.034]}
                      imagePlaneSize={[5.3, 6]}
                      imagePlaneBlur={14}
                      imagePlaneComposite={{
                        backgroundUrl: '/placeholders/backing.png',
                        backgroundRotation: Math.PI / 2,
                        // Canvas aspect matches the 5.3:6 page (530×600) so the composite isn't
                        // squished when stretched onto the non-square plane.
                        canvasSize: [530, 600],
                        // HTML <img> sits at world (2.75, 0) size (3.9, 2.79). In plane-local
                        // (plane spans 0.05→5.35 x, -3→3 y, size 5.3×6):
                        //   x_center = (2.75 - 0.05) / 5.3 ≈ 0.51
                        //   width    = 3.9 / 5.3 ≈ 0.7358
                        imageFrame: {
                          left: 0.51,
                          top: 0.5,
                          width: 0.7358,
                          aspectRatio: 7 / 5,
                          objectFitCover: true,
                          scale: 1.25,
                        },
                      }}
                      plasticPosition={[2.7, 0, 0.05]}
                      plasticSize={[5.4, 6.1]}
                      plasticCurvedEdges
                      // Plastic looks heavier when seen *through* the translucent cover, so when this leaf
                      // is still behind the cover we dial it back; once the user turns to it, ramp up.
                      plasticOpacity={currentLeafIndex < leafIndex ? 0.22 : 0.38}
                      // Punch the binder-hole rings out of the plastic so it isn't covering empty space.
                      // Binder holes live at mesh-local (-2.85, ±2.0/±1.4); the page mesh sits at Page-local
                      // (3.05, 0) so Page-local hole x is 0.2. Plastic sits at Page-local (2.7, 0), so in
                      // plastic-local coords the holes land at (0.2 - 2.7, y) = (-2.5, y).
                      plasticHoles={[
                        { x: -2.5, y: 2.0, radius: 0.12 },
                        { x: -2.5, y: 1.4, radius: 0.12 },
                        { x: -2.5, y: -1.4, radius: 0.12 },
                        { x: -2.5, y: -2.0, radius: 0.12 },
                      ]}
                      alwaysShowPlastic
                      frontContent={
                        <div style={{ position: 'absolute', inset: 0 }}>
                          {/* Outer-edge soft shadow + highlight on the front face (spine is on the left,
                              so outer edge is on the RIGHT). Shorter and lighter than the spine gradient.
                              `right: 11%` aligns the gradient with the actual page right edge — the leaf-face
                              div is 600px wide but the page geometry only reaches ~88% of that.
                              `top` / `bottom` insets follow the page's outer-corner tuck (`outerTuck: 0.035`
                              world ≈ 0.6% of the leaf-face div height). */}
                          <div style={{
                            position: 'absolute',
                            right: '11%',
                            top: '0.6%',
                            bottom: '0.6%',
                            width: '18%',
                            pointerEvents: 'none',
                            background:
                              'linear-gradient(to left,' +
                              ' rgba(0,0,0,0.14) 0%,' +
                              ' rgba(0,0,0,0.07) 28%,' +
                              ' rgba(0,0,0,0) 55%,' +
                              ' rgba(255,255,255,0.18) 75%,' +
                              ' rgba(255,255,255,0) 100%)',
                          }} />

                          {/* Spine-side gutter shadow + paper-rise highlight. Sits behind the rest of
                              the content. mask-image punches the four binder-hole positions out so the
                              gradient doesn't draw where there's no paper.
                              `top` / `bottom` insets follow the page's spine-corner tuck (`curveDepth: 0.09`
                              world ≈ 1.5% of the leaf-face div height). */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: '1.5%',
                            bottom: '1.5%',
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
                              'radial-gradient(circle 12px at 9% 16%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 9% 26%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 9% 74%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 9% 84%, transparent 99%, black 100%)',
                            maskComposite: 'intersect',
                            WebkitMaskImage:
                              'radial-gradient(circle 12px at 9% 16%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 9% 26%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 9% 74%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 9% 84%, transparent 99%, black 100%)',
                            WebkitMaskComposite: 'source-in',
                          }} />

                          {/* Memory text — top, in quotes */}
                          {album.memory_text && (
                            <div style={{
                              position: 'absolute',
                              top: '10%',
                              left: '12%',
                              right: '18%',
                              textAlign: 'center',
                              fontFamily: "'coral-pixels', sans-serif",
                              fontWeight: 600,
                              fontSize: '17px',
                              color: 'rgba(90, 88, 85, 0.75)',
                              letterSpacing: '0.01em',
                              lineHeight: '1.4',
                              // Same embossed stack as the cover title — top-edge dark shadow + bright white
                              // drop below, so the letters read as risen out of the paper.
                              textShadow: '0px -2px 2px rgba(0,0,0,0.28), 0px 3px 5px rgba(255,255,255,1), 0px 5px 10px rgba(255,255,255,1), 0px 8px 18px rgba(255,255,255,0.95)',
                            }}>
                              &ldquo;{album.memory_text}&rdquo;
                            </div>
                          )}

                          {/* Image — fixed-aspect frame with object-fit cover so the edges crop into the page.
                              Centred at left: 45% to compensate for the page's narrowed right edge. */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '45%',
                            transform: 'translate(-50%, -50%)',
                            width: '65%',
                            aspectRatio: '7 / 5',
                            overflow: 'hidden',
                            // Embossed "pressed into the paper" stack — three layers (outer-most listed last):
                            //   1. Tight dark right at the frame edge: the recess lip casting shadow.
                            //   2. Bright tight white belt: the highlight along the rim of the raised paper.
                            //   3. Broader soft white halo: the diffuse glow further out across the paper.
                            boxShadow:
                              '0 0 6px 3px rgba(0, 0, 0, 0.65),' +
                              '0 0 10px 10px rgba(255, 255, 255, 1),' +
                              '0 0 28px 18px rgba(255, 255, 255, 1),' +
                              '0 0 50px 24px rgba(255, 255, 255, 0.9)',
                          }}>
                            <img
                              src={album.image_url}
                              alt=""
                              crossOrigin="anonymous"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                transform: 'scale(1.25)',
                                display: 'block',
                              }}
                            />
                            {/* Inner shadow — sits above the image so the frame "presses" the photo in.
                                Inset box-shadow on the parent itself would render under the img, hence this overlay.
                                Values match the Figma inner-shadow: X 13, Y 12, blur 3.3, spread 0, #000 @ 25%. */}
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              pointerEvents: 'none',
                              boxShadow:
                                'inset 11px 10px 18px 0 rgba(0,0,0,0.38),' +
                                'inset -4px -3px 10px 0 rgba(0,0,0,0.12)',
                            }} />
                          </div>

                          {/* Response + user attribution — stacked in a single bottom-half block
                              anchored from the TOP (not the bottom), so long response text grows
                              downward into safe page space instead of upward into the image.
                              top: 73% sits just below the image bottom edge (image is centred at
                              top: 50% with width 65% aspect 7/5 inside a slightly-taller-than-wide
                              leaf face — its bottom edge lands around 70%, so 73% leaves a small
                              margin). Both children are 13px coral-pixels so the layout stays
                              compact even with longer responses. */}
                          {(album.response_text || album.user_name || album.birth_year) && (
                            <div style={{
                              position: 'absolute',
                              top: '79%',
                              left: '22%',
                              right: '28%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              textAlign: 'center',
                              fontFamily: "'coral-pixels', sans-serif",
                              fontWeight: 600,
                              fontSize: '13px',
                              color: 'rgba(90, 88, 85, 0.75)',
                              letterSpacing: '0.01em',
                              lineHeight: '1.4',
                              textShadow: '0px -2px 2px rgba(0,0,0,0.28), 0px 3px 5px rgba(255,255,255,1), 0px 5px 10px rgba(255,255,255,1), 0px 8px 18px rgba(255,255,255,0.95)',
                            }}>
                              {album.response_text && (
                                <div>&ldquo;{album.response_text}&rdquo;</div>
                              )}
                              {(album.user_name || album.birth_year) && (
                                <div>{[album.user_name, album.birth_year].filter(Boolean).join(', ')}</div>
                              )}
                            </div>
                          )}
                        </div>
                      }
                      
                      backContent={
                        <div style={{ position: 'absolute', inset: 0 }}>
                          {/* Outer-edge soft shadow + highlight on the back face — outer edge is now
                              on the LEFT after the leaf flips. `left: 11%` aligns with the actual page edge.
                              `top` / `bottom` insets match the outer corner tuck (~0.6%). */}
                          <div style={{
                            position: 'absolute',
                            left: '11%',
                            top: '0.6%',
                            bottom: '0.6%',
                            width: '18%',
                            pointerEvents: 'none',
                            background:
                              'linear-gradient(to right,' +
                              ' rgba(0,0,0,0.14) 0%,' +
                              ' rgba(0,0,0,0.07) 28%,' +
                              ' rgba(0,0,0,0) 55%,' +
                              ' rgba(255,255,255,0.18) 75%,' +
                              ' rgba(255,255,255,0) 100%)',
                          }} />

                          {/* Spine-side gutter on the back face — after the leaf flips, the spine
                              sits on the RIGHT, so gradient + mask are mirrored.
                              `top` / `bottom` insets match the spine corner tuck (~1.5%). */}
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '1.5%',
                            bottom: '1.5%',
                            width: '28%',
                            pointerEvents: 'none',
                            background:
                              'linear-gradient(to left,' +
                              ' rgba(0,0,0,0.22) 0%,' +
                              ' rgba(0,0,0,0.12) 18%,' +
                              ' rgba(0,0,0,0) 42%,' +
                              ' rgba(255,255,255,0.28) 64%,' +
                              ' rgba(255,255,255,0) 100%)',
                            maskImage:
                              'radial-gradient(circle 12px at 91% 16%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 91% 26%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 91% 74%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 91% 84%, transparent 99%, black 100%)',
                            maskComposite: 'intersect',
                            WebkitMaskImage:
                              'radial-gradient(circle 12px at 91% 16%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 91% 26%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 91% 74%, transparent 99%, black 100%),' +
                              'radial-gradient(circle 12px at 91% 84%, transparent 99%, black 100%)',
                            WebkitMaskComposite: 'source-in',
                          }} />
                        </div>
                      }
                      onTurnNext={() => turnNext(leafIndex)}
                      onTurnBack={() => turnBack(leafIndex)}
                      clickAnywhereToTurn
                    />
                  )
                })}
              </BookGroup>
            </GentleSway>
          </Suspense>
        </Canvas>
        )}
      </div>

      {/* (press arrows to navigate) — matches the interactive album's UI-hint recipe exactly:
          coral-pixels 38px, white halo text-shadow, softPulse animation, color rgba(58,56,53,0.78).
          Top: 5% — moved ABOVE the album for breathing room (bottom area got crowded with the
          album's response/attribution text). */}
      {currentLeafIndex === 0 && !loading && (
        <div style={{
          position: 'fixed', top: '5%', left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'coral-pixels', sans-serif",
          fontSize: '38px',
          letterSpacing: '0.08em',
          color: 'rgba(58,56,53,0.78)',
          textShadow:
            '0 0 8px rgba(255,255,255,1),' +
            ' 0 0 18px rgba(255,255,255,0.85),' +
            ' 0 0 40px rgba(255,255,255,0.6)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 12,
          opacity: fadingOut ? 0 : 1,
          transition: 'opacity 1.2s ease',
          animation: 'softPulse 1.3s ease-in-out infinite',
        }}>
          (press arrows to navigate)
        </div>
      )}

      {/* Bubble frame — same shared component the landing page uses (see app/components/Frame.tsx). */}
      <Frame />

      {/* White sheet — fades out on mount, fades back in when leaving. Matches the landing page transition. */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'white',
        pointerEvents: 'none',
        // Stay opaque until the inner Canvas Suspense has resolved (textures/HDR loaded) AND albums loaded.
        opacity: !sceneReady || loading || fadingOut ? 1 : 0,
        transition: 'opacity 1.2s ease',
        zIndex: 2147483647,
      }} />
    </>
  )
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <CollectiveLibraryContent />
    </Suspense>
  )
}
