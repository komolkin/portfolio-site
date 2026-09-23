"use client";

import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { instrumentSansCondensed } from "@/lib/fonts";
import { EXPANDABLE_ROWS, type ExpandableRow, type PositionSide } from "./data";
import ExpandableParticles from "./ExpandableParticles";

/**
 * Expandable positions — expanded card Figma node 16140:45831
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=16140-45831
 */
const IMG_FLAG = "/playground/expandable/flag.png";
const IMG_SHARE_16 = "/playground/expandable/share-16.svg";
const IMG_SHARE_24 = "/playground/expandable/share-24.svg";

const BAR_FILL_COLOR = "#106F25";
const BAR_FILL_BELOW_ENTRY = "#7a0f1c";
const LIQ_COLOR = "#ff4d5e";
const LIQ_HOVER = "#ff7a87";
const LIQ_GLOW_RANGE = 18;
const END_GLOW_RANGE = 22;

const COMPACT_TRACK_HEIGHT = 17;
const COMPACT_LIQ_HEIGHT = 7;
const COMPACT_ENTRY_W = 3;
const COMPACT_ENTRY_H = 7;

const SIM_TICK_MS = 1600;
const FILL_MIN_CENTS = 8;
const FILL_MAX_CENTS = 92;
const TRACK_CENTS = 100;

type RowSim = {
  fillCents: number;
};

type TipKind = "price" | "liq" | "entry" | null;

type BarTooltipState = {
  kind: TipKind;
  x: number;
  y: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function initialSims(): RowSim[] {
  return EXPANDABLE_ROWS.map((row) => ({
    fillCents: row.fillCentsBase,
  }));
}

function nextFillCents(liqCents: number, prev: number): number {
  const min = Math.max(liqCents + 4, FILL_MIN_CENTS);
  const max = Math.max(FILL_MAX_CENTS, min + 4);
  if (Math.random() < 0.35) {
    return clamp(min + Math.random() * (max - min), min, max);
  }
  const step = (Math.random() * 2 - 1) * 18;
  return clamp(prev + step, min, max);
}

/** Cash-out at entry = stake; 0 at liq; PnL scales with distance from entry. */
function positionValue(row: ExpandableRow, fillCents: number) {
  const down = Math.max(row.entryCents - row.liqCents, 1);
  const cashOut = Math.max(
    0,
    Math.round((row.stake * (fillCents - row.liqCents)) / down),
  );
  return { cashOut, pnl: cashOut - row.stake };
}

function formatUsd(n: number): string {
  return n.toLocaleString("en-US");
}

function clampLiqPct(liqCents: number, entryCents: number): number {
  const liqPct = (liqCents / TRACK_CENTS) * 100;
  const entryPct = (entryCents / TRACK_CENTS) * 100;
  return clamp(Math.min(liqPct, entryPct - 2), 2, 100);
}

function getCashOutGlow(fillCents: number, entryCents: number, liqCents: number) {
  const liqDelta = fillCents - liqCents;
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

  if (fillCents < entryCents) {
    return { mode: "off" as const, strength: 0, pulseMs: 0 };
  }

  const progressFromEntry =
    (fillCents - entryCents) / Math.max(1, TRACK_CENTS - entryCents);
  const endDelta = TRACK_CENTS - fillCents;
  const endProximity =
    endDelta <= END_GLOW_RANGE ? 1 - endDelta / END_GLOW_RANGE : 0;
  const strength = Math.min(
    1,
    0.14 + progressFromEntry * 0.46 + endProximity * 0.24,
  );
  const pulseMs = Math.max(
    320,
    Math.round(2600 - progressFromEntry * 1400 - endProximity * 900),
  );

  return { mode: "win" as const, strength, pulseMs };
}

function tipLabel(kind: Exclude<TipKind, null>): string {
  if (kind === "price") return "Current price";
  if (kind === "liq") return "Liquidation at";
  return "Entry at";
}

const GRADIENT_BORDER_WHITE =
  "linear-gradient(315deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.18) 100%) border-box";
const GRADIENT_BORDER_YES =
  "linear-gradient(315deg, rgba(93,217,120,0.35) 0%, rgba(93,217,120,0.08) 35%, rgba(255,255,255,0) 55%, rgba(93,217,120,0.2) 100%) border-box";
const GRADIENT_BORDER_NO =
  "linear-gradient(315deg, rgba(255,120,130,0.35) 0%, rgba(255,77,94,0.08) 35%, rgba(255,255,255,0) 55%, rgba(255,77,94,0.2) 100%) border-box";

function GradientBorder({
  tone = "white",
}: {
  tone?: "white" | "yes" | "no";
}) {
  const background =
    tone === "yes"
      ? GRADIENT_BORDER_YES
      : tone === "no"
        ? GRADIENT_BORDER_NO
        : GRADIENT_BORDER_WHITE;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2] rounded-[inherit]"
      style={{
        background,
        mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        WebkitMask:
          "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
        WebkitMaskComposite: "xor",
        border: "1px solid transparent",
      }}
    />
  );
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

  useEffect(() => {
    if (tip.kind !== null) {
      const nextLabel = tipLabel(tip.kind);
      const nextCents =
        tip.kind === "price"
          ? currentPriceCents
          : tip.kind === "liq"
            ? liquidationCents
            : entryCents;

      if (!wasVisibleRef.current) {
        setMoveReady(false);
        setPos({ x: tip.x, y: tip.y });
        setLabel(nextLabel);
        setCents(nextCents);
        wasVisibleRef.current = true;
        const id = window.requestAnimationFrame(() => {
          setShown(true);
          window.requestAnimationFrame(() => setMoveReady(true));
        });
        return () => window.cancelAnimationFrame(id);
      }

      setMoveReady(true);
      setPos({ x: tip.x, y: tip.y });
      setLabel(nextLabel);
      setCents(nextCents);
      setShown(true);
      return;
    }

    wasVisibleRef.current = false;
    setShown(false);
    setMoveReady(false);
  }, [tip.kind, tip.x, tip.y, currentPriceCents, liquidationCents, entryCents]);

  useEffect(() => {
    if (tip.kind === "price") setCents(currentPriceCents);
  }, [tip.kind, currentPriceCents]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !label) return null;

  return createPortal(
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
    </div>,
    document.body,
  );
}

function SideBadge({
  side,
  compact,
}: {
  side: PositionSide;
  compact?: boolean;
}) {
  const isYes = side === "YES";
  const fill = isYes
    ? compact
      ? "linear-gradient(180deg, #147a2a 0%, #0c4f1c 100%)"
      : "linear-gradient(180deg, #2a5a35 0%, #1a3222 100%)"
    : "linear-gradient(180deg, #94202c 0%, #5a1018 100%)";

  return (
    <span className="relative inline-flex overflow-hidden rounded-xl">
      <span aria-hidden className="absolute inset-0" style={{ background: fill }} />
      <GradientBorder tone={isYes ? "yes" : "no"} />
      <span className="relative inline-flex items-center justify-center px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white">
        {side}
      </span>
    </span>
  );
}

function LeverageBadge({ leverage }: { leverage: string }) {
  return (
    <span className="relative inline-flex overflow-hidden rounded-full">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
        }}
      />
      <GradientBorder />
      <span className="relative inline-flex items-center justify-center px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white">
        {leverage}
      </span>
    </span>
  );
}

function TitleBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "lime";
}) {
  if (tone === "lime") {
    return (
      <span className="inline-flex items-center justify-center rounded-full border border-[#bfff00] bg-[rgba(191,255,0,0.1)] px-[10px] py-1 text-xs font-semibold leading-[1.25] text-[#bfff00]">
        {label}
      </span>
    );
  }

  return (
    <span className="relative inline-flex overflow-hidden rounded-full">
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
        }}
      />
      <span className="relative inline-flex items-center justify-center px-[10px] py-1 text-xs font-semibold leading-[1.25] text-white">
        {label}
      </span>
    </span>
  );
}

function StakeLabel({ stake, toWin }: { stake: number; toWin: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-normal leading-[1.25]">
      <span className="text-white">${formatUsd(stake)}</span>
      <span className="text-white/60">→</span>
      <span className="text-white">${formatUsd(toWin)}</span>
    </span>
  );
}

function ValueAmount({
  cashOut,
  pnl,
  size = "lg",
}: {
  cashOut: number;
  pnl: number;
  size?: "lg" | "sm";
}) {
  const positive = pnl >= 0;
  const isSm = size === "sm";
  return (
    <div className="flex w-[120px] shrink-0 flex-col items-end text-right leading-[1.25]">
      <p
        className={`font-semibold tabular-nums text-white ${
          instrumentSansCondensed.className
        } ${isSm ? "text-[32px]" : "text-[40px]"}`}
      >
        <span className="inline-flex items-baseline justify-end">
          <span>$</span>
          <NumberFlow
            value={cashOut}
            trend={0}
            format={{ useGrouping: true }}
            className="tabular-nums text-inherit"
            style={{ ["--number-flow-mask-height" as string]: "0em" }}
          />
        </span>
      </p>
      <p
        className={`text-sm font-normal tabular-nums ${
          positive ? "text-[#5dd978]" : "text-[#ff4d5e]"
        }`}
      >
        <span className="inline-flex items-baseline justify-end">
          <span>{positive ? "+$" : "-$"}</span>
          <NumberFlow
            value={Math.abs(pnl)}
            trend={0}
            format={{ useGrouping: true }}
            className="tabular-nums text-inherit"
            style={{ ["--number-flow-mask-height" as string]: "0em" }}
          />
        </span>
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  size = 40,
  children,
}: {
  label: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  size?: 40 | 60;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.97] ${
        size === 60 ? "size-[60px]" : "size-10"
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)",
        }}
      />
      <GradientBorder />
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}

function GlowSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Pulse cash out glow on" : "Static cash out glow"}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-out ${
        checked ? "bg-[#3d3d3d]" : "bg-white/15"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function CashOutButton({
  fillCents,
  entryCents,
  liqCents,
  pulse = true,
  amount,
  className = "flex h-10 w-[100px] shrink-0 items-center justify-center rounded-full text-sm font-semibold leading-[1.25]",
}: {
  fillCents: number;
  entryCents: number;
  liqCents: number;
  pulse?: boolean;
  amount?: number;
  className?: string;
}) {
  const glow = pulse
    ? getCashOutGlow(fillCents, entryCents, liqCents)
    : { mode: "off" as const, strength: 0, pulseMs: 0 };
  const animation = pulse
    ? glow.mode === "liq"
      ? `expandable-cash-out-liq-pulse ${glow.pulseMs}ms ease-in-out infinite`
      : glow.mode === "win"
        ? `expandable-cash-out-win-blink ${glow.pulseMs}ms ease-in-out infinite`
        : undefined
    : undefined;
  const glowClass = "expandable-cash-out-glow";

  return (
    <button
      type="button"
      data-cash-out
      aria-label="Cash out"
      className={`relative isolate overflow-hidden text-white transition-[transform,background-color] duration-150 ease-out hover:brightness-110 active:scale-[0.99] ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 100%)",
        }}
      />
      <GradientBorder />
      {glow.mode !== "off" && (
        <span
          aria-hidden
          className={`${glowClass} pointer-events-none absolute inset-0 z-[1] rounded-[inherit] motion-reduce:opacity-60`}
          style={{
            ["--cash-out-glow-strength" as string]: glow.strength,
            animation,
          }}
        />
      )}
      <span className="relative z-[3]">
        {amount != null ? `Cash Out $${formatUsd(amount)}` : "Cash Out"}
      </span>
    </button>
  );
}

function CompactBar({
  fillCents,
  liqCents,
  entryCents,
  showLiq = true,
}: {
  fillCents: number;
  liqCents: number;
  entryCents: number;
  showLiq?: boolean;
}) {
  const belowEntry = fillCents < entryCents;
  const fillPct = clamp((fillCents / TRACK_CENTS) * 100, 0, 100);
  const liqPct = clampLiqPct(liqCents, entryCents);
  const entryPct = clamp((entryCents / TRACK_CENTS) * 100, 0, 100);
  const fillColor = belowEntry ? BAR_FILL_BELOW_ENTRY : BAR_FILL_COLOR;

  return (
    <div className="relative w-full min-w-0 flex-1" style={{ height: COMPACT_TRACK_HEIGHT }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
        <div
          className="absolute inset-0 rounded-lg"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="absolute left-0 top-0 h-full rounded-lg"
          style={{
            width: `${fillPct}%`,
            backgroundColor: fillColor,
            transition: "width 700ms ease-out",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-sm"
        style={{
          left: `${entryPct}%`,
          width: COMPACT_ENTRY_W,
          height: COMPACT_ENTRY_H,
          backgroundColor: "rgba(255,255,255,0.2)",
        }}
      />
      {showLiq ? (
        <div
          className="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 rounded"
          style={{
            left: 6,
            width: `calc(${liqPct}% - 6px)`,
            height: COMPACT_LIQ_HEIGHT,
            backgroundColor: LIQ_COLOR,
          }}
        />
      ) : null}
    </div>
  );
}

function ExpandedBar({
  fillCents,
  liqCents,
  entryCents,
  showLiq = true,
}: {
  fillCents: number;
  liqCents: number;
  entryCents: number;
  showLiq?: boolean;
}) {
  const [tip, setTip] = useState<BarTooltipState>({ kind: null, x: 0, y: 0 });
  const belowEntry = fillCents < entryCents;
  const fillPct = clamp((fillCents / TRACK_CENTS) * 100, 0, 100);
  const liqPct = clampLiqPct(liqCents, entryCents);
  const entryPct = clamp((entryCents / TRACK_CENTS) * 100, 0, 100);
  const priceCents = Math.round(fillCents);

  const fillColor = belowEntry ? BAR_FILL_BELOW_ENTRY : BAR_FILL_COLOR;

  const anchorTip = (kind: Exclude<TipKind, null>, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTip({
      kind,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  return (
    <div
      className="relative h-[100px] w-full overflow-hidden rounded-xl"
      onMouseLeave={() => setTip((prev) => ({ ...prev, kind: null }))}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-xl"
        style={{
          width: `${fillPct}%`,
          backgroundColor: fillColor,
          transition: "width 700ms ease-out, background-color 150ms ease-out",
        }}
      />

      <div
        className={`pointer-events-none absolute top-1 z-20 w-max max-w-none -translate-x-full pr-2 text-right text-[40px] font-semibold leading-[1.25] whitespace-nowrap text-white ${instrumentSansCondensed.className}`}
        style={{
          left: `max(4.5rem, ${fillPct}%)`,
          transition: "left 700ms ease-out",
        }}
      >
        <NumberFlow
          value={priceCents}
          trend={0}
          suffix="¢"
          className="tabular-nums text-inherit"
          style={{ ["--number-flow-mask-height" as string]: "0em" }}
        />
      </div>

      {showLiq ? (
        <div
          className="absolute top-2.5 z-10 flex cursor-pointer items-end gap-1.5"
          style={{ left: `${liqPct}%` }}
          aria-label={`Liquidation at ${liqCents}¢`}
          onMouseEnter={(e) => anchorTip("liq", e.currentTarget)}
        >
          <div
            className="h-[82px] w-[3px] shrink-0 rounded-lg transition-colors duration-150 ease-out"
            style={{
              backgroundColor: tip.kind === "liq" ? LIQ_HOVER : LIQ_COLOR,
            }}
          />
          <div className="flex flex-col items-start leading-[1.25]">
            <span className="text-[10px] font-semibold text-white/60">Liq.</span>
            <span className="text-xl font-semibold tracking-[0.4px] text-white">
              {liqCents}¢
            </span>
          </div>
        </div>
      ) : null}

      <div
        className="absolute top-2.5 z-10 flex cursor-pointer items-end gap-1.5"
        style={{ left: `${entryPct}%` }}
        aria-label={`Entry at ${entryCents}¢`}
        onMouseEnter={(e) => anchorTip("entry", e.currentTarget)}
      >
        <div
          className="h-[82px] w-[3px] shrink-0 rounded-sm transition-colors duration-150 ease-out"
          style={{
            backgroundColor:
              tip.kind === "entry" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)",
          }}
        />
        <div className="flex flex-col items-start leading-[1.25]">
          <span className="text-[10px] font-semibold text-white/60">Entry</span>
          <span className="text-xl font-semibold tracking-[0.4px] text-white">
            {entryCents}¢
          </span>
        </div>
      </div>

      <BarTooltip
        tip={tip}
        currentPriceCents={priceCents}
        liquidationCents={liqCents}
        entryCents={entryCents}
      />
    </div>
  );
}

function ExpandedCardShell({
  children,
  particles,
}: {
  children: ReactNode;
  particles?: ReactNode;
}) {
  return (
    <div className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-3xl bg-white/[0.04] p-4 backdrop-blur-[17px]">
      <GradientBorder />
      {particles}
      <div className="relative z-[1] flex w-full flex-col gap-4">{children}</div>
    </div>
  );
}

function ExpandedCard({
  row,
  fillCents,
  pulseGlow,
}: {
  row: ExpandableRow;
  fillCents: number;
  pulseGlow: boolean;
}) {
  const { cashOut, pnl } = positionValue(row, fillCents);
  const toWin = positionValue(row, TRACK_CENTS).cashOut;
  const arrows = pnl >= 0 ? "up" : "down";
  const pnlPositive = pnl >= 0;

  return (
    <ExpandedCardShell
      particles={pulseGlow ? <ExpandableParticles direction={arrows} /> : null}
    >
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-[51px] w-[68px] shrink-0 overflow-hidden rounded-[7px]">
            <img
              alt=""
              className="pointer-events-none absolute inset-0 size-full object-cover"
              src={IMG_FLAG}
              width={68}
              height={51}
              draggable={false}
            />
          </div>
          <div className="flex min-w-0 flex-col items-start justify-center gap-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-xl font-semibold leading-[1.25] tracking-[0.4px] text-white">
                {row.title}
              </p>
              {row.badge ? <TitleBadge label={row.badge} tone="lime" /> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SideBadge side={row.side} />
              {row.showLeverage !== false ? (
                <LeverageBadge leverage={row.leverage} />
              ) : null}
              <StakeLabel stake={row.stake} toWin={toWin} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-6">
          <div className="flex w-[120px] shrink-0 flex-col items-end text-right">
            <span className="-mb-1 text-sm font-normal leading-[1.25] text-white/60">
              PnL
            </span>
            <p
              className={`text-[40px] font-semibold leading-[1.25] tabular-nums ${
                instrumentSansCondensed.className
              } ${pnlPositive ? "text-[#5dd978]" : "text-[#ff4d5e]"}`}
            >
              <span className="inline-flex items-baseline justify-end">
                <span>{pnlPositive ? "+$" : "-$"}</span>
                <NumberFlow
                  value={Math.abs(pnl)}
                  trend={0}
                  format={{ useGrouping: true }}
                  className="tabular-nums text-inherit"
                  style={{ ["--number-flow-mask-height" as string]: "0em" }}
                />
              </span>
            </p>
          </div>
          <IconButton
            size={60}
            label="Share position"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={IMG_SHARE_24}
              alt=""
              width={24}
              height={24}
              className="pointer-events-none"
            />
          </IconButton>
        </div>
      </div>

      <ExpandedBar
        fillCents={fillCents}
        liqCents={row.liqCents}
        entryCents={row.entryCents}
        showLiq={row.showLiq !== false}
      />

      <CashOutButton
        fillCents={fillCents}
        entryCents={row.entryCents}
        liqCents={row.liqCents}
        pulse={pulseGlow}
        amount={cashOut}
        className="flex h-14 w-full items-center justify-center rounded-full text-base font-semibold leading-[1.25]"
      />
    </ExpandedCardShell>
  );
}

function CompactRow({
  row,
  fillCents,
  pulseGlow,
  onExpand,
}: {
  row: ExpandableRow;
  fillCents: number;
  pulseGlow: boolean;
  onExpand: () => void;
}) {
  const { cashOut, pnl } = positionValue(row, fillCents);
  const toWin = positionValue(row, TRACK_CENTS).cashOut;

  return (
    <div
      className="flex w-full cursor-pointer items-center gap-6 rounded-2xl px-4 py-3.5 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.99]"
      onClick={onExpand}
    >
      <div className="flex w-[240px] shrink-0 flex-col items-start justify-center gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xl font-semibold leading-[1.25] tracking-[0.4px] text-white">
            {row.title}
          </p>
          {row.badge ? <TitleBadge label={row.badge} /> : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SideBadge side={row.side} compact />
          {row.showLeverage !== false ? (
            <LeverageBadge leverage={row.leverage} />
          ) : null}
          <StakeLabel stake={row.stake} toWin={toWin} />
        </div>
      </div>

      <CompactBar
        fillCents={fillCents}
        liqCents={row.liqCents}
        entryCents={row.entryCents}
        showLiq={row.showLiq !== false}
      />

      <div className="flex shrink-0 items-center gap-6">
        <ValueAmount cashOut={cashOut} pnl={pnl} size="sm" />
        <div className="flex items-center gap-2.5">
          <CashOutButton
            fillCents={fillCents}
            entryCents={row.entryCents}
            liqCents={row.liqCents}
            pulse={pulseGlow}
          />
          <IconButton
            label="Share position"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={IMG_SHARE_16} alt="" width={16} height={16} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function MobileCard({
  row,
  fillCents,
  expanded,
  pulseGlow,
  onToggle,
}: {
  row: ExpandableRow;
  fillCents: number;
  expanded: boolean;
  pulseGlow: boolean;
  onToggle: () => void;
}) {
  const { cashOut, pnl } = positionValue(row, fillCents);
  const toWin = positionValue(row, TRACK_CENTS).cashOut;

  if (expanded) {
    return (
      <ExpandedCard row={row} fillCents={fillCents} pulseGlow={pulseGlow} />
    );
  }

  return (
    <div
      className="-mx-2 flex w-full cursor-pointer flex-col gap-2.5 rounded-2xl px-2 py-3.5 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.99]"
      onClick={onToggle}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-semibold leading-[1.25] text-white">
              {row.title}
            </p>
            {row.badge ? <TitleBadge label={row.badge} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <SideBadge side={row.side} compact />
            {row.showLeverage !== false ? (
              <LeverageBadge leverage={row.leverage} />
            ) : null}
            <StakeLabel stake={row.stake} toWin={toWin} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ValueAmount cashOut={cashOut} pnl={pnl} size="sm" />
          <IconButton
            label="Share position"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={IMG_SHARE_16} alt="" width={16} height={16} />
          </IconButton>
        </div>
      </div>
      <div className="flex w-full items-center gap-2.5">
        <CompactBar
          fillCents={fillCents}
          liqCents={row.liqCents}
          entryCents={row.entryCents}
          showLiq={row.showLiq !== false}
        />
        <CashOutButton
          fillCents={fillCents}
          entryCents={row.entryCents}
          liqCents={row.liqCents}
          pulse={pulseGlow}
        />
      </div>
    </div>
  );
}

export default function Expandable() {
  const [expandedId, setExpandedId] = useState(EXPANDABLE_ROWS[0].id);
  const [pulseGlow, setPulseGlow] = useState(false);
  const [sims, setSims] = useState<RowSim[]>(initialSims);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSims((prev) =>
        prev.map((sim, i) => {
          const row = EXPANDABLE_ROWS[i];
          return {
            fillCents: nextFillCents(row.liqCents, sim.fillCents),
          };
        }),
      );
    }, SIM_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const expand = (id: string) => {
    setExpandedId(id);
  };

  return (
    <div className="relative flex w-full max-w-[857px] flex-col items-stretch gap-6 px-4 md:px-0">
      <div className="flex w-full items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold leading-[1.25] text-white">
          Positions
          <sup className="relative -top-3 ml-1 text-xs font-semibold leading-none text-white">
            {EXPANDABLE_ROWS.length}
          </sup>
        </h2>
        <GlowSwitch checked={pulseGlow} onChange={setPulseGlow} />
      </div>

      <div className="hidden w-full flex-col md:flex">
        {EXPANDABLE_ROWS.map((row, index) => {
          const expanded = expandedId === row.id;
          const prevExpanded =
            index > 0 && expandedId === EXPANDABLE_ROWS[index - 1].id;
          return (
            <motion.div
              key={row.id}
              layout
              transition={{ layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
              className={
                index === 0 ? "" : expanded || prevExpanded ? "mt-4" : "mt-0"
              }
            >
              {expanded ? (
                <ExpandedCard
                  row={row}
                  fillCents={sims[index].fillCents}
                  pulseGlow={pulseGlow}
                />
              ) : (
                <div className="w-full">
                  {index > 0 && !prevExpanded && (
                    <div className="mx-4 h-px bg-white/10" aria-hidden />
                  )}
                  <CompactRow
                    row={row}
                    fillCents={sims[index].fillCents}
                    pulseGlow={pulseGlow}
                    onExpand={() => expand(row.id)}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-1.5 md:hidden">
        {EXPANDABLE_ROWS.map((row, index) => (
          <div key={row.id}>
            {index > 0 && expandedId !== row.id && expandedId !== EXPANDABLE_ROWS[index - 1].id && (
              <div className="mx-4 h-px bg-white/10" aria-hidden />
            )}
            <MobileCard
              row={row}
              fillCents={sims[index].fillCents}
              expanded={expandedId === row.id}
              pulseGlow={pulseGlow}
              onToggle={() => expand(row.id)}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes expandable-cash-out-liq-pulse {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(255, 77, 94, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(14px + var(--cash-out-glow-strength) * 22px) rgba(255, 77, 94, calc(var(--cash-out-glow-strength) * 0.62)),
              inset 0 1px 0 rgba(255, 120, 130, calc(var(--cash-out-glow-strength) * 0.35));
          }
        }

        @keyframes expandable-cash-out-win-blink {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(93, 217, 120, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(16px + var(--cash-out-glow-strength) * 24px) rgba(93, 217, 120, calc(var(--cash-out-glow-strength) * 0.58)),
              inset 0 1px 0 rgba(140, 255, 170, calc(var(--cash-out-glow-strength) * 0.32));
          }
        }

        .expandable-cash-out-glow-static-win {
          box-shadow:
            inset 0 0 calc(16px + var(--cash-out-glow-strength) * 24px) rgba(93, 217, 120, calc(var(--cash-out-glow-strength) * 0.58)),
            inset 0 1px 0 rgba(140, 255, 170, calc(var(--cash-out-glow-strength) * 0.32));
        }

        .expandable-cash-out-glow-static-liq {
          box-shadow:
            inset 0 0 calc(14px + var(--cash-out-glow-strength) * 22px) rgba(255, 77, 94, calc(var(--cash-out-glow-strength) * 0.62)),
            inset 0 1px 0 rgba(255, 120, 130, calc(var(--cash-out-glow-strength) * 0.35));
        }

        @media (prefers-reduced-motion: reduce) {
          .expandable-cash-out-glow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
