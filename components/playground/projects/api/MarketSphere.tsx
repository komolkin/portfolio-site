"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

const MAX_TILES = 18;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const FALLBACKS = [
  "#3B6B8C",
  "#1F6B4A",
  "#8B3A3A",
  "#5C4A8A",
  "#8A6A2A",
  "#2A6A8A",
  "#6A3A6A",
  "#3A6A5A",
];

function sphereAngles(count: number) {
  const n = Math.max(count, 1);
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const phi = Math.acos(Math.min(1, Math.max(-1, y)));
    return {
      rotateY: GOLDEN * i,
      rotateX: phi - Math.PI / 2,
    };
  });
}

function isDisplayableImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/") || src.startsWith("data:")) return true;
  const normalized = src.startsWith("//") ? `https:${src}` : src;
  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function imageKey(src: string): string {
  try {
    if (src.startsWith("/")) return src;
    const url = new URL(src);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return src;
  }
}

function easeOutBack(t: number): number {
  const c = 1.70158;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}

export default function MarketSphere({ images }: { images: string[] }) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    rotY: 0.6,
    rotX: 0.32,
    velY: 0.0026,
    velX: 0,
  });

  const tiles = useMemo(() => {
    const seen = new Set<string>();
    const unique: Array<{ src: string; color: string }> = [];
    for (const src of images) {
      const normalized = src.startsWith("//") ? `https:${src}` : src;
      if (!isDisplayableImage(normalized)) continue;
      const key = imageKey(normalized);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({
        src: normalized,
        color: FALLBACKS[unique.length % FALLBACKS.length]!,
      });
      if (unique.length >= MAX_TILES) break;
    }
    return unique;
  }, [images]);

  const angles = useMemo(() => sphereAngles(tiles.length), [tiles.length]);

  useEffect(() => {
    const root = rootRef.current;
    const group = groupRef.current;
    if (!root || !group || tiles.length === 0) return;
    const drag = dragRef.current;
    let frame = 0;
    const born = performance.now();
    let radius = Math.min(root.clientWidth, root.clientHeight) * 0.56;
    let exploded = reduceMotion;

    const applySize = () => {
      radius = Math.min(root.clientWidth, root.clientHeight) * 0.56;
      const size = Math.max(48, Math.min(72, radius * 0.42));
      root.style.setProperty("--sphere-size", `${size}px`);
      if (exploded) {
        group.style.setProperty("--sphere-r", `${radius}px`);
      }
    };
    applySize();

    const resize = new ResizeObserver(applySize);
    resize.observe(root);

    const project = (now: number) => {
      if (document.hidden) {
        frame = 0;
        return;
      }
      const elapsed = (now - born) / 1000;

      if (!drag.active) {
        drag.rotY += drag.velY;
        drag.rotX += drag.velX;
        drag.velY += (0.0026 - drag.velY) * 0.04;
        drag.velX += (Math.sin(elapsed * 0.22) * 0.00022 - drag.velX) * 0.04;
        drag.rotX += (0.28 + Math.sin(elapsed * 0.26) * 0.16 - drag.rotX) * 0.02;
      }

      group.style.transform = `rotateX(${drag.rotX}rad) rotateY(${drag.rotY}rad)`;

      if (!exploded) {
        const t = easeOutBack(Math.min(1, elapsed / 1.15));
        group.style.setProperty("--sphere-r", `${radius * t}px`);
        if (elapsed >= 1.15) exploded = true;
      }

      frame = window.requestAnimationFrame(project);
    };

    frame = window.requestAnimationFrame(project);

    const onVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(project);
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onPointerDown = (e: PointerEvent) => {
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.velY = 0;
      drag.velX = 0;
      root.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.rotY += dx * 0.008;
      drag.rotX = Math.max(-0.9, Math.min(0.9, drag.rotX + dy * 0.006));
      drag.velY = dx * 0.00045;
      drag.velX = dy * 0.0002;
    };
    const onPointerUp = (e: PointerEvent) => {
      drag.active = false;
      if (root.hasPointerCapture(e.pointerId)) {
        root.releasePointerCapture(e.pointerId);
      }
    };

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
      resize.disconnect();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
    };
  }, [reduceMotion, tiles.length]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-visible touch-none select-none"
      aria-hidden
      style={{ perspective: "900px" }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(90,140,180,0.22) 0%, rgba(20,40,55,0.1) 42%, transparent 70%)",
        }}
      />
      <div
        ref={groupRef}
        className="absolute left-1/2 top-1/2 h-0 w-0"
        style={
          {
            transformStyle: "preserve-3d",
            willChange: "transform",
            "--sphere-r": reduceMotion ? "140px" : "0px",
          } as CSSProperties
        }
      >
        {tiles.map((tile, i) => {
          const angle = angles[i]!;
          return (
            <div
              key={tile.src}
              className="absolute overflow-hidden rounded-[8px] bg-white/10"
              style={{
                width: "var(--sphere-size, 56px)",
                height: "var(--sphere-size, 56px)",
                marginLeft: "calc(var(--sphere-size, 56px) / -2)",
                marginTop: "calc(var(--sphere-size, 56px) / -2)",
                backgroundColor: tile.color,
                transform: `rotateY(${angle.rotateY}rad) rotateX(${angle.rotateX}rad) translateZ(var(--sphere-r))`,
                backfaceVisibility: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.src}
                alt=""
                draggable={false}
                decoding="async"
                loading={i < 8 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const tileEl = e.currentTarget.parentElement;
                  if (tileEl) tileEl.style.visibility = "hidden";
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
