'use client'

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrthographicCamera, useTexture, OrbitControls, Environment, Text, RoundedBox, MeshTransmissionMaterial} from '@react-three/drei'
import { CoverPolaroidGhost, BinderRings, BookGroup, CoverOverlay, ImagePlane, PlasticOverlay, Page, PreviewFilmStrip, AuraOrb } from '../components/BookComponents'


import * as THREE from 'three'
import { gaussianBlur } from 'three/examples/jsm/tsl/display/GaussianBlurNode.js'
useTexture.preload('placeholders/plastic.png')

// ─── TAPE-TEXT CONSTRAINT TUNING ──────────────────────────────────────────────
// Tune these to make the textarea + submitted-display align with the visible
// tape graphic on each leaf. Two parallel sets:
//   • MEMORY_*   — leaf-1 back (the "describe your memory" textarea)
//   • RESPONSE_* — leaf-4 front (the "how does this compare" textarea)
// Each set has three knobs:
//   • _HEIGHT_PX  — pixel height of the textarea box (= the strict cut-off height)
//   • _TOP_PCT    — vertical center position within the leaf face (centered alignment)
//   • _MAX_CHARS  — HARD character cap. Browser-enforced via the `maxLength` attribute,
//                   so the user literally cannot type past this number. This is the
//                   strict cut-off the user can manually tune.
const MEMORY_TEXTAREA_HEIGHT_PX   = 180
const MEMORY_TEXTAREA_TOP_PCT     = 55  // lower number = textarea sits higher on the leaf
const MEMORY_MAX_CHARS            = 220  // strict cut-off: browser refuses keystrokes past this

const RESPONSE_TEXTAREA_HEIGHT_PX = 180
const RESPONSE_TEXTAREA_TOP_PCT   = 55  // lower number = textarea sits higher on the leaf
const RESPONSE_MAX_CHARS          = 220  // strict cut-off: browser refuses keystrokes past this
// ──────────────────────────────────────────────────────────────────────────────

// ── TYPES ──────────────────────────────────────────────────────────────────────

type Step = 'name' | 'birthday' | 'cover'

type ImageState = {
  status: 'idle' | 'generating' | 'done' | 'error'
  data: string | null
  isMock: boolean
}

type InterpretationState = {
  status: 'idle' | 'streaming' | 'done' | 'error'
  text: string
}

type LeafData = {
  id: string
  frontClass?: string
  front: React.ReactNode
  back: React.ReactNode
  imagePlaneData?: string | null
  isMockImage?: boolean
  children3d?: React.ReactNode
  paperTexturePath?: string
  paperTextureRotation?: number
  backingInsetBottom?: number
}

// ── IMAGE PLANE ────────────────────────────────────────────────────────────────







// Pass the cover group ref to the ghost


// ── BINDER RINGS ───────────────────────────────────────────────────────────────




// ── COVER OVERLAY ──────────────────────────────────────────────────────────────


// ── PAGE ───────────────────────────────────────────────────────────────────────

type PageProps = {
  index: number
  currentIndex: number
  totalLeaves: number
  frontContent: React.ReactNode
  backContent: React.ReactNode
  frontClass?: string
  imagePlaneData?: string | null
  isMockImage?: boolean
  noHoles?: boolean
  firstLeaf?: boolean
  tracingPaper?: boolean
  submittedMemory?: string | null
  paperTexturePath?: string
  debossedLine?: boolean
  backingInsetX?: number
  backingInsetY?: number
  backingInsetBottom?: number
  onTurnNext: () => void
  onTurnBack: () => void
}



// ── IMAGE LABEL HELPERS ────────────────────────────────────────────────────────

type ImageLabel = { label: string; description: string; point: [number, number] }

function getLabelPos(px: number, py: number, W: number, H: number): [number, number] {
  const dx = px - W / 2 || 1
  const dy = py - H / 2 || 1
  const mag = Math.sqrt(dx * dx + dy * dy)
  const lx = Math.max(-110, Math.min(W + 110, px + (dx / mag) * 190))
  const ly = Math.max(-40, Math.min(H - 20, py + (dy / mag) * 190))
  return [lx, ly]
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => {
      setN(p => { if (p >= text.length) { clearInterval(id); return p } return p + 1 })
    }, 22)
    return () => clearInterval(id)
  }, [text])
  return <>{text.slice(0, n)}</>
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

const DEV_LINES = [
  "pulling from the data base...",
  "finding meaning in latent space...",
  "emerging associations...",
  "probable patterns emerging...",
]

// Soft cloud-like orbs that drift across the screen while the image is generating.
// Lifecycle is managed by toggling `visible` and letting a CSS opacity transition handle the fade —
// this produces a perfectly smooth in/out curve (no keyframe blockiness).
const ORB_KEYFRAMES = ['orbDriftA', 'orbDriftB', 'orbDriftC']
function makeOrb(id: number) {
  return {
    id,
    // Keep orb centers inside the viewport so the brightest spot is always visible.
    left: `${10 + Math.random() * 80}%`,
    top:  `${10 + Math.random() * 80}%`,
    size: 600 + Math.random() * 600,                // 600–1200 px
    peak: 0.18 + Math.random() * 0.20,              // 0.18–0.28 peak opacity
    driftDuration: 10 + Math.random() * 6,          // 10–18 s drift loop — visible motion during the orb's lifespan
    driftDelay: -Math.random() * 25,                // start mid-cycle
    keyframe: ORB_KEYFRAMES[Math.floor(Math.random() * ORB_KEYFRAMES.length)],
    visible: false,                                  // flipped to true after mount to trigger fade-in
  }
}



// Fires `onReady` after the 3rd rendered frame. Mounts inside the Canvas's Suspense, so it
// only starts counting once textures/HDR have loaded — combining "Suspense resolved" + "scene
// has drawn enough frames for shader compilation to settle" into one deterministic signal.
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

// Highlight + shadow edges painted onto a leaf's HTML face — ported verbatim from
// app/library/page.tsx so the two albums share the same depth treatment. The outer-edge
// div is a soft inward gradient (subtle dark band fading to a faint white). The spine-
// side div is a stronger gradient that includes mask-image cutouts at the four binder-
// ring positions — those cutouts keep the gradient from painting over the rings so the
// metal hardware reads as sitting on top of the paper rather than buried under it.
// Both divs use pointer-events:none so they never interfere with the leaf's own UI.
function LeafFrontEdges() {
  return (
    <>
      {/* Outer edge — spine on left, so outer edge is on the RIGHT */}
      <div style={{
        position: 'absolute',
        right: '11%',
        top: '0.6%',
        bottom: '0.6%',
        width: '18%',
        pointerEvents: 'none',
        background:
          'linear-gradient(to left,' +
          ' rgba(0,0,0,0.10) 0%,' +
          ' rgba(0,0,0,0.05) 28%,' +
          ' rgba(0,0,0,0) 55%,' +
          ' rgba(255,255,255,0.18) 75%,' +
          ' rgba(255,255,255,0) 100%)',
      }} />
      {/* Spine-side gutter — binder holes at 9% x, 16/26/74/84% y */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '1.5%',
        bottom: '1.5%',
        width: '28%',
        pointerEvents: 'none',
        background:
          'linear-gradient(to right,' +
          ' rgba(0,0,0,0.16) 0%,' +
          ' rgba(0,0,0,0.08) 18%,' +
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
    </>
  )
}

function LeafBackEdges() {
  return (
    <>
      {/* After the leaf flips, outer edge is on the LEFT */}
      <div style={{
        position: 'absolute',
        left: '11%',
        top: '0.6%',
        bottom: '0.6%',
        width: '18%',
        pointerEvents: 'none',
        background:
          'linear-gradient(to right,' +
          ' rgba(0,0,0,0.10) 0%,' +
          ' rgba(0,0,0,0.05) 28%,' +
          ' rgba(0,0,0,0) 55%,' +
          ' rgba(255,255,255,0.18) 75%,' +
          ' rgba(255,255,255,0) 100%)',
      }} />
      {/* Spine-side gutter mirrored to the RIGHT, holes at 91% x */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: '1.5%',
        bottom: '1.5%',
        width: '28%',
        pointerEvents: 'none',
        background:
          'linear-gradient(to left,' +
          ' rgba(0,0,0,0.16) 0%,' +
          ' rgba(0,0,0,0.08) 18%,' +
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
    </>
  )
}

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

// Tinted-plastic back button — identical recipe to the BackButton in app/library/page.tsx,
// app/comparative-study/page.tsx, and app/explore/page.tsx. Duplicated rather than imported
// to keep each page self-contained; if it changes, update all four sites.
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

export default function CoreMemories() {

  const [step, setStep]           = useState<Step>('name')
  const [nameInput, setNameInput] = useState('')
  const [bdayInput, setBdayInput] = useState('')
  const [userName, setUserName]   = useState('')
  const [birthYear, setBirthYear] = useState('')
  const TINT_PALETTE = ['#B5614F','#4A314D','#7090B8','#9EBF8A','#A88DA8','#C8A49E','#6A9688','#C4AD6A','#9A6F3A']
  // AURA_PALETTE — vivid reference-inspired hues used for the colorworld (load curtain
  // blobs, persistent background blobs, cover-ghost orb). Distinct from TINT_PALETTE so
  // the muted album-cover tint stays the cover's identity while the aura sings around it
  // in a complementary brighter palette. The 9 entries are positioned in roughly the same
  // hue order as TINT_PALETTE so the +0/+3/+6 picker below produces three colors that
  // visually complement each muted tint.
  const AURA_PALETTE = ['#6BD4E2','#C5E63E','#FFB066','#FF6BB5','#A8E863','#5DC8DD','#FF8888','#B19EFF','#7EC8E3']
  // Fixed orange-y hue for the orb (cover ghost + leaf-1 front) regardless of which tint
  // the user lands on. Decoupled from the per-tint auraColors picker so the orb's identity
  // is consistent across sessions.
  const ORB_COLOR = '#fc350d'
  // Each user's album tint is picked fresh here on /album load (was previously inherited
  // from a ?tint= URL param set on /landing). Ignores the URL entirely now — the landing
  // page tints all three demo albums with a uniform cyan, and the user's unique album hue
  // is randomised at this loading moment.
  //
  // SSR-safe pattern: initialise to a DETERMINISTIC value (first palette entry) so server
  // and client first-paint markup match, then swap to a random one in a useEffect below.
  // The white loadFadingIn sheet covers everything until sceneReady, so the brief
  // deterministic-then-random tintColor switch happens behind the curtain and is never visible.
  const [tintColor, setTintColor] = useState(TINT_PALETTE[0])
  useEffect(() => {
    setTintColor(TINT_PALETTE[Math.floor(Math.random() * TINT_PALETTE.length)])
  }, [])
  // Three aura hues for the colorworld — primary, accent A, accent B. Picked DETERMINISTICALLY
  // from AURA_PALETTE at +0/+3/+6 offsets based on the tintColor's index, so SSR and CSR
  // produce identical markup AND each cover tint has its own consistent colorworld that
  // follows the user through the entire session.
  const auraColors = useMemo(() => {
    const tintIdx = TINT_PALETTE.findIndex(c => c.toLowerCase() === tintColor.toLowerCase())
    const seed = tintIdx >= 0 ? tintIdx : 0
    return [
      AURA_PALETTE[seed % AURA_PALETTE.length],
      AURA_PALETTE[(seed + 3) % AURA_PALETTE.length],
      AURA_PALETTE[(seed + 6) % AURA_PALETTE.length],
    ]
  }, [tintColor])
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [latestImage, setLatestImage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [currentLeafIndex, setCurrentLeafIndex] = useState(0)
  // Center-screen navigation hint — visible while the cover is closed, fades out
  // once the user makes their first nav action (arrow key OR click through the cover).
  const [hintFading, setHintFading] = useState(false)
  // Leaf-4 submit-affordance hover state — drives the scale-up that signals interactivity.
  const [submitHovered, setSubmitHovered] = useState(false)
  // White-sheet load curtain — covers everything (canvas + input card) until the 3D scene
  // has actually drawn a few frames. Prevents the staggered pop-in where simple-material
  // pages render before the cover's MeshPhysicalMaterial finishes compiling its shader.
  const [sceneReady, setSceneReady] = useState(false)
  // Exit fade — flips true once album submit succeeds. Drives a full-viewport white sheet
  // that fades in over 1.2s. We navigate at peak white, which then crossfades into the
  // landing page's own 1.2s white-sheet fade-in for a continuous album→home transition.
  const [submitFading, setSubmitFading] = useState(false)
  // Entry fade — derived from sceneReady (NOT a 50ms timer). The white sheet stays opaque
  // until the inner Canvas's SceneReadySignal fires (= Suspense resolved + a few frames
  // rendered, so the MeshPhysicalMaterial shaders have compiled). A 5s safety timeout
  // force-lifts the sheet if something hangs (network outage, asset 404) so users never
  // get stuck on a white screen indefinitely.
  const loadFadingIn = !sceneReady
  useEffect(() => {
    const t = setTimeout(() => setSceneReady(true), 5000)
    return () => clearTimeout(t)
  }, [])

  const [memory0, setMemory0] = useState('')
  const [memory1, setMemory1] = useState('')
  const textareaRef0 = useRef<HTMLTextAreaElement>(null)
  const textareaRef1 = useRef<HTMLTextAreaElement>(null)

  const [image0, setImage0] = useState<ImageState>({ status: 'idle', data: null, isMock: false })
  const [image1, setImage1] = useState<ImageState>({ status: 'idle', data: null, isMock: false })

  const [previews0, setPreviews0] = useState<string[]>([])
  const previews0CountRef = useRef(0)
  const [sceneDesc0, setSceneDesc0] = useState('')
  const [hoverVisible, setHoverVisible] = useState(false)
  const [displayCard, setDisplayCard] = useState<{ b64: string; label: string } | null>(null)
  const unhoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [imageHoverVisible, setImageHoverVisible] = useState(false)
  // Tracks whether the user has opened the magnified inspection view at least once. Once
  // true, stays true. Drives the leaf-3 hint text — changes from "Click image to inspect"
  // (initial affordance) to "continue to next page" (post-inspection nudge to leaf-4).
  const [hasInspectedImage, setHasInspectedImage] = useState(false)
  useEffect(() => {
    if (imageHoverVisible) setHasInspectedImage(true)
  }, [imageHoverVisible])
  const imageUnhoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [imageLabels, setImageLabels] = useState<ImageLabel[] | null>(null)
  const [imageLabelsLoading, setImageLabelsLoading] = useState(false)
  const imageLabelsAnalyzed = useRef(false)
  const [revealedLabels, setRevealedLabels] = useState<Set<number>>(new Set())


  const [interp0, setInterp0] = useState<InterpretationState>({ status: 'idle', text: '' })
  const [interp1, setInterp1] = useState<InterpretationState>({ status: 'idle', text: '' })
  
  const interpAbort0 = useRef<AbortController | null>(null)
  const interpAbort1 = useRef<AbortController | null>(null)
  const interpQueue0 = useRef<string>('')
  const interpQueue1 = useRef<string>('')
  const interpTyping0 = useRef<boolean>(false)
  const interpTyping1 = useRef<boolean>(false)
  const interpStreamDone0 = useRef(false) 

  const [devActive, setDevActive]       = useState(false)
  const [devLineIndex, setDevLineIndex] = useState(0)
  const [devTyped, setDevTyped]         = useState('')
  const [devBlinking, setDevBlinking]   = useState(false)
  const [interp0TypingDone, setInterp0TypingDone] = useState(false)
  const devTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const devIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [typedText, setTypedText] = useState('')
  const fullText = "your mind is a flame, I am a mere image of a flame. you can feel it. I can display feeling."

  const [typedPrompt0, setTypedPrompt0] = useState('')
  const [typedPrompt1, setTypedPrompt1] = useState('')
  const [typedPrompt2, setTypedPrompt2] = useState('')
  // Leaf-3 scene-description typewriter — types out the caption when the user reaches leaf-3.
  const [typedSceneDesc, setTypedSceneDesc] = useState('')
  const prompt0Full = "imagine returning to a core memory from your childhood. describe that memory. include details such as location and time of day."
  const prompt1Full = "I read that your core memories make you who you are. tell me about a core memory you have from childhood"
  const prompt2Full = "how does this compare to your memory, do you see it?"

  // Leaf-4 user response — saved with the album on submit.
  const [response0, setResponse0] = useState('')
  const [responseSubmitted, setResponseSubmitted] = useState(false)
  const responseRef = useRef<HTMLTextAreaElement>(null)

  // After-tape narration that types out once the user submits. Holds back the interp typing until it's done + 2s.
  const [afterText0, setAfterText0] = useState('')
  const afterText0Full = "i'm interpreting your memory. I will create a visualisation of this data, as if you went back and took a photo of that flickering moment."
  const interpGate0 = useRef(true)            // gate for startDrip — true = allow, false = block
  const afterText0Started = useRef(false)     // ensures the after-text types out only once per submission

  // Orbs — soft cloud blobs that fill the page while the image is generating.
  const [orbs, setOrbs] = useState<ReturnType<typeof makeOrb>[]>([])
  const orbIdCounter = useRef(0)


  useEffect(() => {
    if (currentLeafIndex !== 2) { setTypedPrompt0(''); return }
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedPrompt0(prompt0Full.slice(0, i))
      if (i >= prompt0Full.length) clearInterval(interval)
    }, 65)
    return () => clearInterval(interval)
  }, [currentLeafIndex])

  useEffect(() => {
    if (currentLeafIndex !== 4) { setTypedPrompt1(''); return }  // was 3
    // ...rest unchanged
  }, [currentLeafIndex])
  
  // Focus effects:
  useEffect(() => {
  if (currentLeafIndex === 2) setTimeout(() => textareaRef0.current?.focus(), 600)
  else if (currentLeafIndex === 4) setTimeout(() => responseRef.current?.focus(), 600)
}, [currentLeafIndex])

// Type out the leaf-4 question once the user turns there.
useEffect(() => {
  if (currentLeafIndex !== 4) { setTypedPrompt2(''); return }
  let i = 0
  const interval = setInterval(() => {
    i++
    setTypedPrompt2(prompt2Full.slice(0, i))
    if (i >= prompt2Full.length) clearInterval(interval)
  }, 65)
  return () => clearInterval(interval)
}, [currentLeafIndex])

// Auto-flip from leaf-3 to leaf-4 was removed — page turns are manual only now (arrow keys
// or corner click). The `hasViewedMagnified` ref was also deleted since nothing else read it.

// Leaf-3 caption typewriter — types out sceneDesc0 char-by-char when the user reaches leaf-3.
// Resets to empty when they leave so a return visit re-types from the start.
useEffect(() => {
  if (currentLeafIndex !== 3) { setTypedSceneDesc(''); return }
  if (!sceneDesc0) return
  let i = 0
  setTypedSceneDesc('')
  const id = setInterval(() => {
    i++
    setTypedSceneDesc(sceneDesc0.slice(0, i))
    if (i >= sceneDesc0.length) clearInterval(id)
  }, 45)
  return () => clearInterval(id)
}, [currentLeafIndex, sceneDesc0])

useEffect(() => {
  if (currentLeafIndex !== 3) { setTypedPrompt1(''); return }
  let i = 0
  const interval = setInterval(() => {
    i++
    setTypedPrompt1(prompt1Full.slice(0, i))
    if (i >= prompt1Full.length) clearInterval(interval)
  }, 65)
  return () => clearInterval(interval)
}, [currentLeafIndex])    

  useEffect(() => {
    // Only start typing when the user turns to leaf-1
    if (currentLeafIndex !== 1) {
      setTypedText('') // Keeps it completely blank until they arrive
      return
    }
    
    let i = 0
    const interval = setInterval(() => {
      i++
      setTypedText(fullText.slice(0, i))
      if (i >= fullText.length) clearInterval(interval)
    }, 120)
    
    return () => clearInterval(interval)
  }, [currentLeafIndex]) // Now it listens to page turns instead of app steps


  useEffect(() => { inputRef.current?.focus() }, [step])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (step !== 'cover') return
      if (e.key === 'ArrowRight') setCurrentLeafIndex(p => p + 1)
      if (e.key === 'ArrowLeft')  setCurrentLeafIndex(p => Math.max(p - 1, 0))
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setHintFading(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  // Click-to-turn from the cover also dismisses the hint (since the click bypasses the keydown handler).
  useEffect(() => {
    if (currentLeafIndex > 0) setHintFading(true)
  }, [currentLeafIndex])

  // Escape closes the magnified image view — last-resort recovery if the click-to-toggle
  // somehow gets stuck. Only active while the overlay is visible.
  useEffect(() => {
    if (!imageHoverVisible) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setImageHoverVisible(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [imageHoverVisible])

  useEffect(() => {
    async function checkGallery() {
      try {
        const res = await fetch('/api/gallery')
        const data = await res.json()
        if (data.images?.length > 0) {
          setLatestImage(data.images[0])
        }
      } catch (e) {
        console.error('Gallery fetch failed:', e)
      }
    }
    checkGallery()
  }, [])

  function submitName() {
    if (!nameInput.trim()) return
    setUserName(nameInput.trim())
    setStep('birthday')
  }

  function submitBirthday() {
    if (!bdayInput.trim()) return
    const parts = bdayInput.trim().split(/[\/\-\.\s]+/)
    let year = ''
    parts.forEach(p => { if (p.length === 4 && !isNaN(Number(p))) year = p })
    setBirthYear(year || bdayInput.trim())
    setStep('cover')
  }

  const generateImage = useCallback(async (index: number, memoryText: string) => {
    if (!memoryText.trim()) return
    const setImage = index === 0 ? setImage0 : setImage1
    setImage({ status: 'generating', data: null, isMock: false })

    if (index === 0) {
      setPreviews0([])
      previews0CountRef.current = 0
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory: memoryText }),
      })
      const genData = await res.json()
      if (genData.error) throw new Error(genData.error)

      if (index === 0 && genData.sceneDescription) setSceneDesc0(genData.sceneDescription)

      if (genData.mockImageUrl) {
        setImage({ status: 'done', data: genData.mockImageUrl, isMock: true })
        return
      }

      const jobId = genData.job_id
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1500))
        const statusRes  = await fetch(`/api/status?job_id=${encodeURIComponent(jobId)}`)
        const statusData = await statusRes.json()

        if (index === 0) {
          if (typeof statusData.previewCount === 'number' &&
              statusData.previewCount > previews0CountRef.current &&
              statusData.latestPreview) {
            const missed = statusData.previewCount - previews0CountRef.current
            previews0CountRef.current = statusData.previewCount
            setPreviews0(prev => [...prev, ...Array(missed).fill(statusData.latestPreview)])
          }
        }

        if (statusData.status === 'complete') {
          if (statusData.imageData) {
            setImage({ status: 'done', data: statusData.imageData, isMock: false })
          } else {
            throw new Error('No image data in response')
          }
          return
        }
        if (statusData.status === 'error') {
          throw new Error(statusData.error || 'Generation failed')
        }
      }
      throw new Error('Generation timed out')

    } catch (err) {
      console.error('Generation error:', err)
      setImage({ status: 'error', data: null, isMock: false })
    }
  }, [])

  const startInterpretation = useCallback(async (index: number, memoryText: string) => {
    if (!memoryText.trim()) return
    const setInterp = index === 0 ? setInterp0 : setInterp1
    const abortRef  = index === 0 ? interpAbort0 : interpAbort1

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setInterp({ status: 'streaming', text: '' })

    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory: memoryText, type: index === 0 ? 'memory1' : 'memory2' }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error('Interpretation request failed')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const line = part.split('\n').find(l => l.startsWith('data: '))
          if (!line) continue
          const payload = JSON.parse(line.slice('data: '.length))
          if (payload.type === 'delta' && typeof payload.delta === 'string') {
            const queue = index === 0 ? interpQueue0 : interpQueue1
            queue.current += payload.delta
            startDrip(index)
          } else if (payload.type === 'done') {
            setInterp(prev => ({ status: 'done', text: prev.text }))
            if (index === 0) interpStreamDone0.current = true
          } else if (payload.type === 'error') {
            setInterp({ status: 'error', text: '' })
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('Interpretation error:', err)
      setInterp({ status: 'error', text: '' })
    }
  }, [])


  // add this inside the component, before startInterpretation
function startDrip(index: number) {
  const queue   = index === 0 ? interpQueue0 : interpQueue1
  const typing  = index === 0 ? interpTyping0 : interpTyping1
  const setInterp = index === 0 ? setInterp0 : setInterp1

  if (typing.current) return
  // Hold back the interp typing until the after-tape narration finishes + 2s.
  if (index === 0 && !interpGate0.current) return
  typing.current = true

  const tick = setInterval(() => {
    if (queue.current.length === 0) {
      typing.current = false
      clearInterval(tick)
      if (index === 0 && interpStreamDone0.current) setInterp0TypingDone(true)
      return
    }
    const char = queue.current[0]
    queue.current = queue.current.slice(1)
    setInterp(prev => ({ ...prev, text: prev.text + char }))
  }, 55) // ms per character — increase to slow down
}

  function handleMemorySubmit(index: number) {
    const text = index === 0 ? memory0 : memory1
    if (index === 0) {
      setInterp0TypingDone(false)
      interpStreamDone0.current = false
      // Reset and close the gate so the after-tape narration runs first.
      interpGate0.current = false
      afterText0Started.current = false
      setAfterText0('')
    }
    startInterpretation(index, text)
    generateImage(index, text)
  }

  async function handleSubmitAlbum() {
    if (submitStatus !== 'idle') return
    setSubmitStatus('submitting')
  
    // extract just the filename from the path e.g. /image/1234.png → 1234.png
    const imageFilename = image0.data ? `${Date.now()}.png` : null
    const modalImagePath = latestImage // this is already like /image/1234.png
    const filename = modalImagePath?.replace('/image/', '')
  
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          birthYear,
          memoryText: memory0,
          interpretationText: interp0.text,
          responseText: response0,
          // Gemini's scene description shown under the final image on leaf-3.
          sceneDescription: sceneDesc0,
          tintColor,
          imageData: image0.data,
          // First latent-preview thumbnail — used as the landing page background.
          thumbnailData: previews0[0] ?? null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSubmitStatus('done')
      // Brief moment for the "album saved" affordance to register, then start fading the
      // page to white. We navigate at peak white so the landing page's own fade-in picks up
      // the moment seamlessly — no flash of unstyled content between routes.
      setTimeout(() => setSubmitFading(true), 500)
      setTimeout(() => {
        window.location.href = '/'
      }, 500 + 1200)

    } catch (e) {
      console.error('Submit failed:', e)
      setSubmitStatus('error')
    }
  }

  function clearDevTimers() {
    devTimersRef.current.forEach(clearTimeout)
    devTimersRef.current = []
    if (devIntervalRef.current) { clearInterval(devIntervalRef.current); devIntervalRef.current = null }
  }
  
  function startDevLine(lineIndex: number) {
    if (lineIndex >= DEV_LINES.length) return
    const line = DEV_LINES[lineIndex]
    setDevLineIndex(lineIndex)
    setDevTyped('')
    setDevBlinking(false)
  
    let i = 0
    devIntervalRef.current = setInterval(() => {
      i++
      setDevTyped(line.slice(0, i))
      if (i >= line.length) {
        clearInterval(devIntervalRef.current!)
        devIntervalRef.current = null
        setDevBlinking(true)
        const isLastLine = lineIndex === DEV_LINES.length - 1
        const t = setTimeout(() => {
          setDevBlinking(false)
          if (!isLastLine) {
            setDevTyped('')
            startDevLine(lineIndex + 1)
          }
          // last line: just stop blinking and stay visible
        }, isLastLine ? 1500 : 22000)
        
        devTimersRef.current.push(t)
      }
    }, 65)
  }
  
  useEffect(() => {
    if (!interp0TypingDone) return
    setDevActive(true)
    startDevLine(0)
    return () => clearDevTimers()
  }, [interp0TypingDone])
  
  useEffect(() => {
    if (image0.status === 'done') {
      clearDevTimers()
      setDevActive(false)
    }
  }, [image0.status])


  useEffect(() => {
    if (image0.status !== 'done') return
    if (currentLeafIndex !== 2) return
    const t = setTimeout(() => setCurrentLeafIndex(3), 700)
    return () => clearTimeout(t)
  }, [image0.status])

  // Type out the after-tape narration once the user submits, then open the interp gate
  // after a 2s pause so the leaf-2 interpretation can start dripping. SSE deltas accumulate
  // in interpQueue0 the whole time — only the visual reveal is delayed.
  useEffect(() => {
    if (image0.status === 'idle') {
      setAfterText0('')
      afterText0Started.current = false
      return
    }
    if (afterText0Started.current) return
    afterText0Started.current = true

    let i = 0
    setAfterText0('')
    const typeId = setInterval(() => {
      i++
      setAfterText0(afterText0Full.slice(0, i))
      if (i >= afterText0Full.length) clearInterval(typeId)
    }, 65)

    const openGateId = setTimeout(() => {
      interpGate0.current = true
      startDrip(0)
    }, afterText0Full.length * 65 + 2000)

    // After-tape fade-out is now driven by interp0.text.length > 0 in the JSX directly
    // (the moment the interp drip pushes its first char into state, the narration fades).
    // No timeout needed here — the visible reveal of interp text IS the fade trigger.

    return () => { clearInterval(typeId); clearTimeout(openGateId) }
  }, [image0.status])

  // Orbs spawn only while the image is actively generating. Once status flips to 'done',
  // the spawner stops; existing orbs naturally fade out within ~12s.
  //
  // BUG FIX (previous): the gate was `status !== 'idle'`, which stays true forever after the
  // first submit (idle only happens at initial mount). That meant when status transitioned
  // generating → done, the effect re-ran with `active` still true, spawning 12 NEW orbs and
  // a fresh continuous interval ON TOP of the existing ones. Steady-state orb count compounded
  // every generation cycle. With each orb carrying filter: blur(60px), that overload showed up
  // as flickering across the whole page once the second batch piled on.
  useEffect(() => {
    // DIAGNOSTIC: orbs disabled to verify they're the cause of the interp-drip flicker.
    // Delete this line to re-enable the orb spawner.
    return

    const active = image0.status === 'generating'
    if (!active) {
      // Don't clear orbs immediately — let in-flight orbs finish their natural fade-out cycle.
      // (Their own per-orb removal timers will handle unmounting after ~12s.)
      return
    }

    const FADE_S = 3.5      // CSS opacity transition duration (must match the JSX)
    const LIVE_S = 5        // time at peak before fade-out
    const SPAWN_MS = 1200   // new orb cadence

    // Only spawn-side timers (initial 12 staggered spawns + the recurring interval) go in
    // this array. Per-orb lifecycle timers (visible-flip, invisible-flip, remove) are NOT
    // tracked here — when this effect cleans up (status changes), those need to keep running
    // so existing orbs can finish their natural fade-out cycle instead of being stranded at
    // peak opacity. They self-clean via the final setOrbs(prev => prev.filter(...)) call.
    const spawnTimers: ReturnType<typeof setTimeout>[] = []

    function spawn() {
      orbIdCounter.current += 1
      const orb = makeOrb(orbIdCounter.current)
      setOrbs(prev => [...prev, orb])

      // Next tick: flip to visible — triggers the opacity transition (fade in)
      setTimeout(() => {
        setOrbs(prev => prev.map(o => o.id === orb.id ? { ...o, visible: true } : o))
      }, 30)

      // After fade-in + live time: flip to invisible — triggers fade out
      setTimeout(() => {
        setOrbs(prev => prev.map(o => o.id === orb.id ? { ...o, visible: false } : o))
      }, (FADE_S + LIVE_S) * 1000)

      // After fade-out completes: remove from state
      setTimeout(() => {
        setOrbs(prev => prev.filter(o => o.id !== orb.id))
      }, (FADE_S + LIVE_S + FADE_S + 0.5) * 1000)
    }

    // Seed initial population spread across the first few seconds so they're staggered
    for (let i = 0; i < 12; i++) {
      spawnTimers.push(setTimeout(spawn, Math.random() * 4000))
    }

    // Continuously spawn new orbs while in the generating phase
    const spawnInterval = setInterval(spawn, SPAWN_MS)

    return () => {
      // Stop creating new orbs but let in-flight ones run their lifecycle timers to completion.
      clearInterval(spawnInterval)
      spawnTimers.forEach(clearTimeout)
    }
  }, [image0.status])

  useEffect(() => {
    if (!imageHoverVisible || imageLabelsAnalyzed.current || !image0.data || image0.isMock) return
    imageLabelsAnalyzed.current = true
    setImageLabelsLoading(true)
    fetch('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData: image0.data }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.objects) {
          const objs: ImageLabel[] = data.objects.slice(0, 4)
          setImageLabels(objs)
          objs.forEach((_, i) => {
            setTimeout(() => setRevealedLabels(prev => new Set([...prev, i])), i * 380 + 500)
          })
        }
      })
      .catch(err => {
        // Reset the once-only guard on failure so the next click can retry.
        console.error(err)
        imageLabelsAnalyzed.current = false
      })
      .finally(() => setImageLabelsLoading(false))
  }, [imageHoverVisible])

  function renderGeneratingIndicator(img: ImageState) {
    if (img.status !== 'generating') return null
    return (
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: '28px', height: '28px',
          border: '2px solid #c0bdb7',
          borderTopColor: '#8a8780',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <div style={{
          fontFamily: 'Noto Serif, serif', fontSize: '12px',
          color: '#a8a5a0', fontStyle: 'italic',
        }}>
          developing…
        </div>
      </div>
    )
  }

  function renderInterpretation(index: number) {
    const interp = index === 0 ? interp0 : interp1
    const img = index === 0 ? image0 : image1
  
    if (interp.status === 'idle' || !interp.text.trim()) return null
  
    return (
      <div
        className="interpretation"
        style={{
          position: 'absolute',
          top: '75%',
          left: '11%',
          transform: 'none',
          textAlign: 'left',
          width: '200px',
          
        }}
      >
        {interp.text}
      </div>
    )
  }

  function renderDevelopingScript() {
    if (!devActive && image0.status !== 'done') return null
    if (image0.status === 'done') {
      return (
        <div style={{
          position: 'absolute',
          top: '38%',
          left: '42%',
          transform: 'translateX(-50%)',   // ← add this so it centres on that x point
          textAlign: 'center',             // ← was 'right'
          fontFamily: "'DM Mono', monospace",
          fontWeight: 600,
          fontSize: '11px',
          color: 'rgba(90, 88, 85, 0.7)',
          letterSpacing: '0.01em',
        }}>
          turn over
        </div>
      )
    }
    const body = devBlinking ? devTyped.slice(0, -1) : devTyped
    const lastChar = devBlinking ? devTyped.slice(-1) : ''
  
    return (
      <div style={{
        position: 'absolute',
        top: '38%',
        left: '42%',
        transform: 'translateX(-50%)',
        textAlign: 'left',
        fontFamily: "'DM Mono', monospace",
        fontWeight: 600,
        fontSize: '11px',
        color: 'rgba(90, 88, 85, 0.7)',
        letterSpacing: '0.01em',
      }}>
        {body}
        <span style={{ animation: devBlinking ? 'blink 1s step-end infinite' : 'none' }}>
          {lastChar}
        </span>
      </div>
    )
  }

  function renderMemoryInput(
    index: number,
    value: string,
    setValue: (v: string) => void,
    ref: React.RefObject<HTMLTextAreaElement | null>,
  ) {
    // Constants for this textarea are defined at MODULE LEVEL near the top of the
    // file (search "TAPE-TEXT CONSTRAINT TUNING"). Tune there to adjust dimensions.
    const img         = index === 0 ? image0 : image1
    const isSubmitted = img.status !== 'idle'
    const typedPrompt = index === 0 ? typedPrompt0 : typedPrompt1
    const promptFull  = index === 0 ? prompt0Full : prompt1Full
  
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <LeafBackEdges />

        {/* ── Tape lives here, sibling to the content box, not inside it ──
            drop-shadow filter (rather than box-shadow) follows the tape image's alpha
            channel, so the shadow traces the tape's actual ragged edges instead of
            painting under a transparent rectangle. Composes cleanly with mix-blend-mode:
            multiply — the shadow gets multiplied into the paper just like the tape does,
            which reads as a real piece of tape lifted slightly off the page. */}
        <img
          src="placeholders/tape.png"
          alt=""
          style={{
            position: 'absolute',
            width: '660px',
            left: '55%',
            top: '50%',
            transform: 'translateX(-50%) translateY(-50%) rotate(3deg)',
            mixBlendMode: 'multiply',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.28))',
            pointerEvents: 'none',
            zIndex: -1,
            userSelect: 'none',
          }}
        />

         {/* Typed prompt — anchored at top. Bumped to 20px and widened to 320px to accommodate
             the longer prompt copy without wrapping into too many lines; line-height tightens the
             multi-line block so it doesn't push down into the tape. */}
        {!isSubmitted && (
          <div style={{
            position: 'absolute',
            top: '9%',
            left: '57%',
            transform: 'translateX(-50%)',
            width: '320px',
            textAlign: 'left',
            zIndex: 2,
            fontFamily: "'coral-pixels', sans-serif",
            fontWeight: 600,
            fontSize: '20px',
            lineHeight: '1.35',
            color: 'rgba(90, 88, 85, 0.7)',
            letterSpacing: '0.01em',
            // Embossed-into-paper shadow stack — same recipe as .cover-name on leaf-0:
            // dark shadow lifted slightly above (top-edge recess) + bright white shadow
            // dropped below (paper-rise highlight). Makes the text read as pressed in.
            textShadow:
              '0px -2px 2px rgba(0,0,0,0.2),' +
              ' 0px 3px 5px rgba(255,255,255,1)',
          }}>
            {typedPrompt}
            <span style={{
              display: 'inline-block', width: '1px', height: '15px',
              background: 'rgba(90, 88, 85, 0.5)',
              marginLeft: '1px', verticalAlign: 'middle',
              animation: typedPrompt.length < promptFull.length ? 'none' : 'blink 1s step-end infinite',
            }} />
          </div>
        )}

        {/* After-tape narration — bumped down to 72% so there's clear breathing room between
            the tape's bottom edge and where this narration starts. Was 63% (too tight against
            the tape). */}
        {isSubmitted && index === 0 && (
          <div style={{
            position: 'absolute',
            top: '72%',
            left: '55%',
            transform: 'translateX(-50%)',
            width: '320px',
            textAlign: 'left',
            zIndex: 2,
            fontFamily: "'coral-pixels', sans-serif",
            fontWeight: 600,
            // Narrative tier (16px) — this is the system narrating its own action, not asking
            // the user a question. Sits one step below the prompt above (20px Question tier).
            fontSize: '16px',
            lineHeight: '1.35',
            color: 'rgba(90, 88, 85, 0.7)',
            letterSpacing: '0.01em',
            // Same embossed stack as the prompt above — keeps the leaf's narrative voice
            // visually consistent (both feel pressed into the paper, not floating on it).
            textShadow:
              '0px -2px 2px rgba(0,0,0,0.2),' +
              ' 0px 3px 5px rgba(255,255,255,1)',
            // Fade away the moment the interpretation drip pushes its first character into
            // state. Reads as "the narration hands off to the interpretation."
            opacity: interp0.text.length > 0 ? 0 : 1,
            transition: 'opacity 1.2s ease',
            // GPU-promoted so the opacity transition is pure compositing — no rerasterization
            // of the text + multi-layer text-shadow during the fade.
            willChange: 'opacity',
          }}>
            {afterText0}
            <span style={{
              display: 'inline-block', width: '1px', height: '15px',
              background: 'rgba(90, 88, 85, 0.5)',
              marginLeft: '1px', verticalAlign: 'middle',
              animation: afterText0.length < afterText0Full.length ? 'none' : 'blink 1s step-end infinite',
            }} />
          </div>
        )}

        {/* Textarea — sits below the tape (now at 50%) to maintain the "input rests on tape"
            visual relationship. The whole middle block shifted down to follow the tape. */}
        <div style={{
          position: 'absolute',
          top: `${MEMORY_TEXTAREA_TOP_PCT}%`,
          left: '55%',
          transform: 'translateX(-50%) translateY(-50%)',
          width: '320px',
          zIndex: 2,
          textAlign: 'center',
        }}>
         {/* One SINGLE <textarea> across both editing AND submitted states — readOnly flips
             true once the memory is submitted. Using one element type guarantees no baseline
             shift on Enter (a textarea→div transition shifted by ~2px because browsers render
             textareas with internal offsets that divs don't have, and not all of those internals
             are CSS-overridable). */}
          <textarea
              ref={ref}
              value={value}
              readOnly={isSubmitted}
              // HARD character cap. Browser-enforced — once the user hits MEMORY_MAX_CHARS,
              // additional keystrokes are silently dropped. This is the actual strict cut-off.
              maxLength={MEMORY_MAX_CHARS}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (!isSubmitted && e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleMemorySubmit(index)
                }
              }}
              placeholder="write your memory here...Hit enter to submit"
              style={{
                textAlign: 'left',
                padding: '0',
                width: '100%',
                height: `${MEMORY_TEXTAREA_HEIGHT_PX}px`,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',  // never show a scrollbar; maxLength keeps content within bounds
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
                fontSize: '13px',
                color: '#5a5855',
                lineHeight: '1.4',
                // Hide the caret once submitted so the readonly state reads as a static display
                // rather than a focused input. cursor:default makes the cursor non-text-style.
                caretColor: isSubmitted ? 'transparent' : '#5a5855',
                cursor: isSubmitted ? 'default' : 'text',
              }}
            />
        </div>
      </div>
    )
  }


  const bookLeaves: LeafData[] = [
    {
      id: 'leaf-0',
      paperTexturePath: '/placeholders/backing.png',
      paperTextureRotation: Math.PI / 2,
      front: (
        <div className="cover" style={{ zIndex: 10, background: 'transparent' }}>
          <LeafFrontEdges />
          <div className="cover-glass">
            {/* <div className="cover-title">Core memories</div> */}
            <div style={{ position: 'absolute', top: '445px', left: '180px', textAlign: 'left' }}>
              <div className="cover-name">{userName}</div>
              <div className="cover-dates">{birthYear} – now</div>
            </div>
          </div>
        </div>
      ),
      back: <div style={{ position: 'relative', width: '100%', height: '100%' }} />,
    },
  
    {
      id: 'leaf-1',
      paperTexturePath: '/placeholders/backing.png',
      paperTextureRotation: Math.PI / 2,
      front: (
        // Outer wrapper carries the page edges + holds the orb + holds the text. Orb is
        // absolutely positioned at the leaf-face center so it doesn't inherit any sibling
        // layout's translateX shift. Text stays in its own absolutely-positioned block at
        // the bottom, with the original translateX(-35px) bias that was tuned for the
        // typewriter's layout.
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <LeafFrontEdges />
          {/* Aura orb — positioned to match the original polaroid placement: in the upper
              region of the leaf (top ≈ 42%) with a left bias of -60px (was -35px) to sit
              further left of the page's visible center. Same auraColors[0] hue as the cover
              ghost so the "ghost behind the cover" reveals as the "real" orb when opened.
              Wrapper adds a 5s pulse on top of the AuraOrb's internal drift animation. */}
          <div style={{
            position: 'absolute',
            top: '42%',
            left: 'calc(50% - 45px)',
            transform: 'translate(-50%, -50%)',
          }}>
            <div style={{
              animation: 'orbPulse 5s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}>
              <AuraOrb color={ORB_COLOR} size={500} />
            </div>
          </div>
          {/* Typewriter text — kept at its original position via the same translateX(-35px)
              bias the previous flex column used (centered horizontally, then shifted left). */}
          <div style={{
            position: 'absolute',
            bottom: '10%',
            left: 'calc(50% - 35px)',
            transform: 'translateX(-50%)',
            width: '280px',
            textAlign: 'center',
          }}>
            <span style={{ fontFamily: "'coral-pixels', sans-serif", fontWeight: 600, fontSize: '16px', color: 'rgba(90, 88, 85, 0.7)', lineHeight: '1.5', letterSpacing: '0.01em', textShadow: '0px -2px 2px rgba(0,0,0,0.2), 0px 3px 5px rgba(255,255,255,1)' }}>
              {typedText}
              <span style={{ display: 'inline-block', width: '1px', height: '11px', background: 'rgba(90, 88, 85, 0.5)', marginLeft: '1px', verticalAlign: 'middle', animation: typedText.length < fullText.length ? 'none' : 'blink 1s step-end infinite' }} />
            </span>
          </div>
        </div>
      ),
      back: currentLeafIndex >= 3
      ? <div style={{ position: 'relative', width: '100%', height: '100%' }}><LeafBackEdges /></div>
      : renderMemoryInput(0, memory0, setMemory0, textareaRef0),
    },
  
    // ── leaf-2-trace (commented out — replaced by leaf-2-film below) ──
    // {
    //   id: 'leaf-2-trace',
    //   front: (
    //     <div style={{
    //       position: 'relative', width: '100%', height: '100%',
    //       display: 'flex', alignItems: 'center', justifyContent: 'center',
    //     }}>
    //       {renderInterpretation(0)}
    //       {renderDevelopingScript()}
    //     </div>
    //   ),
    //   back: (
    //     <div style={{
    //       position: 'relative', width: '100%', height: '100%',
    //       transform: 'scaleX(-1)',
    //       opacity: 0.35,
    //     }}>
    //       {renderInterpretation(0)}
    //     </div>
    //   ),
    // },

    // ── leaf-2-film: 3D film strip of generation previews ──
    {
      id: 'leaf-2-film',
      paperTexturePath: '/placeholders/backing.png',
      paperTextureRotation: Math.PI / 2,
      front: <div style={{ position: 'relative', width: '100%', height: '100%' }}><LeafFrontEdges /></div>,
      back:  <div style={{ position: 'relative', width: '100%', height: '100%' }}><LeafBackEdges /></div>,
      children3d: <PreviewFilmStrip frames={previews0} sceneTyped={interp0.text} loading={image0.status !== 'idle' && previews0.length === 0} xCenter={2.8} pageWidth={5.5}
        onCardHover={card => {
          if (currentLeafIndex !== 2) return
          if (unhoverTimer.current) clearTimeout(unhoverTimer.current)
          setDisplayCard(card)
          setHoverVisible(true)
        }}
        onCardUnhover={() => {
          if (currentLeafIndex !== 2) return
          setHoverVisible(false)
          unhoverTimer.current = setTimeout(() => setDisplayCard(null), 280)
        }}
      />,
    },
  
    {
      id: 'leaf-3',
      paperTexturePath: '/placeholders/backing.png',
      paperTextureRotation: Math.PI / 2,
      // The final image now renders as HTML in front content (library-style framing).
      // `imagePlaneData` stays null so the 3D ImagePlane never mounts; PreviewCycler still
      // runs during generation (until image0.status === 'done', when previewFrames is
      // unset so the cycler stops and the HTML img takes over with no overlap).
      // `children3d` is removed because SceneCaption moved into the HTML front content too.
      front: (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <LeafFrontEdges />

          {/* "Click image to inspect" hint has moved OUT of the leaf so it doesn't sit
              alongside the narration content. See the fixed-position version near the bottom
              of the JSX (search "currentLeafIndex === 3" — it sits beside the arrow-keys
              hint block). */}

          {/* Final image — library treatment with a few tweaks vs the library original:
                · top moved 50% → 38% so the image sits in the upper half (more room for the
                  caption beneath)
                · halo intensity reduced: white-belt blur 10→8 / spread 10→6, halo blur 28→16
                  spread 18→8, outermost blur 50→26 spread 24→10, alphas dropped 0.9→0.45 etc.
                  Reads less like a glowing aura, more like a soft paper halo.
              Hover handlers attach here directly — moved off the (now absent) 3D ImagePlane
              overlay so the magnify-zoom + Gemini-label flow continues to work. */}
          {image0.status === 'done' && image0.data && (
            <div
              // Click-to-toggle (was hover-to-show). Hover-based version got stuck whenever
              // a mouseleave event was missed; click is robust and can't get into an
              // unrecoverable state. Closing also possible via Esc or clicking the overlay.
              onClick={(e) => {
                if (currentLeafIndex !== 3) return
                e.stopPropagation()
                setImageHoverVisible(v => !v)
              }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '45%',
                transform: 'translate(-50%, -50%)',
                width: '65%',
                aspectRatio: '7 / 5',
                overflow: 'hidden',
                cursor: imageHoverVisible ? 'zoom-out' : 'zoom-in',
                boxShadow:
                  '0 0 6px 3px rgba(0, 0, 0, 0.6),' +
                  '0 0 8px 6px rgba(255, 255, 255, 0.85),' +
                  '0 0 16px 8px rgba(255, 255, 255, 0.55),' +
                  '0 0 26px 10px rgba(255, 255, 255, 0.35)',
              }}
            >
              <img
                src={image0.isMock ? image0.data : `data:image/png;base64,${image0.data}`}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transform: 'scale(1.25)',
                  display: 'block',
                }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                boxShadow:
                  'inset 11px 10px 18px 0 rgba(0,0,0,0.38),' +
                  'inset -4px -3px 10px 0 rgba(0,0,0,0.12)',
              }} />
            </div>
          )}

          {/* Scene caption — coral-pixels, 20px, embossed. Anchored bottom-center via left:50%
              + translateX(-50%) so the text block is truly centered on the leaf's x-axis.
              Uses typedSceneDesc (typewriter typeout) instead of sceneDesc0 directly so the
              caption types out when the user reaches leaf-3. */}
          {typedSceneDesc && (
            <div style={{
              position: 'absolute',
              bottom: '8%',
              left: 'calc(50% - 35px)',
              transform: 'translateX(-50%)',
              width: '320px',
              textAlign: 'center',
              fontFamily: "'coral-pixels', sans-serif",
              fontWeight: 600,
              fontSize: '16px',
              lineHeight: '1.35',
              color: 'rgba(90, 88, 85, 0.7)',
              letterSpacing: '0.01em',
              textShadow:
                '0px -2px 2px rgba(0,0,0,0.2),' +
                ' 0px 3px 5px rgba(255,255,255,1)',
            }}>
              {typedSceneDesc}
            </div>
          )}
        </div>
      ),
      imagePlaneData: null,
      back: <div style={{ position: 'relative', width: '100%', height: '100%' }}><LeafBackEdges /></div>,
    },

    {
      id: 'leaf-4',
      paperTexturePath: '/placeholders/backing.png',
      paperTextureRotation: Math.PI / 2,
      front: (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <LeafFrontEdges />
          {/* Tape — sibling so the response sits on top of it. Matches leaf-1's enlarged
              tape (540px wide, lowered to 62%) with a drop-shadow to lift it off the paper.
              drop-shadow on an alpha-channel PNG traces the tape's ragged edges; composes
              cleanly with mix-blend-mode: multiply for a real "tape on paper" look. */}
          <img
            src="placeholders/tape.png"
            alt=""
            style={{
              position: 'absolute',
              width: '660px',
              left: 'calc(50% - 35px)',
              top: '50%',
              transform: 'translateX(-50%) translateY(-50%) rotate(3deg)',
              mixBlendMode: 'multiply',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.28))',
              pointerEvents: 'none',
              zIndex: -1,
              userSelect: 'none',
            }}
          />

          {/* Typed question — bumped to 20px and widened to 320px to match leaf-1's prompt.
              Embossed text-shadow (.cover-name recipe) makes it read as pressed into paper. */}
          {!responseSubmitted && (
            <div style={{
              position: 'absolute',
              top: '9%',
              left: 'calc(50% - 35px)',
              transform: 'translateX(-50%)',
              width: '320px',
              textAlign: 'left',
              zIndex: 2,
              fontFamily: "'coral-pixels', sans-serif",
              fontWeight: 600,
              fontSize: '20px',
              lineHeight: '1.35',
              color: 'rgba(90, 88, 85, 0.7)',
              letterSpacing: '0.01em',
              textShadow:
                '0px -2px 2px rgba(0,0,0,0.2),' +
                ' 0px 3px 5px rgba(255,255,255,1)',
            }}>
              {typedPrompt2}
              <span style={{
                display: 'inline-block', width: '1px', height: '15px',
                background: 'rgba(90, 88, 85, 0.5)',
                marginLeft: '1px', verticalAlign: 'middle',
                animation: typedPrompt2.length < prompt2Full.length ? 'none' : 'blink 1s step-end infinite',
              }} />
            </div>
          )}

          {/* Response textarea or submitted response — same y/width as leaf-1's memory
              textarea, but x-centered on the visible page (calc(50% - 35px)) per user
              request: leaf-4's content sits at true page center, not leaf-1's biased shift. */}
          <div style={{
            position: 'absolute',
            // RESPONSE_TEXTAREA_TOP_PCT — tune at module level to shift vertical position.
            top: `${RESPONSE_TEXTAREA_TOP_PCT}%`,
            left: 'calc(50% - 35px)',
            transform: 'translateX(-50%) translateY(-50%)',
            width: '320px',
            zIndex: 2,
            textAlign: 'center',
          }}>
            {/* SINGLE textarea across editing AND submitted states (readOnly flips true on
                submit) — guarantees no baseline shift on Enter. See the matching pattern in
                renderMemoryInput on leaf-1. */}
            <textarea
              ref={responseRef}
              value={response0}
              readOnly={responseSubmitted}
              // HARD character cap — browser-enforced, the strict cut-off. Tune
              // RESPONSE_MAX_CHARS at module level to adjust.
              maxLength={RESPONSE_MAX_CHARS}
              onChange={e => setResponse0(e.target.value)}
              onKeyDown={e => {
                // Enter to submit, mirroring leaf-1's memory textarea behavior. Locks the
                // textarea (setResponseSubmitted) AND fires the album-submit flow in one
                // gesture — same effect as clicking the "submit album" button below.
                if (!responseSubmitted && e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (response0.trim()) {
                    setResponseSubmitted(true)
                    handleSubmitAlbum()
                  }
                }
              }}
              placeholder="write your response here...hit enter to send"
              style={{
                textAlign: 'left',
                padding: '0',
                width: '100%',
                // RESPONSE_TEXTAREA_HEIGHT_PX — tune at module level to adjust box height.
                height: `${RESPONSE_TEXTAREA_HEIGHT_PX}px`,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',  // never show a scrollbar; maxLength keeps content within bounds
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
                fontSize: '13px',
                color: '#5a5855',
                lineHeight: '1.4',
                caretColor: responseSubmitted ? 'transparent' : '#5a5855',
                cursor: responseSubmitted ? 'default' : 'text',
              }}
            />
          </div>

          {/* Submit affordance has moved OUT of the leaf face entirely — now a fixed
              page-level element at bottom: 6%, matching the styling of the other UI hints
              (arrow-keys hint at top, "Click image to inspect" on leaf-3). See the JSX block
              lower in this component, gated on currentLeafIndex === 4. */}
        </div>
      ),
      back: <div style={{ position: 'relative', width: '100%', height: '100%' }}><LeafBackEdges /></div>,
    },
    // leaf-5 and leaf-6 removed
  
  ]

  return (
    <>
      <link rel="stylesheet" href="https://use.typekit.net/aex0tjt.css" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single+Cursive:wght@100..900&family=IM+Fell+English:ital@0;1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Bitcount+Grid+Single+Cursive:wght@100..900&family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          /* Light warm-grey foundation. The persistent aura sits on top of this with its own
             cream tone, so the body color only shows during the very brief moment before the
             aura layer mounts — keeping it pale prevents a dark flash on load. */
          background: linear-gradient(180deg, #d8d6d3 0%, #e8e6e3 100%);
          min-height: 100vh;
          font-family: 'IM Fell English', serif;
          overflow: hidden;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          position: relative;
        }

        .stage {
          position: absolute;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .input-screen {
          animation: fadeup 0.45s ease;
          pointer-events: auto;
        }

        @keyframes fadeup {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .input-card {
          background: rgba(255, 254, 252, 0.70);
          border-radius: 18px;
          padding: 32px 40px 36px;
          width: 320px;
          border: 1px solid rgba(255, 255, 255, 1);
          backdrop-filter: blur(4px) saturate(1.4);
          -webkit-backdrop-filter: blur(4px) saturate(1.4);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -1px 0 rgba(0,0,0,0.06),
            inset 1px 0 0 rgba(255,255,255,0.7),
            inset -1px 0 0 rgba(0,0,0,0.04),
            0 8px 32px rgba(0,0,0,0.08),
            0 2px 8px rgba(0,0,0,0.06);
        }

        .input-label {
          font-size: 20px; color: #2e2c29;
          margin-bottom: 20px; display: block;
          font-family: 'coral-pixels', sans-serif;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .input-field {
          width: 100%; background: transparent; border: none;
          border-bottom: 1px solid #c0bdb7; outline: none;
          font-family: 'DM Mono', monospace; font-size: 13px;
          font-weight: 500;
          color: #2e2c29; padding: 4px 0 6px; caret-color: #2e2c29;
        }
        .input-field::placeholder {
          color: #b8b4ae;
          font-family: 'DM Mono', monospace;
          font-weight: 500;
        }
        .input-field:focus { border-bottom-color: #8a8780; }

        .cover { position: absolute; inset: 0; border-radius: 4px 14px 14px 4px; }
        .cover-glass {
          position: absolute; inset: 0; background: transparent;
          display: flex; flex-direction: column;
          align-items: center; justify-content: space-between; padding: 40px;
        }
        .cover-title {
          font-family: 'redaction-35', sans-serif;
          font-weight: 700; font-size: 62px; text-align: center;
          margin-top: 410px; margin-bottom: 10px; margin-left: -20px;
          color: rgba(110, 108, 106, 0.5);
          text-shadow: 0px -2px 2px rgba(0,0,0,0.2),
            0px 3px 5px rgba(255,255,255,1),
            0px 5px 10px rgba(255,255,255,0.8);
        }
        .cover-name {
          font-family: 'redaction-35', sans-serif;
          font-weight: 700; font-size: 50px; text-align: center;
          color: rgba(110, 108, 106, 0.5);
          text-shadow: 0px -2px 2px rgba(0,0,0,0.2),
            0px 3px 5px rgba(255,255,255,1);
        }
        .cover-dates {
          font-family: 'redaction-35', sans-serif;
          font-weight: 700; font-size: 28px; text-align: center;
          color: rgba(110, 108, 106, 0.5);
          text-shadow: 0px -2px 2px rgba(0,0,0,0.2),
            0px 3px 5px rgba(255,255,255,1);
        }

        .leaf-face { position: absolute; inset: 0; border-radius: 4px 14px 14px 4px; }
        .leaf-face.back { border-radius: 14px 4px 4px 14px; }

        .interpretation {
        font-family: 'coral-pixels', sans-serif;
        font-weight: 600;
        font-size: 11px;
        color: rgba(90, 88, 85, 0.7);
        line-height: 1.6;
        letter-spacing: 0.01em;
        white-space: pre-wrap;
        opacity: 1;
        transition: opacity 0.65s ease;
      }
        .interpretation.fade { opacity: 0; }

        .page-turn-overlay { position: absolute; inset: 0; cursor: pointer; z-index: 10; }
        .page-turn-tab {
          position: absolute; bottom: 16px; right: 20px;
          padding: 6px 14px;
          font-family: 'Noto Serif', serif; font-size: 11px; font-style: italic;
          color: #a8a5a0; cursor: pointer; z-index: 10;
          border-radius: 12px; transition: color 0.2s, background 0.2s;
          user-select: none;
        }
        .page-turn-tab:hover { color: #6a6763; background: rgba(0,0,0,0.04); }
        .page-turn-tab.back-tab { right: auto; left: 20px; }

        textarea::placeholder {
        color: rgba(90, 88, 85, 0.5);
        font-family: 'DM Mono', monospace;
        font-weight: 600;
        font-style: normal;
        font-size: 11px;
        letter-spacing: 0.01em;
      }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Slow, gentle breath for the centered nav hint. Easier on the eye at large sizes
           than a step-blink, and friendlier to motion-sensitive viewers. */
        @keyframes softPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        /* Dismissal animation for the nav hint — holds final 0 opacity via 'forwards'
           so the text stays gone after the user makes their first navigation action. */
        @keyframes hintFadeOut {
          to { opacity: 0; }
        }

        /* Aura blob drifts — three independent paths at different tempos so the blobs glide
           past each other rather than moving in lockstep. Translates pushed to ~12-15% with
           larger scale swings to make the motion clearly perceptible as a living colorworld,
           not a static gradient. The inset:-15% on each blob's div gives drift room without
           ever showing edges in the viewport. */
        @keyframes loadAuraA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(14%, -10%) scale(1.15); }
        }
        @keyframes loadAuraB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-12%, 11%) scale(1.12); }
        }
        @keyframes loadAuraC {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(8%, 13%) scale(1.18); }
        }
        /* Grain shimmer — slow background-position scroll across the noise tile. Steps()
           timing function snaps between frames so the grain reads as living film rather
           than smoothly sliding. */
        @keyframes loadGrainShimmer {
          0%   { background-position: 0 0; }
          100% { background-position: 200px 200px; }
        }

        /* Drift + breath for the cover-ghost orb. Gentler than the load-curtain blobs
           (translate ~6%, scale to 1.08) because the orb sits at a much smaller scale
           inside the cover viewport — larger motion would look jittery rather than alive. */
        @keyframes coverOrbDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(6%, -4%) scale(1.08); }
        }

        /* Pulse for the leaf-1 orb — bigger scale swing + deeper opacity dip than the
           previous gentle breath, so the motion reads clearly from across the page. Speed
           is unchanged (still 5s); only the magnitude was bumped. Applied via a wrapper
           div so the cover-ghost orb (which shares the AuraOrb component) stays unaffected. */
        @keyframes orbPulse {
          0%, 100% { transform: scale(1);     opacity: 1; }
          50%      { transform: scale(1.18);  opacity: 0.6; }
        }

        /* Drift-only keyframes — opacity is handled separately via a CSS transition for ultra-smooth fade.
           Four stops give a curved floating path rather than a straight back-and-forth. */
        @keyframes orbDriftA {
          0%   { transform: translate(0, 0) scale(0.95); }
          25%  { transform: translate(70px, -40px) scale(1.05); }
          50%  { transform: translate(140px, -90px) scale(1.15); }
          75%  { transform: translate(90px, -120px) scale(1.10); }
          100% { transform: translate(0, 0) scale(0.95); }
        }
        @keyframes orbDriftB {
          0%   { transform: translate(0, 0) scale(0.95); }
          25%  { transform: translate(-70px, 50px) scale(1.05); }
          50%  { transform: translate(-130px, 110px) scale(1.10); }
          75%  { transform: translate(-150px, 50px) scale(1.08); }
          100% { transform: translate(0, 0) scale(0.95); }
        }
        @keyframes orbDriftC {
          0%   { transform: translate(0, 0) scale(0.95); }
          25%  { transform: translate(50px, 70px) scale(1.08); }
          50%  { transform: translate(100px, 140px) scale(1.20); }
          75%  { transform: translate(20px, 160px) scale(1.12); }
          100% { transform: translate(0, 0) scale(0.95); }
        }
      `}</style>

      <div className="page">

        {/* Persistent aura background — the same three-blob + grain recipe as the load curtain,
            but quieter (lower blob opacities, lower grain), with a pale warm-grey base instead
            of the cream curtain. Sits at zIndex 0 (above the body, below the canvas at z:10), so
            the album renders against this colorworld for the entire session. Because the blob
            positions and animation timings match the load curtain, the curtain fading away reads
            as the loud version *settling* into this quiet one rather than just disappearing. */}
        <div style={{
          position: 'fixed', inset: 0,
          background: '#e6e4e1',
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: '-15%',
            background: `radial-gradient(ellipse 55% 65% at 65% 50%, ${auraColors[0]} 15%, ${auraColors[0]}00 60%)`,
            filter: 'blur(50px) saturate(2.0) brightness(1.12)',
            opacity: 0.18,
            animation: 'loadAuraA 11s ease-in-out infinite',
            willChange: 'transform',
          }} />
          <div style={{
            position: 'absolute', inset: '-15%',
            background: `radial-gradient(ellipse 45% 55% at 25% 30%, ${auraColors[1]} 15%, ${auraColors[1]}00 60%)`,
            filter: 'blur(50px) saturate(2.0) brightness(1.12)',
            opacity: 0.14,
            animation: 'loadAuraB 14s ease-in-out infinite',
            willChange: 'transform',
          }} />
          <div style={{
            position: 'absolute', inset: '-15%',
            background: `radial-gradient(ellipse 40% 50% at 50% 85%, ${auraColors[2]} 15%, ${auraColors[2]}00 60%)`,
            filter: 'blur(50px) saturate(2.0) brightness(1.12)',
            opacity: 0.11,
            animation: 'loadAuraC 16s ease-in-out infinite',
            willChange: 'transform',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            backgroundSize: '200px 200px',
            mixBlendMode: 'overlay',
            opacity: 0.42,
            animation: 'loadGrainShimmer 8s steps(8) infinite',
            pointerEvents: 'none',
          }} />
        </div>

        {step !== 'cover' && (
          // zIndex at INT_MAX beats the load curtain (2147483646) so the input card
          // remains visible and clickable above the aura curtain during name/birthday entry.
          <div className="stage" style={{ zIndex: 2147483647 }}>
            {step === 'name' && (
              <div className="input-screen">
                <div className="input-card">
                  <span className="input-label">Please enter your name:</span>
                  <input
                    ref={inputRef}
                    className="input-field"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitName()}
                    placeholder="your name"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
            {step === 'birthday' && (
              <div className="input-screen">
                <div className="input-card">
                  <span className="input-label">Please enter your year of birth:</span>
                  <input
                    ref={inputRef}
                    className="input-field"
                    value={bdayInput}
                    onChange={e => setBdayInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && submitBirthday()}
                    placeholder="yyyy"
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top horizon highlight — soft white glow anchored at top-center, fading down
            into the body's grey gradient. Adds depth to the upper half of the screen and
            gives the centered nav hint a brighter tone to read against. zIndex 1 keeps it
            above the body but below the canvas, orbs, and preview atmosphere. */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: '55vh',
          background: 'radial-gradient(ellipse 85% 100% at 50% 0%,' +
            ' rgba(255,255,255,0.9) 0%,' +
            ' rgba(255,255,255,0.48) 35%,' +
            ' rgba(255,255,255,0) 75%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        {/* Scene atmosphere background — first preview blurred full-screen. Wrapper is now
            ALWAYS mounted (was conditionally rendered behind `previews0[0] && …`), so the
            opacity transition has something to animate from when the first preview arrives.
            Wrapper starts at opacity 0 → transitions to 1 over 1.4s when previews0[0] becomes
            truthy → visually crossfades over the colored aura instead of popping in. The img
            inside is conditionally rendered to avoid mounting an `<img src="">` empty tag. */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 5,
          opacity: previews0[0] ? 1 : 0,
          transition: 'opacity 1.4s ease',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          {previews0[0] && (
            <img
              src={`data:image/jpeg;base64,${previews0[0]}`}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: 'blur(20px) brightness(0.97) saturate(0.75)',
                transform: 'scale(1.12)',
                opacity: 0.45,
              }}
            />
          )}
        </div>

        {/* Drifting cloud orbs container — ALWAYS mounted (even when orbs[] is empty) so the
            browser establishes its compositor layer at page-load time. Previously this div
            was conditionally rendered behind `orbs.length > 0`, which meant the layer was
            created on-the-fly when the first orb spawned. That layer creation forced a full
            re-layering of every fixed element below (Three.js canvas, aura layers), which
            showed up as a one-time album flicker right when after-tape text started typing
            (the orb spawn fires around the same moment as the after-tape mount). Keeping the
            container mounted eliminates the layer-creation hiccup. willChange tells the GPU
            to keep a stable layer ready even when no children are present. */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 11,
          pointerEvents: 'none', overflow: 'hidden',
          willChange: 'transform',
        }}>
          {orbs.map(orb => (
            <div key={orb.id} style={{
              position: 'absolute',
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0) 75%)',
              filter: 'blur(25px)',
              opacity: orb.visible ? orb.peak : 0,
              transition: 'opacity 3.5s ease-in-out',
              animation: `${orb.keyframe} ${orb.driftDuration}s ease-in-out ${orb.driftDelay}s infinite`,
              willChange: 'transform, opacity',
            }} />
          ))}
        </div>

        {/* Canvas is mounted from first load so the album is rendered behind the aura the
            entire time. Heavy blur during the input flow keeps the album readable as a soft
            silhouette — combined with the now-translucent curtain base, the blurred album
            shows through the colorworld, giving the input moment two visual layers: the
            aura on top, the album as a soft ghost behind it. Blur lifts when reaching the
            cover step. */}
        <div className="absolute inset-0 z-10" style={{
          filter: step === 'cover' ? 'none' : 'blur(10px) saturate(0.95)',
          transition: 'filter 1.2s ease',
          // Promote to its own GPU layer so the blurred frame isn't re-rasterised on
          // every Three.js paint (GentleSway keeps the canvas continuously dirty).
          willChange: 'filter',
        }}>
            <Canvas gl={{ alpha: true }}>
              <Suspense fallback={null}>
                <SceneReadySignal onReady={() => setSceneReady(true)} />
                <OrthographicCamera
                  makeDefault zoom={100}
                  position={[0, 0, 10]}
                  near={0.01} far={100}
                />
                <OrbitControls
                  enablePan={false}
                  enableZoom={false}
                  maxPolarAngle={Math.PI / 1.5}
                />

                

                <Environment preset="studio" />

                <ambientLight intensity={0.65} />
                <directionalLight position={[3, 5, 3]} intensity={1.2} />
                <pointLight position={[-2, 2, 4]} intensity={0.4} color="#fff8f0" />

                <GroundShadow />
                <GentleSway>
                <BookGroup isOpen={currentLeafIndex > 0}>
                  <BinderRings />
                  <CoverOverlay currentLeafIndex={currentLeafIndex} tintHex={tintColor} orbColor={ORB_COLOR} />
                  {bookLeaves.map((leaf, index) => (
                    <Page
                      key={leaf.id}
                      index={index}
                      currentIndex={currentLeafIndex}
                      totalLeaves={bookLeaves.length}
                      frontContent={leaf.front}
                      backContent={leaf.back}
                      frontClass={leaf.frontClass}
                      imagePlaneData={leaf.imagePlaneData}
                      isMockImage={leaf.isMockImage}
                      // PreviewCycler runs only while the image is still generating; once
                      // status flips to 'done', the HTML <img> in leaf-3's front content
                      // takes over and the 3D cycler stops to avoid overlap.
                      previewFrames={index === 3 && image0.status !== 'done' ? previews0 : undefined}
                      children3d={leaf.children3d}
                      noHoles={index === 0}
                      tracingPaper={false}
                      paperTexturePath={leaf.paperTexturePath}
                      paperTextureRotation={leaf.paperTextureRotation}
                      backingInsetX={undefined}
                      backingInsetBottom={leaf.backingInsetBottom}
                      debossedLine={false /* leaf.id === 'leaf-3' */}
                      noCorner={leaf.id === 'leaf-3'}
                      noPlasticOverlay={leaf.id === 'leaf-3'}
                      onImageHover={leaf.id === 'leaf-3' ? () => {
                        if (currentLeafIndex !== 3) return
                        if (imageUnhoverTimer.current) clearTimeout(imageUnhoverTimer.current)
                        setImageHoverVisible(true)
                      } : undefined}
                      onImageUnhover={leaf.id === 'leaf-3' ? () => {
                        if (currentLeafIndex !== 3) return
                        setImageHoverVisible(false)
                      } : undefined}
                      onTurnNext={() => setCurrentLeafIndex(index + 1)}
                      onTurnBack={() => setCurrentLeafIndex(prev => prev - 1)}
                    />
                  ))}
                </BookGroup>
                </GentleSway>
              </Suspense>
            </Canvas>
          </div>

        {step === 'cover' && (
          <div style={{
            position: 'fixed', top: '6%', left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'coral-pixels', sans-serif",
            fontSize: '38px',
            letterSpacing: '0.08em',
            color: 'rgba(58,56,53,0.78)',
            // Soft white halo so the hint pops against any blurred-thumbnail background —
            // multi-stop glow matches the embossed-on-paper feel used elsewhere in the app.
            textShadow:
              '0 0 8px rgba(255,255,255,1),' +
              ' 0 0 18px rgba(255,255,255,0.85),' +
              ' 0 0 40px rgba(255,255,255,0.6)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            // Sits above the top horizon highlight (zIndex 1), preview atmosphere (5),
            // canvas (10), and orbs (11) so the text reads cleanly on every leaf.
            zIndex: 12,
            // While the hint is live: softPulse breathes the opacity. On first nav: switch to
            // fadeOut which animates from whatever the pulse just landed on down to 0 and holds.
            animation: hintFading
              ? 'hintFadeOut 1.2s ease forwards'
              : 'softPulse 1.3s ease-in-out infinite',
          }}>
            (press arrows to navigate)
          </div>
        )}

        {/* Leaf-3 "Click image to inspect" hint — same size and styling as the arrow-keys
            hint above, but positioned at the BOTTOM of the viewport (under the album) so the
            UI instructions stay visually separate from the leaf's narration content. Visible
            only while the user is on leaf-3 AND the final image is rendered AND the magnified
            inspection overlay isn't already open. */}
        {currentLeafIndex === 3 && image0.status === 'done' && image0.data && !imageHoverVisible && (
          <div style={{
            position: 'fixed', bottom: '6%', left: '50%', transform: 'translateX(-50%)',
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
            animation: 'softPulse 1.3s ease-in-out infinite',
          }}>
            {hasInspectedImage ? 'continue to next page' : 'Click image to inspect'}
          </div>
        )}

        {/* Leaf-4 submit affordance — fixed page-level element at bottom: 6%, same size and
            styling as the arrow-keys hint and the "Click image to inspect" hint, but
            INTERACTIVE (click + hover scale). Always visible on leaf-4 as a persistent
            option (Enter in the textarea is the alternate path). Status labels cycle through
            saving / done / error in place; clickable only while submitStatus === 'idle'. */}
        {currentLeafIndex === 4 && (
          <div
            onMouseEnter={() => submitStatus === 'idle' && setSubmitHovered(true)}
            onMouseLeave={() => setSubmitHovered(false)}
            onClick={submitStatus === 'idle' && response0.trim() ? handleSubmitAlbum : undefined}
            style={{
              position: 'fixed', bottom: '6%', left: '50%',
              transform: `translateX(-50%) scale(${submitHovered && submitStatus === 'idle' && response0.trim() ? 1.1 : 1})`,
              fontFamily: "'coral-pixels', sans-serif",
              fontSize: '38px',
              letterSpacing: '0.08em',
              // Slightly dimmer when there's no response yet, so the affordance reads as
              // "available but waiting for input". Full opacity once user has typed.
              color: submitStatus === 'error' ? 'rgba(180, 80, 80, 0.85)' : 'rgba(58,56,53,0.78)',
              opacity: response0.trim() || submitStatus !== 'idle' ? 1 : 0.45,
              textShadow:
                '0 0 8px rgba(255,255,255,1),' +
                ' 0 0 18px rgba(255,255,255,0.85),' +
                ' 0 0 40px rgba(255,255,255,0.6)',
              whiteSpace: 'nowrap',
              zIndex: 12,
              cursor: submitStatus === 'idle' && response0.trim() ? 'pointer' : 'default',
              pointerEvents: submitStatus === 'idle' && response0.trim() ? 'auto' : 'none',
              userSelect: 'none',
              animation: 'softPulse 1.3s ease-in-out infinite',
              transition: 'transform 220ms cubic-bezier(0.34, 1.5, 0.64, 1), opacity 0.6s ease',
            }}
          >
            {submitStatus === 'idle' && 'submit album'}
            {submitStatus === 'submitting' && 'saving...'}
            {submitStatus === 'done' && 'album saved'}
            {submitStatus === 'error' && 'something went wrong'}
          </div>
        )}

        {displayCard && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', zIndex: 2147483647,
            background: '#f5f3ef',
            padding: '20px 20px 40px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.20)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            opacity: hoverVisible ? 1 : 0,
            transition: hoverVisible ? 'opacity 0.55s ease' : 'opacity 0.22s ease',
          }}>
            <img
              src={`data:image/jpeg;base64,${displayCard.b64}`}
              style={{ width: '480px', height: '316px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: '13px', color: 'rgba(90, 88, 85, 0.65)' }}>
              {displayCard.label}
            </div>
          </div>
        )}

        {image0.status === 'done' && image0.data && (
          <>
          {/* Backdrop: click anywhere on it to dismiss the magnified view. pointer-events
              gated on imageHoverVisible so clicks pass through when the overlay is hidden. */}
          <div
            onClick={() => setImageHoverVisible(false)}
            style={{
              position: 'fixed', inset: 0,
              pointerEvents: imageHoverVisible ? 'auto' : 'none',
              cursor: imageHoverVisible ? 'zoom-out' : 'default',
              zIndex: 2147483646,
              backdropFilter: imageHoverVisible ? 'blur(10px) brightness(0.88)' : 'blur(0px) brightness(1)',
              opacity: imageHoverVisible ? 1 : 0,
              transition: 'opacity 0.30s ease, backdrop-filter 0.30s ease',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -55%)',
            // Overlay content itself stays pointer-events:none — clicks through it land on
            // the backdrop above, which dismisses the magnified view. Keeps the labels
            // visible without making the image-region itself a click target.
            pointerEvents: 'none', zIndex: 2147483647,
            opacity: imageHoverVisible ? 1 : 0,
            transition: 'opacity 0.22s ease',
          }}>
            <div style={{ position: 'relative', width: '820px', height: '580px' }}>
              <img
                src={image0.isMock ? image0.data : `data:image/png;base64,${image0.data}`}
                style={{ width: '820px', height: '580px', objectFit: 'cover', display: 'block' }}
              />

              {imageLabels && (
                <svg overflow="visible" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {imageLabels.map((obj, i) => {
                    if (!revealedLabels.has(i)) return null
                    const px = obj.point[1] / 1000 * 820
                    const py = obj.point[0] / 1000 * 580
                    const [lx, ly] = getLabelPos(px, py, 920, 580)
                    return <line key={i} x1={px} y1={py} x2={lx} y2={ly} stroke="rgba(245,243,239,0.45)" strokeWidth="1" />
                  })}
                </svg>
              )}

              {imageLabels && imageLabels.map((obj, i) => {
                if (!revealedLabels.has(i)) return null
                const px = obj.point[1] / 1000 * 820
                const py = obj.point[0] / 1000 * 580
                const [lx, ly] = getLabelPos(px, py, 920, 580)
                return (
                  <div key={i}>
                    <div style={{
                      position: 'absolute', left: px, top: py,
                      transform: 'translate(-50%,-50%)',
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'rgba(245,243,239,0.9)',
                      boxShadow: '0 0 0 1.5px rgba(90,88,85,0.35)',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', left: lx, top: ly,
                      transform: 'translate(-50%,-50%)',
                      background: 'rgba(18,16,13,0.65)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 5, padding: '5px 10px',
                      fontFamily: "'DM Mono', monospace", fontWeight: 600,
                      fontSize: 13, color: 'rgba(245,243,239,0.88)',
                      whiteSpace: 'normal', maxWidth: 200, lineHeight: '1.5',
                      pointerEvents: 'none',
                      animation: 'fadeIn 0.35s ease',
                    }}>
                      <span style={{ color: 'rgba(245,243,239,0.48)', marginRight: 10 }}>{obj.label}</span>
                      <Typewriter text={obj.description} />
                    </div>
                  </div>
                )
              })}

              {imageLabelsLoading && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 20px)', left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: "'coral-pixels', sans-serif", fontWeight: 600,
                  fontSize: 32, color: '#ffffff',
                  letterSpacing: '0.02em',
                  textShadow: '0 0 24px rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                  animation: 'softPulse 1.3s ease-in-out infinite',
                  whiteSpace: 'nowrap',
                }}>
                  analysing image…
                </div>
              )}
            </div>

          </div>
          </>
        )}

        {/* Load-curtain aura — three blurred color blobs (tint + two accents) drifting
            independently over a cream base, with an SVG turbulence grain overlay set to
            mix-blend-mode: overlay so the noise sits *inside* the colors rather than on
            top of them. Stays visible through the entire input flow (name + birthday) as
            the input atmosphere; only dismisses when the user reaches the cover step. On
            dismissal it both fades AND scales up slightly so the aura reads as "expanding
            and dissipating" rather than just disappearing — pairs well with the persistent
            aura quietly underneath. */}
        <div style={{
          position: 'fixed', inset: 0,
          // Two-phase background:
          //   1. Before sceneReady: FULLY OPAQUE cream — masks the staggered Three.js mount
          //      where pages render ~1-2 frames before the cover (MeshPhysicalMaterial's
          //      shader compiles slower than the pages' basic material). User never sees the
          //      glitch.
          //   2. After sceneReady: translucent cream wash — lets the (still heavily-blurred)
          //      album ghost through as a soft tinted silhouette behind the aura.
          // The CSS transition on `background` interpolates smoothly between the two solid
          // colors, so the blurred album appears to materialise through the curtain rather
          // than popping into view.
          background: sceneReady ? 'rgba(245, 243, 239, 0.42)' : '#f5f3ef',
          // Dismissal is gated on BOTH the scene being ready AND the user reaching the cover
          // step, so the aura persists as the input atmosphere instead of vanishing on load.
          opacity: sceneReady && step === 'cover' ? 0 : 1,
          // Subtle scale-up during dismissal — gives a "the cloud expands and disperses" feel
          // rather than a flat opacity fade. Composes cleanly with the per-blob drift animations.
          transform: sceneReady && step === 'cover' ? 'scale(1.06)' : 'scale(1)',
          // Block clicks/key focus while the curtain is up — otherwise users could type into
          // an input field they can't see, or click through to the (hidden) book corners.
          pointerEvents: sceneReady && step === 'cover' ? 'none' : 'auto',
          // Three distinct transitions: background reveals the album over 1.2s once Three.js
          // is ready; opacity+transform handle the slower 2s dreamy dismissal on cover step.
          transition: 'opacity 2s ease, transform 2s ease, background 1.2s ease',
          // One step below INT_MAX so the input-card stage at INT_MAX wins the stacking
          // tiebreak — user can see and type into the card even with the curtain at full opacity.
          // Still well above drei's CSS3D Html stack (~16.7M), so book corner clicks stay blocked.
          zIndex: 2147483646,
          overflow: 'hidden',
        }}>
          {/* Dominant tint blob — largest, most opaque, anchored right-of-center.
              saturate(1.4) punches the palette colors past the muted defaults so the
              colorworld reads as a definitive identity element, not a wash. */}
          <div style={{
            position: 'absolute', inset: '-15%',
            background: `radial-gradient(ellipse 55% 65% at 65% 50%, ${auraColors[0]} 15%, ${auraColors[0]}00 60%)`,
            filter: 'blur(50px) saturate(2.0) brightness(1.12)',
            opacity: 0.15,
            animation: 'loadAuraA 11s ease-in-out infinite',
            willChange: 'transform',
          }} />
          {/* Accent A — upper-left, smaller and softer than the tint */}
          <div style={{
            position: 'absolute', inset: '-15%',
            background: `radial-gradient(ellipse 45% 55% at 25% 30%, ${auraColors[1]} 15%, ${auraColors[1]}00 60%)`,
            filter: 'blur(50px) saturate(2.0) brightness(1.12)',
            opacity: 0.12,
            animation: 'loadAuraB 14s ease-in-out infinite',
            willChange: 'transform',
          }} />
          {/* Accent B — lower-center, smallest, dimmest, completes the triangle */}
          <div style={{
            position: 'absolute', inset: '-15%',
            background: `radial-gradient(ellipse 40% 50% at 50% 85%, ${auraColors[2]} 15%, ${auraColors[2]}00 60%)`,
            filter: 'blur(50px) saturate(2.0) brightness(1.12)',
            opacity: 0.10,
            animation: 'loadAuraC 16s ease-in-out infinite',
            willChange: 'transform',
          }} />
          {/* Grain — inline SVG fractalNoise tiled at 200x200, blended INTO the colors via
              mix-blend-mode: overlay so it modulates them rather than sitting like a film
              on top. backgroundSize matches the SVG viewBox for clean tiling; the shimmer
              animation slowly scrolls position so the grain reads as alive. */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            backgroundSize: '200px 200px',
            mixBlendMode: 'overlay',
            opacity: 0.55,
            animation: 'loadGrainShimmer 8s steps(8) infinite',
            pointerEvents: 'none',
          }} />
        </div>

        <BackButton
          tintColor={tintColor}
          hidden={loadFadingIn || submitFading}
          onClick={() => {
            // Reuse the existing submitFading white sheet to fade to white, then navigate
            // to landing so the page → white → page handoff matches every other route.
            setSubmitFading(true)
            setTimeout(() => { window.location.href = '/' }, 1200)
          }}
        />

        {/* Dual-purpose white sheet — covers the whole viewport at max zIndex. Two triggers:
            (1) loadFadingIn (= !sceneReady): true at mount, flips false once the inner
                Canvas Suspense has resolved AND a few frames have rendered (so shaders
                compile before reveal). 5s safety timeout in case something hangs.
            (2) submitFading: flips true once an album is submitted → sheet fades to white
                again, masking the route change to '/' so the landing page's own white
                fade-in picks up seamlessly. Rendered last in DOM so it tiebreaks above the
                stage at equal max zIndex. */}
        <div style={{
          position: 'fixed', inset: 0,
          background: '#ffffff',
          opacity: loadFadingIn || submitFading ? 1 : 0,
          pointerEvents: loadFadingIn || submitFading ? 'auto' : 'none',
          transition: 'opacity 1.2s ease',
          zIndex: 2147483647,
        }} />

      </div>
    </>
  )
}