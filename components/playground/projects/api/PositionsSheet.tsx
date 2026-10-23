"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PolymarketWalletPosition } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import { ChipTabs, ui } from "./ui";

type PositionsTab = "active" | "orders" | "history";

const CLOSE_THRESHOLD_PX = 72;
const TRACK_CENTS = 100;
const IMG_SHARE = "/playground/bubbly/share.svg";
const IMG_STRIPE = "/playground/bubbly/stripe.svg";
const STRIPES = Array.from({ length: 28 }, (_, i) => -90 + i * 10);

const FILL_BELOW = "#AC1D2B";
const FILL_ABOVE = "#106F25";
const LIQ_COLOR = "#FF4D5E";
const PNL_DOWN = "#ff4d5e";
const PNL_UP = "#5dd978";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatUsd(n: number) {
  return Math.round(Math.abs(n)).toLocaleString("en-US");
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

function positionInvested(position: PolymarketWalletPosition) {
  return Math.max(0, position.valueUsd - position.pnlUsd);
}

export function BubblyPositionCard({
  position,
  onOpen,
  onCashOut,
  onShare,
}: {
  position: PolymarketWalletPosition;
  /** Omit when already on the market page. */
  onOpen?: () => void;
  onCashOut?: () => void;
  onShare?: () => void;
}) {
  const invested = positionInvested(position);
  const cashOut = Math.max(0, position.valueUsd);
  const pnl = Math.round(position.pnlUsd);
  const toWin = Math.max(cashOut, Math.round(position.shares));
  const entryCents = clamp(Math.round(position.avgPrice * 100), 2, 98);
  const priceCents = clamp(Math.round(position.markPrice * 100), 1, 99);
  // Soft liquidation pocket for levered-feel UI — scales with entry.
  const liqCents = clamp(Math.round(entryCents * 0.55), 1, entryCents - 1);
  const belowEntry = priceCents < entryCents;
  const liqGap = priceCents - liqCents;
  const danger =
    belowEntry && liqGap < 14 ? clamp(1 - Math.max(0, liqGap) / 14, 0, 1) : 0;
  const win =
    priceCents <= entryCents
      ? 0
      : (priceCents - entryCents) / Math.max(1, TRACK_CENTS - entryCents);
  const fillColor = belowEntry ? FILL_BELOW : FILL_ABOVE;
  const glowColor = belowEntry ? "#d42e3e" : "#1f8f45";
  const glowBlur = belowEntry ? 14 + danger * 18 : 10 + win * 20;
  const outcome = position.outcome.trim() || "YES";

  return (
    <article
      className="flex w-full flex-col gap-3 rounded-[22px] bg-white/[0.06] p-3.5 backdrop-blur-[14px]"
      aria-label={`${outcome} position on ${position.marketTitle}`}
    >
      <header className="flex w-full items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="flex min-w-0 flex-1 flex-col items-start gap-2 text-left disabled:cursor-default"
        >
          <p className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[0.2px] text-white">
            {position.marketTitle}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center justify-center rounded-lg bg-[#214a2a] px-2 py-0.5 text-[11px] font-semibold uppercase leading-[1.25] text-white">
              {outcome}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-normal leading-[1.25]">
              <span className="text-white">${formatUsd(invested)}</span>
              <span className="text-white/55">→</span>
              <span className="text-white">${formatUsd(toWin)}</span>
            </span>
          </div>
        </button>

        <div className="flex shrink-0 items-start gap-2.5">
          <div className="flex min-w-[72px] flex-col items-end text-right leading-[1.2]">
            <span className="text-[11px] font-normal text-white/55">PnL</span>
            <p
              className={`text-[28px] font-semibold tabular-nums ${instrumentSansCondensed.className}`}
              style={{ color: pnl < 0 ? PNL_DOWN : PNL_UP }}
            >
              <span className="inline-flex items-baseline justify-end">
                <span>{pnl < 0 ? "-$" : "+$"}</span>
                <NumberFlow
                  value={Math.abs(pnl)}
                  trend={0}
                  format={{ useGrouping: true }}
                  className="tabular-nums text-inherit"
                  style={{ ["--number-flow-mask-height" as string]: "0em" }}
                />
              </span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Share position"
            onClick={onShare}
            className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.97]"
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-white/[0.02]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMG_SHARE}
              alt=""
              width={16}
              height={16}
              className="pointer-events-none relative max-w-none"
              draggable={false}
            />
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="relative h-[72px] w-full overflow-hidden rounded-[14px] text-left disabled:cursor-default"
      >
        <div className="absolute inset-0 bg-white/[0.04]" />
        <div
          className="absolute inset-y-0 left-0 rounded-[14px] motion-reduce:transition-none"
          style={{
            width: `${(priceCents / TRACK_CENTS) * 100}%`,
            backgroundColor: fillColor,
            transition:
              "width 700ms ease-out, background-color 180ms ease-out",
          }}
        />
        <div
          className={`pointer-events-none absolute top-0.5 z-20 w-max max-w-none -translate-x-full pr-1.5 text-right text-[28px] font-semibold leading-[1.2] whitespace-nowrap text-white ${instrumentSansCondensed.className}`}
          style={{
            left: `max(3.25rem, ${(priceCents / TRACK_CENTS) * 100}%)`,
            transition: "left 700ms ease-out",
          }}
        >
          <NumberFlow
            value={priceCents}
            trend={0}
            suffix="¢"
            className="tabular-nums text-inherit"
            style={{ ["--number-flow-mask-height" as string]: "0em" }}
          />
        </div>

        <div
          className="pointer-events-none absolute left-1 top-1 z-[1] h-[64px] overflow-hidden rounded-md"
          style={{
            width: `calc(${(liqCents / TRACK_CENTS) * 100}% - 6px)`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: LIQ_COLOR }}
          />
          <div className="positions-bubbly-hatch absolute inset-0 motion-reduce:transform-none">
            {STRIPES.map((left) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={left}
                src={IMG_STRIPE}
                alt=""
                width={90}
                height={90}
                draggable={false}
                className="pointer-events-none absolute top-1/2 max-w-none -translate-y-1/2 opacity-20"
                style={{ left, width: 90, height: 90 }}
              />
            ))}
          </div>
          <div className="absolute right-1.5 bottom-1.5 z-20 flex flex-col items-end justify-end text-right leading-[1.15]">
            <span className="text-[9px] font-semibold text-white/60">Liq.</span>
            <span className="text-[13px] font-semibold tracking-[0.2px] text-white">
              {liqCents}¢
            </span>
          </div>
        </div>

        <div
          className="absolute top-0 h-full"
          style={{ left: `${entryCents}%` }}
        >
          <div className="absolute left-0 top-1/2 h-[56px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white/25" />
          <div className="absolute left-[5px] bottom-1.5 flex flex-col items-start justify-end leading-[1.15]">
            <span className="text-[9px] font-semibold text-white/60">Entry</span>
            <span className="text-[13px] font-semibold tracking-[0.2px] whitespace-nowrap text-white">
              {entryCents}¢
            </span>
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCashOut?.();
        }}
        className="relative h-11 w-full overflow-hidden rounded-full border border-white/10 text-[14px] font-semibold leading-[1.25] text-white transition-[transform,filter] duration-150 ease-out hover:brightness-110 active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-white/[0.04]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] motion-reduce:transition-none"
          style={{
            boxShadow: `inset 0 0 ${glowBlur}px ${glowColor}`,
            transition: "box-shadow 200ms ease-out",
          }}
        />
        {danger > 0.15 ? (
          <span
            aria-hidden
            className="positions-bubbly-danger pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ opacity: 0.35 + danger * 0.65 }}
          />
        ) : null}
        <span className="relative inline-flex items-baseline gap-1">
          <span>Cash Out</span>
          <span>{formatUsdPrecise(cashOut)}</span>
        </span>
      </button>
    </article>
  );
}

export default function PositionsSheet({
  positions,
  loading,
  onClose,
  onOpenPosition,
  onCashOut,
  history,
}: {
  positions: PolymarketWalletPosition[];
  loading?: boolean;
  onClose: () => void;
  onOpenPosition: (position: PolymarketWalletPosition) => void;
  onCashOut?: (position: PolymarketWalletPosition) => void;
  /** Rendered transaction history for the History tab. */
  history?: ReactNode;
}) {
  const [tab, setTab] = useState<PositionsTab>("active");
  const [open, setOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheetRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button,a,[role='button']")) {
      return;
    }
    setIsDragging(true);
    dragStartY.current = event.clientY;
    dragStartOffset.current = drawerOffset;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = event.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
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
        className={`absolute inset-0 ${ui.backdrop} transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Positions"
        className={`absolute inset-x-0 bottom-0 flex h-[92%] flex-col overflow-hidden rounded-t-[1.75rem] ${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.5)]`}
        style={{
          transform: open
            ? `translateY(${drawerOffset}px)`
            : "translateY(100%)",
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="flex shrink-0 touch-none flex-col px-5 pb-3 pt-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/30"
          />
          <h2 className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-white">
            Positions
          </h2>
          <div className="mt-4">
            <ChipTabs
              tabs={[
                { id: "active", label: "Active", count: positions.length },
                { id: "orders", label: "Open Orders" },
                { id: "history", label: "History" },
              ]}
              value={tab}
              onChange={setTab}
              ariaLabel="Positions"
              underline
              fullWidth
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-1">
          {tab === "orders" && (
            <p className="px-1 pt-6 text-sm text-white/55">
              No open orders.
            </p>
          )}
          {tab === "history" &&
            (history ?? (
              <p className="px-1 pt-6 text-sm text-white/55">
                No transactions yet.
              </p>
            ))}
          {tab === "active" && loading && positions.length === 0 && (
            <div className="space-y-3 animate-pulse" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[220px] rounded-[22px] bg-white/[0.06]"
                />
              ))}
            </div>
          )}
          {tab === "active" && !loading && positions.length === 0 && (
            <p className="px-1 pt-6 text-sm text-white/55">
              No open positions yet.
            </p>
          )}
          {tab === "active" && positions.length > 0 && (
            <ul className="flex flex-col gap-3">
              {positions.map((position, index) => (
                <li
                  key={`${position.marketSlug ?? position.marketTitle}-${position.outcome}-${index}`}
                >
                  <BubblyPositionCard
                    position={position}
                    onOpen={() => {
                      onOpenPosition(position);
                      closeSheet();
                    }}
                    onCashOut={
                      onCashOut
                        ? () => {
                            onCashOut(position);
                            closeSheet();
                          }
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
