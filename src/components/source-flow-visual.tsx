import { type PointerEvent, useCallback, useId } from "react"

import { cn } from "@/lib/utils"

type FlowSource = {
  label: string
  icon: string
  color: string
}

const clusterSources: FlowSource[] = [
  { label: "Gmail", icon: `${import.meta.env.BASE_URL}logos/gmail.svg`, color: "#EA4335" },
  { label: "Google Drive", icon: `${import.meta.env.BASE_URL}logos/googledrive.svg`, color: "#0F9D58" },
  { label: "Dropbox", icon: `${import.meta.env.BASE_URL}logos/dropbox.svg`, color: "#0061FF" },
  { label: "OneDrive", icon: `${import.meta.env.BASE_URL}logos/onedrive.svg`, color: "#0078D4" },
  { label: "Outlook", icon: `${import.meta.env.BASE_URL}logos/outlook.svg`, color: "#0078D4" },
  { label: "SharePoint", icon: `${import.meta.env.BASE_URL}logos/sharepoint.svg`, color: "#0078D4" },
]

const citedSources = clusterSources.slice(0, 3)

function setGlowPoint(event: PointerEvent<HTMLElement>) {
  const node = event.currentTarget
  const box = node.getBoundingClientRect()
  node.style.setProperty("--mx", `${event.clientX - box.left}px`)
  node.style.setProperty("--my", `${event.clientY - box.top}px`)
}

function HexCell({ source }: { source: FlowSource }) {
  const onMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    setGlowPoint(event)
  }, [])

  return (
    <button
      className="legacy-hex"
      type="button"
      aria-label={source.label}
      style={{ ["--hex-color" as string]: source.color }}
      onPointerMove={onMove}
    >
      <span className="legacy-hex-face" aria-hidden="true">
        <img src={source.icon} alt="" width="18" height="18" />
      </span>
      <span className="legacy-hex-tip" role="tooltip">
        {source.label}
      </span>
    </button>
  )
}

export function SourceFlowVisual() {
  const lineId = useId()

  return (
    <div className="legacy-flow" aria-label="Sources flowing into a cited answer">
      <div className="legacy-flow-cluster">
        {clusterSources.map((source) => (
          <HexCell key={source.label} source={source} />
        ))}
      </div>

      <svg className="legacy-flow-link" viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${lineId}-a`} x1="0" x2="1">
            <stop offset="0" stopColor="#d3ee67" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#d3ee67" stopOpacity="0.95" />
            <stop offset="1" stopColor="#d3ee67" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path className="legacy-flow-path" d="M2 12 C 34 12, 46 12, 118 12" />
        <path className={cn("legacy-flow-shimmer")} d="M2 12 C 34 12, 46 12, 118 12" stroke={`url(#${lineId}-a)`} />
      </svg>

      <div className="legacy-flow-mark" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}logos/pitar-mark.svg`} alt="" width="28" height="34" />
      </div>

      <svg className="legacy-flow-link" viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${lineId}-b`} x1="0" x2="1">
            <stop offset="0" stopColor="#d3ee67" stopOpacity="0.15" />
            <stop offset="0.55" stopColor="#f2f2f2" stopOpacity="0.9" />
            <stop offset="1" stopColor="#d3ee67" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path className="legacy-flow-path" d="M2 12 C 48 12, 72 12, 118 12" />
        <path className="legacy-flow-shimmer" d="M2 12 C 48 12, 72 12, 118 12" stroke={`url(#${lineId}-b)`} />
      </svg>

      <article className="legacy-flow-card">
        <div className="legacy-flow-stack" aria-label="Cited sources">
          {citedSources.map((source, index) => (
            <span
              className="legacy-flow-stack-item"
              key={source.label}
              style={{ zIndex: citedSources.length - index, ["--hex-color" as string]: source.color }}
            >
              <img src={source.icon} alt="" width="14" height="14" />
            </span>
          ))}
        </div>
        <p className="legacy-flow-q">Which agreements name the Kaduna warehouse?</p>
        <p className="legacy-flow-a">The 2016 lease and the 2019 addendum both name it, on page 4 and page 2.</p>
      </article>
    </div>
  )
}
