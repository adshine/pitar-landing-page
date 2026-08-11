import { useEffect, useRef } from "react"
import * as THREE from "three"

import { createPitarOrbModel } from "./createPitarOrbModel"

export function ReferenceOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const fixedTimeValue = new URLSearchParams(window.location.search).get("orbTime")
  const pixelMatch = new URLSearchParams(window.location.search).get("orbPixelMode") === "match"
  const fixedTime = fixedTimeValue === null ? null : Number.parseFloat(fixedTimeValue)
  const hasFixedTime = fixedTime !== null && Number.isFinite(fixedTime)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" })
    } catch {
      return
    }

    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    // Default to a high-density canvas for clean edges. Pixel-match mode is
    // available for deterministic source comparisons at the atlas's native 400px.
    renderer.setPixelRatio(pixelMatch ? 1 : Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const halfHeight = 1.22 / 0.97
    const camera = new THREE.OrthographicCamera(-halfHeight, halfHeight, halfHeight, -halfHeight, .1, 100)
    camera.position.set(0, 0, 5.4)
    const model = createPitarOrbModel()
    scene.add(model.root)

    let animationFrame = 0
    const startedAt = performance.now()
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false)
      const aspect = rect.width / Math.max(rect.height, 1)
      camera.left = -halfHeight * aspect
      camera.right = halfHeight * aspect
      camera.top = halfHeight
      camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const draw = (now: number) => {
      if (hasFixedTime) {
        model.tick(fixedTime)
      } else if (!reducedMotion) {
        const time = (now - startedAt) / 1000
        model.tick(time)
      }
      renderer.render(scene, camera)
      animationFrame = requestAnimationFrame(draw)
    }
    animationFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
      model.dispose()
      renderer.dispose()
    }
  }, [fixedTime, hasFixedTime, pixelMatch, reducedMotion])

  return (
    <div className="reference-scene" aria-live="off">
      <div className="reference-scene__meta"><span>18:43</span><span>LTE</span></div>
      <div className={`generated-orb is-ready ${pixelMatch ? "pixel-match" : ""}`}>
        <canvas ref={canvasRef} aria-label="Rotating three-dimensional black-glass Pitar orb" />
      </div>
      <div className="reference-scene__footer"><span>READY</span><span>PITAR / PROCESSING</span><span>78%</span></div>
    </div>
  )
}
