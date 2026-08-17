"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Liveline, type LivelinePoint } from "liveline";
import type {
  PolymarketMarketData,
  PolymarketTradeWithPnl,
  PolymarketWalletProfile,
  PolymarketWalletTrade,
} from "@/lib/polymarketscan";
import { sportsOutcomeAbbr } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import { useImageAccent } from "./imageAccent";
import type { SharePositionPayload } from "./SharePositionModal";
import { ActivityRow, ChipTabs } from "./ui";
import UserAvatar from "./UserAvatar";

const CLOSE_THRESHOLD_PX = 72;

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatUsdPrecise(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedUsd(value: number): string {
  const formatted = formatUsdPrecise(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted.replace("-", "")}`;
  return formatUsdPrecise(0);
}

function formatSignedPercent(value: number): string {
  const abs = Math.abs(value);
  const formatted = `${abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return "0%";
}

function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function formatTimeAgo(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const then = Date.parse(timestamp);
  if (!Number.isFinite(then)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
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

const CHART_PAD = { top: 28, right: 14, bottom: 36, left: 14 } as const;
const MAX_CHART_MARKERS = 8;

function seedChanceHistory(endPercent: number, seed: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: LivelinePoint[] = [];
  const steps = 36;
  const stepSecs = 60 * 30;
  const clampedEnd = Math.max(4, Math.min(96, endPercent));
  let value = Math.max(8, Math.min(88, clampedEnd * 0.58 + (seed % 14)));

  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1);
    const drift = (clampedEnd - value) * (0.05 + progress * 0.1);
    const wave = Math.sin(i * 0.48 + (seed % 11)) * 4.2;
    value = Math.max(4, Math.min(96, value + drift + wave));
    points.push({
      time: now - (steps - 1 - i) * stepSecs,
      value: Math.round(value * 10) / 10,
    });
  }

  points[points.length - 1] = { time: now, value: clampedEnd };
  return points;
}

function livelineRange(
  points: LivelinePoint[],
  currentValue: number,
): { min: number; max: number } {
  let min = currentValue;
  let max = currentValue;
  for (const point of points) {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
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

  for (const [pinIndex, pin] of pins.slice(0, MAX_CHART_MARKERS).entries()) {
    const fallback = t0 + span * (0.22 + ((pinIndex * 0.19) % 0.56));
    let time =
      pin.time == null
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
}: {
  following: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={following}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold leading-none ${
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
  const [tradesStatus, setTradesStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selectedTradeKey, setSelectedTradeKey] = useState(openedTradeKey);
  const accent = useImageAccent(marketImage ?? null);
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
  const chance = Math.round(Math.max(0, Math.min(1, markPrice)) * 100);
  const baseHistory = useMemo(
    () => seedChanceHistory(chance, seed),
    [chance, seed],
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
    return pinTradesOnHistory(baseHistory, pins);
  }, [baseHistory, chartTrades, trade.outcome]);
  const chartRange = useMemo(
    () => livelineRange(chanceHistory, chance),
    [chanceHistory, chance],
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
      setTradesStatus("loading");
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
        setTradesStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load market trades:", error);
        setMarketTrades([seedTrade]);
        setTradesStatus("error");
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
        className={`absolute inset-0 bg-[#6e6e73]/45 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${handle}'s position`}
        className="absolute inset-x-0 bottom-0 flex h-[94%] flex-col overflow-hidden rounded-t-[1.75rem] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        style={{
          backgroundColor: accent,
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
              <UserAvatar seed={trade.wallet} label={handle} className="h-10 w-10" />
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
              <FollowButton following={following} onClick={onFollowToggle} />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
          <section className="rounded-[20px] bg-white/[0.08] px-3.5 pb-3.5 pt-3.5">
            <div className="flex items-start gap-2.5">
              {marketImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={marketImage}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-semibold text-white/40">
                  {trade.marketTitle.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-snug">
                  {trade.marketTitle}
                </p>
                {volume24h !== undefined && volume24h > 0 && (
                  <p className="mt-0.5 text-[11px] text-white/40">
                    Vol. {formatUsd(volume24h)}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-[12px] font-semibold tabular-nums text-white/80">
                {chance}% Chance
              </p>
            </div>

            <div className="-mx-1 mt-2 h-[156px] overflow-visible" aria-label="Position chance chart">
              {chanceHistory.length >= 2 ? (
                <div className="relative h-full w-full isolate">
                  <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                    <Liveline
                      data={chanceHistory}
                      value={chance}
                      theme="dark"
                      color="#00D54B"
                      grid={false}
                      badge={false}
                      pulse={false}
                      momentum={false}
                      scrub={false}
                      fill
                      paused
                      showValue={false}
                      window={60 * 30 * Math.max(chanceHistory.length - 1, 1)}
                      formatValue={(v) => `${Math.round(v)}%`}
                      formatTime={() => ""}
                      padding={CHART_PAD}
                      className="h-full w-full"
                    />
                  </div>
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
                          className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-black"
                          style={{ backgroundColor: ring }}
                        />
                        {selected ? (
                          <span
                            className="absolute left-1/2 bottom-[calc(50%+8px)] -translate-x-1/2 rounded-full bg-black px-1.5 py-[3px] text-[10px] font-semibold tabular-nums leading-none"
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

            <div className="mt-1 flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-[28px] font-semibold leading-none tracking-tight tabular-nums ${instrumentSansCondensed.className}`}
                >
                  {formatUsdPrecise(currentValue)}
                </p>
                <p className="mt-1.5 text-[12px] tabular-nums text-white/45">
                  {shares.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
                  Shares
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-[15px] font-semibold tabular-nums ${
                    pnlPositive ? "text-[#00D54B]" : "text-[#FF375F]"
                  }`}
                >
                  {formatSignedUsd(pnlUsd)}
                </p>
                <p
                  className={`mt-1.5 text-[12px] font-semibold tabular-nums ${
                    pnlPositive ? "text-[#00D54B]" : "text-[#FF375F]"
                  }`}
                >
                  {formatSignedPercent(pnlPct)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
              <span>
                Invested{" "}
                <span className="tabular-nums text-white/70">
                  {formatUsdPrecise(trade.amountUsd)}
                </span>
              </span>
              <span>
                Avg. Entry{" "}
                <span className="tabular-nums text-white/70">
                  {formatOdds(trade.price)}
                </span>
              </span>
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
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-[13px] font-semibold text-white"
            >
              <ShareIcon className="h-3.5 w-3.5" />
              Share
            </button>
          </section>

          <div className="mt-4">
            <ChipTabs
              ariaLabel="Market trades"
              value="trades"
              onChange={() => {}}
              tabs={
                [
                  {
                    id: "trades",
                    label: "Trades",
                    count:
                      marketTrades.length > 0 ? marketTrades.length : undefined,
                  },
                ] as const
              }
            />
          </div>

          {tradesStatus === "loading" && (
            <div className="space-y-2 animate-pulse" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[58px] rounded-xl bg-white/10" />
              ))}
            </div>
          )}

          {tradesStatus !== "loading" && marketTrades.length === 0 && (
            <p className="text-[13px] text-white/45">
              No trades in this market yet.
            </p>
          )}

          {tradesStatus !== "loading" && marketTrades.length > 0 && (
            <ul className="divide-y divide-white/[0.06]">
              {marketTrades.map((item, index) => {
                const isBuy = item.side.toUpperCase() === "BUY";
                const timeAgo = formatTimeAgo(item.timestamp);
                const amountUsd = item.size * item.price;
                const key = tradeItemKey(item);
                return (
                  <li key={`${key}-${index}`}>
                    <ActivityRow
                      leading={
                        marketImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={marketImage}
                            alt=""
                            className="h-11 w-11 rounded-2xl object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[13px] font-semibold ${
                              isBuy
                                ? "bg-[#00D54B]/15 text-[#00D54B]"
                                : "bg-[#FF375F]/15 text-[#FF375F]"
                            }`}
                          >
                            {isBuy ? "B" : "S"}
                          </div>
                        )
                      }
                      title={item.marketTitle}
                      subtitle={`${item.side} · ${item.outcome} · ${formatOdds(item.price)}${timeAgo ? ` · ${timeAgo}` : ""}`}
                      trailing={
                        <span className="text-[16px] font-semibold tabular-nums">
                          {formatUsd(amountUsd)}
                        </span>
                      }
                      onClick={() => setSelectedTradeKey(key)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="shrink-0 px-5 pb-5 pt-3"
          style={{ backgroundColor: accent }}
        >
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
