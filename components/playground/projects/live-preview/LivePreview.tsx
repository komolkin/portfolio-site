"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import { MagicSparkles } from "@/components/playground/card-foil";
import {
  CARD_EFFECT_SELECT_CLASS,
  CardEffectSelect,
  CardEffectSurface,
  type CardEffectId,
} from "@/components/playground/card-effects";
import { instrumentSansCondensed } from "@/lib/fonts";

/**
 * Live match preview — Figma component set (node 17631:94929):
 * https://www.figma.com/design/XSjBMcMS96jS8ntZIpMukQ/Ilya?node-id=17631-94929
 */
const IMG_FLAG_VALLEJO = "/playground/live-preview/flag-vallejo.png";
const IMG_FLAG_DANIEL = "/playground/live-preview/flag-daniel.png";
const IMG_CHEVRON = "/playground/expandable/chevron-16.svg";

const STATES = [
  { id: "live", label: "Live" },
  { id: "ended", label: "Ended" },
  { id: "in-2-days", label: "in 2 days" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "under-24h", label: "in less than 24 hours" },
  { id: "under-2h", label: "in 2 minutes" },
] as const;

type PreviewState = (typeof STATES)[number]["id"];

const MATCH_DATETIME = "Oct 10, 1:30 PM";
const COUNTDOWN_24H_START = 23 * 3600 + 12 * 60 + 56;
const COUNTDOWN_2H_START = 1 * 60 + 56;
const LIVE_CLOCK_START = 54 * 60 + 16;
const LIVE_SCORE_TICK_MS = 7_000;
const LIVE_ODDS_TICK_MS = 2_200;
const INITIAL_LEFT_PCT = 86;
const ENDED_SETS: [number, number] = [2, 1];
const ENDED_LEFT_PCT = 100;

const nfStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function splitTime(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    totalMinutes: Math.floor(s / 60),
  };
}

/** Best-of-5 set board. Resets into a mid-match state when someone clinches. */
function nextLiveScore(sets: [number, number]): [number, number] {
  const [a, b] = sets;
  if (a >= 3 || b >= 3) {
    return Math.random() < 0.5 ? [1, 1] : [1, 2];
  }
  // Slightly favor the trailing player so the board stays competitive.
  const trailLeft = a < b;
  const awardLeft =
    Math.random() < (trailLeft ? 0.58 : a > b ? 0.42 : 0.5);
  const next: [number, number] = awardLeft ? [a + 1, b] : [a, b + 1];
  if (next[0] >= 3 || next[1] >= 3) {
    return Math.random() < 0.5 ? [1, 0] : [0, 1];
  }
  return next;
}

function setNumberFromScore(sets: [number, number]) {
  return Math.min(5, sets[0] + sets[1] + 1);
}

/** Quiet random walk while the point is live. */
function driftOdds(prevLeft: number) {
  const step = Math.random() < 0.5 ? -1 : 1;
  const magnitude = Math.random() < 0.25 ? 2 : 1;
  return Math.round(clamp(prevLeft + step * magnitude, 8, 92));
}

/** Bigger reprice after a set lands. */
function repriceAfterSet(prevLeft: number, prev: [number, number], next: [number, number]) {
  const leftWon = next[0] > prev[0];
  const swing = 4 + Math.floor(Math.random() * 5);
  return Math.round(
    clamp(prevLeft + (leftWon ? swing : -swing), 8, 92),
  );
}

export default function LivePreview() {
  const [state, setState] = useState<PreviewState>("live");
  const [effect, setEffect] = useState<CardEffectId>("default");
  const [countdown24h, setCountdown24h] = useState(COUNTDOWN_24H_START);
  const [countdown2h, setCountdown2h] = useState(COUNTDOWN_2H_START);
  const [liveClock, setLiveClock] = useState(LIVE_CLOCK_START);
  const [liveSets, setLiveSets] = useState<[number, number]>([1, 2]);
  const [liveSetNumber, setLiveSetNumber] = useState(3);
  const [leftPct, setLeftPct] = useState(INITIAL_LEFT_PCT);

  const active = STATES.find((entry) => entry.id === state) ?? STATES[0];
  const isLive = state === "live";
  const isEnded = state === "ended";
  const isCountdown24h = state === "under-24h";
  const isCountdown2h = state === "under-2h";
  const showScore = isLive || isEnded;
  const isMagic = effect === "magic";
  const usesGlassRim = effect !== "default";
  const rightPct = 100 - leftPct;
  const scoreSets = isEnded ? ENDED_SETS : liveSets;

  useEffect(() => {
    if (state === "under-24h") setCountdown24h(COUNTDOWN_24H_START);
    if (state === "under-2h") setCountdown2h(COUNTDOWN_2H_START);
    if (state === "live") {
      setLiveClock(LIVE_CLOCK_START);
      setLiveSets([1, 2]);
      setLiveSetNumber(3);
      setLeftPct(INITIAL_LEFT_PCT);
    }
    if (state === "ended") {
      setLiveSets(ENDED_SETS);
      setLeftPct(ENDED_LEFT_PCT);
    }
    if (state !== "live" && state !== "ended") setLeftPct(INITIAL_LEFT_PCT);
  }, [state]);

  useEffect(() => {
    if (!isCountdown24h && !isCountdown2h && !isLive) return;

    const id = window.setInterval(() => {
      if (isCountdown24h) {
        setCountdown24h((prev) => (prev > 0 ? prev - 1 : COUNTDOWN_24H_START));
      }
      if (isCountdown2h) {
        setCountdown2h((prev) => (prev > 0 ? prev - 1 : COUNTDOWN_2H_START));
      }
      if (isLive) {
        setLiveClock((prev) => prev + 1);
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [isCountdown24h, isCountdown2h, isLive]);

  // Live odds tick continuously.
  useEffect(() => {
    if (!isLive) return;

    const id = window.setInterval(() => {
      setLeftPct((prev) => driftOdds(prev));
    }, LIVE_ODDS_TICK_MS);

    return () => window.clearInterval(id);
  }, [isLive]);

  // Live set score advances on a slower cadence, with a matching odds swing.
  useEffect(() => {
    if (!isLive) return;

    const id = window.setInterval(() => {
      setLiveSets((prev) => {
        const next = nextLiveScore(prev);
        setLiveSetNumber(setNumberFromScore(next));
        setLeftPct((odds) => repriceAfterSet(odds, prev, next));
        return next;
      });
    }, LIVE_SCORE_TICK_MS);

    return () => window.clearInterval(id);
  }, [isLive]);

  const countdown = isCountdown24h
    ? splitTime(countdown24h)
    : isCountdown2h
      ? splitTime(countdown2h)
      : null;
  const liveTime = splitTime(liveClock);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-4">
      <div className="flex w-[310px] items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <select
            value={state}
            onChange={(event) => setState(event.target.value as PreviewState)}
            className={CARD_EFFECT_SELECT_CLASS}
            aria-label="Preview state"
          >
            {STATES.map((entry) => (
              <option
                key={entry.id}
                value={entry.id}
                className="bg-[#1a1a1a] text-white"
              >
                {entry.label}
              </option>
            ))}
          </select>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMG_CHEVRON}
            alt=""
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 opacity-45"
            draggable={false}
          />
        </div>

        <CardEffectSelect
          value={effect}
          onChange={setEffect}
          className="flex-1"
        />
      </div>

      <div className="relative">
        {isMagic ? <MagicSparkles pad={22} /> : null}
        <article
          className={`group relative flex h-[122px] w-[310px] cursor-pointer flex-col justify-center overflow-hidden rounded-2xl bg-white/[0.04] px-4 transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-white/[0.07] active:scale-[0.99] ${
            usesGlassRim
              ? "shadow-[inset_0px_0px_4px_0px_rgba(255,255,255,0.25)] hover:shadow-[inset_0px_0px_6px_0px_rgba(255,255,255,0.38)]"
              : ""
          }`}
          aria-label={`ATP match preview, ${active.label}`}
        >
          <CardEffectSurface effect={effect} />
          <div className="relative z-[1] flex w-full items-center justify-between">
            <PlayerColumn
              flagSrc={IMG_FLAG_VALLEJO}
              name="Adolfo Vallejo"
              percent={leftPct}
            />

            <div className="flex h-[80px] w-[100px] shrink-0 flex-col items-center justify-center gap-1.5">
              <p className="text-xs font-semibold leading-[1.25] text-white/60">
                ATP
              </p>

              {showScore ? (
                <>
                  <div
                    className={`flex items-center gap-1 text-center text-[32px] font-semibold leading-[1.25] tracking-[-0.64px] text-white tabular-nums ${instrumentSansCondensed.className}`}
                  >
                    <NumberFlow
                      value={scoreSets[0]}
                      trend={0}
                      format={{ useGrouping: false }}
                      className="inline-block w-10 shrink-0 tabular-nums"
                      style={nfStyle}
                    />
                    <span className="shrink-0 opacity-40">-</span>
                    <NumberFlow
                      value={scoreSets[1]}
                      trend={0}
                      format={{ useGrouping: false }}
                      className="inline-block w-10 shrink-0 tabular-nums"
                      style={nfStyle}
                    />
                  </div>
                  {isEnded ? (
                    <p className="pt-1.5 text-xs font-semibold leading-[1.25] text-white/60">
                      Full Time
                    </p>
                  ) : (
                    <div className="flex items-center justify-center gap-2 pt-1.5 pr-1">
                      <span
                        aria-hidden
                        className="size-1 shrink-0 animate-pulse rounded-full bg-[#ff4d5e]"
                      />
                      <p className="inline-flex items-baseline overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold leading-[1.25] text-[#ff4d5e] tabular-nums">
                        <span>S</span>
                        <NumberFlow
                          value={liveSetNumber}
                          trend={0}
                          format={{ useGrouping: false }}
                          className="tabular-nums text-inherit"
                          style={nfStyle}
                        />
                        <span className="mx-1">–</span>
                        <NumberFlow
                          value={liveTime.totalMinutes}
                          trend={0}
                          format={{ useGrouping: false }}
                          className="tabular-nums text-inherit"
                          style={nfStyle}
                        />
                        <span>:</span>
                        <NumberFlow
                          value={liveTime.seconds}
                          trend={0}
                          format={{
                            useGrouping: false,
                            minimumIntegerDigits: 2,
                          }}
                          className="tabular-nums text-inherit"
                          style={nfStyle}
                        />
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 whitespace-nowrap">
                  {countdown ? (
                    <p className="inline-flex items-baseline text-sm font-semibold leading-[1.25] text-white tabular-nums">
                      <span className="mr-1">in</span>
                      {isCountdown24h ? (
                        <>
                          <NumberFlow
                            value={countdown.hours}
                            trend={0}
                            format={{
                              useGrouping: false,
                              minimumIntegerDigits: 2,
                            }}
                            className="tabular-nums text-inherit"
                            style={nfStyle}
                          />
                          <span>:</span>
                        </>
                      ) : null}
                      <NumberFlow
                        value={countdown.minutes}
                        trend={0}
                        format={{
                          useGrouping: false,
                          minimumIntegerDigits: 2,
                        }}
                        className="tabular-nums text-inherit"
                        style={nfStyle}
                      />
                      <span>:</span>
                      <NumberFlow
                        value={countdown.seconds}
                        trend={0}
                        format={{
                          useGrouping: false,
                          minimumIntegerDigits: 2,
                        }}
                        className="tabular-nums text-inherit"
                        style={nfStyle}
                      />
                    </p>
                  ) : (
                    <p className="text-sm font-semibold leading-[1.25] text-white">
                      {active.label}
                    </p>
                  )}
                  <p className="text-[10px] font-normal leading-3 text-white/60">
                    {MATCH_DATETIME}
                  </p>
                </div>
              )}
            </div>

            <PlayerColumn
              flagSrc={IMG_FLAG_DANIEL}
              name="Taro Daniel"
              percent={rightPct}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

function PlayerColumn({
  flagSrc,
  name,
  percent,
}: {
  flagSrc: string;
  name: string;
  percent: number;
}) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-1.5">
      <div className="relative size-7 shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={flagSrc}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover"
          draggable={false}
        />
      </div>
      <div className="flex w-full flex-col items-center gap-0.5 whitespace-nowrap">
        <p className="w-full overflow-hidden text-ellipsis text-center text-xs font-semibold leading-[1.25] text-white">
          {name}
        </p>
        <p className="text-center text-xl font-semibold leading-[1.25] tracking-[0.4px] text-white/60 tabular-nums">
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
    </div>
  );
}
