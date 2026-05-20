"use client";

import { useEffect, useRef } from "react";

type ParticleVariant = "green" | "red";

type Props = {
  variant: ParticleVariant;
};

const PARTICLE_COUNT = 36;
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

export default function Position3Particles({ variant }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const direction = variant === "green" ? -1 : 1;
    const color = COLORS[variant];

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;

    const createParticle = (spawnAnywhere = false): Particle => ({
      x: Math.random() * width,
      y: spawnAnywhere
        ? Math.random() * height
        : direction === -1
          ? height + Math.random() * 12
          : -Math.random() * 12,
      size: 0.6 + Math.random() * 1.8,
      opacity: 0.1 + Math.random() * 0.35,
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

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initParticles = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(true));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.y += particle.speedY * direction;
        particle.x += particle.drift + Math.sin(time * 0.0012 + particle.phase) * 0.04;

        if (direction === -1 && particle.y < -10) respawn(particle);
        if (direction === 1 && particle.y > height + 10) respawn(particle);
        if (particle.x < -10) particle.x = width + 6;
        if (particle.x > width + 10) particle.x = -6;

        const topFade = Math.min(1, particle.y / (height * 0.18));
        const bottomFade = Math.min(1, (height - particle.y) / (height * 0.18));
        const alpha = particle.opacity * Math.max(0, Math.min(topFade, bottomFade));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.18})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    initParticles();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      initParticles();
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
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]"
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
