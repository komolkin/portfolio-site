import {
  getMarketOddsSides,
  isTwoSidedMarket,
  type PolymarketMarketData,
  type PolymarketTradeWithPnl,
  type PolymarketWalletPosition,
} from "@/lib/polymarketscan";

export type UserPlacedTrade = PolymarketTradeWithPnl & {
  userCaption: string | null;
  userGifUrl?: string | null;
};

export type StoredUserTrade = {
  trade: UserPlacedTrade;
  position: PolymarketWalletPosition;
  cashedOut?: boolean;
  copiedFrom?: {
    wallet: string;
    sourceKey: string;
  };
};

export const USER_TRADES_KEY = "playground-api-user-trades";

export function loadUserTrades(): StoredUserTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_TRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredUserTrade =>
        typeof item === "object" &&
        item !== null &&
        "trade" in item &&
        "position" in item,
    );
  } catch {
    return [];
  }
}

export function saveUserTrades(trades: StoredUserTrade[]): void {
  try {
    window.localStorage.setItem(USER_TRADES_KEY, JSON.stringify(trades));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function isBinaryMarket(
  market: Pick<
    PolymarketMarketData,
    "title" | "yesPrice" | "noPrice" | "outcomes" | "groupItemTitle"
  >,
): boolean {
  return isTwoSidedMarket(market);
}

export { getMarketOddsSides };
