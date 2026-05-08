"use client";

import NumberFlow from "@number-flow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Position / "Resolution Outcome" — Figma node 2072:7697
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=2072-7697
 * PHX chip — https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=2072-7743
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
const PRICE_ENTRY = "62¢";
const PRICE_LIQ = "39¢";

const SIM_TICK_MS = 2200;

const INITIAL_VALUE_USD = 1000;
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function priceFromPercent(percent: number): string {
  const cents = clamp(Math.round(1 + (percent / 100) * 99), 1, 100);
  return `${cents}¢`;
}

/** Short tick + label to the right (LIQ / SL / TP) + animated tooltip */
function RulerMark({
  leftPct,
  label,
  price,
  labelClassName,
  onPointerDown,
  isDragging = false,
  isPinnedOpen = false,
  showLoader = false,
}: {
  leftPct: number;
  label: string;
  price: string;
  labelClassName?: string;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  isDragging?: boolean;
  isPinnedOpen?: boolean;
  showLoader?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} price ${price}`}
      className={`group absolute inset-y-0 z-[3] flex flex-row items-end gap-1 pb-1 outline-none ${
        onPointerDown
          ? `-mx-2 touch-none px-2 cursor-grab active:cursor-grabbing ${
              isDragging ? "cursor-grabbing" : ""
            }`
          : ""
      }`}
      style={{
        left: `${leftPct}%`,
        cursor: onPointerDown ? (isDragging ? "grabbing" : "grab") : undefined,
      }}
      onPointerDown={onPointerDown}
    >
      <span
        className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#101010] px-2 py-1 text-xs font-semibold leading-none text-white/85 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out ${
          isDragging || isPinnedOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        }`}
      >
        <span className="inline-flex items-center">
          <span
            className={`inline-flex overflow-hidden transition-all duration-200 ${
              showLoader ? "mr-1.5 w-2 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <span className={`size-2 rounded-full border border-white/30 border-t-white ${showLoader ? "animate-spin" : ""}`} />
          </span>
          <span>{price}</span>
        </span>
      </span>
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
    </button>
  );
}

function EntryMark({ leftPct, price, isNegative }: { leftPct: number; price: string; isNegative: boolean }) {
  return (
    <button
      type="button"
      aria-label={`Entry price ${price}`}
      className="group absolute inset-y-0 z-[3] flex flex-row items-end gap-1 outline-none"
      style={{ left: `${leftPct}%` }}
    >
      <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-md border border-white/10 bg-[#101010] px-2 py-1 text-xs font-semibold leading-none text-white/85 opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        {price}
      </span>
      <div
        className={`w-0 shrink-0 self-stretch border-l border-dashed transition-colors duration-300 ${
          isNegative ? "border-[#f87171]" : "border-[#35a64e]"
        }`}
        aria-hidden
      />
      <span className="mb-1 whitespace-nowrap text-[8px] font-semibold uppercase leading-none tracking-wide text-white/60">
        Entry
      </span>
    </button>
  );
}

export default function Position() {
  const [fillPercent, setFillPercent] = useState(35);
  const [slPct, setSlPct] = useState(RULER_SL_PCT);
  const [tpPct, setTpPct] = useState(RULER_TP_PCT);
  const [activeDrag, setActiveDrag] = useState<"SL" | "TP" | null>(null);
  const [pendingMark, setPendingMark] = useState<"SL" | "TP" | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const pendingTimerRef = useRef<number | null>(null);

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
  const slPrice = useMemo(() => priceFromPercent(slPct), [slPct]);
  const tpPrice = useMemo(() => priceFromPercent(tpPct), [tpPct]);

  const updateDraggedMark = useCallback(
    (clientX: number) => {
      const chartElement = chartRef.current;
      if (!chartElement || !activeDrag) return;

      const rect = chartElement.getBoundingClientRect();
      const rawPct = ((clientX - rect.left) / rect.width) * 100;
      const nextPct = clamp(rawPct, 0, 100);

      if (activeDrag === "SL") {
        setSlPct(clamp(nextPct, RULER_LIQ_PCT, ENTRY_LINE_PERCENT));
        return;
      }

      setTpPct(clamp(nextPct, ENTRY_LINE_PERCENT, 100));
    },
    [activeDrag],
  );

  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      updateDraggedMark(event.clientX);
    };

    const handlePointerUp = () => {
      setPendingMark(activeDrag);
      setActiveDrag(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [activeDrag, updateDraggedMark]);

  useEffect(() => {
    if (!activeDrag) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, [activeDrag]);

  useEffect(() => {
    if (!pendingMark) return;
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
    }
    pendingTimerRef.current = window.setTimeout(() => {
      setPendingMark(null);
      pendingTimerRef.current = null;
    }, 2000);

    return () => {
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [pendingMark]);

  const startDrag = useCallback(
    (mark: "SL" | "TP") => (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setPendingMark(null);
      setActiveDrag(mark);
      updateDraggedMark(event.clientX);
    },
    [updateDraggedMark],
  );

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
            Phoenix Suns
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#2d107f] px-2 py-0.5 text-xs font-semibold leading-tight text-white">
              PHX 62¢
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

      {/* Progress + metrics — Figma 2072:7710 */}
      <div ref={chartRef} className="relative h-[95px] w-full overflow-hidden rounded-lg">
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
          <div className="flex items-baseline gap-0 text-xl font-normal leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] font-mono">
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
          <p className="text-xl font-normal leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] font-mono">
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

        <RulerMark
          leftPct={RULER_LIQ_PCT}
          label="LIQ"
          price={PRICE_LIQ}
          labelClassName="text-[#ff4d5e]"
        />
        <RulerMark
          leftPct={slPct}
          label="SL"
          price={slPrice}
          labelClassName="text-[#f2ff00]"
          onPointerDown={startDrag("SL")}
          isDragging={activeDrag === "SL"}
          isPinnedOpen={pendingMark === "SL"}
          showLoader={pendingMark === "SL"}
        />
        <RulerMark
          leftPct={tpPct}
          label="TP"
          price={tpPrice}
          labelClassName="text-[#5dd978]"
          onPointerDown={startDrag("TP")}
          isDragging={activeDrag === "TP"}
          isPinnedOpen={pendingMark === "TP"}
          showLoader={pendingMark === "TP"}
        />
        <EntryMark leftPct={ENTRY_LINE_PERCENT} price={PRICE_ENTRY} isNegative={pnlSigned < 0} />
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
