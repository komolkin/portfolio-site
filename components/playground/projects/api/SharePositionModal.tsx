"use client";

import { useEffect, useMemo, useState } from "react";
import { Liveline, type LivelinePoint } from "liveline";
import { instrumentSansCondensed } from "@/lib/fonts";
import { hexToRgba, useImageAccent } from "./imageAccent";
import UserAvatar from "./UserAvatar";

const CHART_PAD = { top: 20, right: 18, bottom: 118, left: 12 } as const;

export type SharePositionPayload = {
  title: string;
  subtitle: string;
  image?: string | null;
  handle: string;
  wallet: string;
  timestamp: string | null;
  invested: number;
  entryPrice: number;
  markPrice: number;
  currentValue: number;
  pnlUsd: number;
  pnlPct: number;
  exitLabel: "Now" | "Exit";
  closed?: boolean;
  referralCode: string;
};

function formatUsdCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 100) {
    return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedUsd(value: number): string {
  const formatted = formatUsdCompact(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted.replace("-", "")}`;
  return formatUsdCompact(0);
}

function formatPercentAbs(value: number): string {
  const abs = Math.abs(value);
  return `${abs.toFixed(abs >= 100 ? 0 : 2)}%`;
}

function formatOdds(price: number): string {
  return `${Math.round(Math.max(0, Math.min(1, price)) * 100)}¢`;
}

function formatShareDate(timestamp: string | null): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  if (!Number.isFinite(date.getTime())) {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortenTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 28) return trimmed;
  return `${trimmed.slice(0, 26).trim()}…`;
}

function cleanHandle(handle: string): string {
  return handle.replace(/^@/, "").trim() || "trader";
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seedShareHistory(
  entryPct: number,
  exitPct: number,
  seed: number,
): { points: LivelinePoint[]; entryTime: number; exitTime: number } {
  const now = Math.floor(Date.now() / 1000);
  const steps = 36;
  const stepSecs = 60 * 30;
  const start = Math.max(5, Math.min(88, entryPct * 0.62 + (seed % 10)));
  const entryIndex = 11;
  const points: LivelinePoint[] = [];

  for (let i = 0; i < steps; i += 1) {
    let value: number;
    if (i <= entryIndex) {
      const u = i / Math.max(1, entryIndex);
      value = start + (entryPct - start) * u;
    } else {
      const u = (i - entryIndex) / Math.max(1, steps - 1 - entryIndex);
      const eased = u * u * (3 - 2 * u);
      value = entryPct + (exitPct - entryPct) * eased;
    }
    const wave = Math.sin(i * 0.46 + (seed % 9)) * (i < entryIndex ? 2.2 : 3.4);
    points.push({
      time: now - (steps - 1 - i) * stepSecs,
      value: Math.max(3, Math.min(97, value + wave)),
    });
  }

  points[entryIndex] = {
    ...points[entryIndex]!,
    value: Math.max(3, Math.min(97, entryPct)),
  };
  points[points.length - 1] = { time: now, value: Math.max(3, Math.min(97, exitPct)) };

  return {
    points,
    entryTime: points[entryIndex]!.time,
    exitTime: points[points.length - 1]!.time,
  };
}

function shareText(payload: SharePositionPayload): string {
  const handle = cleanHandle(payload.handle);
  return `${handle} on ${payload.title}: ${formatSignedUsd(payload.pnlUsd)} (${payload.pnlUsd >= 0 ? "+" : "-"}${formatPercentAbs(payload.pnlPct)})`;
}

function CopyGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3.5 10.5v-6a1.5 1.5 0 0 1 1.5-1.5h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 10V3M8 3 5.5 5.5M8 3l2.5 2.5M3.5 9v3.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChartMarker({
  kind,
  xRatio,
  yRatio,
}: {
  kind: "buy" | "sell";
  xRatio: number;
  yRatio: number;
}) {
  const buy = kind === "buy";
  return (
    <span
      aria-hidden
      className={`absolute z-20 flex h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-bold leading-none ring-2 ring-black ${
        buy ? "bg-[#00D54B] text-[#06381a]" : "bg-[#FF375F] text-white"
      }`}
      style={{
        left: `calc(${CHART_PAD.left}px + (100% - ${CHART_PAD.left + CHART_PAD.right}px) * ${xRatio})`,
        top: `calc(${CHART_PAD.top}px + (100% - ${CHART_PAD.top + CHART_PAD.bottom}px) * ${yRatio})`,
      }}
    >
      {buy ? "+" : "−"}
    </span>
  );
}

export default function SharePositionModal({
  payload,
  onClose,
}: {
  payload: SharePositionPayload;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const accent = useImageAccent(payload.image ?? null);
  const handle = cleanHandle(payload.handle);
  const positive = payload.pnlUsd >= 0;
  const tone = positive ? "#00D54B" : "#FF375F";
  const entryPct = Math.max(4, Math.min(96, payload.entryPrice * 100));
  const exitPct = Math.max(4, Math.min(96, payload.markPrice * 100));

  const chart = useMemo(() => {
    const seed = hashString(`${payload.wallet}-${payload.title}`);
    return seedShareHistory(entryPct, exitPct, seed);
  }, [entryPct, exitPct, payload.title, payload.wallet]);

  const span = Math.max(1, chart.exitTime - chart.points[0]!.time);
  const range = useMemo(() => {
    let min = exitPct;
    let max = exitPct;
    for (const point of chart.points) {
      min = Math.min(min, point.value);
      max = Math.max(max, point.value);
    }
    const pad = Math.max(4, (max - min) * 0.16);
    return { min: min - pad, max: max + pad };
  }, [chart.points, exitPct]);

  const markerY = (value: number) =>
    (range.max - value) / Math.max(0.001, range.max - range.min);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const copyCard = async () => {
    const text = shareText(payload);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* still show copied for the demo */
    }
    setCopyStatus("copied");
    window.setTimeout(() => setCopyStatus("idle"), 1600);
  };

  const shareCard = async () => {
    const text = shareText(payload);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Share position", text });
        return;
      }
      await copyCard();
    } catch {
      /* user cancelled the sheet */
    }
  };

  return (
    <div className="absolute inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share position"
        className={`absolute inset-0 flex flex-col px-4 pb-5 pt-3 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        <header className="relative mb-3 flex h-10 items-center justify-center">
          <h2 className="text-[16px] font-semibold">Share position</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-0 flex h-10 w-10 items-center justify-center text-white/80 hover:text-white"
          >
            <CloseGlyph className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center">
          <div
            className="h-[80%] w-full min-h-0 rounded-[32px]"
            style={{
              boxShadow: `0 0 24px 2px ${hexToRgba(accent, 0.55)}, 0 0 56px 12px ${hexToRgba(accent, 0.32)}, 0 18px 40px rgba(0,0,0,0.45)`,
            }}
          >
          <article
            className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[32px] p-[3px]"
            style={{ backgroundColor: accent }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[29px] bg-black">
            <div className="px-3.5 pt-3.5">
              <div className="flex items-start gap-2.5">
                {payload.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={payload.image}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-white/50">
                    {payload.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold leading-tight">
                    {shortenTitle(payload.title)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-white/45">
                    {payload.subtitle}
                  </p>
                </div>
                <p className="shrink-0 pt-0.5 text-[11px] tabular-nums text-white/40">
                  {formatShareDate(payload.timestamp)}
                </p>
              </div>
            </div>

            <div className="relative mt-1 min-h-0 flex-1">
              <div className="absolute inset-0">
                <Liveline
                  data={chart.points}
                  value={exitPct}
                  theme="dark"
                  color={tone}
                  grid={false}
                  badge={false}
                  pulse={false}
                  momentum={false}
                  scrub={false}
                  fill
                  paused
                  showValue={false}
                  window={60 * 30 * Math.max(chart.points.length - 1, 1)}
                  formatValue={(value) => `${Math.round(value)}%`}
                  formatTime={() => ""}
                  padding={CHART_PAD}
                  className="h-full w-full"
                />
              </div>
              <ChartMarker
                kind="buy"
                xRatio={(chart.entryTime - chart.points[0]!.time) / span}
                yRatio={markerY(entryPct)}
              />
              <ChartMarker
                kind="sell"
                xRatio={(chart.exitTime - chart.points[0]!.time) / span}
                yRatio={markerY(exitPct)}
              />

              <div className="absolute inset-x-3 bottom-3 z-10 rounded-[20px] bg-black/80 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <UserAvatar
                    seed={payload.wallet}
                    label={handle}
                    className="h-4 w-4"
                  />
                  <p className="truncate text-[11px] text-white/55">
                    @{handle}&apos;s trade
                  </p>
                </div>
                <p
                  className={`mt-1 flex items-baseline gap-1.5 font-semibold tabular-nums ${
                    positive ? "text-[#00D54B]" : "text-[#FF375F]"
                  }`}
                >
                  <span
                    className={`text-[26px] leading-none tracking-tight ${instrumentSansCondensed.className}`}
                  >
                    {formatSignedUsd(payload.pnlUsd)}
                  </span>
                  <span className="text-[12px]">
                    ({positive ? "▲" : "▼"} {formatPercentAbs(payload.pnlPct)})
                  </span>
                </p>
                <div className="mt-2 grid grid-cols-3 border-t border-white/[0.08] pt-2">
                  {[
                    { label: "Invested", value: formatUsdCompact(payload.invested) },
                    { label: "Entry", value: formatOdds(payload.entryPrice) },
                    {
                      label: payload.exitLabel,
                      value: formatOdds(payload.markPrice),
                    },
                  ].map((stat, index) => (
                    <div
                      key={stat.label}
                      className={`min-w-0 ${index > 0 ? "border-l border-white/[0.08] pl-2" : "pr-2"}`}
                    >
                      <p className="text-[11px] text-white/40">{stat.label}</p>
                      <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="shrink-0 px-3.5 py-3.5"
              style={{ backgroundColor: accent }}
            >
              <p className="text-[11px] leading-tight text-white/80">
                10% off fees with code
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold">
                {payload.referralCode}
              </p>
            </div>
            </div>
          </article>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void copyCard()}
            className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-white/[0.08] text-[15px] font-semibold text-white hover:bg-white/10"
          >
            <CopyGlyph className="h-4 w-4" />
            {copyStatus === "copied" ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => void shareCard()}
            className="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-white/[0.08] text-[15px] font-semibold text-white hover:bg-white/10"
          >
            <ShareGlyph className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
