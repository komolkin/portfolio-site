import localFont from "next/font/local";
import { Caveat, Instrument_Sans } from "next/font/google";

/**
 * Hand-written sticker face for Yes/No outcomes.
 */
export const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-caveat",
});

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
 * Allo — friendly variable UI face (https://allo.joshpuckett.me).
 * Axes: wght 100–900, ROND 0–100, opsz auto.
 */
export const allo = localFont({
  src: "../fonts/AlloVariable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-allo",
  declarations: [{ prop: "font-variation-settings", value: '"ROND" 50' }],
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