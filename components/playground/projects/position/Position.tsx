"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useState } from "react";

/**
 * Position / "Resolution Outcome" — Figma node 2072:7697
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=2072-7697
 * Assets under public/playground/position/ (thumbnail, share icon)
 */
const IMG_THUMB = "/playground/position/thumbnail.png";
const IMG_SHARE = "/playground/position/share-icon.svg";

const FILL_MIN = 10;
const FILL_MAX = 60;

function randomFillPercent(): number {
  return FILL_MIN + Math.floor(Math.random() * (FILL_MAX - FILL_MIN + 1));
}

/** Vertical entry line — % from left of the bar (PnL vs this threshold) */
const ENTRY_LINE_PERCENT = 20;

/** Ruler tick positions (% of bar width), aligned with Figma 2072:7697 */
const RULER_LIQ_PCT = 5.25;
const RULER_SL_PCT = 12.25;
const RULER_TP_PCT = 68;

const SIM_TICK_MS = 2200;

const INITIAL_VALUE_USD = 1000;

/** Short tick + label to the right (LIQ / SL / TP) — tick left edge at `leftPct` */
function RulerMark({
  leftPct,
  label,
  labelClassName,
}: {
  leftPct: number;
  label: string;
  labelClassName?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-1 z-[1] flex flex-row items-end gap-1"
      style={{ left: `${leftPct}%` }}
    >
      <div
        className="h-8 w-px shrink-0 bg-gradient-to-b from-transparent to-white/20"
        aria-hidden
      />
      <span
        className={`whitespace-nowrap text-[8px] font-semibold uppercase leading-none tracking-wide ${
          labelClassName ?? "text-white/60"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default function Position() {
  const [fillPercent, setFillPercent] = useState(35);

  useEffect(() => {
    setFillPercent(randomFillPercent());
    const id = window.setInterval(() => {
      setFillPercent(randomFillPercent());
    }, SIM_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const deltaPct = fillPercent - ENTRY_LINE_PERCENT;
  const deltaPctColorClass =
    deltaPct > 0 ? "text-[#5dd978]" : deltaPct < 0 ? "text-[#f87171]" : "text-white/60";

  /** $ delta vs entry — add to initial (top) to get current position value */
  const pnlSigned = useMemo(
    () => Math.round((fillPercent - ENTRY_LINE_PERCENT) * 42),
    [fillPercent],
  );

  const pnlPrefix = pnlSigned < 0 ? "-$" : "+$";
  const pnlAbs = Math.abs(pnlSigned);
  const pnlColorClass = pnlSigned < 0 ? "text-[#f87171]" : "text-[#5dd978]";

  /** Initial + delta (top line tracks this as the bar moves) */
  const currentTotalUsd = INITIAL_VALUE_USD + pnlSigned;
  const topPrefix = currentTotalUsd < 0 ? "-$" : "$";
  const topAbs = Math.abs(currentTotalUsd);

  return (
    <div
      className="flex w-full max-w-[400px] flex-col gap-4 rounded-[24px] p-4"
      style={{ background: "#1d1d1d" }}
      data-name="Position"
    >
      {/* Header — Figma 2072:7699 */}
      <div className="flex w-full items-center gap-4">
        <div className="relative size-[52px] shrink-0 overflow-hidden rounded-lg">
          <img
            alt=""
            className="pointer-events-none size-full object-cover"
            src={IMG_THUMB}
            draggable={false}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="truncate text-base font-semibold leading-tight text-white [font-feature-settings:'lnum'_1,'tnum'_1]">
            Will the Phoenix Suns beat the Golden State Warriors
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(0,157,89,0.2)] px-2 py-0.5 text-xs font-semibold leading-tight text-[#5dd978]">
              YES
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold leading-tight text-white">
              3x
            </span>
          </div>
        </div>
      </div>

      {/* Progress + metrics — Figma 2072:7710 */}
      <div className="relative h-[95px] w-full overflow-hidden rounded-lg">
        <div className="absolute inset-0 rounded-lg bg-white/[0.04]" aria-hidden />
        <div className="relative flex h-full w-full min-w-0">
          <div
            className="relative h-full shrink-0 rounded-l-lg bg-[#123224] transition-[width] duration-500 ease-out"
            style={{ width: `${fillPercent}%` }}
            aria-hidden
          />
          <div className="relative h-full min-w-0 flex-1 rounded-r-lg bg-[#252525]" />
        </div>

        {/* Left stack: fill % + delta from entry */}
        <div className="pointer-events-none absolute left-3 top-1 z-[2] flex flex-col gap-0.5">
          <div className="flex items-baseline gap-0 text-xl font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <NumberFlow
              value={fillPercent}
              trend={0}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
            <span className="tabular-nums">%</span>
          </div>
          <p className={`text-xs font-normal leading-tight tabular-nums ${deltaPctColorClass}`}>
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct}%
          </p>
        </div>

        {/* Right stack: initial + delta (top) and signed delta (bottom) */}
        <div className="pointer-events-none absolute right-3 top-1 z-[2] flex flex-col items-end gap-0.5 text-right">
          <p className="text-xl font-semibold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <span className="inline-flex items-baseline">
              <span className="tabular-nums">{topPrefix}</span>
              <NumberFlow
                value={topAbs}
                trend={0}
                format={{ useGrouping: true }}
                className="tabular-nums text-inherit"
                style={{ ["--number-flow-mask-height" as any]: "0em" }}
              />
            </span>
          </p>
          <p
            className={`text-xs font-normal leading-tight tabular-nums transition-colors duration-300 ${pnlColorClass}`}
          >
            <span className="inline-flex items-baseline">
              <span className="tabular-nums">{pnlPrefix}</span>
              <NumberFlow
                value={pnlAbs}
                trend={0}
                format={{ useGrouping: true }}
                className="tabular-nums text-inherit"
                style={{ ["--number-flow-mask-height" as any]: "0em" }}
              />
            </span>
          </p>
        </div>

        <RulerMark leftPct={RULER_LIQ_PCT} label="LIQ" labelClassName="text-[#ff4d5e]" />
        <RulerMark leftPct={RULER_SL_PCT} label="SL" labelClassName="text-[#f2ff00]" />
        <RulerMark leftPct={RULER_TP_PCT} label="TP" labelClassName="text-[#5dd978]" />

        {/* Entry: full-height divider + label to its right (same row pattern as other marks) */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[1] flex flex-row items-end gap-1"
          style={{ left: `${ENTRY_LINE_PERCENT}%` }}
        >
          <div
            className={`w-0 shrink-0 self-stretch border-l border-dashed transition-colors duration-300 ${
              pnlSigned < 0 ? "border-[#f87171]" : "border-[#35a64e]"
            }`}
            aria-hidden
          />
          <span className="mb-1 whitespace-nowrap text-[8px] font-semibold uppercase leading-none tracking-wide text-white/60">
            Entry
          </span>
        </div>
      </div>

      <div className="flex w-full items-start justify-center gap-2.5">
        <button
          type="button"
          className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
        >
          Cash Out
        </button>
        <button
          type="button"
          className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
        >
          TP / SL
        </button>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
          aria-label="Share"
        >
          <img alt="" className="size-4" src={IMG_SHARE} draggable={false} />
        </button>
      </div>
    </div>
  );
}
