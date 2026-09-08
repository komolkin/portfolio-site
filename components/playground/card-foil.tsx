"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const GLITTER = "/playground/foil/glitter.png";
const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.48)";

export const FOIL_POINTER_STYLE = {
  "--pointer-x": "50%",
  "--pointer-y": "50%",
  "--from-left": 0.5,
  "--from-top": 0.5,
  "--from-center": 0,
  "--hov": 0,
} as CSSProperties;

export function applyFoilPointer(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  const fromCenter = Math.min(1, Math.hypot(x - 0.5, y - 0.5) / 0.5);
  el.style.setProperty("--pointer-x", `${(x * 100).toFixed(2)}%`);
  el.style.setProperty("--pointer-y", `${(y * 100).toFixed(2)}%`);
  el.style.setProperty("--from-left", x.toFixed(4));
  el.style.setProperty("--from-top", y.toFixed(4));
  el.style.setProperty("--from-center", fromCenter.toFixed(4));
  el.style.setProperty("--hov", "1");
}

export function clearFoilPointer(el: HTMLElement) {
  el.style.setProperty("--hov", "0");
}

type Sparkle = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  riseSpeed: number;
  drift: number;
  twinkleSpeed: number;
  phase: number;
  /** Seconds lived / total lifespan. */
  age: number;
  life: number;
};

const SPARKLE_COUNT = 42;

/**
 * Twinkling four-point star particles floating around the card.
 * Render as a sibling of the card inside a `relative` wrapper that is NOT
 * overflow-hidden; particles occupy a `pad`-wide ring outside the card bounds.
 */
export function MagicSparkles({ pad = 56 }: { pad?: number }) {
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

    let width = 0;
    let height = 0;
    let raf = 0;
    let lastTime = 0;
    let sparkles: Sparkle[] = [];

    const spawn = (randomAge = false): Sparkle => {
      // Position in the ring around the card: pick an edge, offset outward.
      const edge = Math.random();
      const out = 4 + Math.random() * (pad - 12);
      let x: number;
      let y: number;
      if (edge < 0.3) {
        x = pad + Math.random() * (width - pad * 2);
        y = pad - out; // above
      } else if (edge < 0.55) {
        x = pad + Math.random() * (width - pad * 2);
        y = height - pad + out; // below
      } else if (edge < 0.775) {
        x = pad - out; // left
        y = pad + Math.random() * (height - pad * 2);
      } else {
        x = width - pad + out; // right
        y = pad + Math.random() * (height - pad * 2);
      }
      const life = 2.4 + Math.random() * 3.2;
      return {
        x,
        y,
        size: 1.4 + Math.random() * 2.6,
        rotation: Math.random() < 0.4 ? Math.PI / 4 : 0,
        riseSpeed: 4 + Math.random() * 9,
        drift: (Math.random() - 0.5) * 7,
        twinkleSpeed: 2.2 + Math.random() * 3.4,
        phase: Math.random() * Math.PI * 2,
        age: randomAge ? Math.random() * life : 0,
        life,
      };
    };

    const traceStar = (x: number, y: number, s: number, rotation: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.closePath();
      ctx.restore();
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      const dt = lastTime === 0 ? 0.016 : Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < sparkles.length; i++) {
        const p = sparkles[i];
        p.age += dt;
        if (p.age >= p.life) {
          sparkles[i] = spawn();
          continue;
        }
        p.y -= p.riseSpeed * dt;
        p.x += p.drift * dt + Math.sin(time * 0.001 + p.phase) * 0.12;

        // Fade in/out across the lifespan, multiplied by a fast twinkle.
        const envelope = Math.sin((p.age / p.life) * Math.PI);
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 0.001 * p.twinkleSpeed * Math.PI + p.phase));
        const alpha = envelope * twinkle * 0.85;
        if (alpha <= 0.01) continue;

        const s = p.size * (0.7 + 0.3 * twinkle);
        // Soft halo, then the bright star core.
        traceStar(p.x, p.y, s * 2.4, p.rotation);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.16})`;
        ctx.fill();
        traceStar(p.x, p.y, s, p.rotation);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    sparkles = Array.from({ length: SPARKLE_COUNT }, () => spawn(true));

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [pad]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute"
      style={{ inset: -pad }}
    >
      <canvas ref={canvasRef} className="absolute left-0 top-0" />
    </div>
  );
}

export function GlassBorder({ radius }: { radius: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        borderRadius: radius,
        background: `linear-gradient(315deg, ${GLASS_BORDER_COLOR} 0%, rgba(255,255,255,0.08) 28%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.14) 78%, ${GLASS_BORDER_COLOR} 100%) border-box`,
        mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
        WebkitMaskComposite: "xor",
        border: "1.5px solid transparent",
      }}
    />
  );
}

/**
 * Cursor-reactive glitter holofoil.
 *
 * The confetti flake sheet is a single static mask. Only the shine moves:
 * a pointer-centered radial light paints through the flakes, so nearby
 * specks flare while the texture itself never translates.
 */
export function GlitterFoil() {
  const flakeLight = `
    radial-gradient(
      farthest-side circle at var(--pointer-x) var(--pointer-y),
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.55) 18%,
      rgba(255, 255, 255, 0.22) 42%,
      rgba(255, 255, 255, 0.1) 100%
    )
  `;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft anisotropic sheen — the brushed-foil shine under the flakes */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(
              calc(115deg + (var(--from-left) - 0.5) * 30deg),
              rgba(255, 255, 255, 0) 30%,
              rgba(255, 255, 255, 0.12) 46%,
              rgba(255, 255, 255, 0.2) 50%,
              rgba(255, 255, 255, 0.12) 54%,
              rgba(255, 255, 255, 0) 70%
            )
          `,
          backgroundSize: "260% 260%",
          backgroundPosition:
            "calc(50% + (var(--from-left) - 0.5) * 80%) calc(50% + (var(--from-top) - 0.5) * 80%)",
          mixBlendMode: "screen",
          opacity: "calc(0.3 + var(--hov) * 0.2)",
          transition: "opacity 200ms ease",
        }}
      />
      {/* Single static confetti foil — light moves, flakes stay put */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: flakeLight,
          WebkitMaskImage: `url(${GLITTER})`,
          maskImage: `url(${GLITTER})`,
          WebkitMaskSize: "170px 170px",
          maskSize: "170px 170px",
          WebkitMaskPosition: "50% 50%",
          maskPosition: "50% 50%",
          mixBlendMode: "screen",
          opacity: "calc(0.42 + var(--hov) * 0.4)",
          transition: "opacity 200ms ease",
        }}
      />
      {/* Faint ambient glare so the surface reads as glossy, not lit up */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(
            farthest-corner circle at var(--pointer-x) var(--pointer-y),
            rgba(255, 255, 255, 0.16) 0%,
            rgba(255, 255, 255, 0.05) 30%,
            rgba(0, 0, 0, 0) 60%
          )`,
          mixBlendMode: "overlay",
          opacity: "calc(var(--hov) * 0.5)",
          transition: "opacity 160ms ease",
        }}
      />
    </div>
  );
}
