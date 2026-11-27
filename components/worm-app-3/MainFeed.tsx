"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import Image from "next/image";
import { createPortal } from "react-dom";
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
import { OutcomeSticker } from "./OutcomeSticker";
import TradeFlowModal from "@/components/playground/projects/api/TradeFlowModal";
import {
  ComboSheet,
  comboMultiplier,
  type ComboSheetPick,
} from "./ComboSheet";
import MarketScreen, {
  MARKET_SHEET_HEIGHT,
  type MarketScreenMarket,
  type MarketScreenOption,
  type MarketScreenPick,
} from "./MarketScreen";
import { MarketCardAtmosphere } from "./MarketCardAtmosphere";
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
  storyDialog?: HTMLDialogElement;
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
  const yesInCombo = comboOutcomes.has("Yes");
  const noInCombo = comboOutcomes.has("No");
  const hasPosition = Boolean(position);
  const immersive = Boolean(market.video || market.backdrop);
  const positionPercent =
    position?.outcome === "No" ? noPercent : market.yesPercent;
  const [livePositionPercent, setLivePositionPercent] = useState(() =>
    clampLivePercent(positionPercent, positionPercent),
  );
  // Controller-style wash once a position is open (media + white cards).
  const atmosphereVariant: "green" | "red" =
    position &&
    cashOutValue(position, livePositionPercent) >= position.stake
      ? "green"
      : "red";
  const chrome = immersive;
  const x = useMotionValue(0);
  const yesAmountMV = useMotionValue(0);
  const noAmountMV = useMotionValue(0);
  const committedRef = useRef(false);
  const lastAmountRef = useRef(0);
  const lastOutcomeRef = useRef<Outcome | null>(null);
  const lastComboArmedRef = useRef(false);
  const [cardPressed, setCardPressed] = useState(false);

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

  const onOutcomeClick = useCallback(
    (outcome: Outcome) => {
      hapticTap();
      onCommitTrade(market, outcome, 0);
    },
    [market, onCommitTrade],
  );

  const gaugePercent = position
    ? position.outcome === "No"
      ? 100 - livePositionPercent
      : livePositionPercent
    : market.yesPercent;

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
        layout="size"
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
        style={{
          x,
          touchAction: "pan-y",
        }}
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
          chrome
            ? "flex min-h-[504px] flex-col bg-black px-5 pb-6 pt-5 text-white"
            : hasPosition
              ? "flex min-h-[420px] flex-col bg-white px-5 pb-6 pt-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
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
        <AnimatePresence>
          {hasPosition ? (
            <motion.div
              key={`atmosphere-${market.id}`}
              className="pointer-events-none absolute inset-0 z-[1]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <MarketCardAtmosphere
                variant={atmosphereVariant}
                tone={immersive ? "media" : "light"}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative z-[2] flex min-w-0 items-start gap-3">
          {!chrome ? (
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
                chrome ? "text-white/65" : "text-black/40"
              }`}
            >
              {market.category}
            </p>
            <h2
              className={`mt-0.5 text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] ${
                chrome ? "text-white" : "text-black"
              }`}
            >
              {market.question}
            </h2>
          </div>
        </div>

        {chrome && !position ? (
          <div
            className="pointer-events-none relative z-[2] min-h-[180px] flex-1"
            aria-hidden
          />
        ) : null}

        <AnimatePresence mode="popLayout" initial={false}>
          {position ? (
            <motion.div
              key={`position-${position.marketId}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6, pointerEvents: "none" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative z-[2] mt-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden"
            >
              <PositionFooter
                position={position}
                currentPercent={livePositionPercent}
                video={chrome}
                canIncrease={balance >= POSITION_ADJUST_STEP}
                cashingOut={false}
                stickerReady={stickerReady}
                onCashOut={() => onCashOut(position)}
                onAdjust={(delta) => onAdjustPosition(market.id, delta)}
                className="mt-0"
              />
            </motion.div>
          ) : (
            <motion.div
              key="trade-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {!chrome ? (
                <div className="relative z-[2] mb-2 mt-6">
                  <ChanceGauge percent={gaugePercent} />
                </div>
              ) : null}
              <div
                className={`relative z-[2] grid grid-cols-2 gap-2.5 ${
                  chrome ? "mt-auto" : "mt-8"
                }`}
              >
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onOutcomeClick("Yes")}
                  className={`flex h-[52px] origin-center select-none items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out active:scale-[0.94] ${
                    dragOutcome === "No"
                      ? chrome
                        ? "bg-white/[0.06] text-white/45"
                        : "bg-black/[0.05] text-black/35"
                      : yesInCombo || dragOutcome === "Yes"
                        ? "text-white"
                        : chrome
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
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onOutcomeClick("No")}
                  className={`flex h-[52px] origin-center select-none items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out active:scale-[0.94] ${
                    dragOutcome === "Yes"
                      ? chrome
                        ? "bg-white/[0.06] text-white/45"
                        : "bg-black/[0.05] text-black/35"
                      : noInCombo || dragOutcome === "No"
                        ? "text-white"
                        : chrome
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
                    chrome ? "text-white/60" : "text-black/40"
                  }`}
                >
                  {market.social}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>
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

const STORY_USERS = [
  { name: "Nass", avatar: "1", predictions: [
    { marketId: "nvidia-ceo", outcome: "Yes" },
    { marketId: "scotus-ai", outcome: "Yes" },
  ] },
  { name: "Tanya", avatar: "6", predictions: [
    { marketId: "fed-cut", outcome: "Yes" },
  ] },
  { name: "Leen", avatar: "leen", predictions: [
    { marketId: "openai-ipo", outcome: "Yes" },
    { marketId: "midterm-turnout", outcome: "No" },
    { marketId: "met-gala-theme", outcome: "Yes" },
  ] },
  { name: "Maya", avatar: "2", predictions: [
    { marketId: "lakers-celtics", outcome: "No" },
    { marketId: "grammys-album", outcome: "Yes" },
  ] },
  { name: "Sam", avatar: "3", predictions: [
    { marketId: "btc-100k", outcome: "Yes" },
    { marketId: "netflix-top-title", outcome: "No" },
  ] },
  { name: "Priya", avatar: "4", predictions: [
    { marketId: "eth-5k", outcome: "Yes" },
    { marketId: "spotify-global-1", outcome: "Yes" },
  ] },
  { name: "Jordan", avatar: "5", predictions: [
    { marketId: "nba-hawks", outcome: "No" },
    { marketId: "stranger-things-finale", outcome: "Yes" },
  ] },
] as const;

const PREDICTION_STORIES = STORY_USERS.flatMap((user) =>
  user.predictions.map((prediction, cardIndex) => ({ user, prediction, cardIndex })),
);
const STORY_DURATION_SECONDS = 8;

const VIEWED_STORIES_KEY = "worm-app-3:viewed-prediction-stories";

function PredictionStories({
  onPredict,
  paused,
  positions,
}: {
  onPredict: (market: Market, outcome: Outcome, amount: number, storyDialog: HTMLDialogElement) => void;
  paused: boolean;
  positions: Readonly<Partial<Record<string, PlacedPosition>>>;
}) {
  const [viewed, setViewed] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const storyContentRef = useRef<HTMLDivElement>(null);
  const active = activeIndex === null ? null : PREDICTION_STORIES[activeIndex];
  const market = active && MARKETS.find((item) => item.id === active.prediction.marketId);
  const position = market ? positions[market.id] : undefined;

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(VIEWED_STORIES_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setViewed(saved.filter((id): id is string => typeof id === "string"));
      }
    } catch {
      // The viewer still works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeIndex !== null && dialog && !dialog.open) dialog.showModal();
  }, [activeIndex]);

  useEffect(() => {
    if (storyContentRef.current) storyContentRef.current.inert = paused;
  }, [paused]);

  function openStory(index: number, automatic = false) {
    const { marketId } = PREDICTION_STORIES[index].prediction;
    if (!automatic) hapticTap();
    setDirection(activeIndex !== null && index < activeIndex ? -1 : 1);
    setActiveIndex(index);
    if (viewed.includes(marketId)) return;

    const next = [...viewed, marketId];
    setViewed(next);
    try {
      localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify(next));
    } catch {
      // Keep the viewed state for the current session.
    }
  }

  return (
    <>
      <div
        role="group"
        aria-label="Prediction Stories"
        className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {STORY_USERS.map((user) => {
          const unread = user.predictions.find((prediction) => !viewed.includes(prediction.marketId));
          const first = unread ?? user.predictions[0];
          const index = PREDICTION_STORIES.findIndex(({ prediction }) => prediction === first);
          const seen = !unread;
          return (
            <button
              key={user.name}
              type="button"
              aria-label={user.name + (seen ? ", viewed story" : ", new story")}
              onClick={() => openStory(index)}
              className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 rounded-xl text-center active:scale-95"
            >
              <span className={`rounded-full border-2 p-0.5 ${seen ? "border-black/25" : "border-black"}`}>
                <Image
                  src={`/worm-app-3/stories/${user.avatar}.webp`}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="size-16 rounded-full object-cover"
                />
              </span>
              <span className="w-full truncate text-xs font-semibold">{user.name}</span>
            </button>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Prediction Stories"
        onClose={() => setActiveIndex(null)}
        onCancel={(event) => {
          if (paused) event.preventDefault();
        }}
        onKeyDown={(event) => {
          if (paused || activeIndex === null) return;
          if (event.key === "ArrowLeft" && activeIndex > 0) openStory(activeIndex - 1);
          if (event.key === "ArrowRight" && activeIndex < PREDICTION_STORIES.length - 1) {
            openStory(activeIndex + 1);
          }
        }}
        className={`fixed inset-0 m-auto h-dvh max-h-none w-full max-w-[430px] overflow-hidden bg-black text-white backdrop:bg-black/75 ${allo.className}`}
      >
        {active && market && activeIndex !== null && (
          <div ref={storyContentRef} className="h-full">
            <div
              role="group"
              aria-label={`Prediction ${active.cardIndex + 1} of ${active.user.predictions.length}`}
              className="pointer-events-none absolute inset-x-5 top-[max(10px,env(safe-area-inset-top))] z-20 flex gap-1"
            >
              {active.user.predictions.map((prediction, index) => (
                <span key={prediction.marketId} aria-hidden className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                  {index === active.cardIndex ? (
                    <span
                      className="block h-full origin-left rounded-full bg-white"
                      style={{
                        animation: `worm-story-progress ${STORY_DURATION_SECONDS}s linear both`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                      onAnimationEnd={() => {
                        if (paused || !dialogRef.current?.open) return;
                        if (activeIndex + 1 < PREDICTION_STORIES.length) {
                          openStory(activeIndex + 1, true);
                        } else {
                          dialogRef.current.close();
                        }
                      }}
                    />
                  ) : index < active.cardIndex ? (
                    <span className="block h-full rounded-full bg-white" />
                  ) : null}
                </span>
              ))}
            </div>
            <div className="relative h-full [perspective:900px]">
              <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                      key={market.id}
                      custom={direction}
                      variants={{
                        enter: (dir: number) => ({ x: `${dir * 85}%`, rotateY: dir * 60, originX: dir > 0 ? 0 : 1 }),
                        center: { x: 0, rotateY: 0 },
                        exit: (dir: number) => ({ x: `${-dir * 85}%`, rotateY: -dir * 60, originX: dir > 0 ? 1 : 0 }),
                      }}
                      initial={reducedMotion ? false : "enter"}
                      animate="center"
                      exit={reducedMotion ? undefined : "exit"}
                      transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.25, 0.65, 0.35, 1] }}
                      className="absolute inset-0 flex flex-col overflow-hidden bg-black px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[calc(max(10px,env(safe-area-inset-top))+12px)] [backface-visibility:hidden]"
                  >
                      <Image
                        key={market.id}
                        src={market.backdrop ?? market.thumb}
                        alt=""
                        fill
                        sizes="430px"
                        className="object-cover opacity-60"
                      />
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-black/95" />
                      <div className="relative flex h-11 items-center gap-3 pr-14">
                        <Image
                          src={`/worm-app-3/stories/${active.user.avatar}.webp`}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="size-9 rounded-full object-cover"
                        />
                        <p className="flex-1 text-[16px] font-semibold">{active.user.name} predicted</p>
                      </div>
                      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-5 text-center">
                        <h2 className="text-balance text-[30px] font-semibold leading-tight">{market.question}</h2>
                        <OutcomeSticker label={active.prediction.outcome} size="xl" />
                      </div>
                      {position ? (
                        <div className="relative flex h-[52px] items-center justify-center gap-3 rounded-[18px] bg-white/[0.06] text-[16px] font-semibold">
                          <span>You predicted</span>
                          <OutcomeSticker label={position.outcome} size="md" />
                        </div>
                      ) : (
                        <div className="relative grid grid-cols-2 gap-2.5">
                          {(["Yes", "No"] as const).map((outcome) => (
                            <button
                              key={outcome}
                              type="button"
                              onClick={() => {
                                const dialog = dialogRef.current;
                                if (dialog) onPredict(market, outcome, 0, dialog);
                              }}
                              className="flex h-[52px] select-none items-center justify-center rounded-[18px] bg-white/[0.06] text-[16px] font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.94]"
                            >
                              {outcome} {outcome === "Yes" ? market.yesPercent : 100 - market.yesPercent}%
                            </button>
                          ))}
                        </div>
                      )}
                  </motion.div>
              </AnimatePresence>
            </div>
            <button
              type="button"
              aria-label="Close story"
              onClick={() => dialogRef.current?.close()}
              className="absolute right-5 top-[calc(max(10px,env(safe-area-inset-top))+12px)] z-10 grid size-11 touch-manipulation place-items-center rounded-full bg-white/[0.06] transition-transform duration-150 ease-out active:scale-[0.94] motion-reduce:transition-none"
            >
              <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
            <button type="button" aria-label="Previous story" disabled={activeIndex === 0} onClick={() => openStory(activeIndex - 1)} className="absolute bottom-24 left-0 top-20 z-10 w-1/4 touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:hidden" />
            <button type="button" aria-label="Next story" disabled={activeIndex === PREDICTION_STORIES.length - 1} onClick={() => openStory(activeIndex + 1)} className="absolute bottom-24 right-0 top-20 z-10 w-1/4 touch-manipulation focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:hidden" />
          </div>
        )}
      </dialog>
      <style>{`
        @keyframes worm-story-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </>
  );
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
  const popScale = useMotionValue(1);

  useEffect(() => {
    if (count > prevCount.current) {
      popScale.set(0.92);
      void animate(popScale, 1, {
        type: "spring",
        stiffness: 620,
        damping: 14,
        mass: 0.45,
      });
    }
    prevCount.current = count;
  }, [count, popScale]);

  useEffect(() => {
    // Ignore mount / remount — only shake when the key bumps while visible.
    if (shakeKey === prevShakeKey.current) return;
    prevShakeKey.current = shakeKey;
    if (!shakeKey) return;
    setShaking(true);
    const id = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(id);
  }, [shakeKey]);

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
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={
        shaking
          ? {
              opacity: 1,
              y: 0,
              scale: 1,
              x: [0, -9, 9, -7, 7, -4, 4, 0],
            }
          : { opacity: 1, y: 0, x: 0 }
      }
      style={shaking ? undefined : { scale: popScale }}
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.75 },
        opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        y: { type: "spring", stiffness: 420, damping: 34 },
        scale: { type: "spring", stiffness: 480, damping: 28, mass: 0.6 },
        x: shaking
          ? { duration: 0.4, ease: [0.36, 0.07, 0.19, 0.97] }
          : { duration: 0.2 },
      }}
      className="relative inline-flex min-h-12 origin-center items-center justify-center gap-3 overflow-hidden rounded-full bg-black px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.28)] ring-1 ring-white/10"
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
  onHomeClick,
}: {
  balance: number;
  onHomeClick?: () => void;
}) {
  const item =
    "relative flex h-full min-w-0 flex-1 items-center justify-center";
  const balanceLabel = formatCompactBalance(balance);

  return (
    <nav
      aria-label="Main sections"
      className="mx-auto flex h-[56px] w-full max-w-[360px] items-center rounded-full bg-white/75 px-1 py-1 shadow-[0_10px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] backdrop-blur-[22px]"
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
          {/* Amicons home (round/solid) — https://amicons.design/icons/home */}
          <path
            fill="currentColor"
            d="M11.019 1.959a2 2 0 0 1 2.09.079l7.11 4.74A4 4 0 0 1 22 10.104V19.5a2.5 2.5 0 0 1-2.5 2.5H17a2.5 2.5 0 0 1-2.5-2.5V17a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v2.5A2.5 2.5 0 0 1 7 22H4.5A2.5 2.5 0 0 1 2 19.5v-9.395a4 4 0 0 1 1.781-3.328l7.11-4.74z"
          />
        </svg>
      </button>
      <button type="button" aria-label="Search" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden>
          {/* Amicons magnifying-glass — https://amicons.design/icons/magnifying-glass */}
          <path
            fill="currentColor"
            d="M11 2a9 9 0 0 1 7.03 14.616l3.677 3.677.068.076a1 1 0 0 1-1.406 1.406l-.076-.068-3.677-3.677A9 9 0 1 1 11 2m0 2a7 7 0 1 0 0 14 7 7 0 0 0 0-14"
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
      <button type="button" aria-label="Bookmarks" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden>
          {/* Amicons bookmark (round/line) — https://amicons.design/icons/bookmark */}
          <path
            fill="currentColor"
            d="M18 2a4 4 0 0 1 4 4v13.046c0 2.588-3.058 3.962-4.993 2.242L12 16.838l-5.007 4.45C5.058 23.008 2 21.634 2 19.046V6a4 4 0 0 1 4-4zM6 4a2 2 0 0 0-2 2v13.046c0 .863 1.02 1.32 1.664.748l5.007-4.451a2 2 0 0 1 2.658 0l5.007 4.45c.645.574 1.664.116 1.664-.747V6a2 2 0 0 0-2-2z"
          />
        </svg>
      </button>
      <button type="button" aria-label="Profile" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={24} height={24} fill="none" aria-hidden>
          {/* Amicons person (round/line) — https://amicons.design/icons/person */}
          <path
            fill="currentColor"
            d="M12 2a6 6 0 0 1 3.932 10.53c1.134.342 2.075.834 2.852 1.428 1.535 1.174 2.34 2.677 2.759 3.974a2.92 2.92 0 0 1-.645 2.93c-.668.723-1.664 1.138-2.71 1.138H5.811c-1.046 0-2.042-.415-2.71-1.139a2.92 2.92 0 0 1-.644-2.93c.418-1.296 1.223-2.799 2.758-3.973.777-.594 1.718-1.086 2.852-1.429A6 6 0 0 1 12 2m0 12c-2.707 0-4.443.684-5.57 1.546-1.132.866-1.742 1.983-2.07 2.999a.92.92 0 0 0 .21.96c.26.281.708.495 1.241.495h12.377c.533 0 .98-.214 1.24-.495.24-.26.333-.58.21-.96-.328-1.016-.937-2.133-2.07-3C16.443 14.685 14.707 14 12 14m0-10a4 4 0 1 0 0 8 4 4 0 0 0 0-8"
          />
        </svg>
      </button>
    </nav>
  );
}

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
        animate={{ opacity: elevated ? 0.85 : 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <i />
        <i />
        <i />
        <i />
      </motion.div>
      <div className="pointer-events-auto relative z-[1] flex flex-col items-center gap-3 px-5 pb-1">
        <div>
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
        </div>
        {elevated ? null : (
          <BottomNav
            balance={balance}
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
    (market: Market, outcome: Outcome, amount: number, storyDialog?: HTMLDialogElement) => {
      setTradeFlow({ market, outcome, amount, storyDialog });
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
    if (!positionsRef.current[position.marketId]) return;
    const remaining = { ...positionsRef.current };
    delete remaining[position.marketId];
    positionsRef.current = remaining;
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

  const tradeSheet = tradeFlow && tradeMarket ? (
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
        sheetHeight={MARKET_SHEET_HEIGHT}
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
  ) : null;

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
            <PredictionStories
              onPredict={openTrade}
              paused={Boolean(tradeFlow?.storyDialog)}
              positions={positions}
            />
          </div>
          {visibleMarkets.length > 0 ? (
            visibleMarkets.map((market, index) => (
              <motion.div
                key={`${feedMotionKey}-${market.id}`}
                data-market-wrap
                layout="position"
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
                  onToggleCombo={toggleCombo}
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

      {tradeFlow?.storyDialog ? createPortal(tradeSheet, tradeFlow.storyDialog) : tradeSheet}
    </div>
  );
}
