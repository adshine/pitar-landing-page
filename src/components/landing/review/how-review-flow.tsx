import { useEffect, useState } from "react"
import { heroAskBeats } from "@/components/landing"

const CHAR_MS = 36
const LOAD_MS = 1200
const ANSWER_IN_MS = 380
const SOURCE_IN_MS = 420
const HIGHLIGHT_WORDS = ["the", "warehouse", "is", "located", "in", "Kaduna"]
const WORD_MS = 170

const beat = heroAskBeats[0]
const typeMs = beat.question.length * CHAR_MS
const loadStart = typeMs + 180
const answerStart = loadStart + LOAD_MS
const sourceStart = answerStart + ANSWER_IN_MS + 160
const highlightStart = sourceStart + SOURCE_IN_MS + 280
const endAt = highlightStart + HIGHLIGHT_WORDS.length * WORD_MS
const sourceLogo = beat.logos.find((item) => item.label === "Google Drive") ?? beat.logos[0]
let hasPlayed = false

export function HowReviewFlow() {
  const [elapsed, setElapsed] = useState(hasPlayed ? endAt : 0)

  useEffect(() => {
    if (hasPlayed) {
      setElapsed(endAt)
      return
    }
    hasPlayed = true
    let frame = 0
    let origin = 0
    const tick = (now: number) => {
      if (!origin) origin = now
      const next = now - origin
      if (next >= endAt) {
        hasPlayed = true
        setElapsed(endAt)
        return
      }
      setElapsed(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const typed = beat.question.slice(0, Math.min(beat.question.length, Math.floor(elapsed / CHAR_MS)))
  const typing = elapsed < typeMs
  const loading = elapsed >= loadStart && elapsed < answerStart
  const showAnswer = elapsed >= answerStart
  const showSource = elapsed >= sourceStart
  const litCount =
    elapsed < highlightStart ? 0 : Math.min(HIGHLIGHT_WORDS.length, Math.floor((elapsed - highlightStart) / WORD_MS) + 1)

  return (
    <div className="legacy-review-flow" aria-label="Question, answer, and source">
      <div className="legacy-review-block is-in">
        <span>Asked</span>
        <p>
          {typed}
          {typing ? <i className="legacy-review-caret" /> : null}
        </p>
      </div>

      {loading ? (
        <div className="legacy-review-load is-in" aria-hidden="true">
          <span>Answering</span>
          <b>
            <i />
            <i />
            <i />
          </b>
        </div>
      ) : null}

      <div className={`legacy-review-card${showAnswer ? " is-in" : ""}`}>
        <span>Answered</span>
        <p>{beat.answer}</p>
      </div>

      <div className={`legacy-review-source${showSource ? " is-in" : ""}`}>
        <div className="legacy-review-source-tag">
          <b className="legacy-review-source-logo">
            <img src={sourceLogo.src} alt="" width={16} height={16} />
          </b>
          <span>Source</span>
        </div>
        <blockquote>
          The parties agree that{" "}
          {HIGHLIGHT_WORDS.map((word, index) => (
            <mark key={word} className={index < litCount ? "is-on" : ""}>
              {word}
              {index < HIGHLIGHT_WORDS.length - 1 ? " " : ""}
            </mark>
          ))}
          .
          <small>{beat.source} · {beat.page}</small>
        </blockquote>
      </div>
    </div>
  )
}
