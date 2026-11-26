"use client";

import { useEffect, useRef } from "react";

export type AtmosphereVariant = "green" | "red";

const PARTICLE_COUNT = 42;
const COLORS = {
  green: { r: 93, g: 217, b: 120 },
  red: { r: 255, g: 77, b: 94 },
} as const;

/** Translucent wash so the card video/image stays visible underneath. */
const GRADIENT = {
  green:
    "radial-gradient(120% 85% at 50% -10%, rgba(93,217,120,0.34) 0%, rgba(93,217,120,0.12) 40%, transparent 70%), linear-gradient(180deg, rgba(93,217,120,0.1) 0%, rgba(8,10,12,0.28) 100%)",
  red: "radial-gradient(120% 85% at 50% -10%, rgba(255,77,94,0.3) 0%, rgba(255,77,94,0.1) 40%, transparent 70%), linear-gradient(180deg, rgba(255,77,94,0.08) 0%, rgba(8,10,12,0.28) 100%)",
} as const;

const BOTTOM_GLOW = {
  green:
    "linear-gradient(0deg, rgba(93,217,120,0.22) 0%, rgba(93,217,120,0.08) 42%, transparent 100%)",
  red: "linear-gradient(0deg, rgba(255,77,94,0.2) 0%, rgba(255,77,94,0.07) 42%, transparent 100%)",
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

/** Controller-style green/red wash + drifting triangle particles. */
export function MarketCardAtmosphere({
  variant,
}: {
  variant: AtmosphereVariant;
}) {
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
      <div
        className="absolute inset-0 transition-[background] duration-500 ease-out"
        style={{ background: GRADIENT[variant] }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[46%] transition-[background] duration-500 ease-out"
        style={{ background: BOTTOM_GLOW[variant] }}
      />
      <canvas ref={canvasRef} className="absolute left-0 top-0" />
    </div>
  );
}
