export type PositionSide = "YES" | "NO";

export type ExpandableRow = {
  id: string;
  title: string;
  side: PositionSide;
  leverage: string;
  /** Collateral in USD — cash-out equals this at entry */
  stake: number;
  /** Entry price in cents (0–100) */
  entryCents: number;
  /** Liquidation price in cents (0–100) */
  liqCents: number;
  /** Starting current price in cents */
  fillCentsBase: number;
  /** Optional badge shown next to the title (e.g. Copied) */
  badge?: string;
  /** When false, hide the leverage pill (default true) */
  showLeverage?: boolean;
  /** When false, hide the red liq segment on the progress bar (default true) */
  showLiq?: boolean;
};

export const EXPANDABLE_ROWS: ExpandableRow[] = [
  {
    id: "1",
    title: "$1.75–$2.0T",
    side: "YES",
    leverage: "3×",
    stake: 1_000,
    entryCents: 50,
    liqCents: 10,
    fillCentsBase: 50,
  },
  {
    id: "2",
    title: "<$1.25T",
    side: "NO",
    leverage: "3×",
    stake: 1_000,
    entryCents: 20,
    liqCents: 12,
    fillCentsBase: 76,
    badge: "Copied",
    showLeverage: false,
    showLiq: false,
  },
  {
    id: "3",
    title: "$1.25–$1.5T",
    side: "YES",
    leverage: "3×",
    stake: 300,
    entryCents: 20,
    liqCents: 15,
    fillCentsBase: 16,
  },
  {
    id: "4",
    title: "$1.5–$1.75T",
    side: "NO",
    leverage: "3×",
    stake: 300,
    entryCents: 40,
    liqCents: 16,
    fillCentsBase: 55,
  },
];
