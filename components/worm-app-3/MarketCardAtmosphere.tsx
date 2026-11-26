"use client";

import { useEffect, useRef } from "react";

export type AtmosphereVariant = "green" | "red";

const PARTICLE_COUNT = 42;
const COLORS = {
  green: { r: 93, g: 217, b: 120 },
  red: { r: 255, g: 77, b: 94 },
} as const;

type Particle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedY: number;
  drift: number;
  phase: number;
};

/** Ember glow/edge (portfolio card effect) + drifting triangle particles. */
export function MarketCardAtmosphere({
  variant,
}: {
  variant: AtmosphereVariant;
  /** Kept for call-site compatibility; ember works on media + light cards. */
  tone?: "media" | "light";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const emberGlow =
    variant === "green"
      ? "live-preview-ember-glow-green"
      : "live-preview-ember-glow-red";
  const emberEdge =
    variant === "green"
      ? "live-preview-ember-edge-green"
      : "live-preview-ember-edge-red";

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

    const direction = variant === "green" ? -1 : 1;
    const color = COLORS[variant];
    const pointDown = direction === 1;

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
        : direction === -1
          ? layoutHeight + Math.random() * 12
          : -Math.random() * 12,
      size: 0.7 + Math.random() * 2.1,
      opacity: 0.12 + Math.random() * 0.38,
      speedY: 0.16 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.14,
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
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(true),
      );
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, layoutWidth, layoutHeight);
      const fadeSpan = layoutHeight * 0.18;

      for (const particle of particles) {
        particle.y += particle.speedY * direction;
        particle.x +=
          particle.drift + Math.sin(time * 0.0012 + particle.phase) * 0.04;

        if (direction === -1 && particle.y < -10) respawn(particle);
        if (direction === 1 && particle.y > layoutHeight + 10) respawn(particle);
        if (particle.x < -10) particle.x = layoutWidth + 6;
        if (particle.x > layoutWidth + 10) particle.x = -6;

        const topFade = Math.min(1, particle.y / fadeSpan);
        const bottomFade = Math.min(1, (layoutHeight - particle.y) / fadeSpan);
        const alpha =
          particle.opacity * Math.max(0, Math.min(topFade, bottomFade));

        tracePath(particle.x, particle.y, particle.size * 2.6);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.fill();

        tracePath(particle.x, particle.y, particle.size * 4.8);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.18})`;
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
  }, [variant]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[28px]"
      aria-hidden
    >
      <div className={`absolute -inset-[35%] ${emberGlow}`} />
      <div className={`absolute inset-0 rounded-[28px] ${emberEdge}`} />
      <canvas ref={canvasRef} className="absolute left-0 top-0" />
    </div>
  );
}
