"use client";

import { useEffect, useRef, useState } from "react";
import { instrumentSansCondensed } from "@/lib/fonts";
import UserAvatar from "./UserAvatar";
import {
  copiedEntryPnl,
  copyRelationshipEntries,
  copyRelationshipPnl,
  formatCopyRule,
  type CopyTrade,
  type CopyTradeMode,
} from "./copyTrades";
import { ActivityRow, SheetPager } from "./ui";
import type { StoredUserTrade } from "./userTrades";

const CLOSE_THRESHOLD_PX = 72;
const DEFAULT_AMOUNT = 25;
const DEFAULT_DAILY_CAP = 100;
const DEFAULT_MAX_OPEN = 10;

const DAILY_CAP_OPTIONS = [50, 100, 250, null] as const;
const DAILY_CAP_CEILING = 999_999;
const MAX_OPEN_OPTIONS = [5, 10, 25, null] as const;

type Step = "form" | "risk" | "success" | "manage";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
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

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#00D54B]" : "bg-white/15"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function riskSummary(
  maxDailyUsd: number | null,
  maxOpenPositions: number | null,
): string {
  const daily =
    maxDailyUsd === null ? "No daily cap" : `$${maxDailyUsd.toLocaleString("en-US")}/day`;
  const open =
    maxOpenPositions === null
      ? "unlimited open"
      : `${maxOpenPositions} open max`;
  return `${daily} · ${open}`;
}

function formatSignedUsd(value: number): string {
  const abs = Math.abs(value);
  const formatted =
    abs >= 1_000 ? `$${(abs / 1_000).toFixed(1)}K` : `$${abs.toFixed(0)}`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return "$0";
}

export default function CopyTradeModal({
  wallet,
  displayName,
  handle,
  existing,
  maxAmount,
  copied = [],
  images,
  onClose,
  onSave,
  onStop,
  onViewProfile,
  onOpenMarket,
}: {
  wallet: string;
  displayName: string;
  handle: string;
  existing: CopyTrade | null;
  maxAmount: number;
  copied?: StoredUserTrade[];
  images?: Map<string, string>;
  onClose: () => void;
  onSave: (trade: CopyTrade) => void;
  onStop: (wallet: string) => void;
  onViewProfile: () => void;
  onOpenMarket?: (
    slug: string,
    title: string,
    preview?: { image?: string | null; price?: number; outcome?: string },
  ) => void;
}) {
  const [step, setStep] = useState<Step>(existing ? "manage" : "form");
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const [mode, setMode] = useState<CopyTradeMode>(existing?.mode ?? "fixed");
  const [amount, setAmount] = useState(existing?.amount ?? DEFAULT_AMOUNT);
  const [amountDraft, setAmountDraft] = useState(
    String(existing?.amount ?? DEFAULT_AMOUNT),
  );
  const [amountFocused, setAmountFocused] = useState(false);
  const [copyExits, setCopyExits] = useState(existing?.copyExits ?? false);
  const [maxDailyUsd, setMaxDailyUsd] = useState<number | null>(
    existing?.maxDailyUsd ?? DEFAULT_DAILY_CAP,
  );
  const [dailyCapDraft, setDailyCapDraft] = useState(
    String(existing?.maxDailyUsd ?? DEFAULT_DAILY_CAP),
  );
  const [dailyCapFocused, setDailyCapFocused] = useState(false);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number | null>(
    existing?.maxOpenPositions ?? DEFAULT_MAX_OPEN,
  );
  const [stopArmed, setStopArmed] = useState(false);
  const [saved, setSaved] = useState<CopyTrade | null>(existing);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dailyCapInputRef = useRef<HTMLInputElement>(null);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const at = handle.startsWith("@") ? handle : `@${handle}`;
  const ceiling = mode === "percent" ? 100 : Math.max(1, Math.floor(maxAmount));

  const goTo = (next: Step, dir: 1 | -1 = 1) => {
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

  const closeSheetRef = useRef(closeSheet);
  closeSheetRef.current = closeSheet;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (step === "risk") {
          goTo("form", -1);
          return;
        }
        if (step === "form" && existing) {
          goTo("manage", -1);
          return;
        }
        closeSheetRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, existing]);

  const commitAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = Math.min(
      ceiling,
      Math.max(1, digits === "" ? 1 : Number(digits)),
    );
    setAmount(next);
    setAmountDraft(String(next));
    return next;
  };

  const addAmount = (delta: number) => {
    setAmount((prev) => {
      const next = Math.min(ceiling, Math.max(1, prev + delta));
      setAmountDraft(String(next));
      return next;
    });
  };

  const setMaxAmount = () => {
    const next = Math.max(1, ceiling);
    setAmount(next);
    setAmountDraft(String(next));
  };

  const setDailyCap = (value: number | null) => {
    setMaxDailyUsd(value);
    setDailyCapDraft(value === null ? "" : String(value));
  };

  const commitDailyCap = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setDailyCap(null);
      return null;
    }
    const next = Math.min(DAILY_CAP_CEILING, Math.max(1, Number(digits)));
    setDailyCap(next);
    return next;
  };

  const switchMode = (next: CopyTradeMode) => {
    setMode(next);
    const nextCeiling = next === "percent" ? 100 : Math.max(1, Math.floor(maxAmount));
    const clamped = Math.min(nextCeiling, Math.max(1, amount));
    setAmount(clamped);
    setAmountDraft(String(clamped));
  };

  const buildTrade = (status: CopyTrade["status"], createdAt: string): CopyTrade => ({
    wallet,
    displayName,
    handle: handle.replace(/^@/, ""),
    mode,
    amount: commitAmount(amountDraft),
    copyExits,
    maxDailyUsd,
    maxOpenPositions,
    status,
    createdAt,
  });

  const confirmCopy = () => {
    const trade = buildTrade("active", existing?.createdAt ?? new Date().toISOString());
    onSave(trade);
    setSaved(trade);
    goTo("success");
  };

  const saveEdits = () => {
    const trade = buildTrade(
      existing?.status ?? "active",
      existing?.createdAt ?? new Date().toISOString(),
    );
    onSave(trade);
    setSaved(trade);
    goTo("manage", -1);
  };

  const togglePaused = () => {
    const current = saved ?? existing;
    if (!current) return;
    setStopArmed(false);
    const next: CopyTrade = {
      ...current,
      status: current.status === "paused" ? "active" : "paused",
    };
    onSave(next);
    setSaved(next);
  };

  const confirmStop = () => {
    if (!stopArmed) {
      setStopArmed(true);
      return;
    }
    onStop(wallet);
    closeSheet();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
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

  const live = saved ?? existing;
  const copiedEntries = copyRelationshipEntries(copied);
  const copiedPnl = copyRelationshipPnl(copied);
  const copiedCount = copiedEntries.length;
  const ariaLabel =
    step === "risk"
      ? "Risk management"
      : step === "success"
        ? "Copytrade started"
        : step === "manage"
          ? "Manage copytrade"
          : "Auto copytrade";

  return (
    <div className="absolute inset-0 z-40">
      <div
        className={`absolute inset-0 bg-[#6e6e73]/45 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copytrade-title"
        aria-label={ariaLabel}
        className="absolute inset-x-0 bottom-0 flex max-h-[94%] flex-col overflow-hidden rounded-t-[1.75rem] bg-black shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        style={{
          transform: open ? `translateY(${drawerOffset}px)` : "translateY(100%)",
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          className="flex shrink-0 touch-none flex-col px-5 pb-1 pt-2"
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

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
          <SheetPager step={step} direction={stepDir}>
          {step === "form" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {existing ? (
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => {
                      setStopArmed(false);
                      goTo("manage", -1);
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <BackIcon className="h-4 w-4" />
                  </button>
                ) : null}
                <UserAvatar
                  seed={wallet}
                  label={displayName}
                  className="h-10 w-10"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white/45">
                    {existing ? "Edit copytrade" : "Auto copytrade"}
                  </p>
                  <h2
                    id="copytrade-title"
                    className="truncate text-[20px] font-semibold tracking-[-0.02em]"
                  >
                    {at}
                  </h2>
                </div>
              </div>

              <div
                className="relative flex rounded-full bg-white/[0.08] p-1"
                role="tablist"
                aria-label="Copy amount mode"
              >
                <div
                  aria-hidden
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    mode === "percent" ? "translate-x-full" : "translate-x-0"
                  }`}
                />
                {(
                  [
                    ["fixed", "Fixed trade"],
                    ["percent", "% of their size"],
                  ] as const
                ).map(([id, label]) => {
                  const active = mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => switchMode(id)}
                      className={`relative z-10 flex-1 rounded-full py-2.5 text-[13px] font-semibold transition-colors duration-300 ${
                        active
                          ? "text-black"
                          : "text-white/45 hover:text-white/70"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[12px] font-medium text-white/45">Amount</p>
                  <label
                    className={`inline-flex cursor-text items-baseline text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white ${instrumentSansCondensed.className}`}
                    onClick={() => amountInputRef.current?.focus()}
                  >
                    <input
                      ref={amountInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label={
                        mode === "percent"
                          ? "Percent of their trade size"
                          : "Fixed copy amount in dollars"
                      }
                      value={
                        amountFocused
                          ? amountDraft
                          : amount.toLocaleString("en-US")
                      }
                      size={Math.max(
                        2,
                        (amountFocused
                          ? amountDraft
                          : amount.toLocaleString("en-US")
                        ).length,
                      )}
                      onFocus={(e) => {
                        setAmountFocused(true);
                        setAmountDraft(String(amount));
                        requestAnimationFrame(() => e.target.select());
                      }}
                      onBlur={() => {
                        setAmountFocused(false);
                        commitAmount(amountDraft);
                      }}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setAmountDraft(digits);
                        if (digits === "") return;
                        const next = Math.min(ceiling, Number(digits));
                        if (Number.isFinite(next)) setAmount(Math.max(0, next));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          amountInputRef.current?.blur();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          setAmountDraft(String(amount));
                          amountInputRef.current?.blur();
                        }
                      }}
                      className="min-w-[2ch] bg-transparent text-right text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white outline-none caret-[#00D54B]"
                    />
                    <span aria-hidden>{mode === "percent" ? "%" : "$"}</span>
                  </label>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {[1, 5, 10, mode === "percent" ? 25 : 100].map((increment) => (
                      <button
                        key={increment}
                        type="button"
                        onClick={() => addAmount(increment)}
                        className="min-w-0 flex-1 rounded-full bg-white/[0.1] py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/15"
                      >
                        +{increment}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={setMaxAmount}
                    className="min-w-0 flex-1 rounded-full bg-white/[0.1] py-1.5 text-[13px] font-semibold text-white/80 transition-colors hover:bg-white/15"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
                <button
                  type="button"
                  onClick={() => goTo("risk")}
                  className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">Risk management</p>
                    <p className="mt-0.5 truncate text-[11px] text-white/40">
                      {riskSummary(maxDailyUsd, maxOpenPositions)}
                    </p>
                  </div>
                  <ChevronIcon className="h-4 w-4 text-white/30" />
                </button>
                <div className="flex items-center gap-3 border-t border-white/[0.06] px-3.5 py-3.5">
                  <p className="min-w-0 flex-1 text-[15px] font-medium">
                    Copy exits too
                  </p>
                  <Toggle
                    checked={copyExits}
                    onChange={setCopyExits}
                    label="Copy exits too"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={existing ? saveEdits : confirmCopy}
                  className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                >
                  {existing ? "Save changes" : "Confirm copytrade"}
                </button>
                <p className="mt-2.5 text-center text-[12px] text-white/35">
                  You can pause or stop anytime.
                </p>
              </div>
            </div>
          )}

          {step === "risk" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Back"
                  onClick={() => goTo("form", -1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <BackIcon className="h-4 w-4" />
                </button>
                <h2
                  id="copytrade-title"
                  className="text-[20px] font-semibold tracking-[-0.02em]"
                >
                  Risk management
                </h2>
              </div>

              <section className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-white/45">
                      Max daily spend
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      Pause new copies once this cap is hit
                    </p>
                  </div>
                  <label
                    className={`inline-flex shrink-0 cursor-text items-baseline text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white ${instrumentSansCondensed.className}`}
                    onClick={() => dailyCapInputRef.current?.focus()}
                  >
                    <input
                      ref={dailyCapInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      aria-label="Max daily spend in dollars"
                      value={
                        dailyCapFocused
                          ? dailyCapDraft
                          : maxDailyUsd === null
                            ? "—"
                            : maxDailyUsd.toLocaleString("en-US")
                      }
                      size={Math.max(
                        2,
                        (dailyCapFocused
                          ? dailyCapDraft || "0"
                          : maxDailyUsd === null
                            ? "—"
                            : maxDailyUsd.toLocaleString("en-US")
                        ).length,
                      )}
                      onFocus={(e) => {
                        setDailyCapFocused(true);
                        setDailyCapDraft(
                          maxDailyUsd === null ? "" : String(maxDailyUsd),
                        );
                        requestAnimationFrame(() => e.target.select());
                      }}
                      onBlur={() => {
                        setDailyCapFocused(false);
                        commitDailyCap(dailyCapDraft);
                      }}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setDailyCapDraft(digits);
                        if (digits === "") {
                          setMaxDailyUsd(null);
                          return;
                        }
                        const next = Math.min(DAILY_CAP_CEILING, Number(digits));
                        if (Number.isFinite(next)) {
                          setMaxDailyUsd(Math.max(0, next));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          dailyCapInputRef.current?.blur();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          setDailyCapDraft(
                            maxDailyUsd === null ? "" : String(maxDailyUsd),
                          );
                          dailyCapInputRef.current?.blur();
                        }
                      }}
                      className="min-w-[2ch] bg-transparent text-right text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white outline-none caret-[#00D54B]"
                    />
                    {(dailyCapFocused || maxDailyUsd !== null) && (
                      <span aria-hidden>$</span>
                    )}
                  </label>
                </div>
                <div className="mt-3 flex gap-1.5">
                  {DAILY_CAP_OPTIONS.map((value) => {
                    const active = maxDailyUsd === value;
                    return (
                      <button
                        key={value ?? "none"}
                        type="button"
                        onClick={() => setDailyCap(value)}
                        className={`min-w-0 flex-1 rounded-full py-1.5 text-[13px] font-semibold transition-colors ${
                          active
                            ? "bg-white text-black"
                            : "bg-white/[0.1] text-white/80 hover:bg-white/15"
                        }`}
                      >
                        {value === null ? "No limit" : `$${value}`}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-hidden rounded-[20px] bg-white/[0.08]">
                <div className="px-3.5 pt-3.5">
                  <p className="text-[15px] font-medium">Max open copies</p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    Skip new trades while you already hold this many
                  </p>
                </div>
                <div className="flex gap-1.5 px-3.5 py-3.5">
                  {MAX_OPEN_OPTIONS.map((value) => {
                    const active = maxOpenPositions === value;
                    return (
                      <button
                        key={value ?? "none"}
                        type="button"
                        onClick={() => setMaxOpenPositions(value)}
                        className={`min-w-0 flex-1 rounded-full py-1.5 text-[13px] font-semibold transition-colors ${
                          active
                            ? "bg-white text-black"
                            : "bg-white/[0.1] text-white/80 hover:bg-white/15"
                        }`}
                      >
                        {value === null ? "No limit" : String(value)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <button
                type="button"
                onClick={() => goTo("form", -1)}
                className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
              >
                Done
              </button>
            </div>
          )}

          {step === "success" && live && (
            <div className="flex flex-col items-center pb-1 pt-2 text-center">
              <div className="flex w-full flex-col items-center animate-[copy-success-fade_0.45s_ease-out_both]">
                <span
                  aria-hidden
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00D54B]/15 text-[#00D54B]"
                >
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                    <path
                      d="M6 12.2 10.2 16.5 18 7.5"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h2
                  id="copytrade-title"
                  className="mt-4 text-[22px] font-semibold tracking-[-0.03em]"
                >
                  You&apos;re copying {at}
                </h2>
                <p className="mt-1.5 max-w-[260px] text-[13px] leading-snug text-white/45">
                  We&apos;ll match their next trades with your size and risk
                  rules. Pause or stop anytime from your profile.
                </p>

                <div className="mt-5 w-full overflow-hidden rounded-[20px] bg-white/[0.08] text-left">
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-3">
                    <UserAvatar
                      seed={wallet}
                      label={displayName}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">
                        {displayName}
                      </p>
                      <p className="mt-0.5 text-[12px] text-white/40">{at}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#00D54B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#00D54B]">
                      Active
                    </span>
                  </div>
                  <dl className="flex flex-col gap-1.5 px-3.5 py-3 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-white/45">Size</dt>
                      <dd className="font-semibold">{formatCopyRule(live)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-white/45">Copy exits</dt>
                      <dd className="font-semibold">
                        {live.copyExits ? "On" : "Off"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-white/45">Risk</dt>
                      <dd className="text-right font-semibold">
                        {riskSummary(live.maxDailyUsd, live.maxOpenPositions)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  type="button"
                  onClick={onViewProfile}
                  className="mt-3 w-full rounded-full bg-white/[0.08] py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  View on Profile
                </button>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="mt-2 w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {step === "manage" && live && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  seed={wallet}
                  label={displayName}
                  className="h-10 w-10"
                />
                <div className="min-w-0 flex-1">
                  <h2
                    id="copytrade-title"
                    className="truncate text-[20px] font-semibold tracking-[-0.02em]"
                  >
                    Copying
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] text-white/45">
                    {at}
                    {live.status === "paused" ? " · Paused" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Copytrade settings"
                  onClick={() => {
                    setStopArmed(false);
                    goTo("form");
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <SettingsIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-[16px] bg-white/[0.08] px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[20px] font-semibold tabular-nums ${
                      copiedPnl > 0
                        ? "text-[#00D54B]"
                        : copiedPnl < 0
                          ? "text-[#FF375F]"
                          : "text-white"
                    }`}
                  >
                    {formatSignedUsd(copiedPnl)}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-white/45">
                    {copiedCount === 0
                      ? "No copies yet"
                      : `${copiedCount} copied`}
                    {" · "}
                    {formatCopyRule(live)}
                  </p>
                </div>
                <Toggle
                  checked={live.status === "active"}
                  onChange={() => togglePaused()}
                  label={
                    live.status === "active"
                      ? "Pause copytrade"
                      : "Resume copytrade"
                  }
                />
              </div>
              <p className="truncate text-[12px] text-white/40">
                {live.copyExits ? "Exits copied" : "You manage exits"}
                {" · "}
                {riskSummary(live.maxDailyUsd, live.maxOpenPositions)}
              </p>

              <div className="max-h-[240px] overflow-y-auto overscroll-contain">
                {copiedEntries.length === 0 ? (
                  <p className="py-3 text-[13px] text-white/45">
                    Waiting for their next trade
                  </p>
                ) : (
                  <ul className="-mx-5 divide-y divide-white/[0.06]">
                    {copiedEntries.map((item, index) => {
                      const entryPnl = copiedEntryPnl(item, copied);
                      const image =
                        item.position.image ??
                        (item.trade.marketSlug
                          ? images?.get(item.trade.marketSlug)
                          : undefined);
                      const slug =
                        item.trade.marketSlug ||
                        item.position.marketSlug ||
                        "";
                      return (
                        <li
                          key={
                            item.copiedFrom?.sourceKey ??
                            item.trade.txHash ??
                            `${item.trade.timestamp}-${index}`
                          }
                          className="px-5"
                        >
                          <ActivityRow
                            leading={
                              image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={image}
                                  alt=""
                                  className="h-9 w-9 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.1] text-[11px] font-semibold text-white/40">
                                  {item.trade.outcome.slice(0, 1)}
                                </div>
                              )
                            }
                            title={item.trade.marketTitle}
                            subtitle={`${item.trade.outcome} · ${formatOdds(item.position.markPrice)}${
                              item.cashedOut ? " · Closed" : ""
                            }`}
                            trailing={
                              <div>
                                <p className="text-[14px] font-semibold tabular-nums">
                                  {formatUsd(item.trade.amountUsd)}
                                </p>
                                <p
                                  className={`mt-0.5 text-[12px] font-semibold tabular-nums ${
                                    entryPnl > 0
                                      ? "text-[#00D54B]"
                                      : entryPnl < 0
                                        ? "text-[#FF375F]"
                                        : "text-white/45"
                                  }`}
                                >
                                  {formatSignedUsd(entryPnl)}
                                </p>
                              </div>
                            }
                            onClick={() => {
                              if (!slug && !item.trade.marketTitle) return;
                              onOpenMarket?.(slug, item.trade.marketTitle, {
                                image: image ?? null,
                                price: item.trade.price,
                                outcome: item.trade.outcome,
                              });
                              closeSheet();
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="shrink-0 border-t border-white/[0.06] pt-3">
                <button
                  type="button"
                  onClick={confirmStop}
                  className="w-full rounded-full bg-[#FF375F]/15 py-3.5 text-[15px] font-semibold text-[#FF375F] transition-opacity hover:opacity-90"
                >
                  {stopArmed ? "Tap again to stop" : "Stop copytrade"}
                </button>
                <p className="mt-2 text-center text-[12px] text-white/35">
                  {stopArmed
                    ? "Tap again to confirm. This stops new copies; open positions stay yours."
                    : "Stopping won\u2019t close positions you already copied."}
                </p>
              </div>
            </div>
          )}
          </SheetPager>
        </div>
      </div>
      <style>{`
        @keyframes copy-success-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
