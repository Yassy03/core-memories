'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'

export function CoverPolaroidGhost({ coverGroup }: { coverGroup: React.RefObject<THREE.Group> }) {
  const divRef = useRef<HTMLDivElement>(null)

  useFrame(() => {
    if (!coverGroup.current || !divRef.current) return
    
    // The cover's rotation goes from -Math.PI (open) to 0 (closed)
    const rot = coverGroup.current.rotation.y
    
    // Only start fading the ghost in when the cover is almost completely shut (rot > -0.5)
    let currentOpacity = 0
    if (rot > -0.5) {
      const multiplier = (rot + 0.5) / 0.5 
      currentOpacity = 0.28 * multiplier // Max opacity settles at your desired 0.28
    }
    
    divRef.current.style.opacity = currentOpacity.toString()
  })

  return (
    <Html transform distanceFactor={4} position={[3.2, 0.58, 0.005]} zIndexRange={[0, 0]}>
      {/* We set initial opacity to 0 and let useFrame handle it */}
      <div ref={divRef} style={{ pointerEvents: 'none', opacity: 0 }}>
        <img
          src="/placeholders/polaroid.png"
          style={{
            width: '420px',
            height: 'auto',
            // Note: I removed the static opacity: 0.28 from here so the div wrapper can control it!
            filter: 'blur(0.6px) brightness(1.05) saturate(0.65)',
          }}
        />
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
      if (ref.current) ref.current.position.set(-3, 0, 0)
    }, [])
  
    useFrame((_, delta) => {
      if (!ref.current) return
      const targetX = isOpen ? 0 : -3
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 4 * delta)
    })
    return <group ref={ref}>{children}</group>
  }

  export function CoverOverlay({ currentLeafIndex, tintHex, showGhost = true }: { currentLeafIndex: number, tintHex: string, showGhost?: boolean }) {
    const group = useRef<THREE.Group>(null)
    const targetRotation = currentLeafIndex > 0 ? -Math.PI : 0
  
    // ── 1. Random Color Selection ──
    
  
    useFrame((_, delta) => {
      if (!group.current) return
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        targetRotation,
        5 * delta,
      )
    })
  
    // ── 2. Generate the Cover Geometry AND the 3D Rim Curves ──
    const { coverGeometryWithSlot, rimCurves } = useMemo(() => {
      const shape = new THREE.Shape()
      const halfWidth = 6.4 / 2 
      const halfHeight = 6.4 / 2
      
      shape.moveTo(-halfWidth,  halfHeight)
      shape.lineTo( halfWidth,  halfHeight)
      shape.lineTo( halfWidth, -halfHeight)
      shape.lineTo(-halfWidth, -halfHeight)
      shape.lineTo(-halfWidth,  halfHeight)
  
      const holeX = -2.9    
      const holeRadius = 0.23; 
  
      const createStadiumPath = (yTop: number, yBottom: number) => {
        const hole = new THREE.Path()
        hole.moveTo(holeX - holeRadius, yTop)
        hole.absarc(holeX, yTop, holeRadius, Math.PI, 0, true)
        hole.lineTo(holeX + holeRadius, yBottom)
        hole.absarc(holeX, yBottom, holeRadius, 0, Math.PI, true)
        hole.lineTo(holeX - holeRadius, yTop)
        return hole
      }
  
      const topPath = createStadiumPath(2.0, 1.4)
      const bottomPath = createStadiumPath(-1.4, -2.0)
  
      shape.holes.push(topPath, bottomPath)
  
      // Convert the 2D flat path into a 3D curve for our tube stroke
      const createCurve3D = (path: THREE.Path) => {
        const points2D = path.getPoints(60) 
        const points3D = points2D.map(p => new THREE.Vector3(p.x, p.y, 0))
        return new THREE.CatmullRomCurve3(points3D, true) 
      }
  
      return {
        coverGeometryWithSlot: new THREE.ShapeGeometry(shape),
        rimCurves: [createCurve3D(topPath), createCurve3D(bottomPath)]
      }
    }, [])
  
    // ── 3. Tinted Materials ──
    
    // ── 3. Tinted Materials ──
    const frontMat = useMemo(() => {
      const baseColor = new THREE.Color('#dde2de')
      // Increased from 0.15 to 0.60 to make the tint highly visible!
      const finalColor = baseColor.lerp(new THREE.Color(tintHex), 0.60)
  
      return new THREE.MeshPhysicalMaterial({
        color:              finalColor,
        transparent:        true,
        opacity:            0.65,
        roughness:          0.45,
        metalness:          0,
        clearcoat:          0.2,
        clearcoatRoughness: 0.4,
        side:               THREE.DoubleSide,
        // Removed toneMapped: false so the lights don't bleach the color out
        depthWrite:         true,
      })
    }, [tintHex]) 
  
    const backMat = useMemo(() => {
      const baseColor = new THREE.Color('#dde2de')
      const finalColor = baseColor.lerp(new THREE.Color(tintHex), 0.60)
  
      return new THREE.MeshPhysicalMaterial({
        color:       finalColor,
        transparent: true,
        opacity:     0.65,
        roughness:   0.45,
        metalness:   0,
        clearcoat:   0.2,
        side:        THREE.DoubleSide,
        // Removed toneMapped: false
        depthWrite:  false,
      })
    }, [tintHex])
  
    const spineMat = useMemo(() => {
      const baseColor = new THREE.Color('#cfd4cf') 
      const finalColor = baseColor.lerp(new THREE.Color(tintHex), 0.60)
  
      return new THREE.MeshPhysicalMaterial({
        color:               finalColor,
        transparent:         true,
        opacity:             0.88,
        roughness:           0.08,
        metalness:           0,
        clearcoat:           0.3,
        // Removed toneMapped: false
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
        <mesh position={[3, 0, -0.6]} material={backMat}>
          <planeGeometry args={[6.4, 6.4]} />
        </mesh>
  
        {/* ── Spine (with molded edges) ── */}
        <group position={[-0.2, 0, -0.3]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={spineMat}>
            <boxGeometry args={[0.6, 6.4, 0.08]} />
          </mesh>
          <mesh position={[-0.3, 0, -0.04]} material={spineMat}>
            <cylinderGeometry args={[0.025, 0.025, 6.4, 32]} />
          </mesh>
          <mesh position={[0.3, 0, -0.04]} material={spineMat}>
            <cylinderGeometry args={[0.025, 0.025, 6.4, 32]} />
          </mesh>
        </group>
  
        {/* ── NEW: Stationary Ghost ── */}
        {/* Detached from the cover so it sits perfectly flat on the page underneath */}
        {showGhost && currentLeafIndex === 0 && (
            <group position={[-0.2, 0, 0.01]}> 
                <CoverPolaroidGhost coverGroup={group} />
            </group>
            )}
            
        {/* ── Front cover (with holes and rims) ── */}
        <group ref={group} position={[-0.2, 0, 0.01]}>
          {/* Notice the Ghost was removed from inside this rotating group! */}
          
          <mesh position={[3.2, 0, 0]} material={frontMat} geometry={coverGeometryWithSlot} />
  
          {rimCurves.map((curve, index) => (
            <mesh key={`rim-${index}`} position={[3.2, 0, 0.025]} material={frontMat}>
              <tubeGeometry args={[curve, 100, 0.015, 7, true]} />
            </mesh>
          ))}
        </group>
      </>
    )
  }

  // ── IMAGE PLANE ────────────────────────────────────────────────────────────────

export function ImagePlane({ imageData, isMock }: { imageData: string; isMock: boolean }) {
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
        
        const loader = new THREE.TextureLoader()
        loader.crossOrigin = 'anonymous'
        loader.load(
          src,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace
            tex.repeat.set(0.5, 0.5)
            tex.offset.set(0.075, 0.075)
            tex.wrapS = THREE.ClampToEdgeWrapping
            tex.wrapT = THREE.ClampToEdgeWrapping
            material.uniforms.map.value = tex
            setTexture(tex)
            progressRef.current = 0
          },
          undefined,
          (err) => {
            console.error('ImagePlane load error:', err)  // ← add
          }
        )
        return () => { texture?.dispose() }
      }, [imageData, isMock])


    
  
    useFrame((_, delta) => {
      if (!texture) return
      progressRef.current = Math.min(1, progressRef.current + delta * 0.22)
      material.uniforms.progress.value = progressRef.current
      material.uniforms.time.value += delta
    })
  
    if (!texture) return null
  
    return (
      <>
        <mesh position={[2.99, 0.73, 0.033]} renderOrder={0}>
          <planeGeometry args={[4.3, 3.3]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.12} depthWrite={false} />
        </mesh>
        <mesh ref={meshRef} position={[2.85, 0.8, 0.035]} renderOrder={1}>
          <planeGeometry args={[4.5, 3.375]} />
          <primitive object={material} attach="material" />
        </mesh>
      </>
    )
  }
  
  // ── PLASTIC OVERLAY ────────────────────────────────────────────────────────────
  
  export function PlasticOverlay() {
    const plasticTexture = useTexture('/placeholders/plastic.png')
    plasticTexture.colorSpace = THREE.SRGBColorSpace
  
    const shadowTexture = useMemo(() => {
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const gradient = ctx.createRadialGradient(size/2, size/2, size*0.4, size/2, size/2, size*0.85)
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.10)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)
      return new THREE.CanvasTexture(canvas)
    }, [])
  
    return (
      <mesh position={[2.7, 0.8, 0.038]} rotation={[0, 0, Math.PI / 2]} renderOrder={2}>
        <planeGeometry args={[3.97, 5.5]} />
        <meshBasicMaterial map={plasticTexture} transparent opacity={0.9} depthWrite={false} />
        <mesh position={[0, 0, 0.039]} renderOrder={3}>
          <planeGeometry args={[3.87, 5.3]} />
          <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
        </mesh>
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
    noHoles?: boolean
    tracingPaper?: boolean
    paperTexturePath?: string
    debossedLine?: boolean
    backingInsetX?: number
    backingInsetY?: number
    backingInsetBottom?: number
    onTurnNext: () => void
    onTurnBack: () => void
  }
  
  export function Page({
    index, currentIndex, totalLeaves,
    frontContent, backContent, frontClass,
    imagePlaneData, isMockImage, noHoles, tracingPaper,
    paperTexturePath, backingInsetX, backingInsetY,
    debossedLine, backingInsetBottom,
    onTurnNext, onTurnBack,
  }: PageProps) {
    const group         = useRef<THREE.Group>(null)
    const imagePlaneGrp = useRef<THREE.Group>(null)
    const frontRef      = useRef<HTMLDivElement>(null)
    const backRef       = useRef<HTMLDivElement>(null)
    const tapeMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
    const paperTexture = useTexture(tracingPaper ? '/placeholders/tracing_paper.jpeg' : (paperTexturePath ?? '/paper-texture.jpg'))
    paperTexture.colorSpace = THREE.SRGBColorSpace
  
    const hasInset = !!(backingInsetX || backingInsetY)
    const targetRotation = index < currentIndex ? -Math.PI : 0
  
    useFrame(({ camera }, delta) => {
      if (!group.current) return
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotation, 5 * delta)
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
      if (tapeMaterialRef.current) {
        tapeMaterialRef.current.opacity = THREE.MathUtils.lerp(
          tapeMaterialRef.current.opacity, (showBack ? 1 : 0) * 0.55, 5 * delta
        )
      }
    })
  
    const { geometry, oblongCurves } = useMemo(() => {
      if (noHoles) return { geometry: new THREE.PlaneGeometry(6.4, 6.4), oblongCurves: [] }
      const bottomCrop = backingInsetBottom ?? 0
      const shape = new THREE.Shape()
      shape.moveTo(-3, 3)
      shape.lineTo(3, 3)
      shape.lineTo(3, -3 + bottomCrop)
      shape.lineTo(-3, -3 + bottomCrop)
      shape.lineTo(-3, 3)
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
  
    return (
      <group ref={group} position={[0.15, 0, 0]}>
        {imagePlaneData !== undefined && (
          <group ref={imagePlaneGrp}>
            {imagePlaneData != null && <ImagePlane imageData={imagePlaneData} isMock={isMockImage ?? false} />}
            <PlasticOverlay />
          </group>
        )}
        {debossedLine && oblongCurves.map((curve, i) => (
          <mesh key={`oblong-rim-${i}`} position={[2.5, 0, 0.033]} scale={[1, 1, 0.15]} renderOrder={4}>
            <tubeGeometry args={[curve, 48, 0.018, 8, true]} />
            <meshStandardMaterial color="#a5aab8" roughness={0.9} metalness={0.9} />
          </mesh>
        ))}
        {hasInset && backingGeometry && (
          <mesh position={[3.05, 0, 0.031]} geometry={backingGeometry} renderOrder={1}>
            <meshBasicMaterial map={paperTexture} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
        <mesh position={[3.05, 0, tracingPaper ? 0.032 : 0.029]} geometry={geometry} renderOrder={0}>
          <meshBasicMaterial
            map={paperTexture}
            side={noHoles ? THREE.FrontSide : THREE.DoubleSide}
            toneMapped={false}
            transparent
            opacity={hasInset ? 0 : (tracingPaper ? 0.65 : (noHoles ? 0 : 1))}
            depthWrite={hasInset ? false : (tracingPaper ? false : true)}
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
              ) : index === currentIndex ? (
                <div className="page-turn-tab" onClick={e => { e.stopPropagation(); onTurnNext() }}>
                  turn →
                </div>
              ) : null}
            </div>
          </Html>
          <Html transform distanceFactor={4} rotation-y={Math.PI} position={[0, 0, -0.01]}>
            <div
              ref={backRef}
              className="leaf-face back"
              style={{ width: '600px', height: '600px', background: 'transparent', position: 'relative', overflow: 'hidden' }}
            >
              {backContent}
              <div className="page-turn-tab back-tab" onClick={e => { e.stopPropagation(); onTurnBack() }}>
                back
              </div>
            </div>
          </Html>
        </mesh>
      </group>
    )
  }