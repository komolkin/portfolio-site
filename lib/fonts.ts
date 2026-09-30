import localFont from "next/font/local";
import { Instrument_Sans } from "next/font/google";

/**
 * Site-wide Instrument Sans (Google).
 */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-instrument-sans",
  axes: ["wdth"],
});

/**
 * Instrument Sans Condensed — local SemiBold for large numeric scores
 * (matches Figma "Instrument Sans Condensed").
 */
const instrumentSansCondensedFont = localFont({
  src: "../fonts/InstrumentSansCondensed-SemiBold.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  variable: "--font-instrument-sans-condensed",
  declarations: [{ prop: "font-stretch", value: "condensed" }],
});

/** Condensed face + proportional (non-tabular) figures. */
export const instrumentSansCondensed = {
  className: `${instrumentSansCondensedFont.className} [font-variant-numeric:proportional-nums] [font-feature-settings:'pnum'_1,'tnum'_0]`,
  variable: instrumentSansCondensedFont.variable,
  style: instrumentSansCondensedFont.style,
} as const;