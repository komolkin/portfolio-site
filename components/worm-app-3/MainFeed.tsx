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

const BG = "#E8E8E8";
const YES = "#1DB954";
const NO = "#FF3B5C";

const MAX_BET = 25;
const MAX_DRAG_PX = 168;
const COMBO_OVERDRAG_PX = 72;
const COMBO_ARM_PX = MAX_DRAG_PX + 28;
const BET_STEP = 5;
const COMMIT_AMOUNT = 5;
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
  yesPercent: number;
  social: string;
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
    thumb: "/worm-app-3/bg/jensen-huang.jpg?v=2",
    video: "/worm-app-3/bg/jensen-huang.mp4?v=2",
    yesPercent: 18,
    social: "Nass and 22 others made a prediction",
  },
  {
    id: "gta-vi-nov19",
    category: "GTA VI",
    topic: "culture",
    question: "Will Grand Theft Auto VI release on PC by December 31, 2026?",
    thumb: "/worm-app-3/logos/gta-vi-cover.png?v=2",
    yesPercent: 72,
    social: "Nass and 184 others made a prediction",
  },
  {
    id: "nba-hawks",
    category: "NBA",
    topic: "sports",
    question: "Will the Hawks beat the Pistons tomorrow?",
    thumb: "/worm-app-3/bg/hawks-pistons.jpg",
    yesPercent: 45,
    social: "Jordan and 31 others made a prediction",
  },
  {
    id: "btc-100k",
    category: "Crypto",
    topic: "crypto",
    question: "Will Bitcoin close above $100,000 this month?",
    thumb: "/worm-app-3/logos/bitcoin.png",
    yesPercent: 62,
    social: "Sam and 48 others made a prediction",
  },
  {
    id: "lakers-celtics",
    category: "NBA",
    topic: "sports",
    question: "Will the Lakers cover −3.5 vs the Celtics?",
    thumb: "/worm-app-3/bg/lakers-celtics.jpg",
    yesPercent: 41,
    social: "Maya and 76 others made a prediction",
  },
  {
    id: "barca-madrid",
    category: "La Liga",
    topic: "sports",
    question: "Will Barcelona beat Real Madrid this weekend?",
    thumb: "/worm-app-3/bg/barca-madrid.jpg",
    yesPercent: 54,
    social: "Diego and 203 others made a prediction",
  },
  {
    id: "alcaraz-sinner",
    category: "ATP",
    topic: "sports",
    question: "Will Alcaraz beat Sinner in their next meeting?",
    thumb: "/worm-app-3/bg/alcaraz-sinner.jpg",
    yesPercent: 48,
    social: "Elena and 91 others made a prediction",
  },
  {
    id: "traitors-quit",
    category: "The Traitors (US)",
    topic: "culture",
    question: "Will a contestant voluntarily quit the game during Season 4?",
    thumb: "/worm-app-3/bg/heroic-imperial.jpg",
    yesPercent: 30,
    social: "Chris and 9 others made a prediction",
  },
  {
    id: "eth-5k",
    category: "Crypto",
    topic: "crypto",
    question: "Will Ethereum hit $5,000 before March 2027?",
    thumb: "/worm-app-3/logos/bitcoin.png",
    yesPercent: 37,
    social: "Priya and 118 others made a prediction",
  },
  {
    id: "knicks-spurs",
    category: "NBA",
    topic: "sports",
    question: "Will the Knicks win by 10+ vs the Spurs?",
    thumb: "/worm-app-3/bg/knicks-spurs.jpg",
    yesPercent: 33,
    social: "Noah and 54 others made a prediction",
  },
  {
    id: "faze-wildcard",
    category: "CS2",
    topic: "sports",
    question: "Will FaZe beat Wildcard in the next BO3?",
    thumb: "/worm-app-3/bg/faze-wildcard.jpg",
    yesPercent: 61,
    social: "Rex and 87 others made a prediction",
  },
  {
    id: "openai-ipo",
    category: "Tech",
    topic: "tech",
    question: "Will OpenAI file for an IPO before 2028?",
    thumb: "/worm-app-3/bg/jensen-huang.jpg",
    yesPercent: 44,
    social: "Leen and 156 others made a prediction",
  },
  {
    id: "sevilla-valencia",
    category: "La Liga",
    topic: "sports",
    question: "Will Sevilla vs Valencia end in a draw?",
    thumb: "/worm-app-3/bg/sevilla-valencia.jpg",
    yesPercent: 28,
    social: "Sofia and 41 others made a prediction",
  },
  {
    id: "djokovic-medvedev",
    category: "ATP",
    topic: "sports",
    question: "Will Djokovic beat Medvedev in straight sets?",
    thumb: "/worm-app-3/bg/djokovic-medvedev.jpg",
    yesPercent: 39,
    social: "Tom and 63 others made a prediction",
  },
  {
    id: "liquid-bcgame",
    category: "CS2",
    topic: "sports",
    question: "Will Team Liquid win against BC.Game?",
    thumb: "/worm-app-3/bg/liquid-bcgame.jpg",
    yesPercent: 57,
    social: "Kai and 72 others made a prediction",
  },
  {
    id: "fed-cut",
    category: "Politics",
    topic: "politics",
    question: "Will the Fed cut rates at the next meeting?",
    thumb: "/worm-app-3/bg/fed-rates.jpg",
    yesPercent: 52,
    social: "Tanya and 134 others made a prediction",
  },
  {
    id: "midterm-turnout",
    category: "Politics",
    topic: "politics",
    question: "Will midterm turnout top 50% of eligible voters?",
    thumb: "/worm-app-3/bg/ballot.jpg",
    yesPercent: 41,
    social: "Leen and 88 others made a prediction",
  },
  {
    id: "scotus-ai",
    category: "Politics",
    topic: "politics",
    question: "Will the Supreme Court take up an AI copyright case this term?",
    thumb: "/worm-app-3/bg/lady-justice.jpg",
    yesPercent: 58,
    social: "Nass and 112 others made a prediction",
  },
  {
    id: "shutdown-week",
    category: "Politics",
    topic: "politics",
    question: "Will a government shutdown last longer than a week?",
    thumb: "/worm-app-3/bg/dc-monument.jpg",
    yesPercent: 37,
    social: "Foad and 76 others made a prediction",
  },
  {
    id: "getafe-atletico",
    category: "La Liga",
    topic: "sports",
    question: "Will Atlético Madrid keep a clean sheet vs Getafe?",
    thumb: "/worm-app-3/bg/getafe-atletico.jpg",
    yesPercent: 46,
    social: "Luis and 38 others made a prediction",
  },
  {
    id: "apple-foldable",
    category: "Tech",
    topic: "tech",
    question: "Will Apple announce a foldable iPhone in 2027?",
    thumb: "/worm-app-3/logos/apple.png",
    yesPercent: 35,
    social: "Foad and 99 others made a prediction",
  },
  {
    id: "sol-300",
    category: "Crypto",
    topic: "crypto",
    question: "Will Solana reclaim $300 this quarter?",
    thumb: "/worm-app-3/logos/bitcoin.png",
    yesPercent: 29,
    social: "Jade and 67 others made a prediction",
  },
  {
    id: "oscars-best-picture",
    category: "Awards",
    topic: "culture",
    question: "Will a non-English film win Best Picture this year?",
    thumb: "/worm-app-3/bg/nba-2.jpg",
    yesPercent: 24,
    social: "Ari and 51 others made a prediction",
  },
];

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
  // Hold $0 until the bet panel is fully revealed, then dial amount.
  const deadzone = MAX_DRAG_PX * 0.78;
  if (abs <= deadzone) return 0;
  const progress = Math.min(1, (abs - deadzone) / (MAX_DRAG_PX - deadzone));
  return Math.round((progress * MAX_BET) / BET_STEP) * BET_STEP;
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
    // Play once when first in view; keep the filled state while dragging.
    if (!inView) return;
    if (playedRef.current) {
      progress.set(targetFilled);
      setDisplay(target);
      return;
    }
    playedRef.current = true;
    progress.set(0);
    setDisplay(0);
    const controls = animate(progress, targetFilled, {
      duration: 0.95,
      ease: [0.22, 1, 0.36, 1],
    });
    const valueControls = animate(0, target, {
      duration: 0.95,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
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
                To win {formatToWin(toWin)}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
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
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

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
  }, [inView]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="absolute inset-0 overflow-hidden rounded-[28px] [clip-path:inset(0_round_28px)]"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover [transform:translateZ(0)]"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
      />
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
    </div>
  );
}

function MarketCard({
  market,
  comboOutcomes,
  onCommitTrade,
  onToggleCombo,
}: {
  market: Market;
  comboOutcomes: Set<Outcome>;
  onCommitTrade: (market: Market, outcome: Outcome, amount: number) => void;
  onToggleCombo: (market: Market, outcome: Outcome) => void;
}) {
  const noPercent = 100 - market.yesPercent;
  const [dragAmount, setDragAmount] = useState(0);
  const [dragOutcome, setDragOutcome] = useState<Outcome | null>(null);
  const [comboArmed, setComboArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const yesInCombo = comboOutcomes.has("Yes");
  const noInCombo = comboOutcomes.has("No");
  const x = useMotionValue(0);
  const yesAmountMV = useMotionValue(0);
  const noAmountMV = useMotionValue(0);
  const committedRef = useRef(false);
  const lastAmountRef = useRef(0);
  const lastOutcomeRef = useRef<Outcome | null>(null);
  const lastComboArmedRef = useRef(false);

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

      <motion.article
        drag="x"
        dragConstraints={{
          left: -(MAX_DRAG_PX + COMBO_OVERDRAG_PX),
          right: MAX_DRAG_PX + COMBO_OVERDRAG_PX,
        }}
        dragElastic={0.12}
        dragDirectionLock
        dragMomentum={false}
        whileDrag={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 480, damping: 36 }}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          unlockHaptics();
          committedRef.current = false;
          setDragging(true);
        }}
        onDrag={() => {
          syncDragFromX();
        }}
        onDragEnd={(_, info) => {
          setDragging(false);
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
          market.video
            ? "flex min-h-[504px] flex-col bg-black px-5 pb-6 pt-5 text-white"
            : "bg-white px-5 pb-6 pt-5 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
        } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        {market.video ? (
          <MarketVideoBg src={market.video} poster={market.thumb} />
        ) : null}

        <div className={`relative z-[2] flex items-start gap-3 ${market.video ? "" : ""}`}>
          {!market.video ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-[14px]">
              <Image
                src={market.thumb}
                alt=""
                fill
                className="rounded-[14px] object-cover"
                sizes="64px"
                draggable={false}
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className={`text-[13px] font-medium ${
                market.video ? "text-white/65" : "text-black/40"
              }`}
            >
              {market.category}
            </p>
            <h2
              className={`mt-0.5 text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] ${
                market.video ? "text-white" : "text-black"
              }`}
            >
              {market.question}
            </h2>
          </div>
        </div>

        {market.video ? (
          <div className="relative z-[2] min-h-[180px] flex-1" aria-hidden />
        ) : (
          <div className="mb-2 mt-6">
            <ChanceGauge percent={market.yesPercent} />
          </div>
        )}

        <div
          className={`relative z-[2] grid grid-cols-2 gap-2.5 ${
            market.video ? "mt-auto" : "mt-8"
          }`}
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              hapticTap();
              onCommitTrade(market, "Yes", 0);
            }}
            className={`flex h-[52px] origin-center items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out active:scale-[0.94] ${
              dragOutcome === "No"
                ? market.video
                  ? "bg-white/[0.06] text-white/45"
                  : "bg-black/[0.05] text-black/35"
                : yesInCombo || dragOutcome === "Yes"
                  ? "text-white"
                  : market.video
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
            onClick={() => {
              hapticTap();
              onCommitTrade(market, "No", 0);
            }}
            className={`flex h-[52px] origin-center items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,background-color,color,opacity] duration-150 ease-out active:scale-[0.94] ${
              dragOutcome === "Yes"
                ? market.video
                  ? "bg-white/[0.06] text-white/45"
                  : "bg-black/[0.05] text-black/35"
                : noInCombo || dragOutcome === "No"
                  ? "text-white"
                  : market.video
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

        <p
          className={`relative z-[2] mt-4 text-center text-[13px] font-medium ${
            market.video ? "text-white/60" : "text-black/40"
          }`}
        >
          {dragging && comboArmed && dragOutcome
            ? comboOutcomes.has(dragOutcome)
              ? `Release to remove ${dragOutcome} from combo`
              : `Release to add ${dragOutcome} to combo`
            : dragging && dragOutcome && dragAmount > 0
              ? `Release to predict $${dragAmount} on ${dragOutcome}`
              : market.social}
        </p>
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
}: {
  picks: ComboSheetPick[];
  onOpen: () => void;
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

  useEffect(() => {
    prevCount.current = count;
  }, [count]);

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
        bump
          ? { opacity: 1, y: 0, scale: [1, 1.04, 1] }
          : { opacity: 1, y: 0, scale: 1 }
      }
      exit={{ opacity: 0, y: 10, scale: 0.96 }}
      transition={{
        layout: { type: "spring", stiffness: 420, damping: 36, mass: 0.75 },
        opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
        y: { type: "spring", stiffness: 420, damping: 34 },
        scale: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }}
      className="inline-flex min-h-12 origin-center items-center justify-center gap-3 overflow-hidden rounded-full bg-white/85 px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] backdrop-blur-[22px]"
    >
      <TextMorph
        as="span"
        numbers
        duration={320}
        ease={{ stiffness: 420, damping: 36, mass: 0.75 }}
        className="text-[15px] font-semibold tabular-nums text-black"
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
              className={`relative inline-flex size-6 shrink-0 overflow-hidden rounded-[7px] bg-black/[0.06] ring-2 ring-white ${
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
                <span className="grid size-6 place-items-center text-[9px] font-bold text-black/55">
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
          className="h-1.5 w-2.5 invert"
        />
      </span>
    </motion.button>
  );
}

function BottomNav({
  balance,
  hidden,
}: {
  balance: number;
  hidden: boolean;
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
        className={`${item} rounded-full bg-black text-white`}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <button type="button" aria-label="Leaderboard" className={`${item} text-black/45`}>
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" aria-hidden>
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
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" aria-hidden>
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
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" aria-hidden>
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
}: {
  feedRef: RefObject<HTMLDivElement | null>;
  picks: ComboSheetPick[];
  balance: number;
  onOpenCombo: () => void;
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

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
      style={{
        paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <motion.div
        aria-hidden
        className="api-progressive-blur h-[150px]"
        data-edge="bottom"
        initial={false}
        animate={{ opacity: tabHidden ? 0 : 1 }}
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
          animate={{ y: tabHidden ? 72 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence initial={false}>
            {picks.length > 0 ? (
              <PicksChip key="picks-chip" picks={picks} onOpen={onOpenCombo} />
            ) : null}
          </AnimatePresence>
        </motion.div>
        <BottomNav balance={balance} hidden={tabHidden} />
      </div>
    </div>
  );
}

export default function MainFeed() {
  const [tradeFlow, setTradeFlow] = useState<TradeFlowState | null>(null);
  const [balance, setBalance] = useState(3400);
  const [activeCategory, setActiveCategory] =
    useState<FeedCategory["id"]>("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [comboPicks, setComboPicks] = useState<ComboSheetPick[]>([]);
  const [comboOpen, setComboOpen] = useState(false);
  const comboPicksRef = useRef(comboPicks);
  comboPicksRef.current = comboPicks;
  const feedRef = useRef<HTMLDivElement>(null);
  const entranceDoneRef = useRef(false);
  const animateFeedEntrance = !entranceDoneRef.current;

  useEffect(() => {
    entranceDoneRef.current = true;
  }, []);

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

  const openTrade = useCallback(
    (market: Market, outcome: Outcome, amount: number) => {
      setTradeFlow({ market, outcome, amount });
    },
    [],
  );

  const closeTrade = useCallback(() => setTradeFlow(null), []);

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
      return;
    }
    const withoutGroup = prev.filter((item) => item.groupId !== pick.groupId);
    if (withoutGroup.length >= MAX_COMBO_PICKS) {
      playComboFull();
      return;
    }
    const updated = [...withoutGroup, pick];
    comboPicksRef.current = updated;
    setComboPicks(updated);
    playComboAdd(updated.length);
  }, []);

  return (
    <div
      className={`relative h-full w-full overflow-x-clip overflow-y-hidden text-black ${allo.className}`}
      style={{ backgroundColor: BG }}
    >
      <div
        ref={feedRef}
        className="h-full overflow-x-clip overflow-y-auto overscroll-y-contain [overscroll-behavior-x:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(168px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex w-full min-w-0 flex-col gap-4 px-4">
          <div className="flex min-w-0 flex-col gap-3.5">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <CategoryTabs
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </div>
          {visibleMarkets.length > 0 ? (
            visibleMarkets.map((market, index) => (
              <motion.div
                key={market.id}
                className="relative min-w-0 overflow-visible"
                initial={
                  animateFeedEntrance ? { opacity: 0, y: 22 } : false
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: animateFeedEntrance ? 0.05 + index * 0.055 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <MarketCard
                  market={market}
                  comboOutcomes={comboByMarket.get(market.id) ?? new Set()}
                  onCommitTrade={openTrade}
                  onToggleCombo={toggleCombo}
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
              setBalance((prev) => Math.max(0, prev - trade.amountUsd));
            }}
            onShare={() => {}}
          />
        </div>
      ) : null}
    </div>
  );
}
