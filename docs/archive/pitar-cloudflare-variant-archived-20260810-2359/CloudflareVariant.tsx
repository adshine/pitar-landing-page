import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  ArrowRight,
  Camera,
  Check,
  Cloud,
  EnvelopeSimple,
  Files,
  FolderOpen,
  List,
  LockKey,
  SquaresFour,
  X,
} from "@phosphor-icons/react"

import "./cloudflare-variant.css"

const sourceItems = [
  { name: "Gmail", detail: "Mail and attachments", icon: EnvelopeSimple, status: "Live" },
  { name: "Google Drive", detail: "Documents, sheets, PDFs", icon: Files, status: "Live" },
  { name: "Folder upload", detail: "Bring a complete archive", icon: FolderOpen, status: "Direct" },
  { name: "Mobile capture", detail: "Photograph paper records", icon: Camera, status: "Direct" },
  { name: "Microsoft", detail: "Outlook and OneDrive", icon: SquaresFour, status: "Built" },
  { name: "Cloud storage", detail: "Dropbox and Box", icon: Cloud, status: "Built" },
]

const plans = [
  { name: "Personal", audience: "for a family archive", summary: "A private place for letters, records, and the stories they hold.", items: ["Organize a family archive", "Ask across processed documents", "Return to the exact source page"] },
  { name: "Professional", audience: "for practitioners", summary: "Evidence-grounded research for legal and investigative work.", items: ["Trace answers across case materials", "Keep source context in view", "Use a connected evidence graph"] },
  { name: "Enterprise", audience: "for organizations", summary: "Institutional knowledge that remains connected to its evidence.", items: ["Search internal documents", "Preserve authoritative context", "Prepare for team-scale work"] },
]

function PitarMark() {
  return (
    <svg viewBox="0 0 104 212" fill="none" aria-hidden="true">
      <path d="M52 8C44 26 58 34 46 48C36 62 52 74 44 92C38 108 50 120 44 140C40 158 48 170 43 204C52 168 46 152 52 136C58 118 48 106 54 90C60 72 46 62 54 46C62 32 48 24 52 8Z" fill="currentColor" />
      <path d="M48 56C78 54 96 74 94 92C92 112 74 124 50 121C70 116 84 104 85 88C86 72 72 60 48 56Z" fill="currentColor" />
    </svg>
  )
}

export function CloudflareVariant() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [question, setQuestion] = useState("")
  const [activePlan, setActivePlan] = useState(0)

  useEffect(() => {
    const previousTitle = document.title
    document.title = "Pitar — Answers you can check"
    document.documentElement.dataset.variant = "cloudflare"
    return () => {
      document.title = previousTitle
      delete document.documentElement.dataset.variant
    }
  }, [])

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false)
    window.addEventListener("keydown", close)
    return () => window.removeEventListener("keydown", close)
  }, [])

  const submit = (event: FormEvent) => event.preventDefault()

  return (
    <main className="cf-page" id="top" data-experiment="homepage-layout" data-variant="cloudflare-inspired">
      <div className="cf-global-grid" aria-hidden="true" />
      <header className="cf-header">
        <a className="cf-brand" href="#top" aria-label="Pitar home"><PitarMark /><span>Pitar</span></a>
        <nav className="cf-nav" aria-label="Primary navigation">
          <a href="#product">Product <span>⌄</span></a>
          <a href="#sources">Sources <span>⌄</span></a>
          <a href="#provenance">Provenance <span>⌄</span></a>
          <a href="#plans">Plans</a>
        </nav>
        <div className="cf-actions"><a href="#origin">Our origin</a><a href="#ask">Open Pitar</a></div>
        <button className="cf-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="cf-mobile-nav" aria-label={menuOpen ? "Close navigation" : "Open navigation"}>{menuOpen ? <X /> : <List />}</button>
        {menuOpen && <nav className="cf-mobile-nav" id="cf-mobile-nav" aria-label="Mobile navigation"><a href="#product" onClick={() => setMenuOpen(false)}>Product</a><a href="#sources" onClick={() => setMenuOpen(false)}>Sources</a><a href="#provenance" onClick={() => setMenuOpen(false)}>Provenance</a><a href="#plans" onClick={() => setMenuOpen(false)}>Plans</a><a href="#ask" onClick={() => setMenuOpen(false)}>Open Pitar</a></nav>}
      </header>

      <section className="cf-hero" id="product">
        <div className="cf-pixel-field" aria-hidden="true" />
        <a className="cf-announcement" href="#provenance">Private beta · Connect your archive · See how Pitar cites <span>→</span></a>
        <div className="cf-hero-copy">
          <h1>Every answer your archive holds—checkable by default</h1>
          <p>One private place for your emails, contracts, scans, and cloud drives.<br />Ask a question, get a concise answer, then open the exact page it came from.</p>
          <a className="cf-primary-button" href="#ask">Open Pitar</a>
        </div>
      </section>

      <section className="cf-region" aria-labelledby="region-title">
        <div className="cf-region-map" aria-hidden="true"><span>PAGE</span><span>CLAIM</span><span>SOURCE</span><i /><i /><i /></div>
        <div className="cf-region-copy">
          <h2 id="region-title">Region: your archive</h2>
          <p>One connected knowledge layer for the records you already own—close to every claim, close to its evidence.</p>
        </div>
        <div className="cf-stat-grid">
          <article><strong>1:1</strong><span>Every accepted claim maps back to a source page.</span></article>
          <article><strong>6</strong><span>Source types ready to connect or import.</span></article>
          <article><strong>0</strong><span>Uncited claims allowed into a Pitar answer.</span></article>
        </div>
      </section>

      <section className="cf-trust" aria-labelledby="trust-title">
        <div className="cf-trust-title"><span>Pitar connects</span><h2 id="trust-title">Every record you trust</h2></div>
        <div className="cf-logo-rail" aria-label="Supported sources"><div className="cf-logo-track">{["Gmail", "Google Drive", "PDF", "Scanned pages", "Mobile capture", "Outlook", "OneDrive", "SharePoint", "Gmail", "Google Drive", "PDF", "Scanned pages"].map((item,index)=><span key={`${item}-${index}`}>{item}</span>)}</div></div>
        <figure className="cf-testimonial">
          <div className="cf-testimonial-art" aria-hidden="true"><PitarMark /><span>11</span><small>boxes</small></div>
          <blockquote>“A hundred search results is not an answer. I wanted to be told what the record said—and shown exactly where.”</blockquote>
          <figcaption>The question that became Pitar</figcaption>
        </figure>
        <p className="cf-thousands">One family archive. Then every archive.</p>
      </section>

      <section className="cf-proof" id="provenance">
        <div className="cf-section-heading"><span>Why choose Pitar</span><h2>Answers are useful.<br />Evidence makes them trustworthy.</h2></div>
        <div className="cf-proof-compare">
          <article className="cf-chaos"><p>Searching the old way</p><div className="cf-chaos-stack"><span>47 search results</span><span>Which version is final?</span><span>Source page missing</span><span>Attachment not indexed</span><span>STATUS: UNRESOLVED</span></div></article>
          <article className="cf-answer-card">
            <div><span>ANSWER / VERIFIED</span><span>2 SOURCES</span></div>
            <p className="cf-question">What did the 1998 agreement say about termination?</p>
            <p>The agreement allowed termination for convenience on ninety days&apos; notice <mark>[1]</mark>, but only after the second renewal <mark>[2]</mark>.</p>
            <small><b>[1]</b> Supply Agreement 1998.pdf · page 14</small>
            <small><b>[2]</b> Supply Agreement 1998.pdf · page 203</small>
          </article>
        </div>
      </section>

      <section className="cf-sources" id="sources">
        <div className="cf-section-heading cf-section-heading-dark"><span>Connect what you already use</span><h2>Everything you hold,<br />in one place.</h2><p>Pitar reads mail, files, scans, and photographs while preserving where every page arrived from.</p></div>
        <div className="cf-source-grid">{sourceItems.map(({ name, detail, icon: Icon, status }) => <article key={name}><span>{status}</span><Icon weight="thin" /><h3>{name}</h3><p>{detail}</p></article>)}</div>
        <div className="cf-workflow"><span>Gmail</span><i>→</i><span>Google Drive</span><i>→</i><strong>Pitar</strong><i>→</i><span>Answer</span><i>→</i><span>Exact page</span></div>
      </section>

      <section className="cf-origin" id="origin">
        <div className="cf-origin-number">04 / ORIGIN</div>
        <div className="cf-origin-copy"><h2>It started with<br />one man&apos;s papers.</h2><p>My father, Peter Chukwu Emeka Nwankwo, wrote constantly. When he died I had eleven boxes and no way to ask them anything.</p><blockquote>“If I could not check it,<br />I did not want it.”</blockquote><p>That turned out to be the general case. A finance team reconciling twenty years of contracts wants what a son wants: an answer, and the page it came from.</p><p><strong>Pitar</strong> is Sanskrit for father.</p></div>
      </section>

      <section className="cf-plans" id="plans">
        <div className="cf-section-heading"><span>Pricing is taking shape</span><h2>Plans for every archive.</h2><p>No plan can be purchased today. We would rather say that clearly than manufacture urgency.</p></div>
        <div className="cf-plan-tabs" role="tablist" aria-label="Archive plans">{plans.map((plan,index)=><button key={plan.name} role="tab" aria-selected={activePlan===index} onClick={()=>setActivePlan(index)}>{plan.name}</button>)}</div>
        <div className="cf-plan-stage">
          <div className="cf-plan-visual" aria-hidden="true"><div className="cf-plan-orbit"><span>Pitar</span><i /><i /><i /></div><p>{plans[activePlan].audience}</p></div>
          <article className="cf-featured-plan"><span>{plans[activePlan].name}</span><small>{plans[activePlan].audience}</small><h3>Coming soon</h3><p>{plans[activePlan].summary}</p><ul>{plans[activePlan].items.map((item)=><li key={item}><Check />{item}</li>)}</ul><button disabled>Not yet on sale</button></article>
        </div>
      </section>

      <section className="cf-ask" id="ask">
        <LockKey weight="thin" aria-hidden="true" />
        <h2>Ask without boundaries.<br />Check without doubt.</h2>
        <p>Your archive already holds the answer. Pitar gives you the answer and the page.</p>
        <form onSubmit={submit}><label htmlFor="cf-question">Ask Pitar a question</label><div><input id="cf-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Which agreements reference the Kaduna warehouse?" /><button type="submit">Ask Pitar <ArrowRight /></button></div></form>
        <div className="cf-benefit-marquee" aria-hidden="true"><div><span>Every claim keeps its page</span><i>◆</i><span>Private by default</span><i>◆</i><span>One connected archive</span><i>◆</i><span>Answers you can check</span><i>◆</i><span>Every claim keeps its page</span><i>◆</i><span>Private by default</span></div></div>
      </section>

      <footer className="cf-footer">
        <a className="cf-brand" href="#top"><PitarMark /><span>Pitar</span></a>
        <div><strong>Product</strong><a href="#provenance">Provenance</a><a href="#sources">Sources</a><a href="#plans">Plans</a></div>
        <div><strong>Company</strong><a href="#origin">Origin</a><a href="#ask">Private beta</a><a href="/">View original homepage</a></div>
        <div><strong>Sources</strong><a href="#sources">Gmail</a><a href="#sources">Google Drive</a><a href="#sources">Folder upload</a><a href="#sources">Mobile capture</a></div>
        <div><strong>Use cases</strong><a href="#product">Family archives</a><a href="#product">Professional research</a><a href="#product">Institutional knowledge</a></div>
        <div><strong>Evidence</strong><a href="#provenance">Page citations</a><a href="#provenance">Claim provenance</a><a href="#provenance">Private by default</a></div>
        <p>Private document intelligence with page-level provenance.<small>© 2026 Pitar · Sanskrit: <em>pitar</em>, father.</small></p>
      </footer>
    </main>
  )
}

export default CloudflareVariant
