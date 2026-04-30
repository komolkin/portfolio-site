"use client";

import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import NumberFlow from "@number-flow/react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const GrainGradient = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.GrainGradient),
  { ssr: false },
);

/** Face crops from Unsplash (demo placeholders; names are fictional market labels). */
const IMG_TIMOTHEE_CHALAMET =
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=faces&auto=format&q=80";
const IMG_ZENDAYA =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces&auto=format&q=80";
const IMG_FLORENCE_PUGH =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=faces&auto=format&q=80";
const IMG_PAUL_MESCAL =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces&auto=format&q=80";
const IMG_SAOIRSE_RONAN =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces&auto=format&q=80";
const IMG_PNL_VECTOR_0 =
  "https://www.figma.com/api/mcp/asset/1dc54a4f-d104-4ce0-b429-8feb9261a180";
const IMG_PNL_VECTOR_1 =
  "https://www.figma.com/api/mcp/asset/a1ad4f7a-95ec-4ac6-b9bd-e05b14094bc0";
const IMG_PNL_VECTOR_2 =
  "https://www.figma.com/api/mcp/asset/ff2b7417-646d-4337-b863-9fee6cda7ad1";
const IMG_CLOSE_ICON =
  "https://www.figma.com/api/mcp/asset/5bbac23d-2996-4556-87da-fb5a38467b7d";

const LEVERAGE_STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

const AMOUNT_PRESETS = [
  { label: "+1", increment: 1 },
  { label: "+5", increment: 5 },
  { label: "+10", increment: 10 },
  { label: "+100", increment: 100 },
  { label: "Max", increment: null },
] as const;
const MAX_AMOUNT = 10_000;
// Used as the fallback "entry price" for PNL when the order is a market order.
// This is only for the playground UI (so PNL can update live while typing).
const MARKET_DEFAULT_ENTRY_PRICE_CENTS = 1617; // $16.17
/** Max shares used for sell % shortcuts and cap (matches limit-order shares cap). */
const MAX_SHARES = MAX_AMOUNT;
const SELL_SHARE_PRESETS = [
  { label: "10%", fraction: 0.1 },
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "Max" as const, fraction: null },
] as const;
const MAX_LIMIT_CENTS = 1_000_000;
const PERSON_OPTIONS = [
  { name: "Timothée Chalamet", image: IMG_TIMOTHEE_CHALAMET, yesPercent: 61 },
  { name: "Zendaya", image: IMG_ZENDAYA, yesPercent: 67 },
  { name: "Florence Pugh", image: IMG_FLORENCE_PUGH, yesPercent: 62 },
  { name: "Paul Mescal", image: IMG_PAUL_MESCAL, yesPercent: 70 },
  { name: "Saoirse Ronan", image: IMG_SAOIRSE_RONAN, yesPercent: 64 },
] as const;

// Start fetching avatar images as soon as the module is evaluated on the client.
// This avoids the first user interaction triggering a cold fetch/decode.
const avatarPreloadSrcs = new Set<string>();
if (typeof window !== "undefined") {
  PERSON_OPTIONS.forEach((person) => {
    if (avatarPreloadSrcs.has(person.image)) return;
    avatarPreloadSrcs.add(person.image);

    const img = new window.Image();
    img.src = person.image;
    img.decode?.().catch(() => {
      // Ignore decode errors; the image may still render fine.
    });
  });
}

// Preload the PNL "trash" icon vectors once so open/close doesn't repeatedly fetch/decode them.
const pnlIconObjectUrlCache = new Map<string, string>();
const pnlIconObjectUrlPromises = new Map<string, Promise<string>>();
const PNL_ICON_SRCS = [IMG_PNL_VECTOR_0, IMG_PNL_VECTOR_1, IMG_PNL_VECTOR_2] as const;

async function getPnlIconObjectUrl(src: string): Promise<string> {
  const cached = pnlIconObjectUrlCache.get(src);
  if (cached) return cached;

  const existingPromise = pnlIconObjectUrlPromises.get(src);
  if (existingPromise) return existingPromise;

  const promise = fetch(src)
    .then(async (res) => {
      // If the server doesn't allow CORS for blob reads, fall back to the original src.
      // (In that case, browser caching may still help depending on headers.)
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      pnlIconObjectUrlCache.set(src, objectUrl);
      return objectUrl;
    })
    .catch(() => src);

  pnlIconObjectUrlPromises.set(src, promise);
  return promise;
}

if (typeof window !== "undefined") {
  // Kick off prefetch immediately on module load (best-effort).
  for (const src of PNL_ICON_SRCS) {
    // Also warm up the browser's image cache (in case blob reads are blocked by CORS).
    const img = new window.Image();
    img.src = src;
    img.decode?.().catch(() => {
      // Ignore decode errors.
    });
  }

  void Promise.all(PNL_ICON_SRCS.map((src) => getPnlIconObjectUrl(src))).catch(() => {
    // Ignore failures; UI will fall back to using the original remote URLs.
  });
}

type LeverageSelectorScreen = "order" | "review" | "placing" | "placed" | "success" | "closing" | "tp-sl";
const FLOW_EASE = [0.22, 1, 0.36, 1] as const;
const PLACING_APPEAR_DELAY_MS = 520;
const PLACING_ENTER_DELAY_S = 0.14;
const PLACING_STEP_DURATION_MS = 3000;
const PLACED_STEP_DURATION_MS = 2600;
const PLACED_CHECKMARK_DRAW_DURATION_S = 0.5;
const PLACED_ENTER_DURATION_S = 0.42;
const PLACED_ENTER_DELAY_S = 0.08;
const AVG_PRICE_TICK_INTERVAL_MS = 10_000;

function playSparkleChime() {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const context = new AudioCtx();
    const now = context.currentTime;

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    master.connect(context.destination);

    const sparkleNotes = [
      { freq: 1046.5, start: 0.0, duration: 0.18 }, // C6
      { freq: 1318.5, start: 0.08, duration: 0.16 }, // E6
      { freq: 1568.0, start: 0.16, duration: 0.2 }, // G6
    ] as const;

    sparkleNotes.forEach((note) => {
      const osc = context.createOscillator();
      const noteGain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      noteGain.gain.setValueAtTime(0.0001, now + note.start);
      noteGain.gain.exponentialRampToValueAtTime(0.34, now + note.start + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(noteGain);
      noteGain.connect(master);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    });

    window.setTimeout(() => {
      void context.close().catch(() => {});
    }, 900);
  } catch {
    // Audio may fail due to autoplay/browser policies; fail silently.
  }
}

function PlacingLoaderIcon({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-20"} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-white/10" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="size-12 animate-spin">
          <svg viewBox="0 0 36 36" className="size-full fill-none">
            <circle cx="18" cy="18" r="11" stroke="rgba(255,255,255,0.28)" strokeWidth="3" />
            <path
              d="M18 7a11 11 0 0 1 10.4 7.4"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PlacedCheckIcon({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  const sparkleSpecs = [
    { left: "16%", top: "22%", dx: -16, dy: -18, delay: 0.26, size: 2, peak: 0.9, blur: 8 },
    { left: "82%", top: "24%", dx: 16, dy: -20, delay: 0.32, size: 3, peak: 0.94, blur: 10 },
    { left: "14%", top: "68%", dx: -18, dy: 12, delay: 0.38, size: 2, peak: 0.84, blur: 8 },
    { left: "86%", top: "66%", dx: 18, dy: 14, delay: 0.44, size: 2, peak: 0.9, blur: 9 },
    { left: "28%", top: "14%", dx: -10, dy: -18, delay: 0.3, size: 1, peak: 0.78, blur: 7 },
    { left: "72%", top: "12%", dx: 10, dy: -18, delay: 0.36, size: 2, peak: 0.84, blur: 8 },
    { left: "24%", top: "82%", dx: -12, dy: 14, delay: 0.42, size: 3, peak: 0.96, blur: 11 },
    { left: "76%", top: "84%", dx: 12, dy: 14, delay: 0.5, size: 2, peak: 0.88, blur: 9 },
    { left: "8%", top: "46%", dx: -22, dy: -2, delay: 0.34, size: 2, peak: 0.84, blur: 8 },
    { left: "92%", top: "48%", dx: 22, dy: 2, delay: 0.41, size: 1, peak: 0.8, blur: 7 },
    { left: "34%", top: "6%", dx: -6, dy: -20, delay: 0.29, size: 2, peak: 0.88, blur: 8 },
    { left: "64%", top: "7%", dx: 6, dy: -20, delay: 0.33, size: 2, peak: 0.82, blur: 8 },
    { left: "36%", top: "92%", dx: -6, dy: 18, delay: 0.47, size: 3, peak: 0.95, blur: 10 },
    { left: "66%", top: "93%", dx: 6, dy: 18, delay: 0.53, size: 2, peak: 0.88, blur: 9 },
    { left: "20%", top: "35%", dx: -14, dy: -6, delay: 0.31, size: 1, peak: 0.8, blur: 7 },
    { left: "80%", top: "36%", dx: 14, dy: -6, delay: 0.35, size: 1, peak: 0.8, blur: 7 },
    { left: "30%", top: "26%", dx: -8, dy: -14, delay: 0.27, size: 2, peak: 0.86, blur: 8 },
    { left: "70%", top: "27%", dx: 8, dy: -14, delay: 0.37, size: 2, peak: 0.86, blur: 8 },
    { left: "30%", top: "72%", dx: -8, dy: 10, delay: 0.43, size: 1, peak: 0.78, blur: 7 },
    { left: "70%", top: "73%", dx: 8, dy: 10, delay: 0.49, size: 1, peak: 0.78, blur: 7 },
    { left: "46%", top: "10%", dx: -2, dy: -18, delay: 0.28, size: 2, peak: 0.84, blur: 8 },
    { left: "54%", top: "90%", dx: 2, dy: 16, delay: 0.52, size: 2, peak: 0.84, blur: 8 },
    { left: "12%", top: "30%", dx: -18, dy: -10, delay: 0.3, size: 1, peak: 0.76, blur: 7 },
    { left: "88%", top: "30%", dx: 18, dy: -10, delay: 0.34, size: 1, peak: 0.76, blur: 7 },
    { left: "12%", top: "58%", dx: -18, dy: 8, delay: 0.4, size: 1, peak: 0.76, blur: 7 },
    { left: "88%", top: "58%", dx: 18, dy: 8, delay: 0.46, size: 1, peak: 0.76, blur: 7 },
    { left: "40%", top: "4%", dx: -4, dy: -16, delay: 0.27, size: 1, peak: 0.74, blur: 7 },
    { left: "60%", top: "4%", dx: 4, dy: -16, delay: 0.31, size: 1, peak: 0.74, blur: 7 },
    { left: "40%", top: "96%", dx: -4, dy: 14, delay: 0.5, size: 1, peak: 0.74, blur: 7 },
    { left: "60%", top: "96%", dx: 4, dy: 14, delay: 0.54, size: 1, peak: 0.74, blur: 7 },
  ] as const;

  return (
    <div className={className || "relative size-20"} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-white/10" />
      <motion.div
        className="pointer-events-none absolute inset-[-12px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.28) 0%, rgba(93,217,120,0.12) 38%, rgba(45,16,127,0.08) 58%, rgba(255,255,255,0) 76%)",
          filter: "blur(8px)",
        }}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: prefersReducedMotion ? 0.2 : 0.34, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.2 : 0.55, ease: FLOW_EASE, delay: 0.08 }}
      />
      {!prefersReducedMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-full border border-white/40"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.28, 0], scale: [0.8, 1, 1.38] }}
          transition={{ duration: 0.74, ease: FLOW_EASE, delay: 0.2 }}
        />
      )}
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-full fill-none">
        <motion.path
          d="M28 40.5L36.5 49L52 33.5"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: PLACED_CHECKMARK_DRAW_DURATION_S, ease: FLOW_EASE, delay: 0.04 }}
        />
      </svg>
      {!prefersReducedMotion &&
        sparkleSpecs.map((sparkle, index) => (
          <motion.span
            key={`placed-sparkle-${index}`}
            className="pointer-events-none absolute block rounded-full bg-white"
            style={{
              left: sparkle.left,
              top: sparkle.top,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              boxShadow: `0 0 ${sparkle.blur}px rgba(255,255,255,0.9), 0 0 ${sparkle.blur + 10}px rgba(93,217,120,0.35)`,
            }}
            initial={{ opacity: 0, scale: 0.7, x: 0, y: 0 }}
            animate={{ opacity: [0, sparkle.peak, 0], scale: [0.7, 1.15, 0.78], x: [0, sparkle.dx], y: [0, sparkle.dy] }}
            transition={{ duration: 0.72 + index * 0.01, ease: FLOW_EASE, delay: sparkle.delay }}
          />
        ))}
    </div>
  );
}

function CircularProgressIcon({ className }: { className?: string }) {
  const radius = 5.5;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 16 16" className={className || "size-3"} aria-hidden>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
      <circle
        cx="8"
        cy="8"
        r="5.5"
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        transform="rotate(-90 8 8)"
      >
        <animate
          attributeName="stroke-dashoffset"
          from={String(circumference)}
          to="0"
          dur={`${AVG_PRICE_TICK_INTERVAL_MS / 1000}s`}
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4.5 6.5L8 10L11.5 6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M6.5 4.5L10 8L6.5 11.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwapVertical({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M5 4.5L8 1.5L11 4.5M11 11.5L8 14.5L5 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatLeverage(n: number) {
  return `${n}×`;
}

function formatMoney(n: number) {
  if (n >= 1000) return `$${n.toLocaleString("en-US")}`;
  return `$${n}`;
}

function PnLIcon({
  className,
  iconSrcs,
}: {
  className?: string;
  iconSrcs?: readonly [string, string, string];
}) {
  const [src0, src1, src2] = iconSrcs ?? [
    IMG_PNL_VECTOR_0,
    IMG_PNL_VECTOR_1,
    IMG_PNL_VECTOR_2,
  ];

  return (
    <div
      className={className || "overflow-clip relative shrink-0 size-[16px]"}
      aria-hidden
    >
      <div className="absolute bottom-3/4 left-[12.5%] right-[12.5%] top-1/4">
        <div className="absolute inset-[-0.67px_-5.56%]">
          <img
            alt=""
            className="block max-w-none size-full"
            src={src0}
          />
        </div>
      </div>
      <div className="absolute bottom-[8.33%] left-[20.83%] right-[20.83%] top-1/4">
        <div className="absolute inset-[-6.25%_-7.14%]">
          <img
            alt=""
            className="block max-w-none size-full"
            src={src1}
          />
        </div>
      </div>
      <div className="absolute bottom-3/4 left-[33.33%] right-[33.33%] top-[8.33%]">
        <div className="absolute inset-[-25%_-12.5%]">
          <img
            alt=""
            className="block max-w-none size-full"
            src={src2}
          />
        </div>
      </div>
    </div>
  );
}

export default function LeverageSelector() {
  const [selectedPerson, setSelectedPerson] = useState<(typeof PERSON_OPTIONS)[number]>(PERSON_OPTIONS[0]);
  const [isPersonMenuOpen, setIsPersonMenuOpen] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [leverageIdx, setLeverageIdx] = useState(0);
  const [isLeverageDragging, setIsLeverageDragging] = useState(false);
  const [amount, setAmount] = useState(0);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPriceCents, setLimitPriceCents] = useState(0);
  const [shares, setShares] = useState(0);
  const [takeProfitUnit, setTakeProfitUnit] = useState<"$" | "%">("$");
  const [stopLossUnit, setStopLossUnit] = useState<"$" | "%">("$");
  const [takeProfitValue, setTakeProfitValue] = useState(0);
  const [stopLossValue, setStopLossValue] = useState(0);
  const [pendingTakeProfitValue, setPendingTakeProfitValue] = useState(0);
  const [pendingTakeProfitUnit, setPendingTakeProfitUnit] = useState<"$" | "%">("$");
  const [pendingStopLossValue, setPendingStopLossValue] = useState(0);
  const [pendingStopLossUnit, setPendingStopLossUnit] = useState<"$" | "%">("$");
  const [pnlIconObjectUrls, setPnlIconObjectUrls] =
    useState<readonly [string, string, string] | null>(null);
  const [screen, setScreen] = useState<LeverageSelectorScreen>("order");
  const [reviewAvgPriceCents, setReviewAvgPriceCents] = useState<number>(PERSON_OPTIONS[0].yesPercent);
  const prefersReducedMotion = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>();
  const hasInitializedHeight = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const personMenuRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const buyTextRef = useRef<HTMLSpanElement | null>(null);
  const sellTextRef = useRef<HTMLSpanElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const limitPriceInputRef = useRef<HTMLInputElement | null>(null);
  const sharesInputRef = useRef<HTMLInputElement | null>(null);
  const takeProfitInputRef = useRef<HTMLInputElement | null>(null);
  const stopLossInputRef = useRef<HTMLInputElement | null>(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  const leverage = LEVERAGE_STEPS[leverageIdx];
  const dotCount = LEVERAGE_STEPS.length;
  const ratio = leverageIdx / Math.max(1, dotCount - 1);
  const thumbWidthPx = 56;
  const thumbHalfPx = thumbWidthPx / 2;
  // Keep the thumb fully inside the track while aligning dot centers with it.
  const stepCenterInsetPx = thumbHalfPx;
  const thumbLeft = `calc(${ratio} * (100% - ${thumbWidthPx}px))`;
  const leverageIntegerDigits = Number.isInteger(leverage) ? 0 : 1;

  const outcomePercent = outcome === "yes" ? selectedPerson.yesPercent : 100 - selectedPerson.yesPercent;
  const outcomeLabel = outcome === "yes" ? "Yes" : "No";
  const outcomeColor = outcome === "yes" ? "#009d59" : "#cf2f2f";
  const successScreenBackgroundColor = outcomeColor;
  const marketQuestion = "Best Actor · Academy Awards";

  const imagePreloadPromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const preloadPersonImage = useCallback((src: string) => {
    const existing = imagePreloadPromisesRef.current.get(src);
    if (existing) return existing;

    // Preload + decode so the avatar swap happens as soon as `selectedPerson` changes.
    const promise = new Promise<void>((resolve) => {
      const img = new window.Image();
      img.src = src;

      img.onload = async () => {
        try {
          await img.decode();
        } catch {
          // If decode fails for any reason, still resolve so UI isn't blocked forever.
        }
        resolve();
      };

      img.onerror = () => resolve();
    });

    imagePreloadPromisesRef.current.set(src, promise);
    return promise;
  }, []);

  useEffect(() => {
    // Warm up browser cache so avatar images do not blink on first open.
    PERSON_OPTIONS.forEach((person) => {
      preloadPersonImage(person.image);
    });
  }, [preloadPersonImage]);

  useEffect(() => {
    // Load object URLs for the PNL icon so open/close doesn't refetch.
    // (Best-effort; if it fails, the component will keep using the remote URLs.)
    let cancelled = false;
    Promise.all(
      PNL_ICON_SRCS.map((src) => getPnlIconObjectUrl(src)) as unknown as Promise<string>[],
    )
      .then((urls) => {
        if (cancelled) return;
        // `Promise.all()` is typed as `string[]` here, so cast via `unknown` to the fixed 3-item tuple.
        setPnlIconObjectUrls(urls as unknown as readonly [string, string, string]);
      })
      .catch(() => {
        // Ignore.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Make the active order-type field usable immediately (no extra click needed).
    requestAnimationFrame(() => {
      if (orderType === "market") {
        if (side === "buy") {
          amountInputRef.current?.focus({ preventScroll: true });
        } else {
          sharesInputRef.current?.focus({ preventScroll: true });
        }
      } else {
        limitPriceInputRef.current?.focus({ preventScroll: true });
      }
    });
  }, [orderType, side]);

  useEffect(() => {
    if (screen !== "tp-sl") return;
    requestAnimationFrame(() => {
      takeProfitInputRef.current?.focus({ preventScroll: true });
    });
  }, [screen]);

  useLayoutEffect(() => {
    const root = tabsRef.current;
    const buy = buyTextRef.current;
    const sell = sellTextRef.current;
    if (!root || !buy || !sell) return;

    const rootRect = root.getBoundingClientRect();
    const activeRect = (side === "buy" ? buy : sell).getBoundingClientRect();
    setTabIndicator({
      left: activeRect.left - rootRect.left,
      width: activeRect.width,
    });
  }, [side]);

  useLayoutEffect(() => {
    if (!hasInitializedHeight.current) {
      hasInitializedHeight.current = true;
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    setCardHeight(el.offsetHeight);
  }, [orderType, side]);

  useEffect(() => {
    // Must match the `"pointerdown"` DOM event type (`PointerEvent`), otherwise TS
    // fails the build (e.g. on Vercel/CI where `next build` checks types).
    const handlePointerDown = (event: PointerEvent) => {
      const root = personMenuRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      setIsPersonMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const resetTradeForm = useCallback(() => {
    setSelectedPerson(PERSON_OPTIONS[0]);
    setSide("buy");
    setOutcome("yes");
    setLeverageIdx(0);
    setIsLeverageDragging(false);
    setAmount(0);
    setOrderType("market");
    setLimitPriceCents(0);
    setShares(0);
    setTakeProfitUnit("$");
    setStopLossUnit("$");
    setTakeProfitValue(0);
    setStopLossValue(0);
  }, []);

  useEffect(() => {
    if (screen !== "placing" && screen !== "placed") return;
    const timeoutId = window.setTimeout(() => {
      setScreen((prev) => {
        if (prev === "placing") return "placed";
        if (prev === "placed") return "success";
        return prev;
      });
    }, screen === "placing" ? PLACING_STEP_DURATION_MS : PLACED_STEP_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "placed") return;
    playSparkleChime();
  }, [screen]);

  useEffect(() => {
    if (screen !== "closing") return;
    const timeoutId = window.setTimeout(() => {
      resetTradeForm();
      setScreen("order");
    }, 220);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [screen, resetTradeForm]);

  useEffect(() => {
    if (screen !== "review") {
      setReviewAvgPriceCents(outcomePercent);
      return;
    }

    const getRandomDelta = () => {
      const delta = Math.floor(Math.random() * 7) - 3;
      return delta === 0 ? 1 : delta;
    };

    const intervalId = window.setInterval(() => {
      setReviewAvgPriceCents((prev) => Math.max(1, Math.min(99, prev + getRandomDelta())));
    }, AVG_PRICE_TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [screen, outcomePercent]);

  const updateLeverageFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const usableWidth = Math.max(1, rect.width - thumbWidthPx);
      const raw = (clientX - rect.left - thumbHalfPx) / usableWidth;
      const clamped = Math.min(1, Math.max(0, raw));
      const nextIdx = Math.round(clamped * (dotCount - 1));
      setLeverageIdx(nextIdx);
    },
    [dotCount, thumbHalfPx, thumbWidthPx],
  );

  const startLeverageDrag = useCallback(
    (startX: number) => {
      setIsLeverageDragging(true);
      updateLeverageFromClientX(startX);

      const onMove = (event: PointerEvent) => {
        updateLeverageFromClientX(event.clientX);
      };
      const onUp = () => {
        setIsLeverageDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [updateLeverageFromClientX],
  );

  const handleLeverageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setLeverageIdx((prev) => Math.max(0, prev - 1));
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setLeverageIdx((prev) => Math.min(dotCount - 1, prev + 1));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setLeverageIdx(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setLeverageIdx(dotCount - 1);
    }
  };

  const handleAmountShortcut = (increment: number | null) => {
    if (increment === null) {
      setAmount(MAX_AMOUNT);
      return;
    }
    setAmount((prev) => Math.min(MAX_AMOUNT, prev + increment));
  };

  const handleSellSharesShortcut = (label: string, fraction: number | null) => {
    const presetValue =
      fraction === null ? MAX_SHARES : Math.floor(MAX_SHARES * fraction);
    setShares((prev) => (prev === presetValue ? 0 : presetValue));
  };

  const handleAmountInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) {
      setAmount(0);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) {
      setAmount(0);
      return;
    }
    setAmount(Math.min(MAX_AMOUNT, parsed));
  };

  const handleLimitPriceInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) {
      setLimitPriceCents(0);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) {
      setLimitPriceCents(0);
      return;
    }
    setLimitPriceCents(Math.min(MAX_LIMIT_CENTS, parsed));
  };

  const handleSharesInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) {
      setShares(0);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) {
      setShares(0);
      return;
    }
    setShares(Math.min(MAX_SHARES, parsed));
  };

  const handleTakeProfitInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) {
      setTakeProfitValue(0);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) {
      setTakeProfitValue(0);
      return;
    }
    // Value is stored as an integer in the selected unit.
    const next = Math.min(MAX_LIMIT_CENTS, parsed);
    setTakeProfitValue(next);
  };

  const handleStopLossInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) {
      setStopLossValue(0);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) {
      setStopLossValue(0);
      return;
    }
    const next = Math.min(MAX_LIMIT_CENTS, parsed);
    setStopLossValue(next);
  };

  const handlePendingTakeProfitInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) { setPendingTakeProfitValue(0); return; }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) { setPendingTakeProfitValue(0); return; }
    setPendingTakeProfitValue(Math.min(MAX_LIMIT_CENTS, parsed));
  };

  const handlePendingStopLossInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) { setPendingStopLossValue(0); return; }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (Number.isNaN(parsed)) { setPendingStopLossValue(0); return; }
    setPendingStopLossValue(Math.min(MAX_LIMIT_CENTS, parsed));
  };

  const openTpSlScreen = () => {
    startTransition(() => {
      setPendingTakeProfitValue(takeProfitValue);
      setPendingTakeProfitUnit(takeProfitUnit);
      setPendingStopLossValue(stopLossValue);
      setPendingStopLossUnit(stopLossUnit);
      setScreen("tp-sl");
    });
  };

  const commitTpSl = () => {
    startTransition(() => {
      setTakeProfitValue(pendingTakeProfitValue);
      setTakeProfitUnit(pendingTakeProfitUnit);
      setStopLossValue(pendingStopLossValue);
      setStopLossUnit(pendingStopLossUnit);
      setScreen("order");
    });
  };

  const canPlaceOrder =
    orderType === "market"
      ? side === "buy"
        ? amount > 0
        : shares > 0
      : limitPriceCents > 0 && shares > 0;

  const pnlEntryPriceCents =
    orderType === "limit" && limitPriceCents > 0 ? limitPriceCents : MARKET_DEFAULT_ENTRY_PRICE_CENTS;
  const positionNotionalDollars =
    orderType === "limit" ? (shares * pnlEntryPriceCents) / 100 : amount;
  const takeProfitPercent =
    takeProfitUnit === "$" ? takeProfitValue / Math.max(1, pnlEntryPriceCents) : takeProfitValue / 100;
  const takeProfitPnLDollars = takeProfitValue > 0 ? positionNotionalDollars * leverage * takeProfitPercent : 0;

  const stopLossPercent =
    stopLossUnit === "$"
      ? stopLossValue / Math.max(1, pnlEntryPriceCents)
      : stopLossValue / 100;
  const stopLossPnLDollars =
    stopLossValue > 0 ? -positionNotionalDollars * leverage * stopLossPercent : 0;

  const pendingTakeProfitPercent =
    pendingTakeProfitUnit === "$"
      ? pendingTakeProfitValue / Math.max(1, pnlEntryPriceCents)
      : pendingTakeProfitValue / 100;
  const pendingTakeProfitPnLDollars =
    pendingTakeProfitValue > 0 ? positionNotionalDollars * leverage * pendingTakeProfitPercent : 0;

  const pendingStopLossPercent =
    pendingStopLossUnit === "$"
      ? pendingStopLossValue / Math.max(1, pnlEntryPriceCents)
      : pendingStopLossValue / 100;
  const pendingStopLossPnLDollars =
    pendingStopLossValue > 0 ? -positionNotionalDollars * leverage * pendingStopLossPercent : 0;

  const formatTpSlSummaryValue = (value: number, unit: "$" | "%") =>
    value > 0 ? `${value}${unit === "$" ? "¢" : "%"}` : "–";
  const hasTpSlValues = takeProfitValue > 0 || stopLossValue > 0;
  const tpSlSummary = `TP / SL: ${formatTpSlSummaryValue(takeProfitValue, takeProfitUnit)} / ${formatTpSlSummaryValue(stopLossValue, stopLossUnit)}`;

  const totalDollars =
    orderType === "market"
      ? side === "buy"
        ? amount
        : (shares * pnlEntryPriceCents) / 100
      : (shares * pnlEntryPriceCents) / 100;
  const estimatedToWinDollars = totalDollars * leverage * (outcomePercent / 100);
  const combinedToWinDollars = totalDollars + estimatedToWinDollars;
  const liquidationPriceCents = Math.max(1, Math.round(outcomePercent / Math.max(1, leverage)));

  return (
    <div className="relative w-[380px] max-w-[calc(100vw-2rem)] p-0">
      <motion.div
        animate={{ height: cardHeight ?? "auto" }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: FLOW_EASE }}
        onAnimationComplete={() => setCardHeight(undefined)}
        className="relative overflow-hidden rounded-3xl"
        style={{ background: "#1d1d1d" }}
      >
        <div ref={contentRef} className="relative flex w-full flex-col gap-2.5 p-4">
          {/* Profile row */}
          <div className="flex w-full items-center gap-3.5">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
              {/* Render all avatars up-front (hidden) so switching feels instantaneous. */}
              {PERSON_OPTIONS.map((person) => (
                <img
                  key={person.image}
                  src={person.image}
                  alt={person.name}
                  aria-hidden={person.name !== selectedPerson.name}
                  className={`absolute inset-0 size-full object-cover ${
                    person.name === selectedPerson.name ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ transition: "none" }}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              ))}
            </div>
            <div ref={personMenuRef} className="relative min-w-0 flex-1">
              <button
                type="button"
                className="flex min-w-0 w-full items-center gap-2 text-left"
                aria-haspopup="listbox"
                aria-expanded={isPersonMenuOpen}
                onClick={() => {
                  setIsPersonMenuOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      // If the user opens the dropdown, eagerly preload everything they might pick.
                      PERSON_OPTIONS.forEach((person) => preloadPersonImage(person.image));
                    }
                    return next;
                  });
                }}
              >
                <span className="truncate text-xl font-semibold leading-[1.25] text-white">
                  {selectedPerson.name}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-white/80 transition-transform ${
                    isPersonMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`absolute left-0 right-0 top-full z-20 mt-2 flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/10 bg-[#1f1f1f] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-[opacity,transform] duration-150 ${
                  isPersonMenuOpen
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-1 opacity-0"
                }`}
                role="listbox"
                aria-label="Person options"
                aria-hidden={!isPersonMenuOpen}
              >
                {PERSON_OPTIONS.map((person) => (
                  <button
                    key={person.name}
                    type="button"
                    className={`w-full rounded-lg px-3 pt-2.5 pb-2 text-left text-sm transition-colors ${
                      person.name === selectedPerson.name
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                    role="option"
                    aria-selected={person.name === selectedPerson.name}
                    onClick={() => {
                      // Kick off loading immediately, then update state.
                      preloadPersonImage(person.image);
                      setSelectedPerson(person);
                      setIsPersonMenuOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="relative size-5 shrink-0 overflow-hidden rounded" aria-hidden>
                        <Image src={person.image} alt="" fill sizes="20px" unoptimized className="object-cover" />
                      </span>
                      <span>{person.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Buy / Sell + Market */}
          <div className="flex w-full flex-col pb-2">
            <div className="flex w-full items-center justify-between">
              <div ref={tabsRef} className="relative inline-flex gap-4">
                <span
                  className="absolute bottom-0 left-0 h-px bg-white transition-[width,transform] duration-200 ease-out"
                  style={{
                    width: `${tabIndicator.width}px`,
                    transform: `translateX(${tabIndicator.left}px)`,
                  }}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => setSide("buy")}
                  className={`py-3.5 text-left text-base font-semibold leading-[1.25] transition-colors ${
                    side === "buy" ? "text-white" : "text-white/60 hover:text-white/80"
                  }`}
                >
                  <span ref={buyTextRef}>Buy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSide("sell")}
                  className={`py-3.5 text-left text-base font-semibold leading-[1.25] transition-colors ${
                    side === "sell" ? "text-white" : "text-white/60 hover:text-white/80"
                  }`}
                >
                  <span ref={sellTextRef}>Sell</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOrderType((t) => (t === "market" ? "limit" : "market"))}
                className="flex items-center gap-1 text-base text-white/40 select-none transition-colors hover:text-white/60"
                style={{ fontVariantNumeric: "tabular-nums" }}
                aria-pressed={orderType === "limit"}
                aria-label={
                  orderType === "market"
                    ? "Switch to limit order"
                    : "Switch to market order"
                }
              >
                <span>{orderType === "market" ? "Market" : "Limit"}</span>
                <SwapVertical className="size-4 shrink-0 text-inherit" />
              </button>
            </div>
            <div className="h-px w-full bg-white/10" />
          </div>

          {/* Yes / No */}
          <div className="relative flex h-12 w-full overflow-hidden rounded-full bg-white/[0.04] p-0.5 transition-colors duration-200 hover:bg-white/[0.06]">
            <div
              className={`absolute bottom-0.5 top-0.5 w-[calc(50%-2px)] rounded-full transition-transform duration-200 ease-out ${
                outcome === "yes" ? "translate-x-0" : "translate-x-full"
              }`}
              style={{ background: outcome === "yes" ? "#009d59" : "#cf2f2f" }}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setOutcome("yes")}
              className="relative z-10 h-full w-1/2 rounded-full text-center text-base font-semibold leading-[1.25] text-white transition-[color,transform] duration-150 ease-out active:scale-[0.95]"
              aria-pressed={outcome === "yes"}
            >
              <span className="text-white/60">Yes</span>{" "}
              <span className="text-white">
                <NumberFlow value={selectedPerson.yesPercent} trend={0} />
                %
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOutcome("no")}
              className="relative z-10 h-full w-1/2 rounded-full text-center text-base font-semibold leading-[1.25] text-white transition-[color,transform] duration-150 ease-out active:scale-[0.95]"
              aria-pressed={outcome === "no"}
            >
              <span className="text-white/60">No</span>{" "}
              <span className="text-white">
                <NumberFlow value={100 - selectedPerson.yesPercent} trend={0} />
                %
              </span>
            </button>
          </div>

          {/* Leverage (buy only) */}
          {side === "buy" && (
            <div className="leverage-rainbow-outer">
              <div className="wrapper leverage-rainbow-wrapper">
                {/* Single slow linear shimmer (rotating highlight on the border). */}
                <div className="layer-blur" aria-hidden>
                  <div className="spin" />
                </div>
                <div className="layer-sharp" aria-hidden>
                  <div className="spin" />
                </div>
                <div className="highlight" aria-hidden />
                <div className="bg-mask" aria-hidden />
                <div className="content leverage-rainbow-content">
                  <div className="flex w-full items-start justify-between gap-2">
                    <span
                      className="text-base leading-[1.25] text-white/60"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      Leverage
                    </span>
                    <span className="text-4xl font-semibold leading-none text-white">
                      <NumberFlow
                        value={leverage}
                        suffix="×"
                        format={{
                          minimumFractionDigits: leverageIntegerDigits,
                          maximumFractionDigits: 1,
                        }}
                        className="leading-none"
                        // Match the glyph line box height by removing number-flow's default mask padding.
                        style={{ ["--number-flow-mask-height" as any]: "0em" }}
                      />
                    </span>
                  </div>
                  <div className="relative h-[23px] w-full">
                    <div
                      className={`absolute top-[-3px] z-10 flex h-7 w-14 cursor-grab items-center justify-center rounded-full bg-[#141414] px-2 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)] active:cursor-grabbing active:scale-[0.95] ${
                        isLeverageDragging
                          ? "transition-none"
                          : "transition-transform duration-150 ease-out"
                      }`}
                      style={{ left: thumbLeft }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        startLeverageDrag(event.clientX);
                      }}
                    >
                      <span className="w-full text-center text-xs font-semibold leading-[1.25] text-white">
                        {formatLeverage(leverage)}
                      </span>
                    </div>
                    <div
                      ref={trackRef}
                      tabIndex={0}
                      className="absolute left-0 right-0 top-[7px] h-2 cursor-pointer rounded-full bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={dotCount - 1}
                      aria-valuenow={leverageIdx}
                      aria-valuetext={formatLeverage(leverage)}
                      aria-label="Leverage"
                      onKeyDown={handleLeverageKeyDown}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        startLeverageDrag(event.clientX);
                      }}
                    >
                      {Array.from({ length: dotCount }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLeverageIdx(i)}
                          className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 transition-transform hover:scale-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                          style={{
                            // Dot centers match the thumb center at each step.
                            left: `calc(${stepCenterInsetPx}px + ${(i / Math.max(1, dotCount - 1))} * (100% - ${
                              stepCenterInsetPx * 2
                            }px))`,
                          }}
                          aria-label={`Leverage ${LEVERAGE_STEPS[i]}×`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Amount (market buy) / Shares (market sell) or Limit Price / Shares (limit) */}
          {orderType === "market" ? (
            side === "buy" ? (
              <div className="flex w-full flex-col gap-4 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
                <div className="flex w-full items-start justify-between gap-2">
                  <span
                    className="text-base leading-[1.25] text-white/60"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    Amount
                  </span>
                  <label
                    className={`relative inline-flex items-baseline gap-0.5 text-4xl font-semibold leading-none ${
                      amount > 0 ? "text-white" : "text-white/40"
                    }`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    <span aria-hidden>$</span>
                    <NumberFlow
                      value={amount}
                      format={{ useGrouping: false }}
                      trend={0}
                      className="leading-none"
                      // `number-flow` adds vertical padding based on `--number-flow-mask-height` (default 0.25em),
                      // which makes the element taller than the glyph line box. Setting it to `0em` keeps the
                      // height aligned with the text symbols/baseline.
                      style={{ ["--number-flow-mask-height" as any]: "0em" }}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={amount === 0 ? "" : String(amount)}
                      ref={amountInputRef}
                      onChange={(event) => handleAmountInputChange(event.target.value)}
                      className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-right text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                      aria-label="Amount input"
                    />
                  </label>
                </div>
                <div className="flex w-full gap-1.5">
                  {AMOUNT_PRESETS.map(({ label, increment }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleAmountShortcut(increment)}
                      className="min-w-0 flex h-[32px] flex-1 items-center justify-center rounded-full border-[1px] border-white/20 px-2 text-xs leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/30"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <AnimatePresence initial={false}>
                  {amount > 0 && (
                    <motion.div
                      className="w-full overflow-hidden"
                      initial={{ height: 0, opacity: 0, y: 8 }}
                      animate={{ height: "auto", opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: 6 }}
                      transition={{ duration: 0.28, ease: FLOW_EASE, delay: 0.08 }}
                    >
                      <div className="flex w-full flex-col gap-4">
                        <div className="h-px w-full bg-white/10" />
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-semibold leading-none text-white/60">To win</span>
                          <span className="text-4xl font-semibold leading-none text-[#5dd978] flex items-baseline gap-[2px]">
                            <span aria-hidden>$</span>
                            <NumberFlow
                              value={combinedToWinDollars}
                              trend={0}
                              format={{
                                useGrouping: true,
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }}
                              className="leading-none"
                              style={{ ["--number-flow-mask-height" as any]: "0em" }}
                            />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
                <div className="flex w-full items-start justify-between gap-2">
                  <span
                    className="text-base leading-[1.25] text-white/60"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    Shares
                  </span>
                  <label
                    className={`relative inline-flex items-baseline text-4xl font-semibold leading-none ${
                      shares > 0 ? "text-white" : "text-white/40"
                    }`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    <NumberFlow
                      value={shares}
                      format={{ useGrouping: false }}
                      trend={0}
                      className="leading-none"
                      style={{ ["--number-flow-mask-height" as any]: "0em" }}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={shares === 0 ? "" : String(shares)}
                      ref={sharesInputRef}
                      onChange={(event) => handleSharesInputChange(event.target.value)}
                      className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-right text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                      aria-label="Shares input"
                    />
                  </label>
                </div>
                <div className="flex w-full gap-1.5">
                  {SELL_SHARE_PRESETS.map(({ label, fraction }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleSellSharesShortcut(label, fraction)}
                      className="min-w-0 flex h-[32px] flex-1 items-center justify-center rounded-full border-[1px] border-white/20 px-2 text-xs leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/30"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="flex w-full flex-col gap-2 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
              <label
                id="leverage-limit-price-label"
                htmlFor="leverage-limit-price"
                className="block cursor-pointer text-base leading-[1.25] text-white/60"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                Limit Price
              </label>
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <div
                  className={`relative flex min-w-0 flex-1 items-baseline text-4xl font-semibold leading-none tabular-nums ${
                    limitPriceCents > 0 ? "text-white" : "text-white/40"
                  }`}
                >
                  <NumberFlow
                    value={limitPriceCents}
                    suffix="¢"
                    format={{ useGrouping: false }}
                    trend={0}
                    className="leading-none"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                  <input
                    id="leverage-limit-price"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={limitPriceCents === 0 ? "" : String(limitPriceCents)}
                    ref={limitPriceInputRef}
                    onChange={(event) =>
                      handleLimitPriceInputChange(event.target.value)
                    }
                    className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-left text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                    aria-labelledby="leverage-limit-price-label"
                  />
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setLimitPriceCents((c) => Math.max(0, c - 1))
                    }
                    className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 pb-0.5 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
                    aria-label="Decrease limit price"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLimitPriceCents((c) =>
                        Math.min(MAX_LIMIT_CENTS, c + 1),
                      )
                    }
                    className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 pb-0.5 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
                    aria-label="Increase limit price"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="h-px w-full bg-white/10" />
              <label
                id="leverage-shares-label"
                htmlFor="leverage-shares"
                className="block cursor-pointer text-base leading-[1.25] text-white/60"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                Shares
              </label>
              <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <div
                  className={`relative flex min-w-0 flex-1 items-baseline text-4xl font-semibold leading-none tabular-nums ${
                    shares > 0 ? "text-white" : "text-white/40"
                  }`}
                >
                  <NumberFlow
                    value={shares}
                    format={{ useGrouping: false }}
                    trend={0}
                    className="leading-none"
                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                  />
                  <input
                    id="leverage-shares"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={shares === 0 ? "" : String(shares)}
                    ref={sharesInputRef}
                    onChange={(event) =>
                      handleSharesInputChange(event.target.value)
                    }
                    className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-left text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                    aria-labelledby="leverage-shares-label"
                  />
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShares((s) => Math.max(0, s - 1))}
                    className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 pb-0.5 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
                    aria-label="Decrease shares"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setShares((s) => Math.min(MAX_SHARES, s + 1))
                    }
                    className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 pb-0.5 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
                    aria-label="Increase shares"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TP / SL (buy only) */}
          {side === "buy" && (
            <button
              type="button"
              onClick={openTpSlScreen}
              className="flex w-full items-center justify-between rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4 text-left transition-colors hover:bg-[linear-gradient(90deg,#2f2f2f_0%,#2b2b2b_100%)]"
            >
              <span
                className="text-base leading-[1.25] text-white/60"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {hasTpSlValues ? tpSlSummary : "Take Profit / Stop Loss"}
              </span>
              <ChevronRight className="size-4 shrink-0 text-white/40" />
            </button>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={() => {
              if (!canPlaceOrder) return;
              startTransition(() => setScreen("review"));
            }}
            className={`flex h-12 w-full items-center justify-center overflow-hidden rounded-full ${
              canPlaceOrder
                ? "bg-white transition-[transform,border-color] active:scale-[0.98]"
                : "bg-white/10"
            }`}
          >
            <span
              className={`text-center text-base font-semibold leading-[1.25] ${
                canPlaceOrder ? "text-[#141414]" : "text-white/40"
              }`}
            >
              {canPlaceOrder
                ? "Review"
                : orderType === "market"
                  ? side === "buy"
                    ? "Enter Amount"
                    : "Enter Shares"
                  : "Enter price & shares"}
            </span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {screen !== "order" && (
            <motion.div
              key="flow-overlay"
              initial={{ x: 28, opacity: 0 }}
              animate={screen === "closing" ? { x: 0, opacity: 0 } : { x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.28, ease: FLOW_EASE }}
              className="absolute inset-0 z-30 flex h-full flex-col gap-3 rounded-3xl bg-[#1d1d1d] p-4 overflow-hidden"
            >
              <motion.div
                className="pointer-events-none absolute inset-0 z-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: screen === "success" || screen === "closing" ? 0.45 : 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <GrainGradient
                  width={1280}
                  height={720}
                  colors={[
                    successScreenBackgroundColor,
                    "#1d1d1d",
                    successScreenBackgroundColor,
                    "#1d1d1d",
                  ]}
                  colorBack="#1d1d1d"
                  softness={0.55}
                  intensity={0.35}
                  noise={0.08}
                  shape="corners"
                  speed={0.12}
                />
              </motion.div>

              <AnimatePresence initial={false} mode="wait">
                {(screen === "placing" || screen === "placed") && (
                  <motion.div
                    key="status-shell"
                    className="relative z-10 flex flex-1 items-center justify-center"
                  >
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={screen}
                        initial={
                          screen === "placing"
                            ? { opacity: 0, y: 10, scale: 0.97 }
                            : { opacity: 0, y: 6, scale: 0.98 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={
                          screen === "placing"
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { opacity: 0, y: -6, scale: 0.98 }
                        }
                        transition={{
                          duration: screen === "placing" ? 0.68 : PLACED_ENTER_DURATION_S,
                          ease: FLOW_EASE,
                          delay: screen === "placing" ? PLACING_ENTER_DELAY_S : PLACED_ENTER_DELAY_S,
                        }}
                        className="flex flex-col items-center justify-center gap-6"
                      >
                        <motion.div
                          key={`${screen}-icon`}
                          initial={
                            screen === "placing"
                              ? { opacity: 0, y: 12, scale: 0.94 }
                              : { opacity: 0, y: 6, scale: 0.96 }
                          }
                          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                          transition={{
                            duration: screen === "placing" ? 1.9 : PLACED_ENTER_DURATION_S,
                            ease: FLOW_EASE,
                            delay: screen === "placing" ? PLACING_APPEAR_DELAY_MS / 1000 : PLACED_ENTER_DELAY_S,
                          }}
                          className="relative size-20"
                        >
                          {screen === "placing" ? (
                            <PlacingLoaderIcon className="size-20" />
                          ) : (
                            <PlacedCheckIcon className="size-20" />
                          )}
                        </motion.div>
                        <motion.p
                          initial={{ opacity: 0, y: screen === "placing" ? 10 : 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: screen === "placing" ? 1.9 : PLACED_ENTER_DURATION_S,
                            ease: FLOW_EASE,
                            delay: screen === "placing" ? PLACING_APPEAR_DELAY_MS / 1000 + 0.2 : PLACED_ENTER_DELAY_S,
                          }}
                          className="text-2xl font-semibold leading-none text-white"
                        >
                          {screen === "placing" ? "Placing order..." : "Order placed!"}
                        </motion.p>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

                {screen === "tp-sl" && (
                  <motion.div
                    key="tp-sl-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24, ease: FLOW_EASE }}
                    className="absolute inset-0 z-10 flex h-full flex-col gap-3 p-4"
                  >
                    <div className="flex flex-1 flex-col gap-4">
                      <p className="text-base font-semibold leading-[1.25] text-white">
                        Take Profit / Stop Loss
                      </p>

                      {/* Take Profit */}
                      <div className="flex w-full flex-col gap-2 rounded-3xl bg-white/[0.04] p-4">
                        <div
                          className="text-base leading-[1.25] text-white/60"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          Take Profit
                        </div>
                        <div className="flex w-full items-center justify-between">
                          <div
                            className={`relative flex items-baseline text-4xl font-semibold leading-none tabular-nums ${
                              pendingTakeProfitValue > 0 ? "text-white" : "text-white/40"
                            }`}
                          >
                            <NumberFlow
                              value={pendingTakeProfitValue}
                              suffix={pendingTakeProfitUnit === "$" ? "¢" : "%"}
                              format={{ useGrouping: false }}
                              trend={0}
                              className="leading-none"
                              style={{ ["--number-flow-mask-height" as any]: "0em" }}
                            />
                            <input
                              ref={takeProfitInputRef}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={pendingTakeProfitValue === 0 ? "" : String(pendingTakeProfitValue)}
                              onChange={(event) => handlePendingTakeProfitInputChange(event.target.value)}
                              className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-left text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                              aria-label="Take profit value"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {pendingTakeProfitValue > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingTakeProfitValue(0);
                                  takeProfitInputRef.current?.focus({ preventScroll: true });
                                }}
                                className="group flex h-8 items-center gap-[8px] rounded-full bg-white/[0.06] px-[12px] transition-colors hover:bg-white/[0.08] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                aria-label="Clear take profit"
                              >
                                <div className="transition-opacity group-hover:opacity-90">
                                  <PnLIcon iconSrcs={pnlIconObjectUrls ?? undefined} />
                                </div>
                                <span className="text-xs font-semibold leading-[1.25] text-white/60">PNL </span>
                                <span className="text-xs font-semibold leading-[1.25] text-[#5dd978] flex items-baseline gap-[2px]">
                                  <span aria-hidden>$</span>
                                  <NumberFlow
                                    value={pendingTakeProfitPnLDollars}
                                    trend={0}
                                    format={{ useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                                    className="leading-none"
                                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                                  />
                                </span>
                              </button>
                            )}
                            <div className="relative flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] p-1">
                              <div
                                className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#141414] transition-transform duration-200 ease-out ${
                                  pendingTakeProfitUnit === "$" ? "translate-x-0" : "translate-x-full"
                                }`}
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() => setPendingTakeProfitUnit("$")}
                                className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                                  pendingTakeProfitUnit === "$" ? "text-white" : "text-white/80 hover:text-white"
                                }`}
                                aria-pressed={pendingTakeProfitUnit === "$"}
                              >
                                $
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingTakeProfitUnit("%")}
                                className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                                  pendingTakeProfitUnit === "%" ? "text-white" : "text-white/80 hover:text-white"
                                }`}
                                aria-pressed={pendingTakeProfitUnit === "%"}
                              >
                                %
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stop Loss */}
                      <div className="flex w-full flex-col gap-2 rounded-3xl bg-white/[0.04] p-4">
                        <div
                          className="text-base leading-[1.25] text-white/60"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          Stop Loss
                        </div>
                        <div className="flex w-full items-center justify-between">
                          <div
                            className={`relative flex items-baseline text-4xl font-semibold leading-none tabular-nums ${
                              pendingStopLossValue > 0 ? "text-white" : "text-white/40"
                            }`}
                          >
                            <NumberFlow
                              value={pendingStopLossValue}
                              suffix={pendingStopLossUnit === "$" ? "¢" : "%"}
                              format={{ useGrouping: false }}
                              trend={0}
                              className="leading-none"
                              style={{ ["--number-flow-mask-height" as any]: "0em" }}
                            />
                            <input
                              ref={stopLossInputRef}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={pendingStopLossValue === 0 ? "" : String(pendingStopLossValue)}
                              onChange={(event) => handlePendingStopLossInputChange(event.target.value)}
                              className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-left text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                              aria-label="Stop loss value"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {pendingStopLossValue > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingStopLossValue(0);
                                  stopLossInputRef.current?.focus({ preventScroll: true });
                                }}
                                className="group flex h-8 items-center gap-[8px] rounded-full bg-white/[0.06] px-[12px] transition-colors hover:bg-white/[0.08] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                aria-label="Clear stop loss"
                              >
                                <div className="transition-opacity group-hover:opacity-90">
                                  <PnLIcon iconSrcs={pnlIconObjectUrls ?? undefined} />
                                </div>
                                <span className="text-xs font-semibold leading-[1.25] text-white/60">PNL </span>
                                <span className="text-xs font-semibold leading-[1.25] text-[#ff4d5e] flex items-baseline gap-[2px]">
                                  {pendingStopLossPnLDollars < 0 && <span aria-hidden>-</span>}
                                  <span aria-hidden>$</span>
                                  <NumberFlow
                                    value={Math.abs(pendingStopLossPnLDollars)}
                                    trend={0}
                                    format={{ useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                                    className="leading-none"
                                    style={{ ["--number-flow-mask-height" as any]: "0em" }}
                                  />
                                </span>
                              </button>
                            )}
                            <div className="relative flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] p-1">
                              <div
                                className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#141414] transition-transform duration-200 ease-out ${
                                  pendingStopLossUnit === "$" ? "translate-x-0" : "translate-x-full"
                                }`}
                                aria-hidden
                              />
                              <button
                                type="button"
                                onClick={() => setPendingStopLossUnit("$")}
                                className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                                  pendingStopLossUnit === "$" ? "text-white" : "text-white/80 hover:text-white"
                                }`}
                                aria-pressed={pendingStopLossUnit === "$"}
                              >
                                $
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingStopLossUnit("%")}
                                className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                                  pendingStopLossUnit === "%" ? "text-white" : "text-white/80 hover:text-white"
                                }`}
                                aria-pressed={pendingStopLossUnit === "%"}
                              >
                                %
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full gap-3">
                      <button
                        type="button"
                        onClick={() => startTransition(() => setScreen("order"))}
                        className="h-12 flex-1 rounded-full border-2 border-white/10 text-base font-semibold leading-[1.25] text-white transition-[transform,border-color] hover:border-white/20 active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={commitTpSl}
                        className="h-12 flex-1 rounded-full bg-white text-base font-semibold leading-[1.25] text-[#141414] transition-[transform] active:scale-[0.98]"
                      >
                        Set
                      </button>
                    </div>
                  </motion.div>
                )}

                {screen === "review" && (
                  <motion.div
                    key="review-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24, ease: FLOW_EASE }}
                    className="absolute inset-0 z-10 flex h-full flex-col gap-3 p-4"
                  >
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-4">
                        <div className="relative size-12 overflow-hidden rounded-lg">
                          <img
                            src={selectedPerson.image}
                            alt={selectedPerson.name}
                            className="absolute inset-0 size-full object-cover"
                          />
                        </div>
                        <p className="max-w-[230px] truncate text-center text-sm leading-[1.25] text-white/60">
                          {marketQuestion}
                        </p>
                        <h3 className="mb-1 text-center text-3xl font-semibold leading-none text-white">
                          {selectedPerson.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white"
                            style={{ backgroundColor: outcomeColor }}
                          >
                            {outcomeLabel} {outcomePercent}%
                          </span>
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                            {formatLeverage(leverage)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 rounded-3xl bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-2 text-sm leading-[1.25]">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Avg. Price</span>
                            <span className="inline-flex items-center gap-1 text-white">
                              <NumberFlow
                                value={reviewAvgPriceCents}
                                trend={0}
                                format={{ useGrouping: false }}
                                suffix="¢"
                                className="leading-none"
                                style={{ ["--number-flow-mask-height" as any]: "0em" }}
                              />
                              <CircularProgressIcon className="size-3" />
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Liquidation Price</span>
                            <span className="text-white">{liquidationPriceCents}¢</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Closing Fee</span>
                            <span className="text-white">5%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Cost</span>
                            <span className="text-white">{formatMoney(Math.round(totalDollars))}</span>
                          </div>
                        </div>
                        <div className="h-px w-full bg-white/10" />
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-semibold leading-none text-white/60">To win</span>
                          <span className="text-4xl font-semibold leading-none text-[#5dd978] flex items-baseline gap-[2px]">
                            <span aria-hidden>$</span>
                            <NumberFlow
                              value={combinedToWinDollars}
                              trend={0}
                              format={{
                                useGrouping: true,
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }}
                              className="leading-none"
                              style={{ ["--number-flow-mask-height" as any]: "0em" }}
                            />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full gap-3">
                      <button
                        type="button"
                        onClick={() => startTransition(() => setScreen("order"))}
                        className="h-12 flex-1 rounded-full border-2 border-white/10 text-base font-semibold leading-[1.25] text-white transition-[transform,border-color] hover:border-white/20 active:scale-[0.98]"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(() => setScreen("placing"))}
                        className="h-12 flex-1 rounded-full bg-white text-base font-semibold leading-[1.25] text-[#141414] transition-[transform] active:scale-[0.98]"
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                )}

                {(screen === "success" || screen === "closing") && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.34, ease: FLOW_EASE }}
                    className="relative z-10 flex h-full flex-col gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => startTransition(() => setScreen("closing"))}
                      className="absolute right-0 top-0 z-10 flex size-8 items-center justify-center rounded-full bg-white/[0.06] transition-[transform,background-color] hover:bg-white/[0.1] active:scale-[0.98]"
                      aria-label="Close success screen"
                    >
                      <Image src={IMG_CLOSE_ICON} alt="" width={16} height={16} unoptimized className="size-4" />
                    </button>
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-4">
                      <div className="relative size-12 overflow-hidden rounded-lg">
                        <img
                          src={selectedPerson.image}
                          alt={selectedPerson.name}
                          className="absolute inset-0 size-full object-cover"
                        />
                      </div>
                      <p className="max-w-[230px] truncate text-center text-sm leading-[1.25] text-white/60">
                        {marketQuestion}
                      </p>
                      <h3 className="mb-1 text-center text-3xl font-semibold leading-none text-white">
                        {selectedPerson.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white"
                          style={{ backgroundColor: outcomeColor }}
                        >
                          {outcomeLabel} {outcomePercent}%
                        </span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                          {formatLeverage(leverage)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-3xl bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between text-sm leading-[1.25]">
                        <span className="text-white/60">Cost</span>
                        <span className="text-white">{formatMoney(Math.round(totalDollars))}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm leading-[1.25]">
                        <span className="text-white/60">Avg. Entry</span>
                        <span className="text-white">{outcomePercent}¢</span>
                      </div>
                      <div className="h-px w-full bg-white/10" />
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-semibold leading-none text-white/60">To win</span>
                        <span className="text-4xl font-semibold leading-none text-[#5dd978] flex items-baseline gap-[2px]">
                          <span aria-hidden>$</span>
                          <NumberFlow
                            value={combinedToWinDollars}
                            trend={0}
                            format={{
                              useGrouping: true,
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }}
                            className="leading-none"
                            style={{ ["--number-flow-mask-height" as any]: "0em" }}
                          />
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="h-12 w-full rounded-full border-2 border-white/10 text-base font-semibold leading-[1.25] text-white transition-[transform,border-color] hover:border-white/20 active:scale-[0.98]"
                    >
                      Share on X
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
