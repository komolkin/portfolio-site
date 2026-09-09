"use client";

import NumberFlow from "@number-flow/react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Liveline, type LivelinePoint, type LivelineSeries } from "liveline";
import { useEffect, useMemo, useRef, useState } from "react";
import { instrumentSansCondensed } from "@/lib/fonts";

/**
 * Spotlight live match card — Figma node 13035:80279
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=13035-80279
 */
const IMG_MAN_UNITED = "/playground/spotlight/man-united-crest.png";
const IMG_EVERTON = "/playground/spotlight/everton-crest.png";
const IMG_PITCH = "/playground/spotlight/pitch.svg";

const CARD_WIDTH = 950;
const CARD_HEIGHT = 520;

const EVERTON = "#a7a8ff";
const DRAW = "#c5c5c5";
const MAN_UNITED = "#fce40d";

const CHART_POINTS = 48;
const CHART_TICK_MS = 900;
const CHART_TICK_SECS = CHART_TICK_MS / 1000;
// Keep the window tight to the seeded history so lines fill to the left edge.
const CHART_WINDOW_SECS = (CHART_POINTS - 1) * CHART_TICK_SECS;
const CLOCK_TICK_MS = 1000;
const PNL_TICK_MS = 1100;
const PNL_STACK_MAX = 5;
/** Hold at full opacity, then fade out if nothing keeps the stack fresh. */
const PNL_HOLD_MS = 900;
const PNL_FADE_MS = 4200;
const PNL_LIFE_MS = PNL_HOLD_MS + PNL_FADE_MS;

const OUTCOMES = [
  { id: "man-united", label: "Man United", color: MAN_UNITED },
  { id: "draw", label: "Draw", color: DRAW },
  { id: "everton", label: "Everton", color: EVERTON },
] as const;

type Odds = { everton: number; draw: number; manUnited: number };
type OddsPoint = Odds & { time: number };
type PnlTick = {
  id: number;
  value: number;
  side: "everton" | "draw" | "man-united";
  bornAt: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeOdds(raw: Odds): Odds {
  const everton = clamp(raw.everton, 18, 55);
  const draw = clamp(raw.draw, 15, 45);
  const manUnited = clamp(raw.manUnited, 12, 50);
  const total = everton + draw + manUnited;
  const e = Math.round((everton / total) * 100);
  const d = Math.round((draw / total) * 100);
  return {
    everton: e,
    draw: d,
    manUnited: Math.max(1, 100 - e - d),
  };
}

function stepOdds(prev: Odds): Odds {
  const jitter = () => (Math.random() - 0.5) * 4.2;
  return normalizeOdds({
    everton: prev.everton + jitter(),
    draw: prev.draw + jitter() * 0.85,
    manUnited: prev.manUnited + jitter(),
  });
}

function seedHistory(initial: Odds, count: number): OddsPoint[] {
  const now = Date.now() / 1000;
  const history: OddsPoint[] = [];
  let current = initial;
  for (let i = 0; i < count; i++) {
    if (i > 0) current = stepOdds(current);
    history.push({
      ...current,
      time: now - (count - 1 - i) * CHART_TICK_SECS,
    });
  }
  return history;
}

function formatPnl(value: number) {
  return `+$${value.toLocaleString("en-US")}`;
}

function seriesFromHistory(
  history: OddsPoint[],
  key: keyof Odds,
): LivelinePoint[] {
  return history.map((point) => ({ time: point.time, value: point[key] }));
}

const BUTTON_CLASS =
  "group relative flex shrink-0 items-center justify-center gap-1 rounded-2xl px-6 pb-[18px] pt-[14px] transition-transform duration-200 ease-out [font-feature-settings:'lnum'_1,'tnum'_1] select-none hover:-translate-y-[2px] active:translate-y-1 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80";

const PNL_POOL = [67, 123, 245, 567, 890, 1200, 1567, 2100];

function TransactionStack({
  ticks,
  color,
  now,
}: {
  ticks: PnlTick[];
  color: string;
  now: number;
}) {
  return (
    <div
      className="pointer-events-none absolute bottom-full left-1/2 mb-2 flex w-max -translate-x-1/2 flex-col items-center"
      style={{ color }}
      aria-hidden
    >
      <AnimatePresence initial={false} mode="popLayout">
        {ticks.map((tick, index) => {
          // Newest sits at the bottom; older rows sit slightly dimmer.
          const stackAge = ticks.length - 1 - index;
          const stackFade = Math.max(0.4, 1 - stackAge * 0.12);
          // After a short hold, drift to transparent if no replacement arrives.
          const elapsed = now - tick.bornAt;
          const timeFade =
            elapsed <= PNL_HOLD_MS
              ? 1
              : Math.max(0, 1 - (elapsed - PNL_HOLD_MS) / PNL_FADE_MS);
          const opacity = stackFade * timeFade;
          return (
            <motion.p
              key={tick.id}
              layout
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{
                layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.35, ease: "linear" },
                y: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
              }}
              className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium leading-5"
            >
              {formatPnl(tick.value)}
            </motion.p>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default function Spotlight() {
  const initialOdds = useMemo(() => ({ everton: 40, draw: 34, manUnited: 26 }), []);
  const [history, setHistory] = useState<OddsPoint[]>(() =>
    seedHistory(initialOdds, CHART_POINTS),
  );
  const [clockSeconds, setClockSeconds] = useState(54 * 60 + 32);
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(2);
  const [evertonPnls, setEvertonPnls] = useState<PnlTick[]>([]);
  const [drawPnls, setDrawPnls] = useState<PnlTick[]>([]);
  const [unitedPnls, setUnitedPnls] = useState<PnlTick[]>([]);
  const [pnlNow, setPnlNow] = useState(() => Date.now());
  const pnlIdRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotionRef = useRef(false);

  const latest = history[history.length - 1] ?? { ...initialOdds, time: 0 };
  const manUnitedData = useMemo(
    () => seriesFromHistory(history, "manUnited"),
    [history],
  );
  const drawData = useMemo(() => seriesFromHistory(history, "draw"), [history]);
  const evertonData = useMemo(
    () => seriesFromHistory(history, "everton"),
    [history],
  );
  const oddsSeries = useMemo<LivelineSeries[]>(
    () => [
      {
        id: "man-united",
        color: MAN_UNITED,
        data: manUnitedData,
        value: latest.manUnited,
      },
      {
        id: "draw",
        color: DRAW,
        data: drawData,
        value: latest.draw,
      },
      {
        id: "everton",
        color: EVERTON,
        data: evertonData,
        value: latest.everton,
      },
    ],
    [manUnitedData, drawData, evertonData, latest.manUnited, latest.draw, latest.everton],
  );

  useEffect(() => {
    reduceMotionRef.current = Boolean(prefersReducedMotion);
  }, [prefersReducedMotion]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (reduceMotionRef.current) return;
      setHistory((prev) => {
        const nextOdds = stepOdds(prev[prev.length - 1] ?? initialOdds);
        return [
          ...prev.slice(-(CHART_POINTS - 1)),
          { ...nextOdds, time: Date.now() / 1000 },
        ];
      });
    }, CHART_TICK_MS);
    return () => window.clearInterval(id);
  }, [initialOdds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setClockSeconds((prev) => {
        // Soft cap near end of regulation so the demo loops feel natural.
        if (prev >= 94 * 60) return 45 * 60;
        return prev + 1;
      });
    }, CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (reduceMotionRef.current) return;
      // Rare score bumps keep the board feeling alive without chaos.
      if (Math.random() > 0.08) return;
      if (Math.random() > 0.5) {
        setAwayScore((s) => (s >= 5 ? 1 : s + 1));
      } else {
        setHomeScore((s) => (s >= 4 ? 0 : s + 1));
      }
    }, 12000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const pushTrade = () => {
      if (reduceMotionRef.current) return;
      const value = PNL_POOL[Math.floor(Math.random() * PNL_POOL.length)];
      const nextId = ++pnlIdRef.current;
      const bornAt = Date.now();
      const roll = Math.random();
      // Newest appends at the bottom; keep only the latest 5 (oldest fall off the top).
      if (roll < 0.4) {
        setEvertonPnls((prev) =>
          [...prev, { id: nextId, value, side: "everton" as const, bornAt }].slice(
            -PNL_STACK_MAX,
          ),
        );
      } else if (roll < 0.65) {
        setDrawPnls((prev) =>
          [...prev, { id: nextId, value, side: "draw" as const, bornAt }].slice(
            -PNL_STACK_MAX,
          ),
        );
      } else {
        setUnitedPnls((prev) =>
          [
            ...prev,
            { id: nextId, value, side: "man-united" as const, bornAt },
          ].slice(-PNL_STACK_MAX),
        );
      }
    };

    pushTrade();
    const id = window.setInterval(pushTrade, PNL_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Drive slow fade-out + prune fully expired trades when a column goes quiet.
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPnlNow(now);
      const cutoff = now - PNL_LIFE_MS;
      const prune = (prev: PnlTick[]) =>
        prev.some((tick) => tick.bornAt <= cutoff)
          ? prev.filter((tick) => tick.bornAt > cutoff)
          : prev;
      setEvertonPnls(prune);
      setDrawPnls(prune);
      setUnitedPnls(prune);
    }, 120);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <article
        className="relative isolate overflow-hidden rounded-2xl [zoom:0.58] sm:[zoom:0.72] md:[zoom:0.88] lg:[zoom:1]"
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        aria-label="Premier League spotlight"
      >
        {/* Base + ambient team glows */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[#1d1d1d] to-[#0d0d0d]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-[-224px] top-1/2 size-[400px] -translate-y-1/2 opacity-30 blur-[67px]"
        >
          <Image src={IMG_MAN_UNITED} alt="" fill sizes="400px" className="object-cover" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute left-[750px] top-[60px] size-[400px] opacity-45 blur-[67px]"
        >
          <Image src={IMG_EVERTON} alt="" fill sizes="400px" className="object-cover" />
        </div>

        {/* Pitch watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[312px] h-[706px] w-[1424px] -translate-x-1/2 opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMG_PITCH} alt="" className="size-full object-contain" />
        </div>

        {/* Header */}
        <div className="absolute left-1/2 top-8 z-10 flex w-full max-w-[420px] -translate-x-1/2 flex-col items-center gap-3">
          <div className="flex items-baseline gap-3 text-sm leading-none">
            <span className="text-sm text-white">Premier League</span>
            <span className="text-sm font-semibold text-[#ff4d5e]">Live</span>
            <span className="inline-flex items-baseline text-sm tabular-nums text-white">
              <NumberFlow
                value={Math.floor(clockSeconds / 60)}
                format={{ useGrouping: false }}
                className="text-sm leading-none"
                style={{ fontSize: "0.875rem", ["--number-flow-mask-height" as string]: "0em" }}
              />
              <span className="text-sm leading-none">:</span>
              <NumberFlow
                value={clockSeconds % 60}
                format={{ useGrouping: false, minimumIntegerDigits: 2 }}
                className="text-sm leading-none"
                style={{ fontSize: "0.875rem", ["--number-flow-mask-height" as string]: "0em" }}
              />
            </span>
          </div>
          <div className="flex items-center justify-center gap-8">
            <div className="relative h-[66px] w-16 shrink-0">
              <Image
                src={IMG_MAN_UNITED}
                alt="Manchester United"
                fill
                sizes="64px"
                className="object-contain"
                priority
              />
            </div>
            <div
              className={`flex min-w-[140px] items-center justify-center gap-4 text-[64px] leading-none tracking-[-1.6px] text-white ${instrumentSansCondensed.className}`}
            >
              <NumberFlow
                value={homeScore}
                className="inline-block min-w-[0.6em] text-center tabular-nums"
                style={{ ["--number-flow-mask-height" as string]: "0em" }}
              />
              <span className="opacity-40">-</span>
              <NumberFlow
                value={awayScore}
                className="inline-block min-w-[0.6em] text-center tabular-nums"
                style={{ ["--number-flow-mask-height" as string]: "0em" }}
              />
            </div>
            <div className="relative h-[66px] w-16 shrink-0">
              <Image
                src={IMG_EVERTON}
                alt="Everton"
                fill
                sizes="64px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          {/* Legend order matches crest order: home → draw → away */}
          <div className="flex items-baseline gap-5 pt-1 text-sm leading-none text-white">
            {(
              [
                { label: "Man United", color: MAN_UNITED, value: latest.manUnited },
                { label: "Draw", color: DRAW, value: latest.draw },
                { label: "Everton", color: EVERTON, value: latest.everton },
              ] as const
            ).map((item) => (
              <div key={item.label} className="flex items-baseline gap-1.5 whitespace-nowrap text-sm leading-none">
                <span
                  className="mb-px size-[7px] shrink-0 self-center rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="text-sm font-normal leading-none text-white/90">
                  {item.label}
                </span>
                <span className="inline-flex items-baseline text-sm font-semibold leading-none tabular-nums text-white">
                  <NumberFlow
                    value={item.value}
                    suffix="%"
                    className="text-sm leading-none"
                    style={{
                      fontSize: "0.875rem",
                      ["--number-flow-mask-height" as string]: "0em",
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Odds chart — vertically centered; extend further left */}
        <div className="absolute left-10 right-10 top-1/2 h-[170px] -translate-y-1/2">
          <div className="relative h-full w-full [&>div:first-child]:!hidden">
            <Liveline
              data={manUnitedData}
              value={latest.manUnited}
              series={oddsSeries}
              theme="dark"
              grid={false}
              badge={false}
              pulse
              scrub={false}
              momentum={false}
              window={CHART_WINDOW_SECS}
              formatValue={(v) => `${Math.round(v)}%`}
              formatTime={() => ""}
              lerpSpeed={0.1}
              lineWidth={2.5}
              padding={{ top: 8, right: 10, bottom: 48, left: 8 }}
              className="!h-[calc(100%+48px)] w-full"
            />
          </div>
        </div>

        {/* Outcome buttons — each trade stack is centered on its button */}
        <div
          className="absolute left-1/2 top-[424px] flex -translate-x-1/2 items-end gap-2"
          role="group"
          aria-label="Match outcomes"
        >
          {OUTCOMES.map((outcome) => {
            const percent =
              outcome.id === "everton"
                ? latest.everton
                : outcome.id === "draw"
                  ? latest.draw
                  : latest.manUnited;
            const ticks =
              outcome.id === "everton"
                ? evertonPnls
                : outcome.id === "draw"
                  ? drawPnls
                  : unitedPnls;
            return (
              <div key={outcome.id} className="relative flex flex-col items-center">
                <TransactionStack ticks={ticks} color={outcome.color} now={pnlNow} />
                <button
                  type="button"
                  data-sfx="click"
                  className={BUTTON_CLASS}
                  style={{ backgroundColor: outcome.color }}
                >
                  <span className="relative whitespace-nowrap text-base font-semibold leading-[1.25] text-[#141414]">
                    {outcome.label}
                  </span>
                  <span className="relative inline-flex whitespace-nowrap text-base font-semibold leading-[1.25] text-[#141414]/60">
                    <NumberFlow
                      value={percent}
                      suffix="¢"
                      style={{ ["--number-flow-mask-height" as string]: "0em" }}
                    />
                  </span>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_-4px_0px_0px_rgba(0,0,0,0.3)] transition-shadow duration-150 ease-out group-active:shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.3)]"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </article>
    </div>
  );
}
