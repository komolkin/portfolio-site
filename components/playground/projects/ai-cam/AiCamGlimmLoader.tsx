"use client";

import { createShader, playSweep, resolvePalette } from "glimm";
import { useEffect, useRef } from "react";

type AiCamGlimmLoaderProps = {
  active: boolean;
  className?: string;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function AiCamGlimmLoader({ active, className = "absolute inset-0" }: AiCamGlimmLoaderProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<ReturnType<typeof createShader>>(null);
  const handleRef = useRef<ReturnType<typeof playSweep> | null>(null);
  const loopRef = useRef(false);

  useEffect(() => {
    if (!active || !hostRef.current || prefersReducedMotion()) return;

    loopRef.current = true;
    const host = hostRef.current;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      pointerEvents: "none",
    });
    host.appendChild(canvas);

    const ctrl = createShader({
      canvas,
      palette: resolvePalette("azure"),
      direction: "btt",
      brightness: 0.8,
      waveSpeed: 1.15,
      bandTight: 13,
    });

    if (!ctrl) {
      loopRef.current = false;
      canvas.remove();
      return;
    }

    ctrlRef.current = ctrl;

    const runSweep = () => {
      if (!loopRef.current || !ctrlRef.current) return;

      handleRef.current = playSweep(ctrlRef.current, {
        sweepMs: 1500,
        outroMs: 350,
        easing: "easeInOutCubic",
        peakAlpha: 0.9,
        onComplete: () => {
          if (loopRef.current) runSweep();
        },
      });
    };

    runSweep();

    return () => {
      loopRef.current = false;
      handleRef.current?.cancel();
      ctrlRef.current?.destroy();
      ctrlRef.current = null;
      canvas.remove();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={hostRef}
      className={`overflow-hidden bg-[#111] ${className}`}
      aria-hidden="true"
    />
  );
}
