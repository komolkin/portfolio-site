"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import type { PolymarketMarketData } from "@/lib/polymarketscan";
import { getMarketOddsSides, sportsOutcomeAbbr } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import type { UserPlacedTrade } from "./userTrades";
import type { PolymarketWalletPosition } from "@/lib/polymarketscan";
import type { SharePositionPayload } from "./SharePositionModal";
import { useImageAccent } from "./imageAccent";
import { MessageComposer } from "./richMessage";
import { SheetPager } from "./ui";

const CLOSE_THRESHOLD_PX = 72;
const DEFAULT_AMOUNT = 25;

const nfMaskStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

const WIN_SPARKLES = [
  { top: "2%", left: "4%", size: 12, delay: "0ms", color: "#E8C44A" },
  { top: "8%", right: "2%", size: 9, delay: "120ms", color: "#00D54B" },
  { top: "42%", left: "-2%", size: 7, delay: "220ms", color: "#FFFFFF" },
  { top: "48%", right: "-4%", size: 11, delay: "80ms", color: "#E8C44A" },
  { bottom: "6%", left: "10%", size: 8, delay: "180ms", color: "#00D54B" },
  { bottom: "0%", right: "12%", size: 10, delay: "260ms", color: "#FFFFFF" },
  { top: "-6%", left: "42%", size: 8, delay: "40ms", color: "#E8C44A" },
  { bottom: "-8%", left: "48%", size: 7, delay: "300ms", color: "#00D54B" },
] as const;

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatUsdPrecise(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function shortenTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 32) return trimmed;
  return `${trimmed.slice(0, 30).trim()}…`;
}

function tabLabelForSide(
  side: { label: string; side: "yes" | "no" },
  title: string,
  market: PolymarketMarketData,
): string {
  const abbr = sportsOutcomeAbbr(market, side.label);
  if (abbr) return abbr;
  if (side.label.trim().toLowerCase() === title.trim().toLowerCase()) {
    return side.side === "yes" ? "Yes" : "No";
  }
  return side.label;
}

function SparkleIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 0.4 7.15 4.85 11.6 6 7.15 7.15 6 11.6 4.85 7.15 0.4 6 4.85 4.85Z" />
    </svg>
  );
}

function ToWinHero({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const id = window.requestAnimationFrame(() => {
      setShown(Math.round(value));
    });
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center">
      <p className="text-[15px] font-semibold text-white">To win</p>
      <div className="relative mt-1.5 inline-flex items-baseline px-7 py-3">
        {WIN_SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            aria-hidden
            className="pointer-events-none absolute animate-[trade-sparkle_1.15s_ease-out_both]"
            style={{
              top: "top" in sparkle ? sparkle.top : undefined,
              bottom: "bottom" in sparkle ? sparkle.bottom : undefined,
              left: "left" in sparkle ? sparkle.left : undefined,
              right: "right" in sparkle ? sparkle.right : undefined,
              color: sparkle.color,
              animationDelay: sparkle.delay,
              filter:
                sparkle.color === "#FFFFFF"
                  ? undefined
                  : `drop-shadow(0 0 4px ${sparkle.color})`,
            }}
          >
            <SparkleIcon size={sparkle.size} />
          </span>
        ))}
        <p
          className={`relative z-10 inline-flex items-baseline text-[64px] font-semibold leading-none tracking-tight text-[#00D54B] animate-[trade-win-pop_0.55s_cubic-bezier(0.32,0.72,0,1)_both] ${instrumentSansCondensed.className}`}
        >
          $
          <NumberFlow
            value={shown}
            trend={1}
            format={{ useGrouping: true }}
            style={nfMaskStyle}
          />
        </p>
      </div>
    </div>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 10V3M8 3 5.5 5.5M8 3l2.5 2.5M3.5 9v3.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TradeFlowModal({
  market,
  initialOutcome,
  wallet,
  handle,
  referralCode,
  maxAmount,
  nested = false,
  onClose,
  onComplete,
  onShare,
}: {
  market: PolymarketMarketData;
  initialOutcome: string | null;
  wallet: string;
  handle: string;
  referralCode: string;
  maxAmount: number;
  nested?: boolean;
  onClose: () => void;
  onComplete: (
    trade: UserPlacedTrade,
    position: PolymarketWalletPosition,
  ) => void;
  onShare: (payload: SharePositionPayload) => void;
}) {
  const oddsSides = useMemo(() => getMarketOddsSides(market), [market]);
  const [step, setStep] = useState<"form" | "success">("form");
  const [outcome, setOutcome] = useState(
    initialOutcome ?? oddsSides[0]?.label ?? "Yes",
  );
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [amountDraft, setAmountDraft] = useState(String(DEFAULT_AMOUNT));
  const [amountFocused, setAmountFocused] = useState(false);
  const [takeMessage, setTakeMessage] = useState("");
  const [takeGif, setTakeGif] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [completed, setCompleted] = useState<{
    trade: UserPlacedTrade;
    position: PolymarketWalletPosition;
  } | null>(null);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const accent = useImageAccent(market.image);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const selectedSide =
    oddsSides.find(
      (side) => side.label.toLowerCase() === outcome.toLowerCase(),
    ) ?? oddsSides[0];
  const entryPrice = selectedSide?.price ?? market.yesPrice;
  const headerTitle =
    (market.groupItemTitle ?? "").trim() || shortenTitle(market.title);
  const selectedIndex = Math.max(
    0,
    oddsSides.findIndex(
      (side) => side.label.toLowerCase() === outcome.toLowerCase(),
    ),
  );
  const shares = entryPrice > 0 ? amount / entryPrice : 0;
  const toWin = shares;

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
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheetRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const commitAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = Math.min(
      Math.floor(maxAmount),
      Math.max(1, digits === "" ? 1 : Number(digits)),
    );
    setAmount(next);
    setAmountDraft(String(next));
    return next;
  };

  const addAmount = (delta: number) => {
    setAmount((prev) => {
      const next = Math.min(Math.floor(maxAmount), Math.max(1, prev + delta));
      setAmountDraft(String(next));
      return next;
    });
  };

  const setMaxAmount = () => {
    const next = Math.max(1, Math.floor(maxAmount));
    setAmount(next);
    setAmountDraft(String(next));
  };

  const submitTrade = () => {
    const finalAmount = commitAmount(amountDraft);
    const finalShares = entryPrice > 0 ? finalAmount / entryPrice : 0;
    const caption = takeMessage.trim() || null;
    const trade: UserPlacedTrade = {
      side: "BUY",
      outcome,
      price: entryPrice,
      amountUsd: finalAmount,
      marketTitle: market.title,
      marketSlug: market.slug || market.marketId,
      marketCategory: market.category,
      wallet,
      timestamp: new Date().toISOString(),
      txHash: `local-${Date.now()}`,
      totalPnl: null,
      winRate: null,
      tradeCount: null,
      userCaption: caption,
      userGifUrl: takeGif,
    };
    const position: PolymarketWalletPosition = {
      marketTitle: market.title,
      marketSlug: market.slug || market.marketId,
      outcome,
      shares: finalShares,
      avgPrice: entryPrice,
      markPrice: entryPrice,
      valueUsd: finalShares * entryPrice,
      pnlUsd: 0,
      image: market.image,
    };
    setCompleted({ trade, position });
    onComplete(trade, position);
    setStep("success");
  };

  const openShare = () => {
    if (!completed) return;
    onShare({
      title: market.title,
      subtitle: completed.trade.outcome,
      image: market.image,
      handle,
      wallet,
      timestamp: completed.trade.timestamp,
      invested: completed.trade.amountUsd,
      entryPrice: completed.trade.price,
      markPrice: completed.position.markPrice,
      currentValue: completed.position.valueUsd,
      pnlUsd: completed.position.pnlUsd,
      pnlPct:
        completed.trade.amountUsd > 0
          ? (completed.position.pnlUsd / completed.trade.amountUsd) * 100
          : 0,
      exitLabel: "Now",
      closed: false,
      referralCode,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
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
    <div className="absolute inset-0 z-40">
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          nested ? "bg-transparent" : "bg-[#6e6e73]/45"
        } ${open ? "opacity-100" : "opacity-0"}`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step === "form" ? "Place trade" : "Trade placed"}
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
          className="flex shrink-0 touch-none flex-col px-5 pb-1 pt-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <SheetPager step={step} direction={1} fill>
            {step === "form" ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                {market.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={market.image}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-semibold text-white/40">
                    {headerTitle.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-[-0.02em]">
                  {headerTitle}
                </h2>
              </div>

              <div
                className="relative grid rounded-full bg-white/[0.08] p-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(oddsSides.length, 1)}, minmax(0, 1fr))`,
                }}
                role="tablist"
                aria-label="Outcome"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-y-1 left-1 rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    selectedSide?.side === "yes"
                      ? "bg-[#00D54B]"
                      : "bg-[#FF375F]"
                  }`}
                  style={{
                    width: `calc((100% - 0.5rem) / ${Math.max(oddsSides.length, 1)})`,
                    transform: `translateX(${selectedIndex * 100}%)`,
                  }}
                />
                {oddsSides.map((side) => {
                  const active =
                    outcome.toLowerCase() === side.label.toLowerCase();
                  return (
                    <button
                      key={side.side}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setOutcome(side.label)}
                      className={`relative z-10 truncate rounded-full py-3 text-[15px] transition-colors ${
                        active && side.side === "yes"
                          ? "text-black"
                          : "text-white"
                      }`}
                    >
                      <span className="font-semibold">
                        {tabLabelForSide(side, headerTitle, market)}
                      </span>{" "}
                      <span className="font-medium tabular-nums">
                        {formatOdds(side.price)}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12px] font-medium text-white/45">Amount</p>
                  <label
                    className={`inline-flex cursor-text items-baseline text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white ${instrumentSansCondensed.className}`}
                    onClick={() => amountInputRef.current?.focus()}
                  >
                    <input
                      ref={amountInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label="Trade amount in dollars"
                      value={
                        amountFocused
                          ? amountDraft
                          : amount.toLocaleString("en-US")
                      }
                      size={Math.max(
                        2,
                        (amountFocused
                          ? amountDraft
                          : amount.toLocaleString("en-US")
                        ).length,
                      )}
                      onFocus={(e) => {
                        setAmountFocused(true);
                        setAmountDraft(String(amount));
                        requestAnimationFrame(() => e.target.select());
                      }}
                      onBlur={() => {
                        setAmountFocused(false);
                        commitAmount(amountDraft);
                      }}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setAmountDraft(digits);
                        if (digits === "") return;
                        const next = Math.min(
                          Math.floor(maxAmount),
                          Number(digits),
                        );
                        if (Number.isFinite(next)) setAmount(Math.max(0, next));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          amountInputRef.current?.blur();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          setAmountDraft(String(amount));
                          amountInputRef.current?.blur();
                        }
                      }}
                      className="min-w-[2ch] bg-transparent text-right text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white outline-none caret-[#00D54B]"
                    />
                    <span aria-hidden>$</span>
                  </label>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {[1, 5, 10, 100].map((increment) => (
                    <button
                      key={increment}
                      type="button"
                      onClick={() => addAmount(increment)}
                      className="min-w-0 flex-1 rounded-full bg-white/[0.1] py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/15"
                    >
                      +{increment}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={setMaxAmount}
                    className="min-w-0 flex-1 rounded-full bg-white/[0.1] py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/15"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-white/45">Avg. Entry</span>
                  <span className="font-semibold tabular-nums">
                    <NumberFlow
                      value={Math.round(entryPrice * 100)}
                      suffix="¢"
                      trend={0}
                      style={nfMaskStyle}
                    />
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-white/45">Shares</span>
                  <span className="font-semibold tabular-nums">
                    <NumberFlow
                      value={Math.round(shares)}
                      trend={0}
                      format={{ useGrouping: true }}
                      style={nfMaskStyle}
                    />
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <span className="text-[15px] font-medium text-white/55">
                    To win
                  </span>
                  <span
                    className={`inline-flex items-baseline text-[32px] font-semibold leading-none tabular-nums text-[#00D54B] ${instrumentSansCondensed.className}`}
                  >
                    $
                    <NumberFlow
                      value={Math.round(toWin)}
                      trend={0}
                      format={{ useGrouping: true }}
                      style={nfMaskStyle}
                    />
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">
                  Take{" "}
                  <span className="normal-case tracking-normal text-white/30">
                    (optional)
                  </span>
                </p>
                <MessageComposer
                  text={takeMessage}
                  gifUrl={takeGif}
                  onTextChange={setTakeMessage}
                  onGifChange={setTakeGif}
                  placeholder="Share why you're taking this trade…"
                />
                <p className="mt-1.5 text-[11px] text-white/35">
                  {takeMessage.trim() || takeGif
                    ? "Your trade will appear in the Feed."
                    : "Without a take, this stays on your Profile only."}
                </p>
              </div>
            </div>
                </div>
                <div
                  className="shrink-0 border-t border-white/[0.06] px-5 pb-5 pt-3"
                  style={{ backgroundColor: accent }}
                >
                  <button
                    type="button"
                    onClick={submitTrade}
                    className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    Buy
                  </button>
                  <p className="mt-2.5 text-center text-[11px] text-white/35">
                    One-time trade · You&apos;ll manage the exit
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            <div className="flex flex-col items-center pb-2 pt-3 text-center">
              {completed && (
                <div className="w-full">
                  <ToWinHero value={toWin} />
                  <p className="mt-1 text-[13px] text-white/45">
                    Invested {formatUsd(completed.trade.amountUsd)}
                  </p>

                  <div className="mt-5 overflow-hidden rounded-[20px] bg-white/[0.08] text-left">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-3">
                      {market.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={market.image}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[12px] font-semibold text-white/40">
                          {market.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">
                          {shortenTitle(market.title)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-white/40">
                          {completed.trade.outcome} ·{" "}
                          {formatOdds(completed.trade.price)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#00D54B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#00D54B]">
                        Bought
                      </span>
                    </div>
                    <dl className="flex flex-col gap-1.5 px-3.5 py-3 text-[13px]">
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">Shares</dt>
                        <dd className="font-semibold tabular-nums">
                          {Math.round(
                            completed.position.shares,
                          ).toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">Avg. entry</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatOdds(completed.trade.price)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">To win</dt>
                        <dd className="font-semibold tabular-nums text-[#00D54B]">
                          {formatUsd(toWin)}
                        </dd>
                      </div>
                    </dl>
                    {(completed.trade.userCaption ||
                      completed.trade.userGifUrl) && (
                      <div className="border-t border-white/[0.06] px-3.5 py-3">
                        {completed.trade.userCaption ? (
                          <p className="text-[13px] leading-snug text-white/75">
                            &ldquo;{completed.trade.userCaption}&rdquo;
                          </p>
                        ) : null}
                        {completed.trade.userGifUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={completed.trade.userGifUrl}
                            alt=""
                            className={`max-h-[120px] w-auto rounded-[12px] object-cover ${
                              completed.trade.userCaption ? "mt-2" : ""
                            }`}
                          />
                        ) : null}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openShare}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.08] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <ShareIcon className="h-4 w-4" />
                    Share position
                  </button>
                </div>
              )}
            </div>
                </div>
                <div
                  className="shrink-0 border-t border-white/[0.06] px-5 pb-5 pt-3"
                  style={{ backgroundColor: accent }}
                >
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </SheetPager>
        </div>
      </div>
      <style>{`
        @keyframes trade-win-pop {
          0% { opacity: 0; transform: scale(0.82); }
          70% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes trade-sparkle {
          0% { opacity: 0; transform: scale(0.2) rotate(-20deg); }
          35% { opacity: 1; transform: scale(1.15) rotate(8deg); }
          100% { opacity: 0.35; transform: scale(0.85) rotate(0deg); }
        }
        @keyframes trade-success-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
