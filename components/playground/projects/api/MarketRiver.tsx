"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

const MAX_POOL = 48;
const SWAP_MS = 1400;
const FADE_MS = 600;
const ASPECTS = [3 / 4, 4 / 5, 1, 4 / 3, 3 / 2] as const;

/** Farther layers are smaller, dimmer and slower — the parallax reads as depth. */
const LAYERS = [
  { count: 10, width: [16, 24], opacity: 0.38, duration: 60 },
  { count: 8, width: [24, 34], opacity: 0.62, duration: 40 },
  { count: 6, width: [34, 46], opacity: 0.9, duration: 26 },
] as const;

type Tile = {
  src: string;
  left: number;
  top: number;
  width: number;
  aspect: number;
};

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

const THUMB_WIDTH = 500;

/** Tiles are ~170px wide at most; request Wikimedia thumbnails instead of 960px+ originals. */
function thumbnailSrc(src: string): string {
  const resized = src.replace(/\/(\d{3,4})px-([^/]+)$/, (match, width, file) =>
    Number(width) > THUMB_WIDTH ? `/${THUMB_WIDTH}px-${file}` : match,
  );
  if (resized !== src) return resized;
  const original = src.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+\.(?:jpe?g|png))$/i,
  );
  if (!original) return src;
  const [, base, a, ab, file] = original;
  return `${base}/thumb/${a}/${ab}/${file}/${THUMB_WIDTH}px-${file}`;
}

function preload(src: string): Promise<void> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img.decode().catch(() => {
    throw new Error("preload failed");
  });
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
    unique.push(thumbnailSrc(normalized));
    if (unique.length >= MAX_POOL) break;
  }
  return unique;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLayers(pool: string[]): Tile[][] {
  const rand = mulberry32(0x5eed);
  const total = LAYERS.reduce((sum, layer) => sum + layer.count, 0);
  // Never show the same image twice: shrink every layer when the pool is small.
  const scale = Math.min(1, pool.length / total);
  let cursor = 0;
  return LAYERS.map((layer, depth) => {
    const tiles: Tile[] = [];
    const count = Math.max(1, Math.floor(layer.count * scale));
    for (let i = 0; i < count && cursor < pool.length; i++) {
      const width =
        layer.width[0] + rand() * (layer.width[1] - layer.width[0]);
      // Alternate columns so each layer spreads across the screen.
      const column = (i + depth) % 3;
      const centerX = ((column + 0.5) / 3) * 100 + (rand() - 0.5) * 24;
      tiles.push({
        src: pool[cursor++]!,
        left: centerX - width / 2,
        top: (i / count) * 100 + rand() * (60 / count),
        width,
        aspect: ASPECTS[Math.floor(rand() * ASPECTS.length)]!,
      });
    }
    return tiles;
  });
}

const TileImage = memo(function TileImage({
  tile,
  src,
}: {
  tile: Tile;
  src: string;
}) {
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
    <div
      className="absolute overflow-hidden rounded-[6px] bg-white/[0.06]"
      style={{
        left: `${tile.left}%`,
        top: `${tile.top}%`,
        width: `${tile.width}%`,
        aspectRatio: tile.aspect,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt=""
        draggable={false}
        decoding="async"
        className="h-full w-full object-cover transition-[opacity,transform] ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(1.08)",
          transitionDuration: `${FADE_MS}ms`,
        }}
        onError={(e) => {
          const cell = e.currentTarget.parentElement;
          if (cell) cell.style.visibility = "hidden";
        }}
      />
    </div>
  );
});

export default function MarketRiver({ images }: { images: string[] }) {
  const pool = useMemo(() => uniqueSources(images), [images]);
  const layers = useMemo(
    () => (pool.length > 0 ? buildLayers(pool) : []),
    [pool],
  );
  const [srcs, setSrcs] = useState<string[]>([]);
  const srcsRef = useRef<string[]>([]);

  useEffect(() => {
    setSrcs(layers.flat().map((tile) => tile.src));
  }, [layers]);

  useEffect(() => {
    srcsRef.current = srcs;
  }, [srcs]);

  useEffect(() => {
    if (pool.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const id = window.setInterval(() => {
      const current = srcsRef.current;
      if (document.hidden || current.length === 0) return;
      const used = new Set(current);
      const unused = pool.filter((src) => !used.has(src));
      if (unused.length === 0) return;
      const index = Math.floor(Math.random() * current.length);
      const incoming = unused[Math.floor(Math.random() * unused.length)]!;
      // Swap only once decoded so the fade never reveals an empty tile.
      preload(incoming)
        .then(() => {
          if (cancelled) return;
          setSrcs((prev) => {
            if (prev.includes(incoming) || index >= prev.length) return prev;
            const next = [...prev];
            next[index] = incoming;
            return next;
          });
        })
        .catch(() => {});
    }, SWAP_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pool]);

  if (layers.length === 0) return null;
  let flatIndex = 0;
  const offsets = layers.map((tiles) => {
    const start = flatIndex;
    flatIndex += tiles.length;
    return start;
  });

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black [contain:strict]"
      aria-hidden
    >
      {layers.map((tiles, depth) => (
        <div
          key={depth}
          className="market-river-layer absolute inset-x-0 top-0 will-change-transform [backface-visibility:hidden]"
          style={{
            height: "280%",
            opacity: LAYERS[depth]!.opacity,
            animationName: "market-river-rise",
            animationDuration: `${LAYERS[depth]!.duration}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        >
          {/* Two identical copies so the upward loop is seamless. */}
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="absolute inset-x-0 h-1/2"
              style={{ top: `${copy * 50}%` }}
            >
              {tiles.map((tile, i) => (
                <TileImage
                  key={i}
                  tile={tile}
                  src={srcs[offsets[depth]! + i] ?? tile.src}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.6) 9%, rgba(0,0,0,0.1) 26%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0.75) 66%, #000 84%)",
        }}
      />
      <style>{`
        @keyframes market-river-rise {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(0, -50%, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .market-river-layer { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
