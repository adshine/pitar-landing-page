import { type CSSProperties, type MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(ScrollTrigger, useGSAP)

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

const howItWorksSteps = [
  {
    step: "01",
    title: "Connect your sources",
    copy: "Connect email and drive accounts first. Pitar reads only files you already own, then keeps the source for every answer.",
  },
  {
    step: "02",
    title: "Ask one question",
    copy: "Type a short question. Pitar scans your connected sources and returns a one-sentence answer with clear, direct wording.",
  },
  {
    step: "03",
    title: "Review the evidence",
    copy: "Every result points to the exact source document and location, so you can verify before you act.",
  },
]

export function App() {
  const marqueeItems = useMemo(() => connectors.slice(0, 6), [])
  const trackRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const storySectionRef = useRef<HTMLElement | null>(null)
  const storyContentRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const panelBackdropRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [openMobileMenu, setOpenMobileMenu] = useState(false)

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

  const closeMobileMenu = () => {
    setOpenMobileMenu(false)
  }

  const scrollToStory = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setOpenPanel(null)
    closeMobileMenu()
    document.getElementById("our-story")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const scrollToHowItWorks = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setOpenPanel(null)
    closeMobileMenu()
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const openPanelFromClick = (event: MouseEvent<HTMLAnchorElement>, panel: string) => {
    event.preventDefault()
    setOpenPanel(panel)
    closeMobileMenu()
  }

  const closePanel = () => {
    setOpenPanel(null)
  }

  useEffect(() => {
    if (!openMobileMenu) return

    const previousOverflow = document.body.style.overflow
    const firstLink = mobileMenuRef.current?.querySelector<HTMLAnchorElement>(".legacy-mobile-menu-links a")
    const focusFrame = requestAnimationFrame(() => firstLink?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMobileMenu(false)
        return
      }

      if (event.key === "Tab" && mobileMenuRef.current) {
        const focusable = Array.from(mobileMenuRef.current.querySelectorAll<HTMLElement>("a, button"))
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
      mobileMenuButtonRef.current?.focus()
    }
  }, [openMobileMenu])

  useEffect(() => {
    const panel = panelRef.current
    const backdrop = panelBackdropRef.current
    if (!panel || !backdrop) return

    gsap.killTweensOf([panel, backdrop])

    if (openPanel) {
      panel.removeAttribute("inert")
      gsap.set(panel, { visibility: "visible", xPercent: 110 })
      gsap.to(panel, { xPercent: 0, duration: 0.34, ease: "power3.out" })
      gsap.to(backdrop, { autoAlpha: 1, duration: 0.22, ease: "power2.out" })
    } else {
      panel.setAttribute("inert", "")
      gsap.to(panel, { xPercent: 110, duration: 0.26, ease: "power2.in", onComplete: () => gsap.set(panel, { visibility: "hidden" }) })
      gsap.to(backdrop, { autoAlpha: 0, duration: 0.2, ease: "power2.in" })
    }
  }, [openPanel])

  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".legacy-primary")
    const handleClick = () => {
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    buttons.forEach((button) => button.addEventListener("click", handleClick))
    return () => buttons.forEach((button) => button.removeEventListener("click", handleClick))
  }, [])

  useGSAP(() => {
    const content = storyContentRef.current
    if (!content) return

    const children = Array.from(content.children)

    gsap.set(children, {
      autoAlpha: 0.4,
      y: 48,
      filter: "grayscale(45%) blur(8px)",
      color: "var(--muted)",
    })

    children.forEach((child) => {
      gsap.to(child, {
        autoAlpha: 1,
        y: 0,
        filter: "grayscale(0%) blur(0px)",
        color: "var(--ink)",
        ease: "power2.out",
        scrollTrigger: {
          trigger: child,
          start: "top 82%",
          end: "top 52%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    })

    requestAnimationFrame(() => ScrollTrigger.refresh(true))
  }, { scope: storySectionRef })

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
          --section-inline: clamp(16px, 4.8vw, 48px);
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
          padding: 8px var(--section-inline) 24px;
          gap: 20px;
        }

        .legacy-hero-main {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: clamp(20px, 3vh, 32px);
          width: min(1180px, 100%);
          margin-inline: auto;
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
          justify-content: flex-start;
          gap: clamp(16px, 2.5vw, 32px);
          flex-wrap: nowrap;
          font-family: "Helvetica Neue", Helvetica, sans-serif;
          font-size: 0.59rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .legacy-nav-links {
          display: flex;
          flex: 0 0 auto;
          align-items: center;
          gap: clamp(16px, 2.5vw, 32px);
        }

        .legacy-nav .legacy-brand,
        .legacy-nav .legacy-navlink,
        .legacy-nav .legacy-signin {
          flex: 0 0 auto;
          white-space: nowrap;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .legacy-nav .legacy-signin {
          padding: 8px 13px;
          border: 1px solid var(--muted);
          border-radius: 0;
          color: var(--ink);
        }

        .legacy-nav .legacy-navlink:not(.legacy-signin) {
          padding: 8px 10px;
        }

        .legacy-nav a,
        .legacy-hamburger,
        .legacy-mobile-menu-close {
          border-radius: 0;
          transition: color 160ms ease, background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 100ms ease;
        }

        .legacy-nav a:hover,
        .legacy-hamburger:hover,
        .legacy-mobile-menu-close:hover {
          background: rgba(233, 229, 218, 0.08);
          color: var(--ink);
        }

        .legacy-nav .legacy-signin:hover {
          border-color: var(--ink);
          background: var(--ink);
          color: #080a09;
        }

        .legacy-nav a:focus-visible,
        .legacy-hamburger:focus-visible,
        .legacy-mobile-menu-close:focus-visible {
          z-index: 2;
          outline: 1px solid var(--ink);
          outline-offset: 3px;
          color: var(--ink);
        }

        .legacy-nav a:active,
        .legacy-hamburger:active,
        .legacy-mobile-menu-close:active {
          background: rgba(233, 229, 218, 0.14);
          transform: translateY(1px);
        }

        .legacy-nav .legacy-signin:active {
          background: rgba(233, 229, 218, 0.82);
          color: #080a09;
        }

        .legacy-hamburger {
          display: none;
          width: 44px;
          height: 44px;
          margin-left: auto;
          border: 0;
          border-radius: 0;
          background: color-mix(in oklch, var(--paper) 74%, transparent);
          color: inherit;
          cursor: pointer;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          padding: 9px;
        }

        .legacy-hamburger span {
          display: block;
          width: 18px;
          height: 2px;
          background: var(--ink);
          margin: 0;
        }

        .legacy-mobile-nav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 18;
          border: 0;
          background: rgba(3, 3, 3, 0.55);
          opacity: 0;
          pointer-events: none;
        }

        .legacy-mobile-nav-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .legacy-mobile-nav-links {
          position: fixed;
          inset: 0;
          z-index: 30;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          width: 100vw;
          height: 100dvh;
          padding: 0 var(--section-inline) max(24px, env(safe-area-inset-bottom));
          gap: 0;
          border: 0;
          background: color-mix(in oklch, var(--paper) 86%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transform: translateX(100%);
          opacity: 0;
          visibility: hidden;
          transition:
            transform 240ms ease,
            opacity 240ms ease,
            visibility 0s linear 240ms;
          pointer-events: none;
          overflow-y: auto;
        }

        .legacy-mobile-nav-links.is-open {
          transform: translateX(0);
          opacity: 1;
          visibility: visible;
          transition-delay: 0s;
          pointer-events: auto;
        }

        .legacy-mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 68px;
          padding-top: env(safe-area-inset-top);
          border-bottom: 0;
        }

        .legacy-mobile-menu-close {
          display: grid;
          width: 48px;
          height: 48px;
          padding: 0;
          place-items: center;
          border: 0;
          background: transparent;
          color: var(--ink);
          font: 400 2rem/1 var(--sans);
          cursor: pointer;
        }

        .legacy-mobile-menu-links {
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: flex-start;
          gap: 16px;
          padding: 24px 0;
        }

        .legacy-mobile-nav-links .legacy-navlink,
        .legacy-mobile-nav-links .legacy-signin {
          width: 100%;
          justify-content: flex-start;
          text-align: left;
          font-family: var(--sans);
          font-size: 3.3rem;
          line-height: 0.88;
          font-weight: 600;
          letter-spacing: -0.045em;
          padding: 10px 0;
          min-height: 0;
          height: auto;
        }

        .legacy-mobile-nav-links .legacy-signin {
          justify-content: flex-start;
          border: 0;
          padding: 10px 0;
        }

        .legacy-nav--fixed {
          position: fixed;
          top: 8px;
          left: 50%;
          z-index: 20;
          width: max-content;
          max-width: calc(100% - 16px);
          padding: 10px 14px 10px 14px;
          background: color-mix(in oklch, var(--paper) 74%, transparent);
          border: 1px solid var(--line);
          border-radius: 0;
          backdrop-filter: blur(18px) saturate(1.25);
          -webkit-backdrop-filter: blur(18px) saturate(1.25);
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.25);
          transform: translateX(-50%);
          justify-content: flex-start;
        }

        .legacy-mobile-nav .legacy-brand-divider {
          display: none;
        }

        .legacy-panel-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(4, 4, 4, 0.58);
          opacity: 0;
          pointer-events: none;
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
          visibility: hidden;
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
          padding: 24px 0 0;
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
          font-weight: 400;
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

        .legacy-marquee .legacy-track {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          width: calc(100% - 126px);
          margin-left: 126px;
          transform: none !important;
          will-change: auto;
        }

        .legacy-marquee .legacy-track-group {
          display: contents;
        }

        .legacy-marquee .legacy-group,
        .legacy-marquee .legacy-group:hover,
        .legacy-marquee .legacy-group:focus-within {
          width: 100%;
          height: 52px;
          overflow: visible;
          border: 0;
        }

        .legacy-marquee .legacy-chip,
        .legacy-marquee .legacy-chip:hover,
        .legacy-marquee .legacy-chip:focus-visible {
          position: relative;
          width: 100%;
          height: 52px;
          padding: 0;
          overflow: hidden;
          background: transparent;
          gap: clamp(6px, 0.8vw, 10px);
          padding: 0 clamp(6px, 1vw, 12px);
          justify-content: center;
        }

        .legacy-marquee .legacy-chip-icon,
        .legacy-marquee .legacy-chip-label {
          position: relative;
          inset: auto;
          display: grid;
          width: auto;
          height: auto;
          max-width: none;
          place-items: center;
          opacity: 1;
          transform: none;
          transition: none;
        }

        .legacy-marquee .legacy-chip-label {
          padding: 0;
          color: #e9e5da;
          text-align: left;
          width: max-content;
          min-width: max-content;
          max-width: none;
          overflow: visible;
          white-space: nowrap;
        }

        .legacy-marquee .legacy-chip:hover .legacy-chip-icon,
        .legacy-marquee .legacy-chip:focus-visible .legacy-chip-icon {
          transform: none;
        }

        .legacy-marquee .legacy-chip:hover .legacy-chip-label,
        .legacy-marquee .legacy-chip:focus-visible .legacy-chip-label {
          transform: none;
        }

        .legacy-marquee {
          border-top-color: var(--line);
          box-shadow: none;
        }

        .legacy-marquee-label {
          border: 0;
        }

        .legacy-story {
          width: 100%;
          margin: 0 auto;
          padding: 48px var(--section-inline) 110px;
          color: var(--muted);
          opacity: 1;
        }

        .legacy-story > div {
          display: grid;
          gap: 14px;
        }

        .legacy-how-copy {
          display: grid;
          align-content: start;
          gap: 14px;
        }

        @media (min-width: 901px) {
          #how-it-works > div {
            grid-template-columns: minmax(0, 0.9fr) minmax(440px, 1.1fr);
            align-items: start;
            gap: clamp(64px, 9vw, 144px);
          }

          #how-it-works .legacy-story-accordion {
            padding-top: 2px;
          }
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
          #our-story {
            text-align: left !important;
            justify-items: start !important;
          }

          #our-story > div {
            align-items: flex-start !important;
            text-align: left !important;
          }

          #our-story h2,
          #our-story p {
            margin-inline: 0 !important;
            text-align: left !important;
          }

          #our-story > div > * {
            margin-inline: 0 !important;
          }

          .legacy-nav {
            transform: none;
            padding: 7px 8px 7px 18px;
            font-size: 0.54rem;
            letter-spacing: 0.06em;
            justify-content: space-between;
          }

          .legacy-nav-links {
            display: none;
          }

          .legacy-hamburger {
            display: inline-flex;
          }

          .legacy-nav--fixed {
            left: var(--section-inline);
            right: var(--section-inline);
            width: auto;
            top: 4px;
            transform: none;
            backdrop-filter: blur(16px) saturate(1.15);
            -webkit-backdrop-filter: blur(16px) saturate(1.15);
          }

          .legacy-brand-divider {
            display: none;
          }

          .legacy-mobile-nav-links {
            inset: 0;
            width: 100%;
          }

          .legacy-nav--fixed .legacy-hamburger {
            height: 44px;
            width: 44px;
          }

          .legacy-nav .legacy-brand-stack b {
            font-size: 0.92rem;
          }

          .legacy-nav .legacy-brand-stack span {
            font-size: 0.48rem;
            letter-spacing: 0.1em;
          }

          .legacy-nav--fixed .legacy-brand-mark {
            width: 16px;
            height: 16px;
          }

          .legacy-nav .legacy-brand {
            min-height: 44px;
          }

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

        @media (max-width: 700px) {
          .legacy-scroll-hint {
            left: clamp(18px, 5vw, 28px);
            right: auto;
            transform: none;
            align-items: flex-start;
            justify-content: flex-start;
            text-align: left;
            width: auto;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
            -webkit-appearance: none;
            appearance: none;
          }

          .legacy-scroll-hint svg {
            align-self: flex-start;
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

        #our-story {
          min-height: 100vh;
          padding: clamp(96px, 14vw, 180px) var(--section-inline);
          display: grid;
          place-items: center;
          overflow: hidden;
          background: radial-gradient(circle at 50% 105%, rgba(22, 255, 59, 0.07), transparent 42%), var(--paper);
        }

        #how-it-works {
          border-bottom: 0;
        }

        #our-story > div {
          width: min(100%, 760px);
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        #our-story > div > * {
          margin-inline: auto;
        }

        #our-story h2 {
          max-width: 14ch;
          margin-top: 18px;
          margin-bottom: 36px;
          font-size: clamp(2.5rem, 5vw, 4.8rem);
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        #our-story p:not(:first-child) {
          max-width: 58ch;
          font-size: clamp(1rem, 1.3vw, 1.2rem);
          line-height: 1.68;
        }

        #our-story p + p {
          margin-top: 24px;
        }

        .legacy-story details {
          width: 100%;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid transparent;
        }

        .legacy-story-accordion {
          display: grid;
          width: 100%;
          gap: 0;
        }

        .legacy-story details:last-child {
          border-bottom-color: var(--line);
        }

        .legacy-story summary {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 18px 0;
          min-height: 56px;
          cursor: pointer;
          list-style: none;
          user-select: none;
          font-family: var(--mono);
          color: var(--ink);
          font-size: 0.66rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          line-height: 1;
        }

        .legacy-story summary::-webkit-details-marker {
          display: none;
        }

        .legacy-story summary::after {
          content: "";
          width: 14px;
          height: 14px;
          background:
            linear-gradient(var(--muted), var(--muted)) center / 100% 1px no-repeat,
            linear-gradient(var(--muted), var(--muted)) center / 1px 100% no-repeat;
        }

        .legacy-story details[open] summary::after {
          background: linear-gradient(var(--muted), var(--muted)) center / 100% 1px no-repeat;
        }

        .legacy-story summary .legacy-story-title {
          color: var(--ink);
          margin: 0;
          align-self: center;
          font-size: 0.66rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          line-height: 1.2;
          font-family: var(--mono);
        }

        .legacy-story .legacy-story-step {
          color: var(--muted);
          align-self: center;
          font-size: 0.9rem;
          margin-right: 8px;
          font-family: var(--mono);
        }

        .legacy-story summary::after {
          align-self: center;
        }

        .legacy-story-body {
          margin: 0;
          padding: 0 0 20px;
          display: grid;
          gap: 14px;
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.7;
          max-width: 58ch;
        }

        .legacy-footer {
          position: relative;
          overflow: hidden;
          border: 0;
          background: #050505;
          color: var(--ink);
        }

        .legacy-footer-frame {
          width: 100%;
          max-width: none;
          margin-inline: auto;
          border: 0;
        }

        .legacy-footer-prompt {
          position: relative;
          display: grid;
          place-items: center;
          min-height: clamp(270px, 28vw, 330px);
          padding: clamp(48px, 5vw, 64px) clamp(24px, 6vw, 88px);
          overflow: hidden;
          border-bottom: 1px solid var(--line);
          background: radial-gradient(ellipse at center, #131414 0%, #0d0e0e 58%, #080909 100%);
          isolation: isolate;
        }

        .legacy-footer-prompt::before {
          content: none;
          position: absolute;
          inset: 7% 8%;
          z-index: 0;
          border: 1px solid rgba(233, 229, 218, 0.1);
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.025), transparent 38%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 42px 110px rgba(0, 0, 0, 0.42);
        }

        .legacy-footer-prompt::after {
          content: none;
          position: absolute;
          top: 0;
          left: 50%;
          z-index: 0;
          width: min(28%, 320px);
          height: 64%;
          background:
            radial-gradient(ellipse at 51% 0%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.045) 18%, rgba(255, 255, 255, 0.012) 42%, transparent 68%),
            conic-gradient(from 164deg at 51% 0%, transparent 0 44%, rgba(255, 255, 255, 0.035) 48%, rgba(255, 255, 255, 0.01) 52%, transparent 57% 100%);
          filter: blur(54px);
          opacity: 0.38;
          transform: translateX(-50%) skewX(-2deg);
          transform-origin: 50% 0;
          mask-image: radial-gradient(ellipse at 50% 48%, #000 0 12%, rgba(0, 0, 0, 0.82) 22%, rgba(0, 0, 0, 0.24) 34%, transparent 48%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 48%, #000 0 12%, rgba(0, 0, 0, 0.82) 22%, rgba(0, 0, 0, 0.24) 34%, transparent 48%);
        }

        .legacy-footer-prompt::before {
          content: none;
          position: absolute;
          inset: 0 auto auto 0;
          z-index: 2;
          width: 100%;
          height: 1px;
          border: 0;
          background: rgba(233, 229, 218, 0.12);
          box-shadow: none;
          pointer-events: none;
        }

        .legacy-footer-prompt-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: min(100%, 760px);
          text-align: center;
        }

        .legacy-footer-prompt-content::before {
          content: none;
          position: absolute;
          top: 66%;
          left: 50%;
          z-index: -1;
          width: 62%;
          height: 76px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.018) 40%, transparent 70%);
          filter: blur(18px);
          transform: translate(-50%, -50%);
        }

        .legacy-footer-prompt h2 {
          max-width: none;
          margin: 0 auto;
          font-family: var(--sans);
          font-size: clamp(2rem, 4vw, 2.7rem);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.045em;
          white-space: nowrap;
          letter-spacing: -0.045em;
          line-height: 1;
          text-wrap: balance;
        }

        .legacy-footer-prompt-copy {
          max-width: none;
          white-space: nowrap;
          max-width: 36ch;
          margin: 18px auto 0;
          color: var(--muted);
          font-size: clamp(0.95rem, 1.25vw, 1.12rem);
          line-height: 1.55;
          text-wrap: balance;
        }

        .legacy-footer-prompt-form {
          display: flex;
          align-items: center;
          width: fit-content;
          max-width: 100%;
          min-height: 64px;
          margin: clamp(34px, 5vw, 48px) auto 0;
          padding: 0;
          border: 1px solid transparent;
          border-radius: 0;
          background:
            linear-gradient(rgba(16, 18, 17, 0.9), rgba(16, 18, 17, 0.9)) padding-box,
            linear-gradient(90deg, rgba(233, 229, 218, 0.22) 0%, rgba(233, 229, 218, 0.22) 18%, rgba(233, 229, 218, 0.48) 42%, rgba(255, 255, 255, 0.88) 50%, rgba(233, 229, 218, 0.48) 58%, rgba(233, 229, 218, 0.22) 82%, rgba(233, 229, 218, 0.22) 100%) border-box;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.72), 0 24px 70px rgba(0, 0, 0, 0.54), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.75);
          -webkit-backdrop-filter: blur(16px);
          backdrop-filter: blur(16px);
        }

        .legacy-footer-prompt-form:focus-within {
          border-color: transparent;
          box-shadow: 0 20px 72px rgba(0, 0, 0, 0.52), 0 0 36px rgba(255, 255, 255, 0.055);
        }

        .legacy-footer-prompt-form input {
          min-width: 0;
          flex: 0 1 auto;
          width: clamp(220px, 26vw, 300px);
          padding: 0 18px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--ink);
          font: 500 1rem/1.3 var(--sans);
        }

        .legacy-footer-source-picker {
          position: relative;
          flex: 0 0 auto;
        }

        .legacy-footer-source-picker summary {
          display: grid;
          width: 48px;
          height: 48px;
          place-items: center;
          border-radius: 0;
          color: var(--ink);
          cursor: pointer;
          font-family: var(--sans);
          font-size: 1.45rem;
          font-weight: 300;
          list-style: none;
          transition: background 180ms ease, transform 180ms ease;
        }

        .legacy-footer-source-picker summary::-webkit-details-marker {
          display: none;
        }

        .legacy-footer-source-picker summary:hover,
        .legacy-footer-source-picker summary:focus-visible,
        .legacy-footer-source-picker[open] summary {
          background: rgba(233, 229, 218, 0.08);
          outline: none;
        }

        .legacy-footer-source-picker[open] summary {
          transform: none;
        }

        .legacy-footer-source-picker summary span {
          display: inline-block;
          transition: transform 180ms ease;
        }

        .legacy-footer-source-picker[open] summary span {
          transform: rotate(45deg);
        }

        .legacy-footer-source-menu {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 0;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(3, minmax(120px, 1fr));
          width: calc(clamp(220px, 26vw, 300px) + 96px);
          max-width: calc(100vw - 48px);
          padding: 0;
          border-radius: 0;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, rgba(18, 19, 19, 0.98), rgba(7, 8, 8, 0.99));
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.035);
          -webkit-backdrop-filter: blur(20px);
          backdrop-filter: blur(20px);
          transform-origin: bottom left;
          animation: footer-source-reveal 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes footer-source-reveal {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .legacy-footer-source-option {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          padding: 11px 10px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          font: 500 0.72rem/1.2 var(--sans);
          text-align: left;
        }

        .legacy-footer-source-option:hover,
        .legacy-footer-source-option:focus-visible {
          background: rgba(233, 229, 218, 0.08);
          border-color: rgba(233, 229, 218, 0.1);
          outline: none;
        }

        .legacy-footer-source-option img {
          width: 19px;
          height: 19px;
          flex: 0 0 auto;
          object-fit: contain;
        }

        .legacy-footer-prompt-form input::placeholder {
          color: color-mix(in oklch, var(--ink) 42%, transparent);
        }

        .legacy-footer-prompt-form > button {
          display: grid;
          flex: 0 0 auto;
          width: 48px;
          height: 48px;
          place-items: center;
          border: 0;
          border-radius: 0;
          background: var(--ink);
          color: #080a09;
          font-size: 1.35rem;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.65);
          transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .legacy-footer-prompt-form > button:hover,
        .legacy-footer-prompt-form > button:focus-visible {
          background: #ffffff;
          outline: none;
          transform: translateY(-2px);
          box-shadow: 0 7px 20px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }


        .legacy-footer-main {
          display: grid;
          grid-template-columns: minmax(280px, 1.45fr) repeat(2, minmax(150px, 0.78fr));
          gap: clamp(42px, 6vw, 96px);
        min-height: 0;
        padding: clamp(24px, 2.6vw, 36px) clamp(28px, 4vw, 64px) 22px;
        }

        .legacy-footer-intro {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 390px;
        }

        .legacy-footer .legacy-brand {
          color: var(--ink);
        }

        .legacy-footer-tagline {
          max-width: 27ch;
          margin: 32px 0 0;
          color: color-mix(in oklch, var(--ink) 72%, transparent);
          font-size: clamp(1.25rem, 2vw, 1.75rem);
          line-height: 1.38;
          letter-spacing: -0.025em;
        }

        .legacy-footer-principle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        margin-top: clamp(20px, 2vw, 28px);
        padding-top: 0;
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .legacy-footer-principle::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #20ff4f;
          box-shadow: 0 0 14px rgba(32, 255, 79, 0.72);
        }

        .legacy-footer-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 18px;
        }

        .legacy-footer-column h2 {
          margin: 0 0 8px;
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.58rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .legacy-footer-column a,
        .legacy-footer-column button {
          padding: 0;
          border: 0;
          background: transparent;
          color: color-mix(in oklch, var(--ink) 78%, transparent);
          font: 500 clamp(0.92rem, 1.2vw, 1.06rem)/1.35 var(--sans);
          letter-spacing: -0.015em;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          transition: color 180ms ease, transform 180ms ease;
        }

        .legacy-footer-column a:hover,
        .legacy-footer-column a:focus-visible,
        .legacy-footer-column button:hover,
        .legacy-footer-column button:focus-visible {
          color: #20ff4f;
          outline: none;
          transform: translateX(4px);
        }

        .legacy-footer-rail {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-height: 76px;
          padding: 18px clamp(28px, 4vw, 64px);
          border-top: 1px solid var(--line);
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .legacy-footer-cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: var(--ink);
          text-decoration: none;
        }

        .legacy-footer-cta::after {
          content: "→";
          color: #20ff4f;
          font-size: 1rem;
          transition: transform 180ms ease;
        }

        .legacy-footer-cta:hover::after,
        .legacy-footer-cta:focus-visible::after {
          transform: translateX(5px);
        }

        .legacy-footer-legal {
          display: inline-flex;
          align-items: center;
          gap: clamp(18px, 2vw, 30px);
        }

        .legacy-footer-legal a {
          color: var(--ink);
          text-decoration: none;
        }

        .legacy-footer-legal a:hover,
        .legacy-footer-legal a:focus-visible {
          color: #20ff4f;
        }

        .legacy-footer-visual {
          position: relative;
        height: clamp(180px, 18vw, 240px);
          overflow: hidden;
          border-top: 1px solid var(--line);
          background: #020503;
        }

        .legacy-footer-visual video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 54%;
          filter: grayscale(1) sepia(1) saturate(6) hue-rotate(72deg) contrast(1.08) brightness(0.72);
          transform: scale(1.04);
        }

        .legacy-footer-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to bottom, #050505 0%, rgba(5, 5, 5, 0.94) 9%, rgba(5, 5, 5, 0.38) 34%, transparent 62%),
            linear-gradient(to right, rgba(5, 5, 5, 0.38), transparent 32%, transparent 72%, rgba(5, 5, 5, 0.28));
          pointer-events: none;
        }

        .legacy-footer-visual-copy {
          position: absolute;
          z-index: 1;
          top: clamp(52px, 7vw, 94px);
          left: clamp(28px, 4vw, 64px);
          max-width: 30ch;
          margin: 0;
          color: color-mix(in oklch, var(--ink) 74%, transparent);
          font-family: var(--mono);
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          line-height: 1.55;
          text-transform: uppercase;
        }

        @media (max-width: 900px) {
          .legacy-footer-main {
            grid-template-columns: minmax(0, 1.3fr) repeat(2, minmax(120px, 0.7fr));
          }
        }

        @media (max-width: 700px) {
          .legacy-footer-frame {
            width: 100%;
          }

          .legacy-footer-prompt {
            min-height: 280px;
            padding: 40px 18px;
            background-size: auto;
          }

          .legacy-footer-prompt::before {
            inset: 0 auto auto 0;
          }

          .legacy-footer-prompt h2 {
            margin-top: 0;
            font-size: clamp(2rem, 9vw, 2.7rem);
            white-space: normal;
          }

          .legacy-footer-prompt-copy {
            margin-top: 20px;
            font-size: 0.95rem;
            white-space: normal;
          }

          .legacy-footer-prompt-form {
            min-height: 0;
            height: auto;
            width: 100%;
          }

          .legacy-footer-prompt-form input {
            flex: 1;
            width: auto;
            padding: 0 12px;
            font-size: 16px;
          }

          .legacy-marquee-label {
            min-width: 88px;
          }

          .legacy-marquee .legacy-track {
            width: calc(100% - 88px);
            margin-left: 88px;
          }

          .legacy-marquee .legacy-chip-label {
            font-size: 0.46rem;
            letter-spacing: 0.025em;
          }

          .legacy-footer-source-picker summary {
            width: 44px;
            height: 44px;
          }

          .legacy-footer-source-menu {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: calc(100vw - 36px);
            max-width: calc(100vw - 36px);
          }

          .legacy-page {
            overflow-x: clip;
          }

          .legacy-mobile-nav-links:not(.is-open) {
            visibility: hidden;
            pointer-events: none;
          }

          .legacy-footer-prompt-form > button {
            width: 44px;
            height: 44px;
          }


          .legacy-footer-main {
            grid-template-columns: 1fr 1fr;
          gap: 40px 28px;
            min-height: 0;
          padding: 24px 18px 20px;
          }

          .legacy-footer-intro {
            grid-column: 1 / -1;
            max-width: none;
          }

          .legacy-footer-tagline {
            max-width: 24ch;
            font-size: 1.35rem;
          }

          .legacy-footer-principle {
            margin-top: 26px;
            padding-top: 0;
          }


          .legacy-footer-rail {
            align-items: flex-start;
            flex-direction: column-reverse;
            padding: 22px 18px;
          }

          .legacy-footer-visual {
          height: 180px;
          }

          .legacy-footer-visual-copy {
            left: 18px;
            max-width: 24ch;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          #our-story > div {
            transform: none !important;
            opacity: 1 !important;
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
        <button
          ref={mobileMenuButtonRef}
          type="button"
          className={`legacy-hamburger ${openMobileMenu ? "is-open" : ""}`}
          aria-label={openMobileMenu ? "Close menu" : "Open menu"}
          aria-expanded={openMobileMenu}
          aria-controls="mobile-nav-links"
          onClick={() => setOpenMobileMenu((current) => !current)}
        >
          <span />
          <span />
        </button>
        <div className="legacy-nav-links">
          <a className="legacy-navlink" href="#work" data-panel="provenance" onClick={(event) => openPanelFromClick(event, "trust")}>
            Trust
          </a>
          <a className="legacy-navlink" href="#our-story" data-panel="origin" onClick={scrollToStory}>
            Our Story
          </a>
          <a className="legacy-navlink" href="#how-it-works" data-panel="how-it-works" onClick={scrollToHowItWorks}>
            How it works
          </a>
          <a className="legacy-navlink legacy-signin" href="#" data-panel="auth" onClick={(event) => openPanelFromClick(event, "auth")}>
            Sign in
          </a>
        </div>
      </nav>
      <div
        ref={mobileMenuRef}
        id="mobile-nav-links"
        className={`legacy-mobile-nav-links ${openMobileMenu ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!openMobileMenu}
        inert={!openMobileMenu}
      >
        <div className="legacy-mobile-menu-header">
          <a className="legacy-brand" href="#top" aria-label="Pitar home" onClick={closeMobileMenu}>
            <span className="legacy-brand-lockup">
              <span className="legacy-brand-mark" aria-hidden="true">
                <img src={`${import.meta.env.BASE_URL}logos/pitar-mark.svg`} alt="" />
              </span>
              <span className="legacy-brand-stack"><b>itar</b></span>
            </span>
          </a>
          <button type="button" className="legacy-mobile-menu-close" aria-label="Close menu" onClick={closeMobileMenu}>×</button>
        </div>
        <div className="legacy-mobile-menu-links">
          <a className="legacy-navlink" href="#work" data-panel="provenance" onClick={(event) => openPanelFromClick(event, "trust")}>Trust</a>
          <a className="legacy-navlink" href="#our-story" data-panel="origin" onClick={scrollToStory}>Our Story</a>
          <a className="legacy-navlink" href="#how-it-works" data-panel="how-it-works" onClick={scrollToHowItWorks}>How it works</a>
          <a className="legacy-navlink legacy-signin" href="#" data-panel="auth" onClick={(event) => openPanelFromClick(event, "auth")}>Sign in</a>
        </div>
      </div>
      <button
        type="button"
        className={`legacy-mobile-nav-backdrop ${openMobileMenu ? "visible" : ""}`}
        aria-hidden={!openMobileMenu}
        onClick={() => setOpenMobileMenu(false)}
      />

      <button ref={panelBackdropRef} type="button" className={`legacy-panel-backdrop ${openPanel ? "visible" : ""}`} aria-hidden={!openPanel} onClick={closePanel} />

      <aside ref={panelRef} className={`legacy-panel ${openPanel ? "visible" : ""}`} aria-hidden={!openPanel} role="dialog" aria-modal="true" aria-label={openPanel ? panelTitle[openPanel] ?? "Panel" : "Panel"}>
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
            <button className="legacy-marquee-label" type="button" onClick={() => setOpenPanel("connections")}>Sources</button>
            <div className="legacy-track">
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
          <p>How it works</p>
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

      <section className="legacy-story" id="how-it-works" aria-label="How Pitar works">
        <div>
          <div className="legacy-how-copy">
            <p>How it works</p>
            <h2>Everything you keep. Any question you have.</h2>
            <p>Answers come with source evidence. No answer without trace.</p>
          </div>
          <div className="legacy-story-accordion">
            {howItWorksSteps.map(({ step, title, copy }, index) => (
              <details className="legacy-story-details" key={step} open={index === 0}>
                <summary className="legacy-story-summary">
                  <span className="legacy-story-step">{step}</span>
                  <h3 className="legacy-story-title">{title}</h3>
                </summary>
                <p className="legacy-story-body">{copy}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="legacy-footer" id="footer" aria-label="Pitar footer">
        <div className="legacy-footer-frame">
          <section className="legacy-footer-prompt" aria-labelledby="footer-prompt-title">
            <div className="legacy-footer-prompt-content">
              <h2 id="footer-prompt-title">Ask what your records know.</h2>
              <p className="legacy-footer-prompt-copy">One question in. One clear answer out, with the exact page that proves it.</p>
              <form
                className="legacy-footer-prompt-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
              >
                <details className="legacy-footer-source-picker">
                  <summary aria-label="Choose a source" title="Choose a source"><span aria-hidden="true">+</span></summary>
                  <div className="legacy-footer-source-menu" role="menu" aria-label="Available sources">
                    {connectors.map(({ label, icon }) => (
                      <button className="legacy-footer-source-option" type="button" role="menuitem" key={label}>
                        <img src={icon} alt="" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </details>
                <input type="text" aria-label="Ask Pitar a question" placeholder="Ask a question about your records..." />
                <button type="submit" aria-label="Send question">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </div>
          </section>
          <div className="legacy-footer-main">
            <div className="legacy-footer-intro">
              <a className="legacy-brand" href="#top" aria-label="Pitar home">
                <span className="legacy-brand-lockup">
                  <span className="legacy-brand-mark" aria-hidden="true">
                    <img src={`${import.meta.env.BASE_URL}logos/pitar-mark.svg`} alt="" />
                  </span>
                  <span className="legacy-brand-stack"><b>itar</b></span>
                </span>
              </a>
              <p className="legacy-footer-tagline">Ask your records anything. Get one clear answer, with the page that proves it.</p>
              <span className="legacy-footer-principle">Source-backed by design</span>
            </div>

            <nav className="legacy-footer-column" aria-label="Product">
              <h2>Product</h2>
              <a href="#how-it-works">How it works</a>
              <button type="button" onClick={() => setOpenPanel("connections")}>Sources</button>
              <button type="button" onClick={() => setOpenPanel("trust")}>Trust</button>
            </nav>

            <nav className="legacy-footer-column" aria-label="Company">
              <h2>Company</h2>
              <a href="#our-story">Our story</a>
              <a href="#top">Why Pitar</a>
              <button type="button" onClick={() => setOpenPanel("auth")}>Sign in</button>
            </nav>

          </div>

          <div className="legacy-footer-rail">
            <span>© 2026 Pitar</span>
            <nav className="legacy-footer-legal" aria-label="Legal">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms &amp; Conditions</a>
            </nav>
          </div>

          <div className="legacy-footer-visual" aria-hidden="true">
            <video src={`${import.meta.env.BASE_URL}videos/hero.mp4`} autoPlay loop muted playsInline />
            <p className="legacy-footer-visual-copy">Your knowledge, still moving. Every answer returns to the record.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

export default App
