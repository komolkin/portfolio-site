"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { hapticStep, hapticSuccess } from "@/lib/haptics";
import {
  OutcomeSticker,
  outcomeStickerTilt,
} from "@/components/worm-app-3/OutcomeSticker";

export type PositionOutcome = "Yes" | "No";

export type PlacedPosition = {
  marketId: string;
  outcome: PositionOutcome;
  stake: number;
  entryPercent: number;
};

export const YES_COLOR = "#1DB954";
export const NO_COLOR = "#FF3B5C";
export const MIN_POSITION_STAKE = 1;
export const POSITION_ADJUST_STEP = 1;

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

export function PositionFooter({
  position,
  currentPercent,
  video,
  canIncrease,
  cashingOut,
  stickerReady,
  stickerFaded = false,
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
  /** Hide sticker while the ±$1 center flash is visible. */
  stickerFaded?: boolean;
  onCashOut: () => void;
  onAdjust: (delta: number) => void;
  className?: string;
}) {
  const displayPercent = Math.round(currentPercent);
  const stakeLabel = formatCashUsd(position.stake);
  // Mark-to-market: equals stake near entry, reaches full to-win only at 100%.
  const valueNow = cashOutValue(position, currentPercent);
  const valueLabel = formatCashUsdPrecise(valueNow);
  const fill = Math.max(4, Math.min(100, currentPercent));
  const entryMark = Math.max(1, Math.min(99, position.entryPercent));
  const entryOverFill = entryMark <= fill;
  const pnl = valueNow - position.stake;
  const fillColor =
    pnl > 0.005 ? YES_COLOR : pnl < -0.005 ? NO_COLOR : video ? "#fff" : "#000";
  const canDecrease = position.stake > MIN_POSITION_STAKE;
  const stickerTilt = outcomeStickerTilt(
    `${position.marketId}:${position.outcome}`,
  );
  const actionBtn = `flex h-[52px] items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-200 ease-out active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
    video ? "bg-white/[0.06] text-white" : "bg-black/[0.06] text-black"
  }`;

  return (
    <div
      className={`relative z-[2] flex min-h-0 flex-1 flex-col gap-3 ${
        className ?? (video ? "mt-auto" : "mt-8")
      }`}
    >
      <div className="flex min-h-[88px] flex-1 items-center justify-center overflow-visible">
        <AnimatePresence initial={false}>
          {stickerReady ? (
            <motion.div
              key={`${position.marketId}-${position.outcome}-wrap`}
              initial={false}
              animate={{ opacity: stickerFaded ? 0 : 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <OutcomeSticker
                key={`${position.marketId}-${position.outcome}`}
                label={position.outcome}
                tilt={stickerTilt}
                size="xl"
                animated
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className={`relative h-[52px] overflow-hidden rounded-[18px] ${
          video ? "bg-white/[0.1]" : "bg-black/[0.06]"
        }`}
        aria-label={`${stakeLabel} → ${valueLabel}, ${displayPercent}% chance`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-[18px] transition-[width,background-color] duration-500 ease-out"
          style={{ width: `${fill}%`, backgroundColor: fillColor }}
        />
        <div
          aria-hidden
          className={`absolute inset-y-2 z-[1] w-px border-l border-dashed ${
            entryOverFill ? "border-white/40" : video ? "border-white/45" : "border-black/25"
          }`}
          style={{ left: `${entryMark}%` }}
        />
        {/* Dual clipped labels: light ink on track, white on colored fill. */}
        {(
          [
            {
              key: "track",
              clipPath: `inset(0 0 0 ${fill}%)`,
              ink: video ? "text-white" : "text-black",
              muted: video ? "text-white/55" : "text-black/45",
              cents: video ? "text-white/45" : "text-black/35",
            },
            {
              key: "fill",
              clipPath: `inset(0 ${100 - fill}% 0 0)`,
              ink: "text-white",
              muted: "text-white/70",
              cents: "text-white/55",
            },
          ] as const
        ).map((layer) => (
          <div
            key={layer.key}
            aria-hidden="true"
            className="absolute inset-0 z-[2] flex items-center justify-between gap-3 px-4"
            style={{ clipPath: layer.clipPath }}
          >
            <p
              className={`min-w-0 truncate text-[16px] font-semibold leading-none tabular-nums tracking-[-0.01em] ${layer.ink}`}
            >
              <span className="inline-flex items-baseline gap-x-1.5 tracking-normal">
                <FlowUsd value={position.stake} className={layer.ink} />
                <span className={layer.muted}>→</span>
                <FlowUsd
                  value={valueNow}
                  showCents
                  className={layer.ink}
                  centsClassName={layer.cents}
                />
              </span>
            </p>
            <FlowPercent
              value={displayPercent}
              className={`shrink-0 text-[16px] font-semibold tabular-nums ${layer.ink}`}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        <button
          type="button"
          aria-label="Remove $1 from position"
          disabled={!canDecrease || cashingOut}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!canDecrease || cashingOut) return;
            hapticStep();
            onAdjust(-POSITION_ADJUST_STEP);
          }}
          className={`${actionBtn} col-span-1 tabular-nums`}
        >
          -$1
        </button>
        <button
          type="button"
          aria-label="Add $1 to position"
          disabled={!canIncrease || cashingOut}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            if (!canIncrease || cashingOut) return;
            hapticStep();
            onAdjust(POSITION_ADJUST_STEP);
          }}
          className={`${actionBtn} col-span-1 tabular-nums`}
        >
          +$1
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
