"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** Up when the position is ahead of entry; down when underwater. */
  direction: "up" | "down";
};

const PARTICLE_COUNT = 36;
const COLOR = { r: 255, g: 255, b: 255 };

type Particle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  drift: number;
  phase: number;
};

export default function ExpandableParticles({ direction }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const dir = direction === "up" ? -1 : 1;
    const pointDown = dir === 1;

    const CORNER_RADIUS = 1;
    const tracePath = (cx: number, cy: number, radius: number) => {
      const apex = pointDown ? radius : -radius;
      const baseY = pointDown ? -radius / 2 : radius / 2;
      const halfBase = radius * (Math.sqrt(3) / 2);
      const v0x = cx;
      const v0y = cy + apex;
      const v1x = cx + halfBase;
      const v1y = cy + baseY;
      const v2x = cx - halfBase;
      const v2y = cy + baseY;
      const r = Math.min(CORNER_RADIUS, radius * 0.9);
      ctx.beginPath();
      ctx.moveTo((v0x + v1x) / 2, (v0y + v1y) / 2);
      ctx.arcTo(v1x, v1y, v2x, v2y, r);
      ctx.arcTo(v2x, v2y, v0x, v0y, r);
      ctx.arcTo(v0x, v0y, v1x, v1y, r);
      ctx.closePath();
    };

    let particles: Particle[] = [];
    let layoutWidth = 0;
    let layoutHeight = 0;
    let raf = 0;

    const createParticle = (spawnAnywhere = false): Particle => ({
      x: Math.random() * layoutWidth,
      y: spawnAnywhere
        ? Math.random() * layoutHeight
        : dir === -1
          ? layoutHeight + Math.random() * 12
          : -Math.random() * 12,
      size: 0.6 + Math.random() * 1.8,
      opacity: 0.08 + Math.random() * 0.22,
      speedY: 0.18 + Math.random() * 0.42,
      drift: (Math.random() - 0.5) * 0.12,
      phase: Math.random() * Math.PI * 2,
    });

    const respawn = (particle: Particle) => {
      const next = createParticle(false);
      particle.x = next.x;
      particle.y = next.y;
      particle.size = next.size;
      particle.opacity = next.opacity;
      particle.speedY = next.speedY;
      particle.drift = next.drift;
      particle.phase = next.phase;
    };

    const applyCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = layoutWidth * dpr;
      canvas.height = layoutHeight * dpr;
      canvas.style.width = `${layoutWidth}px`;
      canvas.style.height = `${layoutHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const growLayout = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;

      const nextWidth = Math.max(layoutWidth, rect.width);
      const nextHeight = Math.max(layoutHeight, rect.height);
      if (nextWidth === layoutWidth && nextHeight === layoutHeight) return false;

      layoutWidth = nextWidth;
      layoutHeight = nextHeight;
      applyCanvasSize();
      return true;
    };

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(true));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, layoutWidth, layoutHeight);

      const fadeSpan = layoutHeight * 0.18;

      for (const particle of particles) {
        particle.y += particle.speedY * dir;
        particle.x += particle.drift + Math.sin(time * 0.0012 + particle.phase) * 0.04;

        if (dir === -1 && particle.y < -10) respawn(particle);
        if (dir === 1 && particle.y > layoutHeight + 10) respawn(particle);
        if (particle.x < -10) particle.x = layoutWidth + 6;
        if (particle.x > layoutWidth + 10) particle.x = -6;

        const topFade = Math.min(1, particle.y / fadeSpan);
        const bottomFade = Math.min(1, (layoutHeight - particle.y) / fadeSpan);
        const alpha = particle.opacity * Math.max(0, Math.min(topFade, bottomFade));

        tracePath(particle.x, particle.y, particle.size * 2.6);
        ctx.fillStyle = `rgba(${COLOR.r}, ${COLOR.g}, ${COLOR.b}, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    growLayout();
    initParticles();

    const resizeObserver = new ResizeObserver(() => {
      if (growLayout() && particles.length > 0) {
        initParticles();
      }
    });
    resizeObserver.observe(container);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [direction]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
    </div>
  );
}
