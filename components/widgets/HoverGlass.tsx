"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LiquidGlass } from "simple-liquid-glass";

/** Matches Tailwind `rounded-lg` (0.75rem). */
const RADIUS = 12;

const GLASS_BORDER_COLOR = "rgba(255, 255, 255, 0.42)";

function GlassBorderOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        borderRadius: RADIUS,
        background: `linear-gradient(315deg, ${GLASS_BORDER_COLOR} 0%, rgba(120, 120, 120, 0) 30%, rgba(120, 120, 120, 0) 70%, ${GLASS_BORDER_COLOR} 100%) border-box`,
        mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
        WebkitMaskComposite: "xor",
        border: "1px solid transparent",
      }}
    />
  );
}

type HoverGlassProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Edge-to-edge content; border is drawn on top so it stays visible. */
  flush?: boolean;
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
  flush = false,
}: HoverGlassProps) {
  const reducedTransparency = usePrefersReducedTransparency();

  const content = flush ? (
    <div className={`relative size-full overflow-hidden rounded-lg ${contentClassName ?? ""}`}>
      {children}
      <GlassBorderOverlay />
    </div>
  ) : (
    <div className={contentClassName}>{children}</div>
  );

  if (reducedTransparency) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden rounded-lg bg-[#1c1c1e] shadow-lg ${className ?? ""}`}
      >
        {content}
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
      borderColor={GLASS_BORDER_COLOR}
      lens="rim"
      quality="high"
      className={`shadow-lg ${className ?? ""}`}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {content}
    </LiquidGlass>
  );
}
