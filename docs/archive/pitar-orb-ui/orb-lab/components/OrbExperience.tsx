import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import * as THREE from "three";

import { createOrbScene } from "../webgl/createOrbScene";

export type OrbExperienceState = {
  /** 0 = full sphere, 1 = compact input-side pill. */
  morph: number;
  /** 0 = dormant, 1 = maximum spectral emission and motion. */
  energy: number;
  /** 0 = ambient, 1 = focused/answering state. */
  focus: number;
};

export type OrbExperienceProps = {
  state: OrbExperienceState;
  className?: string;
  ariaLabel?: string;
  paused?: boolean;
  /** Optional DOM content centered over the orb, intended for the Pitar mark. */
  mark?: ReactNode;
  onReady?: () => void;
};

const ROOT_STYLE: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
};

const CANVAS_STYLE: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
};

const MARK_STYLE: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "18%",
  maxWidth: 72,
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
  filter: "drop-shadow(0 0 18px rgb(255 255 255 / 0.34))",
  zIndex: 2,
};

const FALLBACK_STYLE: CSSProperties = {
  display: "none",
  position: "absolute",
  inset: "18%",
  borderRadius: "50%",
  background: "radial-gradient(circle at 38% 28%, #242a2b, #050606 48%, #000 72%)",
  boxShadow: "0 0 72px rgb(31 224 255 / 0.28), inset 0 0 42px rgb(255 255 255 / 0.2)",
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export function OrbExperience({
  state,
  className,
  ariaLabel = "Animated Pitar knowledge orb",
  paused = false,
  mark,
  onReady,
}: OrbExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<OrbExperienceState>({ morph: 0, energy: 0.7, focus: 0 });
  const pausedRef = useRef(paused);
  const readyRef = useRef(onReady);
  const scheduleRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    stateRef.current = {
      morph: clamp01(state.morph),
      energy: clamp01(state.energy),
      focus: clamp01(state.focus),
    };
    pausedRef.current = paused;
    readyRef.current = onReady;
  }, [onReady, paused, state.energy, state.focus, state.morph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        premultipliedAlpha: true,
      });
    } catch {
      canvas.style.display = "none";
      if (fallbackRef.current) fallbackRef.current.style.display = "block";
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const orbScene = createOrbScene(renderer);
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = reduceMotionQuery.matches;
    let pageVisible = document.visibilityState === "visible";
    let contextLost = false;
    let frame = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const draw = (now: number) => {
      frame = 0;
      if (contextLost || !pageVisible || pausedRef.current) return;

      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!reduceMotion) elapsed += delta;
      const current = stateRef.current;
      orbScene.render(elapsed, current.morph, current.energy, current.focus);

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const schedule = () => {
      if (frame || contextLost || !pageVisible || pausedRef.current) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    };
    scheduleRef.current = schedule;

    const handleVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (!pageVisible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        schedule();
      }
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      schedule();
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const handleContextRestored = () => {
      contextLost = false;
      renderer.resetState();
      schedule();
    };

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.max(1, Math.round(entry.contentRect.width));
      const height = Math.max(1, Math.round(entry.contentRect.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      orbScene.resize(width, height);
      if (reduceMotion) {
        const current = stateRef.current;
        orbScene.render(elapsed, current.morph, current.energy, current.focus);
      }
    });

    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", handleVisibility);
    reduceMotionQuery.addEventListener("change", handleMotionPreference);
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
    schedule();
    readyRef.current?.();

    return () => {
      scheduleRef.current = null;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reduceMotionQuery.removeEventListener("change", handleMotionPreference);
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
      orbScene.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  useEffect(() => {
    scheduleRef.current?.();
  }, [paused, state.morph, state.energy, state.focus]);

  return (
    <div className={className} style={ROOT_STYLE} role="img" aria-label={ariaLabel}>
      <canvas ref={canvasRef} style={CANVAS_STYLE} aria-hidden="true" />
      <div ref={fallbackRef} className="orb-experience__fallback" style={FALLBACK_STYLE} aria-hidden="true">
        <span className="orb-experience__fallback-ribbon orb-experience__fallback-ribbon--cyan" />
        <span className="orb-experience__fallback-ribbon orb-experience__fallback-ribbon--coral" />
        <span className="orb-experience__fallback-ribbon orb-experience__fallback-ribbon--gold" />
        <span className="orb-experience__fallback-glass" />
      </div>
      {mark ? (
        <div data-orb-mark-anchor="" style={MARK_STYLE} aria-hidden="true">
          {mark}
        </div>
      ) : null}
    </div>
  );
}
