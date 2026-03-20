"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
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
const YES_PERCENT = 62;
const NO_PERCENT = 38;
const PERSON_OPTIONS = [
  { name: "Timothée Chalamet", image: IMG_TIMOTHEE_CHALAMET },
  { name: "Zendaya", image: IMG_ZENDAYA },
  { name: "Florence Pugh", image: IMG_FLORENCE_PUGH },
  { name: "Paul Mescal", image: IMG_PAUL_MESCAL },
  { name: "Saoirse Ronan", image: IMG_SAOIRSE_RONAN },
] as const;

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

function formatLeverage(n: number) {
  return `${n}×`;
}

function formatMoney(n: number) {
  if (n >= 1000) return `$${n.toLocaleString("en-US")}`;
  return `$${n}`;
}

function useSparkle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isHovering = useRef(false);
  const mouse = useRef({ x: 0, y: 0 });
  const particles = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      symbol: string;
      color: string;
      size: number;
    }>
  >([]);
  const raf = useRef<number | null>(null);

  // EXACT symbols used (copy these)
  const SYMBOLS = ["✦", "˚", "⁺", "⟠", "˖", "◎", "⋅", "⊹", "⋆", "★", "✧", "₿", "·", "∘"] as const;
  // EXACT colors used (match rainbow border)
  const COLORS = [
    "#efcb39",
    "#39ef51",
    "#39efcb",
    "#39b2ef",
    "#9a5ff2",
    "#ef39cb",
    "#8239ef",
    "#ff9900",
    "#eb2314",
  ] as const;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      particles.current.push({
        x: mouse.current.x,
        y: mouse.current.y,
        vx: (Math.random() - 0.5) * 2,
        vy: -(Math.random() * 2.5 + 0.5),
        alpha: 1,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 9, // 9–19px, matches original
      });
    };

    let lastSpawn = 0;
    const loop = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isHovering.current && t - lastSpawn > 40) {
        // ~25 particles/sec
        spawn();
        lastSpawn = t;
      }

      particles.current = particles.current.filter((p) => p.alpha > 0.01);
      for (const p of particles.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // slight gravity
        p.alpha -= 0.018; // fade speed
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px "SF Mono", "Fira Code", monospace`;
        ctx.fillText(p.symbol, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    canvasRef,
    onMouseEnter: (e: MouseEvent<HTMLDivElement>) => {
      isHovering.current = true;
      mouse.current = { x: e.clientX, y: e.clientY };
    },
    onMouseLeave: () => {
      isHovering.current = false;
    },
    onMouseMove: (e: MouseEvent<HTMLDivElement>) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    },
  };
}

export default function LeverageSelector() {
  const [selectedPerson, setSelectedPerson] = useState<(typeof PERSON_OPTIONS)[number]>(PERSON_OPTIONS[0]);
  const [isPersonMenuOpen, setIsPersonMenuOpen] = useState(false);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [outcome, setOutcome] = useState<"yes" | "no">("yes");
  const [leverageIdx, setLeverageIdx] = useState(0);
  const [amount, setAmount] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const personMenuRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const buyTextRef = useRef<HTMLSpanElement | null>(null);
  const sellTextRef = useRef<HTMLSpanElement | null>(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  const leverage = LEVERAGE_STEPS[leverageIdx];
  const dotCount = LEVERAGE_STEPS.length;
  const ratio = leverageIdx / Math.max(1, dotCount - 1);
  const thumbWidthPx = 56;
  const thumbLeft = `calc(${ratio} * (100% - ${thumbWidthPx}px))`;
  const leverageIntegerDigits = Number.isInteger(leverage) ? 0 : 1;

  const sparkle = useSparkle();

  useEffect(() => {
    // Warm up browser cache so avatar images do not blink on first open.
    const preloaded = PERSON_OPTIONS.map((person) => {
      const img = new window.Image();
      img.src = person.image;
      return img;
    });
    return () => {
      preloaded.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, []);

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
    const handlePointerDown = (event: MouseEvent) => {
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
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.min(1, Math.max(0, raw));
      const nextIdx = Math.round(clamped * (dotCount - 1));
      setLeverageIdx(nextIdx);
    },
    [dotCount],
  );

  const startLeverageDrag = useCallback(
    (startX: number) => {
      updateLeverageFromClientX(startX);

      const onMove = (event: PointerEvent) => {
        updateLeverageFromClientX(event.clientX);
      };
      const onUp = () => {
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

  return (
    <div className="relative w-[380px] max-w-[calc(100vw-2rem)] p-4">
      {/* Fixed canvas sparkle overlay (particles drawn via canvas fillText, not DOM). */}
      <canvas
        ref={sparkle.canvasRef}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
      />
      <div
        className="flex w-full flex-col gap-2.5 rounded-3xl p-4"
        style={{ background: "#1d1d1d" }}
      >
        {/* Profile row */}
        <div className="flex w-full items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={selectedPerson.image}
              alt={selectedPerson.name}
              fill
              sizes="48px"
              unoptimized
              className="object-cover"
            />
          </div>
          <div ref={personMenuRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              className="flex min-w-0 w-full items-center gap-2 text-left"
              aria-haspopup="listbox"
              aria-expanded={isPersonMenuOpen}
              onClick={() => setIsPersonMenuOpen((prev) => !prev)}
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
            <div
              className="flex items-center gap-1 text-base text-white"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              <span>Market</span>
            </div>
          </div>
          <div className="h-px w-full bg-white/10" />
        </div>

        {/* Yes / No */}
        <div className="relative flex w-full overflow-hidden rounded-full bg-white/[0.04] p-0.5">
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
            className="relative z-10 w-1/2 rounded-full py-3.5 text-center text-base font-semibold leading-[1.25] transition-colors text-white"
            aria-pressed={outcome === "yes"}
          >
            <span className="text-white/60">Yes</span>{" "}
            <span className="text-white">
              <NumberFlow value={YES_PERCENT} trend={0} />
              %
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOutcome("no")}
            className="relative z-10 w-1/2 rounded-full py-3.5 text-center text-base font-semibold leading-[1.25] transition-colors text-white"
            aria-pressed={outcome === "no"}
          >
            <span className="text-white/60">No</span>{" "}
            <span className="text-white">
              <NumberFlow value={NO_PERCENT} trend={0} />
              %
            </span>
          </button>
        </div>

        {/* Leverage */}
        <div className="wrapper leverage-rainbow-wrapper">
          <div className="spinner" />
          <div className="mask" />
          <div className="content leverage-rainbow-content">
            <div className="flex w-full items-start justify-between gap-2">
              <span
                className="text-base leading-[1.25] text-white/60"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                Leverage
              </span>
              <span className="text-4xl font-semibold leading-[1.25] text-white">
                <NumberFlow
                  value={leverage}
                  suffix="×"
                  format={{ minimumFractionDigits: leverageIntegerDigits, maximumFractionDigits: 1 }}
                />
              </span>
            </div>
            <div className="relative h-[23px] w-full">
              <div
                className="absolute top-[-3px] z-10 flex h-7 w-14 cursor-grab items-center justify-center rounded-full bg-[#141414] px-2 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-transform active:cursor-grabbing active:scale-[0.95]"
                style={{ left: thumbLeft }}
                onMouseEnter={sparkle.onMouseEnter}
                onMouseLeave={sparkle.onMouseLeave}
                onMouseMove={sparkle.onMouseMove}
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
                    style={{ left: `${(i / Math.max(1, dotCount - 1)) * 100}%` }}
                    aria-label={`Leverage ${LEVERAGE_STEPS[i]}×`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="flex w-full flex-col gap-3 rounded-3xl bg-[linear-gradient(90deg,#2a2a2a_0%,#262626_100%)] p-4">
          <div className="flex w-full items-start justify-between gap-2">
            <span
              className="text-base leading-[1.25] text-white/60"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              Amount
            </span>
            <label
              className={`relative inline-flex items-center gap-0.5 text-4xl font-semibold leading-[1.25] ${
                amount > 0 ? "text-white" : "text-white/40"
              }`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              <span aria-hidden>$</span>
              <NumberFlow value={amount} format={{ useGrouping: false }} trend={0} />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount}
                onChange={(event) => handleAmountInputChange(event.target.value)}
                className="absolute inset-0 w-full bg-transparent text-right text-transparent caret-white outline-none"
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
                className="min-w-0 flex h-[34px] flex-1 items-center justify-center rounded-full border-2 border-white/20 px-4 text-sm leading-[1.25] text-white transition-[transform,border-color] active:scale-[0.95] hover:border-white/30"
              >
                {label === "Max" ? label : <NumberFlow value={value} trend={0} />}
              </button>
            ))}
          </div>
        </div>

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
            amount > 0
              ? "bg-white transition-[transform,border-color] active:scale-[0.98]"
              : "bg-white/10"
          }`}
        >
          <span
            className={`text-center text-base font-semibold leading-[1.25] ${
              amount > 0 ? "text-[#141414]" : "text-white/40"
            }`}
          >
            {amount > 0 ? "Place Order" : "Enter Amount"}
          </span>
        </button>
      </div>
    </div>
  );
}
