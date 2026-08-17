"use client";

import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { instrumentSansCondensed } from "@/lib/fonts";
import { SheetPager } from "./ui";

const CLOSE_THRESHOLD_PX = 72;
const DEFAULT_AMOUNT = 100;
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50_000;
const PRESETS = [50, 100, 250, 500, 1_000] as const;
const PROCESS_MS = 1100;

const nfMaskStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

const WIN_SPARKLES = [
  { top: "2%", left: "4%", size: 12, delay: "0ms", color: "#E8C44A" },
  { top: "8%", right: "2%", size: 9, delay: "120ms", color: "#00D54B" },
  { top: "42%", left: "-2%", size: 7, delay: "220ms", color: "#FFFFFF" },
  { top: "48%", right: "-4%", size: 11, delay: "80ms", color: "#E8C44A" },
  { bottom: "6%", left: "10%", size: 8, delay: "180ms", color: "#00D54B" },
  { bottom: "0%", right: "12%", size: 10, delay: "260ms", color: "#FFFFFF" },
  { top: "-6%", left: "42%", size: 8, delay: "40ms", color: "#E8C44A" },
  { bottom: "-8%", left: "48%", size: 7, delay: "300ms", color: "#00D54B" },
] as const;

type Step = "amount" | "method" | "pay" | "processing" | "success";
type Method = "apple" | "card" | "bank" | "crypto";

const METHODS: {
  id: Method;
  label: string;
  detail: string;
  instant: boolean;
}[] = [
  { id: "apple", label: "Apple Pay", detail: "Instant", instant: true },
  {
    id: "card",
    label: "Debit card",
    detail: "Instant · Visa, Mastercard",
    instant: true,
  },
  {
    id: "bank",
    label: "Bank transfer",
    detail: "1–2 min · Chase ••••4521",
    instant: false,
  },
  {
    id: "crypto",
    label: "Crypto",
    detail: "USDC on Polygon",
    instant: false,
  },
];

function formatUsdMoney(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUsdShort(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

function methodLabel(id: Method): string {
  return METHODS.find((method) => method.id === id)?.label ?? id;
}

function shortWallet(wallet: string): string {
  if (wallet.length < 12) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function formatCardNumber(digits: string): string {
  return digits.slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(digits: string): string {
  const clipped = digits.slice(0, 4);
  if (clipped.length <= 2) return clipped;
  return `${clipped.slice(0, 2)}/${clipped.slice(2)}`;
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

function CopyIcon({ className }: { className?: string }) {
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

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M11.6 8.3c0-1.7 1.4-2.5 1.5-2.6-0.8-1.2-2.1-1.3-2.5-1.3-1.1-0.1-2.1 0.6-2.6 0.6s-1.4-0.6-2.3-0.6c-1.2 0-2.3 0.7-2.9 1.8-1.2 2.1-0.3 5.3 0.9 7 0.6 0.8 1.3 1.8 2.2 1.7 0.9 0 1.2-0.6 2.3-0.6s1.4 0.6 2.3 0.6c1 0 1.6-0.8 2.2-1.7 0.7-1 1-1.9 1-2 0-0.1-1.9-0.7-1.9-2.9ZM10.3 3.6c0.5-0.6 0.8-1.4 0.7-2.2-0.7 0-1.5 0.5-2 1.1-0.4 0.5-0.8 1.4-0.7 2.2 0.8 0.1 1.5-0.4 2-1.1Z" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="5.5"
        width="18"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M7 15h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BankIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M4 17h16M12 4 4 10h16L12 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CryptoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9.2 8.4h4.2c1.4 0 2.4 0.9 2.4 2.1 0 1-0.6 1.8-1.6 2.1 1.2 0.2 2 1.1 2 2.2 0 1.4-1.1 2.4-2.7 2.4H9.2V8.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MethodGlyph({ id }: { id: Method }) {
  const className = "h-5 w-5";
  if (id === "apple") return <AppleIcon className={className} />;
  if (id === "card") return <CardIcon className={className} />;
  if (id === "bank") return <BankIcon className={className} />;
  return <CryptoIcon className={className} />;
}

function DepositedHero({ value }: { value: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const id = window.requestAnimationFrame(() => {
      setShown(Math.round(value * 100) / 100);
    });
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="relative mx-auto flex w-full max-w-[280px] flex-col items-center">
      <p className="text-[15px] font-semibold text-white/55">Deposited</p>
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
          className={`relative z-10 inline-flex items-baseline text-[52px] font-semibold leading-none tracking-tight text-[#00D54B] animate-[trade-win-pop_0.55s_cubic-bezier(0.32,0.72,0,1)_both] ${instrumentSansCondensed.className}`}
        >
          $
          <NumberFlow
            value={shown}
            trend={1}
            format={{
              useGrouping: true,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }}
            style={nfMaskStyle}
          />
        </p>
      </div>
    </div>
  );
}

export default function DepositModal({
  balance,
  wallet,
  onClose,
  onComplete,
}: {
  balance: number;
  wallet: string;
  onClose: () => void;
  onComplete: (amountUsd: number) => void;
}) {
  const [step, setStep] = useState<Step>("amount");
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [amountDraft, setAmountDraft] = useState(String(DEFAULT_AMOUNT));
  const [amountFocused, setAmountFocused] = useState(false);
  const [method, setMethod] = useState<Method | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<{
    amount: number;
    newBalance: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const receiptRef = useRef<{ amount: number; newBalance: number } | null>(
    null,
  );
  const onCloseRef = useRef(onClose);
  const onCompleteRef = useRef(onComplete);
  onCloseRef.current = onClose;
  onCompleteRef.current = onComplete;

  const cryptoAddress =
    wallet && wallet.startsWith("0x")
      ? wallet
      : "0xA1b2C3d4E5f6789012345678901234567890AbCd";
  const amountValid = amount >= MIN_AMOUNT;
  const cardDigits = cardNumber.replace(/\D/g, "");
  const expiryDigits = cardExpiry.replace(/\D/g, "");
  const cardReady =
    cardDigits.length >= 13 && expiryDigits.length === 4 && cardCvc.length >= 3;
  const canPay =
    method === "card" ? cardReady : method === "crypto" ? true : Boolean(method);

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
      if (e.key !== "Escape") return;
      if (step === "method") {
        goTo("amount", -1);
        return;
      }
      if (step === "pay") {
        goTo("method", -1);
        return;
      }
      if (step === "processing") return;
      closeSheetRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step]);

  useEffect(() => {
    if (step !== "processing") return;
    const id = window.setTimeout(() => {
      const snapshot = receiptRef.current;
      if (!completedRef.current && snapshot) {
        completedRef.current = true;
        setReceipt(snapshot);
        onCompleteRef.current(snapshot.amount);
      }
      goTo("success");
    }, PROCESS_MS);
    return () => window.clearTimeout(id);
  }, [step]);

  const commitAmount = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = Math.min(
      MAX_AMOUNT,
      Math.max(MIN_AMOUNT, digits === "" ? MIN_AMOUNT : Number(digits)),
    );
    setAmount(next);
    setAmountDraft(String(next));
    return next;
  };

  const setPreset = (value: number) => {
    const next = Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, value));
    setAmount(next);
    setAmountDraft(String(next));
  };

  const startPay = (next: Method) => {
    setMethod(next);
    goTo("pay");
  };

  const submitPay = () => {
    if (!canPay) return;
    receiptRef.current = { amount, newBalance: balance + amount };
    goTo("processing");
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(cryptoAddress);
    } catch {
      // Clipboard may be unavailable in this playground shell.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input")) return;
    if (step === "processing") return;
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

  const ariaLabel =
    step === "method"
      ? "Choose payment method"
      : step === "pay"
        ? "Confirm deposit"
        : step === "processing"
          ? "Depositing"
          : step === "success"
            ? "Deposited"
            : "Deposit";

  return (
    <div className="absolute inset-0 z-40">
      <div
        className={`absolute inset-0 bg-[#6e6e73]/45 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={step === "processing" ? undefined : closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="absolute inset-x-0 bottom-0 flex max-h-[94%] flex-col overflow-hidden rounded-t-[1.75rem] bg-black shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        style={{
          transform: open
            ? `translateY(${drawerOffset}px)`
            : "translateY(100%)",
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
            {step === "amount" && (
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                    Deposit
                  </h2>
                  <p className="mt-1 text-[13px] text-white/45">
                    Add funds to start trading
                  </p>
                </div>

                <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-medium text-white/45">
                      Amount
                    </p>
                    <label
                      className={`inline-flex cursor-text items-baseline text-[34px] font-semibold leading-none tabular-nums tracking-tight text-white ${instrumentSansCondensed.className}`}
                      onClick={() => amountInputRef.current?.focus()}
                    >
                      <input
                        ref={amountInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label="Deposit amount in dollars"
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
                          const next = Math.min(MAX_AMOUNT, Number(digits));
                          if (Number.isFinite(next)) {
                            setAmount(Math.max(0, next));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            amountInputRef.current?.blur();
                            if (amountValid) goTo("method");
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
                      <span aria-hidden>$</span>
                    </label>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {PRESETS.map((value) => {
                      const active = amount === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPreset(value)}
                          className={`min-w-0 flex-1 rounded-full py-1.5 text-[13px] font-semibold transition-colors ${
                            active
                              ? "bg-white text-black"
                              : "bg-white/[0.1] text-white/80 hover:bg-white/15"
                          }`}
                        >
                          {value >= 1000 ? `$${value / 1000}k` : `$${value}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-1">
                  <div className="flex items-center justify-between py-3 text-[14px]">
                    <span className="text-white/45">Current balance</span>
                    <span className="font-semibold tabular-nums">
                      {formatUsdMoney(balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] py-3 text-[14px]">
                    <span className="font-semibold text-white/70">
                      After deposit
                    </span>
                    <span className="font-semibold tabular-nums text-[#00D54B]">
                      {formatUsdMoney(balance + amount)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!amountValid}
                  onClick={() => goTo("method")}
                  className="w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
                >
                  Continue
                </button>
                <p className="text-center text-[11px] text-white/35">
                  Minimum {formatUsdShort(MIN_AMOUNT)} · No deposit fee
                </p>
              </div>
            )}

            {step === "method" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => goTo("amount", -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <BackIcon className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                      Pay with
                    </h2>
                    <p className="mt-0.5 text-[13px] text-white/45">
                      {formatUsdMoney(amount)}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
                  {METHODS.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => startPay(item.id)}
                      className={`flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors hover:bg-white/[0.04] ${
                        index > 0 ? "border-t border-white/[0.06]" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.1] text-white">
                        <MethodGlyph id={item.id} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-white/40">
                          {item.detail}
                        </span>
                      </span>
                      <ChevronIcon className="h-4 w-4 shrink-0 text-white/30" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "pay" && method && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Back"
                    onClick={() => goTo("method", -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <BackIcon className="h-4 w-4" />
                  </button>
                  <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                    {methodLabel(method)}
                  </h2>
                </div>

                <div className="text-center">
                  <p className="text-[15px] font-medium text-white/55">
                    You deposit
                  </p>
                  <p
                    className={`mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] ${instrumentSansCondensed.className}`}
                  >
                    {formatUsdMoney(amount)}
                  </p>
                </div>

                {method === "apple" && (
                  <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.1]">
                        <AppleIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">Apple Pay</p>
                        <p className="mt-0.5 text-[12px] text-white/40">
                          Visa •••• 4242
                        </p>
                      </div>
                      <span className="rounded-full bg-[#00D54B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#00D54B]">
                        Instant
                      </span>
                    </div>
                  </div>
                )}

                {method === "card" && (
                  <div className="overflow-hidden rounded-[20px] bg-white/[0.08]">
                    <label className="block border-b border-white/[0.06] px-3.5 py-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">
                        Card number
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="ACCT-000015"
                        value={formatCardNumber(cardDigits)}
                        onChange={(e) =>
                          setCardNumber(e.target.value.replace(/\D/g, ""))
                        }
                        className="mt-1 w-full bg-transparent text-[15px] font-semibold tabular-nums text-white outline-none placeholder:text-white/25"
                      />
                    </label>
                    <div className="grid grid-cols-2">
                      <label className="border-r border-white/[0.06] px-3.5 py-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">
                          Expiry
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          value={formatExpiry(expiryDigits)}
                          onChange={(e) =>
                            setCardExpiry(e.target.value.replace(/\D/g, ""))
                          }
                          className="mt-1 w-full bg-transparent text-[15px] font-semibold tabular-nums text-white outline-none placeholder:text-white/25"
                        />
                      </label>
                      <label className="px-3.5 py-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/40">
                          CVC
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          placeholder="123"
                          value={cardCvc}
                          maxLength={4}
                          onChange={(e) =>
                            setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          className="mt-1 w-full bg-transparent text-[15px] font-semibold tabular-nums text-white outline-none placeholder:text-white/25"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {method === "bank" && (
                  <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.1]">
                        <BankIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold">
                          Chase checking
                        </p>
                        <p className="mt-0.5 text-[12px] text-white/40">
                          ••••4521 · Instant
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-[12px] leading-snug text-white/40">
                      Funds usually land in under two minutes. This demo
                      completes instantly.
                    </p>
                  </div>
                )}

                {method === "crypto" && (
                  <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-3.5">
                    <p className="text-[12px] font-medium text-white/45">
                      Send USDC on Polygon
                    </p>
                    <p className="mt-2 break-all font-mono text-[13px] leading-snug text-white">
                      {cryptoAddress}
                    </p>
                    <button
                      type="button"
                      onClick={() => void copyAddress()}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.1] py-2.5 text-[13px] font-semibold text-white hover:bg-white/15"
                    >
                      <CopyIcon className="h-4 w-4" />
                      {copied ? "Copied" : "Copy address"}
                    </button>
                    <p className="mt-3 text-[12px] leading-snug text-white/40">
                      Only send USDC on Polygon to {shortWallet(cryptoAddress)}.
                      This demo credits you as soon as you confirm.
                    </p>
                  </div>
                )}

                <div className="rounded-[20px] bg-white/[0.08] px-3.5 py-1">
                  <div className="flex items-center justify-between py-3 text-[14px]">
                    <span className="text-white/45">Fee</span>
                    <span className="font-semibold tabular-nums">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] py-3 text-[14px]">
                    <span className="font-semibold text-white/70">Total</span>
                    <span className="font-semibold tabular-nums">
                      {formatUsdMoney(amount)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canPay}
                  onClick={submitPay}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40"
                >
                  {method === "apple" ? (
                    <>
                      <AppleIcon className="h-4 w-4" />
                      Pay {formatUsdMoney(amount)}
                    </>
                  ) : method === "crypto" ? (
                    "I've sent it"
                  ) : method === "bank" ? (
                    `Transfer ${formatUsdMoney(amount)}`
                  ) : (
                    `Pay ${formatUsdMoney(amount)}`
                  )}
                </button>
              </div>
            )}

            {step === "processing" && (
              <div className="flex flex-col items-center py-10 text-center">
                <span
                  aria-hidden
                  className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white"
                />
                <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">
                  Depositing
                </h2>
                <p className="mt-1.5 text-[14px] text-white/45">
                  {formatUsdMoney(amount)} via {method ? methodLabel(method) : "…"}
                </p>
              </div>
            )}

            {step === "success" && receipt && (
              <div className="flex flex-col items-center pb-1 pt-2 text-center">
                <div className="w-full">
                  <DepositedHero value={receipt.amount} />
                  <p className="mt-1 text-[13px] text-white/45">
                    Added to your balance
                  </p>

                  <div className="mt-5 overflow-hidden rounded-[20px] bg-white/[0.08] text-left">
                    <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.1] text-white">
                        {method ? <MethodGlyph id={method} /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">
                          {method ? methodLabel(method) : "Deposit"}
                        </p>
                        <p className="mt-0.5 text-[12px] text-white/40">
                          Instant · No fee
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#00D54B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#00D54B]">
                        Complete
                      </span>
                    </div>
                    <dl className="flex flex-col gap-1.5 px-3.5 py-3 text-[13px]">
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">Amount</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatUsdMoney(receipt.amount)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">Fee</dt>
                        <dd className="font-semibold tabular-nums">$0.00</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-white/45">New balance</dt>
                        <dd className="font-semibold tabular-nums text-[#00D54B]">
                          {formatUsdMoney(receipt.newBalance)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <button
                    type="button"
                    onClick={closeSheet}
                    className="mt-3 w-full rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    Done
                  </button>
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
      `}</style>
    </div>
  );
}
