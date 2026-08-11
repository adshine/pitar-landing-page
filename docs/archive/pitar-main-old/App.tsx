import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Camera, Cloud, EnvelopeSimple, Files, FolderOpen, SquaresFour } from "@phosphor-icons/react"

import { AsciiKnowledgeBackground } from "@/components/ascii-knowledge-background"

const questions = [
  "Which agreements reference the Kaduna warehouse?",
  "Which letters mention the house in Enugu?",
  "What changed between the 2016 and 2019 versions?",
]

function PitarMark() {
  return (
    <svg viewBox="0 0 104 212" fill="none" aria-hidden="true">
      <path d="M52 8C44 26 58 34 46 48C36 62 52 74 44 92C38 108 50 120 44 140C40 158 48 170 43 204C52 168 46 152 52 136C58 118 48 106 54 90C60 72 46 62 54 46C62 32 48 24 52 8Z" fill="currentColor" />
      <path d="M48 56C78 54 96 74 94 92C92 112 74 124 50 121C70 116 84 104 85 88C86 72 72 60 48 56Z" fill="currentColor" />
    </svg>
  )
}

export function App() {
  const [question, setQuestion] = useState("")
  const [placeholder, setPlaceholder] = useState(questions[0])
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    let questionIndex = 0
    let characterIndex = 0
    let direction: 1 | -1 = 1
    let pause = 0

    const timer = window.setInterval(() => {
      if (focused || question) return
      if (pause > 0) {
        pause -= 1
        return
      }

      const example = questions[questionIndex]
      characterIndex += direction
      setPlaceholder(example.slice(0, characterIndex))

      if (characterIndex >= example.length) {
        direction = -1
        pause = 28
      } else if (characterIndex <= 0) {
        direction = 1
        questionIndex = (questionIndex + 1) % questions.length
        pause = 5
      }
    }, 45)

    return () => window.clearInterval(timer)
  }, [focused, question])

  const submit = (event: FormEvent) => event.preventDefault()

  return (
    <main className="neon-page" id="top">
      <div className="neon-ascii">
        <div className="neon-ascii-side neon-ascii-left">
          <AsciiKnowledgeBackground direction={1} className="ascii-flow-left" />
        </div>
        <div className="neon-ascii-side neon-ascii-right">
          <AsciiKnowledgeBackground direction={-1} className="ascii-flow-right" />
        </div>
      </div>
      <div className="neon-wash" aria-hidden="true" />

      <a className="neon-notice" href="#ask">
        <span>Pitar private beta</span>
        <span>Connect your archive and get page-level answers</span>
        <span aria-hidden="true">→</span>
      </a>

      <header className="neon-header">
        <a className="neon-brand" href="#top" aria-label="Pitar home"><PitarMark /><span>Pitar</span></a>
        <nav className="neon-nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#sources">Sources</a>
          <a href="#proof">Provenance</a>
          <a href="#origin">Origin</a>
        </nav>
        <div className="neon-header-actions">
          <a href="#signin">Sign in</a>
          <a className="neon-open" href="#ask">Start asking</a>
        </div>
      </header>

      <section className="neon-hero" id="product">
        <div className="neon-copy">
        <p className="neon-kicker"><span>⌁</span> Evidence-native document intelligence</p>
        <h1>
          <span>Get answers you can trust</span>
          <span>from every file you own.</span>
        </h1>
        <p className="neon-lede">Search emails, contracts, scans, and cloud drives in one place. Get a concise answer, then open the exact page it came from.</p>

        <form className="neon-command" id="ask" onSubmit={submit}>
          <span className="neon-command-mark" aria-hidden="true">&gt;_</span>
          <input
            aria-label="Ask Pitar a question"
            value={question}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => setQuestion(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <button type="submit">Start asking <span>→</span></button>
        </form>

        <div className="neon-links">
          <a href="#ask">Connect a source</a>
          <a href="#proof">See how citations work <span>↗</span></a>
        </div>
        </div>

        <div className="neon-rail" id="hero-principles">
          <article>
            <span>01</span>
            <p><strong>Page-level citations.</strong> Every claim returns with its exact source.</p>
          </article>
          <article>
            <span>02</span>
            <p><strong>One connected archive.</strong> Search across mail, drives, PDFs, and scans.</p>
          </article>
          <article>
            <span>03</span>
            <p><strong>Private by default.</strong> Your records stay yours, from query to answer.</p>
          </article>
        </div>
      </section>

      <section className="source-marquee" id="sources" aria-label="Supported sources">
        <span className="source-marquee-label">Connect what you already use</span>
        <div className="source-marquee-window">
          <div className="source-marquee-track">
            <div className="source-marquee-group">
              <strong><EnvelopeSimple weight="thin" />Gmail</strong>
              <strong><Files weight="thin" />Google Drive</strong>
              <strong><FolderOpen weight="thin" />Direct upload</strong>
              <strong><Camera weight="thin" />Mobile capture</strong>
              <span><EnvelopeSimple weight="thin" />Outlook — soon</span>
              <span><Cloud weight="thin" />OneDrive — soon</span>
            </div>
            <div className="source-marquee-group" aria-hidden="true">
              <strong><EnvelopeSimple weight="thin" />Gmail</strong>
              <strong><Files weight="thin" />Google Drive</strong>
              <strong><FolderOpen weight="thin" />Direct upload</strong>
              <strong><Camera weight="thin" />Mobile capture</strong>
              <span><EnvelopeSimple weight="thin" />Outlook — soon</span>
              <span><Cloud weight="thin" />OneDrive — soon</span>
            </div>
          </div>
        </div>
      </section>

      <section className="pitar-section provenance-section" id="proof">
        <div className="section-index"><span>01</span><span>Provenance</span></div>
        <div className="provenance-copy">
          <p className="section-kicker">A rule, not a preference</p>
          <h2>No citation,<br />no answer.</h2>
          <p>Most systems cite where they can, and hope. Pitar treats an uncited claim as invalid. Every claim is stored with the page it came from—or rejected before it reaches you.</p>
          <a href="#citation-example">See the evidence chain <span>↓</span></a>
        </div>
        <div className="citation-terminal" id="citation-example">
          <div className="terminal-bar"><span>ANSWER / VERIFIED</span><span>2 SOURCES</span></div>
          <p className="terminal-question">What did the 1998 agreement say about termination?</p>
          <p className="terminal-answer">The agreement allowed termination for convenience on ninety days&apos; notice <mark>[1]</mark>, but only after the second renewal <mark>[2]</mark>.</p>
          <div className="terminal-source"><span>[1]</span><p>“either party may terminate for convenience upon ninety (90) days written notice”<small>Supply Agreement 1998.pdf · page 14 · Google Drive</small></p></div>
          <div className="terminal-source"><span>[2]</span><p>“the foregoing shall not apply prior to the Second Renewal Term”<small>Supply Agreement 1998.pdf · page 203 · Google Drive</small></p></div>
        </div>
      </section>

      <section className="pitar-section product-section">
        <div className="section-index"><span>02</span><span>What Pitar does</span></div>
        <div className="product-heading">
          <p className="section-kicker">One archive. Checkable answers.</p>
          <h2>Your records become useful without losing their source.</h2>
        </div>
        <div className="product-grid">
          <article><span>01</span><h3>A claim without a page is never stored</h3><p>Not a preference. A required field, enforced where your records live.</p><a href="#proof">How it is enforced →</a></article>
          <article><span>02</span><h3>It reads what you already have</h3><p>Gmail and Google Drive today. Upload a folder, or photograph a page.</p><a href="#sources">Every source →</a></article>
          <article><span>03</span><h3>One family&apos;s papers, or a company&apos;s</h3><p>Eleven boxes, or twenty years of contracts. The same evidence rule either way.</p><a href="#origin">The origin →</a></article>
        </div>
      </section>

      <section className="pitar-section sources-section">
        <div className="section-index"><span>03</span><span>Sources</span></div>
        <div className="sources-heading"><p className="section-kicker">Connect once. Keep current.</p><h2>Everything you hold,<br />in one place.</h2><p>Pitar reads text from mail, files, scans, and photographs while preserving where every page arrived from.</p></div>
        <div className="source-status-grid">
          <article><span className="status-live">Live</span><EnvelopeSimple className="source-card-icon" weight="thin" /><h3>Gmail</h3><p>Mail and attachments</p></article>
          <article><span className="status-live">Live</span><Files className="source-card-icon" weight="thin" /><h3>Google Drive</h3><p>Documents, sheets, PDFs</p></article>
          <article><span className="status-live">Direct</span><FolderOpen className="source-card-icon" weight="thin" /><h3>Folder upload</h3><p>Drag a complete archive in</p></article>
          <article><span className="status-live">Direct</span><Camera className="source-card-icon" weight="thin" /><h3>Mobile capture</h3><p>Photograph paper records</p></article>
          <article><span>Built</span><SquaresFour className="source-card-icon" weight="thin" /><h3>Microsoft</h3><p>Outlook, OneDrive, SharePoint</p></article>
          <article><span>Built</span><Cloud className="source-card-icon" weight="thin" /><h3>Cloud storage</h3><p>Dropbox and Box</p></article>
        </div>
        <div className="erp-row"><span>ERP systems are next</span><div>SAP · ORACLE · NetSuite · Dynamics 365 · Workday · Sage</div></div>
      </section>

      <section className="origin-section" id="origin">
        <div className="origin-number">04 / ORIGIN</div>
        <div className="origin-copy">
          <p className="section-kicker">Why this had to exist</p>
          <h2>It started with<br />one man&apos;s papers.</h2>
          <p>My father, Peter Chukwu Emeka Nwankwo, wrote constantly. Letters, sermons, ledgers kept in a hand I can still recognise across a room. When he died I had eleven boxes and no way to ask them anything.</p>
          <p>Search was never the problem. A hundred hits is not an answer. I wanted to be told what the record said, and shown exactly where, so I could go and read it myself.</p>
          <blockquote>If I could not check it,<br />I did not want it.</blockquote>
          <p>That turned out to be the general case. A finance team reconciling twenty years of contracts wants what a son wants: an answer, and the page it came from.</p>
          <p className="origin-name"><strong>Pitar</strong> is Sanskrit for father.</p>
        </div>
      </section>

      <section className="pitar-section plans-section" id="plans">
        <div className="section-index"><span>05</span><span>Plans</span></div>
        <div className="plans-heading"><p className="section-kicker">Pricing is taking shape</p><h2>Plans for every archive.</h2><p>No plan can be purchased today. We would rather say that clearly than manufacture urgency.</p></div>
        <div className="plans-grid">
          <article><span>Personal</span><h3>For a family archive</h3><p>A private place for letters, records, and the stories they hold.</p><ul><li>Organize a family archive</li><li>Ask across processed documents</li><li>Return to the exact source page</li></ul><button disabled>Not yet on sale</button></article>
          <article><span>Professional</span><h3>For practitioners</h3><p>Evidence-grounded research for legal and investigative work.</p><ul><li>Trace answers across case materials</li><li>Keep source context in view</li><li>Use a connected evidence graph</li></ul><button disabled>Not yet on sale</button></article>
          <article><span>Enterprise</span><h3>For organizations</h3><p>Institutional knowledge that remains connected to its evidence.</p><ul><li>Search internal documents</li><li>Preserve authoritative context</li><li>Prepare for team-scale work</li></ul><button disabled>Not yet on sale</button></article>
        </div>
      </section>

      <section className="final-cta">
        <p className="section-kicker">Your archive already holds the answer</p>
        <h2>Ask it.<br />Then check it.</h2>
        <a href="#ask">Start asking <span>→</span></a>
      </section>

      <footer className="pitar-footer">
        <a className="neon-brand" href="#top"><PitarMark /><span>Pitar</span></a>
        <div><a href="#proof">Provenance</a><a href="#sources">Sources</a><a href="#origin">Origin</a><a href="#plans">Plans</a></div>
        <span>Sanskrit: <em>pitar</em>, father.</span>
      </footer>
    </main>
  )
}

export default App
