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

type OrbitingCirclesGlobeDemoProps = {
  paused?: boolean
  dimRings?: boolean
}

export default function OrbitingCirclesGlobeDemo({ paused = false, dimRings = false }: OrbitingCirclesGlobeDemoProps) {
  return (
    <div
      className="relative mx-auto aspect-square h-full max-h-full w-auto max-w-full overflow-visible"
      data-paused={paused ? "true" : "false"}
    >
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
        [data-paused="true"] [style*="animation"],
        [data-paused="true"] .pitar-mark-bounce {
          animation-play-state: paused !important;
        }
        .orbit-hex {
          width: 28px;
          height: 31px;
          transform-style: preserve-3d;
        }
        .orbit-hex-depth {
          position: absolute;
          inset: 0;
          background: #101612;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          transform: translate3d(1px, 1.25px, -2px);
        }
        .orbit-hex-rim {
          display: none;
        }
        .orbit-hex-face {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          background: linear-gradient(152deg, #18241c 0%, #111814 52%, #0e120f 100%);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          transform: none;
        }
        .orbit-hex-face::before {
          content: "";
          position: absolute;
          inset: 0;
          clip-path: inherit;
          background: linear-gradient(158deg, rgba(134, 239, 172, 0.12) 0%, rgba(34, 197, 94, 0.04) 36%, transparent 58%);
          pointer-events: none;
        }
        .orbit-hex-face img {
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 h-[38%] w-[46%] -translate-x-1/2 -translate-y-[70%]">
        <div className="absolute inset-0 origin-center" style={{ transform: "scaleX(1.14)" }}>
          <ParticleSphereAnimation key="sphere-soft-green" />
        </div>
        <div
          className="absolute inset-0 grid place-items-center overflow-visible [perspective:120px]"
          style={{ transform: "translate(4px, -4%)" }}
        >
          <div
            className="pitar-mark-bounce overflow-visible w-[11.55%]"
            style={{
              animation: "pitar-mark-bounce 4.6s cubic-bezier(0.22, 0.61, 0.36, 1) infinite",
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            <img
              src={logo("pitar-mark.svg")}
              alt=""
              width={48}
              height={58}
              className="h-auto w-full origin-[50%_80%] opacity-95"
              style={{ transform: "rotateX(14deg) scaleX(1.113) scaleY(0.945)" }}
            />
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 z-10"
        style={dimRings ? { filter: "blur(5px)", opacity: 0.72 } : undefined}
      >
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
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full border border-border ${orbit.size}`}
          >
            {allIcons.map((iconData) => (
              <div
                key={`${orbit.size}-${iconData.alt}`}
                className="absolute top-0 left-1/2 -ml-4 flex h-1/2 origin-bottom flex-col items-center justify-start"
                style={
                  {
                    "--start-angle": `${iconData.angle}deg`,
                    animation: `${orbitAnim} ${orbit.duration}s linear infinite`,
                    animationPlayState: paused ? "paused" : "running",
                  } as CSSProperties
                }
              >
                <div
                  className="orbit-hex relative z-10 -mt-2.5"
                  style={
                    {
                      "--counter-offset": `${-iconData.angle}deg`,
                      animation: `${counterAnim} ${orbit.duration}s linear infinite`,
                      animationPlayState: paused ? "paused" : "running",
                    } as CSSProperties
                  }
                >
                  <span className="orbit-hex-depth" />
                  <span className="orbit-hex-rim" />
                  <span className="orbit-hex-face">
                    <img
                      src={iconData.src}
                      alt={iconData.alt}
                      width={16}
                      height={16}
                      className="size-3.5"
                    />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      })}
      </div>
    </div>
  )
}
