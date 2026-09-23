"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState } from "react";
import { instrumentSansCondensed } from "@/lib/fonts";

/**
 * Levered YES position — Figma node 16228:88185
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=16228-88185
 *
 * Margin M at leverage L buys notional M×L at the entry price.
 * Shares = notional / entry. Equity (cash out) = margin + shares × (price − entry).
 * That equity is $0 at liquidation and $4,000 if this 3× position resolves at $1.
 */
const IMG_SHARE = "/playground/bubbly/share.svg";
const IMG_STRIPE = "/playground/bubbly/stripe.svg";

const STAKE = 1_000;
const LEVERAGE = 3;
const ENTRY_CENTS = 50;
const TRACK_CENTS = 100;
/** entry × (1 − 1/leverage) — a 3× long from 50¢ liquidates at 33.3¢ */
const LIQ_CENTS = (ENTRY_CENTS * (LEVERAGE - 1)) / LEVERAGE;
const LIQ_LABEL = Math.round(LIQ_CENTS);

const FILL_BELOW = "#AC1D2B";
const FILL_ABOVE = "#106F25";
const LIQ_COLOR = "#FF4D5E";
const PNL_DOWN = "#ff4d5e";
const PNL_UP = "#5dd978";

const SIM_TICK_MS = 1500;
const FAST_FORWARD_DELTA_THRESHOLD = 10;
const FAST_FORWARD_FX_MS = 550;
const PRICE_MIN = LIQ_LABEL + 1;
const PRICE_MAX = 96;

/** Hatch lines spaced 10px, covering the liquidation pocket. */
const STRIPES = Array.from({ length: 42 }, (_, i) => -130 + i * 10);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Equity you'd receive closing now, and the profit baked into it. */
function positionValue(priceCents: number) {
  const pnl = Math.round(
    (STAKE * LEVERAGE * (priceCents - ENTRY_CENTS)) / ENTRY_CENTS,
  );
  return { pnl, cashOut: Math.max(0, STAKE + pnl) };
}

function nextPrice(prev: number): number {
  const min = PRICE_MIN;
  const max = PRICE_MAX;
  if (Math.random() < 0.3) {
    return clamp(Math.round(min + Math.random() * (max - min)), min, max);
  }
  const step = Math.round((Math.random() * 2 - 1) * 14);
  return clamp(prev + (step === 0 ? 6 : step), min, max);
}

function formatUsd(n: number) {
  return n.toLocaleString("en-US");
}

export default function Bubbly() {
  const [priceCents, setPriceCents] = useState(40);
  const [isFastForwardFx, setIsFastForwardFx] = useState(false);
  const fastForwardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPriceCents((prev) => {
        const next = nextPrice(prev);
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

  const { pnl, cashOut } = positionValue(priceCents);
  const toWin = positionValue(TRACK_CENTS).cashOut;
  const belowEntry = priceCents < ENTRY_CENTS;
  const liqGap = priceCents - LIQ_CENTS;
  const danger =
    belowEntry && liqGap < 16 ? clamp(1 - Math.max(0, liqGap) / 16, 0, 1) : 0;
  const win =
    priceCents <= ENTRY_CENTS
      ? 0
      : (priceCents - ENTRY_CENTS) / (TRACK_CENTS - ENTRY_CENTS);

  const fillColor = belowEntry ? FILL_BELOW : FILL_ABOVE;
  const glowColor = belowEntry ? "#d42e3e" : "#1f8f45";
  const glowBlur = belowEntry ? 20 + danger * 22 : 12 + win * 26;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <article
        className={`flex w-[857px] flex-col gap-4 rounded-3xl bg-white/[0.04] p-4 backdrop-blur-[17px] [zoom:0.36] min-[480px]:[zoom:0.48] sm:[zoom:0.66] md:[zoom:0.82] lg:[zoom:0.92] xl:[zoom:1] ${
          isFastForwardFx ? "animate-[bubbly-shake_360ms_ease-in-out_1]" : ""
        }`}
        aria-label="Open YES position"
      >
        <header className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col items-start justify-center gap-2">
            <p className="text-2xl font-semibold leading-[1.25] tracking-[0.4px] text-white">
              None by June 30, 2027
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center rounded-xl bg-[#214a2a] px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                YES
              </span>
              <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                {LEVERAGE}x
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-normal leading-[1.25]">
                <span className="text-white">${formatUsd(STAKE)}</span>
                <span className="text-white/60">→</span>
                <span className="text-white">${formatUsd(toWin)}</span>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-6">
            <div className="flex w-[120px] flex-col items-end text-right leading-[1.25]">
              <span className="text-sm font-normal text-white/60">PnL</span>
              <p
                className={`text-[40px] font-semibold tabular-nums ${instrumentSansCondensed.className}`}
                style={{ color: pnl < 0 ? PNL_DOWN : PNL_UP }}
              >
                <span className="inline-flex items-baseline justify-end">
                  <span>{pnl < 0 ? "-$" : "+$"}</span>
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
            <button
              type="button"
              aria-label="Share position"
              data-sfx="click"
              className="relative flex size-14 shrink-0 items-center justify-center rounded-full border-[0.933px] border-white/10 transition-[transform,background-color] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.97]"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-white/[0.02]"
              />
              <img
                src={IMG_SHARE}
                alt=""
                width={20}
                height={20}
                className="pointer-events-none relative max-w-none"
                draggable={false}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_0px_14.933px_0px_rgba(255,255,255,0.2)]"
              />
            </button>
          </div>
        </header>

        <div className="relative h-[100px] w-full overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-white/[0.04]" />

          <div
            className="absolute inset-y-0 left-0 rounded-xl motion-reduce:transition-none"
            style={{
              width: `${(priceCents / TRACK_CENTS) * 100}%`,
              backgroundColor: fillColor,
              transition:
                "width 700ms ease-out, background-color 180ms ease-out",
            }}
          />

          <div
            className={`pointer-events-none absolute top-[0.75px] z-20 w-max max-w-none -translate-x-full pr-2 text-right text-[40px] font-semibold leading-[1.25] whitespace-nowrap text-white ${instrumentSansCondensed.className}`}
            style={{
              left: `max(4.5rem, ${(priceCents / TRACK_CENTS) * 100}%)`,
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

          <div
            className="pointer-events-none absolute left-1 top-[5px] z-[1] h-[91px] overflow-hidden rounded-md"
            style={{ width: `calc(${(LIQ_CENTS / TRACK_CENTS) * 100}% - 8px)` }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: LIQ_COLOR }}
            />
            <div className="bubbly-hatch absolute inset-0 motion-reduce:transform-none">
              {STRIPES.map((left) => (
                <img
                  key={left}
                  src={IMG_STRIPE}
                  alt=""
                  width={123.414}
                  height={123.414}
                  draggable={false}
                  className="pointer-events-none absolute top-[calc(50%+0.5px)] max-w-none -translate-y-1/2 opacity-20"
                  style={{ left, width: 123.414, height: 123.414 }}
                />
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute left-2 top-[52.75px] z-20 flex h-[41px] flex-col items-start justify-end leading-[1.25]">
            <span className="text-[10px] font-semibold text-white/60">Liq.</span>
            <span className="text-xl font-semibold tracking-[0.4px] text-white">
              {LIQ_LABEL}¢
            </span>
          </div>

          <div
            className="absolute top-0 h-full"
            style={{ left: `${ENTRY_CENTS}%` }}
          >
            <div className="absolute left-0 top-1/2 h-[82px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white/20" />
            <div className="absolute left-[7px] top-[55.75px] flex flex-col items-start justify-end leading-[1.25]">
              <span className="text-[10px] font-semibold text-white/60">
                Entry
              </span>
              <span className="text-xl font-semibold tracking-[0.4px] whitespace-nowrap text-white">
                {ENTRY_CENTS}¢
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-sfx="press"
          className="relative h-14 w-full overflow-hidden rounded-full border border-white/10 text-base font-semibold leading-[1.25] text-white [font-feature-settings:'lnum'_1,'tnum'_1] transition-[transform,filter] duration-150 ease-out hover:brightness-110 active:scale-[0.99]"
        >
          <span aria-hidden className="absolute inset-0 rounded-full bg-white/[0.04]" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] motion-reduce:transition-none"
            style={{
              boxShadow: `inset 0 0 ${glowBlur}px ${glowColor}`,
              transition: "box-shadow 200ms ease-out",
            }}
          />
          {danger > 0.15 ? (
            <span
              aria-hidden
              className="bubbly-danger pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{ opacity: 0.35 + danger * 0.65 }}
            />
          ) : null}
          <span className="relative inline-flex items-baseline">
            <span>Cash Out $</span>
            <NumberFlow
              value={cashOut}
              trend={0}
              format={{ useGrouping: true }}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as string]: "0em" }}
            />
          </span>
        </button>
      </article>
      <style>{`
        @keyframes bubbly-hatch {
          from { transform: translateX(0); }
          to { transform: translateX(-10px); }
        }
        .bubbly-hatch {
          animation: bubbly-hatch 2.8s linear infinite;
        }
        @keyframes bubbly-danger {
          0%, 100% { box-shadow: inset 0 0 16px #d42e3e; }
          50% { box-shadow: inset 0 0 36px #ff4d5e; }
        }
        .bubbly-danger {
          animation: bubbly-danger 0.7s ease-in-out infinite;
        }
        @keyframes bubbly-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-1px, 0, 0); }
          40% { transform: translate3d(1px, 0, 0); }
          60% { transform: translate3d(-1px, 0, 0); }
          80% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bubbly-hatch,
          .bubbly-danger { animation: none; }
          [class*="bubbly-shake"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
