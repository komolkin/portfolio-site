"use client";

import { useEffect, useMemo, useRef } from "react";

const MAX_POOL = 24;
const ASPECTS = [3 / 4, 4 / 5, 1, 4 / 3] as const;

/**
 * Two viewport-tall copies, stacked. The layer is exactly 200% so a -50%
 * translate loops without a seam, and the bitmap stays under typical GPU
 * texture limits on a retina phone (a taller layer was being repainted).
 */
const LAYERS = [
  { count: 8, width: [16, 24], opacity: 0.4, duration: 44 },
  { count: 6, width: [24, 34], opacity: 0.66, duration: 30 },
  { count: 5, width: [34, 46], opacity: 0.92, duration: 20 },
] as const;

const LOGO_EVERY = 3;
const MAX_LOGOS = 16;
const THUMB_WIDTH = 280;

type Tile = {
  src: string;
  logo: boolean;
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

function buildLayers(pool: string[], logoPool: string[]): Tile[][] {
  const rand = mulberry32(0x5eed);
  const total = LAYERS.reduce((sum, layer) => sum + layer.count, 0);
  const scale = Math.min(1, (pool.length + logoPool.length) / total);
  let cursor = 0;
  let logoCursor = 0;
  let index = 0;
  return LAYERS.map((layer, depth) => {
    const tiles: Tile[] = [];
    const count = Math.max(1, Math.floor(layer.count * scale));
    for (let i = 0; i < count; i++) {
      const wantLogo = index++ % LOGO_EVERY === 1;
      const logo =
        (wantLogo && logoCursor < logoPool.length) || cursor >= pool.length;
      if (logo && logoCursor >= logoPool.length) break;
      const width =
        (layer.width[0] + rand() * (layer.width[1] - layer.width[0])) *
        (logo ? 0.75 : 1);
      const column = (i + depth) % 3;
      const centerX = ((column + 0.5) / 3) * 100 + (rand() - 0.5) * 22;
      const aspect = ASPECTS[Math.floor(rand() * ASPECTS.length)]!;
      tiles.push({
        src: logo ? logoPool[logoCursor++]! : pool[cursor++]!,
        logo,
        left: centerX - width / 2,
        top: (i / count) * 100 + rand() * (40 / count),
        width,
        aspect: logo ? 1 : aspect,
      });
    }
    return tiles;
  });
}

export default function MarketRiver({
  images,
  logos = [],
}: {
  images: string[];
  logos?: string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pool = useMemo(() => uniqueSources(images), [images]);
  const logoPool = useMemo(
    () => [...new Set(logos)].slice(0, MAX_LOGOS),
    [logos],
  );
  const layers = useMemo(
    () =>
      pool.length + logoPool.length > 0 ? buildLayers(pool, logoPool) : [],
    [pool, logoPool],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sync = () => {
      root.dataset.paused = document.hidden ? "true" : "false";
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  if (layers.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="market-river pointer-events-none absolute inset-0 overflow-hidden bg-black [contain:strict]"
      aria-hidden
    >
      {layers.map((tiles, depth) => (
        <div
          key={depth}
          className="market-river-layer absolute inset-x-0 top-0 h-[200%] [contain:strict]"
          style={{
            opacity: LAYERS[depth]!.opacity,
            animationName: "market-river-rise",
            animationDuration: `${LAYERS[depth]!.duration}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
          }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="absolute inset-x-0 h-1/2"
              style={{ top: `${copy * 50}%` }}
            >
              {tiles.map((tile, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${copy}-${index}`}
                  src={tile.src}
                  alt=""
                  draggable={false}
                  decoding="async"
                  fetchPriority="low"
                  className={`absolute ${
                    tile.logo ? "object-contain" : "rounded-[6px] object-cover"
                  }`}
                  style={{
                    left: `${tile.left}%`,
                    top: `${tile.top}%`,
                    width: `${tile.width}%`,
                    aspectRatio: tile.aspect,
                  }}
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                  }}
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
            "linear-gradient(to bottom, #000 0%, rgba(0,0,0,0.55) 10%, rgba(0,0,0,0.08) 28%, rgba(0,0,0,0.12) 46%, rgba(0,0,0,0.72) 68%, #000 84%)",
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
        .market-river[data-paused="true"] .market-river-layer {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
