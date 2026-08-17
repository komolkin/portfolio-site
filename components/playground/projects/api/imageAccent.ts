"use client";

import { useEffect, useState } from "react";

export const CARD_ACCENT_FALLBACK = "#1c1c1e";
const accentCache = new Map<string, string>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = hex.replace("#", "");
  const r = Number.parseInt(n.slice(0, 2), 16);
  const g = Number.parseInt(n.slice(2, 4), 16);
  const b = Number.parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return [hue, saturation, lightness];
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (h < 60) [red, green, blue] = [c, x, 0];
  else if (h < 120) [red, green, blue] = [x, c, 0];
  else if (h < 180) [red, green, blue] = [0, c, x];
  else if (h < 240) [red, green, blue] = [0, x, c];
  else if (h < 300) [red, green, blue] = [x, 0, c];
  else [red, green, blue] = [c, 0, x];
  return [(red + m) * 255, (green + m) * 255, (blue + m) * 255];
}

function toCardAccent(r: number, g: number, b: number): string {
  const [h, s] = rgbToHsl(r, g, b);
  const nextS = clamp(s * 1.12, 0.28, 0.56);
  const nextL = 0.16;
  return rgbToHex(...hslToRgb(h, nextS, nextL));
}

function accentFromImage(image: HTMLImageElement): string {
  const size = 40;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return CARD_ACCENT_FALLBACK;
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<
    number,
    { r: number; g: number; b: number; n: number; weight: number }
  >();
  let fallbackR = 0;
  let fallbackG = 0;
  let fallbackB = 0;
  let fallbackN = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;
    if (a < 140) continue;

    fallbackR += r;
    fallbackG += g;
    fallbackB += b;
    fallbackN += 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    if (lum < 22 || lum > 235) continue;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.12) continue;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const current = buckets.get(key);
    const weight = 1 + sat * 2;
    if (current) {
      current.r += r;
      current.g += g;
      current.b += b;
      current.n += 1;
      current.weight += weight;
    } else {
      buckets.set(key, { r, g, b, n: 1, weight });
    }
  }

  let best: { r: number; g: number; b: number; n: number; weight: number } | null =
    null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }

  if (best) {
    return toCardAccent(best.r / best.n, best.g / best.n, best.b / best.n);
  }
  if (fallbackN > 0) {
    return toCardAccent(
      fallbackR / fallbackN,
      fallbackG / fallbackN,
      fallbackB / fallbackN,
    );
  }
  return CARD_ACCENT_FALLBACK;
}

export function useImageAccent(src: string | null): string {
  const [accent, setAccent] = useState(
    () => (src ? accentCache.get(src) : null) ?? CARD_ACCENT_FALLBACK,
  );

  useEffect(() => {
    if (!src) {
      setAccent(CARD_ACCENT_FALLBACK);
      return;
    }
    const cached = accentCache.get(src);
    if (cached) {
      setAccent(cached);
      return;
    }

    let cancelled = false;

    const load = (url: string, fallback?: string) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        if (cancelled) return;
        try {
          const next = accentFromImage(image);
          accentCache.set(src, next);
          setAccent(next);
        } catch {
          if (fallback) load(fallback);
          else setAccent(CARD_ACCENT_FALLBACK);
        }
      };
      image.onerror = () => {
        if (fallback) load(fallback);
        else if (!cancelled) setAccent(CARD_ACCENT_FALLBACK);
      };
      image.src = url;
    };

    load(src, `/api/image-proxy?url=${encodeURIComponent(src)}`);
    return () => {
      cancelled = true;
    };
  }, [src]);

  return accent;
}
