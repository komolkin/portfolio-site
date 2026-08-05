export type PositionSide = "YES" | "NO";

export type PositionRow = {
  id: string;
  title: string;
  sharesLabel: string;
  side: PositionSide;
  leverage: string;
  from: string;
  /** Potential / max value shown in green after the arrow */
  to: number;
  /** Starting cash-out amount (USD) */
  cashOutBase: number;
  /** Starting green fill width inside the 147px track */
  fillWidthBase: number;
  /** Red liquidation block width (static) — ¢ = width / track × 100 */
  liqWidth: number;
  /** Entry marker left offset (px) — ¢ = left / track × 100 */
  entryLeft: number;
};

export const POSITION_ROWS: PositionRow[] = [
  {
    id: "1",
    title: "25,001-50,000",
    sharesLabel: "200 shares",
    side: "NO",
    leverage: "3×",
    from: "$1,000",
    to: 25_000,
    cashOutBase: 12_500,
    fillWidthBase: 72,
    liqWidth: 38,
    entryLeft: 55,
  },
  {
    id: "2",
    title: "25,001-50,000",
    sharesLabel: "85 shares",
    side: "YES",
    leverage: "3×",
    from: "$300",
    to: 15_000,
    cashOutBase: 2_500,
    fillWidthBase: 121,
    liqWidth: 22,
    entryLeft: 64,
  },
  {
    id: "3",
    title: "≥25,000",
    sharesLabel: "1,240 shares",
    side: "NO",
    leverage: "3×",
    from: "$300",
    to: 12_000,
    cashOutBase: 500,
    fillWidthBase: 121,
    liqWidth: 34,
    entryLeft: 70,
  },
  {
    id: "4",
    title: "≥25,000",
    sharesLabel: "420 shares",
    side: "YES",
    leverage: "3×",
    from: "$300",
    to: 30_000,
    cashOutBase: 500,
    fillWidthBase: 121,
    liqWidth: 34,
    entryLeft: 58,
  },
  {
    id: "5",
    title: "200,001-500,000",
    sharesLabel: "64 shares",
    side: "NO",
    leverage: "3×",
    from: "$300",
    to: 1_000,
    cashOutBase: 500,
    fillWidthBase: 56,
    liqWidth: 23,
    entryLeft: 48,
  },
  {
    id: "6",
    title: "200,001-500,000",
    sharesLabel: "980 shares",
    side: "NO",
    leverage: "3×",
    from: "$300",
    to: 2_000,
    cashOutBase: 500,
    fillWidthBase: 98,
    liqWidth: 55,
    entryLeft: 78,
  },
];
