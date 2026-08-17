import type {
  PolymarketMarketData,
  PolymarketTradeWithPnl,
  PolymarketWalletPosition,
  PolymarketWalletProfile,
} from "@/lib/polymarketscan";
import { getMarketOddsSides } from "@/lib/polymarketscan";
import type { StoredUserTrade, UserPlacedTrade } from "./userTrades";

export type CopyTradeMode = "fixed" | "percent";
export type CopyTradeStatus = "active" | "paused";

export type CopyTrade = {
  wallet: string;
  displayName: string;
  handle: string;
  mode: CopyTradeMode;
  amount: number;
  copyExits: boolean;
  maxDailyUsd: number | null;
  maxOpenPositions: number | null;
  status: CopyTradeStatus;
  createdAt: string;
};

export type CopyFillSource = {
  sourceKey: string;
  side: "BUY" | "SELL";
  outcome: string;
  price: number;
  amountUsd: number;
  marketTitle: string;
  marketSlug: string | null;
  marketCategory?: string | null;
  timestamp: string | null;
  txHash: string | null;
  image: string | null;
  markPrice?: number;
  pnlUsd?: number;
};

export const COPY_TRADES_KEY = "playground-api-copytrades";

export function loadCopyTrades(): CopyTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COPY_TRADES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCopyTrade);
  } catch {
    return [];
  }
}

export function saveCopyTrades(trades: CopyTrade[]): void {
  try {
    window.localStorage.setItem(COPY_TRADES_KEY, JSON.stringify(trades));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function formatCopyRule(trade: Pick<CopyTrade, "mode" | "amount">): string {
  if (trade.mode === "percent") return `${trade.amount}% of their size`;
  return `$${trade.amount.toLocaleString("en-US")} per trade`;
}

export function copySizeUsd(
  rule: Pick<CopyTrade, "mode" | "amount">,
  sourceAmountUsd: number,
): number {
  if (rule.mode === "percent") {
    return Math.max(1, Math.round((sourceAmountUsd * rule.amount) / 100));
  }
  return Math.max(1, Math.round(rule.amount));
}

export function copiedSourceKey(input: {
  txHash?: string | null;
  marketSlug?: string | null;
  marketTitle: string;
  outcome: string;
  kind?: "tx" | "pos";
}): string {
  if (input.kind !== "pos" && input.txHash) return `tx:${input.txHash}`;
  return `pos:${(input.marketSlug ?? input.marketTitle).trim().toLowerCase()}:${input.outcome.trim().toLowerCase()}`;
}

export function copyPositionKey(input: {
  marketSlug?: string | null;
  marketTitle: string;
  outcome: string;
}): string {
  return `${(input.marketSlug ?? input.marketTitle).trim().toLowerCase()}::${input.outcome.trim().toLowerCase()}`;
}

export function copiedTradesForWallet(
  trades: StoredUserTrade[],
  wallet: string,
): StoredUserTrade[] {
  const key = wallet.toLowerCase();
  return trades.filter(
    (item) => item.copiedFrom?.wallet.toLowerCase() === key,
  );
}

export function copyRelationshipEntries(
  trades: StoredUserTrade[],
): StoredUserTrade[] {
  return trades
    .filter((item) => item.trade.side.toUpperCase() !== "SELL")
    .sort((a, b) => {
      const aTime = Date.parse(a.trade.timestamp ?? "") || 0;
      const bTime = Date.parse(b.trade.timestamp ?? "") || 0;
      return bTime - aTime;
    });
}

export function copyRelationshipPnl(trades: StoredUserTrade[]): number {
  return trades.reduce((sum, item) => {
    if (item.trade.side.toUpperCase() === "SELL") {
      return sum + item.position.pnlUsd;
    }
    if (item.cashedOut) return sum;
    return sum + item.position.pnlUsd;
  }, 0);
}

export function copiedEntryPnl(
  entry: StoredUserTrade,
  related: StoredUserTrade[],
): number {
  if (!entry.cashedOut) return entry.position.pnlUsd;
  const key = copyPositionKey(entry.trade);
  const sell = related.find(
    (item) =>
      item.trade.side.toUpperCase() === "SELL" &&
      copyPositionKey(item.trade) === key,
  );
  return sell?.position.pnlUsd ?? entry.position.pnlUsd;
}

export function sourcesFromWalletProfile(
  profile: Pick<PolymarketWalletProfile, "positions" | "recentTrades">,
): CopyFillSource[] {
  const fromPositions = [...profile.positions]
    .filter((position) => position.shares > 0 && position.avgPrice > 0)
    .sort((a, b) => Math.abs(b.pnlUsd) - Math.abs(a.pnlUsd))
    .map((position) => {
      const amountUsd = position.shares * position.avgPrice;
      return {
        sourceKey: copiedSourceKey({
          kind: "pos",
          marketSlug: position.marketSlug,
          marketTitle: position.marketTitle,
          outcome: position.outcome,
        }),
        side: "BUY" as const,
        outcome: position.outcome,
        price: position.avgPrice,
        amountUsd,
        marketTitle: position.marketTitle,
        marketSlug: position.marketSlug,
        timestamp: new Date().toISOString(),
        txHash: null,
        image: position.image,
        markPrice: position.markPrice,
        pnlUsd: position.pnlUsd,
      };
    });

  const openKeys = new Set(fromPositions.map((source) => copyPositionKey(source)));
  const fromTrades: CopyFillSource[] = [];
  for (const trade of profile.recentTrades) {
    if (trade.side.toUpperCase() !== "BUY") continue;
    if (!(trade.price > 0) || !(trade.size > 0)) continue;
    const posKey = copyPositionKey({
      marketSlug: trade.marketSlug,
      marketTitle: trade.marketTitle,
      outcome: trade.outcome,
    });
    if (openKeys.has(posKey)) continue;
    fromTrades.push({
      sourceKey: copiedSourceKey({
        txHash: trade.txHash,
        marketSlug: trade.marketSlug,
        marketTitle: trade.marketTitle,
        outcome: trade.outcome,
      }),
      side: "BUY",
      outcome: trade.outcome,
      price: trade.price,
      amountUsd: trade.size * trade.price,
      marketTitle: trade.marketTitle,
      marketSlug: trade.marketSlug,
      timestamp: trade.timestamp,
      txHash: trade.txHash,
      image: null,
    });
  }

  return [...fromPositions, ...fromTrades];
}

export function sourcesFromFeedTrades(
  trades: PolymarketTradeWithPnl[],
  rule: CopyTrade,
): CopyFillSource[] {
  const createdAt = Date.parse(rule.createdAt);
  const key = rule.wallet.toLowerCase();
  return trades
    .filter((trade) => trade.wallet.toLowerCase() === key)
    .filter((trade) => {
      if (!Number.isFinite(createdAt) || !trade.timestamp) return true;
      const time = Date.parse(trade.timestamp);
      if (!Number.isFinite(time)) return true;
      return time >= createdAt;
    })
    .map((trade) => ({
      sourceKey: copiedSourceKey({
        txHash: trade.txHash,
        marketSlug: trade.marketSlug,
        marketTitle: trade.marketTitle,
        outcome: trade.outcome,
      }),
      side: trade.side.toUpperCase() === "SELL" ? ("SELL" as const) : ("BUY" as const),
      outcome: trade.outcome,
      price: trade.price,
      amountUsd: trade.amountUsd,
      marketTitle: trade.marketTitle,
      marketSlug: trade.marketSlug || null,
      marketCategory: trade.marketCategory,
      timestamp: trade.timestamp,
      txHash: trade.txHash,
      image: null,
    }));
}

export function applyCopyFills({
  existing,
  rule,
  ownWallet,
  sources,
}: {
  existing: StoredUserTrade[];
  rule: CopyTrade;
  ownWallet: string;
  sources: CopyFillSource[];
}): StoredUserTrade[] {
  const sourceWallet = rule.wallet.toLowerCase();
  const seenKeys = new Set(
    existing
      .filter((item) => item.copiedFrom?.wallet.toLowerCase() === sourceWallet)
      .map((item) => item.copiedFrom?.sourceKey)
      .filter((key): key is string => Boolean(key)),
  );
  const openKeys = new Set(
    existing
      .filter(
        (item) =>
          item.copiedFrom?.wallet.toLowerCase() === sourceWallet &&
          !item.cashedOut &&
          item.trade.side.toUpperCase() !== "SELL",
      )
      .map((item) => copyPositionKey(item.trade)),
  );

  const dayStart = startOfLocalDay(new Date()).getTime();
  let dailySpent = existing.reduce((sum, item) => {
    if (item.copiedFrom?.wallet.toLowerCase() !== sourceWallet) return sum;
    if (item.trade.side.toUpperCase() !== "BUY") return sum;
    const time = Date.parse(item.trade.timestamp ?? "");
    if (!Number.isFinite(time) || time < dayStart) return sum;
    return sum + item.trade.amountUsd;
  }, 0);
  let openCount = openKeys.size;

  let next = existing;
  let changed = false;

  const push = (item: StoredUserTrade) => {
    if (!changed) {
      next = [item, ...existing];
      changed = true;
      return;
    }
    next = [item, ...next];
  };

  for (const source of sources) {
    if (seenKeys.has(source.sourceKey)) continue;
    const side = source.side.toUpperCase() === "SELL" ? "SELL" : "BUY";
    const posKey = copyPositionKey(source);

    if (side === "SELL") {
      if (!rule.copyExits) continue;
      const matchIndex = next.findIndex(
        (item) =>
          item.copiedFrom?.wallet.toLowerCase() === sourceWallet &&
          !item.cashedOut &&
          item.trade.side.toUpperCase() !== "SELL" &&
          copyPositionKey(item.trade) === posKey,
      );
      if (matchIndex === -1) continue;
      const match = next[matchIndex]!;
      const markPrice = source.price > 0 ? source.price : match.position.markPrice;
      const amountUsd = match.position.shares * markPrice;
      const pnlUsd = amountUsd - match.trade.amountUsd;
      const sell = cashOutCopy(match, {
        price: markPrice,
        amountUsd,
        pnlUsd,
        timestamp: source.timestamp ?? new Date().toISOString(),
      });
      seenKeys.add(source.sourceKey);
      openKeys.delete(posKey);
      openCount = Math.max(0, openCount - 1);
      const updated = next.map((item, index) =>
        index === matchIndex ? { ...item, cashedOut: true } : item,
      );
      next = [sell, ...updated];
      changed = true;
      continue;
    }

    if (rule.status !== "active") continue;
    const isSim = source.sourceKey.startsWith("sim:");
    if (openKeys.has(posKey) && !isSim) continue;
    if (
      rule.maxOpenPositions != null &&
      openCount >= rule.maxOpenPositions &&
      !isSim
    ) {
      continue;
    }
    if (!(source.amountUsd > 0) || !(source.price > 0)) continue;

    const amountUsd = copySizeUsd(rule, source.amountUsd);
    if (
      rule.maxDailyUsd != null &&
      dailySpent + amountUsd > rule.maxDailyUsd &&
      !isSim
    ) {
      continue;
    }

    if (isSim && openKeys.has(posKey)) {
      const matchIndex = next.findIndex(
        (item) =>
          item.copiedFrom?.wallet.toLowerCase() === sourceWallet &&
          !item.cashedOut &&
          item.trade.side.toUpperCase() !== "SELL" &&
          copyPositionKey(item.trade) === posKey,
      );
      if (matchIndex !== -1) {
        const match = next[matchIndex]!;
        const sell = cashOutCopy(match, {
          price: match.position.markPrice,
          amountUsd: match.position.valueUsd,
          pnlUsd: match.position.pnlUsd,
          timestamp: source.timestamp ?? new Date().toISOString(),
        });
        openKeys.delete(posKey);
        openCount = Math.max(0, openCount - 1);
        next = [
          sell,
          ...next.map((item, index) =>
            index === matchIndex ? { ...item, cashedOut: true } : item,
          ),
        ];
        changed = true;
      }
    } else if (
      isSim &&
      rule.maxOpenPositions != null &&
      openCount >= rule.maxOpenPositions
    ) {
      const oldestIndex = next.reduce((found, item, index) => {
        if (
          item.copiedFrom?.wallet.toLowerCase() !== sourceWallet ||
          item.cashedOut ||
          item.trade.side.toUpperCase() === "SELL"
        ) {
          return found;
        }
        if (found === -1) return index;
        const foundTime = Date.parse(next[found]!.trade.timestamp ?? "") || 0;
        const itemTime = Date.parse(item.trade.timestamp ?? "") || 0;
        return itemTime < foundTime ? index : found;
      }, -1);
      if (oldestIndex !== -1) {
        const match = next[oldestIndex]!;
        const sell = cashOutCopy(match, {
          price: match.position.markPrice,
          amountUsd: match.position.valueUsd,
          pnlUsd: match.position.pnlUsd,
          timestamp: source.timestamp ?? new Date().toISOString(),
        });
        openKeys.delete(copyPositionKey(match.trade));
        openCount = Math.max(0, openCount - 1);
        next = [
          sell,
          ...next.map((item, index) =>
            index === oldestIndex ? { ...item, cashedOut: true } : item,
          ),
        ];
        changed = true;
      }
    }

    const scale = amountUsd / source.amountUsd;
    const markPrice = source.markPrice ?? source.price;
    const sourceShares =
      source.price > 0 ? source.amountUsd / source.price : 0;
    const shares = sourceShares * scale;
    const sourcePnl = source.pnlUsd ?? 0;
    const valueUsd = shares * markPrice;
    const pnlUsd =
      source.pnlUsd != null ? sourcePnl * scale : valueUsd - amountUsd;

    const fill = buildCopiedBuy({
      rule,
      ownWallet,
      source,
      amountUsd,
      shares,
      markPrice,
      valueUsd,
      pnlUsd,
    });
    seenKeys.add(source.sourceKey);
    openKeys.add(posKey);
    dailySpent += amountUsd;
    openCount += 1;
    push(fill);
  }

  return changed ? next : existing;
}

export function tickCopiedMarks(
  items: StoredUserTrade[],
  activeWallets: Iterable<string>,
  now = Date.now(),
): StoredUserTrade[] {
  const active = new Set(
    [...activeWallets].map((wallet) => wallet.toLowerCase()),
  );
  if (active.size === 0) return items;

  let changed = false;
  const next = items.map((item) => {
    if (!item.copiedFrom || item.cashedOut) return item;
    if (item.trade.side.toUpperCase() === "SELL") return item;
    if (!(item.position.shares > 0)) return item;
    if (!active.has(item.copiedFrom.wallet.toLowerCase())) return item;

    const seed = hashCopyKey(item.copiedFrom.sourceKey);
    const ceiling = 0.78 + (seed % 12) / 100;
    const wave = Math.sin(now / 2600 + (seed % 13)) * 0.0035;
    const drift = item.position.markPrice < ceiling - 0.01 ? 0.00045 : 0;
    const markPrice = Math.min(
      0.96,
      Math.max(
        0.06,
        Math.max(item.position.avgPrice * 0.92, item.position.markPrice + drift) +
          wave,
      ),
    );
    if (Math.abs(markPrice - item.position.markPrice) < 0.00008) return item;

    const valueUsd = item.position.shares * markPrice;
    changed = true;
    return {
      ...item,
      position: {
        ...item.position,
        markPrice,
        valueUsd,
        pnlUsd: valueUsd - item.trade.amountUsd,
      },
    };
  });
  return changed ? next : items;
}

export function simulateCopySource(
  rule: CopyTrade,
  markets: PolymarketMarketData[],
  existing: StoredUserTrade[],
  now = Date.now(),
): CopyFillSource | null {
  const sourceWallet = rule.wallet.toLowerCase();
  const openKeys = new Set(
    existing
      .filter(
        (item) =>
          item.copiedFrom?.wallet.toLowerCase() === sourceWallet &&
          !item.cashedOut &&
          item.trade.side.toUpperCase() !== "SELL",
      )
      .map((item) => copyPositionKey(item.trade)),
  );

  const open = markets.filter((market) => {
    const slug = (market.slug || market.marketId).trim();
    if (!slug || market.isResolved) return false;
    const sides = getMarketOddsSides(market);
    const side = sides[0];
    if (!side || !(side.price > 0.08) || side.price >= 0.88) return false;
    return !openKeys.has(
      copyPositionKey({
        marketSlug: market.slug,
        marketTitle: market.title,
        outcome: side.label,
      }),
    );
  });
  const pool =
    open.length > 0
      ? open
      : markets.filter((market) => {
          const slug = (market.slug || market.marketId).trim();
          if (!slug || market.isResolved) return false;
          const sides = getMarketOddsSides(market);
          const side = sides[0];
          return Boolean(side && side.price > 0.08 && side.price < 0.88);
        });
  if (pool.length === 0) return null;

  const pick =
    pool[hashCopyKey(`${rule.wallet}:${now}`) % pool.length]!;
  const side = getMarketOddsSides(pick)[0]!;
  const seed = hashCopyKey(`${rule.wallet}:${pick.slug || pick.marketId}`);
  const entry = Math.min(side.price, 0.38 + (seed % 22) / 100);
  const amountUsd = 40 + (seed % 180);

  return {
    sourceKey: `sim:${rule.wallet}:${pick.slug || pick.marketId}:${now}`,
    side: "BUY",
    outcome: side.label,
    price: entry,
    amountUsd,
    marketTitle: pick.title,
    marketSlug: pick.slug || pick.marketId,
    marketCategory: pick.category,
    timestamp: new Date(now).toISOString(),
    txHash: `sim-copy-${now}`,
    image: pick.image,
    markPrice: entry,
    pnlUsd: 0,
  };
}

function hashCopyKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function startOfLocalDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function cashOutCopy(
  item: StoredUserTrade,
  result: {
    price: number;
    amountUsd: number;
    pnlUsd: number;
    timestamp: string;
  },
): StoredUserTrade {
  return {
    trade: {
      ...item.trade,
      side: "SELL",
      price: result.price,
      amountUsd: result.amountUsd,
      timestamp: result.timestamp,
      txHash: `local-copy-exit-${item.copiedFrom?.sourceKey ?? item.trade.txHash ?? Date.now()}`,
      userCaption: null,
      userGifUrl: null,
    },
    position: {
      ...item.position,
      markPrice: result.price,
      valueUsd: result.amountUsd,
      pnlUsd: result.pnlUsd,
      shares: 0,
    },
    cashedOut: true,
    copiedFrom: item.copiedFrom,
  };
}

function buildCopiedBuy({
  rule,
  ownWallet,
  source,
  amountUsd,
  shares,
  markPrice,
  valueUsd,
  pnlUsd,
}: {
  rule: CopyTrade;
  ownWallet: string;
  source: CopyFillSource;
  amountUsd: number;
  shares: number;
  markPrice: number;
  valueUsd: number;
  pnlUsd: number;
}): StoredUserTrade {
  const trade: UserPlacedTrade = {
    side: "BUY",
    outcome: source.outcome,
    price: source.price,
    amountUsd,
    marketTitle: source.marketTitle,
    marketSlug: source.marketSlug ?? "",
    marketCategory: source.marketCategory ?? null,
    wallet: ownWallet,
    timestamp: source.timestamp ?? new Date().toISOString(),
    txHash: `local-copy-${source.sourceKey}`,
    totalPnl: null,
    winRate: null,
    tradeCount: null,
    userCaption: null,
  };
  const position: PolymarketWalletPosition = {
    marketTitle: source.marketTitle,
    marketSlug: source.marketSlug,
    outcome: source.outcome,
    shares,
    avgPrice: source.price,
    markPrice,
    valueUsd,
    pnlUsd,
    image: source.image,
  };
  return {
    trade,
    position,
    copiedFrom: {
      wallet: rule.wallet,
      sourceKey: source.sourceKey,
    },
  };
}

function isCopyTrade(item: unknown): item is CopyTrade {
  if (typeof item !== "object" || item === null) return false;
  const row = item as Partial<CopyTrade>;
  return (
    typeof row.wallet === "string" &&
    typeof row.displayName === "string" &&
    typeof row.handle === "string" &&
    (row.mode === "fixed" || row.mode === "percent") &&
    typeof row.amount === "number" &&
    typeof row.copyExits === "boolean" &&
    (row.maxDailyUsd === null || typeof row.maxDailyUsd === "number") &&
    (row.maxOpenPositions === null || typeof row.maxOpenPositions === "number") &&
    (row.status === "active" || row.status === "paused") &&
    typeof row.createdAt === "string"
  );
}
