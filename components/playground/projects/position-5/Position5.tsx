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
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { instrumentSansCondensed } from "@/lib/fonts";
import Position5Particles from "./Position5Particles";

/**
 * Position #5 — minimalist progress bar with Entry and Liq. markers.
 * Shares the header + buttons layout with Position; the progress bar uses a
 * solid fill, Entry and Liq. vertical lines, and a trailing % label.
 * Click the progress bar to toggle the compact progress bar (Figma 7445:19968).
 */
const IMG_ENGLAND = "/playground/position-5/england-flag.svg";
const IMG_ARGENTINA = "/playground/position-5/argentina-flag.svg";
const VIDEO_SRC = "/playground/position-5/england.mp4";
const FLAG_IMG_CLASS =
  "relative h-8 w-12 shrink-0 overflow-hidden rounded-[5px] transition-transform duration-300";

type CountrySide = "england" | "argentina";

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

function SwitchSidesIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className ?? "size-4"}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388m15.408 3.352a.75.75 0 0 0-.919.53a7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035a.75.75 0 0 0-.53-.918"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatMatchClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.min(totalSeconds, MATCH_MAX_SECONDS));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const SIM_TICK_MS = 2200;
const FAST_FORWARD_DELTA_THRESHOLD = 12;
const FAST_FORWARD_FX_MS = 550;

/** Progress fill — Figma Progress rectangles (7425:19765 / 7425:19887) */
const FILL_COLOR_GREEN = "#1c662d";
const FILL_COLOR_RED = "#7a0f1c";
const ENTRY_DASH_COLOR = "rgba(255,255,255,0.4)";
const LIQ_BLOCK_COLOR = "#ff4d5e";
const LIQ_BLOCK_STRIPES =
  "repeating-linear-gradient(-45deg, rgba(255,255,255,0.28) 0 3px, transparent 3px 9px)";

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
            ? "position5-size-delta-exit-up"
            : "position5-size-delta-exit-down"
          : "position5-size-delta-enter"
      }`}
    >
      <span>
        {amount > 0 ? "+$" : "-$"}
        {animatedAbs.toLocaleString("en-US")}
      </span>
    </span>
  );
}

export default function Position5() {
  const [fillPercent, setFillPercent] = useState(60);
  const [positionSizeUsd, setPositionSizeUsd] = useState(INITIAL_VALUE_USD);
  const [country, setCountry] = useState<CountrySide>("england");
  const [switchSidesRotation, setSwitchSidesRotation] = useState(0);
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

    video.play().catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMatchSeconds((prev) => (prev >= MATCH_MAX_SECONDS ? prev : prev + 1));
    }, MATCH_TICK_MS);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const scoreGoal = () => {
      setHomeScore((score) => score + 1);
      setGoalFlashTeam("home");
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

    return () => {
      window.clearTimeout(firstGoalTimeoutId);
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
    setFillPercent(randomFillPercent());
    const id = window.setInterval(() => {
      setFillPercent((prev) => {
        const next = randomFillPercent();
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
  const selectedCountry = COUNTRY_META[country];
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
      ? `position5-cash-out-liq-pulse ${cashOutGlow.pulseMs}ms ease-in-out infinite`
      : cashOutGlow.mode === "win"
        ? `position5-cash-out-win-blink ${cashOutGlow.pulseMs}ms ease-in-out infinite`
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

  const onActionsHandlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-switch-sides]")) return;
    if (!actionsCollapsedRef.current) {
      if (target.closest("#position5-actions")) return;
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
        data-name="Position #5"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        />

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
                className={`flex items-baseline gap-2 text-[34px] font-semibold leading-none tracking-tight text-white transition-transform duration-300 ${
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
                <span className="text-[28px] font-medium text-white/70">-</span>
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
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/70 via-black/20 to-transparent"
          aria-hidden
        />

        {sizeDeltaFlash && sizeDeltaFlash.amount !== 0 && (
          <div
            key={sizeDeltaFlash.sessionId}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            aria-hidden
          >
            <SizeDeltaFlashLabel
              amount={sizeDeltaFlash.amount}
              exiting={sizeDeltaFlash.exiting}
            />
          </div>
        )}

        <div className="absolute inset-x-3 bottom-3 z-10">
          <div
            className={`relative flex w-full flex-col overflow-hidden rounded-[24px] border px-4 pb-4 pt-1 backdrop-blur-xl transition-[background,border-color] duration-500 ease-out ${
              isFastForwardFx ? "animate-[position5-shake_360ms_ease-in-out_1]" : ""
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
      <Position5Particles variant={isAhead ? "green" : "red"} />

      <div
        data-actions-handle
        role="button"
        tabIndex={0}
        aria-expanded={!actionsCollapsed}
        aria-controls="position5-actions"
        aria-label={actionsCollapsed ? "Show action buttons" : "Hide action buttons"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            settleActionsCollapse(!actionsCollapsedRef.current);
          }
        }}
        className="relative z-[3] -mx-1 flex cursor-pointer items-center justify-center py-1"
      >
        <span
          aria-hidden
          className="h-1 w-10 rounded-full bg-white/35 transition-colors duration-150 hover:bg-white/50"
        />
      </div>

      <div className="relative z-[1] flex flex-col">
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
          data-switch-sides
          onClick={(e) => {
            e.stopPropagation();
            setCountry((prev) => (prev === "england" ? "argentina" : "england"));
            setSwitchSidesRotation((prev) => prev + 180);
          }}
          aria-pressed={country === "argentina"}
          aria-label="Switch Sides"
          className="relative z-[4] flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-white/10 text-white transition-[border-color,background-color] duration-150 ease-out hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.95]"
        >
          <SwitchSidesIcon
            className="size-[18px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `rotate(${switchSidesRotation}deg)` }}
          />
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

        {/* Liq. zone — solid block for all bar states */}
        <div
          className={`pointer-events-none absolute z-[3] ${PROGRESS_BAR_MOTION} ${
            actionsCollapsed
              ? "left-[5px] top-[5px] bottom-[5px] rounded-[7px] opacity-90"
              : "left-1.5 top-1.5 bottom-1.5 rounded-[6px] opacity-100"
          }`}
          style={{
            width: `calc(${LIQ_LINE_PERCENT}% - ${actionsCollapsed ? 5 : 6}px)`,
            backgroundColor: LIQ_BLOCK_COLOR,
            backgroundImage: LIQ_BLOCK_STRIPES,
          }}
          aria-hidden
        />
        <span
          className={`pointer-events-none absolute bottom-[11px] z-[3] whitespace-nowrap pl-1.5 text-[8px] font-semibold leading-tight text-white/60 ${PROGRESS_BAR_MOTION} ${
            actionsCollapsed || isCompact
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
          style={{ left: `${LIQ_LINE_PERCENT}%` }}
        >
          Liq.
        </span>

        {/* Entry vertical line */}
        <div
          className="pointer-events-none absolute inset-y-0 z-[3] -translate-x-1/2"
          style={{ left: `${ENTRY_LINE_PERCENT}%` }}
        >
          <div
            className={`absolute left-0 w-0 border-l-2 border-dashed ${PROGRESS_BAR_MOTION} ${
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
            className={`absolute bottom-[11px] left-2 whitespace-nowrap text-[8px] font-semibold leading-tight text-white/60 ${PROGRESS_BAR_MOTION} ${
              actionsCollapsed || isCompact
                ? "pointer-events-none opacity-0"
                : "opacity-100"
            }`}
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
        @keyframes position5-shake {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-1px, 0, 0); }
          40% { transform: translate3d(1px, 0, 0); }
          60% { transform: translate3d(-1px, 0, 0); }
          80% { transform: translate3d(1px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes position5-cash-out-liq-pulse {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(255, 77, 94, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(14px + var(--cash-out-glow-strength) * 22px) rgba(255, 77, 94, calc(var(--cash-out-glow-strength) * 0.62)),
              inset 0 1px 0 rgba(255, 120, 130, calc(var(--cash-out-glow-strength) * 0.35));
          }
        }

        @keyframes position5-cash-out-win-blink {
          0%, 100% {
            box-shadow: inset 0 0 0 rgba(93, 217, 120, 0);
          }
          50% {
            box-shadow:
              inset 0 0 calc(16px + var(--cash-out-glow-strength) * 24px) rgba(93, 217, 120, calc(var(--cash-out-glow-strength) * 0.58)),
              inset 0 1px 0 rgba(140, 255, 170, calc(var(--cash-out-glow-strength) * 0.32));
          }
        }

        @keyframes position5-size-delta-enter {
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

        @keyframes position5-size-delta-exit-up {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -42px, 0) scale(0.92);
          }
        }

        @keyframes position5-size-delta-exit-down {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 42px, 0) scale(0.92);
          }
        }

        .position5-size-delta-enter {
          animation: position5-size-delta-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .position5-size-delta-exit-up {
          animation: position5-size-delta-exit-up 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .position5-size-delta-exit-down {
          animation: position5-size-delta-exit-down 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .position5-cash-out-glow {
            animation: none !important;
          }

          .position5-size-delta-enter,
          .position5-size-delta-exit-up,
          .position5-size-delta-exit-down {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <motion.div
        id="position5-actions"
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
        <div className="flex min-w-0 flex-1 gap-2">
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

        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="relative isolate flex h-full min-w-0 flex-1 flex-col items-start justify-between overflow-hidden rounded-2xl bg-white/10 p-3 text-white shadow-[inset_0_-6px_0_0_rgba(255,255,255,0.1)] transition-[height,margin,padding,box-shadow] duration-100 ease-out active:mt-1.5 active:h-[calc(100%-6px)] active:px-3 active:pt-3 active:pb-1 active:shadow-none"
        >
          {cashOutGlow.mode !== "off" && (
            <span
              aria-hidden
              className="position5-cash-out-glow pointer-events-none absolute inset-0 rounded-2xl motion-reduce:opacity-60"
              style={{
                ["--cash-out-glow-strength" as string]: cashOutGlow.strength,
                animation: cashOutGlowAnimation,
              }}
            />
          )}
          <span className="relative z-[1] text-[20px] font-semibold leading-[1.25] text-white/60">
            Cash out
          </span>
          <span
            className={`relative z-[1] inline-flex items-baseline text-[44px] font-semibold leading-[1.25] tabular-nums text-white ${instrumentSansCondensed.className}`}
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
      </motion.div>
      </div>
        </div>
      </div>
    </div>
    </div>
  );
}
