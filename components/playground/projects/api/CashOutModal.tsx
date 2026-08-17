"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import type { PolymarketMarketData } from "@/lib/polymarketscan";
import { getMarketOddsSides } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import type { StoredUserTrade } from "./userTrades";
import type { SharePositionPayload } from "./SharePositionModal";
import { useImageAccent } from "./imageAccent";
import { SheetPager } from "./ui";

const CLOSE_THRESHOLD_PX = 72;

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

function formatUsdMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedUsdMoney(value: number): string {
  const formatted = formatUsdMoney(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted.replace("-", "")}`;
  return formatUsdMoney(0);
}

function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function shortenTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 32) return trimmed;
  return `${trimmed.slice(0, 30).trim()}…`;
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

function CashedOutHero({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const id = window.requestAnimationFrame(() => {
      setShown(Math.round(value * 100) / 100);
    });
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center">
      <p className="text-[15px] font-semibold text-white/55">Cashed out</p>
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
          className={`relative z-10 inline-flex items-baseline text-[52px] font-semibold leading-none tracking-tight text-[#00D54B] animate-[trade-win-pop_0.55s_cubic-bezier(0.32,0.72,0,1)_both] ${instrumentSansCondensed.className}`}
        >
          $
          <NumberFlow
            value={shown}
            trend={1}
            format={{
              useGrouping: true,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            style={nfMaskStyle}
          />
        </p>
      </div>
    </div>
  );
}

function outcomeTone(outcome: string): "yes" | "no" | "neutral" {
  const label = outcome.trim().toLowerCase();
  if (label === "yes" || label === "up") return "yes";
  if (label === "no" || label === "down") return "no";
  return "neutral";
}

export default function CashOutModal({
  item,
  market,
  handle,
  referralCode,
  onClose,
  onConfirm,
  onShare,
}: {
  item: StoredUserTrade;
  market: PolymarketMarketData;
  handle: string;
  referralCode: string;
  onClose: () => void;
  onConfirm: (result: {
    price: number;
    amountUsd: number;
    pnlUsd: number;
  }) => void;
  onShare: (payload: SharePositionPayload) => void;
}) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    price: number;
    amountUsd: number;
    pnlUsd: number;
  } | null>(null);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sides = useMemo(() => getMarketOddsSides(market), [market]);
  const liveSide =
    sides.find(
      (side) =>
        side.label.toLowerCase() === item.trade.outcome.toLowerCase(),
    ) ?? null;
  const markPrice = liveSide?.price ?? item.position.markPrice;
  const invested = item.trade.amountUsd;
  const proceeds = item.position.shares * markPrice;
  const pnlUsd = proceeds - invested;
  const tone = outcomeTone(item.trade.outcome);
  const image = item.position.image ?? market.image;
  const accent = useImageAccent(market.image ?? null);

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

  const confirmCashOut = () => {
    const result = { price: markPrice, amountUsd: proceeds, pnlUsd };
    setConfirmed(result);
    onConfirm(result);
    setStep("success");
  };

  const openShare = () => {
    const amount = confirmed?.amountUsd ?? proceeds;
    const exitPrice = confirmed?.price ?? markPrice;
    const sharePnl = confirmed?.pnlUsd ?? pnlUsd;
    onShare({
      title: market.title,
      subtitle: item.trade.outcome,
      image,
      handle,
      wallet: item.trade.wallet,
      timestamp: item.trade.timestamp,
      invested,
      entryPrice: item.position.avgPrice,
      markPrice: exitPrice,
      currentValue: amount,
      pnlUsd: sharePnl,
      pnlPct: invested > 0 ? (sharePnl / invested) * 100 : 0,
      exitLabel: "Exit",
      closed: true,
      referralCode,
    });
  };

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
    <div className="absolute inset-0 z-40">
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
        aria-label={step === "confirm" ? "Cash out" : "Cashed out"}
        className="absolute inset-x-0 bottom-0 flex max-h-[94%] flex-col overflow-hidden rounded-t-[1.75rem] shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        style={{
          backgroundColor: accent,
          transform: open
            ? `translateY(${drawerOffset}px)`
            : "translateY(100%)",
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

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
          <SheetPager step={step} direction={1}>
          {step === "confirm" ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                Cash out
              </h2>

              <div className="rounded-[20px] bg-white/[0.08] p-3.5">
                <div className="flex items-center gap-3">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[12px] font-semibold text-white/40">
                      {market.title.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold leading-snug">
                      {shortenTitle(market.title)}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold tabular-nums text-white/55">
                      {formatOdds(item.position.avgPrice)} →{" "}
                      {formatOdds(markPrice)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                      tone === "yes"
                        ? "bg-[#00D54B] text-black"
                        : tone === "no"
                          ? "bg-[#FF375F] text-white"
                          : "bg-white/10 text-white"
                    }`}
                  >
                    {item.trade.outcome}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[15px] font-medium text-white/55">
                  You receive
                </p>
                <p
                  className={`mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] ${instrumentSansCondensed.className}`}
                >
                  {formatUsdMoney(proceeds)}
                </p>
              </div>

              <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-1">
                <div className="flex items-center justify-between py-3 text-[14px]">
                  <span className="text-white/45">Invested</span>
                  <span className="font-semibold tabular-nums">
                    {formatUsdMoney(invested)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 text-[14px]">
                  <span className="text-white/45">Avg. Entry → Now</span>
                  <span className="font-semibold tabular-nums">
                    {formatOdds(item.position.avgPrice)} →{" "}
                    {formatOdds(markPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.06] py-3 text-[14px]">
                  <span className="font-semibold text-white/70">
                    Current PnL
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      pnlUsd > 0
                        ? "text-[#00D54B]"
                        : pnlUsd < 0
                          ? "text-[#FF375F]"
                          : "text-white/55"
                    }`}
                  >
                    {formatSignedUsdMoney(pnlUsd)}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={confirmCashOut}
                  className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                >
                  Cash out
                </button>
                <p className="mt-2.5 text-center text-[11px] text-white/35">
                  Closes this position at the current price
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center pb-1 pt-2 text-center">
              {confirmed && (
                <div className="w-full">
                  <CashedOutHero value={confirmed.amountUsd} />
                  <p
                    className={`mt-1 text-[13px] font-semibold tabular-nums ${
                      confirmed.pnlUsd > 0
                        ? "text-[#00D54B]"
                        : confirmed.pnlUsd < 0
                          ? "text-[#FF375F]"
                          : "text-white/45"
                    }`}
                  >
                    {confirmed.pnlUsd >= 0
                      ? `${formatSignedUsdMoney(confirmed.pnlUsd)} profit`
                      : `${formatSignedUsdMoney(confirmed.pnlUsd)} loss`}
                  </p>

                  <div className="mt-5 overflow-hidden rounded-[20px] bg-white/[0.08] text-left">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-3">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
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
                          {item.trade.outcome} · {formatOdds(confirmed.price)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#00D54B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#00D54B]">
                        Sold
                      </span>
                    </div>
                    <dl className="flex flex-col gap-1.5 px-3.5 py-3 text-[13px]">
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">Proceeds</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatUsdMoney(confirmed.amountUsd)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">Avg. Entry → Now</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatOdds(item.position.avgPrice)} →{" "}
                          {formatOdds(confirmed.price)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">PnL</dt>
                        <dd
                          className={`font-semibold tabular-nums ${
                            confirmed.pnlUsd > 0
                              ? "text-[#00D54B]"
                              : confirmed.pnlUsd < 0
                                ? "text-[#FF375F]"
                                : "text-white/55"
                          }`}
                        >
                          {formatSignedUsdMoney(confirmed.pnlUsd)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <button
                    type="button"
                    onClick={openShare}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.08] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <ShareIcon className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="mt-2.5 w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    Done
                  </button>
                </div>
              )}
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
