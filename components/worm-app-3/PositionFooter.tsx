"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { hapticStep, hapticSuccess } from "@/lib/haptics";
import {
  OutcomeSticker,
  type OutcomeStickerStyle,
  outcomeStickerTilt,
} from "@/components/worm-app-3/OutcomeSticker";

export type PositionOutcome = "Yes" | "No";

export type PlacedPosition = {
  marketId: string;
  outcome: PositionOutcome;
  stake: number;
  entryPercent: number;
  stickerStyle?: OutcomeStickerStyle;
};

export const YES_COLOR = "#1DB954";
export const NO_COLOR = "#FF3B5C";
export const MIN_POSITION_STAKE = 1;
export const POSITION_ADJUST_STEP = 1;

const SIZE_DELTA_HOLD_MS = 900;
const SIZE_DELTA_EXIT_MS = 480;

type SizeDeltaFlash = {
  sessionId: number;
  amount: number;
  bumpId: number;
  exiting: boolean;
};

function useAnimatedCount(target: number, durationMs = 140) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        displayRef.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

function SizeDeltaFlashLabel({
  amount,
  exiting,
  video,
}: {
  amount: number;
  exiting: boolean;
  video: boolean;
}) {
  const animatedAbs = useAnimatedCount(Math.abs(amount));
  const exitClass =
    amount > 0 ? "worm-size-delta-exit-up" : "worm-size-delta-exit-down";

  return (
    <span
      className={`inline-flex items-baseline text-[72px] font-semibold leading-none tracking-tight tabular-nums ${
        video ? "text-white" : "text-black"
      } ${exiting ? exitClass : "worm-size-delta-enter"}`}
    >
      {amount > 0 ? "+$" : "-$"}
      {animatedAbs.toLocaleString("en-US")}
    </span>
  );
}

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
  collapsing = false,
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
  /** Collapse sticker space during cash-out so the card shrinks once. */
  collapsing?: boolean;
  onCashOut: () => void;
  /** Returns the applied stake delta (0 if none). */
  onAdjust: (delta: number) => number;
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

  const [sizeDeltaFlash, setSizeDeltaFlash] = useState<SizeDeltaFlash | null>(
    null,
  );
  const sizeDeltaSessionRef = useRef(0);
  const sizeDeltaStackedRef = useRef(0);
  const sizeDeltaBumpRef = useRef(0);
  const sizeDeltaHoldTimerRef = useRef<number | null>(null);
  const sizeDeltaExitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (sizeDeltaHoldTimerRef.current !== null) {
        window.clearTimeout(sizeDeltaHoldTimerRef.current);
      }
      if (sizeDeltaExitTimerRef.current !== null) {
        window.clearTimeout(sizeDeltaExitTimerRef.current);
      }
    };
  }, []);

  const flashSizeDelta = useCallback((applied: number) => {
    if (applied === 0) return;

    const isNewSession =
      sizeDeltaHoldTimerRef.current === null &&
      sizeDeltaExitTimerRef.current === null;
    if (isNewSession) {
      sizeDeltaSessionRef.current += 1;
      sizeDeltaStackedRef.current = applied;
    } else {
      sizeDeltaStackedRef.current += applied;
    }

    sizeDeltaBumpRef.current += 1;
    setSizeDeltaFlash({
      sessionId: sizeDeltaSessionRef.current,
      amount: sizeDeltaStackedRef.current,
      bumpId: sizeDeltaBumpRef.current,
      exiting: false,
    });

    if (sizeDeltaHoldTimerRef.current !== null) {
      window.clearTimeout(sizeDeltaHoldTimerRef.current);
    }
    if (sizeDeltaExitTimerRef.current !== null) {
      window.clearTimeout(sizeDeltaExitTimerRef.current);
      sizeDeltaExitTimerRef.current = null;
    }

    sizeDeltaHoldTimerRef.current = window.setTimeout(() => {
      sizeDeltaHoldTimerRef.current = null;
      setSizeDeltaFlash((prev) => (prev ? { ...prev, exiting: true } : null));
      sizeDeltaExitTimerRef.current = window.setTimeout(() => {
        setSizeDeltaFlash(null);
        sizeDeltaStackedRef.current = 0;
        sizeDeltaExitTimerRef.current = null;
      }, SIZE_DELTA_EXIT_MS);
    }, SIZE_DELTA_HOLD_MS);
  }, []);

  const handleAdjust = (delta: number) => {
    const applied = onAdjust(delta);
    flashSizeDelta(applied);
  };

  const flashVisible = Boolean(sizeDeltaFlash && sizeDeltaFlash.amount !== 0);
  const hideSticker = stickerFaded || collapsing || flashVisible;

  return (
    <div
      className={`relative z-[2] flex min-h-0 flex-1 flex-col gap-3 ${
        className ?? (video ? "mt-auto" : "mt-8")
      }`}
    >
      <style>{`
        @keyframes worm-size-delta-enter {
          0% { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.72); }
          55% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.08); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes worm-size-delta-exit-up {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(0, -42px, 0) scale(0.92); }
        }
        @keyframes worm-size-delta-exit-down {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(0, 42px, 0) scale(0.92); }
        }
        .worm-size-delta-enter {
          animation: worm-size-delta-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .worm-size-delta-exit-up {
          animation: worm-size-delta-exit-up 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .worm-size-delta-exit-down {
          animation: worm-size-delta-exit-down 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .worm-size-delta-enter,
          .worm-size-delta-exit-up,
          .worm-size-delta-exit-down {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
      <motion.div
        initial={false}
        animate={{
          flexGrow: collapsing ? 0 : 1,
          minHeight: collapsing ? 0 : 88,
          opacity: collapsing ? 0 : 1,
          paddingTop: collapsing ? 0 : 24,
          paddingBottom: collapsing ? 0 : 24,
        }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center overflow-hidden"
        style={{ flexGrow: collapsing ? 0 : 1 }}
      >
        <AnimatePresence initial={false}>
          {stickerReady ? (
            <motion.div
              key={`${position.marketId}-${position.outcome}-wrap`}
              initial={false}
              animate={{ opacity: hideSticker ? 0 : 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <OutcomeSticker
                key={`${position.marketId}-${position.outcome}`}
                label={position.outcome}
                stickerStyle={position.stickerStyle}
                tilt={stickerTilt}
                size="xl"
                animated
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
        {flashVisible && sizeDeltaFlash ? (
          <div
            key={sizeDeltaFlash.sessionId}
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
            aria-hidden
          >
            <SizeDeltaFlashLabel
              amount={sizeDeltaFlash.amount}
              exiting={sizeDeltaFlash.exiting}
              video={video}
            />
          </div>
        ) : null}
      </motion.div>

      <div
        className="flex flex-col gap-2"
        role="group"
        aria-label={`${stakeLabel} → ${valueLabel}, ${displayPercent}% chance`}
      >
        <div
          aria-hidden
          className={`flex items-center justify-between gap-3 ${video ? "text-white" : "text-black"}`}
        >
          <p className="min-w-0 truncate text-[16px] font-semibold leading-none tabular-nums">
            <span className="inline-flex items-baseline gap-x-1.5 tracking-normal">
              <FlowUsd value={position.stake} />
              <span className={video ? "text-white/55" : "text-black/45"}>→</span>
              <FlowUsd
                value={valueNow}
                showCents
                centsClassName={video ? "text-white/45" : "text-black/35"}
              />
            </span>
          </p>
          <FlowPercent
            value={displayPercent}
            className="shrink-0 text-[16px] font-semibold tabular-nums"
          />
        </div>
        <div
          className={`relative h-4 overflow-hidden rounded-full ${
            video ? "bg-white/[0.1]" : "bg-black/[0.06]"
          }`}
          aria-hidden
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-500 ease-out"
            style={{ width: `${fill}%`, backgroundColor: fillColor }}
          />
          <div
            className={`absolute inset-y-1 z-[1] w-px border-l border-dashed ${
              entryOverFill ? "border-white/40" : video ? "border-white/45" : "border-black/25"
            }`}
            style={{ left: `${entryMark}%` }}
          />
        </div>
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
            handleAdjust(-POSITION_ADJUST_STEP);
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
            handleAdjust(POSITION_ADJUST_STEP);
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
