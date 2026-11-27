"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import NumberFlow from "@number-flow/react";
import { accentPair } from "glimm";
import { GlimmScope, type GlimmScopeHandle } from "glimm/react";
import { TextMorph } from "torph/react";
import type { PolymarketMarketData } from "@/lib/polymarketscan";
import { getMarketOddsSides } from "@/lib/polymarketscan";
import { allo, instrumentSans } from "@/lib/fonts";
import { hapticTap } from "@/lib/haptics";
import type { UserPlacedTrade } from "./userTrades";
import type { PolymarketWalletPosition } from "@/lib/polymarketscan";
import type { SharePositionPayload } from "./SharePositionModal";
import { GifThumb, TakeComposer } from "./richMessage";
import { AmountKeypad, SheetPager, applyAmountKey, ui } from "./ui";
import {
  OutcomeSticker,
  outcomeStickerToneFromLabel,
} from "@/components/worm-app-3/OutcomeSticker";

const SUCCESS_GLIMM_YES = accentPair("#1DB954", "#6B4EFF");
const SUCCESS_GLIMM_NO = accentPair("#FF3B5C", "#6B4EFF");
const SHEET_SLIDE_MS = 320;
const SHEET_SLIDE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const CLOSE_THRESHOLD_PX = 72;
const QUICK_AMOUNTS = [5, 25, 100] as const;

const nfMaskStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

const WIN_SPARKLES = [
  { top: "2%", left: "4%", size: 12, delay: "0ms", color: "#FFFFFF" },
  { top: "8%", right: "2%", size: 9, delay: "120ms", color: "#FFFFFFB3" },
  { top: "42%", left: "-2%", size: 7, delay: "220ms", color: "#FFFFFF" },
  { top: "48%", right: "-4%", size: 11, delay: "80ms", color: "#FFFFFF" },
  { bottom: "6%", left: "10%", size: 8, delay: "180ms", color: "#FFFFFFB3" },
  { bottom: "0%", right: "12%", size: 10, delay: "260ms", color: "#FFFFFF" },
  { top: "-6%", left: "42%", size: 8, delay: "40ms", color: "#FFFFFF" },
  { bottom: "-8%", left: "48%", size: 7, delay: "300ms", color: "#FFFFFFB3" },
] as const;

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatUsdPrecise(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatUsdCents(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function shortenTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 32) return trimmed;
  return `${trimmed.slice(0, 30).trim()}…`;
}

function outcomeTeam(market: PolymarketMarketData, outcome: string) {
  const label = outcome.trim().toLowerCase();
  if (!label) return null;
  const teams = [
    market.liveGame?.away,
    market.liveGame?.home,
    ...(market.teams ?? []),
  ].filter((team): team is NonNullable<typeof team> => Boolean(team?.name));
  return (
    teams.find((team) => {
      const name = team.name.toLowerCase();
      return name === label || name.includes(label) || label.includes(name);
    }) ?? null
  );
}

function isBinaryOutcome(outcome: string): boolean {
  const value = outcome.trim().toLowerCase();
  return value === "yes" || value === "no";
}

function SlideChevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M10 3.5L5.5 8L10 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function hexRgb(hex: string | null | undefined): [number, number, number] | null {
  const match = hex?.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Team color pulled toward a mid-tone so very light or dark kits still glow. */
function glowRgb(hex: string | null | undefined, fallback: [number, number, number]) {
  const rgb = hexRgb(hex) ?? fallback;
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  const scale = lum > 0.6 ? 0.6 / lum : lum < 0.18 ? 1.6 : 1;
  return rgb.map((c) => Math.min(255, Math.round(c * scale))) as [
    number,
    number,
    number,
  ];
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3.5 3.5l9 9M12.5 3.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SUCCESS_AUTO_CLOSE_MS = 5000;
const CLOSE_RING_SIZE = 40;
const CLOSE_RING_STROKE = 2.25;

function CloseCountdownButton({
  light,
  onClose,
}: {
  light: boolean;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 0 : SUCCESS_AUTO_CLOSE_MS;
    const id = window.setTimeout(() => onCloseRef.current(), delay);
    return () => window.clearTimeout(id);
  }, []);

  const radius = (CLOSE_RING_SIZE - CLOSE_RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className={`relative flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
        light
          ? "bg-black/[0.06] text-black/70 hover:bg-black/[0.1] hover:text-black"
          : "bg-white/[0.1] text-white/85 hover:bg-white/[0.16] hover:text-white"
      }`}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 -rotate-90"
        width={CLOSE_RING_SIZE}
        height={CLOSE_RING_SIZE}
        viewBox={`0 0 ${CLOSE_RING_SIZE} ${CLOSE_RING_SIZE}`}
      >
        <circle
          cx={CLOSE_RING_SIZE / 2}
          cy={CLOSE_RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke={light ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.14)"}
          strokeWidth={CLOSE_RING_STROKE}
        />
        <circle
          cx={CLOSE_RING_SIZE / 2}
          cy={CLOSE_RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke={light ? "#111111" : "#FFFFFF"}
          strokeWidth={CLOSE_RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="trade-close-ring"
          style={
            {
              ["--close-ring-length"]: circumference,
              animationDuration: `${SUCCESS_AUTO_CLOSE_MS}ms`,
            } as CSSProperties
          }
        />
      </svg>
      <CloseIcon className="relative z-[1] h-4 w-4" />
    </button>
  );
}

const SLIDE_KNOB_PX = 48;
const SLIDE_PAD_PX = 4;

function SlideToConfirm({
  label,
  onConfirm,
  tone = "dark",
}: {
  label: string;
  onConfirm: () => void;
  tone?: "dark" | "light";
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const light = tone === "light";

  const maxX = () =>
    Math.max(
      0,
      (trackRef.current?.offsetWidth ?? 0) - SLIDE_KNOB_PX - SLIDE_PAD_PX * 2,
    );

  const confirm = () => {
    if (done) return;
    setX(maxX());
    setDone(true);
    window.setTimeout(onConfirm, 220);
  };

  const progress = maxX() > 0 ? x / maxX() : 0;

  return (
    <div
      ref={trackRef}
      className={`relative isolate h-14 w-full select-none overflow-hidden rounded-full ${
        light ? "bg-black/[0.06]" : "bg-[#141416]"
      }`}
    >
      {!light ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <div className="live-preview-ember-glow-green absolute -inset-[35%]" />
          <div className="live-preview-ember-edge-green absolute inset-0 rounded-[inherit]" />
        </div>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#16A34A]"
        style={{
          opacity: progress,
          transition: dragging
            ? "none"
            : "opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />
      <span
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[15px] font-semibold ${
          light ? "text-black/45" : "text-white"
        }`}
        style={{ opacity: Math.max(0, 1 - progress * 1.4) }}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={label}
        onPointerDown={(e) => {
          if (done) return;
          setDragging(true);
          startXRef.current = e.clientX - x;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setX(Math.min(maxX(), Math.max(0, e.clientX - startXRef.current)));
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
          if (x >= maxX() * 0.85) confirm();
          else setX(0);
        }}
        onPointerCancel={() => {
          setDragging(false);
          if (!done) setX(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            confirm();
          }
        }}
        className={`absolute z-20 flex touch-none items-center justify-center rounded-full bg-white text-[#16A34A] shadow-[0_2px_8px_rgba(0,0,0,0.18)] outline-none focus-visible:ring-2 ${
          light ? "focus-visible:ring-black/20" : "focus-visible:ring-white/60"
        }`}
        style={{
          top: SLIDE_PAD_PX,
          left: SLIDE_PAD_PX,
          width: SLIDE_KNOB_PX,
          height: SLIDE_KNOB_PX,
          transform: `translateX(${x}px)`,
          transition: dragging
            ? "none"
            : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <SlideChevron className="h-4 w-4" />
      </button>
    </div>
  );
}

function SparkleIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 0.4 7.15 4.85 11.6 6 7.15 7.15 6 11.6 4.85 7.15 0.4 6 4.85 4.85Z" />
    </svg>
  );
}

function ToWinHero({
  value,
  tone = "dark",
}: {
  value: number;
  tone?: "dark" | "light";
}) {
  const [shown, setShown] = useState(0);
  const light = tone === "light";
  const appFont = light ? allo.className : instrumentSans.className;

  useEffect(() => {
    setShown(0);
    const id = window.requestAnimationFrame(() => {
      setShown(Math.round(value));
    });
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center">
      <p
        className={`text-[15px] font-semibold ${
          light ? "text-black" : "text-white"
        }`}
      >
        To win
      </p>
      <div className="relative mt-1.5 inline-flex items-baseline px-7 py-3">
        {WIN_SPARKLES.map((sparkle, index) => {
          const color = light
            ? sparkle.color === "#FFFFFF"
              ? "#6B4EFF"
              : "#1DB954"
            : sparkle.color;
          return (
            <span
              key={index}
              aria-hidden
              className="pointer-events-none absolute animate-[trade-sparkle_1.15s_ease-out_both]"
              style={{
                top: "top" in sparkle ? sparkle.top : undefined,
                bottom: "bottom" in sparkle ? sparkle.bottom : undefined,
                left: "left" in sparkle ? sparkle.left : undefined,
                right: "right" in sparkle ? sparkle.right : undefined,
                color,
                animationDelay: sparkle.delay,
                filter:
                  color === "#FFFFFF"
                    ? undefined
                    : `drop-shadow(0 0 4px ${color})`,
              }}
            >
              <SparkleIcon size={sparkle.size} />
            </span>
          );
        })}
        <p
          className={`relative z-10 inline-flex items-baseline text-[64px] font-semibold leading-none tracking-tight text-[#00D54B] animate-[trade-win-pop_0.55s_cubic-bezier(0.32,0.72,0,1)_both] ${appFont}`}
        >
          $
          <NumberFlow
            value={shown}
            trend={1}
            format={{ useGrouping: true }}
            style={nfMaskStyle}
          />
        </p>
      </div>
    </div>
  );
}

export default function TradeFlowModal({
  market,
  initialOutcome,
  initialAmount,
  wallet,
  handle,
  referralCode,
  maxAmount,
  nested = false,
  theme = "dark",
  sheetHeight,
  onClose,
  onComplete,
  onShare,
}: {
  market: PolymarketMarketData;
  initialOutcome: string | null;
  /** Prefills the amount keypad (whole dollars). */
  initialAmount?: number | null;
  wallet: string;
  handle: string;
  referralCode: string;
  maxAmount: number;
  nested?: boolean;
  theme?: "dark" | "light";
  sheetHeight?: CSSProperties["height"];
  onClose: () => void;
  onComplete: (
    trade: UserPlacedTrade,
    position: PolymarketWalletPosition,
  ) => void;
  onShare: (payload: SharePositionPayload) => void;
}) {
  const light = theme === "light";
  const appFont = light ? allo.className : instrumentSans.className;
  const oddsSides = useMemo(() => getMarketOddsSides(market), [market]);
  const [step, setStep] = useState<"amount" | "confirm" | "success">("amount");
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const [confirmOrigin, setConfirmOrigin] = useState<CSSProperties | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const confirmingRef = useRef(false);
  const [outcome] = useState(initialOutcome ?? oddsSides[0]?.label ?? "Yes");
  const [amountDigits, setAmountDigits] = useState(() => {
    const fallback = Math.min(1, Math.floor(maxAmount));
    if (initialAmount == null || !Number.isFinite(initialAmount)) {
      return fallback > 0 ? String(fallback) : "";
    }
    const capped = Math.max(
      0,
      Math.min(Math.floor(maxAmount), Math.floor(initialAmount)),
    );
    return capped > 0 ? String(capped) : fallback > 0 ? String(fallback) : "";
  });
  const [takeOpen, setTakeOpen] = useState(false);
  const [takeMessage, setTakeMessage] = useState("");
  const [takeGif, setTakeGif] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    trade: UserPlacedTrade;
    position: PolymarketWalletPosition;
  } | null>(null);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const glimmScopeRef = useRef<GlimmScopeHandle>(null);
  const glimmRootRef = useRef<HTMLDivElement>(null);

  const selectedSide =
    oddsSides.find(
      (side) => side.label.toLowerCase() === outcome.toLowerCase(),
    ) ?? oddsSides[0];
  const entryPrice = selectedSide?.price ?? market.yesPrice;
  const fullHeaderTitle =
    (market.groupItemTitle ?? "").trim() || market.title.trim();
  const team = outcomeTeam(market, outcome);
  const binary = isBinaryOutcome(outcome);
  // Full title — CSS line-clamp handles 2-line truncation on amount/success.
  const outcomeTitle = team?.name ?? (binary ? fullHeaderTitle : outcome);
  const outcomeImage = team?.logo ?? market.image;
  const outcomeIsNo =
    outcome.toLowerCase() === "no" || selectedSide?.side === "no";
  const outcomeStickerTone = outcomeIsNo
    ? "no"
    : outcomeStickerToneFromLabel(outcome);
  const outcomeStickerTilt = outcomeIsNo ? -5 : 5;

  const glow = glowRgb(
    (team as { color?: string | null } | null)?.color,
    selectedSide?.side === "no" ? [255, 55, 95] : [0, 213, 75],
  );
  const glowCss = glow.join(", ");
  const shareLink = `https://polymarket.app/r/${referralCode}`;

  const amountCap = Math.max(1, Math.floor(maxAmount));
  const amount = amountDigits === "" ? 0 : Number(amountDigits);
  const amountValid = amount >= 1;
  const shares = entryPrice > 0 ? amount / entryPrice : 0;
  const toWin = shares;

  const success = step === "success";

  const goTo = (next: "amount" | "confirm" | "success", dir: 1 | -1 = 1) => {
    setStepDir(dir);
    setStep(next);
  };

  const closeSheet = () => {
    if (confirmingRef.current) return;
    setOpen(false);
    setDrawerOffset(0);
    setIsDragging(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), SHEET_SLIDE_MS);
  };

  const pressKey = (key: string) => {
    setAmountDigits((prev) => applyAmountKey(prev, key, amountCap));
  };

  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;
  const pressKeyRef = useRef(pressKey);
  pressKeyRef.current = pressKey;
  const amountValidRef = useRef(amountValid);
  amountValidRef.current = amountValid;

  const submitTrade = () => {
    if (confirmingRef.current || !amountValid) return;
    const finalAmount = amount;
    const finalShares = entryPrice > 0 ? finalAmount / entryPrice : 0;
    const caption = takeMessage.trim() || null;
    const trade: UserPlacedTrade = {
      side: "BUY",
      outcome,
      price: entryPrice,
      amountUsd: finalAmount,
      marketTitle: market.title,
      marketSlug: market.slug || market.marketId,
      marketCategory: market.category,
      wallet,
      timestamp: new Date().toISOString(),
      txHash: `local-${Date.now()}`,
      totalPnl: null,
      winRate: null,
      tradeCount: null,
      userCaption: caption,
      userGifUrl: takeGif,
    };
    const position: PolymarketWalletPosition = {
      marketTitle: market.title,
      marketSlug: market.slug || market.marketId,
      outcome,
      shares: finalShares,
      avgPrice: entryPrice,
      markPrice: entryPrice,
      valueUsd: finalShares * entryPrice,
      pnlUsd: 0,
      image: market.image,
    };

    const revealSuccess = () => {
      confirmingRef.current = false;
      setConfirmOrigin(null);
      setCompleted({ trade, position });
      onComplete(trade, position);
      goTo("success");
    };

    const root = glimmRootRef.current;
    const box = root?.getBoundingClientRect();
    const at: [number, number] | undefined = box
      ? [box.width / 2, box.height - 20]
      : undefined;

    const transitionToSuccess = () => {
      if (glimmScopeRef.current) {
        glimmScopeRef.current.play({ at, change: revealSuccess });
      } else {
        revealSuccess();
      }
    };

    if (!light) {
      transitionToSuccess();
      return;
    }

    const sheet = sheetRef.current?.getBoundingClientRect();
    const button = confirmButtonRef.current?.getBoundingClientRect();
    if (!sheet || !button) {
      transitionToSuccess();
      return;
    }

    confirmingRef.current = true;
    setConfirmOrigin({
      "--confirm-x": `${button.left - sheet.left + button.width / 2}px`,
      "--confirm-y": `${button.top - sheet.top + button.height / 2}px`,
      "--confirm-width": `${button.width}px`,
    } as CSSProperties);
    confirmTimerRef.current = window.setTimeout(() => {
      confirmTimerRef.current = null;
      transitionToSuccess();
    }, 2000);
  };

  const submitTradeRef = useRef(submitTrade);
  submitTradeRef.current = submitTrade;

  useEffect(() => {
    // Give a newly mounted sheet a frame at its offscreen position before sliding it in.
    let id = window.requestAnimationFrame(() => {
      id = window.requestAnimationFrame(() => setOpen(true));
    });
    return () => {
      window.cancelAnimationFrame(id);
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmingRef.current) return;
      const target = e.target as HTMLElement | null;
      const typing = Boolean(target?.closest("input, textarea, [contenteditable]"));
      if (e.key === "Escape") {
        if (step === "confirm" && !light) goTo("amount", -1);
        else closeSheetRef.current();
        return;
      }
      if (step !== "amount" || typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) pressKeyRef.current(e.key);
      else if (e.key === "Backspace") pressKeyRef.current("back");
      else if (e.key === "Enter" && amountValidRef.current) {
        if (light) submitTradeRef.current();
        else goTo("confirm");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, light]);

  const openShare = () => {
    if (!completed) return;
    onShare({
      title: market.title,
      subtitle: completed.trade.outcome,
      image: market.image,
      handle,
      wallet,
      timestamp: completed.trade.timestamp,
      invested: completed.trade.amountUsd,
      entryPrice: completed.trade.price,
      markPrice: completed.position.markPrice,
      currentValue: completed.position.valueUsd,
      pnlUsd: completed.position.pnlUsd,
      pnlPct:
        completed.trade.amountUsd > 0
          ? (completed.position.pnlUsd / completed.trade.amountUsd) * 100
          : 0,
      exitLabel: "Now",
      closed: false,
      referralCode,
    });
  };

  const shareText = `I predicted ${outcome} in ${market.title}. To win ${formatUsdCents(
    toWin,
  )}.`;

  const nativeShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: shareText, url: shareLink });
        return;
      } catch {
        return;
      }
    }
    openShare();
  };

  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const pendingSheetDragRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (confirmingRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, a, [data-no-sheet-drag]")) {
      pendingSheetDragRef.current = false;
      return;
    }
    const scroller =
      target.closest("[data-sheet-scroll]") ?? sheetScrollRef.current;
    if (scroller instanceof HTMLElement && scroller.scrollTop > 0) {
      pendingSheetDragRef.current = false;
      return;
    }
    pendingSheetDragRef.current = true;
    dragStartY.current = e.clientY;
    dragStartOffset.current = drawerOffset;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      if (!pendingSheetDragRef.current) return;
      const delta = e.clientY - dragStartY.current;
      if (delta < -6) {
        pendingSheetDragRef.current = false;
        return;
      }
      if (delta <= 6) return;
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const next = Math.max(
      0,
      dragStartOffset.current + (e.clientY - dragStartY.current),
    );
    setDrawerOffset(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pendingSheetDragRef.current = false;
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (drawerOffset > CLOSE_THRESHOLD_PX) {
      closeSheet();
      return;
    }
    setDrawerOffset(0);
  };

  const surface = light ? "bg-black/[0.04]" : "bg-white/[0.08]";
  const border = light ? "border-black/[0.06]" : "border-white/[0.06]";
  const muted = light ? "text-black/45" : "text-white/45";
  const mutedSoft = light ? "text-black/40" : "text-white/40";
  const ink = light ? "text-black" : "text-white";

  const tradeSummary = () => (
    <div className={`overflow-hidden rounded-[20px] text-left ${surface}`}>
      <div className={`flex items-center gap-3 border-b px-3.5 py-3 ${border}`}>
        {team?.logo || market.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team?.logo ?? market.image ?? ""}
            alt=""
            className={
              team?.logo
                ? `h-11 w-11 shrink-0 rounded-xl object-contain p-1.5 ${
                    light ? "bg-black/[0.04]" : "bg-white/[0.06]"
                  }`
                : "h-11 w-11 shrink-0 rounded-xl object-cover"
            }
          />
        ) : (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[12px] font-semibold ${
              light
                ? "bg-black/[0.06] text-black/40"
                : "bg-white/10 text-white/40"
            }`}
          >
            {market.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[14px] font-semibold ${ink}`}>
            {shortenTitle(market.title)}
          </p>
          <p className={`mt-0.5 text-[12px] ${mutedSoft}`}>
            {outcome}: {formatOdds(entryPrice)}
          </p>
        </div>
      </div>
      <dl className="flex flex-col gap-1.5 px-3.5 py-3 text-[13px]">
        <div className="flex items-center justify-between">
          <dt className={muted}>Shares</dt>
          <dd className={`font-semibold tabular-nums ${ink}`}>
            {Math.round(shares).toLocaleString()}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className={muted}>Avg. entry</dt>
          <dd className={`font-semibold tabular-nums ${ink}`}>
            {formatOdds(entryPrice)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className={muted}>To win</dt>
          <dd className="font-semibold tabular-nums text-[#00D54B]">
            {formatUsd(toWin)}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div ref={glimmRootRef} className="absolute inset-0 z-40">
      <GlimmScope
        ref={glimmScopeRef}
        direction="btt"
        origin={[0.5, 1]}
        originOffset={[0, 16]}
        curve={0.12}
        span={1}
        fade={[0.08, 0.7]}
        sweepMs={1500}
        gatherMs={420}
        palette={outcomeIsNo ? SUCCESS_GLIMM_NO : SUCCESS_GLIMM_YES}
        brightness={light ? 1 : 0.88}
        peakAlpha={1.05}
        bandTight={22}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <div className="relative h-full w-full">
      <div
        className={`absolute inset-0 ${
          nested
            ? "bg-transparent"
            : light
              ? "bg-black/25"
              : ui.backdrop
        } ${open ? "opacity-100" : "opacity-0"}`}
        style={{ transition: `opacity ${SHEET_SLIDE_MS}ms ${SHEET_SLIDE_EASE}` }}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-busy={confirmOrigin !== null}
        aria-label={
          step === "amount"
            ? "Trade amount"
            : step === "confirm"
              ? "Confirm trade"
              : "Trade placed"
        }
        className={`absolute inset-x-0 bottom-0 flex flex-col overflow-hidden ${appFont} ${
          light
            ? "bg-white text-black shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
            : `${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.45)]`
        }`}
        style={{
          height: sheetHeight ?? (light
            ? "80vh"
            : success
              ? "100%"
              : step === "amount"
                ? "auto"
                : "88%"),
          maxHeight: sheetHeight ?? (light ? "80vh" : success ? undefined : "92%"),
          borderTopLeftRadius: light || !success ? "1.75rem" : 0,
          borderTopRightRadius: light || !success ? "1.75rem" : 0,
          backgroundColor: success
            ? light
              ? "#F3F3F5"
              : "#0a0a0b"
            : undefined,
          transform: open ? `translateY(${drawerOffset}px)` : "translateY(100%)",
          transition: isDragging
            ? "none"
            : `transform ${SHEET_SLIDE_MS}ms ${SHEET_SLIDE_EASE}, height 0.55s ${SHEET_SLIDE_EASE}, max-height 0.55s ${SHEET_SLIDE_EASE}, border-radius 0.55s ${SHEET_SLIDE_EASE}, background-color 0.6s ease`,
          touchAction: "pan-y",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
          style={{
            opacity: success ? 1 : 0,
            background: light
              ? `radial-gradient(140% 66% at 50% 100%, rgba(${glowCss}, 0.28) 0%, rgba(${glowCss}, 0.12) 42%, rgba(${glowCss}, 0) 80%)`
              : `radial-gradient(140% 66% at 50% 100%, rgba(${glowCss}, 0.72) 0%, rgba(${glowCss}, 0.3) 42%, rgba(${glowCss}, 0) 80%)`,
          }}
        />
        <div
          className={`relative flex shrink-0 touch-none flex-col px-5 pb-1 pt-2 transition-opacity duration-200 ${
            success && !light ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <span
            aria-hidden
            className={`mx-auto mb-2 h-1 w-10 rounded-full ${
              light ? "bg-black/15" : "bg-white/30"
            }`}
          />
        </div>

        <div
          aria-hidden={confirmOrigin ? true : undefined}
          className={`relative flex min-h-0 flex-col ${
            light || step !== "amount" ? "flex-1" : ""
          } ${confirmOrigin ? "invisible pointer-events-none" : ""}`}
        >
          <SheetPager
            step={step}
            direction={stepDir}
            fill={light || step !== "amount"}
          >
            {step === "amount" && (
              <div
                className={`flex flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom,0px))] ${
                  light ? "h-full min-h-0" : ""
                }`}
              >
                <div className="flex shrink-0 flex-col items-center pt-1 text-center">
                  {outcomeImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={outcomeImage}
                      alt=""
                      className={`h-14 w-14 ${
                        team?.logo
                          ? "object-contain"
                          : light
                            ? "rounded-[14px] object-cover"
                            : "rounded-full object-cover"
                      }`}
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-full text-[20px] font-semibold ${
                        light
                          ? "bg-black/[0.06] text-black/40"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {outcomeTitle.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <h2
                    className={`mt-2.5 max-w-[280px] text-[16px] font-semibold leading-[1.25] line-clamp-2 ${ink}`}
                  >
                    {outcomeTitle}
                  </h2>
                  <div className="mt-3 flex justify-center overflow-visible pb-1">
                    <OutcomeSticker
                      label={outcome}
                      tone={outcomeStickerTone}
                      tilt={outcomeStickerTilt}
                      size="lg"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1" aria-hidden />
                <div className="flex shrink-0 flex-col items-center py-1">
                  <p
                    className={`inline-flex items-baseline justify-center text-[56px] font-semibold leading-none tracking-tight ${ink} ${appFont}`}
                    aria-live="polite"
                  >
                    $
                    <TextMorph
                      as="span"
                      numbers
                      duration={220}
                      ease={{ stiffness: 480, damping: 36 }}
                    >
                      {amount.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </TextMorph>
                  </p>
                  <p
                    className={`mt-2 text-[20px] font-medium transition-opacity duration-200 ${muted} ${
                      amountValid ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden={!amountValid}
                  >
                    to win{" "}
                    <TextMorph
                      as="span"
                      numbers
                      duration={240}
                      className={`font-semibold text-[#00D54B] ${appFont}`}
                    >
                      {formatUsdCents(toWin)}
                    </TextMorph>
                  </p>
                </div>
                <div className="min-h-0 flex-1" aria-hidden />

                <div className="flex shrink-0 flex-col gap-2">
                  <div className="grid shrink-0 grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          hapticTap();
                          setAmountDigits(String(Math.min(value, amountCap)));
                        }}
                        className={`h-10 rounded-full text-[13px] font-semibold transition-colors ${
                          light
                            ? "bg-black/[0.05] text-black hover:bg-black/[0.08]"
                            : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                        }`}
                      >
                        ${value}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        hapticTap();
                        setAmountDigits(String(amountCap));
                      }}
                      className={`h-10 rounded-full text-[13px] font-semibold transition-colors ${
                        light
                          ? "bg-black/[0.05] text-black hover:bg-black/[0.08]"
                          : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                      }`}
                    >
                      MAX
                    </button>
                  </div>

                  <AmountKeypad
                    onKey={pressKey}
                    tone={light ? "light" : "dark"}
                  />

                  <button
                    ref={confirmButtonRef}
                    type="button"
                    disabled={!amountValid}
                    onClick={() => {
                      if (light) submitTrade();
                      else goTo("confirm");
                    }}
                    className={`flex h-[52px] w-full shrink-0 items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,colors] duration-150 ease-out active:scale-[0.94] disabled:active:scale-100 ${
                      light
                        ? "bg-black text-white hover:bg-black/90 disabled:bg-black/[0.06] disabled:text-black/30"
                        : "bg-white text-black hover:bg-white/90 disabled:bg-white/[0.08] disabled:text-white/40"
                    }`}
                  >
                    {amountValid
                      ? light
                        ? "Confirm"
                        : "Continue"
                      : "Enter amount"}
                  </button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="flex h-full min-h-0 flex-col">
                <div
                  data-sheet-scroll
                  className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-5 pb-4"
                >
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => goTo("amount", -1)}
                    className={`absolute left-3 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full ${
                      light
                        ? "text-black/55 hover:bg-black/[0.05] hover:text-black"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <BackIcon className="h-4 w-4" />
                  </button>
                  <div className="flex min-h-full flex-col justify-end gap-5 pt-10">
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <ToWinHero value={toWin} tone={light ? "light" : "dark"} />
                      <p className={`mt-1 text-[14px] ${muted}`}>
                        Invested {formatUsdPrecise(amount)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {tradeSummary()}

                      {!light ? (
                        <TakeComposer
                          open={takeOpen}
                          text={takeMessage}
                          gifUrl={takeGif}
                          onOpen={() => setTakeOpen(true)}
                          onClose={() => setTakeOpen(false)}
                          onTextChange={setTakeMessage}
                          onGifChange={setTakeGif}
                          onExited={() => {
                            setTakeMessage("");
                            setTakeGif(null);
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
                <div
                  className={`shrink-0 border-t px-5 pb-5 pt-3 ${border}`}
                >
                  <SlideToConfirm
                    label="Slide to Confirm"
                    onConfirm={submitTrade}
                    tone={light ? "light" : "dark"}
                  />
                </div>
              </div>
            )}

            {step === "success" && completed && (
              <div className="relative flex h-full min-h-0 flex-col">
                <div
                  className={`relative z-[3] flex shrink-0 items-center justify-end px-4 ${
                    light ? "pt-1" : "pt-[38px]"
                  }`}
                >
                  <CloseCountdownButton light={light} onClose={closeSheet} />
                </div>

                <div
                  ref={sheetScrollRef}
                  data-sheet-scroll
                  className="relative z-[3] flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-6 pb-9 text-center"
                >
                  <div className="flex w-full min-h-full flex-1 flex-col items-center">
                  <h2
                    className={`text-[34px] font-semibold tracking-[-0.03em] animate-[trade-success-fade_0.5s_cubic-bezier(0.32,0.72,0,1)_0.15s_both] ${
                      light ? "text-black" : "mt-4 text-white [text-shadow:0_0_24px_rgba(255,255,255,0.35)]"
                    }`}
                  >
                    You predicted!
                  </h2>

                  <div className="mt-7 w-full max-w-[300px] animate-[predict-card-in_0.65s_cubic-bezier(0.32,0.72,0,1)_0.25s_both]">
                    <div
                      className={`flex flex-col items-center rounded-[28px] px-4 pb-4 pt-6 ${
                        light
                          ? "bg-white shadow-[0_16px_40px_rgba(0,0,0,0.08)]"
                          : "shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                      }`}
                      style={
                        light
                          ? {
                              background: `radial-gradient(120% 70% at 50% 0%, rgba(107, 78, 255, 0.1) 0%, rgba(107, 78, 255, 0) 55%), #fff`,
                            }
                          : {
                              background: `radial-gradient(120% 70% at 50% 0%, rgba(140, 150, 255, 0.16) 0%, rgba(140, 150, 255, 0) 55%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(${glowCss}, 0.16) 100%)`,
                            }
                      }
                    >
                      {outcomeImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={outcomeImage}
                          alt=""
                          className={`h-14 w-14 ${
                            team?.logo
                              ? "object-contain"
                              : light
                                ? "rounded-[14px] object-cover"
                                : "rounded-full object-cover"
                          }`}
                        />
                      ) : null}
                      <p
                        className={`mt-2.5 max-w-[280px] text-[16px] font-semibold leading-[1.25] line-clamp-2 ${ink}`}
                      >
                        {outcomeTitle}
                      </p>
                      <div className="mt-3 flex justify-center overflow-visible pb-1">
                        <OutcomeSticker
                          label={outcome}
                          tone={outcomeStickerTone}
                          tilt={outcomeStickerTilt}
                          size="lg"
                        />
                      </div>

                      {completed.trade.userCaption?.trim() ||
                      completed.trade.userGifUrl ? (
                        <div className="mt-4 w-full text-left">
                          {completed.trade.userCaption?.trim() ? (
                            <p
                              className={`text-[15px] leading-snug ${ink}`}
                            >
                              {completed.trade.userCaption.trim()}
                            </p>
                          ) : null}
                          {completed.trade.userGifUrl ? (
                            <div
                              className={
                                completed.trade.userCaption?.trim()
                                  ? "mt-2"
                                  : undefined
                              }
                            >
                              <GifThumb
                                url={completed.trade.userGifUrl}
                                className="max-h-[140px]"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div
                        className={`mt-5 w-full rounded-[18px] px-4 py-3.5 text-left ${
                          light ? "bg-black/[0.04]" : "bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[12px]">
                          <span className={light ? "text-black/55" : "text-white/60"}>
                            Cost
                          </span>
                          <span className={`font-semibold tabular-nums ${ink}`}>
                            {formatUsdCents(completed.trade.amountUsd)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[12px]">
                          <span className={light ? "text-black/55" : "text-white/60"}>
                            Chance
                          </span>
                          <span className={`font-semibold tabular-nums ${ink}`}>
                            {Math.round(completed.trade.price * 100)}%
                          </span>
                        </div>
                        <div
                          className={`mt-3 flex items-end justify-between border-t pt-3 ${
                            light ? "border-black/[0.08]" : "border-white/[0.1]"
                          }`}
                        >
                          <span
                            className={`pb-1.5 text-[16px] font-medium ${
                              light ? "text-black/55" : "text-white/60"
                            }`}
                          >
                            To win
                          </span>
                          <span
                            className={`text-[44px] font-semibold leading-none tracking-tight ${
                              light ? "text-black" : "text-white"
                            } ${appFont}`}
                          >
                            {formatUsdCents(toWin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto w-full pt-8 animate-[trade-success-fade_0.5s_cubic-bezier(0.32,0.72,0,1)_0.45s_both]">
                    <button
                      type="button"
                      onClick={() => void nativeShare()}
                      className={`mx-auto flex h-[52px] w-[min(100%,220px)] items-center justify-center rounded-[18px] text-[16px] font-semibold transition-[transform,colors] duration-150 ease-out active:scale-[0.94] ${
                        light
                          ? "bg-black text-white hover:bg-black/90"
                          : "bg-white text-black hover:bg-white/90"
                      }`}
                    >
                      Share
                    </button>
                    <p
                      className={`mx-auto mt-3 max-w-[250px] text-center text-[14px] leading-snug ${
                        light ? "text-black/50" : "text-white/60"
                      }`}
                    >
                      Share and earn 30% of trading fees
                    </p>
                  </div>
                  </div>
                </div>
              </div>
            )}
          </SheetPager>
        </div>
        {confirmOrigin && (
          <div
            role="status"
            aria-label="Confirming prediction"
            className="trade-confirm-loader absolute z-10 flex h-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-black text-white"
            style={confirmOrigin}
          >
            <span aria-hidden className="trade-confirm-spinner size-5 rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
      </div>
      <style>{`
        .trade-confirm-loader {
          left: 50%;
          top: 50%;
          width: 52px;
          border-radius: 26px;
          animation: trade-confirm-morph 480ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
        @keyframes trade-confirm-morph {
          from { left: var(--confirm-x); top: var(--confirm-y); width: var(--confirm-width); border-radius: 18px; }
          35% { top: var(--confirm-y); width: 52px; border-radius: 26px; }
        }
        .trade-confirm-spinner {
          animation: trade-confirm-spin 700ms linear infinite;
        }
        @keyframes trade-confirm-spin { to { transform: rotate(360deg); } }
        @keyframes trade-win-pop {
          0% { opacity: 0; transform: scale(0.82); }
          70% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes trade-sparkle {
          0% { opacity: 0; transform: scale(0.2) rotate(-20deg); }
          35% { opacity: 1; transform: scale(1.15) rotate(8deg); }
          100% { opacity: 0.35; transform: scale(0.85) rotate(0deg); }
        }
        @keyframes predict-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes trade-success-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes trade-close-ring {
          from { stroke-dashoffset: var(--close-ring-length); }
          to { stroke-dashoffset: 0; }
        }
        .trade-close-ring {
          animation-name: trade-close-ring;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .trade-confirm-loader, .trade-confirm-spinner { animation: none; }
          .trade-close-ring {
            animation: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
        </div>
      </GlimmScope>
    </div>
  );
}
