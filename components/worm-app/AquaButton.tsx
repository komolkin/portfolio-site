"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type AquaVariant = "primary" | "secondary";

const SURFACE: Record<AquaVariant, CSSProperties> = {
  primary: {
    color: "#000",
    textShadow: "0 2px 2px rgba(255,255,255,0.8)",
    background: "linear-gradient(#fbfbfb 0%, #ededed 42%, #e4e4e4 100%)",
    border: "1px solid #626262",
    boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
  },
  secondary: {
    color: "#f5f5f5",
    textShadow: "0 1px 1px rgba(0,0,0,0.35)",
    background: "linear-gradient(#3a3a3e 0%, #2a2a2e 42%, #1c1c1f 100%)",
    border: "1px solid #5a5a60",
    boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
  },
};

const BURN: Record<AquaVariant, string> = {
  primary: "inset 0 -8px 0 4px #b3b3b3",
  secondary: "inset 0 -8px 0 4px #6a6a70",
};

/** Gloss + screen wash + color-burn lip (heyclicky aqua chrome). */
export function AquaChrome({
  variant = "secondary",
}: {
  variant?: AquaVariant;
}) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-[3px] z-[1] h-3 rounded-full bg-[length:100%_100%] bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/worm-app/btn-gloss.png)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] mix-blend-screen"
        style={{ boxShadow: "inset 0 -15px 2px -12px rgba(255,255,255,0.25)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] mix-blend-color-burn"
        style={{ boxShadow: BURN[variant] }}
      />
    </>
  );
}

export function aquaSurfaceStyle(variant: AquaVariant = "secondary"): CSSProperties {
  return SURFACE[variant];
}

/**
 * Aqua gel pill — white primary / black secondary with heyclicky gloss.
 */
export default function AquaButton({
  children,
  variant = "primary",
  className = "",
  style,
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: AquaVariant;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button
      type={type}
      className={`aqua-btn relative isolate inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full pb-px font-medium tracking-[-0.03em] transition-[transform,opacity] duration-150 ease-out enabled:hover:opacity-80 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 ${className}`}
      style={{ ...SURFACE[variant], ...style }}
      {...rest}
    >
      <AquaChrome variant={variant} />
      <span className="relative z-[2] flex items-center justify-center gap-2.5">
        {children}
      </span>
    </button>
  );
}
