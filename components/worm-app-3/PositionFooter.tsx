"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { hapticStep, hapticSuccess } from "@/lib/haptics";

export type PositionOutcome = "Yes" | "No";

export type PlacedPosition = {
  marketId: string;
  outcome: PositionOutcome;
  stake: number;
  entryPercent: number;
};

export const YES_COLOR = "#1DB954";
export const NO_COLOR = "#FF3B5C";
export const MIN_POSITION_STAKE = 5;
export const POSITION_ADJUST_STEP = 5;

/**
 * Mark-to-market value at the current chance of your outcome.
 * At entry ≈ stake; at 100% = full to-win (stake / entry%).
 */
export function cashOutValue(position: PlacedPosition, currentPercent: number) {
  if (position.entryPercent <= 0) return position.stake;
  return (
    position.stake * (Math.max(1, currentPercent) / position.entryPercent)
  );
}

function formatCashUsd(value: number) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  if (safe >= 100) return `$${Math.round(safe).toLocaleString("en-US")}`;
  return `$${safe.toFixed(safe >= 10 ? 0 : 2).replace(/\.00$/, "")}`;
}

/** Under $100 always include cents (for live mark-to-market readout). */
function formatCashUsdPrecise(value: number) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  if (safe >= 100) return `$${Math.round(safe).toLocaleString("en-US")}`;
  return `$${safe.toFixed(2)}`;
}

const nfMaskStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

function FlowUsd({
  value,
  className,
  centsClassName,
  showCents = false,
}: {
  value: number;
  className?: string;
  centsClassName?: string;
  /** When true and value is under $100, render dimmable cents. */
  showCents?: boolean;
}) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  const withCents = showCents && safe < 100;

  if (!withCents) {
    return (
      <span className={`inline-flex items-baseline ${className ?? ""}`}>
        $
        <NumberFlow
          value={Math.round(safe)}
          trend={0}
          format={{ useGrouping: true, maximumFractionDigits: 0 }}
          style={nfMaskStyle}
        />
      </span>
    );
  }

  let whole = Math.floor(safe);
  let cents = Math.round((safe - whole) * 100);
  if (cents >= 100) {
    whole += 1;
    cents = 0;
  }

  return (
    <span className={`inline-flex items-baseline ${className ?? ""}`}>
      $
      <NumberFlow
        value={whole}
        trend={0}
        format={{ useGrouping: true, maximumFractionDigits: 0 }}
        style={nfMaskStyle}
      />
      <span className={centsClassName}>
        .
        <NumberFlow
          value={cents}
          trend={0}
          format={{
            minimumIntegerDigits: 2,
            maximumFractionDigits: 0,
            useGrouping: false,
          }}
          style={nfMaskStyle}
        />
      </span>
    </span>
  );
}

function FlowPercent({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <NumberFlow
      value={Math.round(value)}
      suffix="%"
      trend={0}
      className={className}
      style={nfMaskStyle}
    />
  );
}

/** Stable slight sticker tilt from market + outcome (−7°…7°). */
function outcomeStickerTilt(marketId: string, outcome: PositionOutcome) {
  const key = `${marketId}:${outcome}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 15) - 7;
}

export function PositionFooter({
  position,
  currentPercent,
  video,
  canIncrease,
  cashingOut,
  stickerReady,
  onCashOut,
  onAdjust,
  className,
}: {
  position: PlacedPosition;
  currentPercent: number;
  video: boolean;
  canIncrease: boolean;
  cashingOut: boolean;
  /** False while the success sheet is open — sticker lands when it becomes true. */
  stickerReady: boolean;
  onCashOut: () => void;
  onAdjust: (delta: number) => void;
  className?: string;
}) {
  const displayPercent = Math.round(currentPercent);
  const stakeLabel = formatCashUsd(position.stake);
  // Mark-to-market: equals stake near entry, reaches full to-win only at 100%.
  const valueNow = cashOutValue(position, currentPercent);
  const valueLabel = formatCashUsdPrecise(valueNow);
  const valueTone = video ? "text-white" : "text-black";
  const valueCentsTone = video ? "text-white/45" : "text-black/35";
  const fill = Math.max(4, Math.min(100, currentPercent));
  const entryMark = Math.max(1, Math.min(99, position.entryPercent));
  const entryOverFill = entryMark <= fill;
  const canDecrease = position.stake > MIN_POSITION_STAKE;
  const isYes = position.outcome === "Yes";
  const stickerTilt = outcomeStickerTilt(position.marketId, position.outcome);
  const stickerColor = isYes ? YES_COLOR : NO_COLOR;
  const actionBtn = `flex h-[52px] items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-200 ease-out active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
    video ? "bg-white/[0.06] text-white" : "bg-black/[0.06] text-black"
  }`;

  return (
    <div
      className={`relative z-[2] flex flex-col gap-3 ${
        className ?? (video ? "mt-auto" : "mt-8")
      }`}
    >
      <div className="min-w-0">
        <div className="mb-1 flex min-h-[51px] items-end">
          <AnimatePresence initial={false}>
            {stickerReady ? (
              <motion.p
                key={`${position.marketId}-${position.outcome}`}
                aria-label={position.outcome}
                initial={{ scale: 1.72, opacity: 0, rotate: stickerTilt - 4 }}
                animate={{ scale: 1, opacity: 1, rotate: stickerTilt }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 460,
                  damping: 16,
                  mass: 0.72,
                  opacity: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
                }}
                className="inline-flex w-fit origin-left select-none items-center rounded-[14px] px-3.5 py-1.5 text-[34px] font-extrabold leading-none tracking-[-0.05em] text-white"
                style={{ backgroundColor: stickerColor }}
              >
                {position.outcome}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
        <p
          aria-label={`${stakeLabel} → ${valueLabel}`}
          className={`mt-1 text-[40px] font-semibold leading-none tabular-nums tracking-[-0.03em] ${
            video ? "text-white/70" : "text-black/45"
          }`}
        >
          <span
            aria-hidden="true"
            className="inline-flex items-baseline gap-x-1.5 tracking-normal"
          >
            <FlowUsd value={position.stake} className={valueTone} />
            <span
              className={`shrink-0 ${
                video ? "text-white/55" : "text-black/35"
              }`}
            >
              →
            </span>
            <FlowUsd
              value={valueNow}
              showCents
              className={valueTone}
              centsClassName={valueCentsTone}
            />
          </span>
        </p>
      </div>

      <div
        className={`relative h-7 rounded-full ${
          video ? "bg-white/[0.1]" : "bg-black/[0.06]"
        }`}
        aria-label={`${displayPercent}% chance`}
      >
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-end rounded-full pr-2.5 transition-[width] duration-500 ease-out ${
            video ? "bg-white" : "bg-black"
          }`}
          style={{ width: `${fill}%` }}
        >
          <span aria-hidden="true" className="flex h-full items-center">
            <FlowPercent
              value={displayPercent}
              className={`text-[12px] font-semibold tabular-nums ${
                video ? "text-black" : "text-white"
              }`}
            />
          </span>
        </div>
        <div
          aria-hidden
          className={`absolute inset-y-1 z-[1] w-px border-l border-dashed ${
            video
              ? entryOverFill
                ? "border-black/25"
                : "border-white/45"
              : entryOverFill
                ? "border-white/35"
                : "border-black/25"
          }`}
          style={{ left: `${entryMark}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        <button
          type="button"
          aria-label="Remove $5 from position"
          disabled={!canDecrease || cashingOut}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!canDecrease || cashingOut) return;
            hapticStep();
            onAdjust(-POSITION_ADJUST_STEP);
          }}
          className={`${actionBtn} col-span-1 tabular-nums`}
        >
          -$5
        </button>
        <button
          type="button"
          aria-label="Add $5 to position"
          disabled={!canIncrease || cashingOut}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!canIncrease || cashingOut) return;
            hapticStep();
            onAdjust(POSITION_ADJUST_STEP);
          }}
          className={`${actionBtn} col-span-1 tabular-nums`}
        >
          +$5
        </button>
        <button
          type="button"
          aria-label={`Cash out ${valueLabel}`}
          disabled={cashingOut}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (cashingOut) return;
            hapticSuccess();
            onCashOut();
          }}
          className={`${actionBtn} col-span-2 px-3 ${
            cashingOut ? "disabled:!opacity-100" : ""
          }`}
        >
          Cash out
        </button>
      </div>
    </div>
  );
}
