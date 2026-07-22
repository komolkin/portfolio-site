"use client";

import NumberFlow from "@number-flow/react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Liveline, type LivelinePoint, type LivelineSeries } from "liveline";
import { instrumentSansCondensed } from "@/lib/fonts";
import Position7Particles from "./Position7Particles";

/**
 * Position #7 — Position #6 plus a 3-way media switcher:
 * full-screen stream, full-screen live odds chart, or play-by-play timeline.
 */
const IMG_ENGLAND = "/playground/position-7/england-flag.svg";
const IMG_ARGENTINA = "/playground/position-7/argentina-flag.svg";
const VIDEO_SRC = "/playground/position-7/england.mp4";
const FLAG_IMG_CLASS =
  "relative h-8 w-12 shrink-0 overflow-hidden rounded-[5px] transition-transform duration-300";

type CountrySide = "england" | "argentina";
type MediaView = "video" | "odds" | "playByPlay";

type PlayByPlayEvent = {
  id: string;
  clockSeconds: number;
  team: CountrySide | "neutral";
  kind: "goal" | "shot" | "corner" | "foul" | "sub" | "kickoff";
  label: string;
};

const MEDIA_VIEWS: { id: MediaView; label: string }[] = [
  { id: "video", label: "Live-stream" },
  { id: "odds", label: "Chart" },
  { id: "playByPlay", label: "Timeline" },
];

const ODDS_HISTORY_MAX = 56;
const SIM_TICK_MS = 2200;
const FAST_FORWARD_DELTA_THRESHOLD = 12;
const FAST_FORWARD_FX_MS = 550;
const PBP_MAX_EVENTS = 24;

const COUNTRY_META: Record<
  CountrySide,
  { label: string; flag: string; flagAlt: string }
> = {
  england: {
    label: "England",
    flag: IMG_ENGLAND,
    flagAlt: "England flag",
  },
  argentina: {
    label: "Argentina",
    flag: IMG_ARGENTINA,
    flagAlt: "Argentina flag",
  },
};

const PHONE_WIDTH = 400;
const PHONE_HEIGHT = 760;

const MATCH_START_SECONDS = 54 * 60 + 16;
const MATCH_MAX_SECONDS = 90 * 60;
const MATCH_TICK_MS = 1000;
const GOAL_FIRST_DELAY_MS = 6000;
const GOAL_REPEAT_INTERVAL_MS = 15000;
const GOAL_FLASH_MS = 1600;
const SIZE_DELTA_HOLD_MS = 900;
const SIZE_DELTA_EXIT_MS = 480;

const FILL_MIN = 20;
const FILL_MAX = 80;
const FILL_NEAR_90_MIN = 88;
const FILL_NEAR_90_MAX = 92;
const FILL_NEAR_98_MIN = 96;
const FILL_NEAR_98_MAX = 98;
const ENTRY_LINE_PERCENT = 40;
const LIQ_LINE_PERCENT = 13;
const INITIAL_VALUE_USD = 100;
const MAX_VALUE_USD = 286;
const MIN_POSITION_SIZE_USD = 5;
const ACTIONS_ROW_HEIGHT = 113;
const ACTIONS_ROW_GAP = 16;
const ACTIONS_COLLAPSE_DISTANCE = 72;

type PositionShortcut = {
  id: string;
  label: string;
  delta: number;
};

const DEFAULT_POSITION_SHORTCUTS: PositionShortcut[] = [
  { id: "dec-5", label: "-$5", delta: -5 },
  { id: "inc-5", label: "+$5", delta: 5 },
];

function parseShortcutLabel(label: string): number | null {
  const trimmed = label.trim().replace(/\s/g, "");
  const match = trimmed.match(/^([+-]?)\$?(\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const value = Number(match[2]);
  if (!Number.isFinite(value) || value <= 0) return null;

  return match[1] === "-" ? -value : value;
}

function formatShortcutLabel(delta: number): string {
  const abs = Math.abs(delta);
  const formatted = Number.isInteger(abs)
    ? abs.toString()
    : abs.toFixed(2).replace(/\.?0+$/, "");
  return delta < 0 ? `-$${formatted}` : `+$${formatted}`;
}

function formatShortcutAmount(delta: number): string {
  const abs = Math.abs(delta);
  const formatted = Number.isInteger(abs)
    ? abs.toString()
    : abs.toFixed(2).replace(/\.?0+$/, "");
  return `$${formatted}`;
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-4"}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M13.25 3.75 16.25 6.75 7.5 15.5H4.5V12.5L13.25 3.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.75 5.25 14.75 8.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-4"}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M5.5 10.25 8.5 13.25 14.5 7.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5"}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M12.5 4.75 7.25 10l5.25 5.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwitchSidesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-8"}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M16.5 3.75 19.5 6.75 16.5 9.75"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 6.75h15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M7.5 20.25 4.5 17.25 7.5 14.25"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 17.25h-15"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StreamIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4"} viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="4.5"
        width="15"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8.25 8.1v3.8L11.9 10 8.25 8.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function OddsChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4"} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3.5 13.5 7.2 9.4 10.4 12.1 16.5 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 16.25h13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

function PlayByPlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4"} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 4.5v11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="5" cy="6" r="1.35" fill="currentColor" />
      <circle cx="5" cy="10" r="1.35" fill="currentColor" />
      <circle cx="5" cy="14" r="1.35" fill="currentColor" />
      <path
        d="M8.25 6h6.5M8.25 10h6.5M8.25 14h4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const MEDIA_VIEW_ICONS: Record<MediaView, (props: { className?: string }) => JSX.Element> = {
  video: StreamIcon,
  odds: OddsChartIcon,
  playByPlay: PlayByPlayIcon,
};

const ODDS_ENG_COLOR = "#e05454";
const ODDS_ARG_COLOR = "#5b8fd4";
const MEDIA_BG_GRADIENT =
  "linear-gradient(180deg, #161618 0%, #0c0c0e 48%, #080809 100%)";
const ODDS_MAX_STEP = 6;
const ODDS_SPIKE_CHANCE = 0.1;
const ODDS_SPIKE_MAX = 14;
const ODDS_TICK_SECS = SIM_TICK_MS / 1000;
const ODDS_WINDOW_SECS = Math.ceil(ODDS_HISTORY_MAX * ODDS_TICK_SECS) + 12;

function clampOddsPercent(value: number): number {
  return Math.min(97, Math.max(3, value));
}

function nextOddsPercent(previous: number, target: number): number {
  const rawDelta = target - previous;
  const maxStep = Math.random() < ODDS_SPIKE_CHANCE ? ODDS_SPIKE_MAX : ODDS_MAX_STEP;
  const stepped = Math.max(-maxStep, Math.min(maxStep, rawDelta));
  const noise = (Math.random() - 0.5) * 1.6;
  return Math.round(clampOddsPercent(previous + stepped + noise));
}

function seedOddsHistory(length = 40, endValue = 60): LivelinePoint[] {
  const now = Date.now() / 1000;
  const values: number[] = [];
  let current = 52 + Math.random() * 6;
  for (let i = 0; i < length; i++) {
    const t = i / (length - 1);
    const drift =
      Math.sin(t * Math.PI * 1.6) * 7 +
      Math.sin(t * Math.PI * 4.2) * 3.5 +
      (t > 0.72 ? (t - 0.72) * 28 : 0);
    const target = 54 + drift + (endValue - 60) * t * 0.85;
    const maxStep = t > 0.78 ? 9 : 4.5;
    const delta = Math.max(-maxStep, Math.min(maxStep, target - current));
    current = clampOddsPercent(current + delta + (Math.random() - 0.5) * 1.2);
    values.push(Math.round(current));
  }
  values[values.length - 1] = Math.round(clampOddsPercent(endValue));
  return values.map((value, index) => ({
    time: now - (length - 1 - index) * ODDS_TICK_SECS,
    value,
  }));
}

function formatMatchClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.min(totalSeconds, MATCH_MAX_SECONDS));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Progress fill — Figma Progress rectangles (7425:19765 / 7425:19887) */
const FILL_COLOR_GREEN = "#1c662d";
const FILL_COLOR_RED = "#7a0f1c";
const ENTRY_DASH_COLOR = "#ffe600";

const CARD_BG_GREEN =
  "linear-gradient(180deg, rgba(93,217,120,0.08) 0%, rgba(93,217,120,0.14) 100%), rgba(29,29,29,0.52)";
const CARD_BG_RED =
  "linear-gradient(180deg, rgba(255,77,94,0.04) 0%, rgba(255,77,94,0.14) 100%), rgba(29,29,29,0.52)";
const CARD_BORDER_GREEN = "rgba(93,217,120,0.14)";
const CARD_BORDER_RED = "rgba(255,77,94,0.14)";

const PROGRESS_EASE = "cubic-bezier(0.33, 1, 0.68, 1)";

/** Fill width + trailing % — shared timing so they move in sync */
const PROGRESS_FILL_MOTION =
  "transition-[width,background-color] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none";

/** Compact progress bar toggle — height, labels, overlays */
const PROGRESS_BAR_MOTION =
  "transition-[height,opacity,top,font-size,color,transform] duration-[280ms] ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none";

const LIQ_GLOW_RANGE = 18;
const END_GLOW_RANGE = 22;
const LIQ_LINE_COLOR_HOT = "#ff0037";

function getLiqLineProximity(fillPercent: number, country: CountrySide) {
  const effectiveFill = country === "england" ? fillPercent : 100 - fillPercent;
  const liqDelta = effectiveFill - LIQ_LINE_PERCENT;
  if (liqDelta > LIQ_GLOW_RANGE) return 0;
  if (liqDelta <= 0) return 1;
  return 1 - liqDelta / LIQ_GLOW_RANGE;
}

function getCashOutGlow(fillPercent: number, country: CountrySide) {
  const effectiveFill = country === "england" ? fillPercent : 100 - fillPercent;
  const liqDelta = effectiveFill - LIQ_LINE_PERCENT;
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

  if (effectiveFill < ENTRY_LINE_PERCENT) {
    return { mode: "off" as const, strength: 0, pulseMs: 0 };
  }

  const progressFromEntry =
    (effectiveFill - ENTRY_LINE_PERCENT) / (100 - ENTRY_LINE_PERCENT);
  const endDelta = 100 - effectiveFill;
  const endProximity =
    endDelta <= END_GLOW_RANGE ? 1 - endDelta / END_GLOW_RANGE : 0;

  const strength = Math.min(1, 0.14 + progressFromEntry * 0.46 + endProximity * 0.24);
  const pulseMs = Math.max(
    320,
    Math.round(2600 - progressFromEntry * 1400 - endProximity * 900),
  );

  return {
    mode: "win" as const,
    strength,
    pulseMs,
  };
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomFillPercent(): number {
  const roll = Math.random();
  if (roll < 0.22) return randomInt(FILL_NEAR_90_MIN, FILL_NEAR_90_MAX);
  if (roll < 0.38) return randomInt(FILL_NEAR_98_MIN, FILL_NEAR_98_MAX);
  return randomInt(FILL_MIN, FILL_MAX);
}

/** Simple integer count animation (no NumberFlow digit scrapers). */
function useAnimatedCount(target: number, durationMs = 140): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const from = displayRef.current;
    if (from === target) return;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setDisplay(target);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, prefersReducedMotion]);

  return display;
}

function SizeDeltaFlashLabel({
  amount,
  exiting,
}: {
  amount: number;
  exiting: boolean;
}) {
  const animatedAbs = useAnimatedCount(Math.abs(amount));

  return (
    <span
      className={`inline-flex items-baseline text-[102px] font-semibold leading-none tracking-tight text-white tabular-nums drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] ${instrumentSansCondensed.className} ${
        exiting
          ? amount > 0
            ? "position7-size-delta-exit-up"
            : "position7-size-delta-exit-down"
          : "position7-size-delta-enter"
      }`}
    >
      <span>
        {amount > 0 ? "+$" : "-$"}
        {animatedAbs.toLocaleString("en-US")}
      </span>
    </span>
  );
}

export default function Position7() {
  const [fillPercent, setFillPercent] = useState(60);
  const [positionSizeUsd, setPositionSizeUsd] = useState(INITIAL_VALUE_USD);
  const [country, setCountry] = useState<CountrySide>("england");
  const [cardPanel, setCardPanel] = useState<"position" | "actions">("position");
  const [mediaView, setMediaView] = useState<MediaView>("video");
  const [oddsHistory, setOddsHistory] = useState<LivelinePoint[]>(() =>
    seedOddsHistory(40, 60),
  );
  const [playByPlay, setPlayByPlay] = useState<PlayByPlayEvent[]>(() => [
    {
      id: "goal-open",
      clockSeconds: 41 * 60 + 18,
      team: "england",
      kind: "goal",
      label: "Goal — Kane",
    },
    {
      id: "corner-1",
      clockSeconds: 28 * 60 + 41,
      team: "england",
      kind: "corner",
      label: "Corner — England left flank",
    },
    {
      id: "shot-1",
      clockSeconds: 12 * 60 + 4,
      team: "argentina",
      kind: "shot",
      label: "Shot saved — Martinez",
    },
    {
      id: "kickoff",
      clockSeconds: 0,
      team: "neutral",
      kind: "kickoff",
      label: "Kickoff — Atlanta Stadium",
    },
  ]);
  const playByPlayIdRef = useRef(0);
  const matchSecondsRef = useRef(MATCH_START_SECONDS);
  const [positionShortcuts, setPositionShortcuts] = useState(DEFAULT_POSITION_SHORTCUTS);
  const [isEditingShortcuts, setIsEditingShortcuts] = useState(false);
  const [draftShortcutLabels, setDraftShortcutLabels] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState(true);
  const [isFastForwardFx, setIsFastForwardFx] = useState(false);
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const [isDraggingActions, setIsDraggingActions] = useState(false);
  const actionsCollapseProgress = useMotionValue(0);
  const actionsHeight = useTransform(
    actionsCollapseProgress,
    [0, 1],
    [ACTIONS_ROW_HEIGHT, 0],
  );
  const actionsOpacity = useTransform(actionsCollapseProgress, [0, 1], [1, 0]);
  const actionsGap = useTransform(actionsCollapseProgress, [0, 1], [ACTIONS_ROW_GAP, 0]);
  const oddsChartTop = useTransform(
    actionsCollapseProgress,
    [0, 1],
    ["calc(24% - 40px)", "calc(20% - 40px)"],
  );
  const oddsChartBottom = useTransform(
    actionsCollapseProgress,
    [0, 1],
    ["38%", "20%"],
  );
  const actionsCollapsedRef = useRef(false);
  const isDraggingActionsRef = useRef(false);
  const actionsDragStartY = useRef(0);
  const actionsDragStartProgress = useRef(0);
  const actionsDragMoved = useRef(false);
  const actionsDragFromHandle = useRef(false);
  const fastForwardTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [matchSeconds, setMatchSeconds] = useState(MATCH_START_SECONDS);
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [goalFlashTeam, setGoalFlashTeam] = useState<"home" | "away" | null>(null);
  const goalFlashTimerRef = useRef<number | null>(null);
  const [sizeDeltaFlash, setSizeDeltaFlash] = useState<{
    sessionId: number;
    amount: number;
    bumpId: number;
    exiting: boolean;
  } | null>(null);
  const sizeDeltaFlashTimerRef = useRef<number | null>(null);
  const sizeDeltaFlashExitTimerRef = useRef<number | null>(null);
  const sizeDeltaFlashSessionRef = useRef(0);
  const sizeDeltaFlashBumpRef = useRef(0);
  const sizeDeltaStackedRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (mediaView === "video") {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [mediaView]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMatchSeconds((prev) => {
        const next = prev >= MATCH_MAX_SECONDS ? prev : prev + 1;
        matchSecondsRef.current = next;
        return next;
      });
    }, MATCH_TICK_MS);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const pushEvent = (event: Omit<PlayByPlayEvent, "id">) => {
      playByPlayIdRef.current += 1;
      const next: PlayByPlayEvent = {
        ...event,
        id: `pbp-${playByPlayIdRef.current}`,
      };
      setPlayByPlay((prev) => [next, ...prev].slice(0, PBP_MAX_EVENTS));
    };

    const scoreGoal = () => {
      setHomeScore((score) => score + 1);
      setGoalFlashTeam("home");
      pushEvent({
        clockSeconds: matchSecondsRef.current,
        team: "england",
        kind: "goal",
        label: "Goal — Kane",
      });
      if (goalFlashTimerRef.current !== null) {
        window.clearTimeout(goalFlashTimerRef.current);
      }
      goalFlashTimerRef.current = window.setTimeout(() => {
        setGoalFlashTeam(null);
        goalFlashTimerRef.current = null;
      }, GOAL_FLASH_MS);
    };

    let repeatIntervalId: number | null = null;
    const firstGoalTimeoutId = window.setTimeout(() => {
      scoreGoal();
      repeatIntervalId = window.setInterval(scoreGoal, GOAL_REPEAT_INTERVAL_MS);
    }, GOAL_FIRST_DELAY_MS);

    const flavorEvents: Omit<PlayByPlayEvent, "id" | "clockSeconds">[] = [
      { team: "argentina", kind: "foul", label: "Foul — midfield scramble" },
      { team: "england", kind: "shot", label: "Shot wide — Saka" },
      { team: "argentina", kind: "corner", label: "Corner — Argentina" },
      { team: "england", kind: "sub", label: "Sub — Foden on" },
      { team: "argentina", kind: "shot", label: "Blocked shot — Alvarez" },
    ];
    let flavorIndex = 0;
    const flavorIntervalId = window.setInterval(() => {
      const flavor = flavorEvents[flavorIndex % flavorEvents.length];
      flavorIndex += 1;
      pushEvent({ ...flavor, clockSeconds: matchSecondsRef.current });
    }, 9000);

    return () => {
      window.clearTimeout(firstGoalTimeoutId);
      window.clearInterval(flavorIntervalId);
      if (repeatIntervalId !== null) {
        window.clearInterval(repeatIntervalId);
      }
      if (goalFlashTimerRef.current !== null) {
        window.clearTimeout(goalFlashTimerRef.current);
        goalFlashTimerRef.current = null;
      }
      if (sizeDeltaFlashTimerRef.current !== null) {
        window.clearTimeout(sizeDeltaFlashTimerRef.current);
        sizeDeltaFlashTimerRef.current = null;
      }
      if (sizeDeltaFlashExitTimerRef.current !== null) {
        window.clearTimeout(sizeDeltaFlashExitTimerRef.current);
        sizeDeltaFlashExitTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const initial = randomFillPercent();
    setFillPercent(initial);
    setOddsHistory(seedOddsHistory(40, initial));
    const id = window.setInterval(() => {
      setFillPercent((prev) => {
        const next = randomFillPercent();
        setOddsHistory((history) => {
          const last = history[history.length - 1]?.value ?? prev;
          return [
            ...history,
            { time: Date.now() / 1000, value: nextOddsPercent(last, next) },
          ].slice(-ODDS_HISTORY_MAX);
        });
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

  const scaledMaxUsd = useMemo(
    () => Math.round(MAX_VALUE_USD * (positionSizeUsd / INITIAL_VALUE_USD)),
    [positionSizeUsd],
  );

  const marketPnlSigned = useMemo(
    () =>
      Math.round(
        ((scaledMaxUsd - positionSizeUsd) / (100 - ENTRY_LINE_PERCENT)) *
          (fillPercent - ENTRY_LINE_PERCENT),
      ),
    [fillPercent, positionSizeUsd, scaledMaxUsd],
  );
  const pnlSigned = country === "england" ? marketPnlSigned : -marketPnlSigned;
  const pnlPrefix = pnlSigned < 0 ? "-$" : "+$";
  const pnlAbs = Math.abs(pnlSigned);
  const pnlColorClass = pnlSigned < 0 ? "text-[#f87171]" : "text-[#5dd978]";

  const currentTotalUsd = positionSizeUsd + pnlSigned;
  const topPrefix = currentTotalUsd < 0 ? "-$" : "$";
  const topAbs = Math.abs(currentTotalUsd);

  const matchMinutes = Math.floor(matchSeconds / 60);
  const matchClockSeconds = matchSeconds % 60;

  const adjustPositionSize = (delta: number) => {
    const next = Math.max(MIN_POSITION_SIZE_USD, positionSizeUsd + delta);
    const appliedDelta = next - positionSizeUsd;
    if (appliedDelta === 0) return;

    setPositionSizeUsd(next);

    const isNewSession =
      sizeDeltaFlashTimerRef.current === null &&
      sizeDeltaFlashExitTimerRef.current === null;
    if (isNewSession) {
      sizeDeltaFlashSessionRef.current += 1;
      sizeDeltaStackedRef.current = appliedDelta;
    } else {
      sizeDeltaStackedRef.current += appliedDelta;
    }

    sizeDeltaFlashBumpRef.current += 1;
    setSizeDeltaFlash({
      sessionId: sizeDeltaFlashSessionRef.current,
      amount: sizeDeltaStackedRef.current,
      bumpId: sizeDeltaFlashBumpRef.current,
      exiting: false,
    });

    if (sizeDeltaFlashTimerRef.current !== null) {
      window.clearTimeout(sizeDeltaFlashTimerRef.current);
    }
    if (sizeDeltaFlashExitTimerRef.current !== null) {
      window.clearTimeout(sizeDeltaFlashExitTimerRef.current);
      sizeDeltaFlashExitTimerRef.current = null;
    }

    sizeDeltaFlashTimerRef.current = window.setTimeout(() => {
      sizeDeltaFlashTimerRef.current = null;
      setSizeDeltaFlash((prev) => (prev ? { ...prev, exiting: true } : null));
      sizeDeltaFlashExitTimerRef.current = window.setTimeout(() => {
        setSizeDeltaFlash(null);
        sizeDeltaStackedRef.current = 0;
        sizeDeltaFlashExitTimerRef.current = null;
      }, SIZE_DELTA_EXIT_MS);
    }, SIZE_DELTA_HOLD_MS);
  };

  const startEditingShortcuts = () => {
    setDraftShortcutLabels(positionShortcuts.map((shortcut) => shortcut.label));
    setIsEditingShortcuts(true);
  };

  const confirmEditingShortcuts = () => {
    setPositionShortcuts((prev) =>
      prev.map((shortcut, index) => {
        const parsed = parseShortcutLabel(draftShortcutLabels[index] ?? shortcut.label);
        const delta = parsed ?? shortcut.delta;

        return {
          ...shortcut,
          label: parsed !== null ? formatShortcutLabel(delta) : shortcut.label,
          delta,
        };
      }),
    );
    setIsEditingShortcuts(false);
  };

  const isAhead =
    country === "england"
      ? fillPercent >= ENTRY_LINE_PERCENT
      : fillPercent < ENTRY_LINE_PERCENT;
  const pctColor = isAhead ? "#5dd978" : "#ff7d8a";
  const cashOutGlow = useMemo(
    () => getCashOutGlow(fillPercent, country),
    [fillPercent, country],
  );
  const liqLineProximity = useMemo(
    () => getLiqLineProximity(fillPercent, country),
    [fillPercent, country],
  );
  const selectedCountry = COUNTRY_META[country];
  const englandOdds = Math.round(
    oddsHistory[oddsHistory.length - 1]?.value ?? fillPercent,
  );
  const argentinaOdds = 100 - englandOdds;
  const oddsSeries = useMemo<LivelineSeries[]>(
    () => [
      {
        id: "eng",
        label: "ENG",
        color: ODDS_ENG_COLOR,
        data: oddsHistory,
        value: englandOdds,
      },
      {
        id: "arg",
        label: "ARG",
        color: ODDS_ARG_COLOR,
        data: oddsHistory.map((point) => ({
          time: point.time,
          value: 100 - point.value,
        })),
        value: argentinaOdds,
      },
    ],
    [oddsHistory, englandOdds, argentinaOdds],
  );
  const prefersReducedMotion = useReducedMotion();
  const countryMotion = prefersReducedMotion
    ? { initial: false, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 8, scale: 0.92 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.92 },
      };
  const cashOutGlowAnimation =
    cashOutGlow.mode === "liq"
      ? `position7-cash-out-liq-pulse ${cashOutGlow.pulseMs}ms ease-in-out infinite`
      : cashOutGlow.mode === "win"
        ? `position7-cash-out-win-blink ${cashOutGlow.pulseMs}ms ease-in-out infinite`
        : undefined;

  const settleActionsCollapse = (collapsed: boolean) => {
    actionsCollapsedRef.current = collapsed;
    setActionsCollapsed(collapsed);
    if (prefersReducedMotion) {
      actionsCollapseProgress.set(collapsed ? 1 : 0);
      return;
    }
    animate(actionsCollapseProgress, collapsed ? 1 : 0, {
      type: "spring",
      stiffness: 420,
      damping: 38,
      mass: 0.75,
    });
  };

  const openActionMenu = () => {
    if (actionsCollapsedRef.current) settleActionsCollapse(false);
    setCardPanel("actions");
  };

  const closeActionMenu = () => {
    setCardPanel("position");
  };

  const panelMotion = prefersReducedMotion
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
        transition: { duration: 0 } as const,
      }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  const onActionsHandlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-cash-out]")) return;
    if (target.closest("[data-action-menu]")) return;
    if (cardPanel === "actions") return;
    if (!actionsCollapsedRef.current) {
      if (target.closest("#position7-actions")) return;
      if (target.closest("[data-progress-bar]")) return;
    }

    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingActionsRef.current = true;
    setIsDraggingActions(true);
    actionsDragMoved.current = false;
    actionsDragFromHandle.current = Boolean(target.closest("[data-actions-handle]"));
    actionsDragStartY.current = e.clientY;
    actionsDragStartProgress.current = actionsCollapseProgress.get();
  };

  const onActionsHandlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDraggingActionsRef.current) return;
    const delta = e.clientY - actionsDragStartY.current;
    if (Math.abs(delta) > 4) actionsDragMoved.current = true;
    const next = Math.max(
      0,
      Math.min(1, actionsDragStartProgress.current + delta / ACTIONS_COLLAPSE_DISTANCE),
    );
    actionsCollapseProgress.set(next);
  };

  const onActionsHandlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDraggingActionsRef.current) return;
    e.stopPropagation();
    isDraggingActionsRef.current = false;
    setIsDraggingActions(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    if (!actionsDragMoved.current) {
      if (actionsDragFromHandle.current) {
        settleActionsCollapse(!actionsCollapsedRef.current);
      }
      return;
    }

    settleActionsCollapse(actionsCollapseProgress.get() >= 0.42);
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div
        className="relative overflow-hidden rounded-[2.25rem] bg-black"
        style={{ width: PHONE_WIDTH, height: PHONE_HEIGHT }}
        aria-label="Position — England match preview"
        data-name="Position #7"
      >
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            mediaView === "video" ? "opacity-100" : "opacity-0"
          }`}
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden={mediaView !== "video"}
        />

        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            mediaView === "odds" ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{ background: MEDIA_BG_GRADIENT }}
          aria-hidden={mediaView !== "odds"}
        >
          <motion.div
            className="absolute inset-x-0 overflow-hidden px-1 [&>div:first-child]:!hidden"
            style={{ top: oddsChartTop, bottom: oddsChartBottom }}
          >
            <Liveline
              data={oddsHistory}
              value={englandOdds}
              series={oddsSeries}
              theme="dark"
              grid
              pulse
              scrub={false}
              momentum={false}
              paused={mediaView !== "odds"}
              window={ODDS_WINDOW_SECS}
              formatValue={(v) => `${Math.round(v)}%`}
              formatTime={() => ""}
              lerpSpeed={0.1}
              lineWidth={2.5}
              padding={{ top: 12, right: 72, bottom: 28, left: 8 }}
              className="!h-[calc(100%+28px)] w-full"
            />
          </motion.div>
        </div>

        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            mediaView === "playByPlay"
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          style={{ background: MEDIA_BG_GRADIENT }}
          aria-hidden={mediaView !== "playByPlay"}
        >
          <div className="absolute inset-x-0 top-[22%] bottom-0 overflow-hidden px-5 pt-3">
            <div className="relative h-full overflow-y-auto pb-[200px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div
                className="pointer-events-none absolute bottom-0 top-3 w-px -translate-x-1/2 bg-gradient-to-b from-white/25 via-white/12 to-transparent"
                style={{ left: "calc(0.5rem + 1rem)" }}
                aria-hidden
              />
              <ul className="relative flex flex-col gap-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {playByPlay.map((event, index) => {
                    const isLatest = index === 0;
                    return (
                      <motion.li
                        key={event.id}
                        layout={!prefersReducedMotion}
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, y: -18, scale: 0.97 }
                        }
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          backgroundColor: isLatest
                            ? "rgba(255,255,255,0.07)"
                            : "rgba(255,255,255,0)",
                        }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, y: 8, scale: 0.98 }
                        }
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 420,
                            damping: 36,
                            mass: 0.7,
                          },
                          opacity: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                          y: {
                            type: "spring",
                            stiffness: 480,
                            damping: 32,
                            mass: 0.65,
                          },
                          scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                          backgroundColor: { duration: 0.45, ease: "easeOut" },
                        }}
                        className="relative flex gap-3 rounded-2xl px-2 py-2"
                      >
                        <div className="relative z-[1] flex w-8 shrink-0 items-start justify-center pt-[7px]">
                          <motion.span
                            className={`size-2.5 rounded-full ring-2 ring-[#08090b] ${
                              isLatest ? "bg-[#ff4d5e]" : "bg-white/40"
                            }`}
                            animate={
                              prefersReducedMotion || !isLatest
                                ? undefined
                                : {
                                    scale: [1, 1.35, 1],
                                    boxShadow: [
                                      "0 0 0 rgba(255,77,94,0)",
                                      "0 0 12px rgba(255,77,94,0.9)",
                                      "0 0 6px rgba(255,77,94,0.45)",
                                    ],
                                  }
                            }
                            transition={
                              isLatest
                                ? {
                                    duration: 1.1,
                                    ease: "easeInOut",
                                    times: [0, 0.35, 1],
                                  }
                                : undefined
                            }
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-[13px] font-semibold leading-snug text-white">
                              {event.label}
                            </p>
                            <span className="shrink-0 text-[11px] font-medium tabular-nums text-white/45">
                              {formatMatchClock(event.clockSeconds)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] capitalize text-white/40">
                            {event.kind}
                            {event.team !== "neutral" ? ` · ${event.team}` : ""}
                          </p>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[38%] bg-gradient-to-b from-black/75 via-black/35 to-transparent"
          aria-hidden
        />

        <div
          className="absolute inset-x-0 top-0 z-10 px-5 pt-8"
          aria-label={`Live match England ${homeScore} Argentina ${awayScore}, ${formatMatchClock(matchSeconds)}`}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <div className="flex flex-col items-center gap-2 pt-5">
              <div
                className={`${FLAG_IMG_CLASS} ${
                  goalFlashTeam === "home" ? "scale-110" : "scale-100"
                }`}
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  src={IMG_ENGLAND}
                  draggable={false}
                />
              </div>
              <span className="text-sm font-semibold leading-none text-white">England</span>
            </div>

            <div className="flex min-w-[132px] flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-[#ff4d5e] shadow-[0_0_8px_rgba(255,77,94,0.75)]" />
                <span className="text-xs font-semibold tracking-[0.04em] text-[#ff4d5e]">
                  LIVE
                </span>
                <span className="inline-flex items-baseline text-xs font-medium tabular-nums text-white/90">
                  <NumberFlow
                    value={matchMinutes}
                    trend={1}
                    format={{ useGrouping: false }}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                  <span>:</span>
                  <NumberFlow
                    value={matchClockSeconds}
                    trend={1}
                    format={{ useGrouping: false, minimumIntegerDigits: 2 }}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                </span>
              </div>
              <div
                className={`flex items-baseline gap-2 text-[56px] font-semibold leading-none tracking-tight text-white transition-transform duration-300 ${instrumentSansCondensed.className} ${
                  goalFlashTeam ? "scale-105" : "scale-100"
                }`}
              >
                <span className="tabular-nums text-white">
                  <NumberFlow
                    value={homeScore}
                    trend={1}
                    format={{ useGrouping: false }}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                </span>
                <span className="text-[48px] font-medium text-white/70">-</span>
                <span className="tabular-nums text-white">
                  <NumberFlow
                    value={awayScore}
                    trend={1}
                    format={{ useGrouping: false }}
                    className="tabular-nums text-inherit"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                </span>
              </div>
              <span className="text-xs font-medium text-white/80">Atlanta Stadium</span>
              {goalFlashTeam && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5dd978]">
                  Goal!
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 pt-5">
              <div
                className={`${FLAG_IMG_CLASS} ${
                  goalFlashTeam === "away" ? "scale-110" : "scale-100"
                }`}
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  src={IMG_ARGENTINA}
                  draggable={false}
                />
              </div>
              <span className="text-sm font-semibold leading-none text-white">Argentina</span>
            </div>
          </div>
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 ${
            mediaView === "video"
              ? "opacity-100"
              : mediaView === "playByPlay"
                ? "opacity-0"
                : "opacity-70"
          }`}
          aria-hidden
        />

        {sizeDeltaFlash && sizeDeltaFlash.amount !== 0 && (
          <div
            key={sizeDeltaFlash.sessionId}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center -translate-y-10"
            aria-hidden
          >
            <SizeDeltaFlashLabel
              amount={sizeDeltaFlash.amount}
              exiting={sizeDeltaFlash.exiting}
            />
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2">
          <div
            className="relative mx-auto flex h-10 items-center rounded-full border border-white/10 bg-black/45 p-1 backdrop-blur-xl"
            role="tablist"
            aria-label="Media view"
          >
            {MEDIA_VIEWS.map((view) => {
              const Icon = MEDIA_VIEW_ICONS[view.id];
              const isActive = mediaView === view.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={view.label}
                  onClick={() => setMediaView(view.id)}
                  className={`relative z-10 flex h-full items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors duration-200 ${
                    isActive ? "text-white" : "text-white/45 hover:text-white/75"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={
                        prefersReducedMotion ? undefined : "position7-media-pill"
                      }
                      className="absolute inset-0 rounded-full bg-white/20"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                        mass: 0.7,
                      }}
                      aria-hidden
                    />
                  )}
                  <Icon className="relative z-10 size-5 shrink-0" />
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key={`${view.id}-label`}
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, width: 0 }
                        }
                        animate={{ opacity: 1, width: "auto" }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, width: 0 }
                        }
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-10 overflow-hidden whitespace-nowrap text-[11px] font-semibold tracking-wide"
                      >
                        {view.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>

          <div
            className={`relative flex w-full flex-col overflow-hidden rounded-[24px] border px-4 pb-4 pt-2 backdrop-blur-xl transition-[background,border-color] duration-500 ease-out ${
              isFastForwardFx ? "animate-[position7-shake_360ms_ease-in-out_1]" : ""
            } ${isDraggingActions ? "cursor-grabbing touch-none" : ""}`}
            style={{
              background: isAhead ? CARD_BG_GREEN : CARD_BG_RED,
              borderColor: isAhead ? CARD_BORDER_GREEN : CARD_BORDER_RED,
            }}
            onPointerDown={onActionsHandlePointerDown}
            onPointerMove={onActionsHandlePointerMove}
            onPointerUp={onActionsHandlePointerUp}
            onPointerCancel={onActionsHandlePointerUp}
          >
      <Position7Particles variant={isAhead ? "green" : "red"} />

      <AnimatePresence mode="wait" initial={false}>
      {cardPanel === "position" ? (
      <motion.div
        key="position-panel"
        data-position-panel
        className="relative z-[1] flex w-full flex-col"
        initial={panelMotion.initial}
        animate={panelMotion.animate}
        exit={panelMotion.exit}
        transition={panelMotion.transition}
      >
      <div
        data-actions-handle
        role="button"
        tabIndex={0}
        aria-expanded={!actionsCollapsed}
        aria-controls="position7-actions"
        aria-label={actionsCollapsed ? "Show action buttons" : "Hide action buttons"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            settleActionsCollapse(!actionsCollapsedRef.current);
          }
        }}
        className="relative z-[3] -mx-1 flex cursor-pointer items-center justify-center py-2"
      >
        <span
          aria-hidden
          className="h-1 w-10 rounded-full bg-white/35 transition-colors duration-150 hover:bg-white/50"
        />
      </div>

      <div className="flex flex-col gap-4">
      <div className="flex w-full items-center gap-4">
        <div className={`${FLAG_IMG_CLASS} relative`}>
          {(Object.keys(COUNTRY_META) as CountrySide[]).map((id) => {
            const meta = COUNTRY_META[id];
            const isActive = country === id;
            return (
              <img
                key={id}
                alt={isActive ? meta.flagAlt : ""}
                className={`pointer-events-none absolute inset-0 size-full object-cover transition-[opacity,transform] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  isActive
                    ? "z-[1] scale-100 opacity-100"
                    : "z-0 scale-90 opacity-0"
                }`}
                src={meta.flag}
                draggable={false}
                aria-hidden={!isActive}
              />
            );
          })}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative min-h-[1.25rem] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={country}
                initial={countryMotion.initial}
                animate={countryMotion.animate}
                exit={countryMotion.exit}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="truncate text-lg font-semibold leading-tight text-white [font-feature-settings:'lnum'_1,'tnum'_1]"
              >
                {selectedCountry.label}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold leading-tight text-white">
              3x
            </span>
            <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap text-sm leading-[1.25] text-white">
              <span className="tabular-nums">$</span>
              <NumberFlow
                value={positionSizeUsd}
                trend={0}
                format={{ useGrouping: true }}
                className="tabular-nums text-inherit"
                style={{ ["--number-flow-mask-height" as any]: "0em" }}
              />
              <span aria-hidden>→</span>
              <span className="inline-flex items-baseline text-[#5dd978]">
                <span className="tabular-nums">$</span>
                <NumberFlow
                  value={scaledMaxUsd}
                  trend={0}
                  format={{ useGrouping: true }}
                  className="tabular-nums text-inherit"
                  style={{ ["--number-flow-mask-height" as any]: "0em" }}
                />
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          data-cash-out
          onClick={(e) => {
            e.stopPropagation();
            openActionMenu();
          }}
          className="relative z-[4] isolate flex shrink-0 flex-col items-end justify-center gap-1.5 overflow-hidden rounded-[12px] border-2 border-white/10 bg-white/[0.06] px-3.5 py-2 text-white transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.08] active:scale-[0.97]"
        >
          {cashOutGlow.mode !== "off" && (
            <span
              aria-hidden
              className="position7-cash-out-glow pointer-events-none absolute inset-0 rounded-[12px] motion-reduce:opacity-60"
              style={{
                ["--cash-out-glow-strength" as string]: cashOutGlow.strength,
                animation: cashOutGlowAnimation,
              }}
            />
          )}
          <span className="relative z-[1] text-xs font-semibold leading-none text-white/60">
            Cash out
          </span>
          <span
            className={`relative z-[1] inline-flex items-baseline text-lg font-semibold leading-none tabular-nums ${instrumentSansCondensed.className}`}
          >
            <span>{topPrefix}</span>
            <NumberFlow
              value={topAbs}
              trend={0}
              format={{ useGrouping: true }}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
          </span>
        </button>
      </div>

      <div
        data-progress-bar
        role="button"
        tabIndex={0}
        aria-expanded={isCompact}
        aria-label={
          actionsCollapsed
            ? "Progress"
            : isCompact
              ? "Show full progress bar"
              : "Show compact progress bar"
        }
        onClick={() => {
          if (actionsCollapsed) return;
          setIsCompact((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (actionsCollapsed) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsCompact((prev) => !prev);
          }
        }}
        className={`relative w-full overflow-hidden rounded-lg bg-white/[0.04] will-change-[height] transition-transform duration-150 ease-out ${PROGRESS_BAR_MOTION} ${
          actionsCollapsed
            ? "h-[19px] cursor-default"
            : isCompact
              ? "h-9 cursor-pointer active:scale-[0.99]"
              : "h-[112px] cursor-pointer active:scale-[0.99]"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 ${PROGRESS_FILL_MOTION} ${
            actionsCollapsed || isCompact ? "rounded-lg" : "rounded-r-lg"
          }`}
          style={{
            width: `${fillPercent}%`,
            backgroundColor: isAhead ? FILL_COLOR_GREEN : FILL_COLOR_RED,
          }}
          aria-hidden
        />

        <div
          className={`pointer-events-none absolute bottom-2 right-3 z-[2] flex flex-col items-end gap-0.5 text-right ${PROGRESS_BAR_MOTION} ${
            actionsCollapsed || isCompact ? "opacity-0" : "opacity-100"
          }`}
        >
          <p className="font-mono text-[28px] font-normal leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
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
            className={`text-sm font-normal leading-tight tabular-nums transition-colors duration-300 ${pnlColorClass}`}
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

        {/* Liq. vertical line */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[3] -translate-x-1/2"
          style={{ left: `${LIQ_LINE_PERCENT}%` }}
        >
          <div
            className={`absolute left-0 rounded-[2px] transition-[opacity,box-shadow,width] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none ${PROGRESS_BAR_MOTION} ${
              actionsCollapsed
                ? "top-1/2 h-[12px] w-[3px] -translate-y-1/2"
                : isCompact
                  ? "top-1 bottom-1 w-[3px]"
                  : "top-1/2 h-[85%] w-[3px] -translate-y-1/2"
            } ${
              liqLineProximity > 0.35
                ? "position7-liq-line-pulse"
                : ""
            }`}
            style={{
              backgroundColor: LIQ_LINE_COLOR_HOT,
              opacity: actionsCollapsed ? 0.85 : 1,
              boxShadow:
                liqLineProximity > 0.15
                  ? `0 0 ${8 + liqLineProximity * 18}px rgba(255, 0, 55, ${0.35 + liqLineProximity * 0.65})`
                  : "none",
              ["--liq-pulse-ms" as string]: `${Math.round(320 + (1 - liqLineProximity) * 700)}ms`,
            }}
            aria-hidden
          />
          <span
            className={`absolute bottom-[11px] left-2 whitespace-nowrap text-[8px] font-semibold leading-tight text-[#ff0037] ${PROGRESS_BAR_MOTION} ${
              actionsCollapsed || isCompact
                ? "pointer-events-none opacity-0"
                : "opacity-100"
            }`}
          >
            Liq.
          </span>
        </div>

        {/* Entry vertical line */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[3] -translate-x-1/2"
          style={{ left: `${ENTRY_LINE_PERCENT}%` }}
        >
          <div
            className={`absolute left-0 w-0 border-l-2 border-dashed opacity-90 ${PROGRESS_BAR_MOTION} ${
              actionsCollapsed
                ? "top-1 bottom-1"
                : isCompact
                  ? "top-1.5 bottom-1.5"
                  : "top-1/2 h-[85%] -translate-y-1/2"
            }`}
            style={{ borderColor: ENTRY_DASH_COLOR }}
            aria-hidden
          />
          <span
            className={`absolute bottom-[11px] left-2 whitespace-nowrap text-[8px] font-semibold leading-tight ${PROGRESS_BAR_MOTION} ${
              actionsCollapsed || isCompact
                ? "pointer-events-none opacity-0"
                : "opacity-100"
            }`}
            style={{ color: ENTRY_DASH_COLOR }}
          >
            Entry
          </span>
        </div>

        {/* % label — hidden only when card actions are fully collapsed */}
        <div
          className={`pointer-events-none absolute z-[3] w-max max-w-none -translate-x-full pr-3 whitespace-nowrap motion-reduce:transition-none ${PROGRESS_BAR_MOTION} ${
            actionsCollapsed
              ? "pointer-events-none top-0 opacity-0"
              : isCompact
                ? "top-[6px] opacity-100"
                : "top-2 opacity-100"
          }`}
          style={{
            left: `${fillPercent}%`,
            transition: `left 500ms ${PROGRESS_EASE}, top 280ms ${PROGRESS_EASE}, opacity 280ms ${PROGRESS_EASE}`,
          }}
          aria-hidden={actionsCollapsed}
        >
          <span
            className={`inline-flex items-baseline whitespace-nowrap font-semibold leading-none tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
              isCompact ? "text-xl" : "font-mono text-[28px] font-normal"
            }`}
            style={{ color: pctColor }}
          >
            <NumberFlow
              value={fillPercent}
              trend={0}
              className="tabular-nums text-inherit"
              style={{ ["--number-flow-mask-height" as any]: "0em" }}
            />
            <span className="shrink-0">%</span>
          </span>
        </div>
      </div>
      </div>

      <style>{`
        @keyframes position7-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-1px, 0, 0); }
          40% { transform: translate3d(1px, 0, 0); }
          60% { transform: translate3d(-1px, 0, 0); }
          80% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes position7-cash-out-liq-pulse {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(255, 77, 94, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(14px + var(--cash-out-glow-strength) * 22px) rgba(255, 77, 94, calc(var(--cash-out-glow-strength) * 0.62)),
              inset 0 1px 0 rgba(255, 120, 130, calc(var(--cash-out-glow-strength) * 0.35));
          }
        }

        @keyframes position7-liq-line-pulse {
          0%, 100% {
            filter: brightness(1);
            opacity: 1;
          }
          50% {
            filter: brightness(1.35);
            opacity: 0.85;
          }
        }

        .position7-liq-line-pulse {
          animation: position7-liq-line-pulse var(--liq-pulse-ms, 700ms) ease-in-out infinite;
        }

        @keyframes position7-cash-out-win-blink {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(93, 217, 120, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(16px + var(--cash-out-glow-strength) * 24px) rgba(93, 217, 120, calc(var(--cash-out-glow-strength) * 0.58)),
              inset 0 1px 0 rgba(140, 255, 170, calc(var(--cash-out-glow-strength) * 0.32));
          }
        }

        @keyframes position7-size-delta-enter {
          0% {
            opacity: 0;
            transform: translate3d(0, 18px, 0) scale(0.72);
          }
          55% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1.08);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @keyframes position7-size-delta-exit-up {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -42px, 0) scale(0.92);
          }
        }

        @keyframes position7-size-delta-exit-down {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 42px, 0) scale(0.92);
          }
        }

        .position7-size-delta-enter {
          animation: position7-size-delta-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .position7-size-delta-exit-up {
          animation: position7-size-delta-exit-up 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .position7-size-delta-exit-down {
          animation: position7-size-delta-exit-down 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .position7-cash-out-glow {
            animation: none !important;
          }

          .position7-liq-line-pulse {
            animation: none !important;
          }

          .position7-size-delta-enter,
          .position7-size-delta-exit-up,
          .position7-size-delta-exit-down {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <motion.div
        id="position7-actions"
        style={{
          height: actionsHeight,
          opacity: actionsOpacity,
          marginTop: actionsGap,
        }}
        className="overflow-hidden"
        aria-hidden={actionsCollapsed}
      >
      <div
        className="flex h-[113px] w-full items-stretch gap-2"
        style={{ pointerEvents: actionsCollapsed ? "none" : "auto" }}
      >
          {positionShortcuts.map((shortcut, index) => {
            const isDisabled =
              !isEditingShortcuts &&
              positionSizeUsd + shortcut.delta < MIN_POSITION_SIZE_USD;
            const isDecrease = shortcut.delta < 0;
            const toneClass = isDecrease
              ? "bg-[#ff7d8a] text-[#141414] shadow-[inset_0_-6px_0_0_rgba(0,0,0,0.25)]"
              : "bg-[#5dd978] text-[#141414] shadow-[inset_0_-6px_0_0_rgba(0,0,0,0.25)]";
            const pressClass =
              "p-3 transition-[height,margin,padding,box-shadow] duration-100 ease-out active:mt-1.5 active:h-[calc(100%-6px)] active:px-3 active:pt-3 active:pb-1 active:shadow-none";

            if (isEditingShortcuts) {
              return (
                <input
                  key={shortcut.id}
                  type="text"
                  inputMode="text"
                  value={draftShortcutLabels[index] ?? shortcut.label}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setDraftShortcutLabels((prev) => {
                      const next = [...prev];
                      next[index] = nextValue;
                      return next;
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmEditingShortcuts();
                    }
                  }}
                  aria-label={`Edit shortcut ${index + 1}`}
                  className={`flex h-full min-w-0 flex-1 items-center justify-center rounded-2xl px-2 text-center text-[28px] font-semibold leading-[1.25] tabular-nums outline-none transition-[filter,transform] duration-100 ease-out focus:brightness-110 ${instrumentSansCondensed.className} ${toneClass}`}
                />
              );
            }

            return (
              <button
                key={shortcut.id}
                type="button"
                disabled={isDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  adjustPositionSize(shortcut.delta);
                }}
                aria-label={shortcut.label}
                className={`relative flex h-full min-w-0 flex-1 flex-col items-start justify-between overflow-hidden rounded-2xl disabled:cursor-not-allowed disabled:opacity-40 disabled:active:mt-0 disabled:active:h-full disabled:active:p-3 disabled:active:shadow-[inset_0_-6px_0_0_rgba(0,0,0,0.25)] ${pressClass} ${toneClass}`}
              >
                <span className="relative z-[1] text-[20px] font-semibold leading-[1.25]">
                  {isDecrease ? "−" : "+"}
                </span>
                <span
                  className={`relative z-[1] text-[44px] font-semibold leading-[1.25] tabular-nums ${instrumentSansCondensed.className}`}
                >
                  {formatShortcutAmount(shortcut.delta)}
                </span>
              </button>
            );
          })}
      </div>
      </motion.div>
      </motion.div>
      ) : (
      <motion.div
        key="actions-panel"
        data-action-menu
        className="relative z-[1] flex w-full flex-col gap-4 pt-1"
        initial={panelMotion.initial}
        animate={panelMotion.animate}
        exit={panelMotion.exit}
        transition={panelMotion.transition}
      >
        <div className="flex items-center">
          <button
            type="button"
            data-action-menu
            onClick={(e) => {
              e.stopPropagation();
              closeActionMenu();
            }}
            aria-label="Back"
            className="relative z-[4] flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white/10 text-white transition-[border-color,background-color,transform] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
          >
            <BackIcon className="size-5" />
          </button>
        </div>

        <p className="text-xl font-semibold leading-tight text-white">
          What would you like to do?
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            data-action-menu
            onClick={(e) => {
              e.stopPropagation();
              closeActionMenu();
            }}
            className="relative isolate flex min-w-0 flex-1 flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl bg-white/10 px-4 py-4 text-left text-white shadow-[inset_0_-6px_0_0_rgba(255,255,255,0.1)] transition-[transform,filter] duration-100 ease-out active:translate-y-1.5 active:shadow-none"
          >
            {cashOutGlow.mode !== "off" && (
              <span
                aria-hidden
                className="position7-cash-out-glow pointer-events-none absolute inset-0 rounded-2xl motion-reduce:opacity-60"
                style={{
                  ["--cash-out-glow-strength" as string]: cashOutGlow.strength,
                  animation: cashOutGlowAnimation,
                }}
              />
            )}
            <span className="relative z-[1] text-lg font-semibold leading-none text-white/80">
              Cash out
            </span>
            <span
              className={`relative z-[1] inline-flex items-baseline text-[32px] font-semibold leading-none tabular-nums ${instrumentSansCondensed.className}`}
            >
              <span>{topPrefix}</span>
              <NumberFlow
                value={topAbs}
                trend={0}
                format={{ useGrouping: true }}
                className="tabular-nums text-inherit"
                style={{ ["--number-flow-mask-height" as any]: "0em" }}
              />
            </span>
          </button>

          <button
            type="button"
            data-action-menu
            onClick={(e) => {
              e.stopPropagation();
              setCountry((prev) => (prev === "england" ? "argentina" : "england"));
              closeActionMenu();
            }}
            className="relative flex min-w-0 flex-1 flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl bg-white/10 px-4 py-4 text-left text-white shadow-[inset_0_-6px_0_0_rgba(255,255,255,0.1)] transition-[transform,filter] duration-100 ease-out active:translate-y-1.5 active:shadow-none"
          >
            <span className="text-lg font-semibold leading-none text-white/80">
              Switch sides
            </span>
            <SwitchSidesIcon className="size-8 text-white" />
          </button>
        </div>
      </motion.div>
      )}
      </AnimatePresence>
        </div>
      </div>
    </div>
    </div>
  );
}
