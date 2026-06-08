'use client'

import { useState, Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrthographicCamera, Environment } from '@react-three/drei'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { BinderRings, BookGroup, CoverOverlay, Page } from './components/BookComponents'
import { Frame } from './components/Frame'

// Fires `onReady` after 3 rendered frames. Mounts inside the Canvas's Suspense, so it only
// starts counting once textures + HDR have loaded. The 3-frame wait gives shader compilation
// (MeshPhysicalMaterial / clearcoat) time to settle before we lift the white sheet, avoiding
// the "shape appears, then re-renders with the proper material a tick later" pop.
function SceneReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0)
  const fired = useRef(false)
  useFrame(() => {
    if (fired.current) return
    frames.current += 1
    if (frames.current >= 3) {
      fired.current = true
      onReady()
    }
  })
  return null
}

function GroundShadow({ position = [0, -4, 0] as [number, number, number] }) {
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
    meshRef.current.position.x = position[0] + swayY * 2
    meshRef.current.scale.x = 1 - Math.abs(swayY) * 0.25
  })

  return (
    <mesh ref={meshRef} position={position}>
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

function AlbumCard({ title, color, basePosition, baseScale, isHovered, pushSign }: {
  title: string
  color: string
  basePosition: [number, number, number]
  baseScale: number
  isHovered: boolean
  pushSign: number   // -1 (push left), 0 (no push), +1 (push right)
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const HOVER_SCALE = 1.18
    const HOVER_LIFT_Y = 0.25
    const HOVER_FORWARD_Z = 0.4
    const PUSH_X = 0.7   // how far neighbours slide along the curve when another is hovered

    const targetX = basePosition[0] + pushSign * PUSH_X
    const targetY = basePosition[1] + (isHovered ? HOVER_LIFT_Y : 0)
    const targetZ = basePosition[2] + (isHovered ? HOVER_FORWARD_Z : 0)
    const targetScale = baseScale * (isHovered ? HOVER_SCALE : 1)

    const speed = 9 * delta
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, speed)
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, speed)
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, speed)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, speed)
    groupRef.current.scale.setScalar(s)
  })

  return (
    <group ref={groupRef} position={basePosition} scale={baseScale}>
      <GentleSway>
        <BookGroup isOpen={false}>
          <BinderRings />
          <CoverOverlay currentLeafIndex={0} tintHex={color} showGhost={false} />
          <Page
            index={0}
            currentIndex={0}
            totalLeaves={1}
            frontClass="landing-cover"
            frontContent={
              <div className="cover">
                <div className="cover-glass">
                  <div className="cover-title">{title}</div>
                </div>
              </div>
            }
            backContent={<div />}
            onTurnNext={() => {}}
            onTurnBack={() => {}}
          />
        </BookGroup>
      </GentleSway>
    </group>
  )
}

export default function IntroPage() {
  const router = useRouter()
  // Folder palette — approximations of the reference image's colorful folders, excluding the
  // grey one. Each landing visit picks 3 distinct hues at random so the row of albums reads
  // as a varied colorful trio. The user's personal album still picks its own tint at
  // /album load (see tintColor useState there) from the separate muted TINT_PALETTE.
  const FOLDER_PALETTE = [
    '#F4C744', // sunny yellow
    '#E15D4F', // tomato red
    '#F1A09A', // salmon pink
    '#E18A35', // pumpkin orange
    '#F4AC85', // peach
    '#67A158', // forest green
    '#91D080', // spring green
    '#4B8A87', // dark teal
    '#92C9C0', // mint cyan
    '#4D75B0', // royal blue
    '#91B7DF', // sky blue
    '#6F5B95', // deep purple
    '#B0A6CC', // lavender
    '#B86694', // raspberry / magenta
    '#D89AC2', // pastel pink
  ]
  const [albumColors] = useState(() => {
    const shuffled = [...FOLDER_PALETTE].sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1], shuffled[2]]
  })
  const [fadingOut, setFadingOut] = useState(false)
  // Entry fade — white sheet stays opaque until the inner Canvas Suspense resolves AND a
  // few frames render (= Frame3D + AlbumCard shaders are compiled). SceneReadySignal inside
  // the Canvas sets sceneReady=true. fadingIn is derived from !sceneReady — no 50ms timer.
  const [sceneReady, setSceneReady] = useState(false)
  const fadingIn = !sceneReady
  // 5s safety timeout — force-lifts the white sheet if something hangs (network outage,
  // asset 404) so users never get stuck on a white screen indefinitely.
  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 5000)
    return () => clearTimeout(t)
  }, [])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  // Static background — always /background.png. The previous random-thumbnail fetch was
  // removed: landing always uses the same backdrop now. The state is kept as a const so the
  // existing render conditions (`backgroundUrl &&`) and the ?bg= URL forwarded to
  // /comparative-study continue to work without other code changes.
  const backgroundUrl = '/background.png'

  function navigateTo(href: string) {
    if (fadingOut) return
    setFadingOut(true)
    // Match the white-sheet transition duration so we route at peak white — no choppy hot-swap.
    setTimeout(() => router.push(href), 1200)
  }

  // Dock-curve layout: middle book is bigger and pulled forward in z so it occludes the sides;
  // sides are pushed back in z, slightly larger now and spread further apart so they're less hidden.
  const albums = [
    {
      title: 'A critical study',
      color: albumColors[0],
      position: [-3.8, -0.9, -1.5] as [number, number, number],
      scale: 0.55,
      // Forward the random-thumbnail URL the landing page has already loaded so
      // /comparative-study renders the SAME blurred backdrop — no second fetch,
      // no jarring swap between routes. Omitted if the URL hasn't resolved yet.
      onClick: () => navigateTo(`/comparative-study${backgroundUrl ? `?bg=${encodeURIComponent(backgroundUrl)}` : ''}`),
      clickX: -380,
      clickWidth: 300,
      isCenter: false,
    },
    {
      title: 'Create an album',
      color: albumColors[1],
      position: [0, -0.5, 0.3] as [number, number, number],
      scale: 0.75,
      onClick: () => navigateTo(`/explore?tint=${encodeURIComponent(albumColors[1])}`),
      clickX: 0,
      clickWidth: 460,
      isCenter: true,
    },
    {
      title: 'Collective album',
      color: albumColors[2],
      position: [3.8, -0.9, -1.5] as [number, number, number],
      scale: 0.55,
      onClick: () => navigateTo(`/library?tint=${encodeURIComponent(albumColors[2])}`),
      clickX: 380,
      clickWidth: 300,
      isCenter: false,
    },
  ]

  return (
    <>
      <link rel="stylesheet" href="https://use.typekit.net/aex0tjt.css" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single+Cursive:wght@100..900&display=swap');
        @font-face { font-family: 'BitcountGridSingle_Roman-Medium'; src: url('/fonts/BitcountGridSingle_Roman-Medium.ttf') format('truetype'); }
        /* Doto variable font — exposes ROND and wght axes. Quoted url() so the comma in the
           filename is safe; supports-variations format hint lets the browser unlock the variable
           axes (font-weight and font-variation-settings). */
        @font-face {
          font-family: 'Doto';
          src: url('/fonts/Doto-VariableFont_ROND,wght.ttf') format('truetype-variations');
          font-weight: 100 900;
        }
        @font-face {
          font-family: 'Sysfont';
          src: url('/fonts/sysfont.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
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
        /* Disable Html-overlay click capture on landing albums so the click falls through to the 3D bounding mesh. */
        .leaf-face.landing-cover, .leaf-face.landing-cover * { pointer-events: none !important; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>

      <div
        style={{ position: 'fixed', inset: 0, opacity: fadingOut ? 0 : 1, transition: 'opacity 1.2s ease' }}
      >
        {/* Background photo — blurred and reduced opacity, sits behind the canvas. Only renders
            once a real Supabase thumbnail URL arrives so no /background.png fallback ever flashes. */}
        {backgroundUrl && (
          <div style={{
            position: 'absolute', inset: 0,
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
                // Fade the thumbnail toward the bottom so the hint text reads against clean white — but keep a bit of presence at the very bottom.
                maskImage: 'linear-gradient(180deg, black 0%, black 60%, rgba(0,0,0,0.35) 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 60%, rgba(0,0,0,0.35) 100%)',
              }}
            />
          </div>
        )}

        <Canvas
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          style={{ background: 'transparent' }}
        >
          <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[5, 5, 5]} intensity={0.6} />
          <pointLight position={[-2, 2, 4]} intensity={0.4} color="#fff8f0" />
          <Environment preset="studio" />
          <GroundShadow position={[-5, -3.5, 0]} />
          <GroundShadow position={[0, -3.5, 0]} />
          <GroundShadow position={[5, -3.5, 0]} />
          <Suspense fallback={null}>
            <SceneReadySignal onReady={() => setSceneReady(true)} />
            {albums.map((album, i) => {
              const pushSign = hoveredIndex === null || hoveredIndex === i
                ? 0
                : Math.sign(i - hoveredIndex)
              return (
                <AlbumCard
                  key={i}
                  title={album.title}
                  color={album.color}
                  basePosition={album.position}
                  baseScale={album.scale}
                  isHovered={hoveredIndex === i}
                  pushSign={pushSign}
                />
              )
            })}
          </Suspense>
        </Canvas>

        {/* "Core Memories" title — fixed at top of viewport. Uses the same BitcountGridSingle
            font as the album cover-title, embossed text-shadow stack (dark recess above +
            bright paper-rise below + two broader white halos for outer glow). pointer-events:
            none so the title doesn't intercept clicks on anything below it (it sits above the
            canvas but the click overlays at zIndex INT_MAX still tiebreak above on equal stacks). */}
        <div style={{
          position: 'fixed',
          top: '3%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'coral-pixels', sans-serif",
          fontWeight: 600,
          fontSize: '100px',
          letterSpacing: '0.01em',
          color: 'rgba(110, 108, 106, 0.5)',
          textShadow:
            '0px -2px 2px rgba(0,0,0,0.2),' +
            ' 0px 3px 5px rgba(255,255,255,1),' +
            ' 0px 5px 18px rgba(255,255,255,0.85),' +
            ' 0px 10px 36px rgba(255,255,255,0.55)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 100,
          userSelect: 'none',
        }}>
          Core Memories
        </div>

        {/* Click overlays — absolutely positioned over each album, attached at the DOM level.
            zIndex must exceed drei's CSS3D Html stack (drei uses up to ~16.7M based on camera distance),
            otherwise the cover area is occluded by drei's overlay and only the strip below it is clickable. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2147483646, pointerEvents: 'none' }}>
          {albums.map((album, i) => (
            <div
              key={i}
              onClick={album.onClick}
              onMouseEnter={() => {
                setHoveredIndex(i)
                // Tiny haptic — only fires on mobile; desktop browsers ignore it silently.
                navigator.vibrate?.(8)
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                position: 'absolute',
                top: '50%',
                left: `calc(50% + ${album.clickX}px)`,
                width: `${album.clickWidth}px`,
                height: '70vh',
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                pointerEvents: 'auto',
                background: 'transparent',
                zIndex: album.isCenter ? 2147483647 : 2147483646,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{
        position: 'fixed', bottom: '8%', left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'coral-pixels', sans-serif",
        fontSize: '38px',
        letterSpacing: '0.10em',
        color: 'rgba(58,56,53,0.65)',
        // Multi-stop white halo so the hint pops against the photo backdrop — matches the
        // glow recipe on the /album arrow-key hint.
        textShadow:
          '0 0 8px rgba(255,255,255,1),' +
          ' 0 0 22px rgba(255,255,255,0.9),' +
          ' 0 0 45px rgba(255,255,255,0.6)',
        pointerEvents: 'none', opacity: fadingOut ? 0 : 1, transition: 'opacity 0.5s ease',
        animation: fadingOut ? 'none' : 'blink 1.2s step-end infinite',
      }}>
        (click an album)
      </div>

      {/* Left-edge "albums" tab removed per user request. The /library route is still
          reachable via the "Collective album" card in the main row. */}

      {/* Bubble frame — see app/components/Frame.tsx. Both white surface + tube-shading SVG. */}
      <Frame />

      {/* White sheet — opaque on mount until sceneReady (= Canvas Suspense resolved + a
          few frames rendered), then fades out over 1.2s. Re-opaques over 1.2s when navigating
          (fadingOut). pointerEvents auto while opaque so clicks don't leak through to the
          (effectively invisible) page behind. */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'white',
        pointerEvents: fadingIn || fadingOut ? 'auto' : 'none',
        opacity: fadingIn || fadingOut ? 1 : 0,
        transition: 'opacity 1.2s ease',
        zIndex: 2147483647,
      }} />
    </>
  )
}
