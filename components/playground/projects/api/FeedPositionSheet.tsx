"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LivelinePoint } from "liveline";
import type {
  PolymarketMarketData,
  PolymarketTradeWithPnl,
  PolymarketWalletProfile,
  PolymarketWalletTrade,
} from "@/lib/polymarketscan";
import { sportsOutcomeAbbr } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import { ui } from "./ui";
import type { SharePositionPayload } from "./SharePositionModal";
import UserAvatar from "./UserAvatar";

const CLOSE_THRESHOLD_PX = 72;

function outcomeTeamLogo(
  market: PolymarketMarketData | undefined,
  outcome: string,
): string | null {
  const label = outcome.trim().toLowerCase();
  if (!market || !label) return null;
  const teams = [
    market.liveGame?.away,
    market.liveGame?.home,
    ...(market.teams ?? []),
  ];
  for (const team of teams) {
    const name = team?.name?.toLowerCase();
    if (!name || !team?.logo) continue;
    if (name === label || name.includes(label) || label.includes(name)) {
      return team.logo;
    }
  }
  return null;
}

function ChanceSparkline({
  points,
  range,
  color,
}: {
  points: LivelinePoint[];
  range: { min: number; max: number };
  color: string;
}) {
  const first = points[0]?.time ?? 0;
  const span = Math.max(1, (points.at(-1)?.time ?? 0) - first);
  const height = Math.max(0.001, range.max - range.min);
  const coords = points.map((point) => [
    ((point.time - first) / span) * 1000,
    ((range.max - point.value) / height) * 100,
  ]);
  const line = coords
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x!.toFixed(1)} ${y!.toFixed(2)}`)
    .join(" ");
  const area = `${line} L1000 100 L0 100 Z`;
  const gradientId = `chance-fill-${color.replace("#", "")}`;
  return (
    <svg
      viewBox="0 0 1000 100"
      preserveAspectRatio="none"
      className="absolute overflow-visible"
      style={{
        top: CHART_PAD.top,
        right: CHART_PAD.right,
        bottom: CHART_PAD.bottom,
        left: CHART_PAD.left,
        width: `calc(100% - ${CHART_PAD.left + CHART_PAD.right}px)`,
        height: `calc(100% - ${CHART_PAD.top + CHART_PAD.bottom}px)`,
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}



function formatUsdMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedUsdMoney(value: number): string {
  const formatted = formatUsdMoney(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}



function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function oppositeOutcome(outcome: string, marketTitle?: string): string {
  const lower = outcome.trim().toLowerCase();
  if (lower === "yes") return "No";
  if (lower === "no") return "Yes";
  if (lower === "up") return "Down";
  if (lower === "down") return "Up";
  if (marketTitle) {
    const parts = marketTitle.split(/\s+vs\.?\s+/i);
    if (parts.length === 2) {
      const away = parts[0].trim();
      const home = parts[1].trim();
      if (away.toLowerCase() === lower) return home;
      if (home.toLowerCase() === lower) return away;
    }
  }
  return "No";
}

const CHART_PAD = { top: 28, right: 0, bottom: 12, left: 0 } as const;
const MAX_CHART_MARKERS = 8;

const CHART_RANGES = [
  { id: "1h", label: "1H", secs: 60 * 60 },
  { id: "6h", label: "6H", secs: 6 * 60 * 60 },
  { id: "1d", label: "1D", secs: 24 * 60 * 60 },
  { id: "1w", label: "1W", secs: 7 * 24 * 60 * 60 },
  { id: "all", label: "All", secs: 30 * 24 * 60 * 60 },
] as const;

type ChartRangeId = (typeof CHART_RANGES)[number]["id"];

const CHART_STEPS = 96;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded market-like price path ending exactly at `endPercent`.
 * Built backwards from "now" as a random walk with occasional jumps, so it
 * reads like real order flow instead of a smooth wave.
 */
/** Where the opened position sits on the time axis; shared with the marker layout. */
function entryAnchorTime(
  entryTime: number | null,
  t0: number,
  t1: number,
): number {
  const span = Math.max(1, t1 - t0);
  if (entryTime == null) return t0 + span * 0.22;
  return Math.max(t0 + span * 0.1, Math.min(t1 - span * 0.1, entryTime));
}

function seedChanceHistory(
  endPercent: number,
  seed: number,
  rangeSecs: number,
  entry?: { time: number | null; percent: number },
): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const stepSecs = rangeSecs / (CHART_STEPS - 1);
  const rand = mulberry32(seed ^ Math.round(rangeSecs));
  const end = Math.max(3, Math.min(97, endPercent));
  // Longer windows wander further from today's price.
  const volatility = 0.35 + Math.log10(rangeSecs / 3600 + 1) * 0.6;
  const values: number[] = [end];
  let value = end;
  let drift = 0;
  for (let i = 1; i < CHART_STEPS; i++) {
    // Momentum makes moves trend for a while instead of pure zig-zag.
    drift = drift * 0.6 + (rand() - 0.5) * volatility * 0.8;
    const noise = (rand() - 0.5) * volatility * 1.6;
    const jump = rand() < 0.03 ? (rand() - 0.5) * volatility * 7 : 0;
    // Soft pull away from the 0/100 rails.
    const rail = value < 8 ? 0.6 : value > 92 ? -0.6 : 0;
    value = Math.max(2, Math.min(98, value + drift + noise + jump + rail));
    values.push(value);
  }
  values.reverse();
  const points = values.map((v, i) => ({
    time: Math.round(now - (CHART_STEPS - 1 - i) * stepSecs),
    value: v,
  }));

  if (entry) {
    // Bend the walk so it passes through the entry price at the entry time and
    // still ends on the current price.
    const t0 = points[0]!.time;
    const t1 = points[points.length - 1]!.time;
    const anchorTime = entryAnchorTime(entry.time, t0, t1);
    const anchor = Math.min(
      CHART_STEPS - 2,
      Math.max(1, Math.round((anchorTime - t0) / stepSecs)),
    );
    const target = Math.max(2, Math.min(98, entry.percent));
    const offset = target - points[anchor]!.value;
    const last = CHART_STEPS - 1;
    for (let i = 0; i < CHART_STEPS; i++) {
      const weight = i <= anchor ? 1 : (last - i) / (last - anchor);
      points[i]!.value = Math.max(1, Math.min(99, points[i]!.value + offset * weight));
    }
    points[anchor] = { time: anchorTime, value: target };
  }

  return points.map((point) => ({
    time: point.time,
    value: Math.round(point.value * 10) / 10,
  }));
}

/** Mirrors liveline's internal range so overlay markers line up with the curve. */
function livelineRange(
  points: LivelinePoint[],
  currentValue: number,
  referenceValue?: number,
): { min: number; max: number } {
  let min = currentValue;
  let max = currentValue;
  for (const point of points) {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
  }
  if (referenceValue !== undefined) {
    min = Math.min(min, referenceValue);
    max = Math.max(max, referenceValue);
  }
  const rawRange = max - min;
  const minRange = rawRange * 0.1 || 0.4;
  if (rawRange < minRange) {
    const mid = (min + max) / 2;
    return { min: mid - minRange / 2, max: mid + minRange / 2 };
  }
  const margin = rawRange * 0.12;
  return { min: min - margin, max: max + margin };
}

function parseTradeTime(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const then = Date.parse(timestamp);
  return Number.isFinite(then) ? then / 1000 : null;
}

function outcomeChance(
  price: number,
  outcome: string,
  baseOutcome: string,
): number {
  const same =
    outcome.trim().toLowerCase() === baseOutcome.trim().toLowerCase();
  const pct = Math.max(0, Math.min(100, price * 100));
  return same ? pct : 100 - pct;
}

function tradeItemKey(item: {
  txHash: string | null;
  timestamp: string | null;
  side: string;
  outcome: string;
  price: number;
}): string {
  return (
    item.txHash ??
    `${item.timestamp}-${item.side}-${item.outcome}-${item.price}`
  );
}

function interpolateValue(points: LivelinePoint[], time: number): number {
  if (points.length === 0) return 0;
  if (time <= points[0].time) return points[0].value;
  const last = points[points.length - 1];
  if (time >= last.time) return last.value;
  for (let i = 1; i < points.length; i++) {
    const b = points[i];
    if (time > b.time) continue;
    const a = points[i - 1];
    const span = Math.max(1, b.time - a.time);
    return a.value + (b.value - a.value) * ((time - a.time) / span);
  }
  return last.value;
}

function pinTradesOnHistory(
  points: LivelinePoint[],
  pins: Array<{ key: string; time: number | null; value: number }>,
  pinnedKey?: string,
): {
  points: LivelinePoint[];
  markers: Array<{ key: string; time: number; value: number }>;
} {
  if (points.length < 2 || pins.length === 0) {
    return { points, markers: [] };
  }

  const t0 = points[0].time;
  const t1 = points[points.length - 1].time;
  const span = Math.max(1, t1 - t0);
  const used: number[] = [];
  const markers: Array<{ key: string; time: number; value: number }> = [];
  // Trades outside the selected window are hidden rather than squashed onto the edge.
  // The opened position stays visible in every range, clamped to the edge.
  const visiblePins = pins
    .filter(
      (pin) =>
        pin.key === pinnedKey ||
        pin.time == null ||
        (pin.time >= t0 && pin.time <= t1),
    )
    .sort((a, b) => Number(b.key === pinnedKey) - Number(a.key === pinnedKey));

  for (const [pinIndex, pin] of visiblePins.slice(0, MAX_CHART_MARKERS).entries()) {
    const fallback = t0 + span * (0.22 + ((pinIndex * 0.19) % 0.56));
    let time =
      pin.key === pinnedKey
        ? entryAnchorTime(pin.time, t0, t1)
        : pin.time == null
          ? fallback
          : Math.max(t0 + span * 0.1, Math.min(t1 - span * 0.1, pin.time));

    for (const taken of used) {
      if (Math.abs(time - taken) / span < 0.08) {
        time = Math.min(t1 - span * 0.1, time + span * 0.1);
      }
    }
    used.push(time);

    markers.push({
      key: pin.key,
      time,
      value: interpolateValue(points, time),
    });
  }

  return { points, markers };
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 9.5V2.75M8 2.75 5.5 5.15M8 2.75 10.5 5.15"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.25 8.75v3.5c0 .7.55 1.25 1.25 1.25h7c.7 0 1.25-.55 1.25-1.25v-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function matchesMarket(
  candidate: { marketSlug: string | null; marketTitle: string },
  trade: PolymarketTradeWithPnl,
): boolean {
  const slug = trade.marketSlug.trim().toLowerCase();
  const candidateSlug = (candidate.marketSlug ?? "").trim().toLowerCase();
  if (slug && candidateSlug && (candidateSlug === slug || candidateSlug.includes(slug) || slug.includes(candidateSlug))) {
    return true;
  }
  const title = trade.marketTitle.trim().toLowerCase();
  const candidateTitle = candidate.marketTitle.trim().toLowerCase();
  return Boolean(title) && candidateTitle === title;
}

function feedTradeAsWalletTrade(trade: PolymarketTradeWithPnl): PolymarketWalletTrade {
  return {
    side: trade.side,
    outcome: trade.outcome,
    price: trade.price,
    size: trade.price > 0 ? trade.amountUsd / trade.price : 0,
    marketTitle: trade.marketTitle,
    marketSlug: trade.marketSlug || null,
    timestamp: trade.timestamp,
    txHash: trade.txHash,
  };
}

export function FollowButton({
  following,
  onClick,
  size = "sm",
}: {
  following: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      aria-pressed={following}
      data-sfx="click"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full text-[13px] font-semibold leading-none ${
        size === "md" ? "h-9 px-4" : "px-3.5 py-1.5"
      } ${
        following
          ? "bg-transparent text-white ring-1 ring-white/20"
          : "bg-white text-black"
      }`}
    >
      {following ? (
        <>
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Following
        </>
      ) : (
        "Follow"
      )}
    </button>
  );
}

export default function FeedPositionSheet({
  trade,
  handle,
  avatarUrl,
  marketImage,
  volume24h,
  following,
  onFollowToggle,
  onOpenWallet,
  onTrade,
  onClose,
  onShare,
  referralCode,
  isOwn = false,
  market,
}: {
  trade: PolymarketTradeWithPnl;
  handle: string;
  avatarUrl?: string | null;
  marketImage?: string;
  volume24h?: number;
  following: boolean;
  onFollowToggle: () => void;
  onOpenWallet: () => void;
  onTrade?: (outcome: string) => void;
  onClose: () => void;
  onShare: (payload: SharePositionPayload) => void;
  referralCode: string;
  isOwn?: boolean;
  market?: PolymarketMarketData;
}) {
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const seedTrade = useMemo(() => feedTradeAsWalletTrade(trade), [trade]);
  const openedTradeKey = tradeItemKey(seedTrade);
  const [marketTrades, setMarketTrades] = useState<PolymarketWalletTrade[]>(
    () => [seedTrade],
  );
  const [selectedTradeKey, setSelectedTradeKey] = useState(openedTradeKey);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const seed = hashString(
    `${trade.wallet}-${trade.txHash ?? trade.timestamp ?? ""}`,
  );
  const shares = trade.price > 0 ? trade.amountUsd / trade.price : 0;
  const markMove = 0.08 + (seed % 22) / 100;
  const markPrice = Math.min(
    0.99,
    Math.max(trade.price, trade.price * (1 + markMove)),
  );
  const currentValue = shares * markPrice;
  const pnlUsd = currentValue - trade.amountUsd;
  const pnlPct = trade.amountUsd > 0 ? (pnlUsd / trade.amountUsd) * 100 : 0;
  const pnlPositive = pnlUsd >= 0;
  const outcomeLabel =
    trade.outcome.trim().length > 0 ? trade.outcome.trim() : "—";
  const otherOutcome = oppositeOutcome(outcomeLabel, trade.marketTitle);
  const outcomeButtonLabel =
    (market ? sportsOutcomeAbbr(market, outcomeLabel) : null) ?? outcomeLabel;
  const otherButtonLabel =
    (market ? sportsOutcomeAbbr(market, otherOutcome) : null) ?? otherOutcome;
  const tradedLogo =
    outcomeTeamLogo(market, outcomeLabel) ?? trade.outcomeLogo ?? null;
  const chance = Math.round(Math.max(0, Math.min(1, markPrice)) * 100);
  const [chartRangeId, setChartRangeId] = useState<ChartRangeId>(() => {
    const opened = parseTradeTime(trade.timestamp);
    if (opened == null) return "1d";
    const age = Date.now() / 1000 - opened;
    const fit = CHART_RANGES.find(
      (range) => range.id !== "1h" && age <= range.secs * 0.9,
    );
    return fit?.id ?? "all";
  });
  const chartRangeSecs =
    CHART_RANGES.find((range) => range.id === chartRangeId)?.secs ??
    CHART_RANGES[2].secs;
  const entryChance = outcomeChance(trade.price, trade.outcome, trade.outcome);
  const chartColor = markPrice >= trade.price ? "#00D54B" : "#FF375F";
  const baseHistory = useMemo(
    () =>
      seedChanceHistory(chance, seed, chartRangeSecs, {
        time: parseTradeTime(trade.timestamp),
        percent: entryChance,
      }),
    [chance, seed, chartRangeSecs, trade.timestamp, entryChance],
  );
  const chartTrades = useMemo(() => {
    const seen = new Set(marketTrades.map(tradeItemKey));
    return seen.has(openedTradeKey)
      ? marketTrades
      : [seedTrade, ...marketTrades];
  }, [marketTrades, openedTradeKey, seedTrade]);
  const { points: chanceHistory, markers: chartMarkers } = useMemo(() => {
    const pins = chartTrades.map((item) => ({
      key: tradeItemKey(item),
      time: parseTradeTime(item.timestamp),
      value: outcomeChance(item.price, item.outcome, trade.outcome),
    }));
    return pinTradesOnHistory(baseHistory, pins, openedTradeKey);
  }, [baseHistory, chartTrades, trade.outcome, openedTradeKey]);
  const chartRange = useMemo(
    () => livelineRange(chanceHistory, chance, entryChance),
    [chanceHistory, chance, entryChance],
  );
  const chartSpan = Math.max(
    1,
    (chanceHistory.at(-1)?.time ?? 0) - (chanceHistory[0]?.time ?? 0),
  );

  const closeSheet = () => {
    setOpen(false);
    setDrawerOffset(0);
    setIsDragging(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), 280);
  };

  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;

  useEffect(() => {
    setSelectedTradeKey(openedTradeKey);
  }, [openedTradeKey]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => {
      window.cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheetRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(
          `/api/polymarketscan/wallet/${encodeURIComponent(trade.wallet)}?limit=50`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketWalletProfile;
        if (controller.signal.aborted) return;

        const filtered = (data.recentTrades ?? []).filter((item) =>
          matchesMarket(item, trade),
        );
        const seen = new Set(filtered.map(tradeItemKey));
        const merged = seen.has(openedTradeKey)
          ? filtered
          : [seedTrade, ...filtered];
        setMarketTrades(merged);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load market trades:", error);
        setMarketTrades([seedTrade]);
      }
    };

    void load();
    return () => controller.abort();
  }, [openedTradeKey, seedTrade, trade]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = drawerOffset;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (drawerOffset > CLOSE_THRESHOLD_PX) {
      closeSheet();
      return;
    }
    setDrawerOffset(0);
  };

  return (
    <div className="absolute inset-0 z-30">
      <div
        className={`absolute inset-0 ${ui.backdrop} transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${handle}'s position`}
        className={`absolute inset-x-0 bottom-0 flex max-h-[94%] flex-col overflow-hidden rounded-t-[1.75rem] ${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.45)]`}
        style={{
          transform: open ? `translateY(${drawerOffset}px)` : "translateY(100%)",
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="flex shrink-0 touch-none flex-col px-5 pb-4 pt-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30"
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onOpenWallet();
                closeSheet();
              }}
              aria-label={`Open ${handle}'s profile`}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl text-left transition-opacity hover:opacity-80"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full bg-[#2a2a2e] object-cover"
                />
              ) : (
                <UserAvatar seed={trade.wallet} label={handle} className="h-10 w-10" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight">
                  {handle}
                </p>
                <p className="mt-0.5 truncate text-[12px] tabular-nums text-white/45">
                  {trade.tradeCount !== null ? (
                    <>
                      <span className="font-semibold text-white">
                        {trade.tradeCount.toLocaleString("en-US")}
                      </span>{" "}
                      Trades
                    </>
                  ) : (
                    <span>— Trades</span>
                  )}
                  <span className="text-white/30"> · </span>
                  {trade.winRate !== null ? (
                    <>
                      <span className="font-semibold text-white">
                        {Math.round(trade.winRate)}%
                      </span>{" "}
                      Win Rate
                    </>
                  ) : (
                    <span>— Win Rate</span>
                  )}
                </p>
              </div>
            </button>
            {isOwn ? null : (
              <FollowButton
                following={following}
                onClick={onFollowToggle}
                size="md"
              />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-5 pb-4">
          <section className="rounded-[28px] bg-white/[0.08] px-4 pb-4 pt-5">
            <div className="flex items-center gap-2 px-1">
              {tradedLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tradedLogo}
                  alt=""
                  className="h-5 w-5 shrink-0 object-contain"
                />
              ) : marketImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={marketImage}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-md object-cover"
                />
              ) : null}
              <p className="min-w-0 truncate text-[14px] font-semibold leading-tight">
                {tradedLogo
                  ? outcomeLabel
                  : `${outcomeLabel} · ${trade.marketTitle}`}
              </p>
            </div>

            <p
              className={`mt-2 px-1 text-[38px] font-semibold leading-none tracking-tight tabular-nums ${instrumentSansCondensed.className}`}
            >
              {formatUsdMoney(currentValue)}
            </p>
            <p
              className={`mt-1.5 px-1 text-[14px] font-semibold tabular-nums ${
                pnlPositive ? "text-[#00D54B]" : "text-[#FF375F]"
              }`}
            >
              {formatSignedUsdMoney(pnlUsd)}
            </p>

            <div className="-mx-4 mt-3 h-[168px] overflow-visible" aria-label="Position chance chart">
              {chanceHistory.length >= 2 ? (
                <div className="relative h-full w-full isolate">
                  <ChanceSparkline
                    points={chanceHistory}
                    range={chartRange}
                    color={chartColor}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute h-[2px] -translate-y-1/2"
                    style={{
                      left: CHART_PAD.left,
                      right: CHART_PAD.right,
                      backgroundImage:
                        "radial-gradient(circle, rgba(255,255,255,0.45) 0.9px, transparent 1.2px)",
                      backgroundSize: "6px 2px",
                      backgroundRepeat: "repeat-x",
                      top: `calc(${CHART_PAD.top}px + (100% - ${CHART_PAD.top + CHART_PAD.bottom}px) * ${
                        (chartRange.max - (chanceHistory.at(-1)?.value ?? chance)) /
                        Math.max(0.001, chartRange.max - chartRange.min)
                      })`,
                    }}
                  />
                  {chartMarkers.map((marker) => {
                    const item = chartTrades.find(
                      (tradeItem) => tradeItemKey(tradeItem) === marker.key,
                    );
                    const isBuy =
                      (item?.side ?? trade.side).toUpperCase() === "BUY";
                    const selected = marker.key === selectedTradeKey;
                    const xRatio =
                      (marker.time - (chanceHistory[0]?.time ?? 0)) / chartSpan;
                    const yRatio =
                      (chartRange.max - marker.value) /
                      Math.max(0.001, chartRange.max - chartRange.min);
                    const ring = isBuy ? "#00D54B" : "#FF375F";
                    const left = `calc(${CHART_PAD.left}px + (100% - ${CHART_PAD.left + CHART_PAD.right}px) * ${xRatio})`;
                    const top = `calc(${CHART_PAD.top}px + (100% - ${CHART_PAD.top + CHART_PAD.bottom}px) * ${yRatio})`;
                    return (
                      <button
                        key={marker.key}
                        type="button"
                        onClick={() => setSelectedTradeKey(marker.key)}
                        aria-label={`${isBuy ? "Bought" : "Sold"} at ${formatOdds(item?.price ?? trade.price)}`}
                        aria-pressed={selected}
                        className="absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        style={{
                          left,
                          top,
                          zIndex: selected ? 20 : 10,
                        }}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        >
                          {marker.key === openedTradeKey ? (
                            <span
                              className="absolute h-2.5 w-2.5 rounded-full motion-safe:animate-[entry-pulse_1.8s_cubic-bezier(0,0,0.2,1)_infinite]"
                              style={{ backgroundColor: ring }}
                            />
                          ) : null}
                          <span
                            className={`relative rounded-full ring-2 ring-[#1c1c1e] ${
                              marker.key === openedTradeKey ? "h-2.5 w-2.5" : "h-2 w-2"
                            }`}
                            style={{ backgroundColor: ring }}
                          />
                        </span>
                        {selected ? (
                          <span
                            className="absolute left-1/2 bottom-[calc(50%+9px)] -translate-x-1/2 rounded-full bg-black px-2 py-1 text-[12px] font-semibold tabular-nums leading-none"
                            style={{ color: ring }}
                          >
                            {formatOdds(item?.price ?? trade.price)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div
              className="mt-3 flex items-center justify-between gap-1"
              role="tablist"
              aria-label="Chart range"
            >
              {CHART_RANGES.map((range) => {
                const selected = range.id === chartRangeId;
                return (
                  <button
                    key={range.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setChartRangeId(range.id)}
                    className={`h-9 flex-1 rounded-full text-[14px] font-semibold tabular-nums transition-colors duration-200 ${
                      selected
                        ? "bg-white/[0.14] text-white"
                        : "text-white/45 hover:text-white/75"
                    }`}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                onShare({
                  title: trade.marketTitle,
                  subtitle: outcomeLabel,
                  image: marketImage,
                  handle,
                  wallet: trade.wallet,
                  timestamp: trade.timestamp,
                  invested: trade.amountUsd,
                  entryPrice: trade.price,
                  markPrice,
                  currentValue,
                  pnlUsd,
                  pnlPct,
                  exitLabel: trade.side.toUpperCase() === "SELL" ? "Exit" : "Now",
                  closed: trade.side.toUpperCase() === "SELL",
                  referralCode,
                })
              }
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-[15px] font-semibold text-white"
            >
              <ShareIcon className="h-4 w-4" />
              Share
            </button>
          </section>
        </div>

        <div className="shrink-0 px-5 pb-5 pt-3">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!onTrade}
              onClick={() => onTrade?.(outcomeLabel)}
              className="min-w-0 overflow-hidden rounded-full bg-[#00D54B] px-3 py-3.5 text-[15px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex min-w-0 items-baseline justify-center gap-1">
                <span className="min-w-0 truncate">{outcomeButtonLabel}</span>
                <span className="shrink-0">{chance}%</span>
              </span>
            </button>
            <button
              type="button"
              disabled={!onTrade}
              onClick={() => onTrade?.(otherOutcome)}
              className="min-w-0 overflow-hidden rounded-full bg-[#FF375F] px-3 py-3.5 text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex min-w-0 items-baseline justify-center gap-1">
                <span className="min-w-0 truncate">{otherButtonLabel}</span>
                <span className="shrink-0">
                  {Math.max(0, 100 - chance)}%
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
