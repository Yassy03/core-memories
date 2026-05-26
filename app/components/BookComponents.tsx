'use client'

import { useRef, useEffect, useMemo, useState, createContext, useContext } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'

const PageActiveContext = createContext<React.MutableRefObject<boolean>>({ current: false })

// Reusable aura-orb visual — a soft radial-gradient color blob with grain blended INTO
// the colors. Used in two places: as the ghost behind the closed cover (CoverPolaroidGhost)
// and as the focal element on leaf-1's front (replacing the polaroid image).
//
// Critical detail: the grain layer carries a mask-image that mirrors the gradient's falloff
// curve, so the noise only exists where there's color. Without that mask, the 500×500 grain
// rectangle blends with the cover/paper background everywhere, producing a visible noisy
// rectangle outline (the issue called out in user feedback). With the matched mask, the orb
// reads as seamless against any backdrop.
//
// Depends on the `coverOrbDrift` keyframe declared in app/album/page.tsx's <style> block;
// drei's <Html transform> renders into the document so the global keyframe is in scope.
export function AuraOrb({ color, outerColor, size = 500 }: { color: string; outerColor?: string; size?: number }) {
  const falloff = 'ellipse 50% 50% at 50% 50%'
  // Mask extends slightly past the gradient's transparent stop so the grain disappears
  // exactly where the color does — no visible rectangular bounding box. Larger radius
  // when there's an outer halo so the soft ring isn't clipped.
  const fadeMask = outerColor
    ? `radial-gradient(${falloff}, black 0%, transparent 78%)`
    : `radial-gradient(${falloff}, black 0%, transparent 60%)`
  // Two-tone gradient. Core stays solid out to 50% of the radius (was 30%) so the rim
  // band is narrower — 50%→78% instead of 30%→75%. Outer color carries an `b3` alpha
  // (~70%) at its peak stop, making the rim a subtle whisper rather than a hard ring.
  const gradient = outerColor
    ? `radial-gradient(${falloff}, ${color} 0%, ${color} 50%, ${outerColor}b3 62%, ${outerColor}00 78%)`
    : `radial-gradient(${falloff}, ${color} 20%, ${color}00 60%)`
  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: gradient,
        // saturate bumped 1.4 → 2.0 and a brightness lift to push the muted palette
        // colors toward the vivid look from the references. Composed AFTER the blur so
        // we're sampling the saturated post-blur pixels, not a pre-blur dim source.
        filter: 'blur(15px) saturate(2.0) brightness(1.12)',
        animation: 'coverOrbDrift 9s ease-in-out infinite',
        willChange: 'transform',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: '200px 200px',
        mixBlendMode: 'overlay',
        opacity: 0.75,
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

export function CoverPolaroidGhost({ coverGroup, orbColor, orbOuterColor }: { coverGroup: React.RefObject<THREE.Group | null>, orbColor?: string, orbOuterColor?: string }) {
  const divRef = useRef<HTMLDivElement>(null)

  useFrame(() => {
    if (!coverGroup.current || !divRef.current) return

    // The cover's rotation goes from -Math.PI (open) to 0 (closed)
    const rot = coverGroup.current.rotation.y

    // Only start fading the ghost in when the cover is almost completely shut (rot > -0.5).
    // Peak opacity is slightly higher for the orb (0.45 vs the polaroid's 0.28) because the
    // orb's radial-gradient + grain fades to transparent at its edges, so the *effective*
    // visible opacity is lower than the wrapper opacity suggests.
    const peak = orbColor ? 0.45 : 0.28
    let currentOpacity = 0
    if (rot > -0.5) {
      const multiplier = (rot + 0.5) / 0.5
      currentOpacity = peak * multiplier
    }

    divRef.current.style.opacity = currentOpacity.toString()
  })

  return (
    <Html transform distanceFactor={4} position={[2.95, 0.58, 0.005]} zIndexRange={[0, 0]}>
      {/* We set initial opacity to 0 and let useFrame handle it */}
      <div ref={divRef} style={{ pointerEvents: 'none', opacity: 0 }}>
        {orbColor ? (
          <AuraOrb color={orbColor} outerColor={orbOuterColor} size={580} />
        ) : (
          // Fallback: original polaroid ghost. Keeps it cheap to revert by simply not
          // passing `orbColor` from the album page.
          <img
            src="/placeholders/polaroid.png"
            style={{
              width: '420px',
              height: 'auto',
              // Note: static opacity removed so the div wrapper controls it!
              filter: 'blur(0.6px) brightness(1.05) saturate(0.65)',
            }}
          />
        )}
      </div>
    </Html>
  )
}


export function BinderRings() {
    return (
      <>
        {/* ── TARGETED HIGHLIGHT: Only hits the metal sheet ── */}
        {/* Positioned at x=0.02 (just in front of the sheet), fades out before hitting rings at x=0.15 */}
        <pointLight 
          position={[-5, 0, -0.1]} 
          intensity={4} 
          distance={0.12} 
          color="#ffffff" 
        />
  
        {/* ── Metal hardware base for the rings ── */}
        <group position={[-0.16, 0, -0.25]} rotation={[0, Math.PI / 2, 0]}>
          
          <RoundedBox args={[0.4, 4.6, 0.05]} radius={0.04} smoothness={4}>
            <meshStandardMaterial 
              color="#d0d0d0" 
              metalness={1} 
              roughness={0.15} 
            />
          </RoundedBox>
  
          {[-0.1, 0.1].map((x, i) => (
            <mesh key={`ridge-${i}`} position={[x, 0, 0.02]}>
              <boxGeometry args={[0.015, 4.5, 0.01]} />
              <meshStandardMaterial 
                color="#9a9a9a" 
                metalness={1} 
                roughness={0.3} 
              />
            </mesh>
          ))}
        </group>
  
          {/* ── Rivets (Raised circles connecting rings to the metal base) ── */}
        {[2.0, 1.4, -1.4, -2.0].map((y, i) => (
          // Positioned at x = -0.015 so they sit perfectly flush on the base plate
          // Rotated 90 degrees on the Z-axis to face outward
          <mesh key={`rivet-${i}`} position={[-0.1, y, -0.25]} rotation={[0, 0, Math.PI / 2]}>
            {/* args: [radiusTop, radiusBottom, height/thickness, radialSegments] */}
            <cylinderGeometry args={[0.07, 0.07, 0.07, 32]} />
            <meshStandardMaterial 
              color="#b8b8b8" 
              metalness={0.9} 
              roughness={0.25} 
            />
          </mesh>
        ))}
  
        {/* ── The Rings (Unaffected by the point light above) ── */}
        {[2.0, 1.4, -1.4, -2.0].map((y, i) => (
          <mesh key={i} position={[0.1, y, -0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.32, 0.03, 18, 32]} />
            <meshStandardMaterial color="#b8b8b8" metalness={0.9} roughness={0.25} />
          </mesh>
        ))}
  
        {/* ── External Rivet Heads (Outside the plastic spine) ── */}
        {/* Updated to map over all 4 ring positions */}
        {[2.0, 1.4, -1.4, -2.0].map((y, i) => (
          <mesh 
            key={`outer-rivet-${i}`} 
            position={[-0.245, y, -0.25]} 
            rotation={[0, 0, Math.PI / 2]}
            // This scale squashes the sphere flat to create a smooth, rounded dome
            scale={[1, 0.25, 1]} 
          >
            {/* Replaced cylinder with a sphere to get the perfectly rounded top */}
            <sphereGeometry args={[0.08, 32, 16]} />
            <meshStandardMaterial 
              color="#a0a0a0" 
              metalness={0.8} 
              roughness={0.4} 
            />
          </mesh>
        ))}
      </>
    )
  }

  export function BookGroup({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
    const ref = useRef<THREE.Group>(null)

    useEffect(() => {
      // Snap to the target on mount so pages that start with isOpen=true (e.g.
      // /comparative-study) don't play the closed→open slide animation. Pages
      // that start closed (landing, /album initial state) still get the slide
      // open behaviour because the useFrame lerp picks up from the initial -3.
      if (ref.current) ref.current.position.set(isOpen ? 0 : -3, 0, 0)
    }, [])

    useFrame((_, delta) => {
      if (!ref.current) return
      const targetX = isOpen ? 0 : -3
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 4 * delta)
    })
    return <group ref={ref}>{children}</group>
  }

  export function CoverOverlay({ currentLeafIndex, tintHex, showGhost = true, pageCount = 0, orbColor, orbOuterColor }: { currentLeafIndex: number, tintHex: string, showGhost?: boolean, pageCount?: number, orbColor?: string, orbOuterColor?: string }) {
    // Each leaf occupies ~0.005 in z when closed (from Page's z formula). After a buffer of ~6 leaves,
    // push the back cover further back and grow the spine to accommodate.
    const extraDepth = Math.max(0, (pageCount - 6) * 0.005)
    const backCoverZ = -0.6 - extraDepth
    const spineWidth = 0.6 + extraDepth
    const spineCenterZ = -0.3 - extraDepth / 2
    const group = useRef<THREE.Group>(null)
    const targetRotation = currentLeafIndex > 0 ? -Math.PI : 0

    // ── 1. Random Color Selection ──


    // Snap initial rotation to the target so pages mounting with currentLeafIndex>0
    // (e.g. /comparative-study) skip the flip-open animation. Pages that mount with
    // currentLeafIndex=0 still default to rotation 0, so the user-driven flip on
    // /album continues to animate via the useFrame lerp below.
    useEffect(() => {
      if (group.current) group.current.rotation.y = targetRotation
    }, [])

    useFrame((_, delta) => {
      if (!group.current) return
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        targetRotation,
        5 * delta,
      )
    })
  
    // ── 2. Generate the Cover Geometry AND the 3D Rim Curves ──
    const { coverGeometryWithSlot, backGeometry, rimCurves } = useMemo(() => {
      const cornerR = 0.18
      const depth = 0.06
      const bevel = 0.022

      const buildShape = (withHoles: boolean) => {
        const shape = new THREE.Shape()
        // Front cover is asymmetric (left edge at the spine hinge); back cover is symmetric.
        const leftEdge  = withHoles ? -3.2 : -3.0
        const rightEdge = withHoles ?  2.8 :  3.0
        const halfHeight = 6.4 / 2

        // Rectangle clockwise from top-left. Left-side corners stay square so the spine meets flush.
        shape.moveTo(leftEdge, halfHeight)
        shape.lineTo(rightEdge - cornerR, halfHeight)
        shape.absarc(rightEdge - cornerR, halfHeight - cornerR, cornerR, Math.PI / 2, 0, true)
        shape.lineTo(rightEdge, -halfHeight + cornerR)
        shape.absarc(rightEdge - cornerR, -halfHeight + cornerR, cornerR, 0, -Math.PI / 2, true)
        shape.lineTo(leftEdge, -halfHeight)
        shape.lineTo(leftEdge, halfHeight)

        if (withHoles) {
          const holeX = -2.9
          const holeRadius = 0.23
          const createStadiumPath = (yTop: number, yBottom: number) => {
            const hole = new THREE.Path()
            hole.moveTo(holeX - holeRadius, yTop)
            hole.absarc(holeX, yTop, holeRadius, Math.PI, 0, true)
            hole.lineTo(holeX + holeRadius, yBottom)
            hole.absarc(holeX, yBottom, holeRadius, 0, Math.PI, true)
            hole.lineTo(holeX - holeRadius, yTop)
            return hole
          }
          shape.holes.push(createStadiumPath(2.0, 1.4), createStadiumPath(-1.4, -2.0))
        }

        return shape
      }

      const frontShape = buildShape(true)
      const backShape  = buildShape(false)

      const extrudeSettings = {
        depth,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 4,
        curveSegments: 24,
      }

      // Front: extrude forward from z = 0 so the thickness lives in +z when closed.
      // After the cover rotates -π around Y to open, that thickness flips into -z,
      // away from where turned leaves stack (positive z). Prevents leaves from sinking
      // into the cover.
      const frontGeo = new THREE.ExtrudeGeometry(frontShape, extrudeSettings)
      frontGeo.translate(0, 0, bevel) // min Z lands at 0 in mesh frame

      // Back: center the slab on its position so the mesh placement matches the old plane.
      const backGeo = new THREE.ExtrudeGeometry(backShape, extrudeSettings)
      backGeo.translate(0, 0, -depth / 2)

      const createCurve3D = (path: THREE.Path) => {
        const points2D = path.getPoints(60)
        const points3D = points2D.map(p => new THREE.Vector3(p.x, p.y, 0))
        return new THREE.CatmullRomCurve3(points3D, true)
      }
      const rims = frontShape.holes.map(h => createCurve3D(h as THREE.Path))

      return {
        coverGeometryWithSlot: frontGeo,
        backGeometry: backGeo,
        rimCurves: rims,
      }
    }, [])
  
    // ── 3. Tinted Materials ──
    
    // ── 3. Tinted Materials ──
    const frontMat = useMemo(() => {
      const baseColor = new THREE.Color('#dde2de')
      // Increased from 0.15 to 0.60 to make the tint highly visible!
      const finalColor = baseColor.lerp(new THREE.Color(tintHex), 0.85)
  
      return new THREE.MeshPhysicalMaterial({
        color:              finalColor,
        transparent:        true,
        opacity:            0.45,
        roughness:          0.45,
        metalness:          0,
        clearcoat:          0.2,
        clearcoatRoughness: 0.4,
        side:               THREE.DoubleSide,
        toneMapped:         false,
        depthWrite:         false,
      })
    }, [tintHex])

    const backMat = useMemo(() => {
      const baseColor = new THREE.Color('#dde2de')
      const finalColor = baseColor.lerp(new THREE.Color(tintHex), 0.85)

      return new THREE.MeshPhysicalMaterial({
        color:       finalColor,
        transparent: true,
        opacity:     0.45,
        roughness:   0.45,
        metalness:   0,
        clearcoat:   0.2,
        side:        THREE.DoubleSide,
        toneMapped:  false,
        depthWrite:  false,
      })
    }, [tintHex])

    const spineMat = useMemo(() => {
      const baseColor = new THREE.Color('#cfd4cf')
      const finalColor = baseColor.lerp(new THREE.Color(tintHex), 0.85)

      return new THREE.MeshPhysicalMaterial({
        color:               finalColor,
        transparent:         true,
        opacity:             0.55,
        roughness:           0.08,
        metalness:           0,
        clearcoat:           0.3,
        toneMapped:          false,
        polygonOffset:       true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits:  1,
      })
    }, [tintHex])
  
    // ── 4. Render ──
    // ── 4. Render ──
    return (
      <>
        {/* ── Back cover ── */}
        <mesh position={[2.8, 0, backCoverZ]} material={backMat} geometry={backGeometry} />

        {/* ── Spine (with molded edges) — its z-thickness scales with pageCount so all leaves fit. */}
        <group position={[-0.2, 0, spineCenterZ]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={spineMat}>
            <boxGeometry args={[spineWidth, 6.4, 0.08]} />
          </mesh>
          <mesh position={[-spineWidth / 2, 0, -0.04]} material={spineMat}>
            <cylinderGeometry args={[0.025, 0.025, 6.4, 32]} />
          </mesh>
          <mesh position={[spineWidth / 2, 0, -0.04]} material={spineMat}>
            <cylinderGeometry args={[0.025, 0.025, 6.4, 32]} />
          </mesh>
        </group>
  
        {/* ── NEW: Stationary Ghost ── */}
        {/* Detached from the cover so it sits perfectly flat on the page underneath */}
        {showGhost && currentLeafIndex === 0 && (
            <group position={[-0.2, 0, 0.01]}> 
                <CoverPolaroidGhost coverGroup={group} orbColor={orbColor} orbOuterColor={orbOuterColor} />
            </group>
            )}
            
        {/* ── Front cover (with holes and rims) ── */}
        <group ref={group} position={[-0.2, 0, 0.01]}>
          {/* Notice the Ghost was removed from inside this rotating group! */}
          
          <mesh position={[3.2, 0, 0]} material={frontMat} geometry={coverGeometryWithSlot} renderOrder={2} />
  
          {rimCurves.map((curve, index) => (
            <mesh key={`rim-${index}`} position={[3.2, 0, 0.105]} material={frontMat}>
              <tubeGeometry args={[curve, 100, 0.015, 7, true]} />
            </mesh>
          ))}
        </group>
      </>
    )
  }

  // ── IMAGE PLANE ────────────────────────────────────────────────────────────────

// Composite-backdrop spec: when supplied, ImagePlane bakes a paper-texture background plus the album
// image (positioned in CSS-fraction coordinates) into a single canvas, then applies the gaussian blur
// over the whole composite. Used by the library page to fake "frosted glass over the entire page"
// when looking through the closed translucent cover.
export type ImagePlaneComposite = {
  backgroundUrl: string
  backgroundRotation?: number
  // Canvas dimensions in CSS pixels — should match the visible page area aspect.
  canvasSize: [number, number]
  imageFrame: {
    // Fractions of the canvas (0..1). `left`/`top` is the frame center, not the top-left.
    left: number
    top: number
    width: number
    aspectRatio: number  // width / height
    objectFitCover?: boolean
    scale?: number       // >1 zooms into the cropped image inside the frame
  }
}

export function ImagePlane({
  imageData,
  isMock,
  onHover,
  onUnhover,
  position = [2.8, 1.05, 0.033] as [number, number, number],
  size = [4.5, 3.6] as [number, number],
  blur,
  composite,
}: {
  imageData: string
  isMock: boolean
  onHover?: () => void
  onUnhover?: () => void
  position?: [number, number, number]
  size?: [number, number]
  // CSS pixels of gaussian blur to bake into the texture (via canvas ctx.filter).
  // Only sampled at texture-load time, so the value should be stable while the plane is mounted.
  blur?: number
  composite?: ImagePlaneComposite
}) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null)
    const progressRef = useRef(0)
    const meshRef = useRef<THREE.Mesh>(null)
  
    const material = useMemo(() => new THREE.ShaderMaterial({
      uniforms: {
        map:      { value: null },
        progress: { value: 0 },
        time:     { value: 0 },
      },
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float progress;
        uniform float time;
        varying vec2 vUv;
        void main() {
          vec4 col = texture2D(map, vUv);
          float alpha = smoothstep(0.0, 0.12, progress);
          float bleach = 0.0;
          vec2 lobe1 = vec2(0.85, 0.15);
          vec2 lobe2 = vec2(0.62, 0.58);
          float d1 = length(vUv - lobe1);
          float d2 = length(vUv - lobe2);
          float dist = min(d1, d2);
          float hotLife = smoothstep(0.45, 0.12, progress);
          bleach = hotLife * 0.85 * smoothstep(0.99, 0.0, dist);
          bleach = clamp(bleach, 0.0, 1.0);
          vec3 bleached = mix(col.rgb, vec3(1.0), bleach);
          gl_FragColor = vec4(bleached, alpha);
        }
      `,
    }), [])
   

    useEffect(() => {
        if (!imageData) return
        const src = imageData.startsWith('http') ? imageData : (isMock ? imageData : `data:image/png;base64,${imageData}`)

        // When a blur amount is requested, bake it into a CanvasTexture via ctx.filter — real gaussian
        // blur, no shader work. We only use this path while the through-cover preview is showing; once
        // the cover opens the library page swaps imageData to null and the HTML <img> takes over.
        const applyTexture = (tex: THREE.Texture, opts?: { repeat?: [number, number]; offset?: [number, number] }) => {
          tex.colorSpace = THREE.SRGBColorSpace
          const [rx, ry] = opts?.repeat ?? [0.5, 0.5]
          const [ox, oy] = opts?.offset ?? [0.075, 0.075]
          tex.repeat.set(rx, ry)
          tex.offset.set(ox, oy)
          tex.wrapS = THREE.ClampToEdgeWrapping
          tex.wrapT = THREE.ClampToEdgeWrapping
          material.uniforms.map.value = tex
          setTexture(tex)
          progressRef.current = 0
        }

        const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image()
          im.crossOrigin = 'anonymous'
          im.onload = () => resolve(im)
          im.onerror = reject
          im.src = url
        })

        // Composite path: bake background paper + image into a single canvas, blur the whole thing.
        if (composite) {
          Promise.all([loadImage(composite.backgroundUrl), loadImage(src)])
            .then(([bg, fg]) => {
              const [cw, ch] = composite.canvasSize
              // Sharp composite first — separate canvas — so the final blur smears layer transitions
              // together (otherwise per-layer blur would leave a visible boundary between paper and image).
              const c1 = document.createElement('canvas')
              c1.width = cw
              c1.height = ch
              const ctx1 = c1.getContext('2d')!

              // Paper background, optionally rotated around the canvas center to match the on-page
              // texture rotation. Stretch to fill the whole canvas regardless of the paper's aspect.
              ctx1.save()
              ctx1.translate(cw / 2, ch / 2)
              if (composite.backgroundRotation) ctx1.rotate(composite.backgroundRotation)
              const halfMax = Math.max(cw, ch) / 2
              ctx1.drawImage(bg, -halfMax, -halfMax, halfMax * 2, halfMax * 2)
              ctx1.restore()

              // Image frame, centered on the (left, top) fraction. width is a fraction of the canvas
              // width; height derived from aspectRatio so the frame stays the requested shape.
              const f = composite.imageFrame
              const frameW = cw * f.width
              const frameH = frameW / f.aspectRatio
              const frameX = cw * f.left - frameW / 2
              const frameY = ch * f.top - frameH / 2

              // object-fit: cover — crop the image to the frame's aspect, then optionally zoom further.
              let sx = 0, sy = 0, sw = fg.naturalWidth, sh = fg.naturalHeight
              if (f.objectFitCover) {
                const imgA = fg.naturalWidth / fg.naturalHeight
                const frameA = frameW / frameH
                if (imgA > frameA) {
                  sw = fg.naturalHeight * frameA
                  sx = (fg.naturalWidth - sw) / 2
                } else {
                  sh = fg.naturalWidth / frameA
                  sy = (fg.naturalHeight - sh) / 2
                }
              }
              if (f.scale && f.scale > 1) {
                const s = f.scale
                sx += (sw * (1 - 1 / s)) / 2
                sy += (sh * (1 - 1 / s)) / 2
                sw /= s
                sh /= s
              }
              ctx1.drawImage(fg, sx, sy, sw, sh, frameX, frameY, frameW, frameH)

              // Final blur pass into c2.
              const c2 = document.createElement('canvas')
              c2.width = cw
              c2.height = ch
              const ctx2 = c2.getContext('2d')!
              if (blur && blur > 0) ctx2.filter = `blur(${blur}px)`
              ctx2.drawImage(c1, 0, 0)

              // Composite uses the full canvas — no zoom crop.
              applyTexture(new THREE.CanvasTexture(c2), { repeat: [1, 1], offset: [0, 0] })
            })
            .catch((err) => console.error('ImagePlane composite-load error:', err))
          return () => { texture?.dispose() }
        }

        if (blur && blur > 0) {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')!
            ctx.filter = `blur(${blur}px)`
            ctx.drawImage(img, 0, 0)
            applyTexture(new THREE.CanvasTexture(canvas))
          }
          img.onerror = (err) => console.error('ImagePlane blur-load error:', err)
          img.src = src
          return () => { texture?.dispose() }
        }

        const loader = new THREE.TextureLoader()
        loader.crossOrigin = 'anonymous'
        loader.load(
          src,
          applyTexture,
          undefined,
          (err) => {
            console.error('ImagePlane load error:', err)
          }
        )
        return () => { texture?.dispose() }
      }, [imageData, isMock, blur, composite])


    
  
    useFrame((_, delta) => {
      if (!texture) return
      progressRef.current = Math.min(1, progressRef.current + delta * 0.22)
      material.uniforms.progress.value = progressRef.current
      material.uniforms.time.value += delta
    })
  
    if (!texture) return null
  
    return (
      <>
        <mesh ref={meshRef} position={position} renderOrder={0}>
          <planeGeometry args={size} />
          <primitive object={material} attach="material" />
        </mesh>
        {(onHover || onUnhover) && (
          <Html transform distanceFactor={4} position={[position[0], position[1], 0.20]}>
            <div
              onMouseEnter={onHover}
              onMouseLeave={onUnhover}
              style={{
                // Match the plane size in CSS (1 world unit ≈ 100 CSS px when distanceFactor matches).
                width: `${size[0] * 100 + 90}px`,
                height: `${size[1] * 100 + 70}px`,
                background: 'transparent',
                cursor: 'zoom-in',
                pointerEvents: 'auto',
              }}
            />
          </Html>
        )}
      </>
    )
  }
  
  // ── PREVIEW CYCLER ─────────────────────────────────────────────────────────────

export function PreviewCycler({ frames }: { frames: string[] }) {
  const phaseRef      = useRef<'idle' | 'fadein' | 'fadeout'>('idle')
  const opacityRef    = useRef(0)
  const pendingB64    = useRef<string | null>(null)
  const loadingRef    = useRef(false)
  const lastFrameIdx  = useRef(-1)

  const material = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), [])

  const loadInto = (b64: string, onDone: () => void) => {
    const loader = new THREE.TextureLoader()
    loader.load(`data:image/jpeg;base64,${b64}`, tex => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.repeat.set(0.5, 0.5)
      tex.offset.set(0.075, 0.075)
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      const old = material.map
      material.map = tex
      material.needsUpdate = true
      old?.dispose()
      onDone()
    })
  }

  useEffect(() => {
    if (frames.length === 0) return
    const newIdx = frames.length - 1
    if (newIdx <= lastFrameIdx.current) return
    lastFrameIdx.current = newIdx
    const b64 = frames[newIdx]

    if (phaseRef.current === 'idle') {
      loadInto(b64, () => {
        opacityRef.current = 0
        phaseRef.current = 'fadein'
      })
    } else {
      pendingB64.current = b64
      if (phaseRef.current === 'fadein') phaseRef.current = 'fadeout'
    }
  }, [frames.length])

  useFrame((_, delta) => {
    if (phaseRef.current === 'idle') return

    if (phaseRef.current === 'fadein') {
      opacityRef.current = Math.min(1, opacityRef.current + delta * 2.5)
      material.opacity = opacityRef.current
      if (opacityRef.current >= 1 && pendingB64.current) phaseRef.current = 'fadeout'

    } else if (phaseRef.current === 'fadeout') {
      opacityRef.current = Math.max(0, opacityRef.current - delta * 4.0)
      material.opacity = opacityRef.current

      if (opacityRef.current <= 0 && pendingB64.current && !loadingRef.current) {
        loadingRef.current = true
        const b64 = pendingB64.current
        pendingB64.current = null
        loadInto(b64, () => {
          opacityRef.current = 0
          phaseRef.current = 'fadein'
          loadingRef.current = false
        })
      }
    }
  })

  return (
    <mesh position={[2.8, 1.05, 0.033]} renderOrder={0}>
      <planeGeometry args={[4.5, 3.6]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

  // ── PREVIEW STEP LABELS + FILM CARD + FILM STRIP ──────────────────────────────

  const PREVIEW_STEP_LABELS = [
    'collapsing noise', 'collapsing noise',
    'structure emerging', 'structure emerging', 'structure emerging',
    'rendering', 'rendering', 'rendering',
    'refining',
  ]

  const CARD_W = 1.62
  const CARD_H = 1.42
  const IMG_W  = 1.36
  const IMG_H  = 0.90
  const IMG_OFFSET_Y   =  0.14
  const LABEL_OFFSET_Y = -0.54

  function FilmCard({ position, b64, label, onHover, onUnhover }: {
    position: [number, number, number]
    b64: string
    label: string
    onHover: () => void
    onUnhover: () => void
  }) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null)
    const opacityRef = useRef(0)
    const matRef = useRef<THREE.MeshBasicMaterial | null>(null)
    const labelRef = useRef<HTMLDivElement>(null)
    const isPageActiveRef = useContext(PageActiveContext)

    const innerShadowTex = useMemo(() => {
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const g = ctx.createRadialGradient(size/2, size/2, size*0.28, size/2, size/2, size*0.72)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.32)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
      return new THREE.CanvasTexture(canvas)
    }, [])


    useEffect(() => {
      if (!b64) return
      opacityRef.current = 0
      const loader = new THREE.TextureLoader()
      loader.load(`data:image/jpeg;base64,${b64}`, loaded => {
        loaded.colorSpace = THREE.SRGBColorSpace
        setTexture(loaded)
      })
    }, [b64])

    useFrame((_, delta) => {
      if (texture && matRef.current) {
        opacityRef.current = Math.min(1, opacityRef.current + delta * 2.5)
        matRef.current.opacity = opacityRef.current
      }
      if (labelRef.current) {
        labelRef.current.style.opacity = isPageActiveRef.current ? '1' : '0'
      }
    })

    const [cx, cy, cz] = position

    return (
      <group position={[cx, cy, cz]}>
        {/* Drop shadow */}
        <mesh position={[0.02, -0.02, 0.001]} renderOrder={2}>
          <planeGeometry args={[CARD_W - 0.10, CARD_H - 0.10]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.07} depthWrite={false} />
        </mesh>
        {/* Off-white frame */}
        <RoundedBox args={[CARD_W, CARD_H, 0.004]} radius={0.08} smoothness={4} renderOrder={2}>
          <meshBasicMaterial color="#f5f3ef" />
        </RoundedBox>
        {/* Image */}
        {texture && (
          <mesh position={[0, IMG_OFFSET_Y, 0.005]} renderOrder={3}>
            <planeGeometry args={[IMG_W, IMG_H]} />
            <meshBasicMaterial ref={matRef} map={texture} transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
        {/* Inner shadow over image */}
        {texture && (
          <mesh position={[0, IMG_OFFSET_Y, 0.006]} renderOrder={4}>
            <planeGeometry args={[IMG_W, IMG_H]} />
            <meshBasicMaterial map={innerShadowTex} transparent depthWrite={false} />
          </mesh>
        )}
        {/* Step label */}
        <Html transform distanceFactor={4} position={[0, LABEL_OFFSET_Y, 0.006]}>
          <div ref={labelRef} style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgba(90, 88, 85, 0.65)',
            textAlign: 'center',
            width: '148px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            opacity: 0,
          }}>
            {label}
          </div>
        </Html>
        {/* HTML hit area — uses native DOM events, no raycasting */}
        <Html transform distanceFactor={4} position={[0, 0, 0.01]}>
          <div
            onMouseEnter={onHover}
            onMouseLeave={onUnhover}
            style={{
              width: '148px',
              height: '130px',
              background: 'transparent',
              cursor: 'zoom-in',
              pointerEvents: 'auto',
            }}
          />
        </Html>
      </group>
    )
  }

  // ── PREVIEW FILM STRIP ─────────────────────────────────────────────────────────

  const N_COLS  = 3
  const COL_STEP = 1.62
  const ROW_YS  = [2.20, 0.65, -0.90]
  const FILM_Z  = 0.033

  export function PreviewFilmStrip({ frames, sceneTyped, loading = false, xCenter = 3.05, pageWidth = 6.2, onCardHover, onCardUnhover }: {
    frames: string[]
    sceneTyped: string
    loading?: boolean
    xCenter?: number
    pageWidth?: number
    onCardHover?: (card: { b64: string; label: string }) => void
    onCardUnhover?: () => void
  }) {
    const plasticTexture = useTexture('/placeholders/plastic.png')
    plasticTexture.colorSpace = THREE.SRGBColorSpace
    const pageActiveRef = useContext(PageActiveContext)
    const captionRef = useRef<HTMLDivElement>(null)
    const loadingRef = useRef<HTMLDivElement>(null)
    const [dots, setDots] = useState('')

    useFrame(() => {
      if (captionRef.current) {
        const captionVisible = pageActiveRef.current && !!sceneTyped
        captionRef.current.style.opacity = captionVisible ? '1' : '0'
      }
      if (loadingRef.current) {
        const loadingVisible = pageActiveRef.current && loading
        loadingRef.current.style.opacity = loadingVisible ? '1' : '0'
      }
    })

    // Cycle the ellipsis: '' → '.' → '..' → '...' → '' …
    useEffect(() => {
      if (!loading) { setDots(''); return }
      const id = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
      }, 400)
      return () => clearInterval(id)
    }, [loading])

    const colXs = Array.from({ length: N_COLS }, (_, i) =>
      xCenter + (i - (N_COLS - 1) / 2) * COL_STEP
    )

    return (
      <>
        {Array.from({ length: 9 }, (_, i) => {
          const b64 = frames[i] ?? ''
          if (!b64) return null
          const label = PREVIEW_STEP_LABELS[Math.min(i, PREVIEW_STEP_LABELS.length - 1)]
          return (
            <FilmCard
              key={i}
              position={[colXs[i % N_COLS], ROW_YS[Math.floor(i / N_COLS)], FILM_Z]}
              b64={b64}
              label={label}
              onHover={() => onCardHover?.({ b64, label })}
              onUnhover={() => onCardUnhover?.()}
            />
          )
        })}

        <Html
          transform
          distanceFactor={4}
          position={[xCenter, -2.2, 0.036]}
          zIndexRange={[5, 5]}
        >
          <div ref={captionRef} style={{
            // Wider than the Narrative-tier canonical 280px because the FilmCard grid above
            // needs vertical breathing room — a narrower caption would wrap into more lines
            // and push down on the thumbnails.
            width: '460px',
            textAlign: 'center',
            fontFamily: "'coral-pixels', sans-serif",
            fontWeight: 600,
            fontSize: '16px',
            color: 'rgba(90, 88, 85, 0.7)',
            lineHeight: '1.4',
            letterSpacing: '0.01em',
            // Embossed stack — same recipe as leaf-1's prompt and the cover name.
            textShadow:
              '0px -2px 2px rgba(0,0,0,0.2),' +
              ' 0px 3px 5px rgba(255,255,255,1)',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          }}>
            {sceneTyped}
          </div>
        </Html>

        {/* Loading indicator — shown while previews haven't started arriving */}
        <Html
          transform
          distanceFactor={4}
          position={[xCenter, 0.65, 0.04]}
          zIndexRange={[5, 5]}
        >
          <div ref={loadingRef} style={{
            width: '280px',
            textAlign: 'center',
            fontFamily: "'coral-pixels', sans-serif",
            fontWeight: 600,
            fontSize: '16px',
            color: 'rgba(90, 88, 85, 0.7)',
            lineHeight: '1.4',
            letterSpacing: '0.01em',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          }}>
            fetching interpretation{dots}
          </div>
        </Html>

        {/* Plastic overlay — TEMPORARILY DISABLED. Uncomment to bring back the plastic sheet
            over the film-strip grid. Sized to match visible page area; offset matches the
            page's new narrower right edge. */}
        {/* <mesh position={[xCenter - 0.1, 0, 0.043]} rotation={[0, 0, Math.PI]} renderOrder={6} raycast={() => null}>
          <planeGeometry args={[pageWidth + 0.1, 6.3]} />
          <meshBasicMaterial map={plasticTexture} transparent opacity={0.7} depthWrite={false} />
        </mesh> */}
      </>
    )
  }

  // ── SCENE CAPTION ─────────────────────────────────────────────────────────────

  export function SceneCaption({ text }: { text: string }) {
    const pageActiveRef = useContext(PageActiveContext)
    const divRef = useRef<HTMLDivElement>(null)

    useFrame(() => {
      if (!divRef.current) return
      const visible = pageActiveRef.current && !!text
      divRef.current.style.opacity = visible ? '1' : '0'
    })

    return (
      <Html
        transform
        distanceFactor={4}
        position={[3, -1.7, 0.036]}
        zIndexRange={[5, 5]}
      >
        <div ref={divRef} style={{
          width: '460px',
          textAlign: 'center',
          fontFamily: "'coral-pixels', sans-serif",
          fontWeight: 600,
          fontSize: '20px',
          color: 'rgba(90, 88, 85, 0.7)',
          lineHeight: '1.4',
          // Same embossed shadow stack as .cover-name and the leaf-1 prompt — dark recess
          // above + bright paper-rise highlight below, so the caption reads as pressed
          // into the page rather than floating on it.
          textShadow:
            '0px -2px 2px rgba(0,0,0,0.2),' +
            ' 0px 3px 5px rgba(255,255,255,1)',
          letterSpacing: '0.01em',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }}>
          {text}
        </div>
      </Html>
    )
  }

  // ── PLASTIC OVERLAY ────────────────────────────────────────────────────────────
  
  export function PlasticOverlay({
    fadeIn = true,
    position = [2.7, 0.625, 0.036] as [number, number, number],
    size = [5.4, 4.85] as [number, number],
    opacity = 0.18,
    curvedEdges = false,
    holes,
  }: {
    fadeIn?: boolean
    position?: [number, number, number]
    size?: [number, number]
    opacity?: number
    curvedEdges?: boolean
    /** Cutouts in the plastic, in the plastic's local coordinate frame. */
    holes?: Array<{ x: number; y: number; radius: number }>
  }) {
    const plasticTexture = useTexture('/placeholders/plastic.png')
    plasticTexture.colorSpace = THREE.SRGBColorSpace
    const matRef = useRef<THREE.MeshBasicMaterial>(null)
    const [w, h] = size

    // If we need either curved edges or hole cutouts, build a THREE.Shape (PlaneGeometry can't have holes).
    // Otherwise stay on PlaneGeometry for cheap straight-edge plastic.
    // Holes are stringified for the useMemo dep array so we don't rebuild every render from a fresh array literal.
    const holesKey = holes ? holes.map(h => `${h.x},${h.y},${h.radius}`).join('|') : ''
    const geometry = useMemo(() => {
      const needsShape = curvedEdges || (holes && holes.length > 0)
      if (!needsShape) return new THREE.PlaneGeometry(w, h)
      const halfW = w / 2
      const halfH = h / 2
      const curveDepth = 0.09
      const outerTuck = 0.035
      const shape = new THREE.Shape()
      if (curvedEdges) {
        shape.moveTo(-halfW, halfH - curveDepth)
        shape.bezierCurveTo(
          -halfW + w * 0.189, halfH,
          -halfW + w * 0.755, halfH,
          halfW, halfH - outerTuck
        )
        shape.lineTo(halfW, -halfH + outerTuck)
        shape.bezierCurveTo(
          -halfW + w * 0.755, -halfH,
          -halfW + w * 0.189, -halfH,
          -halfW, -halfH + curveDepth
        )
        shape.lineTo(-halfW, halfH - curveDepth)
      } else {
        shape.moveTo(-halfW, halfH)
        shape.lineTo(halfW, halfH)
        shape.lineTo(halfW, -halfH)
        shape.lineTo(-halfW, -halfH)
        shape.lineTo(-halfW, halfH)
      }
      // Punch each hole as a Path on shape.holes — same mechanism the page geometry uses for binder rings.
      if (holes && holes.length > 0) {
        for (const hole of holes) {
          const p = new THREE.Path()
          p.absarc(hole.x, hole.y, hole.radius, 0, Math.PI * 2, false)
          shape.holes.push(p)
        }
      }
      const geo = new THREE.ShapeGeometry(shape)
      // THREE.ShapeGeometry uses "world UVs" — each vertex's UV equals its raw (x, y) coordinate.
      // Re-normalise across the bounding box so the texture maps 0→1 cleanly like PlaneGeometry.
      geo.computeBoundingBox()
      const bb = geo.boundingBox!
      const positions = geo.attributes.position
      const uvs = geo.attributes.uv
      const spanX = bb.max.x - bb.min.x
      const spanY = bb.max.y - bb.min.y
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const y = positions.getY(i)
        uvs.setXY(i, (x - bb.min.x) / spanX, (y - bb.min.y) / spanY)
      }
      uvs.needsUpdate = true
      return geo
    }, [w, h, curvedEdges, holesKey, holes])

    useFrame((_, delta) => {
      if (!matRef.current) return
      const target = fadeIn ? opacity : 0
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, target, 3.5 * delta)
    })

    return (
      <mesh position={position} renderOrder={5} geometry={geometry}>
        {/* DoubleSide — ShapeGeometry's triangle winding for our clockwise path produces back-facing
            triangles relative to the camera; rendering both sides makes the plastic appear regardless. */}
        <meshBasicMaterial ref={matRef} map={plasticTexture} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    )
  }
  
  // ── PAGE ───────────────────────────────────────────────────────────────────────
  
  export type PageProps = {
    index: number
    currentIndex: number
    totalLeaves: number
    frontContent: React.ReactNode
    backContent: React.ReactNode
    frontClass?: string
    imagePlaneData?: string | null
    isMockImage?: boolean
    previewFrames?: string[]
    children3d?: React.ReactNode
    noHoles?: boolean
    tracingPaper?: boolean
    paperTexturePath?: string
    paperTextureRotation?: number
    debossedLine?: boolean
    backingInsetX?: number
    backingInsetY?: number
    backingInsetBottom?: number
    onImageHover?: () => void
    onImageUnhover?: () => void
    noCorner?: boolean
    noPlasticOverlay?: boolean
    plasticPosition?: [number, number, number]
    plasticSize?: [number, number]
    plasticOpacity?: number
    plasticCurvedEdges?: boolean
    plasticHoles?: Array<{ x: number; y: number; radius: number }>
    alwaysShowPlastic?: boolean
    imagePlanePosition?: [number, number, number]
    imagePlaneSize?: [number, number]
    imagePlaneBlur?: number
    imagePlaneComposite?: ImagePlaneComposite
    onTurnNext: () => void
    onTurnBack: () => void
  }

  export function Page({
    index, currentIndex, totalLeaves,
    frontContent, backContent, frontClass,
    imagePlaneData, isMockImage, previewFrames, children3d, noHoles, tracingPaper,
    paperTexturePath, paperTextureRotation, backingInsetX, backingInsetY,
    debossedLine, backingInsetBottom, noCorner, noPlasticOverlay,
    plasticPosition, plasticSize, plasticOpacity, plasticCurvedEdges, plasticHoles, alwaysShowPlastic,
    imagePlanePosition, imagePlaneSize, imagePlaneBlur, imagePlaneComposite,
    onImageHover, onImageUnhover,
    onTurnNext, onTurnBack,
  }: PageProps) {
    const group          = useRef<THREE.Group>(null)
    const imagePlaneGrp  = useRef<THREE.Group>(null)
    const plasticGrp     = useRef<THREE.Group>(null)
    const children3dGrp  = useRef<THREE.Group>(null)
    const isPageActiveRef = useRef(false)
    const frontRef       = useRef<HTMLDivElement>(null)
    const backRef       = useRef<HTMLDivElement>(null)
    const tapeMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
    const cornerHoverRef  = useRef(false)
    const cornerGroupRef  = useRef<THREE.Group>(null)
    const rawPaperTexture = useTexture(tracingPaper ? '/placeholders/tracing_paper.jpeg' : (paperTexturePath ?? '/paper-texture.jpg'))
    rawPaperTexture.colorSpace = THREE.SRGBColorSpace
    const paperTexture = useMemo(() => {
      if (!paperTextureRotation) return rawPaperTexture
      const t = rawPaperTexture.clone()
      t.colorSpace = THREE.SRGBColorSpace
      t.rotation = paperTextureRotation
      t.center.set(0.5, 0.5)
      t.needsUpdate = true
      return t
    }, [rawPaperTexture, paperTextureRotation])
  
    const hasInset = !!(backingInsetX || backingInsetY)
    const targetRotation = index < currentIndex ? -Math.PI : 0
  
    useFrame(({ camera }, delta) => {
      if (!group.current) return
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotation, 3 * delta)
      const rotY = group.current.rotation.y
      group.current.position.z = -0.01 - (0.06 + index * 0.005) * Math.cos(rotY)
      const frontFacingCamera =
        Math.sin(rotY) * camera.position.x + Math.cos(rotY) * camera.position.z > 0
  
      const isFrontActive = index === currentIndex
      const isBackActive =
        (index === currentIndex - 1 || index === currentIndex - 2) ||
        (index === totalLeaves - 1 && index >= currentIndex)
  
      const showFront = isFrontActive && frontFacingCamera
      const showBack  = isBackActive && !frontFacingCamera
  
      if (frontRef.current) {
        frontRef.current.style.opacity = showFront ? '1' : '0'
        frontRef.current.style.pointerEvents = showFront ? 'auto' : 'none'
      }
      if (backRef.current) {
        backRef.current.style.opacity = showBack ? '1' : '0'
        backRef.current.style.pointerEvents = showBack ? 'auto' : 'none'
      }
      if (imagePlaneGrp.current) {
        imagePlaneGrp.current.visible = index <= currentIndex + 1
      }
      isPageActiveRef.current = index === currentIndex
      if (children3dGrp.current) {
        children3dGrp.current.visible = index === currentIndex
      }
      if (tapeMaterialRef.current) {
        tapeMaterialRef.current.opacity = THREE.MathUtils.lerp(
          tapeMaterialRef.current.opacity, (showBack ? 1 : 0) * 0.55, 5 * delta
        )
      }
      if (!noCorner && cornerGroupRef.current) {
        const target = cornerHoverRef.current ? 0.5 : 0.06
        cornerGroupRef.current.rotation.x = THREE.MathUtils.lerp(cornerGroupRef.current.rotation.x, target, 7 * delta)
        cornerGroupRef.current.visible = index !== 0 && frontFacingCamera && index === currentIndex
      }
    })
  
    const { geometry, oblongCurves } = useMemo(() => {
      if (noHoles) return { geometry: new THREE.PlaneGeometry(6.4, 6.4), oblongCurves: [] }
      const bottomCrop = backingInsetBottom ?? 0
      const shape = new THREE.Shape()
      const rightEdge = 2.3
      // Real-book curve: top + bottom edges dome slightly. Both the spine corner and the outer corner
      // tuck inward, with the middle of the edge being the highest (or lowest, on the bottom) point.
      // Spine tucks deeper than the outer end so the binding still reads as the dominant curl.
      const curveDepth = 0.09  // spine corner tuck
      const outerTuck = 0.035  // outer corner tuck — subtler so the line still tapers, not slams to flat
      const topY = 3
      const bottomY = -3 + bottomCrop
      shape.moveTo(-3, topY - curveDepth)
      // Top edge: rises from spine, peaks at topY through the middle, eases back down at the outer end.
      shape.bezierCurveTo(-2, topY, 1, topY, rightEdge, topY - outerTuck)
      // Right (outer) edge — straight vertical, slightly shorter than the spine because both ends are tucked.
      shape.lineTo(rightEdge, bottomY + outerTuck)
      // Bottom edge: mirror of the top — dips to bottomY in the middle, eases up at both corners.
      shape.bezierCurveTo(1, bottomY, -2, bottomY, -3, bottomY + curveDepth)
      // Left (spine) edge: straight back to start.
      shape.lineTo(-3, topY - curveDepth)
      ;[2.0, 1.4, -1.4, -2.0].forEach(y => {
        const hole = new THREE.Path()
        hole.absarc(-2.85, y, 0.12, 0, Math.PI * 2, false)
        shape.holes.push(hole)
      })
      const curves: THREE.CatmullRomCurve3[] = []
      if (debossedLine) {
        const count = 20, hw = 0.10, hr = 0.03
        for (const yPos of [-1.05, 2.6]) {
          const startX = -2.3, endX = 2.7
          const spacing = (endX - startX) / (count - 1)
          for (let i = 0; i < count; i++) {
            const cx = startX + i * spacing
            const hole = new THREE.Path()
            hole.moveTo(cx - hw + hr, yPos + hr)
            hole.lineTo(cx + hw - hr, yPos + hr)
            hole.absarc(cx + hw - hr, yPos, hr, Math.PI / 2, -Math.PI / 2, true)
            hole.lineTo(cx - hw + hr, yPos - hr)
            hole.absarc(cx - hw + hr, yPos, hr, -Math.PI / 2, Math.PI / 2, true)
            hole.closePath()
            shape.holes.push(hole)
            curves.push(new THREE.CatmullRomCurve3(hole.getPoints(32).map(p => new THREE.Vector3(p.x, p.y, 0)), true))
          }
        }
      }
      const geo = new THREE.ShapeGeometry(shape)
      const pos = geo.attributes.position
      const uv = geo.attributes.uv
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) + 3) / 6, (pos.getY(i) + 3) / 6)
      }
      uv.needsUpdate = true
      return { geometry: geo, oblongCurves: curves }
    }, [noHoles, debossedLine, backingInsetBottom])
  
    const backingGeometry = useMemo(() => {
      if (!backingInsetX && !backingInsetY) return null
      const ix = backingInsetX ?? 0, iy = backingInsetY ?? 0
      const iyBottom = backingInsetBottom ?? iy
      const shape = new THREE.Shape()
      shape.moveTo(-3, 3 - iy)
      shape.lineTo(3 - ix, 3 - iy)
      shape.lineTo(3 - ix, -3 + iyBottom)
      shape.lineTo(-3, -3 + iyBottom)
      shape.lineTo(-3, 3 - iy)
      ;[2.0, 1.4, -1.4, -2.0].forEach(y => {
        const hole = new THREE.Path()
        hole.absarc(-2.85, y, 0.12, 0, Math.PI * 2, false)
        shape.holes.push(hole)
      })
      const geo = new THREE.ShapeGeometry(shape)
      const pos = geo.attributes.position
      const uv = geo.attributes.uv
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) + 3) / 6, (pos.getY(i) + 3) / 6)
      }
      uv.needsUpdate = true
      return geo
    }, [backingInsetX, backingInsetY, backingInsetBottom])

    const cornerGeometry = useMemo(() => {
      const s = 0.72, h = s / Math.SQRT2
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-h,0,0, h,0,0, 0,h,0]), 3))
      geo.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array([0.917,0.117, 0.800,0.000, 0.917,0.000]), 2))
      geo.setIndex([0, 1, 2])
      geo.computeVertexNormals()
      return geo
    }, [])

    return (
      <group ref={group} position={[0.15, 0, 0]}>
        <PageActiveContext.Provider value={isPageActiveRef}>
          <group ref={children3dGrp}>{children3d}</group>
        </PageActiveContext.Provider>
        {imagePlaneData !== undefined && (
          <>
            <group ref={imagePlaneGrp}>
              {imagePlaneData != null
                ? <ImagePlane imageData={imagePlaneData} isMock={isMockImage ?? false} onHover={onImageHover} onUnhover={onImageUnhover} position={imagePlanePosition} size={imagePlaneSize} blur={imagePlaneBlur} composite={imagePlaneComposite} />
                : previewFrames && previewFrames.length > 0
                  ? <PreviewCycler frames={previewFrames} />
                  : null
              }
            </group>
            {!noPlasticOverlay && (
              <group ref={plasticGrp}>
                <PlasticOverlay
                  fadeIn={alwaysShowPlastic || index === currentIndex}
                  position={plasticPosition}
                  size={plasticSize}
                  opacity={plasticOpacity}
                  curvedEdges={plasticCurvedEdges}
                  holes={plasticHoles}
                />
              </group>
            )}
          </>
        )}
        {debossedLine && oblongCurves.map((curve, i) => (
          <mesh key={`oblong-rim-${i}`} position={[2.5, 0, 0.033]} scale={[1, 1, 0.15]} renderOrder={4}>
            <tubeGeometry args={[curve, 48, 0.018, 8, true]} />
            <meshStandardMaterial color="#a5aab8" roughness={0.9} metalness={0.9} />
          </mesh>
        ))}
        {hasInset && backingGeometry && (
          <mesh position={[3.05, 0, 0.031]} geometry={backingGeometry} renderOrder={1} raycast={() => null}>
            <meshBasicMaterial map={paperTexture} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
        {!noCorner && index !== 0 && (
          <group position={[5.0, -2.65, 0.032]} rotation={[0, 0, -3 * Math.PI / 4]}>
            <group ref={cornerGroupRef}>
              <mesh geometry={cornerGeometry}>
                <meshBasicMaterial map={paperTexture} side={THREE.DoubleSide} toneMapped={false} />
              </mesh>
            </group>
          </group>
        )}
        <mesh position={[3.05, 0, tracingPaper ? 0.032 : 0.029]} geometry={geometry} renderOrder={0} raycast={() => null}>
          <meshBasicMaterial
            map={paperTexture}
            side={noHoles ? THREE.FrontSide : THREE.DoubleSide}
            toneMapped={false}
            transparent={hasInset || tracingPaper || noHoles}
            opacity={hasInset ? 0 : (tracingPaper ? 0.65 : (noHoles ? 0 : 1))}
            depthWrite={hasInset ? false : (tracingPaper ? false : (noHoles ? false : true))}
            depthTest
          />
          <Html transform distanceFactor={4} position={[0, 0, 0.01]}>
            <div
              ref={frontRef}
              className={`leaf-face front ${frontClass ?? ''}`}
              style={{ width: '600px', height: '600px', background: 'transparent', position: 'relative', overflow: 'hidden' }}
            >
              {frontContent}
              {index === 0 ? (
                <div className="page-turn-overlay" onClick={onTurnNext} />
              ) : (
                <div
                  onMouseEnter={() => { if (!noCorner) cornerHoverRef.current = true }}
                  onMouseLeave={() => { cornerHoverRef.current = false }}
                  onClick={e => { e.stopPropagation(); onTurnNext() }}
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: '110px', height: '110px',
                    clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                    cursor: 'pointer', zIndex: 30, background: 'transparent',
                  }}
                />
              )}
            </div>
          </Html>
          <Html transform distanceFactor={4} rotation-y={Math.PI} position={[0, 0, -0.01]}>
            <div
              ref={backRef}
              className="leaf-face back"
              style={{ width: '600px', height: '600px', background: 'transparent', position: 'relative', overflow: 'hidden' }}
            >
              {backContent}
              <div
                onClick={e => { e.stopPropagation(); onTurnBack() }}
                style={{
                  position: 'absolute', bottom: 0, left: 0,
                  width: '110px', height: '110px',
                  clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
                  cursor: 'pointer', zIndex: 30, background: 'transparent',
                }}
              />
            </div>
          </Html>
        </mesh>
      </group>
    )
  }