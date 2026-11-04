"use client";

import { useTheme, type BgMode } from "@/lib/themeContext";

const NEXT_LABEL: Record<BgMode, string> = {
  flat: "Use gradient background",
  gradient: "Hide top navigation",
  focus: "Use solid background",
};

export default function BgModeToggle() {
  const { bgMode, toggleBgMode } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={bgMode !== "flat"}
      aria-label={NEXT_LABEL[bgMode]}
      data-sfx="click"
      onClick={toggleBgMode}
      className="inline-flex items-center justify-center text-white/70 outline-none transition-colors duration-150 hover:text-white focus-visible:text-white"
    >
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      >
        <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
        {bgMode === "focus" ? (
          // Empty frame = chrome hidden / clean view.
          <path d="M5.5 8h5" opacity="0.55" />
        ) : bgMode === "gradient" ? (
          <path d="M5.5 2.5v11M8 2.5v11M10.5 2.5v11" />
        ) : (
          <path d="M2.5 5.5h11M2.5 8h11M2.5 10.5h11" />
        )}
      </svg>
    </button>
  );
}
