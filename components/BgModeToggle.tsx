"use client";

import { useTheme } from "@/lib/themeContext";

export default function BgModeToggle() {
  const { bgMode, toggleBgMode } = useTheme();
  const isFlat = bgMode === "flat";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isFlat}
      aria-label={isFlat ? "Use gradient background" : "Use solid background"}
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
        <path d="M5.5 2.5v11M8 2.5v11M10.5 2.5v11" />
      </svg>
    </button>
  );
}
