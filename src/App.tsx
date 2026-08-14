import { type CSSProperties, type MouseEvent, type PointerEvent, useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { useGSAP } from "@gsap/react"
import { HeroAskFlow, heroAskBeats, heroAskDuration } from "@/components/hero-ask-flow"
import { HowReviewFlow } from "@/components/how-review-flow"
import OrbitingCirclesGlobe from "@/components/ui/orbiting-circles-02"

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP)

function splitWords(el: HTMLElement) {
  if (el.dataset.words === "1") {
    return Array.from(el.querySelectorAll<HTMLElement>("[data-word]"))
  }
  const raw = el.textContent ?? ""
  el.textContent = ""
  el.dataset.words = "1"
  return raw.trim().split(/\s+/).map((word, index, words) => {
    const span = document.createElement("span")
    span.dataset.word = ""
    span.style.display = "inline-block"
    span.textContent = word
    el.append(span)
    if (index < words.length - 1) el.append(document.createTextNode(" "))
    return span
  })
}

function scrollToId(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  gsap.to(window, {
    duration: 1.05,
    ease: "power2.inOut",
    scrollTo: { y: target, autoKill: true },
    overwrite: "auto",
  })
}

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

const CARE_MAIL = "mailto:care@pitar.ai?subject=Pitar%20plans"

const pitarPlans = [
  {
    id: "personal",
    kicker: "For a family archive",
    name: "Personal",
    price: "Join the list",
    blurb: "A private place for letters, records, and the stories they hold.",
    points: [
      "Organize a personal or family archive",
      "Ask questions across processed documents",
      "Return to the exact source page",
    ],
    cta: "Create a personal account",
    action: "signup" as const,
  },
  {
    id: "professional",
    kicker: "For practitioners",
    name: "Professional",
    price: "Talk to care",
    blurb: "Evidence-grounded research for legal and investigative work.",
    points: [
      "Trace answers across case materials",
      "Keep source context in view",
      "Work from a connected evidence graph",
    ],
    cta: "Create a professional account",
    action: "signup" as const,
  },
  {
    id: "enterprise",
    kicker: "For organizations",
    name: "Enterprise",
    price: "Custom",
    blurb: "Institutional knowledge that remains connected to its evidence.",
    points: [
      "Make internal documents searchable",
      "Preserve authoritative source context",
      "Prepare for team-scale knowledge work",
    ],
    cta: "Ask care about Enterprise",
    action: "care" as const,
  },
]

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

const HOW_ORBIT_STEPS = howItWorksSteps.length
const HOW_ORBIT_GAP = 40
const HOW_ORBIT_TRAVEL = HOW_ORBIT_GAP * (HOW_ORBIT_STEPS - 1)

const SOURCE_SLOT_COUNT = 6
const SOURCE_SWAP_MS = 2400
const SOURCE_ANIM_MS = 520

type SourceSlot = {
  current: Connector
  incoming: Connector | null
  exiting: boolean
}

export function App() {
  const [sourceSlots, setSourceSlots] = useState<SourceSlot[]>(() =>
    connectors.slice(0, SOURCE_SLOT_COUNT).map((current) => ({
      current,
      incoming: null,
      exiting: false,
    })),
  )
  const sourceQueueRef = useRef(connectors.slice(SOURCE_SLOT_COUNT))
  const nextSourceSlotRef = useRef(0)
  const sourceSwapTimerRef = useRef<number | null>(null)
  const pausedRef = useRef(false)
  const storySectionRef = useRef<HTMLElement | null>(null)
  const storyContentRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const panelBackdropRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup")
  const [openMobileMenu, setOpenMobileMenu] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [heroScreen, setHeroScreen] = useState<1 | 2>(1)
  const [heroBeat, setHeroBeat] = useState(0)
  const [heroElapsed, setHeroElapsed] = useState(0)
  const [heroHoverPaused, setHeroHoverPaused] = useState(false)
  const [activeHowStep, setActiveHowStep] = useState(0)
  const [isDesktopHow, setIsDesktopHow] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 901px)").matches,
  )
  const [howBeat, setHowBeat] = useState(0)
  const [howElapsed, setHowElapsed] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  const heroElapsedRef = useRef(0)
  const heroPausedRef = useRef(false)
  const heroScrubbingRef = useRef(false)
  const heroScreenRef = useRef<1 | 2>(1)
  const heroBeatRef = useRef(0)
  const howElapsedRef = useRef(0)
  const howBeatRef = useRef(0)
  const activeHowStepRef = useRef(0)
  const howWrapRef = useRef<HTMLDivElement>(null)
  const howRingFillRef = useRef<SVGCircleElement>(null)
  const howOrbitRef = useRef<HTMLDivElement>(null)
  const howPanelsRef = useRef<HTMLDivElement>(null)
  const howScrollTriggerRef = useRef<ScrollTrigger | null>(null)
  const screenOneMs = 5200

  const panelTitle: Record<string, string> = {
    connections: "Connections",
    auth: "Account",
    trust: "Why trust us",
    story: "Our Story",
  }

  const panelCopy: Record<string, string[]> = {
    connections: [
      "Connect your records from supported sources.",
      "Start with a mail account, cloud drive, or folder upload.",
      "All answers surface the original source page for easy verification.",
    ],
    auth: [
      "Sign in to your account.",
      "Create an account to connect a source and ask your records.",
    ],
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
    scrollToId("our-story")
  }

  const scrollToHowItWorks = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setOpenPanel(null)
    closeMobileMenu()
    scrollToId("how-it-works")
  }

  const scrollToPlans = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    setOpenPanel(null)
    closeMobileMenu()
    scrollToId("plans")
  }

  const requireAccount = (mode: "signin" | "signup" = "signup") => {
    setAuthMode(mode)
    setOpenPanel("auth")
  }

  const openPanelFromClick = (event: MouseEvent<HTMLAnchorElement>, panel: string) => {
    event.preventDefault()
    if (panel === "auth") setAuthMode("signin")
    setOpenPanel(panel)
    closeMobileMenu()
  }

  const closePanel = () => {
    setOpenPanel(null)
  }

  useEffect(() => {
    if (!openPanel) return
    const y = window.scrollY
    const html = document.documentElement
    const body = document.body
    const page = document.querySelector<HTMLElement>(".legacy-page")
    ScrollTrigger.normalizeScroll(false)
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top = `-${y}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    if (page) page.style.overflow = "hidden"

    const stopPageScroll = (event: WheelEvent | TouchEvent) => {
      const panel = panelRef.current
      if (panel && event.target instanceof Node && panel.contains(event.target)) return
      event.preventDefault()
    }

    window.addEventListener("wheel", stopPageScroll, { capture: true, passive: false })
    window.addEventListener("touchmove", stopPageScroll, { capture: true, passive: false })

    return () => {
      html.style.overflow = ""
      body.style.overflow = ""
      body.style.position = ""
      body.style.top = ""
      body.style.left = ""
      body.style.right = ""
      body.style.width = ""
      if (page) page.style.overflow = ""
      window.scrollTo(0, y)
      window.removeEventListener("wheel", stopPageScroll, { capture: true })
      window.removeEventListener("touchmove", stopPageScroll, { capture: true })
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        ScrollTrigger.normalizeScroll(true)
      }
    }
  }, [openPanel])

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
    if (panel) gsap.set(panel, { clearProps: "transform,visibility,x,xPercent" })
    if (backdrop) gsap.set(backdrop, { clearProps: "opacity,visibility,autoAlpha" })
    if (!panel) return
    if (openPanel) panel.removeAttribute("inert")
    else panel.setAttribute("inert", "")
  }, [openPanel])

  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".legacy-primary")
    const handleClick = () => {
      document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    buttons.forEach((button) => button.addEventListener("click", handleClick))
    return () => buttons.forEach((button) => button.removeEventListener("click", handleClick))
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 24)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)")
    const handleChange = () => setIsDesktopHow(media.matches)

    handleChange()
    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handleChange = () => setReducedMotion(motion.matches)

    handleChange()
    motion.addEventListener("change", handleChange)
    return () => motion.removeEventListener("change", handleChange)
  }, [])

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".legacy-how-step"))
    if (!items.length) return

    const selectClosestStep = () => {
      const viewportCenter = window.innerHeight / 2
      const closest = items.reduce((best, item, index) => {
        const rect = item.getBoundingClientRect()
        const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter)
        return distance < best.distance ? { index, distance } : best
      }, { index: 0, distance: Number.POSITIVE_INFINITY })

      setActiveHowStep(closest.index)
    }

    const observer = new IntersectionObserver(selectClosestStep, {
      rootMargin: "-30% 0px -30% 0px",
      threshold: [0, 0.25, 0.5, 0.75],
    })

    items.forEach((item) => observer.observe(item))
    selectClosestStep()
    return () => observer.disconnect()
  }, [isDesktopHow])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const measure = () => {
      if (window.matchMedia("(max-width: 900px)").matches) return

      const brand = nav.querySelector<HTMLElement>(".legacy-brand")
      const links = nav.querySelector<HTMLElement>(".legacy-nav-links")
      const gap = parseFloat(getComputedStyle(nav).gap) || 0
      const compactPaddingX = 14 * 2
      const natural = (brand?.offsetWidth ?? 0) + gap + (links?.offsetWidth ?? 0) + compactPaddingX
      nav.style.setProperty("--nav-compact-width", `${Math.ceil(natural)}px`)
    }

    measure()
    window.addEventListener("resize", measure)
    const frame = requestAnimationFrame(measure)
    return () => {
      window.removeEventListener("resize", measure)
      cancelAnimationFrame(frame)
    }
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

    const heading = content.querySelector<HTMLElement>("h2")
    if (heading && !reducedMotion) {
      const words = splitWords(heading)
      gsap.from(words, {
        y: 16,
        autoAlpha: 0,
        filter: "blur(8px)",
        duration: 0.7,
        stagger: 0.06,
        ease: "power2.out",
        scrollTrigger: { trigger: heading, start: "top 84%" },
      })
    }

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

  useGSAP(() => {
    if (!isDesktopHow || reducedMotion) return
    const wrapper = howWrapRef.current
    const fill = howRingFillRef.current
    const orbit = howOrbitRef.current
    if (!wrapper || !fill || !orbit) return

    const markers = Array.from(orbit.querySelectorAll<HTMLElement>(".legacy-how-marker"))
    const circ = 2 * Math.PI * 50
    const lastIndex = HOW_ORBIT_STEPS - 1

    const travelForProgress = (progress: number) =>
      Math.min(1, Math.max(0, progress)) * HOW_ORBIT_TRAVEL

    const stepForProgress = (progress: number) =>
      Math.min(lastIndex, Math.max(0, Math.floor(Math.min(0.999, progress) * HOW_ORBIT_STEPS)))

    const placeOrbit = (progress: number) => {
      const travel = travelForProgress(progress)
      const active = stepForProgress(progress)
      markers.forEach((marker, index) => {
        const theta = -index * HOW_ORBIT_GAP + travel
        const rad = (theta * Math.PI) / 180
        const scale = index === active
          ? 1.12
          : 0.42 + 0.58 * Math.max(0, Math.cos((Math.abs(theta) * Math.PI) / 180))
        gsap.set(marker, {
          left: `${50 + 50 * Math.cos(rad)}%`,
          top: `${50 + 50 * Math.sin(rad)}%`,
          xPercent: -50,
          yPercent: -50,
          rotation: index === active ? 0 : theta,
          scale,
          autoAlpha: 1,
        })
      })
      fill.setAttribute("stroke-dasharray", `${(travel / 360) * circ} ${circ}`)
    }

    const buildTimeline = () => {
      placeOrbit(0)

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: "+=270vh",
          scrub: 1.2,
          invalidateOnRefresh: true,
          toggleActions: "play none none none",
          onUpdate: (self) => {
            placeOrbit(self.progress)
            const step = stepForProgress(self.progress)
            if (step !== activeHowStepRef.current) {
              activeHowStepRef.current = step
              setActiveHowStep(step)
            }
          },
        },
      })

      howScrollTriggerRef.current = timeline.scrollTrigger as ScrollTrigger | null
      return timeline
    }

    ;(window as unknown as Record<string, unknown>).__dbg = { gsap, ScrollTrigger }

    const timeline = buildTimeline()
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(true), 80)

    return () => {
      window.clearTimeout(refresh)
      howScrollTriggerRef.current = null
      timeline?.kill()
    }
  }, { scope: howWrapRef, dependencies: [isDesktopHow, reducedMotion] })

  useGSAP(() => {
    if (reducedMotion) return
    ScrollTrigger.normalizeScroll(true)

    const blocks = document.querySelectorAll<HTMLElement>(
      "#how-it-works .legacy-how-copy, #plans .legacy-plans-copy, #plans .legacy-plan",
    )
    blocks.forEach((block) => {
      gsap.fromTo(
        block,
        { autoAlpha: 0, y: 28, filter: "blur(10px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: { trigger: block, start: "top 86%", once: true },
        },
      )
      const heading = block.querySelector<HTMLElement>("h2, h3")
      if (!heading) return
      const words = splitWords(heading)
      gsap.from(words, {
        y: 14,
        autoAlpha: 0,
        filter: "blur(7px)",
        duration: 0.65,
        stagger: 0.055,
        ease: "power2.out",
        scrollTrigger: { trigger: heading, start: "top 88%", once: true },
      })
    })
  }, { dependencies: [reducedMotion] })

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const marquee = document.querySelector(".legacy-marquee")
    let commitTimer = 0

    const swapNextSlot = () => {
      if (pausedRef.current) return
      const incoming = sourceQueueRef.current[0]
      if (!incoming) return

      const slotIndex = nextSourceSlotRef.current % SOURCE_SLOT_COUNT
      let outgoing: Connector | null = null

      setSourceSlots((slots) => {
        outgoing = slots[slotIndex]?.current ?? null
        if (!outgoing || outgoing.label === incoming.label) return slots

        return slots.map((slot, index) =>
          index === slotIndex
            ? {
                current: outgoing!,
                incoming,
                exiting: !prefersReducedMotion,
              }
            : slot,
        )
      })

      if (!outgoing) return
      const outgoingConnector = outgoing as Connector
      if (outgoingConnector.label === incoming.label) return
      sourceQueueRef.current = [...sourceQueueRef.current.slice(1), outgoingConnector]
      nextSourceSlotRef.current = slotIndex + 1

      commitTimer = window.setTimeout(() => {
        setSourceSlots((slots) =>
          slots.map((slot, index) => {
            if (index !== slotIndex || !slot.incoming) return slot
            return { current: slot.incoming, incoming: null, exiting: false }
          }),
        )
      }, prefersReducedMotion ? 0 : SOURCE_ANIM_MS)
    }

    const pause = () => {
      pausedRef.current = true
    }
    const play = () => {
      pausedRef.current = false
    }

    marquee?.addEventListener("mouseenter", pause)
    marquee?.addEventListener("mouseleave", play)
    marquee?.addEventListener("focusin", pause)
    marquee?.addEventListener("focusout", play)

    sourceSwapTimerRef.current = window.setInterval(swapNextSlot, SOURCE_SWAP_MS)

    return () => {
      if (sourceSwapTimerRef.current) window.clearInterval(sourceSwapTimerRef.current)
      window.clearTimeout(commitTimer)
      marquee?.removeEventListener("mouseenter", pause)
      marquee?.removeEventListener("mouseleave", play)
      marquee?.removeEventListener("focusin", pause)
      marquee?.removeEventListener("focusout", play)
    }
  }, [])

  heroPausedRef.current = heroHoverPaused
  heroScreenRef.current = heroScreen
  heroBeatRef.current = heroBeat

  useEffect(() => {
    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      const screen = heroScreenRef.current
      const duration = screen === 1 ? screenOneMs : heroAskDuration(heroBeatRef.current)

      if (!heroPausedRef.current && !heroScrubbingRef.current) {
        let next = heroElapsedRef.current + delta
        if (next >= duration) {
          if (screen === 1) {
            heroScreenRef.current = 2
            setHeroScreen(2)
          } else {
            heroBeatRef.current = (heroBeatRef.current + 1) % heroAskBeats.length
            heroScreenRef.current = 1
            setHeroBeat(heroBeatRef.current)
            setHeroScreen(1)
          }
          next = 0
        }
        heroElapsedRef.current = next
        setHeroElapsed(next)
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [screenOneMs])

  howBeatRef.current = howBeat

  useEffect(() => {
    if (activeHowStep !== 1) return
    howElapsedRef.current = 0
    howBeatRef.current = 0
    setHowElapsed(0)
    setHowBeat(0)

    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      let next = howElapsedRef.current + delta
      const duration = heroAskDuration(howBeatRef.current)
      if (next >= duration) {
        howBeatRef.current = (howBeatRef.current + 1) % heroAskBeats.length
        setHowBeat(howBeatRef.current)
        next = 0
      }
      howElapsedRef.current = next
      setHowElapsed(next)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [activeHowStep])

  const seekHeroProgress = (clientX: number, target: HTMLElement) => {
    const box = target.getBoundingClientRect()
    const ratio = box.width <= 0 ? 0 : Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    const duration = heroScreenRef.current === 1 ? screenOneMs : heroAskDuration(heroBeatRef.current)
    heroElapsedRef.current = ratio * duration
    setHeroElapsed(heroElapsedRef.current)
  }

  const onHeroProgressPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    heroScrubbingRef.current = true
    const bar = event.currentTarget
    bar.setPointerCapture(event.pointerId)
    seekHeroProgress(event.clientX, bar)
  }

  const onHeroProgressPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!heroScrubbingRef.current) return
    seekHeroProgress(event.clientX, event.currentTarget)
  }

  const endHeroScrub = () => {
    heroScrubbingRef.current = false
  }

  const scrollToHowStep = (index: number) => {
    setActiveHowStep(index)
    if (!isDesktopHow) {
      document.querySelectorAll<HTMLElement>(".legacy-how-step")[index]?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      })
      return
    }
    const st = howScrollTriggerRef.current
    if (!st) return
    const progress = (index + 0.5) / howItWorksSteps.length
    const target = st.start + progress * (st.end - st.start)
    window.scrollTo({ top: target, behavior: reducedMotion ? "auto" : "smooth" })
  }

  const renderHowVisual = (index: number) => {
    if (index === 0) {
      return (
        <div className="legacy-how-media-stage" key="connect">
          <div className="legacy-visual-beams" aria-hidden="true"><i /><i /><i /></div>
          <div className="legacy-orbit-slot dark"><OrbitingCirclesGlobe paused={false} dimRings={false} /></div>
        </div>
      )
    }

    if (index === 1) {
      return (
        <div className="legacy-how-media-stage" key="ask">
          <HeroAskFlow beatIndex={howBeat} elapsedMs={howElapsed} />
        </div>
      )
    }

    return (
      <div className="legacy-how-media-stage" key="review">
        <HowReviewFlow />
      </div>
    )
  }

  return (
    <main className="legacy-page" aria-labelledby="hero-title">
      <style>{`
        .legacy-visual-timeline {
          display: none !important;
        }

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
          overflow: clip;
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
          padding: 100px var(--section-inline) 0;
          gap: clamp(48px, 7vh, 84px);
        }

        .legacy-hero-main {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          gap: 80px;
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
          flex: 0 1 auto;
          align-items: center;
          gap: clamp(8px, 1.4vw, 22px);
          margin-left: auto;
          min-width: 0;
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

        .legacy-nav .legacy-navlink:not(.legacy-signin)::after {
          content: "";
          position: absolute;
          bottom: 2px;
          left: 50%;
          width: 0;
          height: 1px;
          background: currentColor;
          opacity: 0.82;
          transform: translateX(-50%);
          transition: width 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease;
        }

        .legacy-nav .legacy-navlink:not(.legacy-signin):hover,
        .legacy-nav .legacy-navlink:not(.legacy-signin):focus-visible {
          background: transparent;
          color: #ffffff;
          text-shadow: 0 0 16px rgba(255, 255, 255, 0.18);
        }

        .legacy-nav .legacy-navlink:not(.legacy-signin):hover::after,
        .legacy-nav .legacy-navlink:not(.legacy-signin):focus-visible::after {
          width: 50%;
          opacity: 1;
        }

        .legacy-nav .legacy-navlink:not(.legacy-signin):active {
          background: transparent;
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
          top: 0;
          left: 50%;
          z-index: 20;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          padding: 10px var(--section-inline) 10px;
          background: transparent;
          border: 0;
          border-bottom: 1px solid var(--line);
          border-radius: 0;
          box-shadow: none;
          justify-content: flex-start;
          transform: translateX(-50%);
          transition:
            width 320ms cubic-bezier(0.22, 1, 0.36, 1),
            padding 320ms cubic-bezier(0.22, 1, 0.36, 1),
            background 320ms ease,
            border-color 320ms ease,
            border-width 320ms ease,
            box-shadow 320ms ease;
        }

        @media (min-width: 901px) {
          .legacy-nav--fixed.is-scrolled {
            width: max-content;
            max-width: calc(100vw - 32px);
            padding: 10px 14px;
            background: color-mix(in oklch, var(--paper) 74%, transparent);
            border: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            backdrop-filter: blur(18px) saturate(1.25);
            -webkit-backdrop-filter: blur(18px) saturate(1.25);
            box-shadow: 0 12px 34px rgba(0, 0, 0, 0.25);
            justify-content: flex-start;
            gap: 20px;
          }

          .legacy-nav--fixed.is-scrolled .legacy-nav-links {
            margin-left: 0;
            flex: 0 0 auto;
          }
        }

        .legacy-mobile-nav .legacy-brand-divider {
          display: none;
        }

        .legacy-panel-backdrop {
          position: fixed;
          inset: 0;
          z-index: 55;
          background: rgba(4, 4, 4, 0.58);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 220ms ease, visibility 0s 220ms;
        }

        .legacy-panel-backdrop.visible {
          opacity: 1;
          pointer-events: auto;
          visibility: visible;
        }

        .legacy-panel {
          position: fixed;
          top: 16px;
          right: 16px;
          bottom: 16px;
          z-index: 60;
          width: min(420px, calc(100vw - 32px));
          background: #0c0c0c;
          border: 1px solid var(--line);
          box-shadow: 0 24px 120px rgba(0, 0, 0, 0.48);
          transform: translateX(110%);
          visibility: hidden;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          backdrop-filter: blur(16px);
          transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s 340ms;
        }

        .legacy-panel.visible {
          transform: none;
          visibility: visible;
          transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s;
        }

        .legacy-panel-header {
          min-height: 58px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--line);
        }

        .legacy-panel:has(.legacy-auth) .legacy-panel-header {
          border-bottom: 0;
        }

        .legacy-panel-header {
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
          flex: 1;
          min-height: 0;
          padding: 18px;
          display: grid;
          gap: 10px;
          overflow-y: auto;
          overscroll-behavior: contain;
          font-size: 13px;
          color: var(--muted);
          font-family: var(--sans);
        }

        .legacy-panel-content:has(.legacy-auth) {
          display: flex;
          flex-direction: column;
        }

        .legacy-panel-content p {
          margin: 0;
          line-height: 1.6;
        }

        .legacy-auth {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 12px;
          min-height: 100%;
        }

        .legacy-auth-tabs {
          display: flex;
          gap: 0;
          margin: -18px -18px 0;
          border-bottom: 1px solid var(--line);
        }

        .legacy-auth-tabs button {
          flex: 1;
          padding: 18px 8px;
          border: 0;
          border-bottom: 1px solid transparent;
          margin-bottom: -1px;
          background: transparent;
          color: var(--muted);
          font: 500 0.62rem/1 var(--mono);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .legacy-auth-tabs button.is-on {
          color: var(--ink);
          border-bottom-color: var(--acid);
        }

        .legacy-auth h3 {
          margin: 8px 0 0;
          color: var(--ink);
          font: 500 1.35rem/1.15 var(--sans);
          letter-spacing: -0.03em;
        }

        .legacy-auth-form {
          display: grid;
          gap: 12px;
          margin-top: 6px;
        }

        .legacy-auth-form label {
          display: grid;
          gap: 6px;
        }

        .legacy-auth-form label:first-of-type {
          margin-bottom: 8px;
        }

        .legacy-auth-form span {
          color: var(--muted);
          font: 500 0.56rem/1 var(--mono);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .legacy-auth-form input {
          width: 100%;
          min-height: 42px;
          padding: 0 12px;
          border: 1px solid var(--line);
          background: rgba(12, 18, 14, 0.4);
          color: var(--ink);
          font: 400 0.92rem/1.3 var(--sans);
        }

        .legacy-auth-submit {
          min-height: 44px;
          border: 0;
          background: var(--ink);
          color: var(--paper);
          font: 500 0.78rem/1 var(--sans);
          cursor: pointer;
        }

        .legacy-auth-foot {
          margin-top: auto;
          display: grid;
          gap: 10px;
          padding-top: 24px;
        }

        .legacy-auth-forgot {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .legacy-auth-note {
          margin: 0;
          color: var(--muted);
          font-size: 0.78rem;
          line-height: 1.5;
        }

        .legacy-trust {
          display: grid;
          gap: 20px;
        }

        .legacy-trust h3 {
          margin: 0;
          color: var(--ink);
          font: 500 1.45rem/1.12 var(--sans);
          letter-spacing: -0.03em;
        }

        .legacy-trust-lead {
          margin: 0;
          max-width: 36ch;
          color: var(--muted);
          font: 400 0.92rem/1.55 var(--sans);
        }

        .legacy-trust-buys {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 14px;
          list-style: none;
        }

        .legacy-trust-buys li {
          display: grid;
          gap: 4px;
          padding-top: 14px;
          border-top: 1px solid rgba(242, 242, 242, 0.08);
        }

        .legacy-trust-buys strong {
          color: var(--ink);
          font: 500 0.92rem/1.3 var(--sans);
        }

        .legacy-trust-buys span {
          color: var(--muted);
          font: 400 0.84rem/1.45 var(--sans);
        }

        .legacy-trust-example {
          display: grid;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid rgba(242, 242, 242, 0.08);
        }

        .legacy-trust-example-kicker {
          margin: 0;
          color: var(--acid);
          font: 500 0.56rem/1 var(--mono);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .legacy-trust-example-body {
          margin: 0;
          color: var(--ink);
          font: 400 0.92rem/1.5 var(--sans);
        }

        .legacy-trust-example ol {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 12px;
          list-style: none;
          counter-reset: cite;
        }

        .legacy-trust-example li {
          display: grid;
          gap: 4px;
          padding-left: 12px;
          border-left: 1px solid var(--line);
          counter-increment: cite;
        }

        .legacy-trust-example li p {
          margin: 0;
          color: var(--muted);
          font: 400 0.82rem/1.45 var(--sans);
        }

        .legacy-trust-example li p::before {
          content: counter(cite) ". ";
          color: var(--acid);
          font-family: var(--mono);
          font-size: 0.72em;
        }

        .legacy-trust-example small {
          display: block;
          color: var(--muted);
          font: 400 0.68rem/1.4 var(--mono);
          letter-spacing: 0.03em;
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
          gap: clamp(48px, 9vw, 160px);
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
          flex: 0 0 auto;
          gap: 0;
          width: 100vw;
          max-width: none;
          min-height: 0;
          margin-top: auto;
          margin-left: calc(50% - 50vw);
          box-sizing: border-box;
          border: 0;
          outline: 0;
          box-shadow: none;
          overflow: hidden;
        }

        .legacy-visual {
          position: relative;
          display: grid;
          place-items: center;
          width: 100%;
          max-width: none;
          flex: 0 0 auto;
          aspect-ratio: auto;
          height: clamp(460px, 58vh, 600px);
          max-height: 600px;
          overflow: hidden;
          border: 0;
          outline: 0;
          box-shadow: none;
          border-radius: 0;
          background: #090909;
        }

        .legacy-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          background: radial-gradient(ellipse 82% 78% at 50% 44%, transparent 58%, #090909 96%);
        }

        .legacy-visual::before {
          content: "";
          position: absolute;
          top: -12%;
          left: 50%;
          z-index: 1;
          width: min(46%, 420px);
          height: 92%;
          background: radial-gradient(ellipse 42% 70% at 50% 8%, rgba(20, 168, 96, 0.16), rgba(20, 168, 96, 0.05) 46%, transparent 74%);
          filter: blur(42px);
          opacity: 0.55;
          transform: translateX(-50%);
          pointer-events: none;
          mask-image: radial-gradient(ellipse 70% 72% at 50% 28%, #000 20%, transparent 74%);
          -webkit-mask-image: radial-gradient(ellipse 70% 72% at 50% 28%, #000 20%, transparent 74%);
        }

        .legacy-visual video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: grayscale(1) sepia(1) saturate(6) hue-rotate(72deg) contrast(1.08);
        }

        .legacy-orbit-slot {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: visible;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .legacy-orbit-slot > * {
          pointer-events: auto;
          transform: scale(1.68) translateY(36%);
          transform-origin: center center;
        }

        .legacy-orbit-slot.is-asking > * {
          transform: scale(1.68) translateY(36%);
        }

        .legacy-visual-timeline {
          position: absolute;
          top: 18px;
          right: 14px;
          bottom: 64px;
          z-index: 6;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          pointer-events: auto;
        }

        .legacy-visual-timeline::before {
          content: "";
          position: absolute;
          top: 12%;
          bottom: 12%;
          left: 50%;
          width: 1px;
          background: var(--line);
          transform: translateX(-50%);
        }

        .legacy-visual-timeline button {
          position: relative;
          z-index: 1;
          display: grid;
          width: 28px;
          height: 28px;
          margin: 10px 0;
          place-items: center;
          border: 1px solid var(--line);
          background: #090909;
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.52rem;
          letter-spacing: 0.08em;
          cursor: pointer;
        }

        .legacy-visual-timeline button[aria-current="true"] {
          border-color: #e9e5da;
          color: #e9e5da;
        }

        .legacy-ask-flow {
          position: absolute;
          inset: 0 52px 12px;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          pointer-events: none;
        }

        .legacy-ask-line {
          position: absolute;
          left: 50%;
          top: 44px;
          bottom: auto;
          width: 1px;
          height: 0;
          background: linear-gradient(to bottom, rgba(34, 197, 94, 0.95), rgba(242, 242, 242, 0.12));
          transform: translateX(-50%);
          transform-origin: top center;
        }

        .legacy-ask-line.is-to-answer {
          top: auto;
          bottom: 8%;
          transform-origin: bottom center;
          background: linear-gradient(to top, rgba(242, 242, 242, 0.12), rgba(34, 197, 94, 0.95));
        }

        .legacy-visual-beams {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          pointer-events: none;
          transform: rotate(-21deg) scale(1.12);
          transform-origin: 50% 10%;
          mask-image: radial-gradient(ellipse 58% 54% at 50% 34%, #000 8%, rgba(0, 0, 0, 0.55) 38%, transparent 66%);
          -webkit-mask-image: radial-gradient(ellipse 58% 54% at 50% 34%, #000 8%, rgba(0, 0, 0, 0.55) 38%, transparent 66%);
        }

        .legacy-visual-beams i {
          position: absolute;
          top: -16%;
          left: 50%;
          width: 16%;
          height: 140%;
          background: linear-gradient(
            180deg,
            rgba(20, 168, 96, 0.12) 0%,
            rgba(20, 168, 96, 0.04) 40%,
            rgba(20, 168, 96, 0) 78%
          );
          filter: blur(46px);
          transform-origin: top center;
        }

        .legacy-visual-beams i:nth-child(1) {
          transform: translateX(-210%);
        }

        .legacy-visual-beams i:nth-child(2) {
          transform: translateX(-50%);
        }

        .legacy-visual-beams i:nth-child(3) {
          transform: translateX(110%);
        }

        .legacy-ask-dock {
          position: relative;
          width: min(100%, 440px);
        }

        .legacy-ask-input {
          display: flex;
          align-items: center;
          min-height: 44px;
          border: 1px solid rgba(242, 242, 242, 0.16);
          background: rgba(12, 18, 14, 0.34);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          -webkit-backdrop-filter: blur(22px) saturate(1.45);
          backdrop-filter: blur(22px) saturate(1.45);
        }

        .legacy-ask-add {
          display: grid;
          flex: 0 0 44px;
          height: 44px;
          place-items: center;
          border-right: 1px solid var(--line);
          color: #e9e5da;
          font-family: var(--sans);
          font-size: 1.35rem;
          font-weight: 300;
          line-height: 1;
          font-style: normal;
        }

        .legacy-ask-add i {
          font-style: normal;
          font-weight: 300;
          line-height: 1;
          transition: transform 180ms ease;
        }

        .legacy-ask-add.is-open {
          background: rgba(233, 229, 218, 0.08);
        }

        .legacy-ask-add.is-open i {
          transform: rotate(45deg);
        }

        .legacy-ask-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: 7;
          display: flex;
          flex-direction: column;
          width: min(100%, 260px);
          max-height: 168px;
          overflow-y: auto;
          border: 1px solid var(--line);
          background: rgba(8, 0, 0, 0.9);
          -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
          scrollbar-width: thin;
        }

        .legacy-ask-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 8px 10px;
          border-left: 1px solid transparent;
          color: var(--muted);
          font-family: var(--sans);
          font-size: 0.62rem;
          letter-spacing: 0.02em;
        }

        .legacy-ask-menu-item em {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          font-style: normal;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .legacy-ask-check {
          flex: 0 0 14px;
          width: 14px;
          height: 14px;
          color: #86efac;
        }

        .legacy-ask-menu-item.is-hot {
          color: #e9e5da;
          background: rgba(34, 197, 94, 0.08);
        }

        .legacy-ask-menu-item.is-on {
          color: #e9e5da;
          border-left: 1px solid #4ade80;
          background: linear-gradient(90deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.02) 72%, transparent);
        }

        .legacy-ask-menu-item img {
          width: 16px;
          height: 16px;
          flex: 0 0 auto;
        }

        .legacy-ask-typed {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          padding: 10px 12px;
          color: #f2f2f2;
          font-family: var(--mono);
          font-size: 0.6rem;
          letter-spacing: 0;
          line-height: 1.2;
          white-space: nowrap;
        }

        .legacy-ask-caret {
          display: inline-block;
          width: 6px;
          height: 11px;
          margin-left: 2px;
          background: #22c55e;
          animation: legacy-ask-caret 0.9s steps(1) infinite;
          vertical-align: -1px;
        }

        .legacy-ask-send {
          flex: 0 0 auto;
          height: 44px;
          padding: 0 14px;
          border: 0;
          border-left: 1px solid var(--line);
          background: #f2f2f2;
          color: #111111;
          font-family: var(--mono);
          font-size: 0.58rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .legacy-ask-send:hover,
        .legacy-ask-send.is-hit {
          border-left-color: #4ade80;
          background: linear-gradient(90deg, rgba(34, 197, 94, 0.22), rgba(34, 197, 94, 0.02) 72%, transparent);
          color: #e9e5da;
        }

        .legacy-ask-send svg {
          width: 17px;
          height: 17px;
        }

        .legacy-ask-dock {
          will-change: transform;
        }

        .legacy-ask-mouse {
          position: absolute;
          top: 58px;
          right: 78px;
          width: 22px;
          height: 22px;
          opacity: 0;
          pointer-events: none;
        }

        .legacy-ask-mouse svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.45));
        }

        .legacy-ask-mouse.is-visible {
          opacity: 1;
          transition: top 0.55s cubic-bezier(0.22, 0.61, 0.36, 1), left 0.55s cubic-bezier(0.22, 0.61, 0.36, 1), right 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
        }

        .legacy-ask-mouse.is-plus {
          top: 12px;
          left: 14px;
          right: auto;
        }

        .legacy-ask-mouse.is-picking {
          right: auto;
        }

        .legacy-ask-mouse.is-aiming {
          top: 14px;
          right: 18px;
          left: auto;
        }

        .legacy-ask-mouse.is-click {
          transform: scale(0.88) translate(1px, 1px);
        }

        .legacy-ask-answer {
          position: relative;
          width: min(100%, 440px);
          padding: 14px 16px 16px;
          border: 1px solid rgba(242, 242, 242, 0.16);
          background: rgba(12, 18, 14, 0.34);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          -webkit-backdrop-filter: blur(22px) saturate(1.45);
          backdrop-filter: blur(22px) saturate(1.45);
          will-change: transform;
        }

        .legacy-ask-answer-kicker {
          margin: 0 0 8px;
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.5rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .legacy-ask-answer-body {
          margin: 0;
          color: #f2f2f2;
          font-size: 0.92rem;
          line-height: 1.45;
        }

        .legacy-ask-answer-rule {
          position: relative;
          height: 1px;
          margin: 20px 0 14px;
          background: var(--line);
        }

        .legacy-ask-answer-logos {
          position: absolute;
          left: 50%;
          top: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px;
          background: transparent;
          transform: translate(-50%, -50%);
        }

        .legacy-ask-answer-logos img {
          display: block;
          width: 18px;
          height: 18px;
          border: 0;
          background: transparent;
        }

        .legacy-ask-answer-cite {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0;
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.52rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .legacy-hero-progress {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 6;
          display: flex;
          align-items: flex-end;
          height: 14px;
          cursor: ew-resize;
          touch-action: none;
        }

        .legacy-hero-progress-track {
          position: relative;
          width: 100%;
          height: 1px;
          overflow: hidden;
          background: var(--line);
        }

        .legacy-hero-progress-fill {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, rgba(242, 242, 242, 0.035), rgba(242, 242, 242, 0.95));
        }

        @keyframes legacy-ask-caret {
          50% { opacity: 0; }
        }

        .legacy-flow {
          position: absolute;
          inset: 0 0 52px;
          z-index: 2;
          display: grid;
          grid-template-columns: auto minmax(36px, 1fr) auto minmax(36px, 1fr) minmax(168px, 1.15fr);
          align-items: center;
          gap: 8px;
          padding: 18px 20px 14px;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(4, 8, 5, 0.28) 0%, transparent 28%, transparent 72%, rgba(4, 8, 5, 0.34) 100%);
        }

        .legacy-flow-cluster,
        .legacy-flow-mark,
        .legacy-flow-card,
        .legacy-hex {
          pointer-events: auto;
        }

        .legacy-flow-cluster {
          position: relative;
          width: 108px;
          height: 116px;
          flex: 0 0 auto;
        }

        .legacy-flow-cluster .legacy-hex {
          position: absolute;
          left: 35px;
          top: 37px;
        }

        .legacy-flow-cluster .legacy-hex:nth-child(1) { transform: translate(0, -36px); }
        .legacy-flow-cluster .legacy-hex:nth-child(2) { transform: translate(31px, -18px); }
        .legacy-flow-cluster .legacy-hex:nth-child(3) { transform: translate(31px, 18px); }
        .legacy-flow-cluster .legacy-hex:nth-child(4) { transform: translate(0, 36px); }
        .legacy-flow-cluster .legacy-hex:nth-child(5) { transform: translate(-31px, 18px); }
        .legacy-flow-cluster .legacy-hex:nth-child(6) { transform: translate(-31px, -18px); }

        .legacy-hex {
          position: relative;
          width: 38px;
          height: 42px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #e9e5da;
          cursor: pointer;
        }

        .legacy-hex-face {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background:
            radial-gradient(22px circle at var(--mx, 50%) var(--my, 40%), rgba(0, 0, 0, 0.92), transparent 62%),
            linear-gradient(180deg, rgba(18, 28, 20, 0.92), rgba(4, 8, 5, 0.96));
          box-shadow: inset 0 0 0 1px rgba(233, 229, 218, 0.22);
        }

        .legacy-hex-face::before {
          content: "";
          position: absolute;
          inset: 0;
          clip-path: inherit;
          background: radial-gradient(18px circle at var(--mx, 50%) var(--my, 40%), color-mix(in oklab, var(--hex-color) 88%, white), transparent 68%);
          opacity: 0.35;
          pointer-events: none;
        }

        .legacy-hex-face::after {
          content: "";
          position: absolute;
          inset: 0;
          clip-path: inherit;
          box-shadow: inset 0 0 0 1.5px color-mix(in oklab, var(--hex-color) 80%, #d3ee67);
          opacity: 0;
          pointer-events: none;
        }

        .legacy-hex:hover .legacy-hex-face,
        .legacy-hex:focus-visible .legacy-hex-face {
          background:
            radial-gradient(28px circle at var(--mx, 50%) var(--my, 40%), transparent 8%, rgba(0, 0, 0, 0.88) 62%),
            linear-gradient(180deg, rgba(6, 10, 7, 0.2), rgba(0, 0, 0, 0.92));
        }

        .legacy-hex:hover .legacy-hex-face::before,
        .legacy-hex:focus-visible .legacy-hex-face::before {
          opacity: 1;
        }

        .legacy-hex:hover .legacy-hex-face::after,
        .legacy-hex:focus-visible .legacy-hex-face::after {
          opacity: 1;
        }

        .legacy-hex-face img {
          position: relative;
          z-index: 1;
          width: 16px;
          height: 16px;
          display: block;
        }

        .legacy-hex-tip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 6px);
          z-index: 4;
          transform: translateX(-50%) translateY(4px);
          padding: 3px 7px;
          border: 1px solid rgba(242, 242, 242, 0.18);
          background: rgba(4, 8, 5, 0.94);
          color: #e9e5da;
          font-family: var(--mono);
          font-size: 0.5rem;
          letter-spacing: 0.08em;
          line-height: 1.2;
          text-transform: uppercase;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease, transform 160ms ease;
        }

        .legacy-hex:hover .legacy-hex-tip,
        .legacy-hex:focus-visible .legacy-hex-tip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .legacy-flow-link {
          width: 100%;
          height: 24px;
          overflow: visible;
        }

        .legacy-flow-path {
          fill: none;
          stroke: rgba(211, 238, 103, 0.22);
          stroke-width: 1.2;
        }

        .legacy-flow-shimmer {
          fill: none;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-dasharray: 14 72;
          animation: legacy-flow-shimmer 2.4s linear infinite;
        }

        .legacy-flow-mark {
          display: grid;
          place-items: center;
          width: 44px;
          height: 48px;
          animation: legacy-flow-bounce 2.1s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }

        .legacy-flow-mark img {
          width: 26px;
          height: 32px;
          display: block;
          filter: drop-shadow(0 0 10px rgba(211, 238, 103, 0.28));
        }

        .legacy-flow-card {
          position: relative;
          display: grid;
          justify-items: center;
          gap: 8px;
          min-height: 168px;
          padding: 28px 22px 22px;
          clip-path: polygon(50% 0%, 100% 18%, 100% 82%, 50% 100%, 0% 82%, 0% 18%);
          background:
            linear-gradient(180deg, rgba(10, 16, 11, 0.88), rgba(3, 6, 4, 0.94));
          box-shadow: inset 0 0 0 1px rgba(233, 229, 218, 0.2);
          color: var(--ink);
          text-align: center;
        }

        .legacy-flow-stack {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 28px;
        }

        .legacy-flow-stack-item {
          display: grid;
          place-items: center;
          width: 26px;
          height: 28px;
          margin-left: -8px;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          background: rgba(6, 10, 7, 0.96);
          box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--hex-color) 70%, white);
        }

        .legacy-flow-stack-item:first-child {
          margin-left: 0;
        }

        .legacy-flow-stack-item img {
          width: 12px;
          height: 12px;
          display: block;
        }

        .legacy-flow-q {
          margin: 0;
          max-width: 28ch;
          color: var(--muted);
          font-family: var(--mono);
          font-size: 0.52rem;
          letter-spacing: 0.06em;
          line-height: 1.45;
          text-transform: uppercase;
        }

        .legacy-flow-a {
          margin: 0;
          max-width: 30ch;
          color: #f2f2f2;
          font-size: 0.78rem;
          line-height: 1.4;
        }

        @keyframes legacy-flow-shimmer {
          from { stroke-dashoffset: 86; }
          to { stroke-dashoffset: -86; }
        }

        @keyframes legacy-flow-bounce {
          0%, 100% { transform: translateY(0); }
          42% { transform: translateY(-6px); }
          58% { transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .legacy-flow {
            grid-template-columns: auto minmax(20px, 1fr) auto minmax(20px, 1fr) minmax(140px, 1.2fr);
            padding: 12px 12px 10px;
          }

          .legacy-flow-a {
            font-size: 0.68rem;
          }
        }

        @media (max-width: 700px) {
          .legacy-flow {
            grid-template-columns: auto 12px auto 12px minmax(0, 1fr);
            gap: 4px;
            padding: 10px 10px 8px;
          }

          .legacy-flow-cluster {
            width: 88px;
            height: 96px;
          }

          .legacy-flow-cluster .legacy-hex {
            left: 25px;
            top: 27px;
          }

          .legacy-flow-q {
            display: none;
          }

          .legacy-flow-card {
            min-height: 132px;
            padding: 22px 14px 16px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .legacy-flow-shimmer,
          .legacy-flow-mark {
            animation: none;
          }
        }

        .legacy-marquee {
          display: none;
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
          left: var(--section-inline);
          bottom: 28px;
          z-index: 5;
          transform: none;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          color: var(--ink);
          text-decoration: none;
          text-align: left;
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
          align-items: stretch;
          width: calc(100% - 126px);
          margin-left: 126px;
          min-width: 0;
          transform: none !important;
          will-change: auto;
        }

        .legacy-marquee .legacy-track-group {
          display: contents;
        }

        .legacy-marquee .legacy-group,
        .legacy-marquee .legacy-group:hover,
        .legacy-marquee .legacy-group:focus-within {
          width: auto;
          min-width: 0;
          max-width: none;
          flex: none;
          height: 52px;
          overflow: hidden;
          border: 0;
        }

        .legacy-chip-slot {
          display: grid;
          grid-template-areas: "chip";
          align-items: center;
          justify-items: stretch;
          width: 100%;
          height: 52px;
          overflow: hidden;
        }

        .legacy-chip-slot .legacy-chip {
          grid-area: chip;
        }

        .legacy-chip-slot .legacy-chip.is-exit {
          animation: source-slot-exit 520ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }

        .legacy-chip-slot .legacy-chip.is-enter {
          animation: source-slot-enter 520ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }

        @keyframes source-slot-exit {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-110%); opacity: 0; }
        }

        @keyframes source-slot-enter {
          from { transform: translateY(110%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .legacy-chip-slot .legacy-chip.is-exit,
          .legacy-chip-slot .legacy-chip.is-enter {
            animation: none;
          }
        }

        .legacy-marquee .legacy-chip,
        .legacy-marquee .legacy-chip:hover,
        .legacy-marquee .legacy-chip:focus-visible {
          position: relative;
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          height: 52px;
          overflow: hidden;
          background: transparent;
          gap: clamp(4px, 0.6vw, 8px);
          padding: 0 clamp(2px, 0.6vw, 8px);
          justify-content: center;
          align-items: center;
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

        .legacy-marquee .legacy-chip-icon {
          flex: 0 0 22px;
        }

        .legacy-marquee .legacy-chip-label {
          padding: 0;
          color: #e9e5da;
          text-align: left;
          flex: 0 1 auto;
          width: auto;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: clip;
          letter-spacing: 0.03em;
          font-size: clamp(0.42rem, 0.85vw, 0.58rem);
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
          background: var(--paper);
        }

        .legacy-story > div {
          display: grid;
          gap: 14px;
        }

        .legacy-how-copy {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 48px;
        }

        .legacy-how-copy > div {
          display: grid;
          align-content: start;
          gap: 14px;
        }

        .legacy-how-copy > div > p:first-child {
          margin-bottom: 0;
        }

        .legacy-how-media {
          position: relative;
          display: grid;
          place-items: center;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border: 1px solid rgba(242, 242, 242, 0.035);
          background: #090909;
        }

        .legacy-how-media::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          background: radial-gradient(ellipse 82% 78% at 50% 44%, transparent 58%, #090909 96%);
        }

        .legacy-how-media::before {
          content: "";
          position: absolute;
          top: -12%;
          left: 50%;
          z-index: 1;
          width: min(52%, 320px);
          height: 92%;
          background: radial-gradient(ellipse 42% 70% at 50% 8%, rgba(20, 168, 96, 0.16), rgba(20, 168, 96, 0.05) 46%, transparent 74%);
          filter: blur(42px);
          opacity: 0.55;
          transform: translateX(-50%);
          pointer-events: none;
          mask-image: radial-gradient(ellipse 70% 72% at 50% 28%, #000 20%, transparent 74%);
          -webkit-mask-image: radial-gradient(ellipse 70% 72% at 50% 28%, #000 20%, transparent 74%);
        }

        .legacy-how-media-stage {
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
          overflow: hidden;
          animation: legacy-how-media-in 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .legacy-how-media-stage .legacy-visual-beams {
          z-index: 1;
        }

        .legacy-how-media-stage .legacy-orbit-slot {
          position: relative;
          inset: auto;
          width: 100%;
          height: 100%;
        }

        .legacy-how-media-stage .legacy-orbit-slot > * {
          transform: scale(1.05);
          transform-origin: center center;
        }

        .legacy-how-media-stage .legacy-ask-flow {
          position: relative;
          inset: auto;
          width: 100%;
          height: 100%;
          padding: 16px 14px;
          gap: 10px;
          transform: none;
          justify-content: center;
        }

        #how-it-works .legacy-ask-line {
          display: none;
        }

        #how-it-works .legacy-ask-dock,
        #how-it-works .legacy-ask-answer {
          width: 100%;
          max-width: none;
        }

        #how-it-works .legacy-ask-input {
          min-height: 40px;
          align-items: flex-start;
        }

        #how-it-works .legacy-ask-add,
        #how-it-works .legacy-ask-send {
          height: auto;
          min-height: 40px;
        }

        #how-it-works .legacy-ask-typed {
          white-space: normal;
          overflow: visible;
          font-size: 0.62rem;
          line-height: 1.35;
          padding: 8px 10px;
        }

        #how-it-works .legacy-ask-answer {
          padding: 12px 12px 12px;
        }

        #how-it-works .legacy-ask-answer-body {
          font-size: 0.8rem;
          line-height: 1.4;
        }

        #how-it-works .legacy-ask-answer-rule {
          margin: 14px 0 10px;
        }

        #how-it-works .legacy-ask-mouse {
          display: none;
        }

        #how-it-works .legacy-how-media::after {
          display: none;
        }

        .legacy-review-flow {
          display: grid;
          align-content: center;
          gap: 10px;
          width: 100%;
          height: 100%;
          padding: 18px 16px;
        }

        .legacy-review-block,
        .legacy-review-load {
          padding: 0 14px;
        }

        .legacy-review-block p,
        .legacy-review-card p,
        .legacy-review-source blockquote {
          margin: 6px 0 0;
          color: var(--ink);
          font: 400 0.86rem/1.45 var(--sans);
        }

        .legacy-review-block span,
        .legacy-review-load span,
        .legacy-review-card span,
        .legacy-review-source-tag span,
        .legacy-review-source small {
          color: var(--acid);
          font: 500 0.56rem/1 var(--mono);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .legacy-review-caret {
          display: inline-block;
          width: 1px;
          height: 0.95em;
          margin-left: 2px;
          background: var(--ink);
          vertical-align: -2px;
          animation: legacy-review-caret 720ms steps(1) infinite;
        }

        .legacy-review-load {
          opacity: 0;
        }

        .legacy-review-load.is-in {
          opacity: 1;
        }

        .legacy-review-card {
          visibility: hidden;
          transform: translateY(16px);
        }

        .legacy-review-card.is-in {
          visibility: visible;
          transform: none;
          transition: transform 380ms ease;
        }

        .legacy-review-source {
          visibility: hidden;
        }

        .legacy-review-source.is-in {
          visibility: visible;
        }

        .legacy-review-load {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .legacy-review-load b {
          display: flex;
          gap: 5px;
        }

        .legacy-review-load b i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--acid);
          animation: legacy-review-dot 720ms ease-in-out infinite;
        }

        .legacy-review-load b i:nth-child(2) { animation-delay: 120ms; }
        .legacy-review-load b i:nth-child(3) { animation-delay: 240ms; }

        .legacy-review-card {
          padding: 12px 14px 14px;
          border: 1px solid rgba(242, 242, 242, 0.035);
          background: rgba(12, 18, 14, 0.34);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          -webkit-backdrop-filter: blur(22px) saturate(1.45);
          backdrop-filter: blur(22px) saturate(1.45);
        }

        .legacy-review-source {
          position: relative;
          padding: 4px 14px 0 0;
        }

        .legacy-review-source-tag {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          margin-left: 0;
        }

        .legacy-review-source-logo {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          margin: 0;
          border: 1px solid rgba(242, 242, 242, 0.035);
          background: rgba(12, 18, 14, 0.55);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .legacy-review-source-logo img {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }

        .legacy-review-source blockquote {
          margin: 8px 0 0 14px;
          padding: 0 0 0 12px;
          border-left: 2px solid var(--line);
          color: var(--muted);
        }

        .legacy-review-source mark {
          color: inherit;
          background: transparent;
          padding: 0;
        }

        .legacy-review-source mark.is-on {
          color: #0a0a0a;
          background: var(--acid);
          padding: 0 2px;
          transition: background-color 160ms ease, color 160ms ease;
        }

        .legacy-review-source small {
          display: block;
          margin-top: 8px;
          color: var(--muted);
          letter-spacing: 0.08em;
        }

        @keyframes legacy-review-caret {
          50% { opacity: 0; }
        }

        @keyframes legacy-review-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }

        @keyframes legacy-how-media-in {
          from { opacity: 0; transform: translateY(18px) scale(0.985); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        .legacy-how-review-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: grayscale(1) sepia(1) saturate(6) hue-rotate(72deg) contrast(1.08);
        }

        .legacy-how-media-stage .legacy-orbit-slot img {
          filter: none;
        }

        #how-it-works .legacy-how-subtitle {
          margin: 0;
          max-width: 42ch;
          color: var(--muted);
          text-align: left;
        }

        @media (min-width: 901px) {
          #how-it-works .legacy-how-grid {
            grid-template-columns: minmax(0, 0.92fr) minmax(440px, 1.08fr);
            align-items: start;
            gap: clamp(64px, 9vw, 144px);
          }

          #how-it-works .legacy-how-steps {
            margin-top: -18vh;
            margin-bottom: -18vh;
          }
        }

        @media (min-width: 901px) {
          .legacy-how-scroll {
            position: relative;
            min-height: 370vh;
          }

          .legacy-how-scroll.is-static {
            min-height: 0;
          }

          .legacy-how-viewport {
            position: sticky;
            top: 0;
            z-index: 0;
            height: 100vh;
            overflow: hidden;
            display: grid;
            align-items: center;
            width: 100%;
          }

          .legacy-how-stage {
            position: relative;
            width: 100%;
            display: grid;
            grid-template-columns: minmax(240px, 1fr) minmax(280px, 380px);
            grid-template-areas: "copy media";
            align-items: center;
            gap: clamp(20px, 3vw, 36px);
            padding: clamp(24px, 4vh, 48px) var(--section-inline) clamp(24px, 4vh, 48px) clamp(300px, 34vw, 480px);
          }

          .legacy-how-orbit { grid-area: unset; }
          .legacy-how-panels { grid-area: copy; }
          #how-it-works .legacy-how-media { grid-area: media; }

          .legacy-how-orbit {
            --how-orbit: min(98vh, 920px);
            position: absolute;
            left: calc(var(--how-orbit) * -0.6875);
            top: 50%;
            width: var(--how-orbit);
            height: var(--how-orbit);
            margin-top: calc(var(--how-orbit) / -2);
            z-index: 2;
            pointer-events: none;
          }

          .legacy-how-ring-svg {
            display: block;
            width: 100%;
            height: 100%;
            overflow: visible;
          }

          .legacy-how-ring-track,
          .legacy-how-ring-fill {
            fill: none;
          }

          .legacy-how-ring-track {
            stroke: color-mix(in srgb, var(--ink) 14%, transparent);
            stroke-width: 0.16;
          }

          .legacy-how-ring-fill {
            stroke: var(--ink);
            stroke-width: 0.38;
            stroke-linecap: round;
          }

          .legacy-how-marker {
            position: absolute;
            margin: 0;
            padding: 0;
            width: clamp(64px, 7.2vh, 78px);
            aspect-ratio: 1;
            display: grid;
            place-items: center;
            border-radius: 50%;
            font: 500 clamp(0.95rem, 1.6vh, 1.2rem)/1 var(--sans);
            letter-spacing: 0.02em;
            cursor: pointer;
            pointer-events: auto;
            background: var(--paper);
            color: var(--ink);
            border: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
            z-index: 3;
            box-shadow: 0 0 0 7px var(--paper);
          }

          .legacy-how-marker.is-active {
            background: var(--ink);
            color: var(--paper);
            border-color: var(--ink);
            z-index: 4;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
          }

          .legacy-how-panels {
            position: relative;
            min-height: clamp(190px, 26vh, 236px);
          }

          .legacy-how-panel {
            position: absolute;
            inset: 0;
            opacity: 0;
            transform: translateY(28px);
            pointer-events: none;
          }

          .legacy-how-panel.is-active {
            opacity: 1;
            transform: none;
          }

          .legacy-how-panel > p:first-child {
            margin: 0 0 12px;
            color: var(--acid);
            font: 500 0.66rem/1 var(--mono);
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .legacy-how-panel h3 {
            margin: 0 0 18px;
            max-width: 20ch;
            color: var(--ink);
            font: 500 clamp(1.7rem, 2.6vw, 2.5rem)/1.06 var(--sans);
            letter-spacing: -0.04em;
            text-wrap: balance;
          }

          .legacy-how-panel > p:last-child {
            margin: 0;
            max-width: 44ch;
            color: var(--muted);
            font: 400 clamp(0.98rem, 1.2vw, 1.12rem)/1.7 var(--sans);
          }

          #how-it-works .legacy-how-media {
            position: relative;
            top: auto;
            width: 100%;
            max-width: 380px;
            height: min(52vh, 380px);
            aspect-ratio: 1;
            align-self: center;
            justify-self: end;
            overflow: hidden;
            isolation: isolate;
          }

          .legacy-how-scroll.is-static .legacy-how-viewport {
            height: auto;
            min-height: 100vh;
          }

          .legacy-how-scroll.is-static .legacy-how-stage {
            grid-template-columns: minmax(240px, 1fr) minmax(280px, 380px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .legacy-how-marker,
          .legacy-how-panel {
            transition: none;
          }

          .legacy-how-ring-fill {
            opacity: 0.5;
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

        #how-it-works .legacy-how-copy h2 {
          max-width: 24ch;
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
            border: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            background: color-mix(in oklch, var(--paper) 74%, transparent);
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
            padding-top: 100px;
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
            flex-direction: row;
            align-items: center;
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
            align-self: center;
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
          min-height: 0;
          padding: 100px var(--section-inline);
          display: grid;
          place-items: center;
          overflow: hidden;
          background: radial-gradient(circle at 50% 105%, rgba(22, 255, 59, 0.07), transparent 42%), var(--paper);
        }

        #how-it-works {
          min-height: 100vh;
          border-bottom: 0;
          padding-top: clamp(88px, 11vw, 140px);
          padding-bottom: clamp(88px, 11vw, 140px);
          padding-left: 0;
          padding-right: 0;
          display: grid;
          place-items: stretch;
          background: #000;
        }

        #how-it-works .legacy-how-viewport {
          background: #000;
        }

        #how-it-works > div {
          width: 100%;
          display: grid;
          gap: clamp(48px, 7vh, 84px);
        }

        #how-it-works .legacy-how-copy {
          padding-inline: var(--section-inline);
        }

        .legacy-how-grid {
          display: grid;
          gap: clamp(48px, 7vh, 84px);
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

        .legacy-how-steps {
          width: 100%;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .legacy-how-step {
          position: relative;
          width: 100%;
          min-height: 70vh;
          display: flex;
          align-items: center;
          border-top: 1px solid var(--line);
          transition: border-color 260ms ease;
        }

        .legacy-how-step:last-child {
          border-bottom: 1px solid var(--line);
        }

        .legacy-how-step::before {
          content: "";
          position: absolute;
          top: -1px;
          left: 0;
          width: 0;
          height: 1px;
          background: #4ade80;
          box-shadow: 0 0 14px rgba(34, 197, 94, 0.45);
          transition: width 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .legacy-how-step.is-active::before {
          width: 100%;
        }

        .legacy-how-step-content {
          width: 100%;
          padding: clamp(52px, 8vh, 86px) 0;
          opacity: 0.38;
          transform: translateY(12px);
          transition: opacity 360ms ease, transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .legacy-how-step.is-active .legacy-how-step-content {
          opacity: 1;
          transform: translateY(0);
        }

        .legacy-how-step-trigger {
          width: 100%;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          padding: 0;
          border: 0;
          color: var(--ink);
          background: transparent;
          text-align: left;
          font: inherit;
        }

        .legacy-how-step-number {
          color: var(--muted);
          font: 500 0.72rem/1 var(--mono);
          letter-spacing: 0.14em;
          transition: color 260ms ease;
        }

        .legacy-how-step-title {
          margin: 0;
          color: var(--ink);
          font: 500 clamp(1.65rem, 3vw, 2.65rem)/1.05 var(--sans);
          letter-spacing: -0.04em;
          text-wrap: balance;
        }

        .legacy-how-step-marker {
          width: 8px;
          height: 8px;
          border: 1px solid var(--muted);
          transform: rotate(45deg);
          transition: border-color 260ms ease, background 260ms ease, box-shadow 260ms ease;
        }

        .legacy-how-step.is-active .legacy-how-step-number {
          color: #4ade80;
        }

        .legacy-how-step.is-active .legacy-how-step-marker {
          border-color: #4ade80;
          background: #4ade80;
          box-shadow: 0 0 14px rgba(34, 197, 94, 0.6);
        }

        .legacy-how-step-copy {
          margin: 28px 0 0 clamp(38px, 4.4vw, 60px) !important;
          max-width: 48ch !important;
          color: var(--muted);
          font: 400 clamp(1rem, 1.35vw, 1.16rem)/1.72 var(--sans) !important;
        }

        .legacy-how-mobile-media {
          display: none;
        }

        @media (max-width: 900px) {
          #how-it-works .legacy-how-subtitle {
            margin-bottom: 0;
          }

          #how-it-works .legacy-how-copy {
            align-items: flex-start;
            flex-direction: column;
            gap: 24px;
          }

          #how-it-works .legacy-how-grid {
            gap: 0;
          }

          .legacy-how-step {
            min-height: 0;
            display: block;
            padding: clamp(60px, 14vw, 92px) 0;
          }

          .legacy-how-step-content,
          .legacy-how-step.is-active .legacy-how-step-content {
            padding: 0;
            opacity: 1;
            transform: none;
          }

          .legacy-how-step-trigger {
            grid-template-columns: auto 1fr auto;
            gap: 14px;
          }

          .legacy-how-step-title {
            font-size: clamp(1.55rem, 7vw, 2.2rem);
          }

          .legacy-how-step-copy {
            margin: 22px 0 32px 0 !important;
          }

          .legacy-how-mobile-media {
            position: relative;
            display: grid;
            width: 100%;
            aspect-ratio: 4 / 5;
            overflow: hidden;
            border: 1px solid var(--line);
            background: #090909;
          }

          .legacy-how-mobile-media::before {
            content: "";
            position: absolute;
            inset: 0;
            z-index: 3;
            pointer-events: none;
            background: radial-gradient(ellipse 82% 78% at 50% 44%, transparent 58%, #090909 96%);
          }
        }

        .legacy-plans {
          position: relative;
          z-index: 0;
          min-height: 100vh;
          padding: clamp(88px, 11vw, 140px) var(--section-inline) clamp(72px, 8vw, 110px);
          background: #000;
          color: var(--ink);
        }

        .legacy-plans-copy {
          display: grid;
          gap: 12px;
          max-width: 46ch;
          margin-bottom: clamp(36px, 5vh, 56px);
        }

        .legacy-plans-copy > p:first-child {
          margin: 0;
          color: var(--acid);
          font: 500 0.6rem/1 var(--mono);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .legacy-plans-copy h2 {
          margin: 0;
          font: 500 clamp(2rem, 4vw, 3rem)/1.05 var(--sans);
          letter-spacing: -0.045em;
        }

        .legacy-plans-lede {
          margin: 0;
          color: var(--muted);
          font: 400 1rem/1.6 var(--sans);
        }

        .legacy-plans-grid {
          display: grid;
          gap: 1px;
          background: rgba(242, 242, 242, 0.06);
          border: 1px solid rgba(242, 242, 242, 0.06);
        }

        @media (min-width: 901px) {
          .legacy-plans-grid {
            grid-template-columns: 1.05fr 1.15fr 1fr;
          }
        }

        .legacy-plan {
          display: grid;
          align-content: start;
          gap: 22px;
          padding: clamp(22px, 3vw, 32px);
          background: #000;
        }

        .legacy-plan.is-featured {
          background: #070807;
        }

        .legacy-plan header {
          display: grid;
          gap: 8px;
        }

        .legacy-plan header span {
          color: var(--muted);
          font: 500 0.56rem/1 var(--mono);
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .legacy-plan h3 {
          margin: 0;
          font: 500 clamp(1.5rem, 2.2vw, 1.9rem)/1.1 var(--sans);
          letter-spacing: -0.03em;
        }

        .legacy-plan header strong {
          color: var(--acid);
          font: 500 0.92rem/1.3 var(--sans);
        }

        .legacy-plan header p {
          margin: 4px 0 0;
          max-width: 32ch;
          color: var(--muted);
          font: 400 0.95rem/1.55 var(--sans);
        }

        .legacy-plan ul {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
          list-style: none;
        }

        .legacy-plan li {
          position: relative;
          padding-left: 16px;
          color: var(--ink);
          font: 400 0.9rem/1.45 var(--sans);
        }

        .legacy-plan li::before {
          content: "";
          position: absolute;
          top: 0.55em;
          left: 0;
          width: 6px;
          height: 1px;
          background: var(--acid);
        }

        .legacy-plan-cta {
          justify-self: start;
          margin-top: auto;
          padding: 12px 16px;
          border: 1px solid rgba(242, 242, 242, 0.16);
          background: transparent;
          color: var(--ink);
          font: 500 0.78rem/1 var(--sans);
          text-decoration: none;
          cursor: pointer;
        }

        .legacy-plan.is-featured .legacy-plan-cta {
          background: var(--ink);
          color: #000;
          border-color: var(--ink);
        }

        .legacy-plan-cta:hover,
        .legacy-plan-cta:focus-visible {
          border-color: var(--acid);
        }

        .legacy-plans-care {
          margin: 28px 0 0;
          color: var(--muted);
          font: 400 0.88rem/1.5 var(--sans);
        }

        .legacy-plans-care a {
          color: var(--ink);
        }

        .legacy-footer {
          position: relative;
          z-index: 20;
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
          padding: clamp(72px, 7vw, 96px) clamp(24px, 6vw, 88px);
          overflow: hidden;
          border-bottom: 0;
          background: #050505;
          isolation: isolate;
        }

        .legacy-footer-prompt {
          border-top: 1px solid transparent;
          border-image: linear-gradient(90deg, var(--line) 0%, var(--line) 28%, rgba(255, 255, 255, 0.82) 50%, var(--line) 72%, var(--line) 100%) 1;
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

        .legacy-footer-prompt .legacy-visual-beams {
          z-index: 0;
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

        .legacy-footer-prompt h3 {
          max-width: none;
          margin: 0 auto;
          font-family: var(--sans);
          font-size: clamp(1.35rem, 2.4vw, 1.85rem);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -0.03em;
          white-space: nowrap;
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
          min-height: 0;
          height: auto;
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
          width: clamp(300px, 34vw, 420px);
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
          width: calc(clamp(300px, 34vw, 420px) + 96px);
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
          border-top: 0;
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
          font-size: clamp(0.95rem, 1.15vw, 1.125rem);
          line-height: 1.45;
          letter-spacing: -0.015em;
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
            padding: 56px 18px;
            background-size: auto;
          }

          .legacy-footer-prompt::before {
            inset: 0 auto auto 0;
          }

          .legacy-footer-prompt h3 {
            margin-top: 0;
            font-size: clamp(1.25rem, 5.4vw, 1.7rem);
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
            overflow: hidden;
          }

          .legacy-marquee .legacy-chip {
            gap: 0;
            padding: 0;
          }

          .legacy-marquee .legacy-chip-label {
            display: none;
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
            font-size: 1rem;
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
          .legacy-nav--fixed {
            transition: none;
          }

          #our-story > div {
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <nav ref={navRef} className={`legacy-nav legacy-nav--fixed ${navScrolled ? "is-scrolled" : ""}`} aria-label="Primary">
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
            Why trust us
          </a>
          <a className="legacy-navlink" href="#our-story" data-panel="origin" onClick={scrollToStory}>
            Our Story
          </a>
          <a className="legacy-navlink" href="#how-it-works" data-panel="how-it-works" onClick={scrollToHowItWorks}>
            How it works
          </a>
          <a className="legacy-navlink" href="#plans" onClick={scrollToPlans}>
            Plans
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
          <a className="legacy-navlink" href="#work" data-panel="provenance" onClick={(event) => openPanelFromClick(event, "trust")}>Why trust us</a>
          <a className="legacy-navlink" href="#our-story" data-panel="origin" onClick={scrollToStory}>Our Story</a>
          <a className="legacy-navlink" href="#how-it-works" data-panel="how-it-works" onClick={scrollToHowItWorks}>How it works</a>
          <a className="legacy-navlink" href="#plans" onClick={scrollToPlans}>Plans</a>
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
            ) : openPanel === "trust" ? (
              <div className="legacy-trust">
                <h3>No citation, no answer.</h3>
                <p className="legacy-trust-lead">
                  A claim without a page is never stored. The link to the source is required, so an uncited line is
                  rejected when it is saved.
                </p>
                <ul className="legacy-trust-buys">
                  <li>
                    <strong>You can check it</strong>
                    <span>Open the citation and land on the page it came from.</span>
                  </li>
                  <li>
                    <strong>It can say no</strong>
                    <span>If your records do not support a claim, the claim is dropped.</span>
                  </li>
                  <li>
                    <strong>You can take the evidence</strong>
                    <span>The file, the page, the date it arrived, and the source it came through.</span>
                  </li>
                </ul>
                <article className="legacy-trust-example" aria-label="Cited answer example">
                  <p className="legacy-trust-example-kicker">In an answer</p>
                  <p className="legacy-trust-example-body">
                    The 1998 agreement allowed termination for convenience on ninety days' notice (1), but only after
                    the second renewal (2).
                  </p>
                  <ol>
                    <li>
                      <p>"either party may terminate for convenience upon ninety (90) days written notice"</p>
                      <small>Supply Agreement 1998.pdf, page 14, Google Drive</small>
                    </li>
                    <li>
                      <p>"the foregoing shall not apply prior to the Second Renewal Term"</p>
                      <small>Supply Agreement 1998.pdf, page 203, Google Drive</small>
                    </li>
                  </ol>
                </article>
              </div>
            ) : openPanel === "auth" ? (
              <div className="legacy-auth">
                <div className="legacy-auth-tabs" role="tablist" aria-label="Account">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "signin"}
                    className={authMode === "signin" ? "is-on" : ""}
                    onClick={() => setAuthMode("signin")}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={authMode === "signup"}
                    className={authMode === "signup" ? "is-on" : ""}
                    onClick={() => setAuthMode("signup")}
                  >
                    Create an account
                  </button>
                </div>
                <h3>{authMode === "signin" ? "Welcome back." : "Start with one folder."}</h3>
                <p>
                  {authMode === "signin"
                    ? "Your records and every citation are where you left them."
                    : "Connect a single source and ask it something. Nothing else is indexed until you say so."}
                </p>
                <form
                  className="legacy-auth-form"
                  action="https://pitar.ai/signin"
                  method="get"
                >
                  <label>
                    <span>Work email</span>
                    <input type="email" name="email" autoComplete="email" inputMode="email" placeholder="you@company.com" required />
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      name="password"
                      autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                      minLength={6}
                      placeholder="••••••••••"
                      required
                    />
                  </label>
                  <button className="legacy-auth-submit" type="submit">
                    {authMode === "signin" ? "Sign in" : "Create account"}
                  </button>
                  {authMode === "signin" ? (
                    <a className="legacy-auth-forgot" href="https://pitar.ai/signin">
                      Forgot your password?
                    </a>
                  ) : null}
                </form>
                <div className="legacy-auth-foot">
                  <p className="legacy-auth-note">Your records stay yours. Disconnect a source and its documents leave the index.</p>
                </div>
              </div>
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
          <div
            className="legacy-visual"
            aria-label="Background hero visual"
            data-screen={heroScreen}
            onMouseEnter={() => setHeroHoverPaused(true)}
            onMouseLeave={() => setHeroHoverPaused(false)}
          >
            <div className="legacy-visual-beams" aria-hidden="true">
              <i /><i /><i />
            </div>
            <div className={`legacy-orbit-slot dark${heroScreen === 2 ? " is-asking" : ""}`}>
              <OrbitingCirclesGlobe paused={heroHoverPaused} dimRings={heroScreen === 2} />
            </div>
            {heroScreen === 2 ? <HeroAskFlow beatIndex={heroBeat} elapsedMs={heroElapsed} /> : null}
            <nav className="legacy-visual-timeline" aria-label="Hero storyboard">
              <button
                type="button"
                aria-current={heroScreen === 1}
                onClick={() => {
                  heroElapsedRef.current = 0
                  setHeroElapsed(0)
                  setHeroScreen(1)
                }}
              >
                01
              </button>
              <button
                type="button"
                aria-current={heroScreen === 2}
                onClick={() => {
                  heroElapsedRef.current = 0
                  setHeroElapsed(0)
                  setHeroScreen(2)
                }}
              >
                02
              </button>
            </nav>
            <div
              className="legacy-hero-progress"
              role="slider"
              aria-label="Hero playback"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(
                (heroElapsed / (heroScreen === 1 ? screenOneMs : heroAskDuration(heroBeat))) * 100,
              )}
              onPointerDown={onHeroProgressPointerDown}
              onPointerMove={onHeroProgressPointerMove}
              onPointerUp={endHeroScrub}
              onPointerCancel={endHeroScrub}
            >
              <span className="legacy-hero-progress-track">
                <i
                  className="legacy-hero-progress-fill"
                  style={{
                    width: `${Math.min(100, (heroElapsed / (heroScreen === 1 ? screenOneMs : heroAskDuration(heroBeat))) * 100)}%`,
                  }}
                />
              </span>
            </div>
          </div>
            <div className="legacy-marquee" aria-label="Possible connectors">
            <button className="legacy-marquee-label" type="button" onClick={() => setOpenPanel("connections")}>Sources</button>
            <div className="legacy-track">
              <div className="legacy-track-group">
                {sourceSlots.map((slot, index) => (
                  <span className="legacy-group" key={`source-slot-${index}`}>
                    <span className={`legacy-chip-slot${slot.exiting ? " is-swapping" : ""}`}>
                      <span
                        className={`legacy-chip${slot.exiting ? " is-exit" : ""}`}
                        aria-hidden={Boolean(slot.incoming)}
                        aria-label={slot.incoming ? undefined : slot.current.label}
                        style={{ ["--chip-color" as keyof CSSProperties]: slot.current.color } as CSSProperties}
                      >
                        <span className="legacy-chip-icon" aria-hidden="true">
                          <img src={slot.current.icon} alt="" width="22" height="22" />
                        </span>
                        <span className="legacy-chip-label">{slot.current.label}</span>
                      </span>
                      {slot.incoming ? (
                        <span
                          className="legacy-chip is-enter is-in"
                          aria-label={slot.incoming.label}
                          style={{ ["--chip-color" as keyof CSSProperties]: slot.incoming.color } as CSSProperties}
                        >
                          <span className="legacy-chip-icon" aria-hidden="true">
                            <img src={slot.incoming.icon} alt="" width="22" height="22" />
                          </span>
                          <span className="legacy-chip-label">{slot.incoming.label}</span>
                        </span>
                      ) : null}
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

      <section className="legacy-story" id="how-it-works" aria-label="How Pitar works">
        <div>
          <div className="legacy-how-copy">
            <div>
              <p>How it works</p>
              <h2>Everything you keep. Any question you have.</h2>
            </div>
            <p className="legacy-how-subtitle">Answers come with source evidence. No answer without trace.</p>
          </div>
          {isDesktopHow ? (
            <div
              ref={howWrapRef}
              className={`legacy-how-scroll${reducedMotion ? " is-static" : ""}`}
            >
              <div className="legacy-how-viewport">
                <div className="legacy-how-stage">
                    <div className="legacy-how-orbit" ref={howOrbitRef} aria-hidden="false">
                      <svg className="legacy-how-ring-svg" viewBox="0 0 100 100" aria-hidden="true">
                        <circle className="legacy-how-ring-track" cx="50" cy="50" r="50" />
                        <circle
                          ref={howRingFillRef}
                          className="legacy-how-ring-fill"
                          cx="50"
                          cy="50"
                          r="50"
                          strokeDasharray="0 314.16"
                        />
                      </svg>
                      {howItWorksSteps.map((step, index) => {
                        const theta = -index * HOW_ORBIT_GAP
                        const rad = (theta * Math.PI) / 180
                        return (
                        <button
                          key={step.step}
                          type="button"
                          className={`legacy-how-marker${activeHowStep === index ? " is-active" : ""}`}
                          style={{
                            left: `${50 + 50 * Math.cos(rad)}%`,
                            top: `${50 + 50 * Math.sin(rad)}%`,
                            transform: `translate(-50%, -50%) rotate(${theta}deg)`,
                          }}
                          aria-label={`Go to step ${index + 1}: ${step.title}`}
                          aria-pressed={activeHowStep === index}
                          onClick={() => scrollToHowStep(index)}
                        >
                          {step.step}
                        </button>
                        )
                      })}
                    </div>
                    <div className="legacy-how-panels" ref={howPanelsRef}>
                      {howItWorksSteps.map(({ step, title, copy }, index) => (
                        <div
                          className={`legacy-how-panel${activeHowStep === index ? " is-active" : ""}`}
                          key={step}
                          aria-hidden={activeHowStep !== index}
                        >
                          <p>Step {step}</p>
                          <h3>{title}</h3>
                          <p>{copy}</p>
                        </div>
                      ))}
                    </div>
                  <div
                    className="legacy-how-media"
                    id="how-it-works-visual"
                    aria-live="polite"
                    aria-label={`${howItWorksSteps[activeHowStep].title} visual`}
                  >
                    {renderHowVisual(activeHowStep)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="legacy-how-grid">
              <ol className="legacy-how-steps" aria-label="How Pitar works, step by step">
                {howItWorksSteps.map(({ step, title, copy }, index) => (
                  <li className={`legacy-how-step${activeHowStep === index ? " is-active" : ""}`} key={step}>
                    <div className="legacy-how-step-content">
                      <button
                        className="legacy-how-step-trigger"
                        type="button"
                        aria-pressed={activeHowStep === index}
                        onClick={() => scrollToHowStep(index)}
                      >
                        <span className="legacy-how-step-number">{step}</span>
                        <h3 className="legacy-how-step-title">{title}</h3>
                        <span className="legacy-how-step-marker" aria-hidden="true" />
                      </button>
                      <p className="legacy-how-step-copy">{copy}</p>
                      <div className="legacy-how-mobile-media" aria-label={`${title} visual`}>
                        {renderHowVisual(index)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      <section className="legacy-plans" id="plans" aria-labelledby="plans-title">
        <div className="legacy-plans-copy">
          <p>Plans</p>
          <h2 id="plans-title">Plans for every archive.</h2>
          <p className="legacy-plans-lede">
            Pricing is still taking shape. Create an account to be first in, or write care if you need a quote.
          </p>
        </div>
        <div className="legacy-plans-grid">
          {pitarPlans.map((plan) => (
            <article className={`legacy-plan${plan.id === "professional" ? " is-featured" : ""}`} key={plan.id}>
              <header>
                <span>{plan.kicker}</span>
                <h3>{plan.name}</h3>
                <strong>{plan.price}</strong>
                <p>{plan.blurb}</p>
              </header>
              <ul>
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              {plan.action === "care" ? (
                <a className="legacy-plan-cta" href={CARE_MAIL}>
                  {plan.cta}
                </a>
              ) : (
                <button className="legacy-plan-cta" type="button" onClick={() => requireAccount("signup")}>
                  {plan.cta}
                </button>
              )}
            </article>
          ))}
        </div>
        <p className="legacy-plans-care">
          Questions about a plan?{" "}
          <a href={CARE_MAIL}>Write care@pitar.ai</a>
        </p>
      </section>

      <footer className="legacy-footer" id="footer" aria-label="Pitar footer">
        <div className="legacy-footer-frame">
          <section className="legacy-footer-prompt" aria-labelledby="footer-prompt-title">
            <div className="legacy-visual-beams" aria-hidden="true">
              <i /><i /><i />
            </div>
            <div className="legacy-footer-prompt-content">
              <h3 id="footer-prompt-title">Ask what your records know.</h3>
              <p className="legacy-footer-prompt-copy">One question in. One clear answer out, with the exact page that proves it.</p>
              <form
                className="legacy-footer-prompt-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  requireAccount("signup")
                }}
              >
                <details className="legacy-footer-source-picker">
                  <summary
                    aria-label="Choose a source"
                    title="Choose a source"
                    onClick={(event) => {
                      event.preventDefault()
                      requireAccount("signup")
                    }}
                  >
                    <span aria-hidden="true">+</span>
                  </summary>
                  <div className="legacy-footer-source-menu" role="menu" aria-label="Available sources">
                    {connectors.map(({ label, icon }) => (
                      <button
                        className="legacy-footer-source-option"
                        type="button"
                        role="menuitem"
                        key={label}
                        onClick={() => requireAccount("signup")}
                      >
                        <img src={icon} alt="" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </details>
                <input
                  type="text"
                  aria-label="Ask Pitar a question"
                  placeholder="Ask a question about your records..."
                  onFocus={() => requireAccount("signup")}
                  onChange={() => requireAccount("signup")}
                />
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
              <a href="#plans" onClick={scrollToPlans}>Plans</a>
              <button type="button" onClick={() => setOpenPanel("connections")}>Sources</button>
              <button type="button" onClick={() => setOpenPanel("trust")}>Why trust us</button>
            </nav>

            <nav className="legacy-footer-column" aria-label="Company">
              <h2>Company</h2>
              <a href="#our-story">Our story</a>
              <a href="#top">Why Pitar</a>
              <button type="button" onClick={() => requireAccount("signin")}>Sign in</button>
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
