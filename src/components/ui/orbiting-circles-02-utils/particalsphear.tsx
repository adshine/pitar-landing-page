import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function ParticleSphereAnimation() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.display = "block"
    renderer.domElement.style.position = "absolute"
    renderer.domElement.style.inset = "0"
    renderer.domElement.style.margin = "auto"
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const span = 1.28
    const camera = new THREE.OrthographicCamera(-span, span, span, -span, 0.1, 20)
    camera.position.set(0, 0, 4)
    camera.lookAt(0, 0, 0)

    const count = 1800
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const theta = 2 * Math.PI * Math.random()
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 1
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(0, 0.78, 0.28),
      size: 0.028,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    const resize = () => {
      const side = Math.max(1, Math.floor(Math.min(host.clientWidth, host.clientHeight)))
      renderer.setSize(side, side, false)
      renderer.domElement.style.width = `${side}px`
      renderer.domElement.style.height = `${side}px`
      camera.left = -span
      camera.right = span
      camera.top = span
      camera.bottom = -span
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let frame = 0
    const tick = () => {
      points.rotation.y += 0.002
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className="relative size-full overflow-hidden rounded-full"
      style={{
        maskImage: "radial-gradient(circle at center, #000 66%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(circle at center, #000 66%, transparent 70%)",
      }}
    />
  )
}
