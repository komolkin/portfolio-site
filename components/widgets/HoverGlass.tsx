"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LiquidGlass } from "simple-liquid-glass";

/** Matches Tailwind `rounded-lg` (0.75rem). */
const RADIUS = 12;

type HoverGlassProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function usePrefersReducedTransparency() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

/**
 * iOS-style liquid glass chrome for cursor hover previews.
 * Chromium gets real SVG refraction; Safari/Firefox get frosted glass.
 */
export default function HoverGlass({
  children,
  className,
  contentClassName,
}: HoverGlassProps) {
  const reducedTransparency = usePrefersReducedTransparency();

  if (reducedTransparency) {
    return (
      <div
        className={`h-full w-full overflow-hidden rounded-lg bg-[#1c1c1e] shadow-lg ${className ?? ""}`}
      >
        <div className={contentClassName}>{children}</div>
      </div>
    );
  }

  return (
    <LiquidGlass
      mode="preset"
      radius={RADIUS}
      frost={0.28}
      blur={3.5}
      glassColor="rgba(255, 255, 255, 0.2)"
      borderColor="rgba(255, 255, 255, 0.42)"
      lens="rim"
      quality="high"
      className={`shadow-lg ${className ?? ""}`}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <div className={contentClassName}>{children}</div>
    </LiquidGlass>
  );
}
