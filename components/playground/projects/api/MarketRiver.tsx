"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const MAX_POOL = 48;
const VISIBLE = 30;
const SWAP_MS = 2200;
const FADE_MS = 480;

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

function uniqueSources(images: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const src of images) {
    const normalized = src.startsWith("//") ? `https:${src}` : src;
    if (!isDisplayableImage(normalized)) continue;
    const key = imageKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(normalized);
    if (unique.length >= MAX_POOL) break;
  }
  return unique;
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function FadingTile({ src, eager }: { src: string; eager?: boolean }) {
  const [current, setCurrent] = useState(src);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (src === current) return;
    setVisible(false);
    const swap = window.setTimeout(() => {
      setCurrent(src);
      requestAnimationFrame(() => setVisible(true));
    }, FADE_MS);
    return () => window.clearTimeout(swap);
  }, [src, current]);

  return (
    <div className="aspect-square overflow-hidden rounded-[10px] bg-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        draggable={false}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        className="h-full w-full object-cover transition-opacity ease-in-out"
        style={{
          opacity: visible ? 1 : 0,
          transitionDuration: `${FADE_MS}ms`,
        }}
        onError={(e) => {
          const cell = e.currentTarget.parentElement;
          if (cell) cell.style.visibility = "hidden";
        }}
      />
    </div>
  );
}

export default function MarketRiver({ images }: { images: string[] }) {
  const reduceMotion = useReducedMotion();
  const pool = useMemo(() => uniqueSources(images), [images]);
  const paused = reduceMotion !== false;
  const [slots, setSlots] = useState<string[]>([]);
  const lastIndex = useRef(-1);
  const columns = 6;

  useEffect(() => {
    setSlots((prev) => {
      if (pool.length === 0) return [];
      if (prev.length === 0) return pool.slice(0, Math.min(VISIBLE, pool.length));
      const kept = prev.filter((src) => pool.includes(src));
      const next = [...kept];
      for (const src of pool) {
        if (next.length >= VISIBLE) break;
        if (!next.includes(src)) next.push(src);
      }
      return next.slice(0, Math.min(VISIBLE, pool.length));
    });
  }, [pool]);

  useEffect(() => {
    if (paused || slots.length < 2) return;

    const tick = () => {
      if (document.hidden) return;
      setSlots((prev) => {
        if (prev.length === 0) return prev;
        let index = Math.floor(Math.random() * prev.length);
        if (prev.length > 1 && index === lastIndex.current) {
          index = (index + 1) % prev.length;
        }
        lastIndex.current = index;
        const used = new Set(prev);
        used.delete(prev[index]!);
        const unused = pool.filter((src) => !used.has(src) && src !== prev[index]);
        const next = [...prev];
        const replacement = pickRandom(unused);
        if (replacement) {
          next[index] = replacement;
          return next;
        }
        let other = Math.floor(Math.random() * prev.length);
        if (other === index) other = (other + 1) % prev.length;
        const hold = next[index]!;
        next[index] = next[other]!;
        next[other] = hold;
        return next;
      });
    };

    const id = window.setInterval(tick, SWAP_MS);
    return () => window.clearInterval(id);
  }, [paused, pool, slots.length]);

  if (slots.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="market-river-grid absolute left-1/2 top-1/2 w-[155%] will-change-transform"
        style={{
          transform: "translate3d(-50%, -50%, 0) rotate(-10deg)",
          animationName: paused ? "none" : "market-grid-drift",
          animationDuration: "28s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        }}
      >
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {slots.map((src, i) => (
            <FadingTile key={i} src={src} eager={i < 8} />
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 28%, rgba(0,0,0,0.28) 62%, rgba(0,0,0,0.88) 100%)",
        }}
      />
      <style>{`
        @keyframes market-grid-drift {
          from {
            transform: translate3d(-54%, -52%, 0) rotate(-12deg) scale(1.02);
          }
          to {
            transform: translate3d(-46%, -48%, 0) rotate(-8deg) scale(1.12);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .market-river-grid {
            animation: none !important;
            transform: translate3d(-50%, -50%, 0) rotate(-10deg);
          }
        }
      `}</style>
    </div>
  );
}
