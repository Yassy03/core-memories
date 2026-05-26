'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls, useScroll, Environment, Html, RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter, useSearchParams } from 'next/navigation'

const PALETTE = ['#B5614F', '#4A314D', '#7090B8', '#9EBF8A', '#A88DA8', '#C8A49E', '#6A9688', '#C4AD6A', '#9A6F3A']

// Tinted-plastic back button — identical recipe to the BackButton in app/library/page.tsx and
// app/comparative-study/page.tsx so all four pages (library, comparative, explore, album)
// share the same nav affordance. Duplicated rather than imported to keep each page's render
// tree self-contained; if it changes, update all four sites.
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

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
        position: 'fixed', top: '24px', left: '24px', zIndex: 100,
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

const LAYER_SPACING = 45
const TOTAL_LAYERS = 4
const CONTENT_OFFSET = 8
// Initial camera z. The first frame sits at z = -53; making this more negative starts
// the camera closer to it. Stay above z = -8 (= -CONTENT_OFFSET) or the layer-0 text
// typewriter will already be inside its ENTER range on first paint.
const CAMERA_START_Z = -5
// Frame + image dimensions — single source of truth used by RoomFrames, TunnelLines,
// WallImage's texture cropping, the image box, and the inner-shadow overlay plane.
// Bump FRAME_SCALE to grow every frame (text panes, image panes, walls' hole cutouts,
// bars) uniformly while keeping the text/image-frame aspect ratio relationship.
const FRAME_SCALE = 2
// Text-frame size (used for the layers that show a glass pane + text).
const FRAME_W = 20 * FRAME_SCALE
const FRAME_H = 13 * FRAME_SCALE
// Larger frame size for the image layers — image frames are bigger so the photo inside
// reads more dominantly than the text panels.
const IMG_FRAME_W = 23 * FRAME_SCALE
const IMG_FRAME_H = 15 * FRAME_SCALE

// Text-layer indices — same set used by EMPTY_IMAGE_LAYERS below; declared here so the size
// helper can be hoisted to the top of the file. Keep these two in sync if you change them.
const TEXT_LAYER_INDICES: ReadonlySet<number> = new Set([0, 2])
function getFrameSize(layerIndex: number): { W: number; H: number } {
  return TEXT_LAYER_INDICES.has(layerIndex)
    ? { W: FRAME_W, H: FRAME_H }
    : { W: IMG_FRAME_W, H: IMG_FRAME_H }
}

// All frame z positions in the tunnel — every layer (text + image alike). Used by
// WallImage to detect whether it sits behind any other frame from the camera's POV and,
// if so, hide its inner-shadow overlay so the glow doesn't bleed through.
const ALL_FRAME_ZS: number[] = (() => {
  const zs: number[] = []
  for (let i = 0; i < TOTAL_LAYERS; i++) {
    zs.push(-(i + 1) * LAYER_SPACING - CONTENT_OFFSET)
  }
  return zs
})()

// One large textured plane per frame, with a FRAME_W × FRAME_H hole at its center so the inside
// of the frame stays clear. The wall sits just behind the frame's bar plane so the bars read in
// front of it. Built with THREE.Shape + a hole path because PlaneGeometry can't have cutouts.
function WallSurfaces() {
  // Large wall texture — sized to fill the wall plane without needing to be stretched/tiled.
  const paperTex = useTexture('/placeholders/wallpaper.png')
  paperTex.colorSpace = THREE.SRGBColorSpace
  paperTex.wrapS = THREE.ClampToEdgeWrapping
  paperTex.wrapT = THREE.ClampToEdgeWrapping
  paperTex.repeat.set(1, 1)
  paperTex.offset.set(0, 0)

  // Match wall dimensions to the texture's native aspect so the image isn't squashed in either
  // direction. Width is the dominant size; height is derived from texture aspect.
  const HOLE_PAD = 0.02
  const WALL_W = 200
  const WALL_DEPTH = 0.6 // slab thickness — bars (0.4 deep) embed inside this depth
  const texImg = paperTex.image as { width: number; height: number } | null
  const texAspect = texImg ? texImg.width / texImg.height : 1
  const WALL_H = WALL_W / texAspect

  // Plain (un-beveled) extruded wall: the slab gives the wall real thickness along z, with
  // straight side walls in the hole. The frame outline comes from the separate RoomFrames bar
  // meshes sitting in front of the slab.
  const buildGeo = (holeW: number, holeH: number) => {
    const shape = new THREE.Shape()
    const halfW = WALL_W / 2
    const halfH = WALL_H / 2
    shape.moveTo(-halfW, -halfH)
    shape.lineTo( halfW, -halfH)
    shape.lineTo( halfW,  halfH)
    shape.lineTo(-halfW,  halfH)
    shape.lineTo(-halfW, -halfH)
    const hole = new THREE.Path()
    const hw = holeW / 2 - HOLE_PAD
    const hh = holeH / 2 - HOLE_PAD
    hole.moveTo(-hw, -hh)
    hole.lineTo( hw, -hh)
    hole.lineTo( hw,  hh)
    hole.lineTo(-hw,  hh)
    hole.lineTo(-hw, -hh)
    shape.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: WALL_DEPTH, bevelEnabled: false })
    geo.translate(0, 0, -WALL_DEPTH / 2)
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, (pos.getX(i) + halfW) / WALL_W, (pos.getY(i) + halfH) / WALL_H)
    }
    uv.needsUpdate = true
    return geo
  }
  const imgGeo = useMemo(() => buildGeo(IMG_FRAME_W, IMG_FRAME_H), [WALL_H])
  const textGeo = useMemo(() => buildGeo(FRAME_W, FRAME_H), [WALL_H])

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    map: paperTex,
    toneMapped: false,
    side: THREE.DoubleSide,
  }), [paperTex])

  // Per-frame list with layerIndex so we can pick the matching hole geometry.
  const frames = useMemo(() => {
    const list: { z: number; layerIndex: number }[] = []
    for (let i = 0; i < TOTAL_LAYERS; i++) {
      list.push({ z: -(i + 1) * LAYER_SPACING - CONTENT_OFFSET, layerIndex: i })
    }
    return list
  }, [])

  // Wall slab front face stays at f.z + 0.50; bars now sit IN FRONT of it (group at f.z + 0.50,
  // front face at f.z + 0.70) so there's no coincident z plane to z-fight against.
  const SLAB_CENTER_OFFSET = 0.50 - WALL_DEPTH / 2
  return (
    <>
      {frames.map((f, i) => (
        <mesh
          key={i}
          geometry={TEXT_LAYER_INDICES.has(f.layerIndex) ? textGeo : imgGeo}
          material={mat}
          position={[0, 0, f.z + SLAB_CENTER_OFFSET]}
          raycast={() => null}
        />
      ))}
    </>
  )
}

function RoomFrames() {
  const frames = useMemo(() => {
    const result: { z: number; W: number; H: number; layerIndex: number }[] = []
    for (let i = 0; i < TOTAL_LAYERS; i++) {
      const z = -(i + 1) * LAYER_SPACING - CONTENT_OFFSET
      const s = getFrameSize(i)
      result.push({ z, W: s.W, H: s.H, layerIndex: i })
    }
    return result
  }, [])

  // Physical material so the bars react to the studio HDRI + directional/spot lights — low
  // roughness + clearcoat gives a glossy plastic finish; envMapIntensity controls how much of the
  // environment reflection shows up on the rounded edges. Transmission + thickness + ior add a
  // translucent-plastic feel similar to the album cover, so light passes partially through.
  // Note: metalness is 0 because transmission has no effect on metal — they're mutually exclusive
  // physically, and Three.js mostly ignores transmission when metalness is high.
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#d7d9de',
    roughness: 0.35,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
    sheen: 0.5,
    transmission: 0.45,
    thickness: 0.4,
    ior: 1.45,
    transparent: true,
  }), [])

  return (
    <>
      {frames.map((f, i) => {
        // Text/glass frames render NO bars now — the glass pane sits in the wall hole on
        // its own, naked, per user request. Image frames still get the puffy bar border.
        if (TEXT_LAYER_INDICES.has(f.layerIndex)) return null
        // Puffy bars: thicker cross-section + RoundedBox with radius ≈ half the thickness so the
        // edges round to a near-pill profile. The bar ends are also rounded, but they sit inside the
        // t × t overlap region at each frame corner (each pair of bars crosses by `t`), so the
        // rounded ends are fully hidden — meeting corners read as clean right angles, free corners
        // read as soft and puffy.
        const t = 0.4
        const radius = 0.08
        // Each bar is extended by `t` along its length so its ends reach the OUTER corner of the
        // frame, not just the cross-bar's center. Without this extension the bars leave a t/2 × t/2
        // notch at each outer corner — visible as a gap that gives away the separate-mesh seams.
        // Group offset bumped to 0.30 (was 0.12) so the bar's back face clears the image plane's
        // z extent and its front face sits further forward — image now reads as deeply recessed.
        return (
          <group key={i} position={[0, 0, f.z + 0.50]}>
            <RoundedBox material={mat} position={[0, f.H / 2, 0]} args={[f.W + t, t, t]} radius={radius} smoothness={4} />
            <RoundedBox material={mat} position={[0, -f.H / 2, 0]} args={[f.W + t, t, t]} radius={radius} smoothness={4} />
            <RoundedBox material={mat} position={[-f.W / 2, 0, 0]} args={[t, f.H + t, t]} radius={radius} smoothness={4} />
            <RoundedBox material={mat} position={[f.W / 2, 0, 0]} args={[t, f.H + t, t]} radius={radius} smoothness={4} />
          </group>
        )
      })}
    </>
  )
}

// Bakes a "soft shadow rectangle" into a CanvasTexture. A solid black rect is drawn into a padded
// transparent canvas while ctx.filter has gaussian blur active — the result is a real smooth
// falloff (not a stack of stepped rectangles). Used by FocusAid + CornerMarkers below as a one-off
// blurred plane behind each line.
function makeSoftShadowTexture(planeW: number, planeH: number, rectW: number, rectH: number, blurPx: number, opacity: number) {
  const PX_PER_UNIT = 64
  const cw = Math.max(64, Math.round(planeW * PX_PER_UNIT))
  const ch = Math.max(64, Math.round(planeH * PX_PER_UNIT))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  ctx.filter = `blur(${blurPx}px)`
  ctx.fillStyle = `rgba(0,0,0,${opacity})`
  const rw = rectW * PX_PER_UNIT
  const rh = rectH * PX_PER_UNIT
  ctx.fillRect((cw - rw) / 2, (ch - rh) / 2, rw, rh)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function FocusAid() {
  const z = -CONTENT_OFFSET + 9
  const stroke = 0.07
  // Soft drop shadow planes — one per bar, sized larger than the line so the gaussian halo has
  // room to fade out. 14px blur in the texture canvas reads as a low-opacity diffuse glow.
  const horizShadowTex = useMemo(() => makeSoftShadowTexture(5, 0.9, 4, stroke, 14, 0.18), [])
  const vertShadowTex  = useMemo(() => makeSoftShadowTexture(0.9, 5, stroke, 4, 14, 0.18), [])
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0, -0.005]} raycast={() => null}>
        <planeGeometry args={[5, 0.9]} />
        <meshBasicMaterial map={horizShadowTex} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -0.005]} raycast={() => null}>
        <planeGeometry args={[0.9, 5]} />
        <meshBasicMaterial map={vertShadowTex} transparent depthWrite={false} />
      </mesh>
      {/* white cross */}
      <mesh position={[0, 0, 0.001]}>
        <boxGeometry args={[4, stroke, 0.07]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <boxGeometry args={[stroke, 4, 0.07]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

function TunnelLines() {
  const W = FRAME_W
  const H = FRAME_H
  const t = 0.05

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#524f4d',
    transparent: true,
    opacity: 0.5,
  }), [])

  const startZ = -(1) * LAYER_SPACING - CONTENT_OFFSET
  const endZ = -(TOTAL_LAYERS) * LAYER_SPACING - CONTENT_OFFSET
  const totalLength = Math.abs(endZ - startZ)
  const midZ = (startZ + endZ) / 2

  const corners = [
    [-W / 2,  H / 2],
    [ W / 2,  H / 2],
    [-W / 2, -H / 2],
    [ W / 2, -H / 2],
  ]

  return (
    <>
      {corners.map(([x, y], i) => (
        <mesh key={i} material={mat} position={[x, y, midZ]}>
          <boxGeometry args={[t, t, totalLength]} />
        </mesh>
      ))}
    </>
  )
}

function CornerMarkers() {
  // Pinned to an absolute z (not tied to CONTENT_OFFSET) so the markers stay at a fixed distance
  // from the camera — they're a viewport-corner UI element, not part of the scrollable content.
  // X=15 / Y=10 only fits inside the frustum at this distance.
  const z = -16
  const t = 0.12
  const d = 0.01
  const len = 2
  const X = 15
  const Y = 10
  // Soft shadow planes baked once, reused across all 4 corners (one for the horizontal bar
  // direction, one for the vertical) — true gaussian falloff via canvas blur.
  const horizShadowTex = useMemo(() => makeSoftShadowTexture(len + 1, 1, len, t, 14, 0.18), [])
  const vertShadowTex  = useMemo(() => makeSoftShadowTexture(1, len + 1, t, len, 14, 0.18), [])

  const corners = [
    { x:  X, y:  Y, sx:  1, sy:  1 },
    { x: -X, y:  Y, sx: -1, sy:  1 },
    { x:  X, y: -Y, sx:  1, sy: -1 },
    { x: -X, y: -Y, sx: -1, sy: -1 },
  ]

  return (
    <group position={[0, 0, z]}>
      {corners.map(({ x, y, sx, sy }, i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh position={[-sx * len / 2.2, 0, -0.005]} raycast={() => null}>
            <planeGeometry args={[len + 1, 1]} />
            <meshBasicMaterial map={horizShadowTex} transparent depthWrite={false} />
          </mesh>
          <mesh position={[0, -sy * len / 2, -0.005]} raycast={() => null}>
            <planeGeometry args={[1, len + 1]} />
            <meshBasicMaterial map={vertShadowTex} transparent depthWrite={false} />
          </mesh>
          <mesh position={[-sx * len / 2.2, 0, 0]}>
            <boxGeometry args={[len, t, d]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, -sy * len / 2, 0]}>
            <boxGeometry args={[t, len, d]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// In-scene blinking "(scroll)" hint, anchored at the same z plane as the front room frame so it
// reads as part of the world. Subscribes to ScrollControls directly via `useScroll`, so its
// opacity decays smoothly with scroll progress without any state round-trip to the parent.
function ScrollHint() {
  const divRef = useRef<HTMLDivElement>(null)
  const scroll = useScroll()
  useFrame(() => {
    if (!divRef.current) return
    // Full fade-out over the first ~5% of scroll — the cue disappears as the user begins moving.
    const t = scroll.offset
    divRef.current.style.opacity = String(Math.max(0, Math.min(1, 1 - t * 20)))
  })
  return (
    <Html
      // Hint sits at distance 18 from the camera regardless of where CAMERA_START_Z is —
      // keeps the on-screen size consistent if the camera start is tuned. y is in the
      // upper half so it reads at the top of the page above the typewriter text.
      position={[0, 6, CAMERA_START_Z - 18]}
      transform
      distanceFactor={6}
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={divRef}
        style={{
          fontFamily: "'coral-pixels', sans-serif",
          fontSize: '60px',
          letterSpacing: '0.12em',
          color: 'rgba(58, 56, 53, 0.6)',
          whiteSpace: 'nowrap',
          animation: 'blink 1.2s step-end infinite',
        }}
      >
        (scroll)
      </div>
    </Html>
  )
}

function createInnerShadowTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)

  const leftGrad = ctx.createLinearGradient(0, 0, size * 0.5, 0)
  leftGrad.addColorStop(0,   'rgba(180,175,170,0.75)')
  leftGrad.addColorStop(0.5, 'rgba(180,175,170,0.15)')
  leftGrad.addColorStop(1,   'rgba(180,175,170,0)')
  ctx.fillStyle = leftGrad
  ctx.fillRect(0, 0, size, size)

  const rightGrad = ctx.createLinearGradient(size, 0, size * 0.5, 0)
  rightGrad.addColorStop(0,   'rgba(180,175,170,0.75)')
  rightGrad.addColorStop(0.5, 'rgba(180,175,170,0.15)')
  rightGrad.addColorStop(1,   'rgba(180,175,170,0)')
  ctx.fillStyle = rightGrad
  ctx.fillRect(0, 0, size, size)

  const topGrad = ctx.createLinearGradient(0, 0, 0, size * 0.5)
  topGrad.addColorStop(0,   'rgba(86,87,82,0.75)')
  topGrad.addColorStop(0.5, 'rgba(180,175,170,0.15)')
  topGrad.addColorStop(1,   'rgba(180,175,170,0)')
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, size, size)

  const botGrad = ctx.createLinearGradient(0, size, 0, size * 0.5)
  botGrad.addColorStop(0,   'rgba(180,175,170,0.95)')
  botGrad.addColorStop(0.5, 'rgba(180,175,170,0.35)')
  botGrad.addColorStop(1,   'rgba(180,175,170,0)')
  ctx.fillStyle = botGrad
  ctx.fillRect(0, 0, size, size)

  return new THREE.CanvasTexture(canvas)
}

function WallImage({ url, position, rotationY }: {
  url: string
  position: [number, number, number]
  rotationY: number
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const overlayTex = useMemo(() => createInnerShadowTexture(), [])
  const meshRef = useRef<THREE.Mesh>(null)
  const overlayRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const baseOpacity = 0.95
  // Image fills the entire (image-sized) frame — no scale-down, no random center offset.
  const imgW = IMG_FRAME_W
  const imgH = IMG_FRAME_H

  useFrame((_, delta) => {
    const dist = Math.abs(camera.position.z - position[2])
    // smoothstep gives an S-curve fade-in over the same distance range as the old
    // linear ramp ((dist - 2) / 8), so the image eases in/out instead of stepping
    // linearly between invisible and fully present.
    const fade = THREE.MathUtils.smoothstep(dist, 2, 10)
    const imageOpacity = baseOpacity * fade
    // Hide the inner-shadow overlay entirely if this frame sits behind any other frame
    // from the camera's POV — i.e. there exists another frame with z strictly between
    // this one's z and the camera's z.
    const thisZ = position[2]
    const camZ = camera.position.z
    const isBehindAnother = ALL_FRAME_ZS.some(z => z > thisZ && z < camZ)
    const overlayTarget = isBehindAnother ? 0 : imageOpacity
    // Lerp the overlay toward its target so the camera crossing a frame's z plane
    // doesn't snap the highlights/shadows back on. ~0.5s time constant (delta * 2)
    // for a gentle swell rather than a quick reveal.
    const k = Math.min(1, delta * 2)
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshPhysicalMaterial).opacity = imageOpacity
    }
    if (overlayRef.current) {
      const m = overlayRef.current.material as THREE.MeshBasicMaterial
      m.opacity += (overlayTarget - m.opacity) * k
    }
  })

  useEffect(() => {
    new THREE.TextureLoader().load(url, tex => {
      tex.colorSpace = THREE.SRGBColorSpace
      const frameAspect = IMG_FRAME_W / IMG_FRAME_H
      const img = tex.image as { width: number; height: number }
      const imgAspect = img.width / img.height
      if (imgAspect > frameAspect) {
        tex.repeat.set(frameAspect / imgAspect, 1)
        tex.offset.set((1 - frameAspect / imgAspect) / 2, 0)
      } else {
        tex.repeat.set(1, imgAspect / frameAspect)
        tex.offset.set(0, (1 - imgAspect / frameAspect) / 2)
      }
      setTexture(tex)
    })
  }, [url])

  if (!texture) return null

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[imgW, imgH, 0.18]} />
        <meshPhysicalMaterial
          map={texture}
          roughness={0}
          clearcoat={0}
          clearcoatRoughness={0.1}
          ior={1.45}
          thickness={0.8}
          envMapIntensity={0}
          reflectivity={0.15}
          transparent
          opacity={baseOpacity}
          transmission={0.1}
          depthWrite={false}
          color="#9d9e98"
        />
      </mesh>
      <mesh ref={overlayRef} position={[0, 0, 0.15]}>
        <planeGeometry args={[imgW, imgH]} />
        <meshBasicMaterial
          map={overlayTex}
          transparent
          opacity={baseOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

// Layers that should render WITHOUT a WallImage — same set as TEXT_LAYER_INDICES (they're the
// text frames, which have a glass+text panel instead of an image). Aliased so the name reads
// naturally at the call site.
const EMPTY_IMAGE_LAYERS = TEXT_LAYER_INDICES

function WallImages({ images }: { images: string[] }) {
  const items = useMemo(() => {
    if (images.length === 0) return []
    const shuffled = [...images].sort(() => Math.random() - 0.5)
    const layered = Array.from({ length: TOTAL_LAYERS }, (_, i) => {
      const url = shuffled[i % shuffled.length]
      const z = -(i + 1) * LAYER_SPACING - CONTENT_OFFSET
      return { key: `layer-${i}`, url, position: [0, 0, z] as [number, number, number], layerIndex: i }
    }).filter(item => !EMPTY_IMAGE_LAYERS.has(item.layerIndex))
    return layered
  }, [images])

  return (
    <>
      {items.map((item) => (
        <WallImage key={item.key} url={item.url} position={item.position} rotationY={0} />
      ))}
    </>
  )
}

// In-frame text overlays — rendered with drei `<Text>` (Troika SDF mesh) for proper 3D depth and
// no scroll drift. Same loading pattern as the old TypewriterText: local TTF font file. The local
// Bitcount file in /public/fonts is the same one Google Fonts serves for this family, so this
// matches the Typekit-style rendering without any cross-origin fetch.
const FRAME_TEXTS: Array<{ layerIndex: number; text: string }> = [
  { layerIndex: 0, text: 'What would your memories look like if they have never been lived, never been felt?' },
  { layerIndex: 2, text: 'What would life look like if only experienced as data, not as sensation?' },
]

// Soft white inner-glow texture for the bottom of the text frames — a vertical linear gradient
// (white-alpha at bottom, transparent at top) drawn through a gaussian filter so the falloff
// reads as truly blurred light, not a hard band.
function createBottomGlowTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'blur(28px)'
  // Stop 0 sits at the canvas BOTTOM (high y); stop 1 is partway up — gives a localised glow
  // hugging the lower edge rather than washing the whole pane.
  const grad = ctx.createLinearGradient(0, size, 0, size * 0.45)
  grad.addColorStop(0, 'rgba(255,255,255,0.85)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// One per text frame — handles the typewriter animation + fade as the camera approaches and
// passes the frame's z. Rendered via drei `<Html transform>` so the font comes from the Typekit
// `coral-pixels` CSS family already loaded on this page (Troika `<Text>` can't load CSS-only
// fonts). Drift from CSS3D positioning is acceptable here because the text is only visible during
// a narrow scroll window.
// Fixed-position screen overlay for one text frame. Lives OUTSIDE the canvas — drei `<Html>`
// anchored to a 3D position becomes invisible once the camera passes that point in z (the
// projection goes behind the camera), which was the actual reason text only showed on back-scroll.
// As a DOM-level overlay, it stays visible regardless of camera depth; we drive its opacity +
// translate via a requestAnimationFrame loop that reads the parent's `camZRef`.
function FrameTextOverlay({ text, frameZ, appearAfterZ, camZRef, typingLockRef, onTypingComplete }: {
  text: string
  frameZ: number
  appearAfterZ: number
  camZRef: React.RefObject<number>
  typingLockRef: React.RefObject<number>
  onTypingComplete?: () => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Tracks whether THIS overlay currently holds a slot in the shared lock counter, so
  // increments and decrements stay balanced even across reset/restart cycles.
  const heldLockRef = useRef(false)

  useEffect(() => {
    let rafId = 0
    // Trigger distance from the text frame. Previously this was the full LAYER_SPACING (45),
    // which meant typing started while the camera was still at the *previous* image frame's
    // plane — way too early. Using a small fixed value here puts both text frames at the same
    // close distance from their frame when typing+lock engages.
    const ENTER = 18
    const FAR_PAST = -10

    // Releases this overlay's slot in the shared scroll-lock counter, if it holds one.
    // Idempotent — safe to call multiple times. Used by reset() and by the typing-complete
    // branch so the lock decrements no matter which path we exit through.
    function releaseLock() {
      if (heldLockRef.current) {
        heldLockRef.current = false
        typingLockRef.current = Math.max(0, typingLockRef.current - 1)
      }
    }

    function reset() {
      startedRef.current = false
      releaseLock()
      if (divRef.current) divRef.current.textContent = ''
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    function tick() {
      if (divRef.current && camZRef.current !== null) {
        const distance = camZRef.current - frameZ
        let opacity = 0
        let translateY = 0

        if (distance >= ENTER) {
          // Too far — hidden. Reset so every fresh approach replays from char 1.
          opacity = 0
          if (startedRef.current) reset()
        } else if (distance > 0) {
          if (!startedRef.current) {
            startedRef.current = true
            // Engage the shared scroll lock — ScrollScene will pin scroll + camera position
            // until this overlay's typing completes (or the user back-scrolls out and reset()
            // releases the lock).
            if (!heldLockRef.current) {
              heldLockRef.current = true
              typingLockRef.current += 1
            }
            let i = 0
            if (divRef.current) divRef.current.textContent = ''
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = setInterval(() => {
              i++
              if (divRef.current) divRef.current.textContent = text.slice(0, i)
              if (i >= text.length && intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
                // Release the scroll lock once the full sentence is typed out.
                releaseLock()
                // Signal parent so it can show its "(scroll)" hint. Only fires on NATURAL
                // completion (not on reset/back-scroll abort).
                onTypingComplete?.()
              }
            }, 55)
          }
          // Simple distance-based fade: opacity is 1 while the camera is more than FADE_START
          // units from the frame, then ramps linearly to 0 over the last FADE_START units of
          // the approach. Replaces the previous geometry-driven pull-down (frame-bottom sweep)
          // because that math only works when the text is BELOW frame center — couldn't
          // accommodate a centered-on-frame text position. translateY stays at 0 so the text
          // doesn't slide; it just fades in place.
          const FADE_START = 12
          opacity = distance > FADE_START ? 1 : distance / FADE_START
          translateY = 0
        } else if (distance > FAR_PAST) {
          opacity = 0
          translateY = 0
        } else {
          if (startedRef.current) reset()
          opacity = 0
          translateY = 0
        }

        divRef.current.style.opacity = String(opacity)
        divRef.current.style.transform = `translate3d(-50%, ${translateY}px, 0)`
        divRef.current.style.visibility = opacity > 0 ? 'visible' : 'hidden'
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      if (intervalRef.current) clearInterval(intervalRef.current)
      // Release the lock if this overlay still holds one (e.g. unmount mid-typing during a
      // route transition). Without this the counter would leak and scroll would stay locked
      // for the lifetime of the page.
      if (heldLockRef.current) {
        heldLockRef.current = false
        typingLockRef.current = Math.max(0, typingLockRef.current - 1)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camZRef, frameZ, appearAfterZ, text, typingLockRef, onTypingComplete])

  return (
    <div
      ref={divRef}
      style={{
        position: 'fixed',
        // Top-anchored so the div grows downward as typing adds lines — prevents the
        // center-pivot reflow that made text appear to split during the typewriter animation.
        top: '80%',
        left: '50%',
        // translate3d (not translateX) + willChange promote the element to its own GPU layer.
        // Without this, every frame's sub-pixel translateY causes the glyphs to be re-rasterised
        // on the CPU and the previous frame's raster lingers a composite step behind — visible
        // as a ghost "second copy" that fades slightly after the real text.
        transform: 'translate3d(-50%, 0, 0)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        visibility: 'hidden',
        zIndex: 20,
        pointerEvents: 'none',
        fontFamily: "'coral-pixels', sans-serif",
        fontSize: '28px',
        color: 'rgba(58, 56, 53, 0.95)',
        letterSpacing: '0.02em',
        lineHeight: 1.4,
        width: '540px',
        textAlign: 'center',
        opacity: 0,
        whiteSpace: 'pre-wrap',
        transition: 'none',
      }}
    />
  )
}

// Default opacities for the glass pane + bottom glow on a text frame. Behind-frame values
// kick in when another frame sits between this one and the camera, dimming the plastic
// glass so it doesn't read as a stack of panes layered through the foreground.
const COVER_OPACITY_FRONT = 0.65
const COVER_OPACITY_BEHIND = 0.05
const GLOW_OPACITY_FRONT = 0.9
const GLOW_OPACITY_BEHIND = 0.15

function TextFramePane({ frameZ, bottomGlowTex }: {
  frameZ: number
  bottomGlowTex: THREE.CanvasTexture
}) {
  const { camera } = useThree()
  const coverRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  // Per-instance material so each pane can drive its own opacity. Same recipe BookComponents
  // uses for the album cover body — translucent plastic via MeshPhysicalMaterial.
  const coverMat = useMemo(() => {
    const baseColor = new THREE.Color('#fafeff')
    const finalColor = baseColor.clone().lerp(new THREE.Color('#7a7d82'), 0.85)
    return new THREE.MeshPhysicalMaterial({
      color: finalColor,
      transparent: true,
      opacity: COVER_OPACITY_FRONT,
      // Higher roughness + transmission make the pane read as frosted glass: light scatters
      // diffusely (roughness 0.85, was 0.45) and the material genuinely transmits the wall
      // texture behind it (transmission 0.6, was implicitly 0). ior + thickness control the
      // refraction depth for a soft "thick glass" feel.
      roughness: 0.85,
      metalness: 0,
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.45,
      clearcoat: 0.15,
      clearcoatRoughness: 0.6,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthWrite: false,
    })
  }, [])

  useFrame((_, delta) => {
    const isBehind = ALL_FRAME_ZS.some(z => z > frameZ && z < camera.position.z)
    const targetCover = isBehind ? COVER_OPACITY_BEHIND : COVER_OPACITY_FRONT
    const targetGlow  = isBehind ? GLOW_OPACITY_BEHIND  : GLOW_OPACITY_FRONT
    // Lerp toward the target — ~0.5s time constant (delta * 2) so the dim/restore
    // matches the gentle swell on the inner-shadow overlay in WallImage.
    const k = Math.min(1, delta * 2)
    if (coverRef.current) {
      const m = coverRef.current.material as THREE.MeshPhysicalMaterial
      m.opacity += (targetCover - m.opacity) * k
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial
      m.opacity += (targetGlow - m.opacity) * k
    }
  })

  return (
    <group position={[0, 0, frameZ]}>
      <mesh ref={coverRef} material={coverMat} position={[0, 0, 0.15]}>
        <planeGeometry args={[FRAME_W, FRAME_H]} />
      </mesh>
      <mesh ref={glowRef} position={[0, 0, 0.17]} raycast={() => null}>
        <planeGeometry args={[FRAME_W, FRAME_H]} />
        <meshBasicMaterial
          map={bottomGlowTex}
          transparent
          opacity={GLOW_OPACITY_FRONT}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function FrameTexts() {
  // One bottom-glow CanvasTexture shared across panes — read-only after creation, so a
  // single instance is safe.
  const bottomGlowTex = useMemo(() => createBottomGlowTexture(), [])
  return (
    <>
      {FRAME_TEXTS.map(({ layerIndex }) => {
        const frameZ = -(layerIndex + 1) * LAYER_SPACING - CONTENT_OFFSET
        // Glass pane + bottom glow only — the actual text is rendered as a fixed-position DOM
        // overlay (FrameTextOverlay) outside the canvas tree.
        return (
          <TextFramePane
            key={layerIndex}
            frameZ={frameZ}
            bottomGlowTex={bottomGlowTex}
          />
        )
      })}
    </>
  )
}

function ScrollScene({ images, onScrollProgress, typingLockRef, scrollArmedRef }: {
  images: string[]
  onScrollProgress: (t: number) => void
  typingLockRef: React.RefObject<number>
  scrollArmedRef: React.RefObject<boolean>
}) {
  const scroll = useScroll()
  const { camera } = useThree()
  const totalDepth = (TOTAL_LAYERS + 3) * LAYER_SPACING * 1.2
  // Snapshots of the last UN-locked scroll/camera state. While the lock is engaged
  // (typingLockRef.current > 0 OR scrollArmedRef.current) the useFrame below forces both
  // back to these values every tick. Captured every frame while unlocked so the lock
  // engages at whatever position triggered typing.
  const lockedScrollTopRef = useRef(0)
  const lockedCamZRef = useRef(CAMERA_START_Z)

  useFrame((_, delta) => {
    // Lock engaged in two cases:
    //   1. Typing in progress (typingLockRef.current > 0)
    //   2. Typing just finished but user hasn't scrolled yet (scrollArmedRef.current)
    // The armed-but-waiting state means the lock only releases when the user's first wheel
    // event fires — same gesture that drives the next scroll, so there's no perceptible
    // "jump" between typing completion and scroll resumption.
    const locked = typingLockRef.current > 0 || scrollArmedRef.current
    if (locked) {
      // Hard-pin while locked — no lerp needed; we want it stable, not catching up.
      camera.position.z = lockedCamZRef.current
      camera.position.y = 0
      camera.position.x = 0
      if (scroll.el) scroll.el.scrollTop = lockedScrollTopRef.current
      return
    }
    const t = scroll.offset
    const targetZ = CAMERA_START_Z - t * totalDepth
    // Lerp the camera toward the scroll-driven target instead of snapping. Time constant
    // ≈400ms (delta * 2.5) so the locked→unlocked transition eases in over almost half a
    // second rather than snapping to the new target. Combined with the increased
    // ScrollControls damping (0.45), the camera glides back to following the scroll.
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, Math.min(1, delta * 2.5))
    camera.position.y = 0
    camera.position.x = 0
    // Report the ACTUAL (lerped) camera z, not the scroll target. Otherwise the FrameTextOverlay
    // triggers and the "Find out" trigger fire based on where the camera is headed — which lags
    // ~400ms behind the visible camera position with the current lerp + damping, so the overlays
    // appear before the user has actually reached those points visually.
    onScrollProgress(camera.position.z)
    // Snapshot the actual (lerped) camera position so the lock re-engages from exactly
    // where the camera currently is. The first text frame lands while the camera is
    // still catching up to targetZ — capturing that lagged position makes the third
    // frame's lock pin in the same relative spot, so both frame endings look identical.
    lockedCamZRef.current = camera.position.z
    if (scroll.el) lockedScrollTopRef.current = scroll.el.scrollTop
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      {/* Two angled directional lights — primary key from upper-right, secondary fill from
          upper-left — give the glossy/clearcoat bars a clear specular streak rather than a flat
          look. Lowering ambient lets the highlights stand out instead of being washed flat. */}
      <directionalLight position={[6, 8, 6]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-6, 6, 4]} intensity={0.7} color="#fff8ea" />
      <Environment preset="studio" />
      {/* Temporarily disabled — bring back when needed. */}
      {/* <FocusAid /> */}
      {/* <CornerMarkers /> removed — the front image frame that used to sit at the corner-marker plane was also removed; the first frame is now the text frame at layerIndex 0. */}
      <ScrollHint />
      <WallSurfaces />
      <RoomFrames />
      <FrameTexts />
      {/* <TunnelLines /> — dark corner-to-corner connectors removed; bring back if needed. */}
      <WallImages images={images} />
      <spotLight
        position={[-8, 12, -CONTENT_OFFSET + 8]}
        angle={0.3}
        penumbra={0.8}
        intensity={4}
        color="#ffffff"
      />
    </>
  )
}

function ExploreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tintColor] = useState(() => searchParams.get('tint') ?? PALETTE[Math.floor(Math.random() * PALETTE.length)])
  const [images, setImages] = useState<string[]>([])
  const [showFindOut, setShowFindOut] = useState(false)
  const [findOutHovered, setFindOutHovered] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  // Static background — always /background.png so the backdrop matches the landing page
  // (and the "Find out" handoff at the end of the tunnel reads as continuous).
  const backgroundUrl = '/background.png'
  // Live camera-z, updated every frame by handleScrollProgress. Used by FrameTextOverlay's rAF
  // loop to drive the typewriter and the pull-down without re-rendering the parent.
  const camZRef = useRef(CAMERA_START_Z)
  // Scroll-lock counter — incremented when a FrameTextOverlay starts typing, decremented
  // when it finishes (or resets on back-scroll). ScrollScene reads this every frame and
  // freezes the scroll DOM + camera while the count > 0.
  const typingLockRef = useRef(0)
  // "Armed but waiting" state — true when typing has finished but the user hasn't started
  // scrolling again yet. ScrollScene keeps the camera + scroll frozen while this is true,
  // so the camera CAN'T jump on typing-end; the lock only releases when the user's first
  // wheel/touchmove input arrives, which is the same gesture that drives the next scroll.
  const scrollArmedRef = useRef(false)
  // Shown at the top of the viewport each time a sentence finishes typing — disappears
  // again the moment the user scrolls. Hint copy is "(scroll)", same visual voice as
  // the landing page's "(click an album)".
  const [showScrollHint, setShowScrollHint] = useState(false)

  // Dismiss both the hint and the armed lock on the user's first scroll input. Wheel/touch
  // listeners stay attached for the lifetime of the page so a back-scroll during the armed
  // window also releases cleanly. Passive — we're observing, not preventing.
  useEffect(() => {
    function dismiss() {
      scrollArmedRef.current = false
      setShowScrollHint(false)
    }
    window.addEventListener('wheel', dismiss, { passive: true })
    window.addEventListener('touchmove', dismiss, { passive: true })
    return () => {
      window.removeEventListener('wheel', dismiss)
      window.removeEventListener('touchmove', dismiss)
    }
  }, [])

  function handleFindOutClick() {
    setFadingOut(true)
    // Wait for the full white-sheet fade-in (1.2s, matching the album page's loadFadingIn
    // fade-out duration) before navigating, so the handoff is page → white → page.
    setTimeout(() => {
      router.push(`/album?tint=${encodeURIComponent(tintColor)}`)
    }, 1200)
  }

  function handleBackClick() {
    setFadingOut(true)
    setTimeout(() => {
      router.push('/')
    }, 1200)
  }

  function handleScrollProgress(camZ: number) {
    camZRef.current = camZ
    const lastFrameZ = -(TOTAL_LAYERS) * LAYER_SPACING - CONTENT_OFFSET
    setShowFindOut(camZ < lastFrameZ + 15)
  }

  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then(d => setImages(d.images ?? []))
      .catch(console.error)
  }, [])

  return (
    <>
      <link rel="stylesheet" href="https://use.typekit.net/aex0tjt.css" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single+Cursive:wght@100..900&display=swap');
        @font-face { font-family: 'BitcountGridSingle_Roman-Medium'; src: url('/fonts/BitcountGridSingle_Roman-Medium.ttf') format('truetype'); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #d5d5d7; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes softBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>

      {/* Blurred-thumbnail backdrop — mirrors the landing page so the transition reads as
          continuous. Only renders once a real Supabase thumbnail URL arrives. */}
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

      <div style={{ position: 'fixed', inset: 0 }}>
        <Canvas
          // rotation: [0, 0, 0] is REQUIRED. @react-three/fiber v9 auto-calls
          // camera.lookAt(0, 0, 0) on the default camera when no rotation prop is
          // present — that flips a camera at (0, 0, CAMERA_START_Z) (negative z) to
          // face +z (toward origin), which reversed the whole tunnel. Providing an
          // explicit rotation suppresses the auto-lookAt; default rotation (0,0,0)
          // keeps the camera looking in −z, which is what every frame z assumes.
          camera={{ position: [0, 0, CAMERA_START_Z], rotation: [0, 0, 0], fov: 55 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
          // Clear the WebGL framebuffer to WHITE (alpha 0 keeps the canvas transparent for the body
          // background to still show through unrendered margins). The transmission render target
          // inherits this clear color — so translucent bars + the dark-grey glass pane in text
          // frames now sample white behind them instead of the default black, fixing the
          // "frame 2 border reads as black" issue when viewing through frame 1.
          onCreated={({ gl }) => gl.setClearColor('#ffffff', 0)}
        >
          <Suspense fallback={null}>
            <ScrollControls pages={TOTAL_LAYERS + 10} damping={0.45}>
              <ScrollScene
                images={images}
                onScrollProgress={handleScrollProgress}
                typingLockRef={typingLockRef}
                scrollArmedRef={scrollArmedRef}
              />
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>

      <BackButton tintColor={tintColor} onClick={handleBackClick} hidden={fadingOut} />

      {/* Frame-text overlays — fixed-position DOM elements, NOT inside the Canvas. They drive
          their typewriter + opacity + pull-down purely off the live camZRef value, so they're
          unaffected by camera-behind-position issues that broke the previous <Html> approach. */}
      {FRAME_TEXTS.map(({ layerIndex, text }) => {
        const frameZ = -(layerIndex + 1) * LAYER_SPACING - CONTENT_OFFSET
        // For each text frame, the typewriter starts when the camera enters the slot
        // immediately in front of it. For layerIndex 0 (the new first frame) there is
        // no preceding frame, so this resolves to z = -CONTENT_OFFSET — the lip of the tunnel.
        const appearAfterZ = -(layerIndex) * LAYER_SPACING - CONTENT_OFFSET
        return (
          <FrameTextOverlay
            key={layerIndex}
            text={text}
            frameZ={frameZ}
            appearAfterZ={appearAfterZ}
            camZRef={camZRef}
            typingLockRef={typingLockRef}
            onTypingComplete={() => {
              // Show the "(scroll)" hint AND keep the camera/scroll frozen until the user
              // provides their first wheel/touchmove input. The wheel listener in
              // ExploreContent above clears both pieces of state in one shot.
              scrollArmedRef.current = true
              setShowScrollHint(true)
            }}
          />
        )
      })}

      {showFindOut && (
        <div
          onClick={handleFindOutClick}
          onMouseEnter={() => setFindOutHovered(true)}
          onMouseLeave={() => setFindOutHovered(false)}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: `translateX(-50%) translateY(-50%) scale(${findOutHovered ? 1.12 : 1})`,
            transformOrigin: 'center center',
            transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
            zIndex: 10,
            cursor: 'pointer',
            fontFamily: "'coral-pixels', sans-serif",
            fontWeight: 600,
            fontSize: '130px',
            letterSpacing: '0.01em',
            color: 'rgba(110, 108, 106, 0.5)',
            textShadow:
              '0px -2px 2px rgba(0,0,0,0.2),' +
              ' 0px 3px 5px rgba(255,255,255,1),' +
              ' 0px 5px 18px rgba(255,255,255,0.85),' +
              ' 0px 10px 36px rgba(255,255,255,0.55)',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            // fadeIn once on appearance, then soft-blink forever; fadingOut replaces both.
            animation: fadingOut
              ? 'fadeOut 0.8s ease forwards'
              : 'fadeIn 1.2s ease, softBlink 2.8s ease-in-out 1.2s infinite',
          }}
        >
          Find out
        </div>
      )}

      {/* "(scroll)" hint at the top of the viewport — fades in each time typing of a frame's
          sentence finishes, fades out the moment the user scrolls. Same visual recipe as the
          landing page's "(click an album)" hint so the affordance reads as one voice. */}
      <div style={{
        position: 'fixed', top: '6%', left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'coral-pixels', sans-serif",
        fontSize: '38px',
        letterSpacing: '0.10em',
        color: 'rgba(58,56,53,0.65)',
        textShadow:
          '0 0 8px rgba(255,255,255,1),' +
          ' 0 0 22px rgba(255,255,255,0.9),' +
          ' 0 0 45px rgba(255,255,255,0.6)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        zIndex: 25,
        opacity: showScrollHint && !fadingOut ? 1 : 0,
        transition: 'opacity 0.6s ease',
        animation: showScrollHint ? 'blink 1.2s step-end infinite' : 'none',
      }}>
        (scroll)
      </div>

      {/* Left-edge "albums" tab removed per user request — the corridor view stays clean. */}

      {/* White-sheet transition — flips opaque when "Find out" is clicked so the whole
          viewport fades to white over 1.2s. The album page mounts with its own white sheet
          at opacity 1 (loadFadingIn) and fades it back out, so the user experiences a
          continuous page → white → page handoff with no flash of either page mid-transition.
          Max zIndex so it covers everything including the Find out CTA. */}
      <div style={{
        position: 'fixed', inset: 0,
        background: '#ffffff',
        opacity: fadingOut ? 1 : 0,
        pointerEvents: fadingOut ? 'auto' : 'none',
        transition: 'opacity 1.2s ease',
        zIndex: 2147483647,
      }} />
    </>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  )
}
