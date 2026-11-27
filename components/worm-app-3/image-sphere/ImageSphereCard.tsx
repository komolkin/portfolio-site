// Image sphere (https://design.how/vault/image-sphere), card.tsx.
// FIXED. Change the VARIABLE values in params instead (SPHERE_PATHS, RADIUS, PLANE_SIZE, AUTO_ROT_Y, HOVER_SCALE, INERTIA_DECAY, FOCUS_FILL).
"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion, usePause } from "./runtime/use-pause";
import { ImageSphere } from "./engine";
import { SPHERE_IMAGES } from "./images";

export default function ImageSphereCard({
  className,
  distance = 460,
  fov = 28,
}: {
  className?: string;
  distance?: number;
  fov?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const engine = useRef<ImageSphere | null>(null);
  const running = usePause(box, (run) =>
    run ? engine.current?.start() : engine.current?.stop(),
  );

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    const raf = requestAnimationFrame(() => {
      const next = new ImageSphere(host, SPHERE_IMAGES, { distance, fov });
      engine.current = next;
      if (prefersReducedMotion()) next.renderStill();
      else if (running.current) next.start();
    });
    return () => {
      cancelAnimationFrame(raf);
      engine.current?.destroy();
      engine.current = null;
    };
  }, [running, distance, fov]);

  return (
    <div
      ref={box}
      role="img"
      aria-label="A slowly turning sphere of prediction market photos that can be dragged to spin."
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        userSelect: "none",
        backgroundColor: "transparent",
      }}
    />
  );
}
