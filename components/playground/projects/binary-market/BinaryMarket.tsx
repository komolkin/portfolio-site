"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import NumberFlow from "@number-flow/react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

/** Team logos pulled from the linked Figma node. */
const IMG_PHOENIX_SUNS =
  "https://www.figma.com/api/mcp/asset/2c481a3b-907e-49b4-9bea-8cc29409e0da";
const IMG_BOSTON_CELTICS =
  "https://www.figma.com/api/mcp/asset/0adb7443-14cd-4147-b0a4-519ecc55fac6";
const IMG_PNL_VECTOR_0 =
  "https://www.figma.com/api/mcp/asset/1dc54a4f-d104-4ce0-b429-8feb9261a180";
const IMG_PNL_VECTOR_1 =
  "https://www.figma.com/api/mcp/asset/a1ad4f7a-95ec-4ac6-b9bd-e05b14094bc0";
const IMG_PNL_VECTOR_2 =
  "https://www.figma.com/api/mcp/asset/ff2b7417-646d-4337-b863-9fee6cda7ad1";
const IMG_REVIEW_PRICE_ICON =
  "https://www.figma.com/api/mcp/asset/764e3502-60a9-4ee9-ac8f-57c54908b306";
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
  { name: "Phoenix Suns", image: IMG_PHOENIX_SUNS, yesPercent: 61 },
  { name: "Boston Celtics", image: IMG_BOSTON_CELTICS, yesPercent: 67 },
] as const;
const PHOENIX_SUNS_OPTION = PERSON_OPTIONS[0];
const BOSTON_CELTICS_OPTION = PERSON_OPTIONS[1];

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
const FLOW_ICON_SRCS = [IMG_CLOSE_ICON] as const;
type BinaryMarketScreen = "order" | "review" | "placing" | "placed" | "success";
const FLOW_EASE = [0.22, 1, 0.36, 1] as const;

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

function PlacedCheckIcon({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-20"} aria-hidden>
      <div className="absolute inset-0 rounded-full bg-white/10" />
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-full fill-none">
        <motion.path
          d="M28 40.5L36.5 49L52 33.5"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.28, ease: FLOW_EASE, delay: 0.02 }}
        />
      </svg>
    </div>
  );
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

export default function BinaryMarket() {
  const [selectedPerson, setSelectedPerson] = useState<(typeof PERSON_OPTIONS)[number]>(PERSON_OPTIONS[0]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [leverageIdx, setLeverageIdx] = useState(0);
  const [isLeverageDragging, setIsLeverageDragging] = useState(false);
  const [amount, setAmount] = useState(0);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPriceCents, setLimitPriceCents] = useState(0);
  const [shares, setShares] = useState(0);
  const [isTpSlOpen, setIsTpSlOpen] = useState(false);
  const [takeProfitUnit, setTakeProfitUnit] = useState<"$" | "%">("$");
  const [stopLossUnit, setStopLossUnit] = useState<"$" | "%">("$");
  const [takeProfitValue, setTakeProfitValue] = useState(0);
  const [stopLossValue, setStopLossValue] = useState(0);
  const [pnlIconObjectUrls, setPnlIconObjectUrls] =
    useState<readonly [string, string, string] | null>(null);
  const [screen, setScreen] = useState<BinaryMarketScreen | "closing">("order");
  const trackRef = useRef<HTMLDivElement | null>(null);
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
    // Preload flow icons so loading/check states swap without visual delay.
    FLOW_ICON_SRCS.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.decode?.().catch(() => {
        // Ignore decode errors; browser cache may still be warm enough.
      });
    });
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
    // When opening TP/SL, focus the first field so user can type immediately.
    if (!isTpSlOpen) return;
    requestAnimationFrame(() => {
      takeProfitInputRef.current?.focus({ preventScroll: true });
    });
  }, [isTpSlOpen]);

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

  useEffect(() => {
    if (screen !== "placing" && screen !== "placed") return;
    const timeoutId = window.setTimeout(() => {
      setScreen((prev) => {
        if (prev === "placing") return "placed";
        if (prev === "placed") return "success";
        return prev;
      });
    }, 3000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "closing") return;
    const timeoutId = window.setTimeout(() => {
      setScreen("order");
    }, 220);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [screen]);

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
  const formatTpSlSummaryValue = (value: number, unit: "$" | "%") =>
    value > 0 ? `${value}${unit === "$" ? "¢" : "%"}` : "–";
  const hasTpSlValues = takeProfitValue > 0 || stopLossValue > 0;
  const tpSlSummary = `TP: ${formatTpSlSummaryValue(takeProfitValue, takeProfitUnit)} / SL: ${formatTpSlSummaryValue(
    stopLossValue,
    stopLossUnit,
  )}`;
  const avgPriceCents = outcome === "yes" ? selectedPerson.yesPercent : 100 - selectedPerson.yesPercent;
  const totalDollars =
    orderType === "market"
      ? side === "buy"
        ? amount
        : (shares * pnlEntryPriceCents) / 100
      : (shares * pnlEntryPriceCents) / 100;
  const estimatedToWinDollars = totalDollars * leverage * (avgPriceCents / 100);
  const combinedToWinDollars = totalDollars + estimatedToWinDollars;
  const liquidationPriceCents = Math.max(1, Math.round(avgPriceCents / Math.max(1, leverage)));

  return (
    <div className="relative w-[380px] max-w-[calc(100vw-2rem)] p-0">
      <div
        className="relative flex w-full flex-col gap-2.5 overflow-hidden rounded-3xl p-4"
        style={{ background: "#1d1d1d" }}
      >
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
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xl font-semibold leading-[1.25] text-white">
              {selectedPerson.name}
            </span>
          </div>
        </div>

        {/* Buy / Sell + Market */}
        <div className="flex w-full flex-col pb-2">
          <div className="flex w-full items-center justify-between">
            <div ref={tabsRef} className="relative inline-flex gap-4">
              <span
                className="absolute bottom-0 left-0 h-px bg-white transition-[width,transform] duration-150 ease-out"
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
        <div className="relative flex h-12 w-full overflow-hidden rounded-full bg-white/[0.04] p-0.5 transition-colors duration-150 hover:bg-white/[0.06]">
          <div
            className={`absolute bottom-0.5 top-0.5 w-[calc(50%-2px)] rounded-full transition-transform duration-150 ease-out ${
              outcome === "yes" ? "translate-x-0" : "translate-x-full"
            }`}
            style={{ background: outcome === "yes" ? "#2D107F" : "#028544" }}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => {
              setOutcome("yes");
              setSelectedPerson(PHOENIX_SUNS_OPTION);
            }}
            className="relative z-10 h-full w-1/2 rounded-full text-center text-base font-semibold leading-[1.25] text-white transition-[color,transform] duration-100 ease-out active:scale-[0.95]"
            aria-pressed={outcome === "yes"}
          >
            <span className="text-white/60">PHX</span>{" "}
            <span className="text-white">
              <NumberFlow value={selectedPerson.yesPercent} trend={0} />
              %
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOutcome("no");
              setSelectedPerson(BOSTON_CELTICS_OPTION);
            }}
            className="relative z-10 h-full w-1/2 rounded-full text-center text-base font-semibold leading-[1.25] text-white transition-[color,transform] duration-100 ease-out active:scale-[0.95]"
            aria-pressed={outcome === "no"}
          >
            <span className="text-white/60">BOS</span>{" "}
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
            <div className="flex w-full flex-col gap-3 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
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
          <div className="flex w-full flex-col gap-2 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
            <button
              type="button"
              onClick={() => setIsTpSlOpen((prev) => !prev)}
              className="flex w-full items-center justify-between text-left"
              aria-expanded={isTpSlOpen}
              aria-controls="tp-sl-content"
            >
              <span
                className="text-base leading-[1.25] text-white/60"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {isTpSlOpen
                  ? "Take Profit"
                  : hasTpSlValues
                    ? tpSlSummary
                    : "Take Profit / Stop Loss"}
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-white/70 transition-transform ${
                  isTpSlOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isTpSlOpen && (
                <motion.div
                  id="tp-sl-content"
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-center justify-between">
                      <div
                        className={`relative flex items-baseline text-4xl font-semibold leading-none tabular-nums ${
                          takeProfitValue > 0 ? "text-white" : "text-white/40"
                        }`}
                      >
                        <NumberFlow
                          value={takeProfitValue}
                          suffix={takeProfitUnit === "$" ? "¢" : "%"}
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
                          value={takeProfitValue === 0 ? "" : String(takeProfitValue)}
                          onChange={(event) => handleTakeProfitInputChange(event.target.value)}
                          className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-left text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                          aria-label="Take profit value"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {takeProfitValue > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTakeProfitValue(0);
                              takeProfitInputRef.current?.focus({
                                preventScroll: true,
                              });
                            }}
                            className="group flex h-8 items-center gap-[8px] rounded-full bg-white/[0.06] px-[12px] transition-colors hover:bg-white/[0.08] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            aria-label="Clear take profit"
                          >
                            <div className="transition-opacity group-hover:opacity-90">
                              <PnLIcon
                                iconSrcs={pnlIconObjectUrls ?? undefined}
                              />
                            </div>
                            <span className="text-xs font-semibold leading-[1.25] text-white/60">
                              PNL{" "}
                            </span>
                            <span className="text-xs font-semibold leading-[1.25] text-[#5dd978] flex items-baseline gap-[2px]">
                              <span aria-hidden>$</span>
                              <NumberFlow
                                value={takeProfitPnLDollars}
                                trend={0}
                                format={{
                                  useGrouping: false,
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }}
                                className="leading-none"
                                style={{
                                  ["--number-flow-mask-height" as any]: "0em",
                                }}
                              />
                            </span>
                          </button>
                        )}
                        <div className="relative flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] p-1">
                          <div
                            className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#141414] transition-transform duration-200 ease-out ${
                              takeProfitUnit === "$" ? "translate-x-0" : "translate-x-full"
                            }`}
                            aria-hidden
                          />
                          <button
                            type="button"
                            onClick={() => setTakeProfitUnit("$")}
                            className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                              takeProfitUnit === "$"
                                ? "text-white"
                                : "text-white/80 hover:text-white"
                            }`}
                            aria-pressed={takeProfitUnit === "$"}
                          >
                            $
                          </button>
                          <button
                            type="button"
                            onClick={() => setTakeProfitUnit("%")}
                            className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                              takeProfitUnit === "%"
                                ? "text-white"
                                : "text-white/80 hover:text-white"
                            }`}
                            aria-pressed={takeProfitUnit === "%"}
                          >
                            %
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-px w-full bg-white/10" />

                    <div
                      className="text-base leading-[1.25] text-white/60"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      Stop Loss
                    </div>

                    <div className="flex w-full items-center justify-between">
                      <div
                        className={`relative flex items-baseline text-4xl font-semibold leading-none tabular-nums ${
                          stopLossValue > 0 ? "text-white" : "text-white/40"
                        }`}
                      >
                        <NumberFlow
                          value={stopLossValue}
                          suffix={stopLossUnit === "$" ? "¢" : "%"}
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
                          value={stopLossValue === 0 ? "" : String(stopLossValue)}
                          onChange={(event) =>
                            handleStopLossInputChange(event.target.value)
                          }
                          className="absolute inset-0 w-full bg-transparent p-0 m-0 font-inherit text-left text-transparent caret-white outline-none leading-none focus:outline-none focus-visible:outline-none"
                          aria-label="Stop loss value"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {stopLossValue > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setStopLossValue(0);
                              stopLossInputRef.current?.focus({
                                preventScroll: true,
                              });
                            }}
                            className="group flex h-8 items-center gap-[8px] rounded-full bg-white/[0.06] px-[12px] transition-colors hover:bg-white/[0.08] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                            aria-label="Clear stop loss"
                          >
                            <div className="transition-opacity group-hover:opacity-90">
                              <PnLIcon
                                iconSrcs={pnlIconObjectUrls ?? undefined}
                              />
                            </div>
                            <span className="text-xs font-semibold leading-[1.25] text-white/60">
                              PNL{" "}
                            </span>
                            <span className="text-xs font-semibold leading-[1.25] text-[#ff4d5e] flex items-baseline gap-[2px]">
                              {stopLossPnLDollars < 0 && (
                                <span aria-hidden>-</span>
                              )}
                              <span aria-hidden>$</span>
                              <NumberFlow
                                value={Math.abs(stopLossPnLDollars)}
                                trend={0}
                                format={{
                                  useGrouping: false,
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }}
                                className="leading-none"
                                style={{
                                  ["--number-flow-mask-height" as any]: "0em",
                                }}
                              />
                            </span>
                          </button>
                        )}
                        <div className="relative flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/[0.06] p-1">
                          <div
                            className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#141414] transition-transform duration-200 ease-out ${
                              stopLossUnit === "$"
                                ? "translate-x-0"
                                : "translate-x-full"
                            }`}
                            aria-hidden
                          />
                          <button
                            type="button"
                            onClick={() => setStopLossUnit("$")}
                            className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                              stopLossUnit === "$"
                                ? "text-white"
                                : "text-white/80 hover:text-white"
                            }`}
                            aria-pressed={stopLossUnit === "$"}
                          >
                            $
                          </button>
                          <button
                            type="button"
                            onClick={() => setStopLossUnit("%")}
                            className={`relative z-10 h-6 rounded-full px-3 text-base leading-[1.25] transition-colors ${
                              stopLossUnit === "%"
                                ? "text-white"
                                : "text-white/80 hover:text-white"
                            }`}
                            aria-pressed={stopLossUnit === "%"}
                          >
                            %
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={() => {
            if (!canPlaceOrder) return;
            setScreen("review");
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
              ? "Review Order"
              : orderType === "market"
                ? side === "buy"
                  ? "Enter Amount"
                  : "Enter Shares"
                : "Enter price & shares"}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {screen !== "order" && (
            <motion.div
              key="flow-overlay"
              initial={{ x: 28, opacity: 0 }}
              animate={screen === "closing" ? { x: 0, opacity: 0 } : { x: 0, opacity: 1 }}
              exit={{ x: 28, opacity: 0 }}
              transition={{ duration: 0.2, ease: FLOW_EASE }}
              className="absolute inset-0 z-30 flex h-full flex-col gap-3 rounded-3xl bg-[#1d1d1d] p-3"
            >
              <AnimatePresence initial={false} mode="wait">
                {(screen === "placing" || screen === "placed") && (
                  <motion.div
                    key="status-shell"
                    className="flex flex-1 items-center justify-center"
                  >
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={screen}
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: FLOW_EASE }}
                        className="flex flex-col items-center justify-center gap-6"
                      >
                        <motion.div
                          key={`${screen}-icon`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.45,
                            ease: FLOW_EASE,
                            delay: screen === "placing" ? 2 : 0,
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
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.45,
                            ease: FLOW_EASE,
                            delay: screen === "placing" ? 2 : 0,
                          }}
                          className="text-2xl font-semibold leading-none text-white"
                        >
                          {screen === "placing" ? "Placing order..." : "Order placed!"}
                        </motion.p>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}

                {screen === "review" && (
                  <motion.div
                    key="review-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: FLOW_EASE }}
                    className="absolute inset-0 flex h-full flex-col gap-3 p-3"
                  >
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-4">
                        <div className="relative size-12 overflow-hidden rounded-lg">
                          <Image src={selectedPerson.image} alt={selectedPerson.name} fill sizes="48px" unoptimized className="object-cover" />
                        </div>
                        <p className="max-w-[230px] truncate text-center text-sm leading-[1.25] text-white/60">
                          Phoenix Suns vs Boston Celtics: Will Phoenix Suns win?
                        </p>
                        <h3 className="mb-1 text-center text-3xl font-semibold leading-none text-white">{selectedPerson.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#2d107f] px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                            PHX
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
                              {avgPriceCents}¢
                              <img src={IMG_REVIEW_PRICE_ICON} alt="" className="size-2.5" />
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/60">Take Profit / Stop Loss</span>
                            <span className="text-white">{hasTpSlValues ? tpSlSummary : "-- / --"}</span>
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
                            <span className="text-white/60">Total</span>
                            <span className="text-white">{formatMoney(Math.round(totalDollars))}</span>
                          </div>
                        </div>
                        <div className="h-px w-full bg-white/10" />
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-semibold leading-none text-white/60">To win</span>
                          <span className="text-3xl font-semibold leading-none text-[#5dd978]">
                            ${combinedToWinDollars.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setScreen("order");
                        }}
                        className="h-12 flex-1 rounded-full border-2 border-white/10 text-base font-semibold leading-[1.25] text-white transition-[transform,border-color] hover:border-white/20 active:scale-[0.98]"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setScreen("placing")}
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
                    transition={{ duration: 0.18, ease: FLOW_EASE }}
                    className="flex h-full flex-col gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setScreen("closing");
                      }}
                      className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-white/[0.06] transition-[transform,background-color] hover:bg-white/[0.1] active:scale-[0.98]"
                      aria-label="Close success screen"
                    >
                      <img src={IMG_CLOSE_ICON} alt="" className="size-4" />
                    </button>
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 py-4">
                      <div className="relative size-12 overflow-hidden rounded-lg">
                        <Image src={selectedPerson.image} alt={selectedPerson.name} fill sizes="48px" unoptimized className="object-cover" />
                      </div>
                      <p className="max-w-[230px] truncate text-center text-sm leading-[1.25] text-white/60">
                        Phoenix Suns vs Boston Celtics: Will Phoenix Suns win?
                      </p>
                      <h3 className="mb-1 text-center text-3xl font-semibold leading-none text-white">{selectedPerson.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#2d107f] px-2.5 py-1 text-xs font-semibold leading-[1.25] text-white">
                          PHX
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
                        <span className="text-white">{avgPriceCents}¢</span>
                      </div>
                      <div className="h-px w-full bg-white/10" />
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-semibold leading-none text-white/60">To win</span>
                        <span className="text-3xl font-semibold leading-none text-[#5dd978]">
                          ${combinedToWinDollars.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="h-12 w-full rounded-full border-2 border-white/10 text-base font-semibold leading-[1.25] text-white transition-colors hover:border-white/20"
                    >
                      Share on X
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
