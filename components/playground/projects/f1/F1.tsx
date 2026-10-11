"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useMemo, useState } from "react";
import { MagicSparkles } from "@/components/playground/card-foil";
import {
  CardEffectAura,
  CardEffectSelect,
  CardEffectSurface,
  type CardEffectId,
} from "@/components/playground/card-effects";
import { instrumentSansCondensed } from "@/lib/fonts";

/**
 * F1 race winner preview — Figma group (node 20288:26111):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=20288-26111
 */
const IMG_VERSTAPPEN = "/playground/f1/verstappen.png";
const IMG_HAMILTON = "/playground/f1/hamilton.png";
const IMG_LECLERC = "/playground/f1/leclerc.png";
const IMG_FLAG_NL = "/playground/f1/flag-nl.png";
const IMG_FLAG_GB = "/playground/f1/flag-gb.png";
const IMG_FLAG_MC = "/playground/f1/flag-mc.png";

const CARD_WIDTH = 310;
const CARD_HEIGHT = 118;
const CARD_RADIUS = 16;
const PROGRESS_STROKE = 4;

const TOTAL_LAPS = 62;
const LIVE_LAP_START = 20;
const LIVE_LAP_TICK_MS = 4_800;
const LIVE_ODDS_TICK_MS = 2_400;

type DriverId = "verstappen" | "hamilton" | "leclerc";

const DRIVERS: {
  id: DriverId;
  name: string;
  avatar: string;
  flag: string;
  ring: string;
}[] = [
  {
    id: "verstappen",
    name: "Verstappen",
    avatar: IMG_VERSTAPPEN,
    flag: IMG_FLAG_NL,
    ring: "#f90",
  },
  {
    id: "hamilton",
    name: "Hamilton",
    avatar: IMG_HAMILTON,
    flag: IMG_FLAG_GB,
    ring: "#959595",
  },
  {
    id: "leclerc",
    name: "Leclerc",
    avatar: IMG_LECLERC,
    flag: IMG_FLAG_MC,
    ring: "#d33200",
  },
];

const INITIAL_ODDS: Record<DriverId, number> = {
  verstappen: 50,
  hamilton: 32,
  leclerc: 18,
};

const nfStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Keep three-way odds as integers that always sum to 100. */
function driftOdds(prev: Record<DriverId, number>): Record<DriverId, number> {
  const ids = DRIVERS.map((d) => d.id);
  const from = ids[Math.floor(Math.random() * ids.length)];
  let to = ids[Math.floor(Math.random() * ids.length)];
  if (to === from) to = ids[(ids.indexOf(from) + 1) % ids.length];

  const step = Math.random() < 0.3 ? 2 : 1;
  if (prev[from] <= step + 4) return prev;

  return {
    ...prev,
    [from]: prev[from] - step,
    [to]: prev[to] + step,
  };
}

/**
 * Rounded-rect edge path. Starts at top center and runs clockwise:
 * top → right → bottom → left → back to top center.
 */
function raceProgressPath(
  width: number,
  height: number,
  radius: number,
  stroke: number,
) {
  const inset = stroke / 2;
  const x = inset;
  const y = inset;
  const w = width - stroke;
  const h = height - stroke;
  const r = Math.max(0, radius - inset);
  const topCenterX = x + w / 2;

  return [
    `M ${topCenterX} ${y}`,
    `H ${x + w - r}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    `H ${topCenterX}`,
  ].join(" ");
}

function RaceProgress({ progress }: { progress: number }) {
  const path = useMemo(
    () =>
      raceProgressPath(CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS, PROGRESS_STROKE),
    [],
  );
  const filled = clamp(progress, 0, 1);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2]"
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      fill="none"
    >
      <path
        d={path}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={PROGRESS_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${filled} 1`}
        className="transition-[stroke-dasharray] duration-700 ease-out"
      />
    </svg>
  );
}

export default function F1() {
  const [effect, setEffect] = useState<CardEffectId>("default");
  const [lap, setLap] = useState(LIVE_LAP_START);
  const [odds, setOdds] = useState(INITIAL_ODDS);

  const isMagic = effect === "magic";
  const usesGlassRim = effect !== "default";
  const progress = lap / TOTAL_LAPS;

  useEffect(() => {
    const id = window.setInterval(() => {
      setOdds((prev) => driftOdds(prev));
    }, LIVE_ODDS_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLap((prev) => {
        if (prev >= TOTAL_LAPS) return LIVE_LAP_START;
        return prev + 1;
      });
      setOdds((prev) => {
        const leader = DRIVERS.reduce((best, d) =>
          prev[d.id] > prev[best.id] ? d : best,
        ).id;
        const donor = DRIVERS.map((d) => d.id).find(
          (id) => id !== leader && prev[id] > 6,
        );
        if (!donor) return prev;
        return { ...prev, [leader]: prev[leader] + 1, [donor]: prev[donor] - 1 };
      });
    }, LIVE_LAP_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-4">
      <div className="w-[310px]">
        <CardEffectSelect value={effect} onChange={setEffect} />
      </div>

      <div className="relative">
        {isMagic ? <MagicSparkles pad={22} /> : null}
        <CardEffectAura effect={effect} />
        <article
          className={`group relative z-[1] flex h-[118px] w-[310px] cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl bg-white/[0.04] px-4 pt-3 pb-1.5 transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-white/[0.07] active:scale-[0.99] ${
            usesGlassRim
              ? "shadow-[inset_0px_0px_4px_0px_rgba(255,255,255,0.25)] hover:shadow-[inset_0px_0px_6px_0px_rgba(255,255,255,0.38)]"
              : ""
          }`}
          aria-label={`F1 Singapore Winner, lap ${lap} of ${TOTAL_LAPS}`}
        >
          <CardEffectSurface effect={effect} />
          <RaceProgress progress={progress} />

          <div className="relative z-[1] flex w-full items-start justify-between">
            <div className="flex items-start gap-2 text-xs font-semibold leading-[1.25] whitespace-nowrap text-white/60">
              <span>F1</span>
              <span>Singapore</span>
              <span>Winner</span>
            </div>

            <div className="flex shrink-0 items-center justify-center gap-2">
              <span
                aria-hidden
                className="size-1 shrink-0 animate-pulse rounded-full bg-[#ff4d5e]"
              />
              <p className="inline-flex items-baseline overflow-hidden text-xs font-semibold leading-[1.25] text-ellipsis whitespace-nowrap text-[#ff4d5e] tabular-nums">
                <span>Lap&nbsp;</span>
                <NumberFlow
                  value={lap}
                  trend={0}
                  format={{ useGrouping: false }}
                  className="tabular-nums text-inherit"
                  style={nfStyle}
                />
                <span>&nbsp;/&nbsp;{TOTAL_LAPS}</span>
              </p>
            </div>
          </div>

          <div className="relative z-[1] flex w-full items-center justify-between pt-2 pb-4">
            {DRIVERS.map((driver) => (
              <DriverColumn
                key={driver.id}
                name={driver.name}
                avatar={driver.avatar}
                flag={driver.flag}
                ring={driver.ring}
                percent={odds[driver.id]}
              />
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function DriverColumn({
  name,
  avatar,
  flag,
  ring,
  percent,
}: {
  name: string;
  avatar: string;
  flag: string;
  ring: string;
  percent: number;
}) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative size-8 shrink-0">
          <div
            className="absolute inset-0 overflow-hidden rounded-full border-solid"
            style={{ borderColor: ring, borderWidth: 1.5 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt=""
              className="pointer-events-none size-full object-cover"
              draggable={false}
            />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flag}
            alt=""
            className="pointer-events-none absolute top-5 left-4 size-4 object-cover"
            draggable={false}
          />
        </div>
        <p
          className={`text-2xl font-semibold leading-[1.25] tracking-[-0.48px] whitespace-nowrap text-white tabular-nums ${instrumentSansCondensed.className}`}
        >
          <NumberFlow
            value={percent}
            trend={0}
            suffix="%"
            format={{ useGrouping: false }}
            className="tabular-nums text-inherit"
            style={nfStyle}
          />
        </p>
      </div>
      <p className="w-full overflow-hidden text-center text-xs font-semibold leading-[1.25] text-ellipsis whitespace-nowrap text-white/60">
        {name}
      </p>
    </div>
  );
}
