"use client";

import { motion } from "framer-motion";
import { useMemo, type CSSProperties, type ElementType } from "react";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

/**
 * Mirrors prompt-kit's `TextShimmer` — sweeps a narrow bright gradient through
 * the text by animating `background-position` on a clipped background-image.
 * `--base-color` is the dim resting color; `--base-gradient-color` is the
 * bright color that flashes through.
 */
export function TextShimmer({
  children,
  as = "span",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  const MotionComponent = useMemo(() => motion.create(as), [as]);
  const dynamicSpread = useMemo(
    () => children.length * spread,
    [children, spread],
  );

  return (
    <MotionComponent
      className={[
        "relative inline-block bg-clip-text text-transparent",
        "bg-[length:250%_100%,auto] [background-repeat:no-repeat,padding-box]",
        "[--base-color:#71717a] [--base-gradient-color:#ffffff]",
        "[--bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--base-gradient-color),transparent_calc(50%+var(--spread)))]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{ repeat: Infinity, duration, ease: "linear" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--base-color), var(--base-color))",
        } as CSSProperties
      }
    >
      {children}
    </MotionComponent>
  );
}
