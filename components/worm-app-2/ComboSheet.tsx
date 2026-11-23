"use client";

import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export type ComboSheetPick = {
  id: string;
  label: string;
  logo?: string;
  mark?: string;
  groupId: string;
  subtitle?: string;
  percent?: number;
};

const MIN_PICKS = 2;
const MAX_SLOTS = 8;
const COMBO_EDGE = 0.35;
const AMOUNT_CHIPS = [5, 10, 25, 50] as const;
const DISMISS_OFFSET_PX = 100;
const DISMISS_VELOCITY = 650;

function comboMultiplier(percents: number[]) {
  if (!percents.length) return 0;
  return percents.reduce((product, percent) => {
    const price = Math.max(0.01, Math.min(0.99, percent / 100));
    const decimal = 1 / price;
    return product * (1 + (decimal - 1) * COMBO_EDGE);
  }, 1);
}

function formatUsd(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function Emblem({
  logo,
  mark,
  label,
  size = 32,
  className = "",
}: {
  logo?: string;
  mark?: string;
  label: string;
  size?: number;
  className?: string;
}) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 object-contain ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-white/15 font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(8, size * 0.38) }}
      aria-hidden
    >
      {mark ?? label.slice(0, 2).toUpperCase()}
    </span>
  );
}

type Step = "build" | "amount" | "success";

export function ComboSheet({
  open,
  picks,
  onOpenChange,
  onRemove,
  onClear,
}: {
  open: boolean;
  picks: ComboSheetPick[];
  onOpenChange: (open: boolean) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [step, setStep] = useState<Step>("build");
  const [stake, setStake] = useState(10);
  const [copied, setCopied] = useState(false);
  const dragControls = useDragControls();

  const multiplier = useMemo(
    () => comboMultiplier(picks.map((pick) => pick.percent ?? 50)),
    [picks],
  );
  const payout = stake * multiplier;
  const canStake = picks.length >= MIN_PICKS;
  const heading =
    picks.length >= 2 ? `${picks.length} picks Combo` : "Build Combo";

  useEffect(() => {
    if (!open) {
      setStep("build");
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const share = async () => {
    const text = [
      heading,
      ...picks.map(
        (pick) =>
          `${pick.label}${pick.percent != null ? ` · ${pick.percent}¢` : ""}`,
      ),
      `${formatUsd(stake)} to win ${formatUsd(payout)}`,
    ].join("\n");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: heading, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (
      info.offset.y > DISMISS_OFFSET_PX ||
      info.velocity.y > DISMISS_VELOCITY
    ) {
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close combo"
            className="absolute inset-0 bg-black/55"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Combo"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.85 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={onDragEnd}
            className="relative z-[1] flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl border-0 bg-[rgba(20,20,20,0.88)] pb-[max(8px,env(safe-area-inset-bottom))] shadow-none backdrop-blur-[18px]"
          >
            <div
              className="flex touch-none justify-center pb-2 pt-2.5"
              onPointerDown={(event) => dragControls.start(event)}
              aria-hidden
            >
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-2">
              {step === "success" ? (
                <div className="flex min-h-[22.5rem] flex-col gap-3">
                  <header
                    className="relative flex h-8 shrink-0 touch-none items-center justify-center"
                    onPointerDown={(event) => dragControls.start(event)}
                  >
                    <p className="text-base font-semibold leading-none tracking-tight">
                      {picks.length}-picks combo placed
                    </p>
                  </header>
                  <div className="flex justify-center">
                    <span className="flex max-w-full">
                      {picks.map((pick, index) => (
                        <Emblem
                          key={pick.id}
                          logo={pick.logo}
                          mark={pick.mark}
                          label={pick.label}
                          size={32}
                          className={index === 0 ? "" : "-ml-2"}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center gap-0 rounded-xl px-3 py-10">
                    <p className="flex items-center justify-center gap-1.5 text-base font-semibold leading-none text-white">
                      To win
                      <span className="tabular-nums text-[#5dd978]">
                        {multiplier.toFixed(2)}x
                      </span>
                    </p>
                    <p className="mt-2 text-[52px] font-semibold leading-none tabular-nums text-[#5dd978]">
                      {formatUsd(payout)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void share()}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#8481fb] text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]"
                  >
                    {copied ? "Copied" : "Share"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      setStep("build");
                      setStake(10);
                      onOpenChange(false);
                    }}
                    className="h-8 w-full rounded-full text-sm font-semibold text-white/70 transition-transform duration-150 ease-out active:scale-[0.98]"
                  >
                    New combo
                  </button>
                </div>
              ) : null}

              {step === "amount" ? (
                <div className="-mt-3 flex min-h-[22.5rem] flex-col gap-3">
                  <header
                    className="relative flex h-8 shrink-0 touch-none items-center justify-between gap-3"
                    onPointerDown={(event) => {
                      if ((event.target as HTMLElement).closest("button")) return;
                      dragControls.start(event);
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Back to picks"
                      onClick={() => setStep("build")}
                      className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-white/70"
                    >
                      <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden>
                        <path
                          d="M12.5 4.5 7 10l5.5 5.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <h2 className="pointer-events-none absolute inset-x-0 text-center text-base font-semibold leading-none tracking-tight">
                      {picks.length} picks combo
                    </h2>
                    <span className="size-7 shrink-0" aria-hidden />
                  </header>
                  <div className="flex justify-center">
                    <span className="flex max-w-full">
                      {picks.map((pick, index) => (
                        <Emblem
                          key={pick.id}
                          logo={pick.logo}
                          mark={pick.mark}
                          label={pick.label}
                          size={32}
                          className={index === 0 ? "" : "-ml-2"}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-6">
                    <p className="text-sm font-semibold text-white/60">Stake</p>
                    <p className="text-[44px] font-semibold leading-none tabular-nums text-white">
                      {formatUsd(stake)}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white/60">
                      To win{" "}
                      <span className="tabular-nums text-[#5dd978]">
                        {formatUsd(payout)}
                      </span>
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-3">
                    <div className="flex flex-wrap justify-center gap-2">
                      {AMOUNT_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setStake((value) => value + chip)}
                          className="rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]"
                        >
                          +${chip}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setStake(100)}
                        className="rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]"
                      >
                        Max
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={stake <= 0}
                      onClick={() => setStep("success")}
                      className={`h-11 w-full rounded-full text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98] disabled:active:scale-100 ${
                        stake > 0 ? "bg-[#8481fb]" : "bg-[#8481fb]/60"
                      }`}
                    >
                      Place combo
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "build" ? (
                <>
                  <header
                    className="relative mb-4 flex h-8 shrink-0 touch-none items-center justify-between gap-3"
                    onPointerDown={(event) => dragControls.start(event)}
                  >
                    <h2 className="truncate text-2xl font-semibold tracking-tight">
                      {heading}
                    </h2>
                    <div className="flex items-center gap-1.5" aria-hidden>
                      {Array.from({ length: MAX_SLOTS }, (_, index) => (
                        <span
                          key={index}
                          className={`w-[3px] rounded-full transition-[height,background-color] duration-300 ease-out ${
                            index < picks.length
                              ? "h-[9px] bg-[#8481fb]"
                              : "h-1 bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                  </header>

                  <div className="mb-4">
                    {picks.length === 0 ? (
                      <p className="py-8 text-center text-sm font-semibold text-white/60">
                        Pick 2 or more markets
                      </p>
                    ) : (
                      picks.map((pick, index) => (
                        <div
                          key={pick.id}
                          className="relative flex items-center gap-2 rounded-lg px-2 py-1.5"
                        >
                          {index < picks.length - 1 ? (
                            <span
                              aria-hidden
                              className="absolute bottom-0 left-6 top-8 border-l border-dashed border-white/20"
                            />
                          ) : null}
                          <Emblem
                            logo={pick.logo}
                            mark={pick.mark}
                            label={pick.label}
                            size={32}
                            className="relative z-10"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold leading-tight">
                              {pick.label}
                            </p>
                            <p className="truncate text-xs text-white/60">
                              {pick.subtitle ??
                                (pick.percent != null
                                  ? `${pick.percent}¢`
                                  : "Pick")}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${pick.label}`}
                            onClick={() => onRemove(pick.id)}
                            className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10"
                          >
                            <svg
                              viewBox="0 0 12 12"
                              className="size-3"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M3 3l6 6M9 3 3 9"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}

                    {picks.length >= MIN_PICKS ? (
                      <div className="mt-2 border-t border-white/10 pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white/60">
                            Multiplier
                          </p>
                          <p className="text-[36px] font-semibold leading-none tabular-nums text-[#5dd978]">
                            {multiplier.toFixed(2)}x
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!canStake) return;
                      setStep("amount");
                    }}
                    className={`h-11 w-full rounded-full text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98] ${
                      canStake ? "bg-[#8481fb]" : "bg-[#8481fb]/60"
                    }`}
                  >
                    {picks.length === 1
                      ? "Pick 1 more market"
                      : "Choose amount"}
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
