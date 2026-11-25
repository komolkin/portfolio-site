"use client";

import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TextMorph } from "torph/react";
import { allo } from "@/lib/fonts";
import { playComboPlace } from "@/lib/combo-sound";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import {
  AmountKeypad,
  applyAmountKey,
} from "@/components/playground/projects/api/ui";

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
const STAKE_CAP = 100;
const QUICK_AMOUNTS = [5, 25, 100] as const;
const DISMISS_OFFSET_PX = 100;
const DISMISS_VELOCITY = 650;
const GREEN = "#1DB954";
/** Match MarketCard Yes/No — primary full-width CTA */
const PRIMARY_BTN =
  "flex h-[52px] w-full items-center justify-center rounded-[18px] text-[16px] font-semibold transition-transform duration-150 ease-out active:scale-[0.94]";
const SECONDARY_BTN =
  "flex h-[52px] w-full items-center justify-center rounded-[18px] text-[16px] font-semibold text-black/40 transition-transform duration-150 ease-out active:scale-[0.94]";

export function comboMultiplier(percents: number[]) {
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
        className={`shrink-0 rounded-[8px] object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[8px] bg-black/[0.06] font-semibold text-black/70 ${className}`}
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
  onClear: (opts?: { silent?: boolean }) => void;
}) {
  const [step, setStep] = useState<Step>("build");
  const [amountDigits, setAmountDigits] = useState("");
  const [copied, setCopied] = useState(false);
  const dragControls = useDragControls();

  const multiplier = useMemo(
    () => comboMultiplier(picks.map((pick) => pick.percent ?? 50)),
    [picks],
  );
  const stake = amountDigits === "" ? 0 : Number(amountDigits);
  const stakeValid = stake >= 1;
  const payout = stake * multiplier;
  const canStake = picks.length >= MIN_PICKS;
  const heading =
    picks.length >= 2 ? `${picks.length} picks Combo` : "Build Combo";

  const pressKey = (key: string) => {
    setAmountDigits((prev) => applyAmountKey(prev, key, STAKE_CAP));
  };
  const pressKeyRef = useRef(pressKey);
  pressKeyRef.current = pressKey;
  const stakeValidRef = useRef(stakeValid);
  stakeValidRef.current = stakeValid;
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!open) {
      setStep("build");
      setAmountDigits("");
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (stepRef.current !== "amount") return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pressKeyRef.current(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        pressKeyRef.current("back");
      } else if (event.key === "Enter" && stakeValidRef.current) {
        event.preventDefault();
        hapticSuccess();
        playComboPlace();
        setStep("success");
      }
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

  const scrollRef = useRef<HTMLDivElement>(null);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (
      info.offset.y > DISMISS_OFFSET_PX ||
      info.velocity.y > DISMISS_VELOCITY
    ) {
      onOpenChange(false);
    }
  };

  const startSheetDrag = (event: ReactPointerEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, a, [data-no-sheet-drag]")) {
      return;
    }
    const scroller = scrollRef.current;
    if (scroller && scroller.scrollTop > 0) return;
    dragControls.start(event);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={`absolute inset-0 z-50 flex items-end justify-center text-black ${allo.className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close combo"
            className="absolute inset-0 bg-black/25"
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
            onPointerDown={startSheetDrag}
            className="relative z-[1] flex max-h-[88%] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[28px] bg-white pb-[max(8px,env(safe-area-inset-bottom))] text-black shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
          >
            <div className="flex touch-none justify-center pb-2 pt-2.5" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-black/15" />
            </div>

            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2"
            >
              {step === "success" ? (
                <div className="flex min-h-[22.5rem] flex-col gap-3">
                  <header className="relative flex h-8 shrink-0 touch-none items-center justify-center">
                    <p className="text-base font-semibold leading-none tracking-tight text-black">
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
                    <p className="text-base font-semibold leading-none text-black">
                      <span className="tabular-nums">{formatUsd(stake)}</span>
                      {" to win"}
                    </p>
                    <p
                      className="mt-2 text-[52px] font-semibold leading-none tabular-nums"
                      style={{ color: GREEN }}
                    >
                      {formatUsd(payout)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      void share();
                    }}
                    className={`${PRIMARY_BTN} gap-2 bg-black text-white`}
                  >
                    {copied ? "Copied" : "Share"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticTap();
                      onClear({ silent: true });
                      setStep("build");
                      setAmountDigits("");
                      onOpenChange(false);
                    }}
                    className={SECONDARY_BTN}
                  >
                    New combo
                  </button>
                </div>
              ) : null}

              {step === "amount" ? (
                <div className="-mt-3 flex min-h-[28rem] flex-col gap-3">
                  <header className="relative flex h-8 shrink-0 touch-none items-center justify-between gap-3">
                    <button
                      type="button"
                      aria-label="Back to picks"
                      onClick={() => setStep("build")}
                      className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full text-black/45"
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
                    <h2 className="pointer-events-none absolute inset-x-0 text-center text-base font-semibold leading-none tracking-tight text-black">
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
                  <div className="flex flex-col items-center py-2">
                    <p className="text-sm font-semibold text-black/40">Stake</p>
                    <p
                      className="mt-1 inline-flex items-baseline justify-center text-[44px] font-semibold leading-none tracking-tight tabular-nums text-black"
                      aria-live="polite"
                    >
                      $
                      <TextMorph
                        as="span"
                        numbers
                        duration={220}
                        ease={{ stiffness: 480, damping: 36 }}
                      >
                        {stake.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </TextMorph>
                    </p>
                    <p
                      className={`mt-2 text-sm font-semibold text-black/40 transition-opacity duration-200 ${
                        stakeValid ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden={!stakeValid}
                    >
                      To win{" "}
                      <TextMorph
                        as="span"
                        numbers
                        duration={240}
                        className="tabular-nums"
                        style={{ color: GREEN }}
                      >
                        {formatUsd(payout)}
                      </TextMorph>
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2" data-no-sheet-drag>
                    <div className="grid shrink-0 grid-cols-4 gap-2">
                      {QUICK_AMOUNTS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            hapticTap();
                            setAmountDigits(
                              String(Math.min(value, STAKE_CAP)),
                            );
                          }}
                          className="h-10 rounded-full bg-black/[0.05] text-[13px] font-semibold text-black transition-colors hover:bg-black/[0.08]"
                        >
                          ${value}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          hapticTap();
                          setAmountDigits(String(STAKE_CAP));
                        }}
                        className="h-10 rounded-full bg-black/[0.05] text-[13px] font-semibold text-black transition-colors hover:bg-black/[0.08]"
                      >
                        Max
                      </button>
                    </div>
                    <AmountKeypad
                      onKey={(key) => {
                        hapticTap();
                        pressKey(key);
                      }}
                      tone="light"
                    />
                    <button
                      type="button"
                      disabled={!stakeValid}
                      onClick={() => {
                        if (!stakeValid) return;
                        hapticSuccess();
                        playComboPlace();
                        setStep("success");
                      }}
                      className={`${PRIMARY_BTN} disabled:active:scale-100 ${
                        stakeValid
                          ? "bg-black text-white"
                          : "bg-black/[0.06] text-black/30"
                      }`}
                    >
                      {stakeValid ? "Place combo" : "Enter amount"}
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "build" ? (
                <>
                  <header className="relative mb-4 flex h-8 shrink-0 touch-none items-center justify-between gap-3">
                    <h2 className="truncate text-2xl font-semibold tracking-tight text-black">
                      {heading}
                    </h2>
                    <div className="flex items-center gap-1.5" aria-hidden>
                      {Array.from({ length: MAX_SLOTS }, (_, index) => (
                        <span
                          key={index}
                          className={`w-[3px] rounded-full transition-[height,background-color] duration-300 ease-out ${
                            index < picks.length
                              ? "h-[9px] bg-black"
                              : "h-1 bg-black/15"
                          }`}
                        />
                      ))}
                    </div>
                  </header>

                  <div className="mb-4">
                    {picks.length === 0 ? (
                      <p className="py-8 text-center text-sm font-semibold text-black/40">
                        Pick 2 or more markets
                      </p>
                    ) : (
                      picks.map((pick, index) => (
                        <div
                          key={pick.id}
                          className="relative flex items-center gap-2 rounded-lg py-1.5"
                        >
                          <div className="relative z-10 w-8 shrink-0 self-stretch">
                            {index > 0 ? (
                              <span
                                aria-hidden
                                className="absolute left-1/2 top-0 h-[calc(50%-16px)] w-px -translate-x-1/2 border-l border-dashed border-black/15"
                              />
                            ) : null}
                            {index < picks.length - 1 ? (
                              <span
                                aria-hidden
                                className="absolute bottom-0 left-1/2 top-[calc(50%+16px)] w-px -translate-x-1/2 border-l border-dashed border-black/15"
                              />
                            ) : null}
                            <div className="relative z-10 flex h-full items-center justify-center">
                              <Emblem
                                logo={pick.logo}
                                mark={pick.mark}
                                label={pick.label}
                                size={32}
                              />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-black/45">
                              {pick.subtitle ??
                                (pick.percent != null
                                  ? `${pick.percent}¢`
                                  : "Pick")}
                            </p>
                            <p className="truncate text-base font-semibold leading-tight text-black">
                              {pick.label}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${pick.label}`}
                            onClick={() => {
                              hapticTap();
                              onRemove(pick.id);
                            }}
                            className="grid size-6 shrink-0 place-items-center rounded-full bg-black/[0.06] text-black/55"
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
                      <div className="mt-2 border-t border-dashed border-black/10 pt-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-black/40">
                            Multiplier
                          </p>
                          <p
                            className="text-[36px] font-semibold leading-none tabular-nums"
                            style={{ color: GREEN }}
                          >
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
                      hapticTap();
                      setStep("amount");
                    }}
                    className={`${PRIMARY_BTN} ${
                      canStake
                        ? "bg-black text-white"
                        : "bg-black/[0.06] text-black/40"
                    }`}
                  >
                    {picks.length === 1
                      ? "Pick 1 more market"
                      : "Choose amount"}
                  </button>
                  {picks.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        hapticTap();
                        onClear();
                        onOpenChange(false);
                      }}
                      className={`mt-1 ${SECONDARY_BTN}`}
                    >
                      Reset
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
