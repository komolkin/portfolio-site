"use client";

import { motion } from "framer-motion";

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
    className: "text-[24px] tracking-[-0.04em]",
    outerStroke: 8,
    midStroke: 4,
  },
  lg: {
    className: "text-[42px] tracking-[-0.06em]",
    outerStroke: 11,
    midStroke: 5.5,
  },
  xl: {
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
  animated = false,
  className = "",
}: {
  label: string;
  tone?: OutcomeStickerTone;
  tilt?: number;
  size?: keyof typeof SIZE;
  /** Pop-in spring used when the sticker lands after trade success. */
  animated?: boolean;
  className?: string;
}) {
  const tone = STICKER_TONES[toneProp ?? outcomeStickerToneFromLabel(label)];
  const scale = SIZE[size];
  const sharedClass = `relative inline-block select-none font-extrabold leading-none ${scale.className} ${className}`;
  const sharedStyle = {
    fontVariationSettings: '"ROND" 85, "wght" 850',
  } as const;

  const layers = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap"
        style={{
          color: tone.outer,
          WebkitTextStroke: `${scale.outerStroke}px ${tone.outer}`,
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
          WebkitTextStroke: `${scale.midStroke}px ${tone.mid}`,
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
