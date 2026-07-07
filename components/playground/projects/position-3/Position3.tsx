"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Position3Particles from "./Position3Particles";

/**
 * Position #3 — minimalist progress bar with Entry and Liq. markers.
 * Shares the header + buttons layout with Position; the progress bar uses a
 * solid fill, Entry and Liq. vertical lines, and a trailing % label.
 * Click the card to toggle the compact progress bar (Figma 7445:19968).
 */
const IMG_THUMB = "/playground/position/thumbnail.png";
const IMG_SHARE = "/playground/position/share-icon.svg";

const FILL_MIN = 20;
const FILL_MAX = 80;
const FILL_NEAR_90_MIN = 88;
const FILL_NEAR_90_MAX = 92;
const FILL_NEAR_98_MIN = 96;
const FILL_NEAR_98_MAX = 98;
const ENTRY_LINE_PERCENT = 40;
const LIQ_LINE_PERCENT = 13;
const INITIAL_VALUE_USD = 100;
const MAX_VALUE_USD = 286;

const SIM_TICK_MS = 2200;
const FAST_FORWARD_DELTA_THRESHOLD = 12;
const FAST_FORWARD_FX_MS = 550;

/** Progress fill — Figma Progress rectangles (7425:19765 / 7425:19887) */
const FILL_COLOR_GREEN = "#1c662d";
const FILL_COLOR_RED = "#7a0f1c";
const ENTRY_LINE_COLOR_GREEN = "#5dd978";
const ENTRY_LINE_COLOR_RED = "#ff4d5e";

const CARD_BG_GREEN =
  "linear-gradient(180deg, rgba(93,217,120,0.04) 0%, rgba(93,217,120,0.1) 100%), #1d1d1d";
const CARD_BG_RED =
  "linear-gradient(180deg, rgba(255,77,94,0) 0%, rgba(255,77,94,0.1) 100%), #1d1d1d";
const CARD_BORDER_GREEN = "rgba(93,217,120,0.1)";
const CARD_BORDER_RED = "rgba(255,77,94,0.1)";

const PROGRESS_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

/** Fill width + trailing % — shared timing so they move in sync */
const PROGRESS_FILL_MOTION =
  "transition-[width,background-color] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none";

/** Compact progress bar toggle — height, labels, overlays */
const PROGRESS_BAR_MOTION =
  "transition-[height,opacity,top,font-size,color,transform] duration-[280ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none";

const LIQ_GLOW_RANGE = 18;
const END_GLOW_RANGE = 22;

function getCashOutGlow(fillPercent: number) {
  const liqDelta = fillPercent - LIQ_LINE_PERCENT;
  const liqIntensity =
    liqDelta <= LIQ_GLOW_RANGE
      ? liqDelta <= 0
        ? 1
        : 1 - liqDelta / LIQ_GLOW_RANGE
      : 0;

  if (liqIntensity > 0) {
    return {
      mode: "liq" as const,
      strength: Math.max(0.35, liqIntensity),
      pulseMs: Math.round(220 + (1 - liqIntensity) * 580),
    };
  }

  if (fillPercent < ENTRY_LINE_PERCENT) {
    return { mode: "off" as const, strength: 0, pulseMs: 0 };
  }

  const progressFromEntry =
    (fillPercent - ENTRY_LINE_PERCENT) / (100 - ENTRY_LINE_PERCENT);
  const endDelta = 100 - fillPercent;
  const endProximity =
    endDelta <= END_GLOW_RANGE ? 1 - endDelta / END_GLOW_RANGE : 0;

  const strength = Math.min(1, 0.14 + progressFromEntry * 0.46 + endProximity * 0.24);
  const pulseMs = Math.max(
    320,
    Math.round(2600 - progressFromEntry * 1400 - endProximity * 900),
  );

  return {
    mode: "win" as const,
    strength,
    pulseMs,
  };
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomFillPercent(): number {
  const roll = Math.random();
  if (roll < 0.22) return randomInt(FILL_NEAR_90_MIN, FILL_NEAR_90_MAX);
  if (roll < 0.38) return randomInt(FILL_NEAR_98_MIN, FILL_NEAR_98_MAX);
  return randomInt(FILL_MIN, FILL_MAX);
}

export default function Position3() {
  const [fillPercent, setFillPercent] = useState(60);
  const [isCompact, setIsCompact] = useState(false);
  const [isFastForwardFx, setIsFastForwardFx] = useState(false);
  const fastForwardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setFillPercent(randomFillPercent());
    const id = window.setInterval(() => {
      setFillPercent((prev) => {
        const next = randomFillPercent();
        if (Math.abs(next - prev) >= FAST_FORWARD_DELTA_THRESHOLD) {
          setIsFastForwardFx(true);
          if (fastForwardTimerRef.current !== null) {
            window.clearTimeout(fastForwardTimerRef.current);
          }
          fastForwardTimerRef.current = window.setTimeout(() => {
            setIsFastForwardFx(false);
            fastForwardTimerRef.current = null;
          }, FAST_FORWARD_FX_MS);
        }
        return next;
      });
    }, SIM_TICK_MS);
    return () => {
      window.clearInterval(id);
      if (fastForwardTimerRef.current !== null) {
        window.clearTimeout(fastForwardTimerRef.current);
        fastForwardTimerRef.current = null;
      }
    };
  }, []);

  const pnlSigned = useMemo(
    () =>
      Math.round(
        ((MAX_VALUE_USD - INITIAL_VALUE_USD) / (100 - ENTRY_LINE_PERCENT)) *
          (fillPercent - ENTRY_LINE_PERCENT),
      ),
    [fillPercent],
  );
  const pnlPrefix = pnlSigned < 0 ? "-$" : "+$";
  const pnlAbs = Math.abs(pnlSigned);
  const pnlColorClass = pnlSigned < 0 ? "text-[#f87171]" : "text-[#5dd978]";

  const currentTotalUsd = INITIAL_VALUE_USD + pnlSigned;
  const topPrefix = currentTotalUsd < 0 ? "-$" : "$";
  const topAbs = Math.abs(currentTotalUsd);

  const isAhead = fillPercent >= ENTRY_LINE_PERCENT;
  const pctColor = isAhead ? "#5dd978" : "#ff7d8a";
  const entryLineColor = isAhead ? ENTRY_LINE_COLOR_GREEN : ENTRY_LINE_COLOR_RED;
  const cashOutGlow = useMemo(() => getCashOutGlow(fillPercent), [fillPercent]);
  const cashOutGlowAnimation =
    cashOutGlow.mode === "liq"
      ? `position3-cash-out-liq-pulse ${cashOutGlow.pulseMs}ms ease-in-out infinite`
      : cashOutGlow.mode === "win"
        ? `position3-cash-out-win-blink ${cashOutGlow.pulseMs}ms ease-in-out infinite`
        : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isCompact}
      aria-label={isCompact ? "Show full progress bar" : "Show compact progress bar"}
      onClick={() => setIsCompact((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsCompact((prev) => !prev);
        }
      }}
      className={`relative flex w-full max-w-[400px] cursor-pointer flex-col gap-4 overflow-hidden rounded-[24px] border p-4 transition-[background,border-color] duration-500 ease-out transition-transform duration-150 ease-out active:scale-[0.98] ${
        isFastForwardFx ? "animate-[position3-shake_360ms_ease-in-out_1]" : ""
      }`}
      style={{
        background: isAhead ? CARD_BG_GREEN : CARD_BG_RED,
        borderColor: isAhead ? CARD_BORDER_GREEN : CARD_BORDER_RED,
      }}
      data-name="Position #3"
    >
      <Position3Particles variant={isAhead ? "green" : "red"} />

      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 z-[2] flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
        aria-label="Share"
      >
        <img alt="" className="size-4" src={IMG_SHARE} draggable={false} />
      </button>

      <div className="relative z-[1] flex flex-col gap-4">
      <div className="flex w-full items-center gap-4 pr-10">
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
            Phoenix Suns
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2d107f] px-2 py-0.5 text-xs font-semibold leading-tight text-white">
              PHX
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold leading-tight text-white">
              3x
            </span>
            <span className="whitespace-nowrap text-sm leading-[1.25] text-white">
              $100 <span aria-hidden>→</span> <span className="text-[#5dd978]">$286</span>
            </span>
          </div>
        </div>
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-lg bg-white/[0.04] will-change-[height] ${PROGRESS_BAR_MOTION} ${
          isCompact ? "h-9" : "h-[112px]"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-r-lg ${PROGRESS_FILL_MOTION}`}
          style={{
            width: `${fillPercent}%`,
            backgroundColor: isAhead ? FILL_COLOR_GREEN : FILL_COLOR_RED,
          }}
          aria-hidden
        />

        <div
          className={`pointer-events-none absolute bottom-2 right-3 z-[2] flex flex-col items-end gap-0.5 text-right ${PROGRESS_BAR_MOTION} ${
            isCompact ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="font-mono text-[28px] font-normal leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
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
            className={`text-sm font-normal leading-tight tabular-nums transition-colors duration-300 ${pnlColorClass}`}
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

        {/* Liq. vertical line — same treatment as Entry */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[3] -translate-x-1/2"
          style={{ left: `${LIQ_LINE_PERCENT}%` }}
        >
          <div
            className={`absolute left-0 w-[2px] rounded-[1px] opacity-40 ${PROGRESS_BAR_MOTION} ${
              isCompact ? "top-1.5 bottom-1.5" : "top-1/2 h-[85%] -translate-y-1/2"
            }`}
            style={{ backgroundColor: entryLineColor }}
            aria-hidden
          />
          <span
            className={`absolute bottom-[11px] left-2 whitespace-nowrap text-[8px] font-semibold leading-tight text-white/60 ${PROGRESS_BAR_MOTION} ${
              isCompact ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            Liq.
          </span>
        </div>

        {/* Entry vertical line — compact: Figma 7445:19975; full: + label */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[3] -translate-x-1/2"
          style={{ left: `${ENTRY_LINE_PERCENT}%` }}
        >
          <div
            className={`absolute left-0 w-[2px] rounded-[1px] opacity-40 ${PROGRESS_BAR_MOTION} ${
              isCompact ? "top-1.5 bottom-1.5" : "top-1/2 h-[85%] -translate-y-1/2"
            }`}
            style={{ backgroundColor: entryLineColor }}
            aria-hidden
          />
          <span
            className={`absolute bottom-[11px] left-2 whitespace-nowrap text-[8px] font-semibold leading-tight text-white/60 ${PROGRESS_BAR_MOTION} ${
              isCompact ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            Entry
          </span>
        </div>

        {/* % label tracks the trailing edge of the fill */}
        <div
          className={`pointer-events-none absolute z-[3] w-max max-w-none -translate-x-full pr-3 whitespace-nowrap motion-reduce:transition-none ${
            isCompact ? "top-[5px]" : "top-2"
          }`}
          style={{
            left: `${fillPercent}%`,
            transition: `left 500ms ${PROGRESS_EASE}, top 280ms ${PROGRESS_EASE}`,
          }}
        >
          <span
            className={`inline-flex items-baseline whitespace-nowrap font-semibold leading-none tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${PROGRESS_BAR_MOTION} ${
              isCompact ? "text-xl" : "font-mono text-[28px] font-normal"
            }`}
            style={{ color: pctColor }}
          >
            <NumberFlow
              value={fillPercent}
              trend={0}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
            <span className="shrink-0">%</span>
          </span>
        </div>
      </div>

      <style>{`
        @keyframes position3-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-1px, 0, 0); }
          40% { transform: translate3d(1px, 0, 0); }
          60% { transform: translate3d(-1px, 0, 0); }
          80% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes position3-cash-out-liq-pulse {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(255, 77, 94, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(14px + var(--cash-out-glow-strength) * 22px) rgba(255, 77, 94, calc(var(--cash-out-glow-strength) * 0.62)),
              inset 0 1px 0 rgba(255, 120, 130, calc(var(--cash-out-glow-strength) * 0.35));
          }
        }

        @keyframes position3-cash-out-win-blink {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(93, 217, 120, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(16px + var(--cash-out-glow-strength) * 24px) rgba(93, 217, 120, calc(var(--cash-out-glow-strength) * 0.58)),
              inset 0 1px 0 rgba(140, 255, 170, calc(var(--cash-out-glow-strength) * 0.32));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .position3-cash-out-glow {
            animation: none !important;
          }
        }
      `}</style>

      <div className="flex w-full items-start justify-center">
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="relative isolate flex h-14 w-full items-center justify-center overflow-hidden rounded-full border border-white/10 px-8 text-lg font-semibold text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
        >
          {cashOutGlow.mode !== "off" && (
            <span
              aria-hidden
              className="position3-cash-out-glow pointer-events-none absolute inset-0 rounded-full motion-reduce:opacity-60"
              style={{
                ["--cash-out-glow-strength" as string]: cashOutGlow.strength,
                animation: cashOutGlowAnimation,
              }}
            />
          )}
          <span className="relative z-[1] inline-flex items-baseline truncate px-1">
            <span>Cash Out</span>
            <span className="ml-2 tabular-nums">{topPrefix}</span>
            <NumberFlow
              value={topAbs}
              trend={0}
              format={{ useGrouping: true }}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </span>
        </button>
      </div>
      </div>
    </div>
  );
}
