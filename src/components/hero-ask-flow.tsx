
import { useEffect, useRef } from "react"

const logo = (file: string) => `${import.meta.env.BASE_URL}logos/${file}`

type DemoBeat = {
  question: string
  answer: string
  source: string
  page: string
  logos: { src: string; label: string }[]
}

export const heroAskBeats: DemoBeat[] = [
  {
    question: "Which agreements reference the Kaduna warehouse?",
    answer: "The 2016 lease and the 2019 addendum both name the Kaduna warehouse.",
    source: "2019 addendum.pdf",
    page: "Page 2",
    logos: [
      { src: logo("gmail.svg"), label: "Gmail" },
      { src: logo("googledrive.svg"), label: "Google Drive" },
    ],
  },
  {
    question: "Which letters mention the house in Enugu?",
    answer: "Three letters from 2004 mention the Enugu house. The first is dated 12 March.",
    source: "Nwankwo correspondence",
    page: "Letter 04",
    logos: [
      { src: logo("outlook.svg"), label: "Outlook" },
      { src: logo("gmail.svg"), label: "Gmail" },
    ],
  },
  {
    question: "What changed between the 2016 and 2019 versions?",
    answer: "The 2019 version adds a termination clause that is not in the 2016 draft.",
    source: "Lease comparison",
    page: "Page 7",
    logos: [
      { src: logo("sharepoint.svg"), label: "SharePoint" },
      { src: logo("onedrive.svg"), label: "OneDrive" },
    ],
  },
]

type Phase =
  | "line"
  | "lift-input"
  | "clear-input"
  | "plus-aim"
  | "plus-click"
  | "pick"
  | "type"
  | "aim"
  | "send"
  | "lift-answer"
  | "hold"

const LINE_MS = 420
const CHAR_MS = 42
const AFTER_TYPE_MS = 520
const AIM_MS = 960
const SEND_MS = 560
const INPUT_RISE_MS = 380
const INPUT_OUT_MS = 480
const PLUS_AIM_MS = 820
const PLUS_CLICK_MS = 340
const PICK_MS = 520
const ANSWER_RISE_MS = 200
const HOLD_MS = 6800
const INPUT_START = 120
const ANSWER_LIFT = 64

const allSources = [
  { src: logo("gmail.svg"), label: "Gmail" },
  { src: logo("googledrive.svg"), label: "Google Drive" },
  { src: logo("dropbox.svg"), label: "Dropbox" },
  { src: logo("onedrive.svg"), label: "OneDrive" },
  { src: logo("outlook.svg"), label: "Outlook" },
  { src: logo("sharepoint.svg"), label: "SharePoint" },
  { src: logo("box.svg"), label: "Box" },
  { src: logo("folder.svg"), label: "Folder upload" },
  { src: logo("mobile.svg"), label: "Mobile capture" },
]

function picksForBeat(beatIndex: number) {
  const count = 2 + (beatIndex % 2)
  const start = (beatIndex * 3 + 1) % allSources.length
  const step = 2 + (beatIndex % 3)
  return Array.from({ length: count }, (_, index) => {
    const item = allSources[(start + index * step) % allSources.length]
    const slot = allSources.findIndex((source) => source.label === item.label)
    return { ...item, slot }
  })
}

export function heroAskDuration(beatIndex: number) {
  const beat = heroAskBeats[beatIndex] ?? heroAskBeats[0]
  const picks = picksForBeat(beatIndex)
  return (
    LINE_MS +
    INPUT_RISE_MS +
    PLUS_AIM_MS +
    PLUS_CLICK_MS +
    picks.length * PICK_MS +
    INPUT_OUT_MS +
    beat.question.length * CHAR_MS +
    AFTER_TYPE_MS +
    AIM_MS +
    SEND_MS +
    ANSWER_RISE_MS +
    HOLD_MS
  )
}

function snapshotForElapsed(beatIndex: number, elapsedMs: number) {
  const beat = heroAskBeats[beatIndex] ?? heroAskBeats[0]
  const picks = picksForBeat(beatIndex)
  const typeMs = beat.question.length * CHAR_MS
  const t = Math.max(0, elapsedMs)
  const pickWindow = picks.length * PICK_MS

  const liftInputStart = LINE_MS
  const plusAimStart = liftInputStart + INPUT_RISE_MS
  const plusClickStart = plusAimStart + PLUS_AIM_MS
  const pickStart = plusClickStart + PLUS_CLICK_MS
  const clearInputStart = pickStart + pickWindow
  const typeStart = clearInputStart + INPUT_OUT_MS
  const typeEnd = typeStart + typeMs
  const aimStart = typeEnd + AFTER_TYPE_MS
  const sendStart = aimStart + AIM_MS
  const liftAnswerStart = sendStart + SEND_MS
  const holdStart = liftAnswerStart + ANSWER_RISE_MS

  let phase: Phase = "hold"
  if (t < liftInputStart) phase = "line"
  else if (t < plusAimStart) phase = "lift-input"
  else if (t < plusClickStart) phase = "plus-aim"
  else if (t < pickStart) phase = "plus-click"
  else if (t < clearInputStart) phase = "pick"
  else if (t < typeStart) phase = "clear-input"
  else if (t < aimStart) phase = "type"
  else if (t < sendStart) phase = "aim"
  else if (t < liftAnswerStart) phase = "send"
  else if (t < holdStart) phase = "lift-answer"

  let lineT = 0
  let dockY = INPUT_START
  let answerY = ANSWER_LIFT

  if (t < liftInputStart) {
    lineT = 0
    dockY = INPUT_START
  } else if (t < plusAimStart) {
    const p = (t - liftInputStart) / INPUT_RISE_MS
    lineT = p
    dockY = INPUT_START * (1 - p)
  } else if (t < clearInputStart) {
    lineT = 1
    dockY = 0
  } else if (t < liftAnswerStart) {
    const p = Math.min(1, (t - clearInputStart) / INPUT_OUT_MS)
    lineT = t < typeStart ? 1 - p : 0
    dockY = 0
  } else {
    const p = Math.min(1, (t - liftAnswerStart) / ANSWER_RISE_MS)
    lineT = p
    dockY = 0
    answerY = -ANSWER_LIFT * (1 - p)
  }

  const typedCount = t < typeStart ? 0 : Math.min(beat.question.length, Math.floor((t - typeStart) / CHAR_MS))
  const selectedCount =
    t < pickStart ? 0 : Math.min(picks.length, Math.floor((t - pickStart) / PICK_MS) + 1)
  const hoverPick = phase === "pick" ? Math.min(picks.length - 1, Math.floor((t - pickStart) / PICK_MS)) : -1

  return {
    beat,
    picks,
    phase,
    typed: beat.question.slice(0, typedCount),
    lineT,
    lineMode: t >= liftAnswerStart ? "from-cloud" : "from-input",
    dockY,
    answerY,
    selectedCount,
    hoverPick,
    menuOpen: phase === "plus-click" || phase === "pick",
  }
}

type HeroAskFlowProps = {
  beatIndex: number
  elapsedMs: number
}

export function HeroAskFlow({ beatIndex, elapsedMs }: HeroAskFlowProps) {
  const { beat, picks, phase, typed, lineT, lineMode, dockY, answerY, selectedCount, hoverPick, menuOpen } =
    snapshotForElapsed(beatIndex, elapsedMs)
  const showAnswer = phase === "lift-answer" || phase === "hold"
  const sendActive = phase === "send" || showAnswer
  const mouseHot = phase === "plus-aim" || phase === "plus-click" || phase === "pick" || phase === "aim" || phase === "send"
  const mouseClass = [
    "legacy-ask-mouse",
    mouseHot ? "is-visible" : "",
    phase === "plus-aim" || phase === "plus-click" ? "is-plus" : "",
    phase === "plus-click" || phase === "send" ? "is-click" : "",
    phase === "pick" ? "is-picking" : "",
    phase === "aim" || phase === "send" ? "is-aiming" : "",
  ]
    .filter(Boolean)
    .join(" ")
  const selected = picks.slice(0, Math.max(selectedCount, showAnswer ? picks.length : 0))
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hot = menuRef.current?.querySelector<HTMLElement>(".is-hot")
    hot?.scrollIntoView({ block: "nearest" })
  }, [hoverPick, menuOpen])

  return (
    <div className="legacy-ask-flow" data-phase={phase} aria-hidden="true">
      {lineMode === "from-cloud" ? (
        <span className="legacy-ask-line is-to-answer" style={{ height: `${lineT * 28}%` }} />
      ) : null}
      <div className="legacy-ask-dock" style={{ transform: `translateY(${dockY}px)` }}>
        {lineMode === "from-input" ? (
          <span className="legacy-ask-line" style={{ height: `${lineT * 92}px` }} />
        ) : null}
        <div className="legacy-ask-input">
          <span className={`legacy-ask-add${menuOpen ? " is-open" : ""}`} aria-hidden="true">
            <i>+</i>
          </span>
          <span className="legacy-ask-typed">
            {typed}
            {phase === "type" ? <i className="legacy-ask-caret" /> : null}
          </span>
          <button className={`legacy-ask-send${sendActive ? " is-hit" : ""}`} type="button" tabIndex={-1}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.7 3.55a1 1 0 0 1 1.08-.12l16.7 7.65a1 1 0 0 1 0 1.82l-16.7 7.66a1 1 0 0 1-1.39-1.13L5.1 13H12a1 1 0 1 0 0-2H5.1L3.39 4.57a1 1 0 0 1 .31-1.02Z" fill="currentColor" />
            </svg>
          </button>
        </div>
        {menuOpen ? (
          <div className="legacy-ask-menu" ref={menuRef}>
            {allSources.map((source) => {
              const chosen = selected.some((item) => item.label === source.label)
              const hovering = hoverPick >= 0 && picks[hoverPick]?.label === source.label
              return (
                <span
                  key={source.label}
                  className={`legacy-ask-menu-item${chosen ? " is-on" : ""}${hovering ? " is-hot" : ""}`}
                >
                  <img src={source.src} alt="" width={16} height={16} />
                  <em>{source.label}</em>
                  {chosen ? (
                    <svg className="legacy-ask-check" viewBox="0 0 16 16" aria-hidden="true">
                      <path
                        d="M3.2 8.2 6.4 11.4 12.8 4.6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
              )
            })}
          </div>
        ) : null}
        <span
          className={mouseClass}
          style={
            phase === "pick" ? { top: "86px", left: "22px", right: "auto" } : undefined
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="ask-mouse-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor={mouseHot ? "#4ade80" : "#ffffff"} />
              </linearGradient>
              <linearGradient id="ask-mouse-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor={mouseHot ? "#86efac" : "#f2f2f2"} />
              </linearGradient>
            </defs>
            <circle cx="8" cy="8" r="7" fill="none" stroke="url(#ask-mouse-ring)" strokeWidth="1.25" opacity={mouseHot ? 0.95 : 0.55} />
            <path d="M8 3.2 13.4 14.4 8.9 12.6 6.4 17.6 4.8 16.8 7.2 12 3.2 10.4Z" fill="url(#ask-mouse-fill)" />
          </svg>
        </span>
      </div>

      {showAnswer && (
        <article className="legacy-ask-answer" style={{ transform: `translateY(${answerY}px)` }}>
          <p className="legacy-ask-answer-kicker">One sentence, sourced</p>
          <p className="legacy-ask-answer-body">{beat.answer}</p>
          <div className="legacy-ask-answer-rule">
            <span className="legacy-ask-answer-logos">
              {selected.map((item) => (
                <img key={item.label} src={item.src} alt="" title={item.label} width={18} height={18} />
              ))}
            </span>
          </div>
          <p className="legacy-ask-answer-cite">
            <span>{beat.source}</span>
            <span>{beat.page}</span>
          </p>
        </article>
      )}
    </div>
  )
}
