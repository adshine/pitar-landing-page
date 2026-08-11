import { ArrowClockwise, ArrowUp, CheckCircle, FilePdf, Pause, Play } from "@phosphor-icons/react"
import type { FormEvent, RefObject } from "react"

import type { OrbVisualState } from "../lib/choreography"

type AnswerDockProps = {
  visualState: OrbVisualState
  value: string
  inputRef: RefObject<HTMLInputElement | null>
  automated: boolean
  paused: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onSubmit: (event: FormEvent) => void
  onPause: () => void
  onReplay: () => void
}

export function AnswerDock({
  visualState,
  value,
  inputRef,
  automated,
  paused,
  onChange,
  onFocus,
  onSubmit,
  onPause,
  onReplay,
}: AnswerDockProps) {
  const showAnswer = visualState.answer > 0
  const isThinking = visualState.phase === "think"

  return (
    <section className="orb-lab__dock" aria-label="Pitar answer demonstration">
      <div className="orb-lab__conversation">
        <form className="orb-lab__ask" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="orb-lab-question">Ask your archive</label>
          <input
            ref={inputRef}
            id="orb-lab-question"
            value={value}
            placeholder="Ask a question about your archive"
            autoComplete="off"
            onFocus={onFocus}
            onChange={(event) => onChange(event.target.value)}
          />
          <button type="submit" aria-label="Ask Pitar"><ArrowUp weight="bold" /></button>
        </form>

        <div className={`orb-lab__answer ${showAnswer ? "is-visible" : ""}`} aria-live="polite" aria-busy={isThinking}>
          {isThinking && <div className="orb-lab__thinking"><i /><i /><i /><span>Reading connected sources</span></div>}
          {showAnswer && (
            <>
              <p>The MSA with ACME Corp changed the renewal terms.</p>
              <article className="orb-lab__citation">
                <FilePdf weight="duotone" />
                <div><strong>Master Services Agreement (ACME Corp)</strong><span>Page 14 · Section 8.2 Renewal</span></div>
                <a href="#source-page">Open page <span aria-hidden="true">↗</span></a>
              </article>
              <small><CheckCircle weight="fill" /> Cited from <a href="#source-page">Drive › /Contracts/MSA_ACME.pdf#page=14</a></small>
            </>
          )}
        </div>
      </div>

      <div className="orb-lab__playback">
        <span>{automated ? "18 second product loop" : "Demo paused for your input"}</span>
        <button type="button" onClick={onPause} aria-label={paused ? "Resume demonstration" : "Pause demonstration"}>
          {paused ? <Play weight="fill" /> : <Pause weight="fill" />}
        </button>
        <button type="button" onClick={onReplay} aria-label="Replay demonstration"><ArrowClockwise /></button>
      </div>
    </section>
  )
}
