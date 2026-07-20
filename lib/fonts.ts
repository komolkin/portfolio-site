import localFont from "next/font/local";

/** Instrument Sans Condensed (wdth 75) — for large numeric values in playground UIs. */
export const instrumentSansCondensed = localFont({
  src: "../fonts/InstrumentSansCondensed-SemiBold.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  variable: "--font-instrument-sans-condensed",
  fallback: ["system-ui", "sans-serif"],
});
