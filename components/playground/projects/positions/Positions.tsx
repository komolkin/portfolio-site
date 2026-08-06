"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
/** Red liq line height; left inset matches top/bottom padding in the track */
const LIQ_LINE_HEIGHT = 7;
const LIQ_INSET = (BAR_TRACK_HEIGHT - LIQ_LINE_HEIGHT) / 2;
const SIM_TICK_MS = 1600;
/** Progress fill stays clear of the track edge */
const FILL_MAX = BAR_TRACK_WIDTH - 4;
/** Full track width maps to 100¢ */
const TRACK_CENTS = 100;
/** Shared desktop row columns so Positions / Open Orders match overall width */
const DESKTOP_ROW_POSITIONS =
  "grid w-full items-center gap-6 [grid-template-columns:160px_120px_150px_minmax(147px,1fr)_120px]";
const DESKTOP_ROW_ORDERS =
  "grid w-full items-center gap-6 [grid-template-columns:160px_120px_200px_minmax(100px,1fr)_120px]";

type TabId = "positions" | "open-orders";
type ViewMode = "desktop" | "mobile";

/** Match site mobile breakpoint — force mobile layout and hide switcher */
const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)";

type RowSim = {
  cashOut: number;
  fillWidth: number;
};

function LaptopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function CashOutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
      <path d="M4 19h16" />
    </svg>
  );
}

function CancelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

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

function HoverTooltip({
  visible,
  x,
  y,
  children,
}: {
  visible: boolean;
  x: number;
  y: number;
  children: string;
}) {
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [moveReady, setMoveReady] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible) {
      if (!wasVisibleRef.current) {
        setMoveReady(false);
        setPos({ x, y });
        setHasContent(true);
        wasVisibleRef.current = true;
        const id = window.requestAnimationFrame(() => {
          setShown(true);
          window.requestAnimationFrame(() => setMoveReady(true));
        });
        return () => window.cancelAnimationFrame(id);
      }

      setMoveReady(true);
      setPos({ x, y });
      setShown(true);
      return;
    }

    wasVisibleRef.current = false;
    setShown(false);
    setMoveReady(false);
  }, [visible, x, y]);

  if (!hasContent) return null;

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
      {children}
    </div>
  );
}

function PositionBar({
  fillWidth,
  liqWidth,
  entryLeft,
  fluid = false,
  tooltips = true,
}: {
  fillWidth: number;
  liqWidth: number;
  entryLeft: number;
  /** Stretch track to full container width (mobile) */
  fluid?: boolean;
  /** Hover tooltips for price / entry / liquidation */
  tooltips?: boolean;
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

  const fillPct = (fillWidth / BAR_TRACK_WIDTH) * 100;
  const liqPct = (liqWidth / BAR_TRACK_WIDTH) * 100;
  const entryPct = (entryLeft / BAR_TRACK_WIDTH) * 100;

  const anchorTip = (kind: Exclude<TipKind, null>, el: HTMLElement) => {
    if (!tooltips) return;
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
    if (!tooltips) return;
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
    if (!tooltips || tip.kind !== "price" || !barRef.current) return;

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
  }, [tip.kind, tooltips]);

  return (
    <div
      ref={barRef}
      className={fluid ? "relative w-full" : "relative shrink-0"}
      style={
        fluid
          ? { height: BAR_TRACK_HEIGHT }
          : { width: BAR_TRACK_WIDTH, height: BAR_TRACK_HEIGHT }
      }
      onMouseLeave={tooltips ? hideTip : undefined}
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
            width: `${fillPct}%`,
            backgroundColor: fillColor,
            transition: "width 700ms ease-out, background-color 150ms ease-out",
          }}
        />
      </div>

      {tooltips && (
        <>
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
              left: `${entryPct}%`,
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
                  tip.kind === "entry"
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.6)",
              }}
            />
          </div>

          {/* Red liquidation hit target */}
          <div
            className="absolute top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center"
            style={{
              left: LIQ_INSET,
              width: `${liqPct}%`,
              height: BAR_TRACK_HEIGHT,
            }}
            aria-label={`Liquidation at ${liquidationCents}¢`}
            onMouseEnter={(e) => anchorTip("liq", e.currentTarget)}
          >
            <div
              className="pointer-events-none w-full rounded transition-colors duration-150 ease-out"
              style={{
                height: LIQ_LINE_HEIGHT,
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
        </>
      )}

      {!tooltips && (
        <>
          {/* Non-interactive markers for mobile */}
          <div
            className="pointer-events-none absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{
              left: `${entryPct}%`,
              width: Math.max(ENTRY_MARKER_WIDTH, 12),
              height: BAR_TRACK_HEIGHT,
            }}
            aria-hidden
          >
            <div
              className="rounded-sm"
              style={{
                width: ENTRY_MARKER_WIDTH,
                height: ENTRY_MARKER_HEIGHT,
                backgroundColor: "rgba(255,255,255,0.6)",
              }}
            />
          </div>
          <div
            className="pointer-events-none absolute top-1/2 z-10 flex -translate-y-1/2 items-center"
            style={{
              left: LIQ_INSET,
              width: `${liqPct}%`,
              height: BAR_TRACK_HEIGHT,
            }}
            aria-hidden
          >
            <div
              className="w-full rounded"
              style={{
                height: LIQ_LINE_HEIGHT,
                backgroundColor: LIQ_COLOR,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function PositionRowItem({
  row,
  cashOut,
  fillWidth,
  mobile = false,
}: {
  row: PositionRow;
  cashOut: number;
  fillWidth: number;
  mobile?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sharesTip, setSharesTip] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  const showSharesTip = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setSharesTip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideSharesTip = () => {
    setSharesTip((prev) => ({ ...prev, visible: false }));
  };

  const sharesTipTargetRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!sharesTip.visible || !sharesTipTargetRef.current) return;

    const sync = () => {
      const el = sharesTipTargetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSharesTip((prev) =>
        prev.visible
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
  }, [sharesTip.visible]);

  const sideBadge = (
    <>
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
    </>
  );

  const cashOutButton = (
    <button
      type="button"
      aria-label={`Cash out $${formatUsd(cashOut)}`}
      className={`flex h-10 items-center justify-center gap-1.5 overflow-hidden rounded-full border-2 border-white/10 px-3 text-sm font-semibold leading-[1.25] text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.97] ${
        mobile ? "shrink-0" : "w-full"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <CashOutIcon />
      <span className="inline-flex items-baseline">
        <span>$</span>
        <NumberFlow
          value={cashOut}
          trend={0}
          format={{ useGrouping: true }}
          className="tabular-nums text-inherit"
        />
      </span>
    </button>
  );

  if (mobile) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer flex-col rounded-2xl bg-white/[0.06] p-4 transition-[colors,transform] duration-150 ease-out hover:bg-white/[0.1] active:scale-[0.98]"
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-base font-semibold leading-none text-white">
              {row.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-semibold leading-[1.25] text-white ${
                  row.side === "YES" ? "bg-[#214a2a]" : "bg-[#7a0f1c]"
                }`}
              >
                {row.side}
              </span>
              <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold leading-[1.25] text-white">
                {row.leverage}
              </span>
              <p className="ml-1.5 text-xs font-normal leading-[1.25] text-white">
                <span>{row.from} → </span>
                <span className="text-[#5dd978]">${formatUsd(row.to)}</span>
              </p>
            </div>
          </div>

          {cashOutButton}
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
          aria-hidden={!expanded}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-col gap-3">
              <div className="flex w-full items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs font-normal leading-[1.25] text-white/60">
                    Shares
                  </p>
                  <p className="text-sm font-semibold leading-[1.25] text-white tabular-nums">
                    {row.sharesLabel.replace(/\s*shares?/i, "")}
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs font-normal leading-[1.25] text-white/60">
                    Entry
                  </p>
                  <p className="text-sm font-semibold leading-[1.25] text-white tabular-nums">
                    {centsFromPx(row.entryLeft)}¢
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs font-normal leading-[1.25] text-white/60">
                    Liquidation
                  </p>
                  <p className="text-sm font-semibold leading-[1.25] text-white tabular-nums">
                    {centsFromPx(row.liqWidth)}¢
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs font-normal leading-[1.25] text-white/60">
                    Current
                  </p>
                  <p className="text-sm font-semibold leading-[1.25] text-white tabular-nums">
                    <NumberFlow
                      value={centsFromPx(fillWidth)}
                      trend={0}
                      suffix="¢"
                      className="tabular-nums text-inherit"
                    />
                  </p>
                </div>
              </div>

              <PositionBar
                fillWidth={fillWidth}
                liqWidth={row.liqWidth}
                entryLeft={row.entryLeft}
                fluid
                tooltips={false}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={DESKTOP_ROW_POSITIONS}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-base font-semibold leading-none text-white">
          {row.title}
        </p>
      </div>

      <div className="flex items-center gap-2">{sideBadge}</div>

      <div className="min-w-0">
        <p
          ref={sharesTipTargetRef}
          className="w-fit cursor-pointer text-sm font-normal leading-[1.25] text-white"
          onMouseEnter={(e) => showSharesTip(e.currentTarget)}
          onMouseLeave={hideSharesTip}
        >
          <span>{row.from} → </span>
          <span className="text-[#5dd978]">${formatUsd(row.to)}</span>
        </p>
        <HoverTooltip
          visible={sharesTip.visible}
          x={sharesTip.x}
          y={sharesTip.y}
        >
          {row.sharesLabel}
        </HoverTooltip>
      </div>

      <PositionBar
        fillWidth={fillWidth}
        liqWidth={row.liqWidth}
        entryLeft={row.entryLeft}
      />

      {cashOutButton}
    </div>
  );
}

function OpenOrderRowItem({
  row,
  mobile = false,
}: {
  row: OpenOrderRow;
  mobile?: boolean;
}) {
  const [totalTip, setTotalTip] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  const totalTipTargetRef = useRef<HTMLParagraphElement>(null);

  const showTotalTip = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTotalTip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTotalTip = () => {
    setTotalTip((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (!totalTip.visible || !totalTipTargetRef.current) return;

    const sync = () => {
      const el = totalTipTargetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setTotalTip((prev) =>
        prev.visible
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
  }, [totalTip.visible]);

  const sideBadge = (
    <>
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
    </>
  );

  const cancelButton = (
    <button
      type="button"
      aria-label="Cancel order"
      className={`flex items-center justify-center overflow-hidden rounded-full border-2 border-white/10 text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.97] ${
        mobile
          ? "size-10 shrink-0"
          : "h-10 w-full gap-1.5 px-3 text-sm font-semibold leading-[1.25]"
      }`}
    >
      {mobile ? (
        <CancelIcon />
      ) : (
        <>
          <CancelIcon />
          <span>Cancel</span>
        </>
      )}
    </button>
  );

  if (mobile) {
    return (
      <div className="flex w-full cursor-pointer flex-col gap-3 rounded-2xl bg-white/[0.06] p-4 transition-colors duration-150 ease-out hover:bg-white/[0.1]">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-base font-semibold leading-none text-white">
              {row.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 text-[11px] font-semibold leading-[1.25] text-white ${
                  row.side === "YES" ? "bg-[#214a2a]" : "bg-[#7a0f1c]"
                }`}
              >
                {row.side}
              </span>
              <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold leading-[1.25] text-white">
                {row.leverage}
              </span>
              <p className="ml-1.5 text-xs font-normal leading-[1.25] text-white">
                {row.orderLabel}
              </p>
            </div>
          </div>

          {cancelButton}
        </div>
      </div>
    );
  }

  return (
    <div className={DESKTOP_ROW_ORDERS}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-base font-semibold leading-none text-white">
          {row.title}
        </p>
      </div>

      <div className="flex items-center gap-2">{sideBadge}</div>

      <div className="min-w-0">
        <p
          ref={totalTipTargetRef}
          className="w-fit cursor-pointer text-sm font-normal leading-[1.25] text-white"
          onMouseEnter={(e) => showTotalTip(e.currentTarget)}
          onMouseLeave={hideTotalTip}
        >
          {row.orderLabel}
        </p>
        <HoverTooltip
          visible={totalTip.visible}
          x={totalTip.x}
          y={totalTip.y}
        >
          {`${row.totalLabel} in total`}
        </HoverTooltip>
      </div>

      <p className="text-sm font-normal leading-[1.25] text-white">
        {row.filledAmount} filled
      </p>

      {cancelButton}
    </div>
  );
}

export default function Positions() {
  const [activeTab, setActiveTab] = useState<TabId>("positions");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
      : false,
  );
  const [sims, setSims] = useState<RowSim[]>(initialSims);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const positionsTabRef = useRef<HTMLButtonElement>(null);
  const openOrdersTabRef = useRef<HTMLButtonElement>(null);
  const indicatorTrackRef = useRef<HTMLDivElement>(null);
  const isMobile = isNarrowViewport || viewMode === "mobile";
  const showViewSwitcher = !isNarrowViewport;
  const positionRows = isMobile ? POSITION_ROWS.slice(0, 3) : POSITION_ROWS;
  const openOrderRows = isMobile ? OPEN_ORDER_ROWS.slice(0, 3) : OPEN_ORDER_ROWS;

  useEffect(() => {
    const media = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const update = () => setIsNarrowViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const tab =
        activeTab === "positions"
          ? positionsTabRef.current
          : openOrdersTabRef.current;
      const track = indicatorTrackRef.current;
      if (!tab || !track) return;
      const tabRect = tab.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - trackRect.left,
        width: tabRect.width,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTab, viewMode, isNarrowViewport]);

  return (
    <div
      className={`relative flex w-full flex-col items-start px-4 md:px-0 ${
        isMobile ? "max-w-[390px]" : "max-w-[820px]"
      }`}
    >
      <div className="flex w-full flex-col gap-6">
        {/* Tabs */}
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex w-full items-center gap-4">
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
                  {positionRows.length}
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
                  {openOrderRows.length}
                </span>
              </button>
            </div>

            {showViewSwitcher && (
              <button
                type="button"
                className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label={
                  isMobile
                    ? "Switch to desktop layout"
                    : "Switch to mobile layout"
                }
                aria-pressed={isMobile}
                onClick={() =>
                  setViewMode((mode) =>
                    mode === "desktop" ? "mobile" : "desktop",
                  )
                }
              >
                {isMobile ? <PhoneIcon /> : <LaptopIcon />}
              </button>
            )}
          </div>

          <div ref={indicatorTrackRef} className="relative h-px w-full">
            <div
              className="absolute top-0 h-px bg-white transition-[left,width] duration-200 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>
        </div>

        {/* List */}
        {activeTab === "positions" ? (
          <div
            className={`flex w-full flex-col ${isMobile ? "gap-2" : "gap-3"}`}
            role="tabpanel"
          >
            {positionRows.map((row, index) => (
              <div key={row.id} className="flex w-full flex-col gap-3">
                <PositionRowItem
                  row={row}
                  cashOut={sims[index].cashOut}
                  fillWidth={sims[index].fillWidth}
                  mobile={isMobile}
                />
                {!isMobile && index < positionRows.length - 1 && (
                  <div className="h-px w-full bg-white/10" aria-hidden />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`flex w-full flex-col ${isMobile ? "gap-2" : "gap-3"}`}
            role="tabpanel"
          >
            {openOrderRows.map((row, index) => (
              <div key={row.id} className="flex w-full flex-col gap-3">
                <OpenOrderRowItem row={row} mobile={isMobile} />
                {!isMobile && index < openOrderRows.length - 1 && (
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
