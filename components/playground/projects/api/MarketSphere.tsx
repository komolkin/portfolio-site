"use client";

import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";

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

function spherePoints(count: number) {
  const n = Math.max(count, 1);
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN * i;
    return {
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
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
  const nodesRef = useRef<Array<HTMLDivElement | null>>([]);
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
      if (unique.length >= 28) break;
    }
    return unique;
  }, [images]);

  const points = useMemo(() => spherePoints(tiles.length), [tiles.length]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || tiles.length === 0) return;
    const drag = dragRef.current;
    let frame = 0;
    const born = performance.now();
    let width = root.clientWidth;
    let height = root.clientHeight;
    const resize = new ResizeObserver(() => {
      width = root.clientWidth;
      height = root.clientHeight;
    });
    resize.observe(root);
    const count = tiles.length;

    const project = (now: number) => {
      const radius = Math.min(width, height) * 0.56;
      const size = Math.max(48, Math.min(72, radius * 0.42));
      const elapsed = (now - born) / 1000;

      if (!drag.active) {
        drag.rotY += drag.velY;
        drag.rotX += drag.velX;
        drag.velY += (0.0026 - drag.velY) * 0.04;
        drag.velX += (Math.sin(elapsed * 0.22) * 0.00022 - drag.velX) * 0.04;
        drag.rotX += (0.28 + Math.sin(elapsed * 0.26) * 0.16 - drag.rotX) * 0.02;
      }

      const cosY = Math.cos(drag.rotY);
      const sinY = Math.sin(drag.rotY);
      const cosX = Math.cos(drag.rotX);
      const sinX = Math.sin(drag.rotX);

      points.forEach((point, i) => {
        const node = nodesRef.current[i];
        if (!node) return;
        const delay = (i / Math.max(count, 1)) * 0.18;
        const local = reduceMotion
          ? 1
          : easeOutBack(Math.min(1, Math.max(0, (elapsed - delay) / 0.9)));
        const x1 = point.x * cosY - point.z * sinY;
        const z1 = point.x * sinY + point.z * cosY;
        const y2 = point.y * cosX - z1 * sinX;
        const z2 = point.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2;
        const scale =
          (0.58 + depth * 0.58) * (0.18 + 0.82 * Math.min(local, 1.08));
        const x = x1 * radius * local;
        const y = y2 * radius * local;
        node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
        node.style.opacity = String(0.28 + depth * 0.72);
        node.style.zIndex = String(Math.round(depth * 100));
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        node.style.marginLeft = `${-size / 2}px`;
        node.style.marginTop = `${-size / 2}px`;
      });

      frame = window.requestAnimationFrame(project);
    };

    frame = window.requestAnimationFrame(project);

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
      resize.disconnect();
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
    };
  }, [points, reduceMotion, tiles.length]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-visible touch-none select-none"
      aria-hidden
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(90,140,180,0.22) 0%, rgba(20,40,55,0.1) 42%, transparent 70%)",
        }}
      />
      {tiles.map((tile, i) => (
        <div
          key={tile.src}
          ref={(el) => {
            nodesRef.current[i] = el;
          }}
          className="absolute left-1/2 top-1/2 overflow-hidden rounded-[8px] bg-white/10"
          style={{
            width: 56,
            height: 56,
            marginLeft: -28,
            marginTop: -28,
            backgroundColor: tile.color,
            transform: "translate3d(0,0,0) scale(0.2)",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tile.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            onError={(e) => {
              const tileEl = e.currentTarget.parentElement;
              if (tileEl) tileEl.style.visibility = "hidden";
            }}
          />
        </div>
      ))}
    </div>
  );
}
