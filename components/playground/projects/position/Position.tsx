"use client";

import NumberFlow from "@number-flow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PNL_GLASS_PANEL } from "@/components/playground/projects/pnl-chart/pnlGlass";

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
const ENTRY_LINE_PERCENT = 40;

/** Ruler tick positions (% of bar width), aligned with Figma 2072:7697 */
const RULER_LIQ_PCT = 10;
const RULER_SL_PCT = 12.25;
const RULER_TP_PCT = 68;
const PRICE_ENTRY = "40¢";
const PRICE_LIQ = "10¢";

const SIM_TICK_MS = 2200;
const FAST_FORWARD_DELTA_THRESHOLD = 12;
const FAST_FORWARD_FX_MS = 550;

const INITIAL_VALUE_USD = 1000;
const EDGE_PADDING_PX = 8;
const DOT_RADIUS_PX = 5;
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function priceFromPercent(percent: number): string {
  const cents = clamp(Math.round(1 + (percent / 100) * 99), 1, 100);
  return `${cents}¢`;
}

/** Short tick + label to the right (LIQ / SL / TP) + animated tooltip */
function RulerMark({
  markerKey,
  leftPct,
  label,
  price,
  dotClassName,
  onPointerDown,
  isDragging = false,
  isPinnedOpen = false,
  showLoader = false,
  onTooltipWidthChange,
  dotOffsetY = 0,
  tooltipOffsetY = 0,
  tooltipLayer = 0,
  expandHitArea = false,
}: {
  markerKey: "LIQ" | "SL" | "TP";
  leftPct: number;
  label: string;
  price: string;
  dotClassName?: string;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  isDragging?: boolean;
  isPinnedOpen?: boolean;
  showLoader?: boolean;
  onTooltipWidthChange?: (key: "LIQ" | "SL" | "TP", width: number) => void;
  dotOffsetY?: number;
  tooltipOffsetY?: number;
  tooltipLayer?: number;
  expandHitArea?: boolean;
}) {
  const tooltipRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const tooltipElement = tooltipRef.current;
    if (!tooltipElement || !onTooltipWidthChange) return;

    const updateWidth = () => {
      onTooltipWidthChange(markerKey, tooltipElement.offsetWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(tooltipElement);
    return () => observer.disconnect();
  }, [markerKey, onTooltipWidthChange, price, showLoader]);

  return (
    <button
      type="button"
      aria-label={`${label} price ${price}`}
      className={`group absolute inset-y-0 z-[3] flex items-end pb-2 outline-none ${
        onPointerDown
          ? `-mx-2 touch-none px-2 cursor-grab active:cursor-grabbing ${
              isDragging ? "cursor-grabbing" : ""
            }`
          : ""
      } ${expandHitArea ? "before:absolute before:-inset-2 before:content-['']" : ""}`}
      style={{
        left: `${leftPct}%`,
        cursor: onPointerDown ? (isDragging ? "grabbing" : "grab") : undefined,
      }}
      onPointerDown={onPointerDown}
    >
      <span
        ref={tooltipRef}
        className={`pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#101010] px-2 py-1 text-xs font-semibold leading-none text-white/85 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out ${
          isDragging || isPinnedOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        }`}
        style={{
          bottom: `${24 + tooltipOffsetY}px`,
          zIndex: 20 + tooltipLayer,
        }}
      >
        <span className="inline-flex items-center">
          <span
            className={`inline-flex overflow-hidden transition-all duration-200 ${
              showLoader ? "mr-1.5 w-2 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <span className={`size-2 rounded-full border border-white/30 border-t-white ${showLoader ? "animate-spin" : ""}`} />
          </span>
          <span>
            {label}: {price}
          </span>
        </span>
      </span>
      <span
        className="transition-transform duration-300 ease-out"
        style={{ transform: dotOffsetY ? `translateY(${dotOffsetY}px)` : undefined }}
        aria-hidden
      >
        <span
          className={`block size-2.5 rounded-full transition-transform duration-150 ease-out group-hover:scale-125 group-active:scale-90 ${
            isDragging ? "scale-90" : ""
          } ${
            dotClassName ?? "bg-white/60"
          }`}
        />
      </span>
    </button>
  );
}

function EntryMark({
  leftPct,
  price,
  tooltipRef,
  dotOffsetY = 0,
  tooltipOffsetY = 0,
  tooltipLayer = 0,
}: {
  leftPct: number;
  price: string;
  tooltipRef?: React.RefObject<HTMLSpanElement>;
  dotOffsetY?: number;
  tooltipOffsetY?: number;
  tooltipLayer?: number;
}) {
  return (
    <button
      type="button"
      aria-label={`Entry price ${price}`}
      className="group absolute inset-y-0 z-[3] flex items-end pb-2 outline-none"
      style={{ left: `${leftPct}%` }}
    >
      <span
        ref={tooltipRef}
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 translate-y-2 whitespace-nowrap rounded-md border border-white/10 bg-[#101010] px-2 py-1 text-xs font-semibold leading-none text-white/85 opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        style={{
          bottom: `${24 + tooltipOffsetY}px`,
          zIndex: 20 + tooltipLayer,
        }}
      >
        Entry: {price}
      </span>
      <span
        className="transition-transform duration-300 ease-out"
        style={{ transform: dotOffsetY ? `translateY(${dotOffsetY}px)` : undefined }}
        aria-hidden
      >
        <span className="block size-2.5 rounded-full bg-white/45 transition-transform duration-150 ease-out group-hover:scale-125" />
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
  const [isFastForwardFx, setIsFastForwardFx] = useState(false);
  const [tooltipWidths, setTooltipWidths] = useState<Record<"LIQ" | "SL" | "TP" | "Entry", number>>({
    LIQ: 0,
    SL: 0,
    TP: 0,
    Entry: 0,
  });
  const chartRef = useRef<HTMLDivElement | null>(null);
  const entryTooltipRef = useRef<HTMLSpanElement | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const fastForwardTimerRef = useRef<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    setFillPercent(randomFillPercent());
    const id = window.setInterval(() => {
      setFillPercent((prev) => {
        const next = randomFillPercent();
        if (next - prev >= FAST_FORWARD_DELTA_THRESHOLD) {
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

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    const updateChartWidth = () => {
      setChartWidth(chartElement.clientWidth);
    };

    updateChartWidth();
    const observer = new ResizeObserver(updateChartWidth);
    observer.observe(chartElement);
    return () => observer.disconnect();
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
  const edgePaddingPct = useMemo(() => {
    if (!chartWidth) return 0;
    return (EDGE_PADDING_PX / chartWidth) * 100;
  }, [chartWidth]);

  const getSafeBoundsPct = useCallback(
    (tooltipWidthPx: number) => {
      if (!chartWidth) return { min: 0, max: 100 };
      const halfTooltipPx = tooltipWidthPx > 0 ? tooltipWidthPx / 2 : 0;
      const requiredInsetPx = Math.max(halfTooltipPx, DOT_RADIUS_PX) + EDGE_PADDING_PX;
      const insetPct = (requiredInsetPx / chartWidth) * 100;
      return {
        min: insetPct,
        max: 100 - insetPct,
      };
    },
    [chartWidth],
  );

  const liqBounds = getSafeBoundsPct(tooltipWidths.LIQ);
  const slBounds = getSafeBoundsPct(tooltipWidths.SL);
  const tpBounds = getSafeBoundsPct(tooltipWidths.TP);
  const entryBounds = getSafeBoundsPct(tooltipWidths.Entry);

  const safeLiqPct = clamp(RULER_LIQ_PCT, liqBounds.min, liqBounds.max);
  const safeEntryPct = clamp(ENTRY_LINE_PERCENT, entryBounds.min, entryBounds.max);
  const safeSlPct = clamp(slPct, slBounds.min, slBounds.max);
  const safeTpPct = clamp(tpPct, tpBounds.min, tpBounds.max);
  const isSlNearLiq = Math.abs(safeSlPct - safeLiqPct) <= 1.6;
  const isSlNearEntry = Math.abs(safeSlPct - safeEntryPct) <= 1.6;
  const isTpNearEntry = Math.abs(safeTpPct - safeEntryPct) <= 1.6;
  const liqTooltipOffsetY = isSlNearLiq ? 22 : 0;
  const isEntryNearAnotherMark = isTpNearEntry || isSlNearEntry;
  const entryTooltipOffsetY = isEntryNearAnotherMark ? 22 : 0;

  useEffect(() => {
    const entryTooltipElement = entryTooltipRef.current;
    if (!entryTooltipElement) return;
    const updateWidth = () => {
      setTooltipWidths((prev) => ({ ...prev, Entry: entryTooltipElement.offsetWidth }));
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(entryTooltipElement);
    return () => observer.disconnect();
  }, []);

  const handleTooltipWidthChange = useCallback((key: "LIQ" | "SL" | "TP", width: number) => {
    setTooltipWidths((prev) => (prev[key] === width ? prev : { ...prev, [key]: width }));
  }, []);

  const updateDraggedMark = useCallback(
    (clientX: number) => {
      const chartElement = chartRef.current;
      if (!chartElement || !activeDrag) return;

      const rect = chartElement.getBoundingClientRect();
      const rawPct = ((clientX - rect.left) / rect.width) * 100;
      const nextPct = clamp(rawPct, 0, 100);

      if (activeDrag === "SL") {
        setSlPct(clamp(nextPct, Math.max(safeLiqPct, slBounds.min), Math.min(safeEntryPct, slBounds.max)));
        return;
      }

      setTpPct(clamp(nextPct, Math.max(safeEntryPct, tpBounds.min), tpBounds.max));
    },
    [activeDrag, safeEntryPct, safeLiqPct, slBounds.max, slBounds.min, tpBounds.max, tpBounds.min],
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
      className={`flex w-full max-w-[400px] flex-col gap-4 rounded-[24px] p-4 ${PNL_GLASS_PANEL} ${
        isFastForwardFx ? "animate-[position-shake_360ms_ease-in-out_1]" : ""
      }`}
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

      {/* Progress + metrics — Figma 2072:7710 */}
      <div ref={chartRef} className="relative h-[100px] w-full overflow-hidden rounded-lg">
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
          markerKey="LIQ"
          leftPct={safeLiqPct}
          label="LIQ"
          price={PRICE_LIQ}
          dotClassName="bg-[#ff4d5e]"
          onTooltipWidthChange={handleTooltipWidthChange}
          dotOffsetY={isSlNearLiq ? -18 : 0}
          tooltipOffsetY={liqTooltipOffsetY}
          tooltipLayer={isSlNearLiq ? 2 : 0}
        />
        <RulerMark
          markerKey="SL"
          leftPct={safeSlPct}
          label="SL"
          price={slPrice}
          dotClassName="bg-[#f2ff00]"
          onPointerDown={startDrag("SL")}
          isDragging={activeDrag === "SL"}
          isPinnedOpen={pendingMark === "SL"}
          showLoader={pendingMark === "SL"}
          onTooltipWidthChange={handleTooltipWidthChange}
          tooltipLayer={isSlNearLiq ? 1 : 0}
          expandHitArea={isSlNearLiq || isSlNearEntry}
        />
        <RulerMark
          markerKey="TP"
          leftPct={safeTpPct}
          label="TP"
          price={tpPrice}
          dotClassName="bg-[#5dd978]"
          onPointerDown={startDrag("TP")}
          isDragging={activeDrag === "TP"}
          isPinnedOpen={pendingMark === "TP"}
          showLoader={pendingMark === "TP"}
          onTooltipWidthChange={handleTooltipWidthChange}
          tooltipLayer={isTpNearEntry ? 1 : 0}
          expandHitArea={isTpNearEntry}
        />
        <EntryMark
          leftPct={safeEntryPct}
          price={PRICE_ENTRY}
          tooltipRef={entryTooltipRef}
          dotOffsetY={isEntryNearAnotherMark ? -18 : 0}
          tooltipOffsetY={entryTooltipOffsetY}
          tooltipLayer={isEntryNearAnotherMark ? 2 : 0}
        />
      </div>
      <style>{`
        @keyframes position-shake {
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
