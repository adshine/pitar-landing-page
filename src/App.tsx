import { type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"

type Connector = {
  label: string
  icon: string
  color: string
}

const logoBase = `${import.meta.env.BASE_URL}logos/`

const connectors: Connector[] = [
  { label: "Gmail", icon: `${logoBase}gmail.svg`, color: "#EA4335" },
  { label: "Google Drive", icon: `${logoBase}googledrive.svg`, color: "#0F9D58" },
  { label: "Dropbox", icon: `${logoBase}dropbox.svg`, color: "#0061FF" },
  { label: "OneDrive", icon: `${logoBase}onedrive.svg`, color: "#0078D4" },
  { label: "Outlook", icon: `${logoBase}outlook.svg`, color: "#0078D4" },
  { label: "SharePoint", icon: `${logoBase}sharepoint.svg`, color: "#0078D4" },
  { label: "Box", icon: `${logoBase}box.svg`, color: "#0061D5" },
  { label: "Folder upload", icon: `${logoBase}folder.svg`, color: "#6A6A6A" },
  { label: "Mobile capture", icon: `${logoBase}mobile.svg`, color: "#111111" },
]

const connectionGroups = [
  {
    title: "Available now",
    items: [
      ["Gmail", "Mail and attachments", `${logoBase}gmail.svg`],
      ["Google Drive", "Documents, sheets, PDFs", `${logoBase}googledrive.svg`],
      ["Outlook", "Mail and attachments", `${logoBase}outlook.svg`],
      ["OneDrive", "Personal and business", `${logoBase}onedrive.svg`],
      ["SharePoint", "Sites and libraries", `${logoBase}sharepoint.svg`],
      ["Dropbox", "Files and scans", `${logoBase}dropbox.svg`],
      ["Box", "Enterprise vaults", `${logoBase}box.svg`],
      ["Folder upload", "Drag a folder in", `${logoBase}folder.svg`],
      ["Mobile capture", "Photograph paper", `${logoBase}mobile.svg`],
    ],
  },
]

const upcomingErp = ["SAP", "Oracle", "NetSuite", "Dynamics 365", "Workday", "Sage"]

export function App() {
  const marqueeItems = useMemo(() => Array.from({ length: 4 }, () => connectors).flat(), [])
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const storySectionRef = useRef<HTMLElement | null>(null)
  const storyContentRef = useRef<HTMLDivElement | null>(null)
  const [storyRevealed, setStoryRevealed] = useState(false)
  const [openPanel, setOpenPanel] = useState<string | null>(null)

  const panelTitle: Record<string, string> = {
    connections: "Connections",
    auth: "Sign in",
    trust: "Trust",
    story: "Our Story",
  }

  const panelCopy: Record<string, string[]> = {
    connections: [
      "Connect your records from supported sources.",
      "Start with a mail account, cloud drive, or folder upload.",
      "All answers surface the original source page for easy verification.",
    ],
    auth: ["Sign in to your account.", "This panel is a placeholder for your auth entry point."],
    trust: ["View how provenance is tracked from source to answer.", "Every answer is anchored with trace metadata."],
    story: [
      "It started with one man's papers.",
      "The rule was simple: if I could not verify it in the source, I did not want it.",
      "Pitar exists to give every answer a source that can be checked.",
    ],
  }

  const scrollToStory = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setOpenPanel(null)
    document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const openPanelFromClick = (event: MouseEvent<HTMLAnchorElement>, panel: string) => {
    event.preventDefault()
    setOpenPanel(panel)
  }

  const closePanel = () => {
    setOpenPanel(null)
  }

  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".legacy-primary")
    const handleClick = () => {
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    buttons.forEach((button) => button.addEventListener("click", handleClick))
    return () => buttons.forEach((button) => button.removeEventListener("click", handleClick))
  }, [])

  useEffect(() => {
    const section = storySectionRef.current
    const content = storyContentRef.current
    if (!section || !content) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !storyRevealed) {
          setStoryRevealed(true)
          gsap.fromTo(
            content,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.75, ease: "power2.out" }
          )
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [storyRevealed])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const trackContainer = track.closest(".legacy-marquee")
    if (!trackContainer) return

    let frame = 0
    const speed = 38
    let last = performance.now()
    let x = 0

    const update = (timestamp: number) => {
      const delta = (timestamp - last) / 1000
      last = timestamp

      if (!pausedRef.current) {
        const trackWidth = track.firstElementChild?.getBoundingClientRect().width ?? 0
        if (trackWidth > 0) {
          x -= speed * delta
          if (x <= -trackWidth) x += trackWidth
          track.style.transform = `translateX(${x}px)`
        }
      }

      frame = requestAnimationFrame(update)
    }

    const pause = () => {
      pausedRef.current = true
    }
    const play = () => {
      pausedRef.current = false
      last = performance.now()
    }

    trackContainer.addEventListener("mouseenter", pause)
    trackContainer.addEventListener("mouseleave", play)
    trackContainer.addEventListener("focusin", pause)
    trackContainer.addEventListener("focusout", play)

    frame = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(frame)
      trackContainer.removeEventListener("mouseenter", pause)
      trackContainer.removeEventListener("mouseleave", play)
      trackContainer.removeEventListener("focusin", pause)
      trackContainer.removeEventListener("focusout", play)
    }
  }, [])

  return (
    <main className="legacy-page" aria-labelledby="hero-title">
      <style>{`
        :root {
          --paper: #0a0a0a;
          --paper-deep: #060606;
          --ink: #f2f2f2;
          --muted: #bfbfbf;
          --line: rgba(242, 242, 242, 0.2);
          --acid: #d3ee67;
          --serif: "Instrument Serif", Georgia, serif;
          --sans: "DM Sans", Arial, sans-serif;
          --mono: "Space Mono", monospace;
        }

        .legacy-page {
          position: relative;
          isolation: isolate;
          min-height: 100svh;
          margin: 0;
          overflow: hidden;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
        }

        .legacy-page * {
          box-sizing: border-box;
        }

        .legacy-hero {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: 100%;
          min-height: 100svh;
          padding: 8px 12px 24px;
          gap: 20px;
        }

        .legacy-hero-main {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: clamp(20px, 3vh, 32px);
          width: 100%;
          min-width: 0;
          min-height: 0;
          padding: 2px 0 0;
          animation: legacy-rise-in 0.85s 120ms ease both;
        }

        .legacy-hero-top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px 28px;
        }

        .legacy-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: "Helvetica Neue", Helvetica, sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: inherit;
          text-decoration: none;
        }

        .legacy-brand-lockup {
          display: inline-flex;
          align-items: center;
          gap: 0;
        }

        .legacy-brand-stack {
          display: inline-flex;
          flex-direction: column;
          gap: 2px;
          line-height: 1;
          text-transform: none;
          letter-spacing: 0;
        }

        .legacy-brand-stack b {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1;
        }

        .legacy-brand-stack span {
          color: var(--muted);
          font-size: 0.55rem;
          letter-spacing: 0.18em;
        }

        .legacy-brand-divider {
          width: 1px;
          height: 16px;
          margin-left: 10px;
          background: var(--border);
        }

        .legacy-brand-mark {
          display: grid;
          flex: 0 0 13px;
          width: 13px;
          height: 13px;
          place-items: center;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: #e9e5da;
          font-family: "Helvetica Neue", Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .legacy-brand-mark img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .legacy-nav {
          display: flex;
          align-items: center;
          gap: clamp(16px, 2.5vw, 32px);
          font-family: "Helvetica Neue", Helvetica, sans-serif;
          font-size: 0.59rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .legacy-nav a {
          position: relative;
          color: var(--muted);
          text-decoration: none;
          transition: color 180ms ease;
        }

        .legacy-nav .legacy-navlink,
        .legacy-nav .legacy-signin {
          font-size: 0.56rem;
        }

        .legacy-nav .legacy-signin {
          padding: 8px 13px;
          border: 1px solid var(--muted);
          border-radius: 0;
          color: var(--ink);
        }

        .legacy-nav--fixed {
          position: fixed;
          top: 8px;
          left: 50%;
          z-index: 20;
          padding: 10px 10px 10px 14px;
          background: var(--paper);
          border: 1px solid var(--border);
          transform: translateX(-50%);
        }

        .legacy-panel-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(4, 4, 4, 0.58);
          opacity: 0;
          pointer-events: none;
          transition: opacity 240ms ease;
        }

        .legacy-panel-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .legacy-panel {
          position: fixed;
          top: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 45;
          width: min(420px, calc(100vw - 32px));
          background: color-mix(in oklch, var(--paper) 86%, transparent);
          border: 1px solid var(--line);
          box-shadow: 0 24px 120px rgba(0, 0, 0, 0.48);
          transform: translateX(110%);
          transition: transform 300ms cubic-bezier(0.22, 0.61, 0.36, 1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          backdrop-filter: blur(16px);
        }

        .legacy-panel.visible {
          transform: translateX(0);
        }

        .legacy-panel-header {
          min-height: 58px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          align-items: center;
          font-family: var(--mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.58rem;
          color: var(--ink);
        }

        .legacy-panel-title {
          margin: 0;
          font-size: 0.58rem;
          line-height: 1;
        }

        .legacy-panel-close {
          color: var(--ink);
          background: transparent;
          border: none;
          width: auto;
          height: auto;
          border-radius: 0;
          padding: 0;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          margin-top: 1px;
          margin-right: -2px;
          transform: translateY(1px);
          cursor: pointer;
        }

        .legacy-panel-content {
          padding: 18px;
          display: grid;
          gap: 10px;
          overflow-y: auto;
          font-size: 13px;
          color: var(--muted);
          font-family: var(--sans);
        }

        .legacy-panel-content p {
          margin: 0;
          line-height: 1.6;
        }

        .legacy-connections-intro {
          padding-bottom: 18px;
          border-bottom: 1px solid var(--line);
        }

        .legacy-connections-intro strong {
          display: block;
          margin-bottom: 8px;
          color: var(--ink);
          font-size: 1.15rem;
          line-height: 1.15;
        }

        .legacy-connection-group {
          display: block;
          padding: 0;
          border-bottom: 1px solid var(--line);
        }

        .legacy-connection-group summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          cursor: pointer;
          list-style: none;
        }

        .legacy-connection-group summary::-webkit-details-marker {
          display: none;
        }

        .legacy-connection-group summary::after {
          content: "+";
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.8rem;
        }

        .legacy-connection-group[open] summary::after {
          content: "−";
        }

        .legacy-connection-group-body {
          display: grid;
          gap: 10px;
          padding: 0 0 16px;
        }

        .legacy-connection-group h3 {
          margin: 0;
          color: var(--ink);
          font-family: var(--mono);
          font-size: 0.58rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .legacy-connection-group-note {
          font-size: 0.72rem;
        }

        .legacy-connection-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-top: 1px solid var(--line);
          border-left: 1px solid var(--line);
        }

        .legacy-connection-item {
          min-height: 74px;
          padding: 11px;
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }

        .legacy-connection-item strong {
          display: block;
          margin-bottom: 5px;
          color: var(--ink);
          font-size: 0.76rem;
        }

        .legacy-connection-item img {
          display: block;
          width: 22px;
          height: 22px;
          margin-bottom: 14px;
          object-fit: contain;
        }

        .legacy-connection-item span {
          font-size: 0.66rem;
          line-height: 1.4;
        }

        .legacy-erp-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .legacy-erp-list span {
          padding: 7px 8px;
          border: 1px solid var(--line);
          color: var(--ink);
          font-family: var(--mono);
          font-size: 0.56rem;
          text-transform: uppercase;
        }

        .legacy-hero-copy {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
          gap: clamp(28px, 5vw, 80px);
          padding: 48px;
          width: 100%;
          min-width: 0;
        }

        .legacy-hero-copy h1 {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 13ch;
          margin: 0;
          font-family: var(--sans);
          font-size: clamp(3.3rem, 4.8vw, 5.2rem);
          font-weight: 600;
          letter-spacing: -0.045em;
          line-height: 0.88;
        }

        .legacy-hero-copy h1 span {
          display: block;
        }


        .legacy-hero-copy h1 em {
          display: inline;
          color: var(--muted);
          font-style: normal;
        }

        .legacy-hero-aside {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-end;
          align-self: stretch;
          flex: 1 1 0;
          height: 100%;
          min-width: 0;
          max-width: 480px;
        }

        .legacy-eyebrow {
          font-family: var(--mono);
          font-size: 0.59rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          margin: 0;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legacy-eyebrow::before {
          width: 28px;
          height: 1px;
          content: "";
          background: var(--ink);
        }

        .legacy-hero-description {
          max-width: 440px;
          margin: 0;
          color: var(--muted);
          font-size: clamp(0.92rem, 1.15vw, 1.08rem);
          line-height: 1.55;
        }

        .legacy-hero-footer {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          margin-top: clamp(24px, 3.5vh, 40px);
        }

        .legacy-primary {
          position: relative;
          display: inline-flex;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: #0a0a0a;
          cursor: pointer;
          font-family: var(--mono);
          font-size: 0.63rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: box-shadow 180ms ease, transform 180ms ease;
        }

        .legacy-primary:hover,
        .legacy-primary:focus-visible {
          box-shadow: 5px 5px 0 var(--acid);
          transform: translate(-2px, -2px);
          outline: none;
        }

        .legacy-secondary {
          display: inline-flex;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid rgba(233, 229, 218, 0.42);
          background: transparent;
          color: #e9e5da;
          font-family: var(--mono);
          font-size: 0.63rem;
          letter-spacing: 0.08em;
          text-decoration: none;
          text-transform: uppercase;
          transition: border-color 180ms ease, background 180ms ease;
        }

        .legacy-secondary:hover,
        .legacy-secondary:focus-visible {
          border-color: #e9e5da;
          background: rgba(233, 229, 218, 0.08);
          outline: none;
        }

        .legacy-hero-stage {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
          order: -1;
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(233, 229, 218, 0.18);
          overflow: hidden;
        }

        .legacy-visual {
          position: relative;
          display: grid;
          place-items: center;
          width: 100%;
          max-width: none;
          aspect-ratio: 735 / 413;
          height: auto;
          max-height: min(56svh, 560px);
          overflow: hidden;
          border-radius: 0;
          background: #080000;
        }

        .legacy-visual video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: grayscale(1) sepia(1) saturate(6) hue-rotate(72deg) contrast(1.08);
        }

        .legacy-marquee {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 3;
          flex: 0 0 auto;
          width: 100%;
          max-width: none;
          overflow: hidden;
          border-radius: 0;
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          margin: 0;
          padding: 0;
          background: rgba(5, 18, 8, 0.46);
          box-shadow: inset 0 1px 0 rgba(180, 255, 196, 0.14);
          -webkit-backdrop-filter: blur(20px) saturate(1.3);
          backdrop-filter: blur(20px) saturate(1.3);
          mask-image: linear-gradient(90deg, #000 0%, #000 8%, #000 92%, #000 100%);
        }

        .legacy-marquee-label {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 6;
          display: flex;
          align-items: center;
          min-width: 126px;
          padding: 0 18px;
          border-right: 1px solid rgba(233, 229, 218, 0.18);
          background: rgba(5, 12, 7, 0.9);
          color: #e9e5da;
          font-family: var(--mono);
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transform: none !important;
          -webkit-backdrop-filter: blur(16px);
          backdrop-filter: blur(16px);
          cursor: pointer;
        }

        .legacy-scroll-hint {
          position: absolute;
          left: 50%;
          bottom: 28px;
          z-index: 5;
          transform: translateX(-50%);
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--ink);
          text-decoration: none;
          text-align: center;
          font-family: var(--mono);
          letter-spacing: 0.11em;
          text-transform: uppercase;
          font-size: 0.56rem;
          animation: legacy-scroll-hint-fade 5.2s ease-in-out infinite;
        }

        .legacy-scroll-hint span {
          opacity: 0;
          animation: inherit;
        }

        .legacy-scroll-hint svg {
          width: 15px;
          height: 15px;
          stroke: currentColor;
          stroke-width: 1.8;
          fill: none;
          animation: legacy-scroll-hint-bounce 2s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }

        @keyframes legacy-scroll-hint-bounce {
          0% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(8px);
          }
          55% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes legacy-scroll-hint-fade {
          0%, 12% {
            opacity: 0;
          }
          24%, 68% {
            opacity: 1;
          }
          78%, 100% {
            opacity: 0;
          }
        }

        .legacy-track {
          display: flex;
          width: max-content;
          gap: 0;
          will-change: transform;
        }

        .legacy-track-group {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 0;
        }

        .legacy-group {
          position: relative;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          width: 64px;
          height: 44px;
        }

        .legacy-group:hover,
        .legacy-group:focus-within {
          z-index: 4;
          width: max-content;
        }

        .legacy-chip {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          height: 44px;
          width: 64px;
          max-width: 64px;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: var(--ink);
          white-space: nowrap;
          cursor: default;
          color: #e9e5da;
          transition: background 180ms ease;
          transform: none;
        }

        .legacy-chip:hover,
        .legacy-chip:focus-visible {
          z-index: 2;
          width: max-content;
          max-width: none;
          gap: 12px;
          padding: 0 12px 0 21px;
          border-color: transparent;
          background: rgba(5, 12, 7, 0.88);
          outline: none;
          color: var(--ink);
        }

        .legacy-chip-icon {
          position: relative;
          z-index: 2;
          display: grid;
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          place-items: center;
          transform: none;
        }

        .legacy-chip-icon img {
          width: 22px;
          height: 22px;
          display: block;
          object-fit: contain;
          filter: none;
          opacity: 1;
        }

        .legacy-chip:hover .legacy-chip-icon img,
        .legacy-chip:focus-visible .legacy-chip-icon img {
          filter: none;
        }

        .legacy-chip-label {
          position: relative;
          top: auto;
          left: auto;
          z-index: 1;
          display: block;
          height: auto;
          max-width: 0;
          overflow: hidden;
          opacity: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: #e9e5da;
          pointer-events: none;
          transform: none;
          font-family: var(--mono);
          font-size: 0.58rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: max-width 280ms ease, opacity 200ms ease;
        }

        .legacy-chip:hover .legacy-chip-label,
        .legacy-chip:focus-visible .legacy-chip-label {
          max-width: 220px;
          opacity: 1;
          padding: 0;
          border-color: transparent;
          color: #e9e5da;
        }

        .legacy-story {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          padding: 48px 0 110px;
          color: var(--muted);
          opacity: 1;
        }

        .legacy-story > div {
          transform: translateY(18px);
          opacity: 0;
          display: grid;
          gap: 14px;
        }

        .legacy-story p {
          margin: 0;
          max-width: 64ch;
          line-height: 1.7;
          font-size: 1rem;
        }

        .legacy-story p:first-child {
          color: var(--ink);
          font-size: 0.6rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .legacy-story h2 {
          margin: 0;
          max-width: 16ch;
          color: var(--ink);
          font-size: clamp(2rem, 4vw, 2.7rem);
          line-height: 1.05;
          letter-spacing: -0.045em;
          font-family: var(--sans);
        }

        @keyframes legacy-rise-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          .legacy-hero {
            min-height: auto;
          }

          .legacy-hero-copy {
            display: block;
          }

          .legacy-hero-aside {
            max-width: none;
            margin-top: 26px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .legacy-track {
            transform: none;
          }

          .legacy-scroll-hint,
          .legacy-scroll-hint span,
          .legacy-scroll-hint svg {
            animation: none;
            opacity: 1;
          }

          .legacy-track-group[aria-hidden="true"] {
            display: none;
          }

          .legacy-hero-copy,
          .legacy-hero-copy h1,
          .legacy-hero-description,
          .legacy-chip,
          .legacy-primary {
            transition: none;
          }
        }
      `}</style>

      <nav className="legacy-nav legacy-nav--fixed" aria-label="Primary">
        <a className="legacy-brand" href="#top" aria-label="Pitar home">
          <span className="legacy-brand-lockup">
            <span className="legacy-brand-mark" aria-hidden="true">
              <img src={`${import.meta.env.BASE_URL}logos/pitar-mark.svg`} alt="" />
            </span>
            <span className="legacy-brand-stack">
              <b>itar</b>
            </span>
            <span className="legacy-brand-divider" aria-hidden="true" />
          </span>
        </a>
        <a className="legacy-navlink" href="#work" data-panel="sources" onClick={(event) => openPanelFromClick(event, "connections")}>
          Connections
        </a>
        <a className="legacy-navlink" href="#work" data-panel="provenance" onClick={(event) => openPanelFromClick(event, "trust")}>
          Trust
        </a>
        <a className="legacy-navlink" href="#our-story" data-panel="origin" onClick={scrollToStory}>
          Our Story
        </a>
        <a className="legacy-navlink legacy-signin" href="#" data-panel="auth" onClick={(event) => openPanelFromClick(event, "auth")}>
          Sign in
        </a>
      </nav>

      <button type="button" className={`legacy-panel-backdrop ${openPanel ? "visible" : ""}`} aria-hidden={!openPanel} onClick={closePanel} />

      <aside className={`legacy-panel ${openPanel ? "visible" : ""}`} aria-hidden={!openPanel} role="dialog" aria-modal="true" aria-label="Panel">
        <header className="legacy-panel-header">
          <h2 className="legacy-panel-title">{openPanel ? panelTitle[openPanel] ?? "Panel" : ""}</h2>
          <button className="legacy-panel-close" type="button" onClick={closePanel} aria-label="Close panel">
            ×
          </button>
        </header>
        {openPanel && (
          <div className="legacy-panel-content">
            {openPanel === "connections" ? (
              <>
                <p className="legacy-connections-intro">
                  <strong>Everything you hold, in one place.</strong>
                  Connect a source once. Pitar keeps it current, and reads text out of scans and photographs.
                </p>
                {connectionGroups.map((group) => (
                  <details className="legacy-connection-group" key={group.title} open={group.title === "Available now"}>
                    <summary><h3>{group.title}</h3></summary>
                    <div className="legacy-connection-group-body">
                      {group.note && <p className="legacy-connection-group-note">{group.note}</p>}
                      <div className="legacy-connection-list">
                        {group.items.map(([name, description, icon]) => (
                          <div className="legacy-connection-item" key={name}>
                            <img src={icon} alt="" />
                            <strong>{name}</strong>
                            <span>{description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
                <details className="legacy-connection-group">
                  <summary><h3>ERP systems are next</h3></summary>
                  <div className="legacy-connection-group-body">
                    <p className="legacy-connection-group-note">Not connected yet. We would rather say so than let a row of logos imply otherwise.</p>
                    <div className="legacy-erp-list">
                      {upcomingErp.map((name) => <span key={name}>{name}</span>)}
                    </div>
                  </div>
                </details>
              </>
            ) : (
              (panelCopy[openPanel] ?? []).map((text) => <p key={text}>{text}</p>)
            )}
          </div>
        )}
      </aside>

      <section className="legacy-hero" id="top" aria-labelledby="hero-title">
        <div className="legacy-hero-main">
          <div className="legacy-hero-copy">
            <h1 id="hero-title">
              <span>Ask anything.</span>
                <span>Know <em>instantly.</em></span>
            </h1>

            <aside className="legacy-hero-aside" id="approach">
              <p className="legacy-eyebrow">Your knowledge, answered.</p>
              <p className="legacy-hero-description">
                One sentence answers from your mail, drives, contracts, scans, and whatever else you already hold. Every
                answer shows the page.
              </p>

              <div className="legacy-hero-footer" id="contact">
                <button className="legacy-primary" type="button" data-scroll-target="#work">
                  Start asking
                </button>
                <a className="legacy-secondary" href="#" data-panel="auth">
                  Sign in
                </a>
              </div>
            </aside>
          </div>
        </div>

        <div className="legacy-hero-stage" id="work" aria-label="Featured Pitar visual">
          <div className="legacy-visual" aria-label="Background hero visual" aria-hidden="true">
            <video src={`${import.meta.env.BASE_URL}videos/hero.mp4`} autoPlay loop muted playsInline />
          </div>
          <div className="legacy-marquee" aria-label="Possible connectors">
            <button className="legacy-marquee-label" type="button" onClick={() => setOpenPanel("connections")}>Connections</button>
            <div className="legacy-track" ref={trackRef}>
              <div className="legacy-track-group">
                {marqueeItems.map((connector, index) => (
                  <span className="legacy-group" key={`left-${index}-${connector.label}`}>
                    <span
                      className="legacy-chip"
                      aria-label={connector.label}
                      style={{ ["--chip-color" as keyof CSSProperties]: connector.color } as CSSProperties}
                    >
                      <span className="legacy-chip-icon" aria-hidden="true">
                        <img src={connector.icon} alt="" width="22" height="22" />
                      </span>
                      <span className="legacy-chip-label">{connector.label}</span>
                    </span>
                  </span>
                ))}
              </div>
              <div className="legacy-track-group" aria-hidden="true">
                {marqueeItems.map((connector, index) => (
                  <span className="legacy-group" key={`right-${index}-${connector.label}`}>
                    <span
                      className="legacy-chip"
                      style={{ ["--chip-color" as keyof CSSProperties]: connector.color } as CSSProperties}
                    >
                      <span className="legacy-chip-icon" aria-hidden="true">
                        <img src={connector.icon} alt="" width="22" height="22" />
                      </span>
                      <span className="legacy-chip-label">{connector.label}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <a className="legacy-scroll-hint" href="#approach" aria-label="Scroll to content">
          <span>Scroll down</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 7v10M8 13l4 4 4-4" />
          </svg>
        </a>
      </section>

      <section className="legacy-story" id="our-story" ref={storySectionRef} aria-label="Pitar origin story">
        <div ref={storyContentRef}>
          <p>Our story</p>
          <h2>The origin of Pitar.</h2>
          <p>
            My father, Peter Chukwu Emeka Nwankwo, wrote constantly. Letters, sermons, ledgers kept in a hand I can still
            recognise across a room. When he died I had eleven boxes and no way to ask them anything.
          </p>
          <p>
            Search was never the problem. A hundred hits is not an answer. I wanted to be told what the record said, and
            shown exactly where, so I could go and read it myself.
          </p>
          <p>
            If I could not check it, I did not want it. That turned out to be the general case: a finance team reconciling
            twenty years of contracts wants what a son wants, an answer and the page it came from.
          </p>
        </div>
      </section>
    </main>
  )
}

export default App
