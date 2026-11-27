"use client";

import { motion } from "framer-motion";
import localFont from "next/font/local";
import { instrumentSans } from "@/lib/fonts";

const pixel = localFont({ src: "../../fonts/PressStart2P-Regular.ttf", preload: false });
const glitch = localFont({ src: "../../fonts/RubikGlitch-Regular.ttf", preload: false });

export const OUTCOME_STICKER_STYLES = ["Bubbly", "Pixelated", "Serif", "Sans", "Weird"] as const;
export type OutcomeStickerStyle = (typeof OUTCOME_STICKER_STYLES)[number];

const STICKER_FONTS = {
  Bubbly: undefined,
  Pixelated: pixel.style.fontFamily,
  Serif: "Georgia, serif",
  Sans: instrumentSans.style.fontFamily,
  Weird: glitch.style.fontFamily,
} satisfies Record<OutcomeStickerStyle, string | undefined>;

export type OutcomeStickerTone = "yes" | "no";

/** Allo-style cut sticker: soft fill + mid stroke + dark outer stroke. */
const STICKER_TONES = {
  yes: {
    fill: "#9AFFB8",
    mid: "#119B45",
    outer: "#05381C",
  },
  no: {
    fill: "#FFB0BC",
    mid: "#E01845",
    outer: "#6E0A22",
  },
} as const;

const SIZE = {
  md: {
    fontSize: 24,
    className: "text-[24px] tracking-[-0.04em]",
    outerStroke: 8,
    midStroke: 4,
  },
  lg: {
    fontSize: 42,
    className: "text-[42px] tracking-[-0.06em]",
    outerStroke: 11,
    midStroke: 5.5,
  },
  xl: {
    fontSize: 72,
    className: "text-[72px] tracking-[-0.07em]",
    outerStroke: 16,
    midStroke: 8,
  },
} as const;

export function outcomeStickerToneFromLabel(label: string): OutcomeStickerTone {
  return label.trim().toLowerCase() === "no" ? "no" : "yes";
}

/** Stable slight sticker tilt from an id key (−7°…7°). */
export function outcomeStickerTilt(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 15) - 7;
}

export function OutcomeSticker({
  label,
  tone: toneProp,
  tilt = 5,
  size = "lg",
  stickerStyle = "Bubbly",
  animated = false,
  className = "",
}: {
  label: string;
  tone?: OutcomeStickerTone;
  tilt?: number;
  size?: keyof typeof SIZE;
  stickerStyle?: OutcomeStickerStyle;
  /** Pop-in spring used when the sticker lands after trade success. */
  animated?: boolean;
  className?: string;
}) {
  const tone = STICKER_TONES[toneProp ?? outcomeStickerToneFromLabel(label)];
  const scale = SIZE[size];
  const pixelated = stickerStyle === "Pixelated";
  const fineOutline = pixelated || stickerStyle === "Weird";
  const outlineScale = fineOutline ? 0.55 : 1;
  const sharedClass = `relative inline-block select-none font-extrabold leading-none ${scale.className} ${className}`;
  const sharedStyle = {
    fontFamily: STICKER_FONTS[stickerStyle],
    fontSize: pixelated ? scale.fontSize * 0.64 : undefined,
    letterSpacing: pixelated ? "0.04em" : undefined,
    fontWeight: fineOutline ? 400 : undefined,
    fontVariationSettings: stickerStyle === "Bubbly" ? '"ROND" 85, "wght" 850' : undefined,
  } as const;

  const layers = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
        style={{
          color: tone.outer,
          WebkitTextStroke: `${scale.outerStroke * outlineScale}px ${tone.outer}`,
          paintOrder: "stroke fill",
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
        style={{
          color: tone.mid,
          WebkitTextStroke: `${scale.midStroke * outlineScale}px ${tone.mid}`,
          paintOrder: "stroke fill",
        }}
      >
        {label}
      </span>
      <span className="relative whitespace-nowrap" style={{ color: tone.fill }}>
        {label}
      </span>
    </>
  );

  if (!animated) {
    return (
      <span
        aria-label={label}
        data-outcome-sticker
        className={`${sharedClass} origin-center`}
        style={{ ...sharedStyle, transform: `rotate(${tilt}deg)` }}
      >
        {layers}
      </span>
    );
  }

  return (
    <motion.span
      aria-label={label}
      data-outcome-sticker
      initial={{ scale: 1.72, opacity: 0, rotate: tilt - 4 }}
      animate={{ scale: 1, opacity: 1, rotate: tilt }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 460,
        damping: 16,
        mass: 0.72,
        opacity: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
      }}
      className={`${sharedClass} origin-center`}
      style={sharedStyle}
    >
      {layers}
    </motion.span>
  );
}
