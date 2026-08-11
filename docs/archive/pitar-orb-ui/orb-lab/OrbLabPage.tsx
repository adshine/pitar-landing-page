import { ArrowRight, Play } from "@phosphor-icons/react"

import { ReferenceOrb } from "./components/ReferenceOrb"
import "./orb-lab.css"

export function OrbLabPage() {
  return (
    <main className="orb-lab" id="orb-lab-top">
      <nav className="orb-lab__nav" aria-label="Primary navigation">
        <a className="orb-lab__brand" href="#orb-lab-top">Pitar</a>
        <div className="orb-lab__nav-links">
          <a href="#product">Product</a>
          <a href="#sources">Sources</a>
          <a href="#signin">Sign in</a>
        </div>
      </nav>

      <section className="orb-lab__body" aria-labelledby="orb-lab-title">
        <div className="orb-lab__left">
          <div className="orb-lab__copy">
            <h1 id="orb-lab-title">Get answers you can trust from every file you own.</h1>
            <p>Search emails, contracts, scans, and cloud drives in one place. Get a concise answer, then open the exact page it came from.</p>
            <div className="orb-lab__actions">
              <a className="orb-lab__button orb-lab__button--primary" href="#open">Open Pitar <ArrowRight /></a>
              <a className="orb-lab__button" href="#demo">See how it works <Play weight="fill" /></a>
            </div>
          </div>
        </div>

        <aside className="orb-lab__visual" id="demo" aria-label="Animated Pitar processing demonstration">
          <ReferenceOrb />
        </aside>
      </section>
    </main>
  )
}
