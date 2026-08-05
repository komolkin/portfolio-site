"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState } from "react";
import {
  OPEN_ORDER_ROWS,
  POSITION_ROWS,
  type OpenOrderRow,
  type PositionRow,
} from "./data";

/**
 * Positions compact list — Figma node 11999:30251
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=11999-30251
 * Entry marker — https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=11999-30037
 */
/** Matches Figma bar fill `#106F25` */
const BAR_FILL_COLOR = "#106F25";
const BAR_FILL_HOVER = "#159a35";
/** Dark red when fill is below entry — keeps bright liq marker readable */
const BAR_FILL_BELOW_ENTRY = "#7a0f1c";
const BAR_FILL_BELOW_ENTRY_HOVER = "#9a1424";
const LIQ_COLOR = "#ff4d5e";
const LIQ_HOVER = "#ff7a87";
/** Figma entry tick — solid vertical marker, white/60% */
const ENTRY_MARKER_WIDTH = 3;
const ENTRY_MARKER_HEIGHT = 7;

const BAR_TRACK_WIDTH = 147;
const BAR_TRACK_HEIGHT = 17;
const SIM_TICK_MS = 1600;
/** Progress fill stays clear of the track edge */
const FILL_MAX = BAR_TRACK_WIDTH - 4;
/** Full track width maps to 100¢ */
const TRACK_CENTS = 100;

type TabId = "positions" | "open-orders";

type RowSim = {
  cashOut: number;
  fillWidth: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Map a px position/width on the track to cents (0–100). */
function centsFromPx(px: number): number {
  return Math.round(clamp((px / BAR_TRACK_WIDTH) * TRACK_CENTS, 0, TRACK_CENTS));
}

function initialSims(): RowSim[] {
  return POSITION_ROWS.map((row) => ({
    cashOut: row.cashOutBase,
    fillWidth: row.fillWidthBase,
  }));
}

/** Random-walk cash out around the row base, scaled by size. */
function nextCashOut(base: number, prev: number): number {
  const spread = Math.max(80, Math.round(base * 0.18));
  const step = Math.round((Math.random() * 2 - 1) * spread * 0.7);
  return Math.round(clamp(prev + step, base - spread, base + spread));
}

/** Dramatic random-walk fill — wide range across the track. */
function nextFillWidth(_base: number, liqWidth: number, prev: number): number {
  const min = Math.max(liqWidth + 10, 28);
  const max = FILL_MAX;
  // Occasionally jump toward a random target in the full range
  if (Math.random() < 0.35) {
    return clamp(min + Math.random() * (max - min), min, max);
  }
  const step = (Math.random() * 2 - 1) * 28;
  return clamp(prev + step, min, max);
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US");
}

type TipKind = "price" | "liq" | "entry" | null;

type BarTooltipState = {
  kind: TipKind;
  x: number;
  y: number;
};

function tipLabel(kind: Exclude<TipKind, null>): string {
  if (kind === "price") return "Current price";
  if (kind === "liq") return "Liquidation at";
  return "Entry at";
}

function tipCents(
  kind: Exclude<TipKind, null>,
  currentPriceCents: number,
  liquidationCents: number,
  entryCents: number,
): number {
  if (kind === "price") return currentPriceCents;
  if (kind === "liq") return liquidationCents;
  return entryCents;
}

function BarTooltip({
  tip,
  currentPriceCents,
  liquidationCents,
  entryCents,
}: {
  tip: BarTooltipState;
  currentPriceCents: number;
  liquidationCents: number;
  entryCents: number;
}) {
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [label, setLabel] = useState("");
  const [cents, setCents] = useState(0);
  const [moveReady, setMoveReady] = useState(false);
  const wasVisibleRef = useRef(false);

  // Drive show / hide / switch from tip state
  useEffect(() => {
    if (tip.kind !== null) {
      const nextLabel = tipLabel(tip.kind);
      const nextCents = tipCents(
        tip.kind,
        currentPriceCents,
        liquidationCents,
        entryCents,
      );

      if (!wasVisibleRef.current) {
        // First appear: snap to position (no slide from 0,0), then fade/rise in
        setMoveReady(false);
        setPos({ x: tip.x, y: tip.y });
        setLabel(nextLabel);
        setCents(nextCents);
        wasVisibleRef.current = true;
        const id = window.requestAnimationFrame(() => {
          setShown(true);
          // Enable position tween after the appear frame so switches can animate
          window.requestAnimationFrame(() => setMoveReady(true));
        });
        return () => window.cancelAnimationFrame(id);
      }

      // Switching targets or updating while open — keep visible, tween position
      setMoveReady(true);
      setPos({ x: tip.x, y: tip.y });
      setLabel(nextLabel);
      setCents(nextCents);
      setShown(true);
      return;
    }

    // Hide: keep last text/position so the box doesn't go empty mid-fade
    wasVisibleRef.current = false;
    setShown(false);
    setMoveReady(false);
  }, [tip.kind, tip.x, tip.y, currentPriceCents, liquidationCents, entryCents]);

  // Live-update cents for current-price while hovering
  useEffect(() => {
    if (tip.kind === "price") {
      setCents(currentPriceCents);
    }
  }, [tip.kind, currentPriceCents]);

  if (!label) return null;

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded-md bg-black/80 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
      style={{
        left: pos.x,
        top: pos.y - 6,
        opacity: shown ? 1 : 0,
        transform: shown
          ? "translate(-50%, -100%) translateY(0px)"
          : "translate(-50%, -100%) translateY(10px)",
        transition: moveReady
          ? "opacity 180ms ease-out, transform 180ms ease-out, left 200ms ease-out, top 200ms ease-out"
          : "opacity 180ms ease-out, transform 180ms ease-out",
      }}
    >
      {label} {cents}¢
    </div>
  );
}

function PositionBar({
  fillWidth,
  liqWidth,
  entryLeft,
}: {
  fillWidth: number;
  liqWidth: number;
  entryLeft: number;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<BarTooltipState>({
    kind: null,
    x: 0,
    y: 0,
  });

  // Track width = 100¢: liq from red width, entry from marker x, current from fill width
  const liquidationCents = centsFromPx(liqWidth);
  const entryCents = centsFromPx(entryLeft);
  const currentPriceCents = centsFromPx(fillWidth);

  const anchorTip = (kind: Exclude<TipKind, null>, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTip({
      kind,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTip = () => {
    setTip((prev) => ({ ...prev, kind: null }));
  };

  const showPriceTip = () => {
    const bar = barRef.current;
    if (!bar) return;
    anchorTip("price", bar);
  };

  const belowEntry = fillWidth < entryLeft;
  const fillColor = belowEntry
    ? tip.kind === "price"
      ? BAR_FILL_BELOW_ENTRY_HOVER
      : BAR_FILL_BELOW_ENTRY
    : tip.kind === "price"
      ? BAR_FILL_HOVER
      : BAR_FILL_COLOR;

  // Keep anchored tooltip centered if the page scrolls while visible
  useEffect(() => {
    if (tip.kind !== "price" || !barRef.current) return;

    const sync = () => {
      const rect = barRef.current!.getBoundingClientRect();
      setTip((prev) =>
        prev.kind === "price"
          ? { ...prev, x: rect.left + rect.width / 2, y: rect.top }
          : prev,
      );
    };

    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [tip.kind]);

  return (
    <div
      ref={barRef}
      className="relative shrink-0"
      style={{ width: BAR_TRACK_WIDTH, height: BAR_TRACK_HEIGHT }}
      onMouseLeave={hideTip}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
        <div
          className="absolute inset-0 rounded-lg transition-colors duration-150 ease-out"
          style={{
            backgroundColor:
              tip.kind === "price" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          }}
        />
        <div
          className="absolute left-0 top-0 h-full rounded-lg"
          style={{
            width: fillWidth,
            backgroundColor: fillColor,
            transition: "width 700ms ease-out, background-color 150ms ease-out",
          }}
        />
      </div>

      {/* Full track — current price (parent mouseLeave dismisses all tips) */}
      <div
        className="absolute inset-0 z-[5] cursor-pointer"
        aria-label={`Current price ${currentPriceCents}¢`}
        onMouseEnter={showPriceTip}
      />

      {/* Entry marker — solid vertical tick */}
      <div
        className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
        style={{
          left: entryLeft,
          width: Math.max(ENTRY_MARKER_WIDTH, 12),
          height: BAR_TRACK_HEIGHT,
        }}
        aria-label={`Entry at ${entryCents}¢`}
        onMouseEnter={(e) => anchorTip("entry", e.currentTarget)}
      >
        <div
          className="pointer-events-none rounded-sm transition-colors duration-150 ease-out"
          style={{
            width: ENTRY_MARKER_WIDTH,
            height: ENTRY_MARKER_HEIGHT,
            backgroundColor:
              tip.kind === "entry" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
          }}
        />
      </div>

      {/* Red liquidation hit target */}
      <div
        className="absolute top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center"
        style={{ left: 6, width: liqWidth, height: BAR_TRACK_HEIGHT }}
        aria-label={`Liquidation at ${liquidationCents}¢`}
        onMouseEnter={(e) => anchorTip("liq", e.currentTarget)}
      >
        <div
          className="pointer-events-none h-[7px] w-full rounded transition-colors duration-150 ease-out"
          style={{
            backgroundColor: tip.kind === "liq" ? LIQ_HOVER : LIQ_COLOR,
          }}
        />
      </div>

      <BarTooltip
        tip={tip}
        currentPriceCents={currentPriceCents}
        liquidationCents={liquidationCents}
        entryCents={entryCents}
      />
    </div>
  );
}

function PositionRowItem({
  row,
  cashOut,
  fillWidth,
}: {
  row: PositionRow;
  cashOut: number;
  fillWidth: number;
}) {
  return (
    <div className="flex w-full items-center gap-6">
      <div className="flex w-40 shrink-0 flex-col gap-1">
        <p className="whitespace-nowrap text-base font-semibold leading-none text-white">
          {row.title}
        </p>
        <p className="w-[140px] text-xs font-normal leading-[1.25] text-white/60">
          {row.sharesLabel}
        </p>
      </div>

      <div className="flex w-[100px] shrink-0 items-center gap-2">
        <span
          className={`inline-flex items-center justify-center rounded-xl px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white ${
            row.side === "YES" ? "bg-[#214a2a]" : "bg-[#7a0f1c]"
          }`}
        >
          {row.side}
        </span>
        <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white">
          {row.leverage}
        </span>
      </div>

      <p className="w-[140px] shrink-0 text-sm font-semibold leading-[1.25] text-white">
        <span>{row.from} → </span>
        <span className="text-[#5dd978]">${formatUsd(row.to)}</span>
      </p>

      <PositionBar
        fillWidth={fillWidth}
        liqWidth={row.liqWidth}
        entryLeft={row.entryLeft}
      />

      <button
        type="button"
        className="ml-auto flex h-10 min-w-[161px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/10 px-3 text-center text-sm font-semibold leading-[1.25] text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.97]"
      >
        <span className="inline-flex items-baseline">
          <span>Cash Out&nbsp;$</span>
          <NumberFlow
            value={cashOut}
            trend={0}
            format={{ useGrouping: true }}
            className="tabular-nums text-inherit"
          />
        </span>
      </button>
    </div>
  );
}

function OpenOrderRowItem({ row }: { row: OpenOrderRow }) {
  return (
    <div className="flex w-full items-center gap-6">
      <div className="flex w-40 shrink-0 flex-col gap-1">
        <p className="whitespace-nowrap text-base font-semibold leading-none text-white">
          {row.title}
        </p>
        <p className="text-xs font-normal leading-[1.25] text-white/60">
          {row.totalLabel} in total
        </p>
      </div>

      <div className="flex w-[100px] shrink-0 items-center gap-2">
        <span
          className={`inline-flex items-center justify-center rounded-xl px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white ${
            row.side === "YES" ? "bg-[#214a2a]" : "bg-[#7a0f1c]"
          }`}
        >
          {row.side}
        </span>
        <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white">
          {row.leverage}
        </span>
      </div>

      <p className="w-[160px] shrink-0 text-sm font-semibold leading-[1.25] text-white">
        {row.orderLabel}
      </p>

      <p className="w-[140px] shrink-0 text-sm font-semibold leading-[1.25] text-white">
        {row.filledLabel}
      </p>

      <button
        type="button"
        className="ml-auto flex h-10 min-w-[161px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/10 px-3 text-center text-sm font-semibold leading-[1.25] text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.97]"
      >
        Cancel order
      </button>
    </div>
  );
}

export default function Positions() {
  const [activeTab, setActiveTab] = useState<TabId>("positions");
  const [sims, setSims] = useState<RowSim[]>(initialSims);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const positionsTabRef = useRef<HTMLButtonElement>(null);
  const openOrdersTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSims((prev) =>
        prev.map((sim, i) => {
          const row = POSITION_ROWS[i];
          const fillWidth = nextFillWidth(
            row.fillWidthBase,
            row.liqWidth,
            sim.fillWidth,
          );
          return {
            cashOut: nextCashOut(row.cashOutBase, sim.cashOut),
            fillWidth,
          };
        }),
      );
    }, SIM_TICK_MS);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const updateIndicator = () => {
      const tab =
        activeTab === "positions"
          ? positionsTabRef.current
          : openOrdersTabRef.current;
      if (!tab) return;
      setIndicator({ left: tab.offsetLeft, width: tab.offsetWidth });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTab]);

  return (
    <div className="relative flex w-full max-w-[852px] flex-col items-start overflow-x-auto px-4 md:px-0">
      <div className="flex min-w-[820px] w-full flex-col gap-6">
        {/* Tabs */}
        <div className="flex w-full flex-col gap-4">
          <div
            className="flex items-center gap-4"
            role="tablist"
            aria-label="Positions views"
          >
            <button
              ref={positionsTabRef}
              type="button"
              role="tab"
              aria-selected={activeTab === "positions"}
              className="flex items-center gap-1.5"
              onClick={() => setActiveTab("positions")}
            >
              <span
                className={`text-base font-semibold leading-[1.25] ${
                  activeTab === "positions" ? "text-white" : "text-white/40"
                }`}
              >
                Positions
              </span>
              <span className="rounded-md bg-white/[0.06] px-1.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                6
              </span>
            </button>

            <button
              ref={openOrdersTabRef}
              type="button"
              role="tab"
              aria-selected={activeTab === "open-orders"}
              className="flex items-center gap-1.5"
              onClick={() => setActiveTab("open-orders")}
            >
              <span
                className={`text-base font-semibold leading-[1.25] ${
                  activeTab === "open-orders" ? "text-white" : "text-white/40"
                }`}
              >
                Open Orders
              </span>
              <span className="rounded-md bg-white/[0.06] px-1.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                4
              </span>
            </button>
          </div>

          <div className="relative h-px w-full">
            <div
              className="absolute top-0 h-px bg-white transition-[left,width] duration-200 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>
        </div>

        {/* List */}
        {activeTab === "positions" ? (
          <div className="flex w-full max-w-[820px] flex-col gap-3" role="tabpanel">
            {POSITION_ROWS.map((row, index) => (
              <div key={row.id} className="flex w-full flex-col gap-3">
                <PositionRowItem
                  row={row}
                  cashOut={sims[index].cashOut}
                  fillWidth={sims[index].fillWidth}
                />
                {index < POSITION_ROWS.length - 1 && (
                  <div className="h-px w-full bg-white/10" aria-hidden />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex w-full max-w-[820px] flex-col gap-3" role="tabpanel">
            {OPEN_ORDER_ROWS.map((row, index) => (
              <div key={row.id} className="flex w-full flex-col gap-3">
                <OpenOrderRowItem row={row} />
                {index < OPEN_ORDER_ROWS.length - 1 && (
                  <div className="h-px w-full bg-white/10" aria-hidden />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
