"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useAnimationControls,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import Image from "next/image";
import { allo } from "@/lib/fonts";
import {
  splitWords,
  WORD_DURATION,
  WORD_STAGGER,
} from "@/components/StreamingWords";
import {
  PositionFooter,
  POSITION_ADJUST_STEP,
  type PlacedPosition,
} from "./PositionFooter";

export type MarketContextItem = {
  id: string;
  image: string;
  source: string;
  headline: string;
  time: string;
  url?: string;
};

const CONTEXT_IMAGE_POOL = [
  "/worm-app-3/bg/jensen-huang.jpg",
  "/worm-app-3/bg/fed-rates.jpg",
  "/worm-app-3/bg/dc-monument.jpg",
  "/worm-app-3/bg/assembly-hall.jpg",
  "/worm-app-3/bg/lady-justice.jpg",
  "/worm-app-3/bg/ballot.jpg",
  "/worm-app-3/bg/nba-2.jpg",
  "/worm-app-3/bg/hawks-pistons.jpg",
  "/worm-app-3/logos/gta-vi-backdrop.jpg",
];

function buildLocalContextItems(
  pickId: string,
  fallbackImage?: string,
): MarketContextItem[] {
  const seed = hashString(pickId);
  const copy = [
    {
      source: "Worm Wire",
      time: "1h ago",
      headline: "Fresh reporting tied to this market’s latest odds move",
    },
    {
      source: "Market Pulse",
      time: "4h ago",
      headline: "Traders are watching volume spikes into the next resolve window",
    },
    {
      source: "Briefing",
      time: "Yesterday",
      headline: "What changed this week — and what still looks priced in",
    },
    {
      source: "Notes",
      time: "2d ago",
      headline: "Context that helps frame Yes vs No going into settlement",
    },
  ];

  return copy.map((item, index) => {
    const poolIndex = (seed + index * 3) % CONTEXT_IMAGE_POOL.length;
    return {
      id: `${pickId}-ctx-${index}`,
      image:
        index === 0 && fallbackImage
          ? fallbackImage
          : CONTEXT_IMAGE_POOL[poolIndex]!,
      ...item,
    };
  });
}

function NewsThumb({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const localImage = src.startsWith("/worm-app-3/");
  if (localImage) {
    return (
      <Image
        src={src}
        alt=""
        fill
        className={className ?? "object-cover"}
        sizes="120px"
        draggable={false}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`absolute inset-0 size-full object-cover ${className ?? ""}`}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

/** CSS word stream — nested sheet Framer trees skip motion `initial` animations. */
function ContextStream({
  text,
  sheetOpenedAt,
  animate,
  onAnimated,
}: {
  text: string;
  sheetOpenedAt: number;
  /** False when returning from Context — show text immediately. */
  animate: boolean;
  onAnimated?: () => void;
}) {
  // Lock for this mount so parent flipping `animate` mid-stream can't remount us.
  const shouldAnimate = useRef(animate).current;
  const words = useMemo(() => splitWords(text), [text]);
  const [play, setPlay] = useState(!shouldAnimate);
  const onAnimatedRef = useRef(onAnimated);
  onAnimatedRef.current = onAnimated;

  useEffect(() => {
    if (!shouldAnimate) {
      setPlay(true);
      return;
    }
    setPlay(false);
    // Wait out the sheet spring if needed; always at least one frame after skeleton.
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const wait = Math.max(40, Math.max(0, 450 - (now - sheetOpenedAt)));
    const startId = window.setTimeout(() => {
      setPlay(true);
      // Remember for the next mount (e.g. back from Context) — don't remount this one.
      onAnimatedRef.current?.();
    }, wait);
    return () => {
      window.clearTimeout(startId);
    };
  }, [shouldAnimate, sheetOpenedAt, text, words.length]);

  if (!shouldAnimate) {
    return <>{text}</>;
  }

  return (
    <>
      <style>{`
        @keyframes worm-context-word-in {
          from { opacity: 0; transform: translateY(0.3em); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes worm-context-word-in {
            from { opacity: 1; transform: none; }
            to { opacity: 1; transform: none; }
          }
        }
      `}</style>
      {words.map((word, index) => (
        <span key={`${text.slice(0, 24)}-${index}-${word}`}>
          <span
            className="inline-block"
            style={
              play
                ? {
                    animationName: "worm-context-word-in",
                    animationDuration: `${WORD_DURATION}s`,
                    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                    animationDelay: `${index * WORD_STAGGER}s`,
                    animationFillMode: "both",
                  }
                : { opacity: 0 }
            }
          >
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function AiOverview({
  text,
  loading,
  animate = true,
  onAnimated,
  onOpen,
}: {
  text: string | null;
  loading?: boolean;
  animate?: boolean;
  onAnimated?: () => void;
  onOpen?: () => void;
}) {
  // Sheet-open clock — stream waits out the spring only when the fetch is fast.
  const sheetOpenedAtRef = useRef(
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );
  // Bump when leaving skeleton so ContextStream always mounts fresh and plays.
  const [revealId, setRevealId] = useState(0);
  // Keep the streaming instance mounted even after parent marks overviewStreamed.
  const holdingStreamRef = useRef(false);

  useEffect(() => {
    if (loading) {
      holdingStreamRef.current = false;
      return;
    }
    if (!text || !animate) return;
    holdingStreamRef.current = true;
    setRevealId((id) => id + 1);
  }, [animate, loading, text]);

  if (loading) {
    return (
      <div
        className="mt-6 w-full rounded-[24px] bg-black/[0.045] px-4 py-3.5"
        aria-busy
        aria-label="Loading context"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="h-[15px] w-[72px] animate-pulse rounded-full bg-black/[0.08]" />
          <div className="size-[18px] animate-pulse rounded-full bg-black/[0.06]" />
        </div>
        <div className="mt-3 space-y-1.5" aria-hidden>
          <div className="h-3.5 w-full animate-pulse rounded-full bg-black/[0.07]" />
          <div className="h-3.5 w-[96%] animate-pulse rounded-full bg-black/[0.07]" />
          <div className="h-3.5 w-[88%] animate-pulse rounded-full bg-black/[0.06]" />
          <div className="h-3.5 w-[64%] animate-pulse rounded-full bg-black/[0.05]" />
        </div>
      </div>
    );
  }

  if (!text) return null;

  const playStream = holdingStreamRef.current || animate;

  return (
    <button
      type="button"
      aria-label="Context"
      disabled={!onOpen}
      onClick={onOpen}
      className="mt-6 w-full rounded-[24px] bg-black/[0.045] px-4 py-3.5 text-left transition-[transform,background-color] duration-150 ease-out active:scale-[0.985] disabled:active:scale-100"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-black">Context</p>
        <svg
          viewBox="0 0 20 20"
          width={18}
          height={18}
          className="size-[18px] shrink-0 text-black/35"
          fill="none"
          aria-hidden
        >
          <path
            d="M7.5 4.5 13 10l-5.5 5.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-2 max-h-[5.25rem] overflow-hidden text-[15px] leading-snug text-black/65">
        {playStream ? (
          revealId > 0 ? (
            <ContextStream
              key={`${text}-${revealId}`}
              text={text}
              sheetOpenedAt={sheetOpenedAtRef.current}
              animate
              onAnimated={onAnimated}
            />
          ) : null
        ) : (
          text
        )}
      </p>
    </button>
  );
}

function ContextRail({
  items,
  loading,
}: {
  items: MarketContextItem[];
  loading?: boolean;
}) {
  if (!loading && items.length === 0) return null;

  return (
    <section className="mt-6" aria-label="Context">
      <p className="px-0 text-[15px] font-semibold text-black">Context</p>
      <div
        data-no-sheet-drag
        className="-mx-4 mt-3 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max snap-x snap-mandatory gap-3 px-4">
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <div
                  key={`ctx-skel-${index}`}
                  className="w-[204px] shrink-0 snap-start"
                  aria-hidden
                >
                  <div className="aspect-[4/3] animate-pulse rounded-[16px] bg-black/[0.06]" />
                  <div className="mt-2.5 h-4 w-[92%] animate-pulse rounded bg-black/[0.06]" />
                  <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-black/[0.05]" />
                </div>
              ))
            : items.map((item) => {
                const body = (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-black/[0.06]">
                      <NewsThumb src={item.image} />
                    </div>
                    <p className="mt-2.5 line-clamp-3 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-black">
                      {item.headline}
                    </p>
                    <p className="mt-1.5 text-[12px] font-medium text-black/40">
                      {item.source}
                      <span className="mx-1 text-black/25">·</span>
                      {item.time}
                    </p>
                  </>
                );

                if (item.url) {
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-[204px] shrink-0 snap-start text-left transition-opacity duration-150 active:opacity-70"
                    >
                      {body}
                    </a>
                  );
                }

                return (
                  <article
                    key={item.id}
                    className="w-[204px] shrink-0 snap-start"
                  >
                    {body}
                  </article>
                );
              })}
        </div>
      </div>
    </section>
  );
}

function ContextNewsList({
  items,
  loading,
}: {
  items: MarketContextItem[];
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 pt-1" data-no-sheet-drag>
      {loading
        ? Array.from({ length: 5 }, (_, index) => (
            <div
              key={`ctx-list-skel-${index}`}
              className="flex gap-3 rounded-[20px] bg-black/[0.04] p-3"
              aria-hidden
            >
              <div className="size-[72px] shrink-0 animate-pulse rounded-[14px] bg-black/[0.06]" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <div className="h-3.5 w-[92%] animate-pulse rounded bg-black/[0.06]" />
                <div className="h-3.5 w-[70%] animate-pulse rounded bg-black/[0.05]" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-black/[0.04]" />
              </div>
            </div>
          ))
        : items.map((item) => {
            const body = (
              <>
                <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[14px] bg-black/[0.06]">
                  <NewsThumb src={item.image} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-3 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-black">
                    {item.headline}
                  </p>
                  <p className="mt-1.5 text-[12px] font-medium text-black/40">
                    {item.source}
                    <span className="mx-1 text-black/25">·</span>
                    {item.time}
                  </p>
                </div>
              </>
            );

            if (item.url) {
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-[20px] bg-black/[0.04] p-3 text-left transition-transform duration-150 ease-out active:scale-[0.985]"
                >
                  {body}
                </a>
              );
            }

            return (
              <article
                key={item.id}
                className="flex gap-3 rounded-[20px] bg-black/[0.04] p-3"
              >
                {body}
              </article>
            );
          })}
    </div>
  );
}

const DISMISS_OFFSET_PX = 80;
const DISMISS_VELOCITY = 520;
const BACK_OFFSET_PX = 72;
const BACK_VELOCITY = 480;
const SHEET_HEIGHT = "86%";

/** Endpoint coords for Figma chart paths (viewBox 259×132). */
const CHART_END_A = { x: 257.9, y: 1.35 };
const CHART_END_B = { x: 257.7, y: 80.13 };

/** Figma Worm-App chart paths (node 9:23) — jagged dual odds series. */
const CHART_PATH_A =
  "M0.89826 118.646L6.13342 129.346L11.3686 120.684L16.6037 120.174L21.8389 129.346L27.0741 114.314L32.3092 114.06L37.5444 121.193L42.7796 115.843L48.0147 111.257L53.2499 124.505L58.4851 107.181L63.7202 126.544L68.9554 128.327L74.1905 122.212L79.4257 116.607L84.6609 125.015L89.896 109.779L95.1312 86.8494L100.366 91.6902L105.602 99.5882L110.837 96.7857L116.072 100.862L121.307 99.843L126.542 110.289L131.777 100.607L137.012 97.8048L142.248 109.525L147.483 101.881L152.718 68.3526L157.953 53.8303L163.188 50.0086L168.423 64.7857L173.659 52.5564L178.894 60.9641L184.129 65.8048L189.364 47.4609L194.599 60.9641L199.834 63.7666L205.07 58.6711L210.305 21.8303L215.54 14.4418L220.775 32.7857L226.01 21.3207L231.245 22.8494L236.481 1.34622L241.716 3.38443L246.951 6.18698L252.186 17.3972L257.898 1.34622";
const CHART_PATH_B =
  "M0.71293 13.3069L6.0242 7.90709L11.3355 3.0858L16.6467 18.3211L21.958 5.97857L27.2693 17.164L32.5805 14.6569L37.8918 4.24291L43.2031 20.2496L48.5144 16.0069L53.8256 5.59287L59.1369 1.54298L64.4482 12.7284L69.7594 3.66435H75.0707L80.382 43.9196L85.6933 41.7983L91.0045 42.3768L96.3158 38.5198L101.627 46.8124L106.938 36.0127L112.25 45.2696L117.561 38.9055L122.872 40.834L128.183 45.2696L133.495 40.2554L138.806 44.3053L144.117 36.2055L149.428 40.4483L154.74 64.1183L160.051 76.8465L165.362 75.8823L170.674 79.1607L175.985 74.5323L181.296 76.0751L186.607 64.504L191.919 62.7683L197.23 75.1108L202.541 64.6969L207.852 78.5822L213.164 69.711L218.475 80.125H223.786L229.098 61.6112L234.409 70.6753L239.72 69.9039L245.031 72.9895L249.002 95.543L257.713 80.125";

export type MarketScreenOption = {
  id: string;
  label: string;
  percent: number;
  color: string;
  logo?: string;
  mark?: string;
};

export type MarketScreenPick = {
  id: string;
  title: string;
  background?: string;
  video?: string;
  /** Live games use ¢ trade pills; upcoming uses circle + combo buttons. */
  live?: boolean;
  context?: MarketContextItem[];
  options: MarketScreenOption[];
  crypto?: {
    price: string;
    priceValue: number;
    delta: string;
    deltaHint: string;
    deltaUp?: boolean;
    chance: string;
    target: string;
  };
};

export type MarketScreenMarket = {
  id: string;
  kind: "sports" | "crypto" | "topic";
  title: string;
  subtitle?: string;
  logo?: string;
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shortLabel(label: string) {
  if (label.length <= 4) return label.toUpperCase();
  const parts = label.split(/\s+/);
  if (parts.length >= 2) {
    return parts
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }
  return label.slice(0, 3).toUpperCase();
}

function cents(percent: number) {
  return `${(Math.round(percent * 10) / 10).toFixed(1)}¢`;
}

/** Split "Tonight, 8:30 PM" → day + time for the matchup header. */
function splitKickoff(title: string): { day: string; time: string } | null {
  const match = title.match(/^(.+?),\s*(.+)$/);
  if (!match) return null;
  return { day: match[1], time: match[2] };
}

function Emblem({
  logo,
  mark,
  label,
  size,
}: {
  logo?: string;
  mark?: string;
  label: string;
  size: number;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  const glyph = mark ?? shortLabel(label);
  const fontSize =
    glyph === "="
      ? Math.max(14, size * 0.72)
      : Math.max(10, size * 0.34);

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] font-semibold tracking-tight text-black/70"
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      {glyph}
    </span>
  );
}

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function useDemoCountdown(seed: string) {
  const base = useMemo(() => 4 * 3600 + (hashString(seed) % (8 * 3600)), [seed]);
  const [remaining, setRemaining] = useState(base);
  useEffect(() => {
    setRemaining(base);
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev <= 0 ? base : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [base]);
  return remaining;
}

/** Dual jagged odds chart — endpoint dots + abbr/% labels (Polymarket-style). */
function MatchOddsChart({
  left,
  right,
}: {
  left: MarketScreenOption;
  right: MarketScreenOption;
}) {
  // Path A rises to the top-right; path B falls — map higher % to rising series.
  const top = left.percent >= right.percent ? left : right;
  const bottom = left.percent >= right.percent ? right : left;

  return (
    <div className="relative h-[188px] w-full">
      <svg
        viewBox="0 0 300 132"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden
      >
        <path
          d={CHART_PATH_A}
          stroke={top.color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={CHART_PATH_B}
          stroke={bottom.color}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={CHART_END_A.x}
          cy={CHART_END_A.y}
          r={4}
          fill={top.color}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={CHART_END_B.x}
          cy={CHART_END_B.y}
          r={4}
          fill={bottom.color}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div
        className="pointer-events-none absolute right-0 top-0 flex flex-col items-start"
        style={{ transform: "translateY(-2px)" }}
      >
        <span
          className="text-[12px] font-semibold leading-none"
          style={{ color: top.color }}
        >
          {shortLabel(top.label)}
        </span>
        <span className="mt-0.5 text-[28px] font-semibold tabular-nums leading-none text-black">
          {top.percent}%
        </span>
      </div>
      <div
        className="pointer-events-none absolute right-0 flex flex-col items-start"
        style={{ top: "58%" }}
      >
        <span
          className="text-[12px] font-semibold leading-none"
          style={{ color: bottom.color }}
        >
          {shortLabel(bottom.label)}
        </span>
        <span className="mt-0.5 text-[28px] font-semibold tabular-nums leading-none text-black">
          {bottom.percent}%
        </span>
      </div>
    </div>
  );
}

/** Matches feed OptionRow add control (size-12 circle + / check). */
function ComboAddButton({
  selected,
  blocked,
  label,
  onToggle,
}: {
  selected: boolean;
  blocked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={selected ? `Remove ${label}` : `Add ${label}`}
      aria-pressed={selected}
      disabled={blocked}
      onClick={onToggle}
      className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full transition-[transform,colors] duration-150 ease-out active:scale-[0.94] disabled:opacity-35 disabled:active:scale-100 ${
        selected ? "bg-black text-white" : "bg-black/[0.06] text-black"
      }`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {selected ? (
          <motion.span
            key="check"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.55, rotate: -12 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.55, rotate: 12 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
          >
            <svg
              viewBox="0 0 20 20"
              width={20}
              height={20}
              className="size-5"
              fill="none"
              aria-hidden
            >
              <path
                d="M4.5 10.5 8.2 14.2 15.5 5.8"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.span>
        ) : (
          <motion.span
            key="plus"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.55 }}
            transition={{ type: "spring", stiffness: 520, damping: 28 }}
          >
            <svg
              viewBox="0 0 20 20"
              width={20}
              height={20}
              className="size-5"
              fill="none"
              aria-hidden
            >
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Market detail sheet — swipe down or tap backdrop to close. */
export default function MarketScreen({
  market,
  pick,
  selectedIds,
  atLimit,
  position,
  balance,
  stickerReady = true,
  onBack,
  onToggle,
  onTrade,
  onCashOut,
  onAdjustPosition,
}: {
  market: MarketScreenMarket;
  pick: MarketScreenPick;
  selectedIds: Set<string>;
  atLimit: boolean;
  position?: PlacedPosition | null;
  balance?: number;
  stickerReady?: boolean;
  onBack: () => void;
  onToggle: (option: MarketScreenOption) => void;
  onTrade?: (option: MarketScreenOption) => void;
  onCashOut?: (position: PlacedPosition) => void;
  onAdjustPosition?: (marketId: string, delta: number) => number;
}) {
  const [tab, setTab] = useState<"comments" | "rules">("comments");
  const [sheetPage, setSheetPage] = useState<"main" | "context">("main");
  const [cashingOut, setCashingOut] = useState(false);
  const cashOutTimerRef = useRef<number | null>(null);
  const dragControls = useDragControls();
  const sheetControls = useAnimationControls();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dismissingRef = useRef(false);
  const teamOptions = useMemo(
    () =>
      pick.options.filter(
        (option) => option.label.trim().toLowerCase() !== "draw",
      ),
    [pick.options],
  );
  const left = teamOptions[0];
  const right = teamOptions[1] ?? teamOptions[teamOptions.length - 1];
  const isLive = Boolean(pick.live);
  const kickoff = splitKickoff(pick.title);
  const countdown = useDemoCountdown(pick.id);
  const volume = useMemo(() => {
    const n = 0.8 + (hashString(pick.id) % 40) / 10;
    return `$${n.toFixed(1)}K`;
  }, [pick.id]);
  const localContextItems = useMemo(
    () => pick.context ?? buildLocalContextItems(pick.id, pick.background),
    [pick.background, pick.context, pick.id],
  );
  const [contextItems, setContextItems] =
    useState<MarketContextItem[]>(localContextItems);
  const [contextLoading, setContextLoading] = useState(!pick.context);
  const [overview, setOverview] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  // Survives main↔context page swaps so the stream only plays once per fetch.
  const [overviewStreamed, setOverviewStreamed] = useState(false);

  useEffect(() => {
    setContextItems(localContextItems);
  }, [localContextItems]);

  useEffect(() => {
    if (pick.context?.length) {
      setContextLoading(false);
      return;
    }

    const controller = new AbortController();
    setContextLoading(true);

    const params = new URLSearchParams({
      marketId: pick.id,
      title: pick.title,
      category: market.title,
    });
    if (pick.background) params.set("fallbackImage", pick.background);

    void fetch(`/api/worm-app-3/market-context?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Context fetch failed");
        const data = (await response.json()) as {
          items?: MarketContextItem[];
        };
        if (!Array.isArray(data.items) || data.items.length === 0) {
          setContextItems(localContextItems);
          return;
        }
        setContextItems(data.items);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setContextItems(localContextItems);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[market-context]", error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setContextLoading(false);
      });

    return () => controller.abort();
  }, [
    localContextItems,
    market.title,
    pick.background,
    pick.context,
    pick.id,
    pick.title,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    setOverview(null);
    setOverviewLoading(true);
    setOverviewStreamed(false);

    const params = new URLSearchParams({
      title: pick.title,
      category: market.title,
    });

    void fetch(`/api/worm-app-3/market-overview?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Overview fetch failed");
        const data = (await response.json()) as {
          overview?: string | null;
        };
        setOverview(data.overview?.trim() || null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setOverview(null);
        if (process.env.NODE_ENV !== "production") {
          console.warn("[market-overview]", error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setOverviewLoading(false);
      });

    return () => controller.abort();
  }, [market.title, pick.id, pick.title]);

  const positionPercent = useMemo(() => {
    if (!position) return pick.options[0]?.percent ?? 50;
    const match = pick.options.find(
      (option) =>
        option.label.toLowerCase() === position.outcome.toLowerCase(),
    );
    return match?.percent ?? position.entryPercent;
  }, [pick.options, position]);

  const [livePositionPercent, setLivePositionPercent] = useState(
    positionPercent,
  );

  useEffect(() => {
    setLivePositionPercent(positionPercent);
  }, [positionPercent, position?.marketId, position?.outcome]);

  useEffect(() => {
    if (!position) {
      setCashingOut(false);
      return;
    }
    const id = window.setInterval(() => {
      setLivePositionPercent((prev) => {
        const delta = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random());
        return Math.max(1, Math.min(99, prev + delta));
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, [position]);

  useEffect(() => {
    return () => {
      if (cashOutTimerRef.current !== null) {
        window.clearTimeout(cashOutTimerRef.current);
      }
    };
  }, []);

  const startCashOut = () => {
    if (!position || cashingOut || !onCashOut) return;
    setCashingOut(true);
    if (cashOutTimerRef.current !== null) {
      window.clearTimeout(cashOutTimerRef.current);
    }
    cashOutTimerRef.current = window.setTimeout(() => {
      cashOutTimerRef.current = null;
      onCashOut(position);
      setCashingOut(false);
    }, 420);
  };

  useEffect(() => {
    setSheetPage("main");
  }, [pick.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sheetPage === "context") {
        setSheetPage("main");
        return;
      }
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      void sheetControls
        .start({
          y: "110%",
          transition: {
            type: "spring",
            stiffness: 420,
            damping: 38,
            mass: 0.85,
          },
        })
        .then(() => onBack());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, sheetControls, sheetPage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [sheetPage]);

  useEffect(() => {
    void sheetControls.start({ y: 0 });
  }, [sheetControls]);

  const dismissSheet = () => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    void sheetControls
      .start({
        y: "110%",
        transition: { type: "spring", stiffness: 420, damping: 38, mass: 0.85 },
      })
      .then(() => onBack());
  };

  const onSheetDragEnd = (_: unknown, info: PanInfo) => {
    if (dismissingRef.current) return;
    if (
      info.offset.y > DISMISS_OFFSET_PX ||
      info.velocity.y > DISMISS_VELOCITY
    ) {
      dismissSheet();
      return;
    }
    void sheetControls.start({
      y: 0,
      transition: { type: "spring", stiffness: 480, damping: 36 },
    });
  };

  const onContextDragEnd = (_: unknown, info: PanInfo) => {
    if (
      info.offset.x > BACK_OFFSET_PX ||
      info.velocity.x > BACK_VELOCITY
    ) {
      setSheetPage("main");
    }
  };

  const startSheetDrag = (event: ReactPointerEvent) => {
    if (dismissingRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, a, [data-no-sheet-drag]")) {
      return;
    }
    // Always allow drag from the grab handle / top chrome.
    if (target.closest("[data-sheet-handle]")) {
      dragControls.start(event);
      return;
    }
    const scroller = scrollRef.current;
    if (scroller && scroller.scrollTop > 2) return;
    dragControls.start(event);
  };

  return (
    <motion.div
      className={`absolute inset-0 z-40 flex items-end justify-center text-black ${allo.className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        aria-label="Close market"
        className="absolute inset-0 bg-black/35"
        onClick={dismissSheet}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={pick.title}
        initial={{ y: "100%" }}
        animate={sheetControls}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.65 }}
        dragMomentum={false}
        onDragEnd={onSheetDragEnd}
        onPointerDown={startSheetDrag}
        className={`relative z-[1] flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white pb-[max(12px,env(safe-area-inset-bottom,0px))] text-black shadow-[0_-12px_40px_rgba(0,0,0,0.12)] ${allo.className}`}
        style={{ height: SHEET_HEIGHT, maxHeight: SHEET_HEIGHT }}
      >
        <div className="absolute inset-x-0 top-0 z-[3] rounded-t-[28px] pt-1.5">
          <div
            data-sheet-handle
            className="flex touch-none justify-center px-8 pb-1.5 pt-1"
            aria-hidden
            onPointerDown={(event) => {
              event.stopPropagation();
              dragControls.start(event);
            }}
          >
            <span className="h-1.5 w-11 rounded-full bg-black/15" />
          </div>
          <header className="flex items-center justify-between px-4 pt-0.5">
            <button
              type="button"
              onClick={() =>
                sheetPage === "context" ? setSheetPage("main") : dismissSheet()
              }
              aria-label={sheetPage === "context" ? "Back to market" : "Back"}
              className="flex size-10 items-center justify-center rounded-full bg-black/[0.06] text-black backdrop-blur-md"
            >
              <svg
                viewBox="0 0 20 20"
                width={20}
                height={20}
                className="size-5"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12.5 4.5 7 10l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="size-10 shrink-0" aria-hidden />
            <button
              type="button"
              aria-label="Share"
              className={`flex size-10 items-center justify-center rounded-full bg-black/[0.06] text-black backdrop-blur-md ${
                sheetPage === "context" ? "invisible" : ""
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                width={18}
                height={18}
                className="size-[18px]"
                fill="none"
                aria-hidden
              >
                <path
                  d="M11 4h5v5M16 4 9 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 11.5V15a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 15V7A1.5 1.5 0 0 1 5.5 5.5H9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[58px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
        <AnimatePresence mode="wait" initial={false}>
        {sheetPage === "context" ? (
          <motion.div
            key="context-page"
            initial={{ opacity: 0, x: "42%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "28%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.85 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.04, right: 0.72 }}
            dragMomentum={false}
            onDragEnd={onContextDragEnd}
            className="relative min-h-full touch-pan-y"
          >
            {/* iOS-style left-edge affordance for swipe-back */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 z-[2] w-4"
              data-no-sheet-drag
            />
            <p className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-black">
              Context
            </p>
            {overview ? (
              <p className="mt-3 text-[15px] leading-snug text-black/55">
                {overview}
              </p>
            ) : null}
            <div className="mt-5">
              <ContextNewsList
                items={contextItems}
                loading={contextLoading}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="main-page"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
        {/* Matchup header */}
        {market.kind === "sports" && left && right ? (
          <div className="mt-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
              <button
                type="button"
                aria-label={`Trade ${left.label}`}
                onClick={() => onTrade?.(left)}
                className="flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <Emblem
                  logo={left.logo}
                  mark={left.mark}
                  label={left.label}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold leading-tight text-black">
                    {left.label}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium leading-none text-black/40">
                    Home
                  </p>
                </div>
              </button>
              <div className="flex flex-col items-center pt-1 text-center">
                {isLive ? (
                  <p className="text-[13px] font-semibold text-[#FF3B30]">Live</p>
                ) : kickoff ? (
                  <>
                    <p className="text-[13px] font-medium text-black/45">
                      {kickoff.day}
                    </p>
                    <p className="mt-1 flex items-baseline justify-center gap-2 leading-none">
                      <span className="text-[28px] font-semibold text-black/40">
                        in
                      </span>
                      <span className="text-[28px] font-semibold tabular-nums tracking-tight text-black">
                        {formatCountdown(countdown)}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-[15px] font-semibold text-black">
                    {pick.title}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-3 h-8 rounded-full px-4 text-[13px] font-medium text-black/60 ring-1 ring-inset ring-black/10"
                >
                  Standings
                </button>
              </div>
              <button
                type="button"
                aria-label={`Trade ${right.label}`}
                onClick={() => onTrade?.(right)}
                className="flex min-w-0 flex-col items-center gap-1.5 text-center"
              >
                <Emblem
                  logo={right.logo}
                  mark={right.mark}
                  label={right.label}
                  size={44}
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold leading-tight text-black">
                    {right.label}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium leading-none text-black/40">
                    Away
                  </p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-center">
            {pick.background ? (
              <div className="mx-auto relative mb-4 size-[88px] overflow-hidden rounded-[12px]">
                <Image
                  src={pick.background}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="88px"
                  priority
                  draggable={false}
                />
              </div>
            ) : null}
            <p className="text-[14px] font-medium text-black/45">
              {market.title}
            </p>
            <p className="mt-0.5 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-black">
              {pick.title}
            </p>
            {pick.crypto ? (
              <p className="mt-2 text-[14px] text-black/45">
                {pick.crypto.price} · {pick.crypto.delta} {pick.crypto.deltaHint}
              </p>
            ) : null}
          </div>
        )}

        <AiOverview
          text={overview}
          loading={overviewLoading}
          animate={!overviewStreamed}
          onAnimated={() => setOverviewStreamed(true)}
          onOpen={() => {
            setOverviewStreamed(true);
            setSheetPage("context");
          }}
        />

        {/* Odds chart — sports matchups only */}
        {market.kind === "sports" && left && right ? (
          <div className="mt-7">
            <MatchOddsChart left={left} right={right} />
            <p className="mt-2 text-[12px] tabular-nums text-black/35">
              24h Vol {volume}
            </p>
          </div>
        ) : null}

        {/* Active position, or outcome rows */}
        {position ? (
          <PositionFooter
            position={position}
            currentPercent={livePositionPercent}
            video={false}
            canIncrease={(balance ?? 0) >= POSITION_ADJUST_STEP}
            cashingOut={cashingOut}
            stickerReady={stickerReady}
            className="mt-5"
            onCashOut={startCashOut}
            onAdjust={(delta) => onAdjustPosition?.(position.marketId, delta)}
          />
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            {pick.options.map((option) => {
              const selected = selectedIds.has(option.id);
              const blocked = !selected && atLimit;

              if (isLive) {
                return (
                  <div key={option.id} className="flex items-center gap-3">
                    <Emblem
                      logo={option.logo}
                      mark={option.mark}
                      label={option.label}
                      size={28}
                    />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-black">
                      {option.label}
                    </p>
                    <p className="shrink-0 text-[15px] font-semibold tabular-nums text-black/45">
                      {option.percent}%
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onTrade ? onTrade(option) : onToggle(option)
                      }
                      className="h-10 shrink-0 rounded-full px-3.5 text-[14px] font-semibold tabular-nums text-white transition-transform duration-150 ease-out active:scale-[0.94]"
                      style={{ backgroundColor: option.color }}
                      aria-label={`Trade ${option.label} at ${cents(option.percent)}`}
                    >
                      {cents(option.percent)}
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={option.id}
                  className="flex w-full items-start gap-2 overflow-hidden"
                >
                  <button
                    type="button"
                    aria-label={`Trade ${option.label} · ${option.percent}%`}
                    onClick={() => onTrade?.(option)}
                    className="relative flex h-[52px] min-w-0 flex-1 origin-center items-center justify-between overflow-hidden rounded-[18px] bg-black/[0.06] px-4 text-left transition-transform duration-150 ease-out active:scale-[0.94]"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-black/[0.12]"
                      style={{ width: `${option.percent}%` }}
                    />
                    <div className="relative z-[1] flex items-center gap-2.5 overflow-hidden">
                      {option.logo || option.mark ? (
                        <Emblem
                          logo={option.logo}
                          mark={option.mark}
                          label={option.label}
                          size={24}
                        />
                      ) : null}
                      <span className="truncate text-[16px] font-semibold text-black">
                        {option.label}
                      </span>
                    </div>
                    <span className="relative z-[1] shrink-0 text-[16px] font-semibold tabular-nums text-black">
                      {option.percent}%
                    </span>
                  </button>
                  <ComboAddButton
                    selected={selected}
                    blocked={blocked}
                    label={option.label}
                    onToggle={() => onToggle(option)}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-end border-b border-black/10">
          <LayoutGroup id="market-sheet-tabs">
            <div className="flex gap-5">
              {(
                [
                  ["comments", "Comments"],
                  ["rules", "Rules"],
                ] as const
              ).map(([id, label]) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`relative pb-2.5 text-[15px] font-semibold transition-colors duration-200 ease-out ${
                      active ? "text-black" : "text-black/35"
                    }`}
                  >
                    {label}
                    {active ? (
                      <motion.span
                        layoutId="market-sheet-tab-underline"
                        aria-hidden
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-black"
                        transition={{
                          type: "spring",
                          stiffness: 520,
                          damping: 38,
                          mass: 0.8,
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {tab === "comments" ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex h-11 items-center rounded-full bg-black/[0.05] px-4 text-[14px] text-black/35">
              Sign in to comment
            </div>
            <p className="text-center text-[14px] text-black/35">
              No comments yet
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[14px] leading-relaxed text-black/60">
            {market.kind === "sports"
              ? `This market resolves to the side that wins. ${pick.title}. Overtime and series maps count.`
              : market.kind === "topic"
                ? `This market resolves to the listed date if the event occurs by then, otherwise later outcomes.`
                : `This market resolves to Yes if the target is met at the listed deadline, otherwise No.`}
          </p>
        )}
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
