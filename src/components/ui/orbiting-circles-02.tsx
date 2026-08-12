"use client"

import type { CSSProperties } from "react"

import ParticleSphereAnimation from "@/components/ui/orbiting-circles-02-utils/particalsphear"

const logo = (file: string) => `${import.meta.env.BASE_URL}logos/${file}`

const orbits = [
  {
    size: "size-[62%]",
    duration: 18,
    icons: [
      { src: logo("gmail.svg"), alt: "Gmail", angle: -60 },
      { src: logo("googledrive.svg"), alt: "Google Drive", angle: 0 },
      { src: logo("dropbox.svg"), alt: "Dropbox", angle: 60 },
    ],
  },
  {
    size: "size-[80%]",
    duration: 24,
    icons: [
      { src: logo("outlook.svg"), alt: "Outlook", angle: 0 },
      { src: logo("onedrive.svg"), alt: "OneDrive", angle: -90 },
      { src: logo("mobile.svg"), alt: "Mobile capture", angle: 90 },
    ],
  },
  {
    size: "size-full",
    duration: 30,
    icons: [
      { src: logo("sharepoint.svg"), alt: "SharePoint", angle: -60 },
      { src: logo("box.svg"), alt: "Box", angle: 0 },
      { src: logo("folder.svg"), alt: "Folder upload", angle: 60 },
    ],
  },
]

export default function OrbitingCirclesGlobeDemo() {
  return (
    <div className="relative mx-auto aspect-square h-full max-h-full w-auto max-w-full overflow-visible">
      <style>{`
        @keyframes orbit-cw {
          from { transform: rotate(var(--start-angle)) }
          to   { transform: rotate(calc(var(--start-angle) + 360deg)) }
        }
        @keyframes orbit-ccw {
          from { transform: rotate(var(--start-angle)) }
          to   { transform: rotate(calc(var(--start-angle) - 360deg)) }
        }
        @keyframes counter-cw {
          from { transform: rotate(var(--counter-offset, 0deg)) }
          to   { transform: rotate(calc(var(--counter-offset, 0deg) - 360deg)) }
        }
        @keyframes counter-ccw {
          from { transform: rotate(var(--counter-offset, 0deg)) }
          to   { transform: rotate(calc(var(--counter-offset, 0deg) + 360deg)) }
        }
        @keyframes pitar-mark-bounce {
          0%, 66%, 100% { transform: translateY(0) scale(1, 1); }
          71% { transform: translateY(-4%) scale(0.98, 1.04); }
          75% { transform: translateY(-13%) scale(0.96, 1.08); }
          80% { transform: translateY(0) scale(1.06, 0.88); }
          84% { transform: translateY(-6%) scale(0.98, 1.03); }
          88% { transform: translateY(0) scale(1.03, 0.94); }
          92% { transform: translateY(0) scale(1, 1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pitar-mark-bounce { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 h-[38%] w-[46%] -translate-x-1/2 -translate-y-[78%]">
        <div className="absolute inset-0 origin-center" style={{ transform: "scaleX(1.14)" }}>
          <ParticleSphereAnimation key="sphere-green" />
        </div>
        <div
          className="absolute inset-0 grid place-items-center overflow-visible [perspective:120px]"
          style={{ transform: "translateY(-12%)" }}
        >
          <div
            className="pitar-mark-bounce overflow-visible w-[11%]"
            style={{ animation: "pitar-mark-bounce 4.6s cubic-bezier(0.22, 0.61, 0.36, 1) infinite" }}
          >
            <img
              src={logo("pitar-mark.svg")}
              alt=""
              width={48}
              height={58}
              className="h-auto w-full origin-[50%_80%] opacity-95"
              style={{ transform: "rotateX(14deg) scaleX(1.06) scaleY(0.9)" }}
            />
          </div>
        </div>
      </div>

      {orbits.map((orbit, index) => {
        const isCW = index % 2 === 0
        const orbitAnim = isCW ? "orbit-cw" : "orbit-ccw"
        const counterAnim = isCW ? "counter-cw" : "counter-ccw"

        const allIcons = [
          ...orbit.icons,
          ...orbit.icons.map((ic) => ({
            ...ic,
            angle: ic.angle + 180,
            alt: `${ic.alt}-mirror`,
          })),
        ]

        return (
          <div
            key={orbit.size}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border ${orbit.size}`}
          >
            {allIcons.map((iconData) => (
              <div
                key={`${orbit.size}-${iconData.alt}`}
                className="absolute top-0 left-1/2 -ml-4 flex h-1/2 origin-bottom flex-col items-center justify-start"
                style={
                  {
                    "--start-angle": `${iconData.angle}deg`,
                    animation: `${orbitAnim} ${orbit.duration}s linear infinite`,
                  } as CSSProperties
                }
              >
                <div
                  className="relative z-10 -mt-4 rounded-full border border-border bg-background p-1.5"
                  style={
                    {
                      "--counter-offset": `${-iconData.angle}deg`,
                      animation: `${counterAnim} ${orbit.duration}s linear infinite`,
                    } as CSSProperties
                  }
                >
                  <img
                    src={iconData.src}
                    alt={iconData.alt}
                    width={16}
                    height={16}
                    className="size-3.5"
                  />
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
