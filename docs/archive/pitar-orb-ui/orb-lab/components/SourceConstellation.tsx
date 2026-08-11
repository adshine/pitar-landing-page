import {
  Camera,
  Cloud,
  DropboxLogo,
  EnvelopeSimple,
  Files,
  FolderOpen,
} from "@phosphor-icons/react"
import type { CSSProperties } from "react"
import type { Icon } from "@phosphor-icons/react"

import type { OrbVisualState } from "../lib/choreography"

type Source = {
  id: string
  name: string
  status: "Live" | "Direct" | "Built"
  side: "left" | "right"
  icon: Icon
  tone: string
}

const sources: Source[] = [
  { id: "gmail", name: "Gmail", status: "Live", side: "left", icon: EnvelopeSimple, tone: "coral" },
  { id: "drive", name: "Google Drive", status: "Live", side: "left", icon: Files, tone: "gold" },
  { id: "dropbox", name: "Dropbox", status: "Built", side: "left", icon: DropboxLogo, tone: "blue" },
  { id: "onedrive", name: "OneDrive", status: "Built", side: "right", icon: Cloud, tone: "cyan" },
  { id: "folder", name: "Folder upload", status: "Direct", side: "right", icon: FolderOpen, tone: "gold" },
  { id: "mobile", name: "Mobile capture", status: "Direct", side: "right", icon: Camera, tone: "coral" },
]

type SourceConstellationProps = {
  visualState: OrbVisualState
}

export function SourceConstellation({ visualState }: SourceConstellationProps) {
  return (
    <div
      className="orb-lab__constellation"
      style={{ "--connection": visualState.connection, "--morph": visualState.morph } as CSSProperties}
      aria-label="Pitar source connections"
    >
      <svg className="orb-lab__bands" viewBox="0 0 900 520" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="band-cyan" x1="0" x2="1"><stop stopColor="#37d7ff" stopOpacity=".16" /><stop offset=".45" stopColor="#37d7ff" stopOpacity=".92" /><stop offset="1" stopColor="#ff6657" stopOpacity=".62" /></linearGradient>
          <linearGradient id="band-gold" x1="0" x2="1"><stop stopColor="#ffc75f" stopOpacity=".16" /><stop offset=".52" stopColor="#ffc75f" stopOpacity=".92" /><stop offset="1" stopColor="#ff5353" stopOpacity=".62" /></linearGradient>
          <linearGradient id="band-blue" x1="0" x2="1"><stop stopColor="#418cff" stopOpacity=".16" /><stop offset=".48" stopColor="#56bcff" stopOpacity=".88" /><stop offset="1" stopColor="#ff5353" stopOpacity=".58" /></linearGradient>
        </defs>
        <path className="band band--cyan" d="M125 94 C250 94 276 202 396 202 L435 202 L435 222 L396 222 C266 222 240 114 125 114 Z" />
        <path className="band band--gold" d="M125 244 C260 244 290 246 405 246 L438 246 L438 266 L405 266 C290 266 260 264 125 264 Z" />
        <path className="band band--blue" d="M125 394 C250 394 285 310 400 310 L438 310 L438 330 L400 330 C295 330 260 414 125 414 Z" />
        <path className="band band--cyan" d="M775 94 C650 94 624 202 504 202 L465 202 L465 222 L504 222 C634 222 660 114 775 114 Z" />
        <path className="band band--gold" d="M775 244 C640 244 610 246 495 246 L462 246 L462 266 L495 266 C610 266 640 264 775 264 Z" />
        <path className="band band--blue" d="M775 394 C650 394 615 310 500 310 L462 310 L462 330 L500 330 C605 330 640 414 775 414 Z" />
      </svg>

      {sources.map(({ icon: Icon, ...source }) => (
        <article className={`orb-lab__source orb-lab__source--${source.id}`} data-tone={source.tone} key={source.id}>
          <div className="orb-lab__source-icon"><Icon weight="duotone" /></div>
          <div><strong>{source.name}</strong><span>{source.status}</span></div>
        </article>
      ))}
    </div>
  )
}
