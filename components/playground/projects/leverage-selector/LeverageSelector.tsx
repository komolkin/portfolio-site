"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import NumberFlow from "@number-flow/react";
import Image from "next/image";

const IMG_SAOIRSE_RONAN =
  "https://www.figma.com/api/mcp/asset/ec9b83a9-2570-4f9a-baad-c9a30b43db87";
const IMG_FLORENCE_PUGH =
  "https://www.figma.com/api/mcp/asset/926aa346-dcc4-4714-bcde-fba09b1aa931";
const IMG_ZENDAYA = "https://www.figma.com/api/mcp/asset/e55fefb0-d52a-46c0-b24d-f97855abf7db";
const IMG_TIMOTHEE_CHALAMET =
  "https://www.figma.com/api/mcp/asset/eeb8bcdc-4c8c-48a6-af4f-2c0a2000fc1c";
const IMG_PAUL_MESCAL =
  "https://www.figma.com/api/mcp/asset/3c1cea27-7216-47cf-b669-9c38dfc57c6d";

const LEVERAGE_STEPS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

const AMOUNT_PRESETS = [
  { label: "1", value: 1 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "100", value: 100 },
  { label: "Max", value: 10_000 },
] as const;
const MAX_AMOUNT = 10_000;
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const personMenuRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const buyTextRef = useRef<HTMLSpanElement | null>(null);
  const sellTextRef = useRef<HTMLSpanElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const limitPriceInputRef = useRef<HTMLInputElement | null>(null);
  const sharesInputRef = useRef<HTMLInputElement | null>(null);
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
    // Make the active order-type field usable immediately (no extra click needed).
    requestAnimationFrame(() => {
      if (orderType === "market") {
        amountInputRef.current?.focus({ preventScroll: true });
      } else {
        limitPriceInputRef.current?.focus({ preventScroll: true });
      }
    });
  }, [orderType]);

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

  const handleAmountShortcut = (label: string, value: number) => {
    const presetValue = label === "Max" ? MAX_AMOUNT : value;
    setAmount((prev) => (prev === presetValue ? 0 : presetValue));
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
    setShares(Math.min(MAX_AMOUNT, parsed));
  };

  const canPlaceOrder =
    orderType === "market"
      ? amount > 0
      : limitPriceCents > 0 && shares > 0;

  return (
    <div className="relative w-[380px] max-w-[calc(100vw-2rem)] p-4">
      <div
        className="flex w-full flex-col gap-2.5 rounded-3xl p-4"
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

        {/* Leverage */}
        <div className="leverage-rainbow-outer">
          <div className="wrapper leverage-rainbow-wrapper">
            {/* Shimmer border layers (replaces the old rainbow spinner border). */}
            <div className="layer-blur" aria-hidden>
              <div className="slide">
                <div className="spin" />
              </div>
            </div>
            <div className="layer-sharp" aria-hidden>
              <div className="slide">
                <div className="spin" />
              </div>
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

        {/* Amount (market) or Limit Price / Shares (limit) */}
        {orderType === "market" ? (
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
              {AMOUNT_PRESETS.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleAmountShortcut(label, value)}
                  className="min-w-0 flex h-[32px] flex-1 items-center justify-center rounded-full border-[1px] border-white/20 px-4 text-xs leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/30"
                >
                  {label === "Max" ? label : <NumberFlow value={value} trend={0} />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
            <label
              id="leverage-limit-price-label"
              htmlFor="leverage-limit-price"
              className="block cursor-text text-base leading-[1.25] text-white/60"
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
                  className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
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
                  className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
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
              className="block cursor-text text-base leading-[1.25] text-white/60"
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
                  className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
                  aria-label="Decrease shares"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setShares((s) => Math.min(MAX_AMOUNT, s + 1))
                  }
                  className="flex h-8 w-10 items-center justify-center rounded-full border-[1.5px] border-white/10 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/20"
                  aria-label="Increase shares"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TP / SL */}
        <button
          type="button"
          className="flex w-full flex-col gap-2 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4 text-left"
        >
          <div className="flex w-full items-center justify-between">
            <span
              className="text-base leading-[1.25] text-white/60"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              Take Profit / Stop Loss
            </span>
            <ChevronDown className="size-4 shrink-0 text-white/70" />
          </div>
        </button>

        {/* CTA */}
        <button
          type="button"
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
              ? "Place Order"
              : orderType === "market"
                ? "Enter Amount"
                : "Enter price & shares"}
          </span>
        </button>
      </div>
    </div>
  );
}
