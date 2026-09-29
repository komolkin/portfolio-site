import { Instrument_Sans } from "next/font/google";

/**
 * Site-wide Instrument Sans (Google). Variable `wdth` axis covers condensed
 * numerals used in playground UIs (same look as the old local Condensed file).
 */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-instrument-sans",
  axes: ["wdth"],
});

/** Condensed width (75) — for large numeric values in playground UIs. */
export const instrumentSansCondensed = {
  className: "[font-variation-settings:'wdth'_75]",
} as const;
