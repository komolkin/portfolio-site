"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import type { PolymarketMarketData } from "@/lib/polymarketscan";
import { getMarketOddsSides } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import type { UserPlacedTrade } from "./userTrades";
import type { PolymarketWalletPosition } from "@/lib/polymarketscan";
import type { SharePositionPayload } from "./SharePositionModal";
import { GifThumb, MessageComposer } from "./richMessage";
import { AmountKeypad, SheetPager, applyAmountKey, ui } from "./ui";

const CLOSE_THRESHOLD_PX = 72;
const QUICK_AMOUNTS = [5, 25] as const;

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

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" />
    </svg>
  );
}

function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.94 4.3 18.9 18.63c-.23 1.01-.83 1.26-1.68.79l-4.63-3.41-2.23 2.15c-.25.25-.45.45-.93.45l.33-4.71 8.57-7.75c.37-.33-.08-.52-.58-.18L7.16 12.64 2.6 11.21c-.99-.31-1.01-.99.21-1.47l17.8-6.86c.82-.3 1.54.2 1.33 1.42Z" />
    </svg>
  );
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.5 5.5v-.5a2 2 0 0 0-2-2H6a2.5 2.5 0 0 0-2.5 2.5v7.5a2 2 0 0 0 2 2h.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ForwardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 5.5 20 11.5l-6 6M20 11.5h-9a6.5 6.5 0 0 0-6.5 6.5v.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SLIDE_KNOB_PX = 48;
const SLIDE_PAD_PX = 4;

function SlideToConfirm({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

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
      className="relative isolate h-14 w-full select-none overflow-hidden rounded-full bg-[#141416]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <div className="live-preview-ember-glow-green absolute -inset-[35%]" />
        <div className="live-preview-ember-edge-green absolute inset-0 rounded-[inherit]" />
      </div>
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
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[15px] font-semibold text-white"
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
        className="absolute z-20 flex touch-none items-center justify-center rounded-full bg-white text-[#16A34A] shadow-[0_2px_8px_rgba(0,0,0,0.25)] outline-none focus-visible:ring-2 focus-visible:ring-white/60"
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

function ToWinHero({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const id = window.requestAnimationFrame(() => {
      setShown(Math.round(value));
    });
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center">
      <p className="text-[15px] font-semibold text-white">To win</p>
      <div className="relative mt-1.5 inline-flex items-baseline px-7 py-3">
        {WIN_SPARKLES.map((sparkle, index) => (
          <span
            key={index}
            aria-hidden
            className="pointer-events-none absolute animate-[trade-sparkle_1.15s_ease-out_both]"
            style={{
              top: "top" in sparkle ? sparkle.top : undefined,
              bottom: "bottom" in sparkle ? sparkle.bottom : undefined,
              left: "left" in sparkle ? sparkle.left : undefined,
              right: "right" in sparkle ? sparkle.right : undefined,
              color: sparkle.color,
              animationDelay: sparkle.delay,
              filter:
                sparkle.color === "#FFFFFF"
                  ? undefined
                  : `drop-shadow(0 0 4px ${sparkle.color})`,
            }}
          >
            <SparkleIcon size={sparkle.size} />
          </span>
        ))}
        <p
          className={`relative z-10 inline-flex items-baseline text-[64px] font-semibold leading-none tracking-tight text-[#00D54B] animate-[trade-win-pop_0.55s_cubic-bezier(0.32,0.72,0,1)_both] ${instrumentSansCondensed.className}`}
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
  wallet,
  handle,
  referralCode,
  maxAmount,
  nested = false,
  onClose,
  onComplete,
  onShare,
}: {
  market: PolymarketMarketData;
  initialOutcome: string | null;
  wallet: string;
  handle: string;
  referralCode: string;
  maxAmount: number;
  nested?: boolean;
  onClose: () => void;
  onComplete: (
    trade: UserPlacedTrade,
    position: PolymarketWalletPosition,
  ) => void;
  onShare: (payload: SharePositionPayload) => void;
}) {
  const oddsSides = useMemo(() => getMarketOddsSides(market), [market]);
  const [step, setStep] = useState<"amount" | "confirm" | "success">("amount");
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const [outcome] = useState(initialOutcome ?? oddsSides[0]?.label ?? "Yes");
  const [amountDigits, setAmountDigits] = useState("");
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

  const selectedSide =
    oddsSides.find(
      (side) => side.label.toLowerCase() === outcome.toLowerCase(),
    ) ?? oddsSides[0];
  const entryPrice = selectedSide?.price ?? market.yesPrice;
  const headerTitle =
    (market.groupItemTitle ?? "").trim() || shortenTitle(market.title);
  const team = outcomeTeam(market, outcome);
  const binary = isBinaryOutcome(outcome);
  const outcomeTitle = team?.name ?? (binary ? headerTitle : outcome);
  const outcomeImage = team?.logo ?? market.image;
  const outcomeSubtitle = `${binary ? `${outcome} · ` : ""}${Math.round(
    entryPrice * 100,
  )}% Chance`;

  const matchupTitle = market.liveGame
    ? `${market.liveGame.away.name} vs ${market.liveGame.home.name}`
    : headerTitle;
  const glow = glowRgb(
    (team as { color?: string | null } | null)?.color,
    selectedSide?.side === "no" ? [255, 55, 95] : [0, 213, 75],
  );
  const glowCss = glow.join(", ");
  const shareLink = `https://polymarket.app/r/${referralCode}`;
  const [linkCopied, setLinkCopied] = useState(false);

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
    setOpen(false);
    setDrawerOffset(0);
    setIsDragging(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => onCloseRef.current(), 280);
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

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = Boolean(target?.closest("input, textarea, [contenteditable]"));
      if (e.key === "Escape") {
        if (step === "confirm") goTo("amount", -1);
        else closeSheetRef.current();
        return;
      }
      if (step !== "amount" || typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) pressKeyRef.current(e.key);
      else if (e.key === "Backspace") pressKeyRef.current("back");
      else if (e.key === "Enter" && amountValidRef.current) goTo("confirm");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  const submitTrade = () => {
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
    setCompleted({ trade, position });
    onComplete(trade, position);
    goTo("success");
  };

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

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareLink}`);
    } catch {
      // Clipboard may be unavailable in this playground shell.
    }
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };

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

  const shareTargets = [
    {
      id: "x",
      label: "Share on X",
      icon: <XLogo className="h-[18px] w-[18px]" />,
      onClick: () =>
        openExternal(
          `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`,
        ),
    },
    {
      id: "telegram",
      label: "Share on Telegram",
      icon: <TelegramLogo className="h-5 w-5" />,
      onClick: () =>
        openExternal(
          `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`,
        ),
    },
    {
      id: "instagram",
      label: "Share to Instagram",
      icon: <InstagramLogo className="h-5 w-5" />,
      onClick: openShare,
    },
    {
      id: "copy",
      label: linkCopied ? "Copied" : "Copy link",
      icon: <CopyIcon className="h-5 w-5" />,
      onClick: () => void copyShareLink(),
    },
    {
      id: "more",
      label: "More sharing options",
      icon: <ForwardIcon className="h-5 w-5" />,
      onClick: () => void nativeShare(),
    },
  ];

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = drawerOffset;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (drawerOffset > CLOSE_THRESHOLD_PX) {
      closeSheet();
      return;
    }
    setDrawerOffset(0);
  };

  const tradeSummary = () => (
    <div className="overflow-hidden rounded-[20px] bg-white/[0.08] text-left">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-3">
        {team?.logo || market.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team?.logo ?? market.image ?? ""}
            alt=""
            className={
              team?.logo
                ? "h-11 w-11 shrink-0 rounded-xl bg-white/[0.06] object-contain p-1.5"
                : "h-11 w-11 shrink-0 rounded-xl object-cover"
            }
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[12px] font-semibold text-white/40">
            {market.title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">
            {shortenTitle(market.title)}
          </p>
          <p className="mt-0.5 text-[12px] text-white/40">
            {outcome}: {formatOdds(entryPrice)}
          </p>
        </div>
      </div>
      <dl className="flex flex-col gap-1.5 px-3.5 py-3 text-[13px]">
        <div className="flex items-center justify-between">
          <dt className="text-white/45">Shares</dt>
          <dd className="font-semibold tabular-nums">
            {Math.round(shares).toLocaleString()}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-white/45">Avg. entry</dt>
          <dd className="font-semibold tabular-nums">
            {formatOdds(entryPrice)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-white/45">To win</dt>
          <dd className="font-semibold tabular-nums text-[#00D54B]">
            {formatUsd(toWin)}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div className="absolute inset-0 z-40">
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          nested ? "bg-transparent" : ui.backdrop
        } ${open ? "opacity-100" : "opacity-0"}`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          step === "amount"
            ? "Trade amount"
            : step === "confirm"
              ? "Confirm trade"
              : "Trade placed"
        }
        className={`absolute inset-x-0 bottom-0 flex flex-col overflow-hidden ${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.45)]`}
        style={{
          height: success ? "100%" : "94%",
          borderTopLeftRadius: success ? 0 : "1.75rem",
          borderTopRightRadius: success ? 0 : "1.75rem",
          backgroundColor: success ? "#0a0a0b" : undefined,
          transform: open ? `translateY(${drawerOffset}px)` : "translateY(100%)",
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1), height 0.55s cubic-bezier(0.32, 0.72, 0, 1), border-radius 0.55s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.6s ease",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
          style={{
            opacity: success ? 1 : 0,
            background: `radial-gradient(140% 66% at 50% 100%, rgba(${glowCss}, 0.72) 0%, rgba(${glowCss}, 0.3) 42%, rgba(${glowCss}, 0) 80%)`,
          }}
        />
        <div
          className={`relative flex shrink-0 touch-none flex-col px-5 pb-1 pt-2 transition-opacity duration-200 ${
            success ? "pointer-events-none opacity-0" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30"
          />
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <SheetPager step={step} direction={stepDir} fill>
            {step === "amount" && (
              <div className="flex h-full min-h-0 flex-col px-5 pb-5">
                <div className="flex shrink-0 flex-col items-center pt-2 text-center">
                  {outcomeImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={outcomeImage}
                      alt=""
                      className={`h-16 w-16 ${
                        team?.logo ? "object-contain" : "rounded-full object-cover"
                      }`}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[20px] font-semibold text-white/50">
                      {outcomeTitle.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <h2 className="mt-2.5 max-w-[260px] truncate text-[16px] font-semibold">
                    {outcomeTitle}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-white/45">
                    {outcomeSubtitle}
                  </p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
                  <p
                    className={`inline-flex items-baseline text-[64px] font-semibold leading-none tracking-tight text-white ${instrumentSansCondensed.className}`}
                    aria-live="polite"
                  >
                    $
                    <NumberFlow
                      value={amount}
                      format={{ useGrouping: true, maximumFractionDigits: 0 }}
                      style={nfMaskStyle}
                    />
                  </p>
                  <p
                    className={`mt-3 text-[13px] font-medium text-white/45 transition-opacity duration-200 ${
                      amountValid ? "opacity-100" : "opacity-0"
                    }`}
                    aria-hidden={!amountValid}
                  >
                    to win{" "}
                    <span
                      className={`font-semibold text-[#00D54B] ${instrumentSansCondensed.className}`}
                    >
                      {formatUsdCents(toWin)}
                    </span>
                  </p>
                </div>

                <div className="grid shrink-0 grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setAmountDigits(String(Math.min(value, amountCap)))
                      }
                      className="h-10 rounded-full bg-white/[0.08] text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                    >
                      ${value}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountDigits(String(amountCap))}
                    className="h-10 rounded-full bg-white/[0.08] text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                  >
                    MAX
                  </button>
                </div>

                <AmountKeypad onKey={pressKey} className="mt-2" />

                <button
                  type="button"
                  disabled={!amountValid}
                  onClick={() => goTo("confirm")}
                  className="mt-3 w-full shrink-0 rounded-full bg-white py-4 text-[16px] font-semibold text-black transition-colors hover:bg-white/90 disabled:bg-white/[0.08] disabled:text-white/40"
                >
                  {amountValid ? "Continue" : "Enter amount"}
                </button>
              </div>
            )}

            {step === "confirm" && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-5 pb-4">
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => goTo("amount", -1)}
                    className="absolute left-3 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <BackIcon className="h-4 w-4" />
                  </button>
                  <div className="flex min-h-full flex-col justify-end gap-5 pt-10">
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <ToWinHero value={toWin} />
                      <p className="mt-1 text-[14px] text-white/45">
                        Invested {formatUsdPrecise(amount)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      {tradeSummary()}

                      {takeOpen ? (
                        <div>
                          <MessageComposer
                            text={takeMessage}
                            gifUrl={takeGif}
                            onTextChange={setTakeMessage}
                            onGifChange={setTakeGif}
                            placeholder="Share why you're taking this trade…"
                          />
                          <div className="mt-1.5 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-white/35">
                              {takeMessage.trim() || takeGif
                                ? "Your trade will appear in the Feed."
                                : ""}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setTakeOpen(false);
                                setTakeMessage("");
                                setTakeGif(null);
                              }}
                              className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                            >
                              Remove take
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setTakeOpen(true)}
                          className="self-center rounded-full px-3 py-1.5 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                        >
                          + Add a take
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t border-white/[0.06] px-5 pb-5 pt-3">
                  <SlideToConfirm label="Slide to Confirm" onConfirm={submitTrade} />
                </div>
              </div>
            )}

            {step === "success" && completed && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 justify-end px-4 pt-[38px]">
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={closeSheet}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.1] text-white/85 backdrop-blur-md transition-colors hover:bg-white/[0.16] hover:text-white"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain px-6 pb-9 text-center">
                  <h2 className="mt-4 text-[34px] font-semibold tracking-[-0.03em] text-white [text-shadow:0_0_24px_rgba(255,255,255,0.35)] animate-[trade-success-fade_0.5s_cubic-bezier(0.32,0.72,0,1)_0.15s_both]">
                    You predicted!
                  </h2>

                  <div className="mt-7 w-full max-w-[300px] animate-[predict-card-in_0.65s_cubic-bezier(0.32,0.72,0,1)_0.25s_both]">
                    <div
                      className="flex flex-col items-center rounded-[28px] px-4 pb-4 pt-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                      style={{
                        background: `radial-gradient(120% 70% at 50% 0%, rgba(140, 150, 255, 0.16) 0%, rgba(140, 150, 255, 0) 55%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(${glowCss}, 0.16) 100%)`,
                      }}
                    >
                      {outcomeImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={outcomeImage}
                          alt=""
                          className={`h-16 w-16 ${
                            team?.logo ? "object-contain" : "rounded-full object-cover"
                          }`}
                        />
                      ) : null}
                      <p className="mt-3 text-balance text-[20px] font-semibold leading-tight tracking-[-0.02em]">
                        {matchupTitle}
                      </p>
                      <span className="mt-2.5 rounded-lg bg-white/[0.1] px-2.5 py-1 text-[12px] font-medium text-white/90">
                        {team?.name ?? outcome}
                      </span>

                      {completed.trade.userCaption?.trim() ||
                      completed.trade.userGifUrl ? (
                        <div className="mt-4 w-full text-left">
                          {completed.trade.userCaption?.trim() ? (
                            <p className="text-[15px] leading-snug text-white">
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

                      <div className="mt-5 w-full rounded-[18px] bg-white/[0.06] px-4 py-3.5 text-left">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-white/60">Cost</span>
                          <span className="font-semibold tabular-nums">
                            {formatUsdCents(completed.trade.amountUsd)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[12px]">
                          <span className="text-white/60">Chance</span>
                          <span className="font-semibold tabular-nums">
                            {Math.round(completed.trade.price * 100)}%
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between border-t border-white/[0.1] pt-3">
                          <span className="pb-1.5 text-[16px] font-medium text-white/60">
                            To win
                          </span>
                          <span
                            className={`text-[44px] font-semibold leading-none tracking-tight text-white ${instrumentSansCondensed.className}`}
                          >
                            {formatUsdCents(toWin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto w-full pt-8 animate-[trade-success-fade_0.5s_cubic-bezier(0.32,0.72,0,1)_0.45s_both]">
                    <p className="mx-auto max-w-[250px] text-[14px] leading-snug text-white/60">
                      Share and invite friends to earn 30% of their trading fees
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-2.5">
                      {shareTargets.map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          aria-label={target.label}
                          title={target.label}
                          onClick={target.onClick}
                          className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.1] backdrop-blur-md transition-colors hover:bg-white/[0.16] ${
                            target.id === "copy" && linkCopied
                              ? "text-[#00D54B]"
                              : "text-white"
                          }`}
                        >
                          {target.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SheetPager>
        </div>
      </div>
      <style>{`
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
      `}</style>
    </div>
  );
}
