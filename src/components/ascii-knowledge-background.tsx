import { useEffect, useRef } from "react"

const GLYPHS = ["·", "░", "▒", "▓", "█"]

function noise(value: number) {
  const raw = Math.sin(value * 127.1) * 43758.5453123
  return raw - Math.floor(raw)
}

function smoothNoise(value: number) {
  const start = Math.floor(value)
  const fraction = value - start
  const eased = fraction * fraction * (3 - 2 * fraction)
  return noise(start) * (1 - eased) + noise(start + 1) * eased
}

type AsciiKnowledgeBackgroundProps = {
  direction?: 1 | -1
  className?: string
}

export function AsciiKnowledgeBackground({ direction = 1, className = "" }: AsciiKnowledgeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let width = 0
    let height = 0
    let ratio = 1
    let animationFrame = 0
    let previousFrame = 0

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const render = (timestamp: number) => {
      if (!reducedMotion.matches && timestamp - previousFrame < 38) {
        animationFrame = requestAnimationFrame(render)
        return
      }
      previousFrame = timestamp
      const time = reducedMotion.matches ? 2.4 : timestamp / 1000
      const flowTime = time * direction
      const rootStyles = getComputedStyle(document.documentElement)
      const baseTone = rootStyles.getPropertyValue("--foreground").trim()

      context.clearRect(0, 0, width, height)

      const cellWidth = width < 600 ? 9 : 11
      const cellHeight = width < 600 ? 13 : 15
      const columns = Math.ceil(width / cellWidth) + 2
      const rows = Math.ceil(height / cellHeight) + 2
      const horizon = height * 0.7

      context.font = `600 ${cellWidth + 1}px "Oxanium Variable", monospace`
      context.textAlign = "center"
      context.textBaseline = "middle"

      for (let column = -1; column < columns; column++) {
        const x = column * cellWidth
        const normalizedX = x / Math.max(width, 1)
        const broadWave = Math.sin(normalizedX * 15 + flowTime * 0.72) * height * 0.065
        const crossWave = Math.sin(normalizedX * 31 - flowTime * 0.39) * height * 0.03
        const terrain = (smoothNoise(column * 0.17 + flowTime * 0.14) - 0.5) * height * 0.17
        const columnTop = horizon - broadWave - crossWave - terrain

        for (let row = 0; row < rows; row++) {
          const y = row * cellHeight
          const depth = (y - columnTop) / Math.max(height - columnTop, 1)
          const upperMist = Math.max(0, 1 - Math.abs(y - columnTop) / (height * 0.32))
          const flicker = smoothNoise(column * 1.9 + row * 0.31 - flowTime * 1.25)

          let intensity = 0
          if (depth >= 0) {
            intensity = Math.min(1, 0.2 + depth * 0.92 + (flicker - 0.5) * 0.22)
          } else if (flicker > 0.78) {
            intensity = upperMist * (flicker - 0.76) * 1.8
          }

          const edgeFade = Math.min(1, x / 90, (width - x) / 90)
          intensity *= Math.max(0, edgeFade)
          if (intensity < 0.075) continue

          const glyphIndex = Math.min(GLYPHS.length - 1, Math.floor(intensity * GLYPHS.length))
          context.fillStyle = baseTone
          context.globalAlpha = 0.035 + intensity * 0.52
          context.fillText(GLYPHS[glyphIndex], x, y)
        }
      }

      // A few detached particles keep the upper field alive without adding UI.
      context.fillStyle = baseTone
      for (let particle = 0; particle < Math.max(12, Math.floor(width / 70)); particle++) {
        const rawCycle = flowTime * (0.018 + noise(particle + 4) * 0.025) + noise(particle * 9.2)
        const cycle = ((rawCycle % 1) + 1) % 1
        const x = noise(particle * 3.7 + 11) * width
        const y = height * (0.82 - cycle * 0.9)
        const alpha = Math.sin(cycle * Math.PI) * (0.08 + noise(particle * 5) * 0.24)
        context.globalAlpha = alpha
        context.fillText(particle % 3 === 0 ? "▒" : "·", x, y)
      }

      context.globalAlpha = 1
      if (!reducedMotion.matches) animationFrame = requestAnimationFrame(render)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    animationFrame = requestAnimationFrame(render)

    const handleMotionPreference = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(render)
    }
    reducedMotion.addEventListener("change", handleMotionPreference)

    return () => {
      resizeObserver.disconnect()
      reducedMotion.removeEventListener("change", handleMotionPreference)
      cancelAnimationFrame(animationFrame)
    }
  }, [direction])

  return <canvas ref={canvasRef} className={`ascii-background ${className}`.trim()} aria-hidden="true" />
}
