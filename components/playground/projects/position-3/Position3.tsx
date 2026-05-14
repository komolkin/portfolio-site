"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Position #3 — minimalist progress bar (label-only LIQ/Entry, no SL/TP dots).
 * Shares the header + buttons layout with Position; the progress bar replaces
 * dot markers with inline text (LIQ 12¢ on the filled side, Entry under a
 * dashed vertical line, current % big in green).
 */
const IMG_THUMB = "/playground/position/thumbnail.png";
const IMG_SHARE = "/playground/position/share-icon.svg";

const FILL_MIN = 20;
const FILL_MAX = 80;
const ENTRY_LINE_PERCENT = 40;
const INITIAL_VALUE_USD = 100;
const MAX_VALUE_USD = 286;

const SIM_TICK_MS = 2200;
const FAST_FORWARD_DELTA_THRESHOLD = 12;
const FAST_FORWARD_FX_MS = 550;

function randomFillPercent(): number {
  return FILL_MIN + Math.floor(Math.random() * (FILL_MAX - FILL_MIN + 1));
}

export default function Position3() {
  const [fillPercent, setFillPercent] = useState(60);
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
  const pctColorClass = isAhead ? "text-[#5dd978]" : "text-[#f87171]";
  const dashedColor = isAhead ? "#5dd978" : "#f87171";

  return (
    <div
      className={`flex w-full max-w-[400px] flex-col gap-4 rounded-[24px] p-4 ${
        isFastForwardFx ? "animate-[position3-shake_360ms_ease-in-out_1]" : ""
      }`}
      style={{ background: "#1d1d1d" }}
      data-name="Position #3"
    >
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
            Phoenix Suns
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2d107f] px-2 py-0.5 text-xs font-semibold leading-tight text-white">
              PHX 40¢
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

      <div className="relative h-[112px] w-full overflow-hidden rounded-lg">
        <div className="absolute inset-0 rounded-lg bg-white/[0.04]" aria-hidden />
        <div className="relative flex h-full w-full min-w-0">
          <div
            className="relative h-full shrink-0 rounded-l-lg transition-[width,background-color] duration-500 ease-out"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: isAhead ? "#123224" : "#3a1414",
            }}
            aria-hidden
          />
          <div className="relative h-full min-w-0 flex-1 rounded-r-lg bg-[#252525]" />
        </div>

        {/* LIQ label on the filled side */}
        <div className="pointer-events-none absolute bottom-2 left-3 z-[2] flex flex-col leading-none">
          <span className="text-xs font-semibold leading-tight text-[#ff4d5e]">LIQ</span>
          <span className="font-mono text-xl leading-tight text-white tabular-nums">12¢</span>
        </div>

        {/* Right stack: current value + signed PnL */}
        <div className="pointer-events-none absolute bottom-2 right-3 z-[2] flex flex-col items-end gap-0.5 text-right">
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

        {/* Entry: dashed vertical line + "Entry" label at bottom */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[3]"
          style={{ left: `${ENTRY_LINE_PERCENT}%` }}
        >
          <div
            className="absolute inset-y-0 w-0 border-l border-dashed"
            style={{ borderColor: dashedColor, opacity: 0.7 }}
            aria-hidden
          />
          <span className="absolute bottom-2 left-1 whitespace-nowrap text-xs leading-tight text-white/60">
            Entry
          </span>
        </div>

        {/* Big % label tracks the leading edge of the fill */}
        <div
          className="pointer-events-none absolute top-2 z-[3] -translate-x-full pr-2 transition-[left] duration-500 ease-out"
          style={{ left: `${fillPercent}%` }}
        >
          <span
            className={`font-mono text-[28px] font-normal leading-tight tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${pctColorClass}`}
          >
            <NumberFlow
              value={fillPercent}
              trend={0}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
            %
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
      `}</style>

      <div className="flex w-full items-start justify-center gap-2.5">
        <button
          type="button"
          className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
        >
          <span className="inline-flex items-baseline truncate px-1">
            <span>Cash Out</span>
            <span className="ml-1.5 tabular-nums">{topPrefix}</span>
            <NumberFlow
              value={topAbs}
              trend={0}
              format={{ useGrouping: true }}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </span>
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
