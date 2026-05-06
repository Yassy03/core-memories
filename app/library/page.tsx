'use client'

import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ScrollControls, useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'
import { BinderRings, BookGroup, CoverOverlay, Page, PageProps, PlasticOverlay } from '../components/BookComponents'

type Album = {
  id: number
  user_name: string
  birth_year: string
  memory_text: string
  interpretation_text: string
  tint_color: string
  image_url: string
}

function LibraryImagePlane({ url }: { url: string }) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null)
  
    useEffect(() => {
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(url, tex => {
        tex.colorSpace = THREE.SRGBColorSpace
        tex.repeat.set(0.5, 0.5)
        tex.offset.set(0.075, 0.075)
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        setTexture(tex)
      })
    }, [url])
  
    if (!texture) return null
  
    return (
      <mesh position={[2.85, 0.8, 0.035]} renderOrder={1}>
        <planeGeometry args={[4.5, 3.375]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    )
  }
  
  // ── LIBRARY ALBUM ──────────────────────────────────────────────────────────────


// ── LIBRARY ALBUM ──────────────────────────────────────────────────────────────

function LibraryAlbum({
  album,
  position,
  rotation,
  isSelected,
  isFading,
  onSelect,
  onClose,
}: {
  album: Album
  position: [number, number, number]
  rotation: [number, number, number]
  isSelected: boolean
  isFading: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [currentLeafIndex, setCurrentLeafIndex] = useState(0)
  const imageData = album.image_url
  const targetPos = useRef(new THREE.Vector3(...position))
  const targetRot = useRef(new THREE.Euler(...rotation))
  const targetScale = useRef(1.4)
  const opacityRef = useRef(1)

  useEffect(() => {
    if (isSelected) {
      targetPos.current.set(2.5, 0, 5)
      targetRot.current.set(0, -0.3, 0)
      targetScale.current = 0.65
    } else {
      targetPos.current.set(...position)
      targetRot.current.set(...rotation)
      targetScale.current = 1.4
      setCurrentLeafIndex(0)
    }
  }, [isSelected])

  useEffect(() => {
    opacityRef.current = isFading ? 0 : 1
  }, [isFading])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.lerp(targetPos.current, 6 * delta)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot.current.y, 6 * delta)
    const s = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(s, targetScale.current, 6 * delta))
  })

  const leaves = useMemo(() => [
    {
        id: 'lib-leaf-0',
        front: (
          <div style={{ position: 'relative', width: '100%', height: '100%' }} />
        ),
        back: <div style={{ position: 'relative', width: '100%', height: '100%' }} />,
        imagePlaneData: imageData,         // ← the base64 fetched from proxy
        isMockImage: false, 
        noHoles: false,
        paperTexturePath: 'placeholders/backing.png',
        backingInsetX: 0.7,
        backingInsetY: 0.3,
        debossedLine: true,
        backingInsetBottom: 1.85,
      },
    {
      id: 'lib-leaf-1',
      front: (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/placeholders/tape.png"
            alt=""
            style={{
              position: 'absolute', width: '450px', left: '50%', top: '55%',
              transform: 'translateX(-50%) translateY(-50%) rotate(3deg)',
              mixBlendMode: 'multiply', pointerEvents: 'none', zIndex: 0, userSelect: 'none',
            }}
          />
          <div style={{
            position: 'absolute', top: '62%', left: '50%',
            transform: 'translateX(-50%) translateY(-50%)',
            width: '200px', zIndex: 2, textAlign: 'center',
            fontFamily: "'DM Mono', monospace", fontWeight: 600,
            fontSize: '11px', color: '#5a5855', lineHeight: '2',
            whiteSpace: 'pre-wrap',
          }}>
            {album.memory_text}
          </div>
        </div>
      ),
      back: <div style={{ position: 'relative', width: '100%', height: '100%' }} />,
    },
  ], [album, imageData])

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={1.4}
      onClick={(e) => {
        e.stopPropagation()
        if (!isSelected) onSelect()
      }}
      onPointerOver={(e) => { e.stopPropagation(); if (!isSelected) document.body.style.cursor = 'pointer' }}
      onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto' }}
    >
      <BookGroup isOpen={currentLeafIndex > 0}>
        <BinderRings />
        <CoverOverlay
            
          currentLeafIndex={currentLeafIndex}
          tintHex={album.tint_color}
          showGhost={false}
        />
         {/* image sits at same position as leaf-3 in interactive album */}
     
        
        {leaves.map((leaf, i) => (
          <Page
            key={leaf.id}
            index={i}
            currentIndex={currentLeafIndex}
            totalLeaves={leaves.length}
            frontContent={leaf.front}
            backContent={leaf.back}
            imagePlaneData={leaf.imagePlaneData}
            isMockImage={leaf.isMockImage}
            noHoles={leaf.noHoles}
            paperTexturePath={leaf.paperTexturePath}
            backingInsetX={leaf.backingInsetX}
            backingInsetY={leaf.backingInsetY}
            debossedLine={leaf.debossedLine}
            backingInsetBottom={leaf.backingInsetBottom}
            onTurnNext={() => setCurrentLeafIndex(i + 1)}
            onTurnBack={() => setCurrentLeafIndex(prev => prev - 1)}
          />
        ))}
      </BookGroup>

      {isSelected && (
        <mesh
          position={[-1, 4, 0]}
          onClick={(e) => { e.stopPropagation(); onClose() }}
        >
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  )
}



// ── ALBUM ROW ──────────────────────────────────────────────────────────────────

function AlbumRow({ albums, selectedId, onSelect, onClose }: {
  albums: Album[]
  selectedId: number | null
  onSelect: (album: Album) => void
  onClose: () => void
}) {
  const scroll = useScroll()
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current || selectedId !== null) return
    const t = scroll.offset
    const travel = t * albums.length * 3.5
    groupRef.current.position.x = -travel * 0.3
    groupRef.current.position.y = -travel * 0.6
    groupRef.current.position.z = travel * 1.2
  })

  const positions = useMemo(() => {
    return albums.map((_, i) => ({
      position: [i * 2, i * 1, i * -2.5] as [number, number, number],
      rotation: [0, 0.5, 0] as [number, number, number],
    }))
  }, [albums])

  return (
    <group ref={groupRef}>
      {albums.map((album, i) => (
        <LibraryAlbum
          key={album.id}
          album={album}
          position={positions[i].position}
          rotation={positions[i].rotation}
          isSelected={selectedId === album.id}
          isFading={selectedId !== null && selectedId !== album.id}
          onSelect={() => onSelect(album)}
          onClose={onClose}
        />
      ))}
    </group>
  )
}

// ── LIBRARY SCENE ──────────────────────────────────────────────────────────────

function LibraryScene({ albums, selectedId, onSelect, onClose }: {
  albums: Album[]
  selectedId: number | null
  onSelect: (album: Album) => void
  onClose: () => void
}) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} />
      <Environment preset="studio" />
      <ScrollControls pages={Math.max(1, albums.length * 0.8)} damping={0.25} enabled={selectedId === null}>
        <AlbumRow
          albums={albums}
          selectedId={selectedId}
          onSelect={onSelect}
          onClose={onClose}
        />
      </ScrollControls>
    </>
  )
}

// ── MAIN ───────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const router = useRouter()
  const [albums, setAlbums] = useState<Album[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/albums')
      .then(r => r.json())
      .then(d => { setAlbums(d.albums ?? []); setLoading(false) })
      .catch(console.error)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single+Cursive:wght@100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; height: 100%; background: #f0eeeb; overflow: hidden; }
        .leaf-face { position: absolute; inset: 0; border-radius: 4px 14px 14px 4px; }
        .leaf-face.back { border-radius: 14px 4px 4px 14px; }
        .page-turn-overlay { position: absolute; inset: 0; cursor: pointer; z-index: 10; }
        .page-turn-tab {
          position: absolute; bottom: 16px; right: 20px; padding: 6px 14px;
          font-family: 'Noto Serif', serif; font-size: 11px; font-style: italic;
          color: #a8a5a0; cursor: pointer; z-index: 10;
          border-radius: 12px; transition: color 0.2s, background 0.2s; user-select: none;
        }
        .page-turn-tab:hover { color: #6a6763; background: rgba(0,0,0,0.04); }
        .page-turn-tab.back-tab { right: auto; left: 20px; }
      `}</style>

      <div
        onClick={() => selectedId ? setSelectedId(null) : router.push('/')}
        style={{
          position: 'fixed', top: '24px', left: '24px', zIndex: 100,
          cursor: 'pointer', fontFamily: "'DM Mono', monospace",
          fontSize: '11px', fontWeight: 600,
          color: 'rgba(90, 88, 85, 0.7)', letterSpacing: '0.08em',
        }}
      >
        ← {selectedId ? 'back to library' : 'back'}
      </div>

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Mono', monospace", fontSize: '11px',
          color: 'rgba(90, 88, 85, 0.5)', letterSpacing: '0.08em',
        }}>
          loading albums...
        </div>
      )}

      <div style={{ position: 'fixed', inset: 0 }}>
        <Canvas camera={{ position: [20, 2, 20], fov: 60 }}>
          <Suspense fallback={null}>
            <LibraryScene
              albums={albums}
              selectedId={selectedId}
              onSelect={a => setSelectedId(a.id)}
              onClose={() => setSelectedId(null)}
            />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}