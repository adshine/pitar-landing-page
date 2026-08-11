import { useEffect, useRef, useState } from "react"
import type { CSSProperties, FormEvent } from "react"
import {
  ArrowRight,
  Cloud,
  DropboxLogo,
  EnvelopeSimple,
  Files,
  FolderOpen,
  Pause,
  Play,
  SquaresFour,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import * as THREE from "three"

import { createPitarOrbModel } from "@/orb-lab/components/createPitarOrbModel"

import "./orb-chat.css"

const DEMO_QUESTION = "Where is the renewal clause?"
const DEMO_DURATION = 16_000
const QUESTION_START = 5_250
const QUESTION_LETTER_INTERVAL = 60

type DemoPhase = "idle" | "sources" | "connect" | "activate" | "collapse" | "ask" | "thinking" | "answer" | "hold"

const PHASE_LABELS: Record<DemoPhase, string> = {
  idle: "Waiting",
  sources: "Sources online",
  connect: "Indexing sources",
  activate: "Pitar ready",
  collapse: "Opening search",
  ask: "Composing question",
  thinking: "Searching 7 sources",
  answer: "Answer found",
  hold: "Cited answer",
}

type SourceNode = {
  id: string
  label: string
  icon: Icon
  left: number
  top: number
  delay: number
}

const SOURCE_NODES: SourceNode[] = [
  { id: "gmail", label: "Gmail", icon: EnvelopeSimple, left: 7, top: 13, delay: 0 },
  { id: "drive", label: "Google Drive", icon: Files, left: 78, top: 15, delay: 80 },
  { id: "outlook", label: "Outlook", icon: SquaresFour, left: 3, top: 31, delay: 160 },
  { id: "onedrive", label: "OneDrive", icon: Cloud, left: 79, top: 34, delay: 240 },
  { id: "sharepoint", label: "SharePoint", icon: FolderOpen, left: 6, top: 49, delay: 320 },
  { id: "dropbox", label: "Dropbox", icon: DropboxLogo, left: 76, top: 52, delay: 400 },
  { id: "box", label: "Box", icon: Files, left: 46, top: 65, delay: 480 },
]

const CONNECTION_PATHS = [
  { id: "gmail", d: "M 8 15 C 20 15 32 22 50 35" },
  { id: "drive", d: "M 92 17 C 80 17 68 23 50 35" },
  { id: "outlook", d: "M 4 33 C 19 33 33 31 50 35" },
  { id: "onedrive", d: "M 96 36 C 81 36 67 37 50 35" },
  { id: "sharepoint", d: "M 8 51 C 21 51 33 43 50 35" },
  { id: "dropbox", d: "M 92 54 C 79 54 66 46 50 35" },
  { id: "box", d: "M 50 67 C 50 57 50 46 50 35" },
]

const phaseAt = (elapsed: number): DemoPhase => {
  if (elapsed < 800) return "idle"
  if (elapsed < 2_200) return "sources"
  if (elapsed < 3_800) return "connect"
  if (elapsed < 4_700) return "activate"
  if (elapsed < 5_600) return "collapse"
  if (elapsed < 8_200) return "ask"
  if (elapsed < 9_400) return "thinking"
  if (elapsed < 13_000) return "answer"
  return "hold"
}

const typedQuestionAt = (elapsed: number) => {
  if (elapsed < QUESTION_START) return ""
  if (elapsed < 8_200) return DEMO_QUESTION.slice(0, Math.floor((elapsed - QUESTION_START) / QUESTION_LETTER_INTERVAL))
  return DEMO_QUESTION
}

const answerLineCountAt = (elapsed: number) => {
  if (elapsed < 9_900) return 0
  if (elapsed < 10_600) return 1
  if (elapsed < 11_300) return 2
  return 4
}

function MorphingOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      })
    } catch {
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const halfHeight = 1.22 / 0.97
    const camera = new THREE.OrthographicCamera(-halfHeight, halfHeight, halfHeight, -halfHeight, 0.1, 100)
    camera.position.set(0, 0, 5.4)
    const model = createPitarOrbModel()
    scene.add(model.root)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const startedAt = performance.now()
    let animationFrame = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      renderer.setSize(width, height, false)
      const aspect = width / height
      camera.left = -halfHeight * aspect
      camera.right = halfHeight * aspect
      camera.top = halfHeight
      camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const draw = (now: number) => {
      model.tick(reducedMotion ? 0 : (now - startedAt) / 1000)
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(draw)
    }

    animationFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      model.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} aria-label="Animated black glass Pitar orb" />
}

export function OrbChatPage() {
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [phase, setPhase] = useState<DemoPhase>(prefersReducedMotion ? "hold" : "idle")
  const [question, setQuestion] = useState(prefersReducedMotion ? DEMO_QUESTION : "")
  const [lineCount, setLineCount] = useState(prefersReducedMotion ? 4 : 0)
  const [hasCitation, setHasCitation] = useState(prefersReducedMotion)
  const [isPaused, setIsPaused] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const inputShellRef = useRef<HTMLFormElement>(null)
  const elapsedRef = useRef(0)
  const manualTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (manualMode) return

    if (prefersReducedMotion) return

    let animationFrame = 0
    let lastTick = performance.now()

    const tick = (now: number) => {
      const delta = now - lastTick
      lastTick = now

      if (!isPaused) {
        elapsedRef.current = (elapsedRef.current + delta) % DEMO_DURATION
        const nextElapsed = elapsedRef.current
        const nextPhase = phaseAt(nextElapsed)
        const nextQuestion = typedQuestionAt(nextElapsed)
        const nextLineCount = answerLineCountAt(nextElapsed)

        setPhase((current) => current === nextPhase ? current : nextPhase)
        setQuestion((current) => current === nextQuestion ? current : nextQuestion)
        setLineCount((current) => current === nextLineCount ? current : nextLineCount)
        setHasCitation(nextElapsed >= 12_100)
      }

      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrame)
  }, [isPaused, manualMode, prefersReducedMotion])

  useEffect(() => () => {
    if (manualTimerRef.current !== null) window.clearTimeout(manualTimerRef.current)
  }, [])

  const isInputVisible = phase === "collapse" || phase === "ask" || phase === "thinking" || phase === "answer" || phase === "hold"
  const isAnswerVisible = phase === "answer" || phase === "hold"

  useEffect(() => {
    const stage = stageRef.current
    const consoleElement = consoleRef.current
    const inputShell = inputShellRef.current
    if (!stage || !consoleElement || !inputShell) return

    const syncOrbTarget = () => {
      const stageRect = stage.getBoundingClientRect()
      const inputRect = inputShell.getBoundingClientRect()
      stage.style.setProperty("--orb-chat-orb-target-left", `${inputRect.left - stageRect.left + 28}px`)
      stage.style.setProperty("--orb-chat-orb-target-top", `${inputRect.top - stageRect.top + inputRect.height / 2}px`)
    }

    const observer = new ResizeObserver(syncOrbTarget)
    observer.observe(stage)
    observer.observe(consoleElement)
    syncOrbTarget()
    window.addEventListener("resize", syncOrbTarget, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", syncOrbTarget)
    }
  }, [isAnswerVisible, isInputVisible, phase])

  const restart = () => {
    if (manualTimerRef.current !== null) window.clearTimeout(manualTimerRef.current)
    elapsedRef.current = 0
    setManualMode(false)
    setIsPaused(false)
    setPhase("idle")
    setQuestion("")
    setLineCount(0)
    setHasCitation(false)
  }

  const openComposer = () => {
    if (manualTimerRef.current !== null) window.clearTimeout(manualTimerRef.current)
    setManualMode(true)
    setIsPaused(false)
    setPhase("ask")
    window.setTimeout(() => inputRef.current?.focus(), 120)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (manualTimerRef.current !== null) window.clearTimeout(manualTimerRef.current)
    setManualMode(true)
    setIsPaused(false)
    setPhase("thinking")
    setLineCount(0)
    setHasCitation(false)
    manualTimerRef.current = window.setTimeout(() => {
      setPhase("answer")
      setLineCount(4)
      setHasCitation(true)
    }, 1_100)
  }

  const handleInputFocus = () => {
    if (phase === "idle" || phase === "sources" || phase === "connect" || phase === "activate") openComposer()
  }

  const answerLines = [
    "The agreement renews automatically.",
    "Written notice is required at least",
    "30 days before the current term ends.",
  ]

  return (
    <main className="orb-chat-page" data-phase={phase}>
      <nav className="orb-chat-nav" aria-label="Primary navigation">
        <a className="orb-chat-brand" href="#orb-chat-top">Pitar</a>
        <div className="orb-chat-nav-links">
          <a href="#product">Product</a>
          <a href="#sources">Sources</a>
          <a href="#signin">Sign in</a>
        </div>
      </nav>

      <div className="orb-chat-body" id="orb-chat-top">
        <section className="orb-chat-copy" aria-labelledby="orb-chat-title">
          <div className="orb-chat-copy__body">
            <h1 id="orb-chat-title">Get answers you can trust from every file you own.</h1>
            <p>Search emails, contracts, scans, and cloud drives in one place. Get a concise answer, then open the exact page it came from.</p>
            <div className="orb-chat-actions">
              <button className="orb-chat-button orb-chat-button--primary" type="button" onClick={restart}>
                Open Pitar <ArrowRight weight="bold" />
              </button>
              <button className="orb-chat-button" type="button" onClick={openComposer}>
                See how it works
              </button>
            </div>
          </div>
        </section>

        <aside ref={stageRef} className="orb-chat-stage" id="sources" aria-label="Animated demonstration of Pitar searching connected sources">
          <div className="orb-chat-stage__chrome" aria-hidden="true">
            <span>Your archive / connected</span>
            <span>{PHASE_LABELS[phase]}</span>
          </div>

          <svg className="orb-chat-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {CONNECTION_PATHS.map((connection) => <path id={`orb-chat-path-${connection.id}`} d={connection.d} key={connection.id} />)}
            </defs>
            {CONNECTION_PATHS.map((connection, index) => (
              <g className="orb-chat-connection-group" key={connection.id}>
                <use href={`#orb-chat-path-${connection.id}`} className="orb-chat-connection" />
                <circle className="orb-chat-connection-particle" r="0.45">
                  <animateMotion dur="1.45s" begin={`${index * 120}ms`} repeatCount="indefinite" path={connection.d} />
                </circle>
              </g>
            ))}
          </svg>

          {SOURCE_NODES.map(({ icon: Icon, ...node }) => (
            <article
              className="orb-chat-source-node"
              data-source={node.id}
              key={node.id}
              style={{ left: `${node.left}%`, top: `${node.top}%`, transitionDelay: `${node.delay}ms` } as CSSProperties}
            >
              <Icon className="orb-chat-source-node__icon" weight="regular" aria-hidden="true" />
              <span>{node.label}</span>
            </article>
          ))}

          <div className="orb-chat-orb" aria-hidden="true">
            <MorphingOrb />
          </div>

          <div className={`orb-chat-cursor${phase === "activate" || phase === "collapse" || phase === "ask" || phase === "thinking" ? " is-visible" : ""}`} aria-hidden="true">
            <svg viewBox="0 0 18 24"><path d="M1 1L16 14H9L6 22L2.5 20.5L5 13H1V1Z" fill="white" stroke="black" /></svg>
          </div>

          <div ref={consoleRef} className={`orb-chat-console${isInputVisible ? " is-visible" : ""}`}>
            <form ref={inputShellRef} className={`orb-chat-input-shell${phase === "thinking" ? " is-focused" : ""}`} onSubmit={submit}>
              <label className="sr-only" htmlFor="orb-chat-question">Ask your archive</label>
              <input
                ref={inputRef}
                id="orb-chat-question"
                value={question}
                placeholder="Ask your archive"
                autoComplete="off"
                onFocus={handleInputFocus}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <button type="submit" aria-label="Ask Pitar"><ArrowRight weight="bold" /></button>
            </form>

            <article className={`orb-chat-answer-card${isAnswerVisible ? " is-visible" : ""}`} aria-hidden={!isAnswerVisible}>
              <div className="orb-chat-answer-card__inner">
                <p className="orb-chat-answer-card__meta"><span>Answer 01</span><span>7 sources searched</span></p>
                <div className="orb-chat-answer-card__copy">
                  {answerLines.map((line, index) => <p className={index < lineCount ? "is-visible" : ""} key={line}>{line}</p>)}
                </div>
                <p className={`orb-chat-answer-card__source${hasCitation ? " is-visible" : ""}`}>Master services agreement / page 14 ↗</p>
              </div>
            </article>
          </div>

          <button className="orb-chat-pause" type="button" onClick={() => setIsPaused((paused) => !paused)}>
            {isPaused ? <Play weight="fill" aria-hidden="true" /> : <Pause weight="fill" aria-hidden="true" />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>
          <p className="sr-only" aria-live="polite">{PHASE_LABELS[phase]}</p>
        </aside>
      </div>
    </main>
  )
}
