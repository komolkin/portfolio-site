"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Position #2 — expandable variant
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=5361-21127
 * Collapsed header — https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=5263-5070
 * OKC thumbnail — 5261:23953 → public/playground/position-2/thumbnail.png
 */
const IMG_THUMB = "/playground/position-2/thumbnail.png";
const IMG_SHARE = "/playground/position/share-icon.svg";

const SIM_TICK_MS = 2200;
const FAST_FORWARD_DELTA_THRESHOLD = 4;
const FAST_FORWARD_FX_MS = 550;

/** Worth now (whole dollars) — sim range */
const WORTH_MIN = 118;
const WORTH_MAX = 126;
const INITIAL_WORTH = 120;
/** PnL matches Figma when worth is 120: +$5.20 vs ~$114.80 cost */
const ENTRY_COST = 114.8;
const TO_WIN_USD = 435;

function randomWorth(): number {
  return WORTH_MIN + Math.floor(Math.random() * (WORTH_MAX - WORTH_MIN + 1));
}

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className={`size-4 shrink-0 text-white transition-transform duration-200 ${
        direction === "up" ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Position2() {
  const [expanded, setExpanded] = useState(false);
  const [worthNow, setWorthNow] = useState(INITIAL_WORTH);
  const [isFastForwardFx, setIsFastForwardFx] = useState(false);
  const fastForwardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setWorthNow(randomWorth());
    const id = window.setInterval(() => {
      setWorthNow((prev) => {
        const next = randomWorth();
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

  const pnl = useMemo(() => worthNow - ENTRY_COST, [worthNow]);
  const pnlPrefix = pnl < 0 ? "-$" : "+$";
  const pnlAbs = Math.abs(pnl);
  const pnlColorClass = pnl < 0 ? "text-[#f87171]" : "text-[#5dd978]";

  /** “Now” side of Avg. Entry → Now — ticks with simulated worth */
  const avgNowCents = useMemo(() => 62 + Math.max(0, worthNow - 120) + 3, [worthNow]);

  return (
    <div
      className={`relative flex w-full max-w-[450px] flex-col overflow-hidden rounded-[24px] p-4 ${
        isFastForwardFx ? "animate-[position2-shake_360ms_ease-in-out_1]" : ""
      } ${expanded ? "" : "cursor-pointer"}`}
      data-name="Position #2"
      role={expanded ? undefined : "button"}
      tabIndex={expanded ? undefined : 0}
      aria-expanded={expanded}
      aria-controls="position-2-expanded"
      onClick={expanded ? undefined : () => setExpanded(true)}
      onKeyDown={
        expanded
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded(true);
              }
            }
      }
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[24px]">
        <MeshGradient
          className="h-full w-full"
          colors={["#000000", "#0c7ec0"]}
          distortion={0.8}
          swirl={0}
          grainMixer={0}
          grainOverlay={0}
          speed={0.16}
          scale={2.32}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-[24px] bg-[rgba(255,255,255,0.04)]"
        aria-hidden
      />

      <div
        className={`relative z-[2] flex w-full items-center justify-between gap-4 ${
          expanded ? "cursor-pointer border-b border-white/10 pb-4" : ""
        }`}
        role={expanded ? "button" : undefined}
        tabIndex={expanded ? 0 : undefined}
        aria-expanded={expanded ? true : undefined}
        aria-controls={expanded ? "position-2-expanded" : undefined}
        onClick={expanded ? () => setExpanded(false) : undefined}
        onKeyDown={
          expanded
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded(false);
                }
              }
            : undefined
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
            <img
              alt=""
              className="pointer-events-none size-full object-contain"
              src={IMG_THUMB}
              draggable={false}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-sm font-semibold leading-tight text-white [font-feature-settings:'lnum'_1,'tnum'_1]">
              Oklahoma City Thunder
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#0c7ec2] px-2 py-0.5 text-xs font-semibold leading-tight text-white">
                OKC
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold leading-tight text-white">
                3x
              </span>
              {!expanded && (
                <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-sm font-normal leading-tight text-white/60">
                  <span>To win</span>
                  <span className="inline-flex items-baseline tabular-nums">
                    <span>$</span>
                    <NumberFlow
                      value={TO_WIN_USD}
                      trend={0}
                      format={{ useGrouping: true }}
                      className="tabular-nums text-inherit"
                      style={{ ["--number-flow-mask-height" as any]: "0em" }}
                    />
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {!expanded && (
          <div className="flex shrink-0 items-center gap-4">
            <div className="flex flex-col items-end gap-0.5 leading-none">
              <p className="text-right text-xl font-semibold leading-tight tracking-tight text-white [font-feature-settings:'lnum'_1,'tnum'_1]">
                <span className="inline-flex items-baseline tabular-nums">
                  <span>$</span>
                  <NumberFlow
                    value={worthNow}
                    trend={0}
                    format={{ useGrouping: true }}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                </span>
              </p>
              <p className={`text-right text-xs font-normal leading-tight tabular-nums ${pnlColorClass}`}>
                <span className="inline-flex items-baseline">
                  <span className="tabular-nums">{pnlPrefix}</span>
                  <NumberFlow
                    value={pnlAbs}
                    trend={0}
                    format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                </span>
              </p>
            </div>
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
              aria-expanded={false}
              aria-controls="position-2-expanded"
              onClick={() => setExpanded(true)}
            >
              <ChevronIcon direction="down" />
              <span className="sr-only">Expand position details</span>
            </button>
          </div>
        )}

        {expanded && (
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
            aria-expanded
            aria-controls="position-2-expanded"
            onClick={() => setExpanded(false)}
          >
            <ChevronIcon direction="up" />
            <span className="sr-only">Collapse position details</span>
          </button>
        )}
      </div>

      <div
        id="position-2-expanded"
        className={`relative z-[2] grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 pb-0.5">
            <div className="flex w-full items-center justify-between gap-2 px-3 py-4">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                <p className="text-sm font-normal leading-tight text-white/60">Worth now</p>
                <p className="text-[30px] font-semibold leading-tight tracking-tight text-white [font-feature-settings:'lnum'_1,'tnum'_1]">
                  <span className="inline-flex items-baseline">
                    <span className="tabular-nums">$</span>
                    <NumberFlow
                      value={worthNow}
                      trend={0}
                      format={{ useGrouping: true }}
                      className="tabular-nums text-inherit"
                      style={{ ["--number-flow-mask-height" as any]: "0em" }}
                    />
                  </span>
                </p>
                <p className={`text-sm font-normal leading-tight tabular-nums ${pnlColorClass}`}>
                  <span className="inline-flex items-baseline">
                    <span className="tabular-nums">{pnlPrefix}</span>
                    <NumberFlow
                      value={pnlAbs}
                      trend={0}
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }}
                      className="tabular-nums text-inherit"
                      style={{ ["--number-flow-mask-height" as any]: "0em" }}
                    />
                  </span>
                </p>
              </div>

              <span className="shrink-0 text-white/35" aria-hidden>
                →
              </span>

              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                <p className="text-sm font-normal leading-tight text-white/60">To win</p>
                <p className="text-[30px] font-semibold leading-tight tracking-tight text-white [font-feature-settings:'lnum'_1,'tnum'_1]">
                  <span className="inline-flex items-baseline">
                    <span className="tabular-nums">$</span>
                    <NumberFlow
                      value={TO_WIN_USD}
                      trend={0}
                      format={{ useGrouping: true }}
                      className="tabular-nums text-inherit"
                      style={{ ["--number-flow-mask-height" as any]: "0em" }}
                    />
                  </span>
                </p>
                <p className="text-sm font-normal leading-tight text-white/60">if right</p>
              </div>
            </div>

            <div
              className="flex w-full flex-col gap-1.5 rounded-[24px] px-4 pb-5 pt-4"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex w-full items-center justify-between gap-3 text-sm font-normal leading-tight">
                <span className="shrink-0 text-white/60">Avg. Entry → Now</span>
                <span className="min-w-0 truncate text-right text-white tabular-nums">
                  62¢ →{" "}
                  <NumberFlow
                    value={avgNowCents}
                    trend={0}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                  ¢
                </span>
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-sm font-normal leading-tight">
                <span className="shrink-0 text-white/60">Liquidation Price</span>
                <span className="tabular-nums text-white">20¢</span>
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-sm font-normal leading-tight">
                <span className="shrink-0 text-white/60">TP / SL</span>
                <span className="tabular-nums text-white">80¢ / --</span>
              </div>
            </div>

            <div className="flex w-full items-start justify-center gap-2.5">
              <button
                type="button"
                className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 text-sm font-semibold text-white transition-[transform,border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
              >
                <span className="inline-flex items-baseline gap-0.5 truncate px-1">
                  <span>Cash Out</span>
                  <span className="tabular-nums">$</span>
                  <NumberFlow
                    value={worthNow}
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
        </div>
      </div>

      <style>{`
        @keyframes position2-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-1px, 0, 0); }
          40% { transform: translate3d(1px, 0, 0); }
          60% { transform: translate3d(-1px, 0, 0); }
          80% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  );
}
