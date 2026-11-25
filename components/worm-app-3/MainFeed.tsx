"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { TextMorph } from "torph/react";
import { allo } from "@/lib/fonts";
import {
  playComboAdd,
  playComboFull,
  playComboRemove,
} from "@/lib/combo-sound";
import {
  hapticNudge,
  hapticStep,
  hapticSuccess,
  hapticTap,
  unlockHaptics,
} from "@/lib/haptics";
import type { PolymarketMarketData } from "@/lib/polymarketscan";
import TradeFlowModal from "@/components/playground/projects/api/TradeFlowModal";
import {
  ComboSheet,
  comboMultiplier,
  type ComboSheetPick,
} from "./ComboSheet";
import MarketScreen, {
  type MarketScreenMarket,
  type MarketScreenOption,
  type MarketScreenPick,
} from "./MarketScreen";
import {
  cashOutValue,
  MIN_POSITION_STAKE,
  NO_COLOR as NO,
  POSITION_ADJUST_STEP,
  PositionFooter,
  YES_COLOR as YES,
  type PlacedPosition,
} from "./PositionFooter";

const BG = "#E8E8E8";

const MIN_BET = 1;
const MAX_BET = 10;
const MAX_DRAG_PX = 168;
const COMBO_OVERDRAG_PX = 72;
const COMBO_ARM_PX = MAX_DRAG_PX + 28;
const BET_STEP = 1;
const COMMIT_AMOUNT = 1;
const SIZE_DELTA_HOLD_MS = 900;
const SIZE_DELTA_EXIT_MS = 480;
const LIVE_PERCENT_HIGH_MIN = 75;
const LIVE_PERCENT_HIGH_MAX = 88;
const LIVE_PERCENT_BAND = 5;
const LIVE_PERCENT_TICK_MS = 3000;
/** ±1–2pp each tick so rounded % / cents visibly move. */
const LIVE_PERCENT_STEP_MIN = 1;
const LIVE_PERCENT_STEP_MAX = 2.2;
const AMOUNT_FONT_MIN = 36;
const AMOUNT_FONT_MAX = 58;
const MAX_COMBO_PICKS = 8;
const MAX_CHIP_LOGOS = 3;
const COMBO_LONG_PRESS_MS = 420;

type SizeDeltaFlash = {
  sessionId: number;
  amount: number;
  bumpId: number;
  exiting: boolean;
};

type Topic = "sports" | "crypto" | "culture" | "tech" | "politics";

type Market = {
  id: string;
  category: string;
  topic: Topic;
  question: string;
  thumb: string;
  /** Optional muted looping clip — fills the card instead of the chance gauge. */
  video?: string;
  /** Optional full-bleed still — same immersive chrome as video. */
  backdrop?: string;
  yesPercent: number;
  /** Optional social proof under Yes/No — omit on quieter cards. */
  social?: string;
};

type Outcome = "Yes" | "No";

type TradeFlowState = {
  market: Market;
  outcome: Outcome;
  amount: number;
};

type FeedCategory = {
  id: "trending" | Topic;
  label: string;
  icon: string;
};

const FEED_CATEGORIES: FeedCategory[] = [
  {
    id: "trending",
    label: "Trending",
    icon: "/worm-app-3/categories/arrow.png?v=3",
  },
  {
    id: "culture",
    label: "Culture",
    icon: "/worm-app-3/categories/alien.png?v=3",
  },
  {
    id: "sports",
    label: "Sports",
    icon: "/worm-app-3/categories/soccer.png?v=3",
  },
  {
    id: "crypto",
    label: "Crypto",
    icon: "/worm-app-3/categories/cash.png?v=3",
  },
  {
    id: "tech",
    label: "Tech",
    icon: "/worm-app-3/categories/crystal-a.png?v=3",
  },
  {
    id: "politics",
    label: "Politics",
    icon: "/worm-app-3/categories/flag-r.png?v=3",
  },
];

const MARKETS: Market[] = [
  {
    id: "nvidia-ceo",
    category: "Tech",
    topic: "tech",
    question: "Jensen Huang out as NVIDIA CEO by December 31, 2026?",
    thumb: "/worm-app-3/bg/jensen-huang.jpg",
    video: "/worm-app-3/bg/alexes-nakamoto.mp4",
    yesPercent: 18,
    social: "Nass and 22 others predicted",
  },
  {
    id: "gta-vi-nov19",
    category: "GTA VI",
    topic: "culture",
    question: "Will Grand Theft Auto VI release on PC by December 31, 2026?",
    thumb: "/worm-app-3/logos/gta-vi.png",
    backdrop: "/worm-app-3/logos/gta-vi-backdrop.jpg",
    yesPercent: 72,
  },
  {
    id: "nba-hawks",
    category: "NBA",
    topic: "sports",
    question: "Will the Hawks beat the Pistons tomorrow?",
    thumb: "/worm-app-3/bg/hawks-pistons.jpg",
    yesPercent: 45,
    social: "Jordan and 31 others predicted",
  },
  {
    id: "btc-100k",
    category: "Crypto",
    topic: "crypto",
    question: "Will Bitcoin close above $100,000 this month?",
    thumb: "/worm-app-3/logos/bitcoin.png",
    yesPercent: 62,
    social: "Sam and 48 others predicted",
  },
  {
    id: "lakers-celtics",
    category: "NBA",
    topic: "sports",
    question: "Will the Lakers cover −3.5 vs the Celtics?",
    thumb: "/worm-app-3/bg/lakers-celtics.jpg",
    yesPercent: 41,
    social: "Maya and 76 others predicted",
  },
  {
    id: "barca-madrid",
    category: "La Liga",
    topic: "sports",
    question: "Will Barcelona beat Real Madrid this weekend?",
    thumb: "/worm-app-3/bg/barca-madrid.jpg",
    yesPercent: 54,
  },
  {
    id: "alcaraz-sinner",
    category: "ATP",
    topic: "sports",
    question: "Will Alcaraz beat Sinner in their next meeting?",
    thumb: "/worm-app-3/bg/alcaraz-sinner.jpg",
    yesPercent: 48,
  },
  {
    id: "traitors-quit",
    category: "The Traitors (US)",
    topic: "culture",
    question: "Will a contestant voluntarily quit the game during Season 4?",
    thumb: "/worm-app-3/bg/heroic-imperial.jpg",
    yesPercent: 30,
    social: "Chris and 9 others predicted",
  },
  {
    id: "grammys-album",
    category: "Grammys",
    topic: "culture",
    question: "Will a hip-hop album win Album of the Year at the next Grammys?",
    thumb: "/worm-app-3/bg/assembly-hall.jpg",
    yesPercent: 34,
    social: "Maya and 64 others predicted",
  },
  {
    id: "eth-5k",
    category: "Crypto",
    topic: "crypto",
    question: "Will Ethereum hit $5,000 before March 2027?",
    thumb: "/worm-app-3/logos/bitcoin.png",
    yesPercent: 37,
    social: "Priya and 118 others predicted",
  },
  {
    id: "knicks-spurs",
    category: "NBA",
    topic: "sports",
    question: "Will the Knicks win by 10+ vs the Spurs?",
    thumb: "/worm-app-3/bg/knicks-spurs.jpg",
    yesPercent: 33,
  },
  {
    id: "faze-wildcard",
    category: "CS2",
    topic: "sports",
    question: "Will FaZe beat Wildcard in the next BO3?",
    thumb: "/worm-app-3/bg/faze-wildcard.jpg",
    yesPercent: 61,
    social: "Rex and 87 others predicted",
  },
  {
    id: "openai-ipo",
    category: "Tech",
    topic: "tech",
    question: "Will OpenAI file for an IPO before 2028?",
    thumb: "/worm-app-3/bg/jensen-huang.jpg",
    yesPercent: 44,
    social: "Leen and 156 others predicted",
  },
  {
    id: "box-office-billion",
    category: "Box Office",
    topic: "culture",
    question: "Will any film cross $1B worldwide in 2026?",
    thumb: "/worm-app-3/bg/nba-2.jpg",
    yesPercent: 61,
    social: "Ari and 93 others predicted",
  },
  {
    id: "netflix-top-title",
    category: "Netflix",
    topic: "culture",
    question: "Will a non-English series be Netflix’s #1 title this month?",
    thumb: "/worm-app-3/bg/heroic-imperial.jpg",
    yesPercent: 47,
    social: "Sam and 41 others predicted",
  },
  {
    id: "sevilla-valencia",
    category: "La Liga",
    topic: "sports",
    question: "Will Sevilla vs Valencia end in a draw?",
    thumb: "/worm-app-3/bg/sevilla-valencia.jpg",
    yesPercent: 28,
  },
  {
    id: "djokovic-medvedev",
    category: "ATP",
    topic: "sports",
    question: "Will Djokovic beat Medvedev in straight sets?",
    thumb: "/worm-app-3/bg/djokovic-medvedev.jpg",
    yesPercent: 39,
  },
  {
    id: "liquid-bcgame",
    category: "CS2",
    topic: "sports",
    question: "Will Team Liquid win against BC.Game?",
    thumb: "/worm-app-3/bg/liquid-bcgame.jpg",
    yesPercent: 57,
    social: "Kai and 72 others predicted",
  },
  {
    id: "fed-cut",
    category: "Politics",
    topic: "politics",
    question: "Will the Fed cut rates at the next meeting?",
    thumb: "/worm-app-3/bg/fed-rates.jpg",
    yesPercent: 52,
    social: "Tanya and 134 others predicted",
  },
  {
    id: "midterm-turnout",
    category: "Politics",
    topic: "politics",
    question: "Will midterm turnout top 50% of eligible voters?",
    thumb: "/worm-app-3/bg/ballot.jpg",
    yesPercent: 41,
    social: "Leen and 88 others predicted",
  },
  {
    id: "scotus-ai",
    category: "Politics",
    topic: "politics",
    question: "Will the Supreme Court take up an AI copyright case this term?",
    thumb: "/worm-app-3/bg/lady-justice.jpg",
    yesPercent: 58,
    social: "Nass and 112 others predicted",
  },
  {
    id: "shutdown-week",
    category: "Politics",
    topic: "politics",
    question: "Will a government shutdown last longer than a week?",
    thumb: "/worm-app-3/bg/dc-monument.jpg",
    yesPercent: 37,
    social: "Foad and 76 others predicted",
  },
  {
    id: "getafe-atletico",
    category: "La Liga",
    topic: "sports",
    question: "Will Atlético Madrid keep a clean sheet vs Getafe?",
    thumb: "/worm-app-3/bg/getafe-atletico.jpg",
    yesPercent: 46,
  },
  {
    id: "apple-foldable",
    category: "Tech",
    topic: "tech",
    question: "Will Apple announce a foldable iPhone in 2027?",
    thumb: "/worm-app-3/logos/apple.png",
    yesPercent: 35,
    social: "Foad and 99 others predicted",
  },
  {
    id: "sol-300",
    category: "Crypto",
    topic: "crypto",
    question: "Will Solana reclaim $300 this quarter?",
    thumb: "/worm-app-3/logos/bitcoin.png",
    yesPercent: 29,
  },
  {
    id: "oscars-best-picture",
    category: "Oscars",
    topic: "culture",
    question: "Will a non-English film win Best Picture this year?",
    thumb: "/worm-app-3/bg/assembly-hall.jpg",
    yesPercent: 24,
    social: "Ari and 51 others predicted",
  },
  {
    id: "met-gala-theme",
    category: "Met Gala",
    topic: "culture",
    question: "Will the next Met Gala theme leak more than 30 days early?",
    thumb: "/worm-app-3/bg/assembly-hall.jpg",
    yesPercent: 42,
    social: "Leen and 27 others predicted",
  },
  {
    id: "spotify-global-1",
    category: "Music",
    topic: "culture",
    question: "Will a solo female artist hold Spotify’s Global #1 for 7+ days?",
    thumb: "/worm-app-3/bg/nba-3.jpg",
    yesPercent: 55,
    social: "Priya and 82 others predicted",
  },
  {
    id: "fortnite-collab",
    category: "Fortnite",
    topic: "culture",
    question: "Will Fortnite launch a new music-artist collab before April 2027?",
    thumb: "/worm-app-3/logos/gta-vi-cover.png",
    yesPercent: 68,
    social: "Rex and 119 others predicted",
  },
  {
    id: "coachella-headliner",
    category: "Coachella",
    topic: "culture",
    question: "Will Coachella announce all three weekend headliners before New Year’s?",
    thumb: "/worm-app-3/bg/soccer-2.jpg",
    yesPercent: 39,
    social: "Chris and 36 others predicted",
  },
  {
    id: "stranger-things-finale",
    category: "TV",
    topic: "culture",
    question: "Will Stranger Things’ final season top 50M views in its first week?",
    thumb: "/worm-app-3/bg/soccer-3.jpg",
    yesPercent: 71,
    social: "Jordan and 204 others predicted",
  },
  {
    id: "gta-trailer-3",
    category: "GTA VI",
    topic: "culture",
    question: "Will Rockstar drop another GTA VI trailer before summer 2027?",
    thumb: "/worm-app-3/logos/gta-vi.png",
    backdrop: "/worm-app-3/logos/gta-vi-backdrop.jpg",
    yesPercent: 58,
    social: "Kai and 143 others predicted",
  },
];

function toMarketScreenData(market: Market): {
  market: MarketScreenMarket;
  pick: MarketScreenPick;
} {
  const noPercent = 100 - market.yesPercent;
  return {
    market: {
      id: market.id,
      kind: market.topic === "crypto" ? "crypto" : "topic",
      title: market.category,
    },
    pick: {
      id: market.id,
      title: market.question,
      background: market.backdrop ?? market.thumb,
      video: market.video,
      options: [
        {
          id: `${market.id}-Yes`,
          label: "Yes",
          percent: market.yesPercent,
          color: YES,
        },
        {
          id: `${market.id}-No`,
          label: "No",
          percent: noPercent,
          color: NO,
        },
      ],
    },
  };
}

function toTradeMarket(market: Market): PolymarketMarketData {
  const yes = market.yesPercent / 100;
  const no = 1 - yes;
  return {
    marketId: market.id,
    title: market.question,
    slug: market.id,
    category: market.category,
    yesPrice: yes,
    noPrice: no,
    volumeUsd: 0,
    volume24h: 0,
    liquidityUsd: 0,
    image: market.thumb,
    closesAt: null,
    isResolved: false,
    price24hChange: null,
    eventTitle: market.category,
    groupItemTitle: null,
  };
}

function amountFromOffset(offsetX: number) {
  const abs = Math.abs(offsetX);
  // Hold $0 until the bet panel is fully revealed, then dial $MIN_BET–$MAX_BET.
  const deadzone = MAX_DRAG_PX * 0.78;
  if (abs <= deadzone) return 0;
  const progress = Math.min(1, (abs - deadzone) / (MAX_DRAG_PX - deadzone));
  const raw = MIN_BET + progress * (MAX_BET - MIN_BET);
  return Math.round(raw / BET_STEP) * BET_STEP;
}

function isComboZone(offsetX: number) {
  return Math.abs(offsetX) >= COMBO_ARM_PX;
}

function outcomeFromOffset(offsetX: number): Outcome | null {
  if (offsetX > 8) return "Yes";
  if (offsetX < -8) return "No";
  return null;
}

function toComboPick(market: Market, outcome: Outcome): ComboSheetPick {
  const percent =
    outcome === "Yes" ? market.yesPercent : 100 - market.yesPercent;
  return {
    id: `${market.id}-${outcome}`,
    groupId: market.id,
    label: `${outcome} · ${percent}%`,
    subtitle: market.question,
    logo: market.thumb,
    percent,
  };
}

function ChanceGauge({ percent }: { percent: number }) {
  const width = 220;
  const height = 128;
  const stroke = 16;
  const r = 96;
  const cx = width / 2;
  const cy = height - 4;
  const circumference = Math.PI * r;
  const target = Math.max(0, Math.min(100, percent));
  const targetFilled = (target / 100) * circumference;

  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const playedRef = useRef(false);
  const progress = useMotionValue(0);
  const dashOffset = useTransform(progress, (p) => circumference - p);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          setInView(true);
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    if (playedRef.current) {
      const controls = animate(progress, targetFilled, {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      });
      const valueControls = animate(displayRef.current, target, {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => {
          const next = Math.round(v);
          displayRef.current = next;
          setDisplay(next);
        },
      });
      return () => {
        controls.stop();
        valueControls.stop();
      };
    }
    playedRef.current = true;
    progress.set(0);
    displayRef.current = 0;
    setDisplay(0);
    const controls = animate(progress, targetFilled, {
      duration: 0.95,
      ease: [0.22, 1, 0.36, 1],
    });
    const valueControls = animate(0, target, {
      duration: 0.95,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const next = Math.round(v);
        displayRef.current = next;
        setDisplay(next);
      },
    });
    return () => {
      controls.stop();
      valueControls.stop();
    };
  }, [inView, progress, target, targetFilled]);

  return (
    <div ref={rootRef} className="relative mx-auto w-[220px] pb-6">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible"
        aria-hidden
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#EDEDED"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#111111"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-0.5 flex-col items-center">
        <p className="text-[44px] font-semibold leading-none tabular-nums text-black">
          {display}%
        </p>
        <p className="mt-1 text-[15px] font-medium text-black/35">Chance</p>
      </div>
    </div>
  );
}

function amountFontSize(amount: number) {
  const t = Math.min(1, Math.max(0, amount / MAX_BET));
  return AMOUNT_FONT_MIN + t * (AMOUNT_FONT_MAX - AMOUNT_FONT_MIN);
}

function toWinFromAmount(amount: number, percent: number) {
  if (amount <= 0 || percent <= 0) return 0;
  return amount / (percent / 100);
}

function formatToWin(value: number) {
  const rounded = Math.round(value);
  return `$${rounded.toLocaleString("en-US")}`;
}

function useAnimatedCount(target: number, durationMs = 140) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        displayRef.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return display;
}

function SizeDeltaFlashLabel({
  amount,
  exiting,
  video,
}: {
  amount: number;
  exiting: boolean;
  video: boolean;
}) {
  const animatedAbs = useAnimatedCount(Math.abs(amount));
  const exitClass =
    amount > 0 ? "worm-size-delta-exit-up" : "worm-size-delta-exit-down";

  return (
    <span
      className={`inline-flex items-baseline text-[72px] font-semibold leading-none tracking-tight tabular-nums ${
        video ? "text-white" : "text-black"
      } ${exiting ? exitClass : "worm-size-delta-enter"}`}
    >
      {amount > 0 ? "+$" : "-$"}
      {animatedAbs.toLocaleString("en-US")}
    </span>
  );
}

function livePercentBounds(anchor: number): [number, number] {
  const a = Math.max(1, Math.min(99, anchor));
  // High-probability sides keep the fuller 75–88 bar; others hug true odds.
  if (a >= 70) return [LIVE_PERCENT_HIGH_MIN, LIVE_PERCENT_HIGH_MAX];
  return [
    Math.max(1, Math.round(a - LIVE_PERCENT_BAND)),
    Math.min(99, Math.round(a + LIVE_PERCENT_BAND)),
  ];
}

function clampLivePercent(value: number, anchor: number) {
  const [min, max] = livePercentBounds(anchor);
  return Math.min(max, Math.max(min, value));
}

function BetReveal({
  side,
  amountMV,
  percent,
  comboArmed,
  comboRemove,
  opacity,
  width,
}: {
  side: Outcome;
  amountMV: MotionValue<number>;
  percent: number;
  comboArmed: boolean;
  comboRemove: boolean;
  opacity: ReturnType<typeof useTransform<number, number>>;
  width: ReturnType<typeof useTransform<number, number>>;
}) {
  const [amount, setAmount] = useState(0);
  useMotionValueEvent(amountMV, "change", (value) => {
    setAmount((prev) => (prev === value ? prev : value));
  });

  const fontSize = amountFontSize(amount);
  const dollarSize = fontSize * 0.62;
  const isYes = side === "Yes";
  const toWin = toWinFromAmount(amount, percent);
  const showAmount = amount > 0;

  return (
    <motion.div
      aria-hidden
      className={`absolute inset-y-0 flex items-center justify-center overflow-visible ${
        isYes ? "left-0" : "right-0"
      }`}
      style={{ opacity, width }}
    >
      <div className="relative z-[1] flex min-w-[120px] flex-col items-center justify-center px-2">
        <AnimatePresence mode="wait" initial={false}>
          {comboArmed ? (
            <motion.div
              key={comboRemove ? "combo-remove" : "combo-add"}
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 480, damping: 28 }}
              className="flex flex-col items-center"
            >
              <span className="flex size-[56px] items-center justify-center rounded-full bg-black text-white">
                <svg
                  viewBox="0 0 24 24"
                  width={28}
                  height={28}
                  fill="none"
                  aria-hidden
                >
                  {comboRemove ? (
                    <path
                      d="M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </span>
              <p className="mt-2.5 text-center text-[13px] font-bold text-black">
                {comboRemove ? "Remove from combo" : "Add to combo"}
              </p>
            </motion.div>
          ) : showAmount ? (
            <motion.div
              key="amount"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center justify-center"
            >
              <p className="text-[13px] font-semibold tracking-[0.02em] text-black/45">
                Predict
              </p>
              <p
                className="mt-1 flex items-baseline justify-center text-black transition-[font-size] duration-100 ease-out"
                style={{ fontSize }}
              >
                <span
                  className="font-semibold leading-none"
                  style={{ fontSize: dollarSize }}
                >
                  $
                </span>
                <span className="font-semibold leading-none tabular-nums">
                  {amount}
                </span>
              </p>
              <p className="mt-1 whitespace-nowrap text-[13px] font-bold text-black">
                To win{" "}
                <span className="tabular-nums text-[#1DB954]">
                  {formatToWin(toWin)}
                </span>
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MarketMediaScrim() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[42%] bg-gradient-to-b from-black/55 via-black/20 to-transparent"
      />
      <div
        aria-hidden
        className="api-progressive-blur z-[1] h-[48%] overflow-hidden rounded-b-[28px]"
        data-edge="bottom"
      >
        <i />
        <i />
        <i />
        <i />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[48%] rounded-b-[28px] bg-gradient-to-t from-black/55 via-black/20 to-transparent"
      />
    </>
  );
}

function MarketImageBg({ src }: { src: string }) {
  const [ready, setReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setReady(false);
    const img = imgRef.current;
    // Cached images often skip `onLoad` after hydration — paint if already complete.
    if (img?.complete && img.naturalWidth > 0) {
      setReady(true);
      return;
    }
    // Never leave the card black if load events are swallowed.
    const fallback = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(fallback);
  }, [src]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] bg-black [clip-path:inset(0_round_28px)]"
    >
      {/* Local public assets — skip next/image optimizer (query/cache edge cases). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        decoding="async"
        fetchPriority="high"
        draggable={false}
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
      />
      <div
        className={`transition-opacity duration-500 ease-out ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <MarketMediaScrim />
      </div>
    </div>
  );
}

function VolumeIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
        <path
          d="M4 9h3.2L12 5v14l-4.8-4H4V9Z"
          fill="currentColor"
        />
        <path
          d="M16 9.5l4.5 4.5M20.5 9.5 16 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden>
      <path
        d="M4 9h3.2L12 5v14l-4.8-4H4V9Z"
        fill="currentColor"
      />
      <path
        d="M15 8.5a4.2 4.2 0 0 1 0 7M17.4 6.2a7.2 7.2 0 0 1 0 11.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MarketVideoBg({
  src,
  poster,
}: {
  src: string;
  poster: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    setReady(false);
    setMuted(true);
  }, [src]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35)),
      { threshold: [0, 0.35, 0.6] },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) setMuted(true);
  }, [inView]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.defaultMuted = muted;
    video.playsInline = true;
    video.loop = true;

    if (video.readyState >= 2) setReady(true);

    const restart = () => {
      try {
        video.currentTime = 0;
      } catch {
        /* ignore */
      }
      if (inView) void video.play().catch(() => {});
    };

    const onTimeUpdate = () => {
      if (!inView) return;
      const { duration, currentTime } = video;
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (currentTime >= duration - 0.12) restart();
    };

    video.addEventListener("ended", restart);
    video.addEventListener("timeupdate", onTimeUpdate);

    if (inView) void video.play().catch(() => {});
    else video.pause();

    return () => {
      video.removeEventListener("ended", restart);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [inView, muted]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[28px] bg-black [clip-path:inset(0_round_28px)]"
    >
      <video
        ref={videoRef}
        aria-hidden
        className={`absolute inset-0 size-full object-cover [transform:translateZ(0)] transition-opacity duration-500 ease-out ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onLoadedData={() => setReady(true)}
      />
      <div
        aria-hidden
        className={`transition-opacity duration-500 ease-out ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        <MarketMediaScrim />
      </div>
      <button
        type="button"
        aria-label={muted ? "Unmute video" : "Mute video"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          hapticTap();
          setMuted((prev) => !prev);
        }}
        className="pointer-events-auto absolute right-4 top-1/2 z-[3] grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/[0.06] text-white backdrop-blur-md transition-transform duration-150 ease-out active:scale-[0.94]"
      >
        <VolumeIcon muted={muted} />
      </button>
    </div>
  );
}

function MarketCard({
  market,
  comboOutcomes,
  position,
  balance,
  stickerReady,
  onOpenMarket,
  onCommitTrade,
  onToggleCombo,
  onCashOut,
  onAdjustPosition,
}: {
  market: Market;
  comboOutcomes: Set<Outcome>;
  position: PlacedPosition | null;
  balance: number;
  stickerReady: boolean;
  onOpenMarket: (market: Market) => void;
  onCommitTrade: (market: Market, outcome: Outcome, amount: number) => void;
  onToggleCombo: (market: Market, outcome: Outcome) => void;
  onCashOut: (position: PlacedPosition) => void;
  onAdjustPosition: (marketId: string, delta: number) => number;
}) {
  const noPercent = 100 - market.yesPercent;
  const [dragAmount, setDragAmount] = useState(0);
  const [dragOutcome, setDragOutcome] = useState<Outcome | null>(null);
  const [comboArmed, setComboArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sizeDeltaFlash, setSizeDeltaFlash] = useState<SizeDeltaFlash | null>(
    null,
  );
  const [cashingOut, setCashingOut] = useState(false);
  const cashOutTimerRef = useRef<number | null>(null);
  const yesInCombo = comboOutcomes.has("Yes");
  const noInCombo = comboOutcomes.has("No");
  const hasPosition = Boolean(position);
  const immersive = Boolean(market.video || market.backdrop);
  const positionPercent =
    position?.outcome === "No" ? noPercent : market.yesPercent;
  const [livePositionPercent, setLivePositionPercent] = useState(() =>
    clampLivePercent(positionPercent, positionPercent),
  );
  const x = useMotionValue(0);
  const yesAmountMV = useMotionValue(0);
  const noAmountMV = useMotionValue(0);
  const committedRef = useRef(false);
  const lastAmountRef = useRef(0);
  const lastOutcomeRef = useRef<Outcome | null>(null);
  const lastComboArmedRef = useRef(false);
  const comboLongPressTimerRef = useRef<number | null>(null);
  const comboLongPressFiredRef = useRef(false);
  const [cardPressed, setCardPressed] = useState(false);
  const sizeDeltaSessionRef = useRef(0);
  const sizeDeltaStackedRef = useRef(0);
  const sizeDeltaBumpRef = useRef(0);
  const sizeDeltaHoldTimerRef = useRef<number | null>(null);
  const sizeDeltaExitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLivePositionPercent(clampLivePercent(positionPercent, positionPercent));
  }, [positionPercent, position?.marketId, position?.outcome]);

  useEffect(() => {
    if (!hasPosition) return;
    const id = window.setInterval(() => {
      setLivePositionPercent((prev) => {
        const magnitude =
          LIVE_PERCENT_STEP_MIN +
          Math.random() * (LIVE_PERCENT_STEP_MAX - LIVE_PERCENT_STEP_MIN);
        const direction = Math.random() < 0.5 ? -1 : 1;
        let next = clampLivePercent(
          prev + direction * magnitude,
          positionPercent,
        );
        // Bounce off band edges so we don't stall on the same rounded %.
        if (Math.round(next) === Math.round(prev)) {
          next = clampLivePercent(
            prev - direction * magnitude,
            positionPercent,
          );
        }
        return next;
      });
    }, LIVE_PERCENT_TICK_MS);
    return () => window.clearInterval(id);
  }, [hasPosition, position?.marketId, positionPercent]);

  useEffect(() => {
    return () => {
      if (sizeDeltaHoldTimerRef.current !== null) {
        window.clearTimeout(sizeDeltaHoldTimerRef.current);
      }
      if (sizeDeltaExitTimerRef.current !== null) {
        window.clearTimeout(sizeDeltaExitTimerRef.current);
      }
      if (cashOutTimerRef.current !== null) {
        window.clearTimeout(cashOutTimerRef.current);
      }
      if (comboLongPressTimerRef.current !== null) {
        window.clearTimeout(comboLongPressTimerRef.current);
      }
    };
  }, []);

  const clearComboLongPress = useCallback(() => {
    if (comboLongPressTimerRef.current !== null) {
      window.clearTimeout(comboLongPressTimerRef.current);
      comboLongPressTimerRef.current = null;
    }
  }, []);

  const startComboLongPress = useCallback(
    (outcome: Outcome) => {
      comboLongPressFiredRef.current = false;
      clearComboLongPress();
      comboLongPressTimerRef.current = window.setTimeout(() => {
        comboLongPressTimerRef.current = null;
        comboLongPressFiredRef.current = true;
        hapticSuccess();
        onToggleCombo(market, outcome);
      }, COMBO_LONG_PRESS_MS);
    },
    [clearComboLongPress, market, onToggleCombo],
  );

  const onOutcomeClick = useCallback(
    (outcome: Outcome) => {
      if (comboLongPressFiredRef.current) {
        comboLongPressFiredRef.current = false;
        return;
      }
      hapticTap();
      onCommitTrade(market, outcome, 0);
    },
    [market, onCommitTrade],
  );

  useEffect(() => {
    if (!position) setCashingOut(false);
  }, [position]);

  const startCashOut = useCallback(() => {
    if (!position || cashingOut) return;
    setCashingOut(true);
    if (cashOutTimerRef.current !== null) {
      window.clearTimeout(cashOutTimerRef.current);
    }
    cashOutTimerRef.current = window.setTimeout(() => {
      cashOutTimerRef.current = null;
      onCashOut(position);
      setCashingOut(false);
    }, 420);
  }, [cashingOut, onCashOut, position]);

  const gaugePercent = position
    ? position.outcome === "No"
      ? 100 - livePositionPercent
      : livePositionPercent
    : market.yesPercent;

  const flashSizeDelta = useCallback((applied: number) => {
    if (applied === 0) return;

    const isNewSession =
      sizeDeltaHoldTimerRef.current === null &&
      sizeDeltaExitTimerRef.current === null;
    if (isNewSession) {
      sizeDeltaSessionRef.current += 1;
      sizeDeltaStackedRef.current = applied;
    } else {
      sizeDeltaStackedRef.current += applied;
    }

    sizeDeltaBumpRef.current += 1;
    setSizeDeltaFlash({
      sessionId: sizeDeltaSessionRef.current,
      amount: sizeDeltaStackedRef.current,
      bumpId: sizeDeltaBumpRef.current,
      exiting: false,
    });

    if (sizeDeltaHoldTimerRef.current !== null) {
      window.clearTimeout(sizeDeltaHoldTimerRef.current);
    }
    if (sizeDeltaExitTimerRef.current !== null) {
      window.clearTimeout(sizeDeltaExitTimerRef.current);
      sizeDeltaExitTimerRef.current = null;
    }

    sizeDeltaHoldTimerRef.current = window.setTimeout(() => {
      sizeDeltaHoldTimerRef.current = null;
      setSizeDeltaFlash((prev) => (prev ? { ...prev, exiting: true } : null));
      sizeDeltaExitTimerRef.current = window.setTimeout(() => {
        setSizeDeltaFlash(null);
        sizeDeltaStackedRef.current = 0;
        sizeDeltaExitTimerRef.current = null;
      }, SIZE_DELTA_EXIT_MS);
    }, SIZE_DELTA_HOLD_MS);
  }, []);

  const handleAdjust = useCallback(
    (delta: number) => {
      const applied = onAdjustPosition(market.id, delta);
      flashSizeDelta(applied);
    },
    [flashSizeDelta, market.id, onAdjustPosition],
  );

  const yesOpacity = useTransform(x, [0, 20, 48], [0, 0.7, 1]);
  const noOpacity = useTransform(x, [0, -20, -48], [0, 0.7, 1]);
  const yesWidth = useTransform(x, (v) => Math.max(0, v));
  const noWidth = useTransform(x, (v) => Math.max(0, -v));

  const syncDragFromX = useCallback(() => {
    const latest = x.get();
    const nextAmount = amountFromOffset(latest);
    const nextOutcome = outcomeFromOffset(latest);
    const nextCombo = isComboZone(latest);

    if (nextAmount !== lastAmountRef.current) {
      // Must run in the pointer gesture (onDrag), not a motion subscription —
      // otherwise navigator.vibrate is dropped outside user activation.
      if (nextAmount > 0) hapticStep();
      lastAmountRef.current = nextAmount;
      setDragAmount(nextAmount);
    }
    yesAmountMV.set(nextOutcome === "Yes" ? nextAmount : 0);
    noAmountMV.set(nextOutcome === "No" ? nextAmount : 0);

    if (nextOutcome !== lastOutcomeRef.current) {
      lastOutcomeRef.current = nextOutcome;
      setDragOutcome(nextOutcome);
    }
    if (nextCombo !== lastComboArmedRef.current) {
      if (nextCombo) hapticNudge();
      lastComboArmedRef.current = nextCombo;
      setComboArmed(nextCombo);
    }
  }, [noAmountMV, x, yesAmountMV]);

  const snapBack = useCallback(() => {
    void animate(x, 0, { type: "spring", stiffness: 420, damping: 36 });
    lastAmountRef.current = 0;
    lastOutcomeRef.current = null;
    lastComboArmedRef.current = false;
    yesAmountMV.set(0);
    noAmountMV.set(0);
    setDragAmount(0);
    setDragOutcome(null);
    setComboArmed(false);
  }, [noAmountMV, x, yesAmountMV]);

  return (
    <div className="relative overflow-visible">
      {/* Left→right reveals Yes; right→left reveals No */}
      {!hasPosition ? (
        <>
          <BetReveal
            side="Yes"
            amountMV={yesAmountMV}
            percent={market.yesPercent}
            comboArmed={dragOutcome === "Yes" && comboArmed}
            comboRemove={yesInCombo}
            opacity={yesOpacity}
            width={yesWidth}
          />
          <BetReveal
            side="No"
            amountMV={noAmountMV}
            percent={noPercent}
            comboArmed={dragOutcome === "No" && comboArmed}
            comboRemove={noInCombo}
            opacity={noOpacity}
            width={noWidth}
          />
        </>
      ) : null}

      <motion.article
        drag={hasPosition ? false : "x"}
        dragConstraints={{
          left: -(MAX_DRAG_PX + COMBO_OVERDRAG_PX),
          right: MAX_DRAG_PX + COMBO_OVERDRAG_PX,
        }}
        dragElastic={0.12}
        dragDirectionLock
        dragMomentum={false}
        animate={{ scale: cardPressed || dragging ? 0.97 : 1 }}
        transition={{ type: "spring", stiffness: 480, damping: 36 }}
        style={{ x, touchAction: "pan-y" }}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement | null;
          // Controls keep their own press scale — don't shrink the whole card.
          if (target?.closest("button, a, input, [data-no-card-tap]")) {
            setCardPressed(false);
            return;
          }
          setCardPressed(true);
        }}
        onPointerUp={() => setCardPressed(false)}
        onPointerCancel={() => setCardPressed(false)}
        onPointerLeave={() => {
          if (!dragging) setCardPressed(false);
        }}
        onTap={(event) => {
          if (dragging) return;
          const target = event.target as HTMLElement | null;
          // Yes/No, unmute, cash out, etc. stay independent of card open.
          if (target?.closest("button, a, input, [data-no-card-tap]")) return;
          // Stale long-press flag from combo toggle must not block card open.
          comboLongPressFiredRef.current = false;
          hapticTap();
          onOpenMarket(market);
        }}
        onDragStart={() => {
          if (hasPosition) return;
          unlockHaptics();
          committedRef.current = false;
          setDragging(true);
          setCardPressed(true);
        }}
        onDrag={() => {
          if (hasPosition) return;
          syncDragFromX();
        }}
        onDragEnd={(_, info) => {
          if (hasPosition) return;
          setDragging(false);
          setCardPressed(false);
          const offset = x.get();
          const amount = amountFromOffset(offset);
          const outcome = outcomeFromOffset(offset);
          const combo = isComboZone(offset);
          if (combo && outcome && !committedRef.current) {
            committedRef.current = true;
            hapticSuccess();
            void animate(x, 0, { type: "spring", stiffness: 380, damping: 34 });
            lastAmountRef.current = 0;
            lastOutcomeRef.current = null;
            lastComboArmedRef.current = false;
            yesAmountMV.set(0);
            noAmountMV.set(0);
            setDragAmount(0);
            setDragOutcome(null);
            setComboArmed(false);
            onToggleCombo(market, outcome);
            return;
          }
          const flicked =
            Math.abs(info.offset.x) > 56 ||
            Math.abs(info.velocity.x) > 700 ||
            amount >= COMMIT_AMOUNT;
          if (
            flicked &&
            outcome &&
            amount >= COMMIT_AMOUNT &&
            !committedRef.current
          ) {
            committedRef.current = true;
            hapticSuccess();
            const finalAmount = Math.max(COMMIT_AMOUNT, amount);
            void animate(x, 0, { type: "spring", stiffness: 380, damping: 34 });
            lastAmountRef.current = 0;
            lastOutcomeRef.current = null;
            lastComboArmedRef.current = false;
            yesAmountMV.set(0);
            noAmountMV.set(0);
            setDragAmount(0);
            setDragOutcome(null);
            setComboArmed(false);
            onCommitTrade(market, outcome, finalAmount);
            return;
          }
          snapBack();
        }}
        className={`relative touch-pan-y overflow-hidden rounded-[28px] will-change-transform ${
          immersive
            ? "flex min-h-[504px] flex-col bg-black px-5 pb-6 pt-5 text-white"
            : "bg-white px-5 pb-6 pt-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
        } ${
          hasPosition
            ? "cursor-default"
            : dragging
              ? "cursor-grabbing"
              : "cursor-grab"
        }`}
      >
        {market.video ? (
          <MarketVideoBg src={market.video} poster={market.thumb} />
        ) : market.backdrop ? (
          <MarketImageBg src={market.backdrop} />
        ) : null}

        {sizeDeltaFlash && sizeDeltaFlash.amount !== 0 ? (
          <div
            key={sizeDeltaFlash.sessionId}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center -translate-y-10"
            aria-hidden
          >
            <SizeDeltaFlashLabel
              amount={sizeDeltaFlash.amount}
              exiting={sizeDeltaFlash.exiting}
              video={immersive}
            />
          </div>
        ) : null}

        <div className="relative z-[2] flex min-w-0 items-start gap-3">
          {!immersive ? (
            <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[10px]">
              <Image
                src={market.thumb}
                alt=""
                fill
                className="object-cover"
                sizes="72px"
                draggable={false}
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className={`text-[13px] font-medium ${
                immersive ? "text-white/65" : "text-black/40"
              }`}
            >
              {market.category}
            </p>
            <h2
              className={`mt-0.5 text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] ${
                immersive ? "text-white" : "text-black"
              }`}
            >
              {market.question}
            </h2>
          </div>
        </div>

        {immersive ? (
          <div
            className="pointer-events-none relative z-[2] min-h-[180px] flex-1"
            aria-hidden
          />
        ) : (
          <motion.div
            className="relative z-[2] mb-2 mt-6"
            initial={false}
            animate={{
              opacity: sizeDeltaFlash && sizeDeltaFlash.amount !== 0 ? 0 : 1,
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChanceGauge percent={gaugePercent} />
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {position ? (
            <motion.div
              key={`position-${position.marketId}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <PositionFooter
                position={position}
                currentPercent={livePositionPercent}
                video={immersive}
                canIncrease={balance >= POSITION_ADJUST_STEP}
                cashingOut={cashingOut}
                stickerReady={stickerReady}
                onCashOut={startCashOut}
                onAdjust={handleAdjust}
              />
            </motion.div>
          ) : (
            <motion.div
              key="trade-actions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className={`relative z-[2] grid grid-cols-2 gap-2.5 ${
                  immersive ? "mt-auto" : "mt-8"
                }`}
              >
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    startComboLongPress("Yes");
                  }}
                  onPointerUp={clearComboLongPress}
                  onPointerLeave={clearComboLongPress}
                  onPointerCancel={clearComboLongPress}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={() => onOutcomeClick("Yes")}
                  className={`flex h-[52px] origin-center select-none items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out [-webkit-touch-callout:none] active:scale-[0.94] ${
                    dragOutcome === "No"
                      ? immersive
                        ? "bg-white/[0.06] text-white/45"
                        : "bg-black/[0.05] text-black/35"
                      : yesInCombo || dragOutcome === "Yes"
                        ? "text-white"
                        : immersive
                          ? "bg-white/[0.06] text-white"
                          : "bg-black/[0.06] text-black"
                  }`}
                  style={
                    yesInCombo || dragOutcome === "Yes"
                      ? { backgroundColor: YES }
                      : undefined
                  }
                >
                  Yes {market.yesPercent}%
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    startComboLongPress("No");
                  }}
                  onPointerUp={clearComboLongPress}
                  onPointerLeave={clearComboLongPress}
                  onPointerCancel={clearComboLongPress}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={() => onOutcomeClick("No")}
                  className={`flex h-[52px] origin-center select-none items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out [-webkit-touch-callout:none] active:scale-[0.94] ${
                    dragOutcome === "Yes"
                      ? immersive
                        ? "bg-white/[0.06] text-white/45"
                        : "bg-black/[0.05] text-black/35"
                      : noInCombo || dragOutcome === "No"
                        ? "text-white"
                        : immersive
                          ? "bg-white/[0.06] text-white"
                          : "bg-black/[0.06] text-black"
                  }`}
                  style={
                    noInCombo || dragOutcome === "No"
                      ? { backgroundColor: NO }
                      : undefined
                  }
                >
                  No {noPercent}%
                </button>
              </div>

              {market.social ? (
                <p
                  className={`relative z-[2] mt-4 text-center text-[13px] font-medium ${
                    immersive ? "text-white/60" : "text-black/40"
                  }`}
                >
                  {market.social}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
      <style>{`
        @keyframes worm-size-delta-enter {
          0% { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.72); }
          55% { opacity: 1; transform: translate3d(0, 0, 0) scale(1.08); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes worm-size-delta-exit-up {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(0, -42px, 0) scale(0.92); }
        }
        @keyframes worm-size-delta-exit-down {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          100% { opacity: 0; transform: translate3d(0, 42px, 0) scale(0.92); }
        }
        .worm-size-delta-enter {
          animation: worm-size-delta-enter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .worm-size-delta-exit-up {
          animation: worm-size-delta-exit-up 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .worm-size-delta-exit-down {
          animation: worm-size-delta-exit-down 480ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .worm-size-delta-enter,
          .worm-size-delta-exit-up,
          .worm-size-delta-exit-down {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

function formatCompactBalance(value: number) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  if (safe >= 1000) {
    const compact = safe / 1000;
    const label =
      compact >= 10
        ? compact.toFixed(0)
        : compact.toFixed(1).replace(/\.0$/, "");
    return `$${label}K`;
  }
  return `$${Math.round(safe)}`;
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const showHint = !value;

  return (
    <label className="relative mx-auto flex h-[52px] w-full max-w-[360px] items-center justify-center rounded-full bg-white shadow-[0_2px_14px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]">
      <span
        className={`pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-center gap-2.5 px-5 transition-opacity duration-150 ${
          showHint ? (focused ? "opacity-40" : "opacity-100") : "opacity-0"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          aria-hidden
          className="shrink-0 text-black"
        >
          <circle
            cx="11"
            cy="11"
            r="6.5"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M16.2 16.2 20 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-black">
          Search markets and users
        </span>
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Search markets and users"
        className="relative z-[1] h-full w-full rounded-full bg-transparent px-5 text-center text-[15px] font-semibold tracking-[-0.01em] text-black outline-none placeholder:text-transparent"
        placeholder="Search markets and users"
        autoComplete="off"
        enterKeyHint="search"
      />
    </label>
  );
}

function CategoryTabs({
  active,
  onChange,
}: {
  active: FeedCategory["id"];
  onChange: (id: FeedCategory["id"]) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setFadeLeft(el.scrollLeft > 4);
    setFadeRight(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateFades();
    const onScroll = () => updateFades();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    window.addEventListener("resize", updateFades);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", updateFades);
    };
  }, [updateFades]);

  return (
    <div className="relative -mx-4 min-w-0">
      <div
        ref={scrollerRef}
        className="overflow-x-auto overscroll-x-contain [overscroll-behavior-y:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Categories"
      >
        <div className="flex w-max items-center gap-2.5 px-4 py-0.5">
          {FEED_CATEGORIES.map((category) => {
            const selected = category.id === active;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  hapticTap();
                  onChange(category.id);
                }}
                className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-full pl-1.5 pr-3 transition-[box-shadow,background-color,transform] duration-200 ease-out active:scale-[0.98] ${
                  selected
                    ? "bg-[#E4E4E6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.14),inset_0_-0.5px_0_rgba(255,255,255,0.65)]"
                    : "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.03]"
                }`}
              >
                <Image
                  src={category.icon}
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="size-[22px] object-contain"
                  draggable={false}
                />
                <span className="text-[14px] font-semibold tracking-[-0.01em] text-black">
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-[#E8E8E8] to-transparent transition-opacity duration-200 ${
          fadeLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-[#E8E8E8] to-transparent transition-opacity duration-200 ${
          fadeRight ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

function PicksChip({
  picks,
  onOpen,
  shakeKey = 0,
}: {
  picks: ComboSheetPick[];
  onOpen: () => void;
  shakeKey?: number;
}) {
  const count = picks.length;
  const logos = picks.slice(-MAX_CHIP_LOGOS);
  const label = count === 1 ? "1 pick" : `${count} picks`;
  const multiplier = useMemo(
    () => comboMultiplier(picks.map((pick) => pick.percent ?? 50)),
    [picks],
  );
  const showMultiplier = count >= 2;
  const multiplierLabel = `${multiplier.toFixed(2)}x`;
  const prevCount = useRef(count);
  const prevShakeKey = useRef(shakeKey);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    prevCount.current = count;
  }, [count]);

  useEffect(() => {
    // Ignore mount / remount — only shake when the key bumps while visible.
    if (shakeKey === prevShakeKey.current) return;
    prevShakeKey.current = shakeKey;
    if (!shakeKey) return;
    setShaking(true);
    const id = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(id);
  }, [shakeKey]);

  const bump = count > prevCount.current;

  if (count === 0) return null;

  return (
    <motion.button
      type="button"
      data-combo-chip
      layout
      onClick={() => {
        hapticTap();
        onOpen();
      }}
      whileTap={{ scale: 0.96 }}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={
        shaking
          ? {
              opacity: 1,
              y: 0,
              scale: 1,
              x: [0, -9, 9, -7, 7, -4, 4, 0],
            }
          : bump
            ? { opacity: 1, y: 0, scale: [1, 1.04, 1], x: 0 }
            : { opacity: 1, y: 0, scale: 1, x: 0 }
      }
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.75 },
        opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        y: { type: "spring", stiffness: 420, damping: 34 },
        scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        x: shaking
          ? { duration: 0.4, ease: [0.36, 0.07, 0.19, 0.97] }
          : { duration: 0.2 },
      }}
      className="inline-flex min-h-12 origin-center items-center justify-center gap-3 overflow-hidden rounded-full bg-black px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/10"
    >
      <TextMorph
        as="span"
        numbers
        duration={320}
        ease={{ stiffness: 420, damping: 36, mass: 0.75 }}
        className="text-[15px] font-semibold tabular-nums text-white"
      >
        {label}
      </TextMorph>
      <span className="inline-flex shrink-0 items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {logos.map((pick, index) => (
            <motion.span
              key={pick.id}
              layout
              initial={{ opacity: 0, scale: 0.35, x: 14 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.35, x: -10 }}
              transition={{
                type: "spring",
                stiffness: 520,
                damping: 30,
                mass: 0.65,
              }}
              className={`relative inline-flex size-6 shrink-0 overflow-hidden rounded-[7px] bg-white/10 ring-2 ring-black ${
                index === 0 ? "" : "-ml-2"
              }`}
            >
              {pick.logo ? (
                <Image
                  src={pick.logo}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 object-cover"
                />
              ) : (
                <span className="grid size-6 place-items-center text-[9px] font-bold text-white/55">
                  {(pick.mark ?? pick.label).slice(0, 2).toUpperCase()}
                </span>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
      {showMultiplier ? (
        <TextMorph
          as="span"
          numbers
          decimals={2}
          duration={320}
          ease={{ stiffness: 480, damping: 34, mass: 0.7 }}
          className="shrink-0 text-[15px] font-semibold tabular-nums text-[#1DB954]"
        >
          {multiplierLabel}
        </TextMorph>
      ) : null}
      <span className="inline-flex shrink-0 rotate-180 opacity-55" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/worm-app-3/icons/chevron.svg"
          alt=""
          width={10}
          height={5}
          className="h-1.5 w-2.5"
        />
      </span>
    </motion.button>
  );
}

function BottomNav({
  balance,
  hidden,
  onHomeClick,
}: {
  balance: number;
  hidden: boolean;
  onHomeClick?: () => void;
}) {
  const item =
    "relative flex h-full min-w-0 flex-1 items-center justify-center";
  const balanceLabel = formatCompactBalance(balance);

  return (
    <motion.nav
      aria-label="Main sections"
      aria-hidden={hidden}
      initial={false}
      animate={{
        y: hidden ? 88 : 0,
        opacity: hidden ? 0 : 1,
      }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto flex h-[56px] w-full max-w-[360px] items-center rounded-full bg-white/75 px-1 py-1 shadow-[0_10px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] backdrop-blur-[22px] will-change-transform ${
        hidden ? "pointer-events-none" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Home"
        aria-current="page"
        onClick={() => {
          hapticTap();
          onHomeClick?.();
        }}
        className={`${item} rounded-full bg-black/[0.06] text-black`}
      >
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <button type="button" aria-label="Leaderboard" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" aria-hidden>
          <path
            d="M7 21V10M12 21V3M17 21v-7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`Balance ${balanceLabel}`}
        className={item}
      >
        <span className="text-[20px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-black">
          {balanceLabel}
        </span>
      </button>
      <button type="button" aria-label="Notifications" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M10 20a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <button type="button" aria-label="Profile" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" aria-hidden>
          <path
            d="M18 21v-2a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="7"
            r="4"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </button>
    </motion.nav>
  );
}

/** Owns scroll-hide state so market cards don't re-render on every toggle. */
function BottomChrome({
  feedRef,
  picks,
  balance,
  onOpenCombo,
  shakeKey = 0,
  elevated = false,
}: {
  feedRef: RefObject<HTMLDivElement | null>;
  picks: ComboSheetPick[];
  balance: number;
  onOpenCombo: () => void;
  shakeKey?: number;
  /** Sit above MarketScreen; keep combo chip, hide feed tab bar. */
  elevated?: boolean;
}) {
  const [tabHidden, setTabHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hiddenRef = useRef(false);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;

    const onScroll = () => {
      const y = feed.scrollTop;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      let next = hiddenRef.current;
      if (y < 20) next = false;
      else if (delta > 8) next = true;
      else if (delta < -8) next = false;

      if (next === hiddenRef.current) return;
      hiddenRef.current = next;
      setTabHidden(next);
    };

    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, [feedRef]);

  const hideChrome = elevated ? false : tabHidden;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 ${
        elevated ? "z-[45]" : "z-20"
      }`}
      style={{
        paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <motion.div
        aria-hidden
        className="api-progressive-blur h-[150px]"
        data-edge="bottom"
        initial={false}
        animate={{ opacity: elevated ? 0.85 : hideChrome ? 0 : 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <i />
        <i />
        <i />
        <i />
      </motion.div>
      <div className="pointer-events-auto relative z-[1] flex flex-col items-center gap-3 px-5 pb-1">
        <motion.div
          initial={false}
          animate={{ y: hideChrome ? 72 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence initial={false}>
            {picks.length > 0 ? (
              <PicksChip
                key="picks-chip"
                picks={picks}
                onOpen={onOpenCombo}
                shakeKey={shakeKey}
              />
            ) : null}
          </AnimatePresence>
        </motion.div>
        {elevated ? null : (
          <BottomNav
            balance={balance}
            hidden={tabHidden}
            onHomeClick={() => {
              feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function MainFeed() {
  const [tradeFlow, setTradeFlow] = useState<TradeFlowState | null>(null);
  const [balance, setBalance] = useState(3400);
  const [positions, setPositions] = useState<Record<string, PlacedPosition>>(
    {},
  );
  const [activeCategory, setActiveCategory] =
    useState<FeedCategory["id"]>("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [comboPicks, setComboPicks] = useState<ComboSheetPick[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboShakeKey, setComboShakeKey] = useState(0);
  const [openMarket, setOpenMarket] = useState<Market | null>(null);
  /** Market ids whose outcome sticker is held until the success sheet closes. */
  const [heldStickers, setHeldStickers] = useState<Set<string>>(
    () => new Set(),
  );
  const comboPicksRef = useRef(comboPicks);
  comboPicksRef.current = comboPicks;
  const tradeFlowRef = useRef(tradeFlow);
  tradeFlowRef.current = tradeFlow;
  const feedRef = useRef<HTMLDivElement>(null);
  const [feedMotionKey, setFeedMotionKey] = useState(0);
  const prevCategoryRef = useRef<FeedCategory["id"] | null>(null);

  const tradeMarket = useMemo(
    () => (tradeFlow ? toTradeMarket(tradeFlow.market) : null),
    [tradeFlow],
  );

  const visibleMarkets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return MARKETS.filter((market) => {
      if (activeCategory !== "trending" && market.topic !== activeCategory) {
        return false;
      }
      if (!query) return true;
      return (
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query)
      );
    });
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    if (prevCategoryRef.current === null) {
      prevCategoryRef.current = activeCategory;
      return;
    }
    if (prevCategoryRef.current === activeCategory) return;
    prevCategoryRef.current = activeCategory;
    setFeedMotionKey((key) => key + 1);
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeCategory]);

  const changeCategory = useCallback((id: FeedCategory["id"]) => {
    setActiveCategory(id);
  }, []);

  const openTrade = useCallback(
    (market: Market, outcome: Outcome, amount: number) => {
      setTradeFlow({ market, outcome, amount });
    },
    [],
  );

  const openMarketPage = useCallback((market: Market) => {
    setOpenMarket(market);
  }, []);

  const closeMarketPage = useCallback(() => setOpenMarket(null), []);

  const closeTrade = useCallback(() => {
    const closingId = tradeFlowRef.current?.market.id;
    setTradeFlow(null);
    if (!closingId) return;
    setHeldStickers((prev) => {
      if (!prev.has(closingId)) return prev;
      const next = new Set(prev);
      next.delete(closingId);
      return next;
    });
  }, []);

  const cashOutPosition = useCallback((position: PlacedPosition) => {
    const market = MARKETS.find((item) => item.id === position.marketId);
    const currentPercent = market
      ? position.outcome === "Yes"
        ? market.yesPercent
        : 100 - market.yesPercent
      : position.entryPercent;
    const payout = cashOutValue(position, currentPercent);
    hapticSuccess();
    setBalance((prev) => prev + payout);
    setPositions((prev) => {
      const next = { ...prev };
      delete next[position.marketId];
      return next;
    });
  }, []);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const adjustPosition = useCallback((marketId: string, delta: number) => {
    const existing = positionsRef.current[marketId];
    if (!existing) return 0;

    if (delta > 0) {
      if (balanceRef.current < POSITION_ADJUST_STEP) return 0;
      const applied = POSITION_ADJUST_STEP;
      const market = MARKETS.find((item) => item.id === marketId);
      const currentPercent = market
        ? existing.outcome === "Yes"
          ? market.yesPercent
          : 100 - market.yesPercent
        : existing.entryPercent;
      const nextStake = existing.stake + applied;
      const nextEntry = Math.round(
        (existing.entryPercent * existing.stake + currentPercent * applied) /
          nextStake,
      );
      setBalance((prev) => Math.max(0, prev - applied));
      setPositions((prev) => ({
        ...prev,
        [marketId]: {
          ...existing,
          stake: nextStake,
          entryPercent: nextEntry,
        },
      }));
      return applied;
    }

    const remove = Math.min(
      POSITION_ADJUST_STEP,
      existing.stake - MIN_POSITION_STAKE,
    );
    if (remove <= 0) return 0;
    setBalance((prev) => prev + remove);
    setPositions((prev) => ({
      ...prev,
      [marketId]: {
        ...existing,
        stake: existing.stake - remove,
      },
    }));
    return -remove;
  }, []);

  const comboByMarket = useMemo(() => {
    const map = new Map<string, Set<Outcome>>();
    for (const pick of comboPicks) {
      const outcome = pick.id.endsWith("-No") ? "No" : "Yes";
      const set = map.get(pick.groupId) ?? new Set<Outcome>();
      set.add(outcome);
      map.set(pick.groupId, set);
    }
    return map;
  }, [comboPicks]);

  const scrollToNextMarket = useCallback((fromIndex: number) => {
    const feed = feedRef.current;
    if (!feed) return;
    const wraps = feed.querySelectorAll<HTMLElement>("[data-market-wrap]");
    const next = wraps[fromIndex + 1];
    next?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const toggleCombo = useCallback((market: Market, outcome: Outcome) => {
    const pick = toComboPick(market, outcome);
    const prev = comboPicksRef.current;
    const exists = prev.some((item) => item.id === pick.id);
    if (exists) {
      const updated = prev.filter((item) => item.id !== pick.id);
      comboPicksRef.current = updated;
      setComboPicks(updated);
      playComboRemove(updated.length);
      return false;
    }
    const alreadyInGroup = prev.some((item) => item.groupId === pick.groupId);
    const withoutGroup = prev.filter((item) => item.groupId !== pick.groupId);
    if (withoutGroup.length >= MAX_COMBO_PICKS) {
      playComboFull();
      hapticNudge();
      setComboShakeKey((key) => key + 1);
      return false;
    }
    const updated = [...withoutGroup, pick];
    comboPicksRef.current = updated;
    setComboPicks(updated);
    playComboAdd(updated.length);
    // Only advance when a new market joins the combo (not Yes↔No swap).
    return !alreadyInGroup;
  }, []);

  const openMarketScreen = openMarket
    ? toMarketScreenData(openMarket)
    : null;

  return (
    <div
      className={`relative h-full w-full overflow-x-clip overflow-y-hidden text-black ${allo.className}`}
      style={{ backgroundColor: BG }}
    >
      <div
        ref={feedRef}
        className="h-full overflow-x-clip overflow-y-auto overscroll-y-contain [overscroll-behavior-x:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(168px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex w-full min-w-0 flex-col gap-4 px-4">
          <div className="flex min-w-0 flex-col gap-3.5">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <CategoryTabs
              active={activeCategory}
              onChange={changeCategory}
            />
          </div>
          {visibleMarkets.length > 0 ? (
            visibleMarkets.map((market, index) => (
              <motion.div
                key={`${feedMotionKey}-${market.id}`}
                data-market-wrap
                className="relative min-w-0 overflow-visible"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.05 + index * 0.055,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <MarketCard
                  market={market}
                  comboOutcomes={comboByMarket.get(market.id) ?? new Set()}
                  position={positions[market.id] ?? null}
                  balance={balance}
                  stickerReady={!heldStickers.has(market.id)}
                  onOpenMarket={openMarketPage}
                  onCommitTrade={openTrade}
                  onToggleCombo={(m, outcome) => {
                    const added = toggleCombo(m, outcome);
                    if (added) {
                      window.requestAnimationFrame(() =>
                        scrollToNextMarket(index),
                      );
                    }
                  }}
                  onCashOut={cashOutPosition}
                  onAdjustPosition={adjustPosition}
                />
              </motion.div>
            ))
          ) : (
            <p className="px-2 py-16 text-center text-[15px] font-medium text-black/40">
              {searchQuery.trim()
                ? "No markets match your search"
                : `No markets in ${FEED_CATEGORIES.find((c) => c.id === activeCategory)?.label} yet`}
            </p>
          )}
        </div>
      </div>

      <BottomChrome
        feedRef={feedRef}
        picks={comboPicks}
        balance={balance}
        onOpenCombo={() => setComboOpen(true)}
        shakeKey={comboShakeKey}
        elevated={Boolean(openMarket)}
      />

      <ComboSheet
        open={comboOpen}
        picks={comboPicks}
        onOpenChange={setComboOpen}
        onRemove={(id) => {
          const updated = comboPicksRef.current.filter(
            (pick) => pick.id !== id,
          );
          comboPicksRef.current = updated;
          setComboPicks(updated);
          playComboRemove(updated.length);
        }}
        onClear={(opts) => {
          comboPicksRef.current = [];
          setComboPicks([]);
          if (!opts?.silent) playComboRemove(0);
        }}
      />

      <AnimatePresence>
        {openMarket && openMarketScreen ? (
          <MarketScreen
            key={openMarket.id}
            market={openMarketScreen.market}
            pick={openMarketScreen.pick}
            selectedIds={
              new Set(
                [...(comboByMarket.get(openMarket.id) ?? [])].map(
                  (outcome) => `${openMarket.id}-${outcome}`,
                ),
              )
            }
            atLimit={
              comboPicks.length >= MAX_COMBO_PICKS &&
              !comboByMarket.get(openMarket.id)?.size
            }
            position={positions[openMarket.id] ?? null}
            balance={balance}
            stickerReady={!heldStickers.has(openMarket.id)}
            onBack={closeMarketPage}
            onTrade={(option: MarketScreenOption) => {
              const outcome: Outcome =
                option.label.toLowerCase() === "no" ? "No" : "Yes";
              openTrade(openMarket, outcome, 0);
            }}
            onToggle={(option: MarketScreenOption) => {
              const outcome: Outcome =
                option.label.toLowerCase() === "no" ? "No" : "Yes";
              toggleCombo(openMarket, outcome);
            }}
            onCashOut={cashOutPosition}
            onAdjustPosition={adjustPosition}
          />
        ) : null}
      </AnimatePresence>

      {tradeFlow && tradeMarket ? (
        <div className="absolute inset-0 z-50">
          <TradeFlowModal
            key={`${tradeFlow.market.id}-${tradeFlow.outcome}-${tradeFlow.amount}`}
            market={tradeMarket}
            initialOutcome={tradeFlow.outcome}
            initialAmount={tradeFlow.amount}
            wallet="local"
            handle="you"
            referralCode="worm"
            maxAmount={Math.max(MAX_BET, balance)}
            theme="light"
            onClose={closeTrade}
            onComplete={(trade) => {
              const outcome: Outcome =
                trade.outcome.toLowerCase() === "no" ? "No" : "Yes";
              const entryPercent = Math.round(
                Math.max(1, Math.min(99, trade.price * 100)),
              );
              setBalance((prev) => Math.max(0, prev - trade.amountUsd));
              setHeldStickers((prev) => {
                const next = new Set(prev);
                next.add(tradeFlow.market.id);
                return next;
              });
              setPositions((prev) => {
                const existing = prev[tradeFlow.market.id];
                const sameSide = existing?.outcome === outcome;
                return {
                  ...prev,
                  [tradeFlow.market.id]: {
                    marketId: tradeFlow.market.id,
                    outcome,
                    stake: sameSide
                      ? existing.stake + trade.amountUsd
                      : trade.amountUsd,
                    entryPercent: sameSide
                      ? Math.round(
                          (existing.entryPercent * existing.stake +
                            entryPercent * trade.amountUsd) /
                            (existing.stake + trade.amountUsd),
                        )
                      : entryPercent,
                  },
                };
              });
            }}
            onShare={() => {}}
          />
        </div>
      ) : null}
    </div>
  );
}
