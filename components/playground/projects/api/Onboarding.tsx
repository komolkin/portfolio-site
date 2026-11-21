"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { PolymarketLeaderboardWallet } from "@/lib/polymarketscan";
import AquaButton from "@/components/worm-app/AquaButton";
import Worm from "@/components/playground/projects/worm/Worm";
import OnboardingPhysics from "./OnboardingPhysics";

type OnboardingStep = "welcome" | "invite" | "in";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const INVITE_LENGTH = 6;
const INVITE_CODE = "111111";

function FloatingLogo() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <motion.img
      ref={imgRef}
      src="/worm-app/floating-logo.png"
      alt=""
      draggable={false}
      onLoad={() => setLoaded(true)}
      className="h-auto w-[58%] max-w-[210px] select-none object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
      initial={false}
      animate={
        loaded
          ? { opacity: 1, scale: 1, y: [0, -10, 0] }
          : { opacity: 0, scale: 0.92, y: 0 }
      }
      transition={
        loaded
          ? {
              opacity: { duration: 0.55, ease: STEP_EASE },
              scale: { duration: 0.7, ease: STEP_EASE },
              y: {
                duration: 4.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.55,
              },
            }
          : { duration: 0 }
      }
    />
  );
}

function TermsNote() {
  return (
    <p className="text-center text-[11px] leading-[1.45] text-white/45">
      By using Worm, you agree to accept our
      <br />
      <button type="button" className="font-semibold text-white/85">
        Terms of Use
      </button>{" "}
      and{" "}
      <button type="button" className="font-semibold text-white/85">
        Privacy Policy
      </button>
    </p>
  );
}

function InviteCodeInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const half = INVITE_LENGTH / 2;
  const cell = (index: number) => {
    const char = value[index];
    const active = focused && index === Math.min(value.length, INVITE_LENGTH - 1);
    return (
      <span
        key={index}
        className={`flex h-14 w-11 items-center justify-center rounded-[14px] text-[24px] font-semibold uppercase tabular-nums transition-colors ${
          active ? "bg-white/[0.14] ring-1 ring-white/50" : "bg-white/[0.08]"
        } ${char ? "text-white" : "text-white/25"}`}
      >
        {char ?? "*"}
      </span>
    );
  };
  return (
    <label className="relative mt-8 flex items-center justify-center gap-2">
      {Array.from({ length: half }, (_, i) => cell(i))}
      <span className="mx-1 text-[22px] font-semibold text-white/30">-</span>
      {Array.from({ length: half }, (_, i) => cell(i + half))}
      <input
        type="text"
        inputMode="text"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        aria-label="Invite code"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.length === INVITE_LENGTH) onSubmit();
        }}
        onChange={(e) =>
          onChange(
            e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .slice(0, INVITE_LENGTH),
          )
        }
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </label>
  );
}

export default function Onboarding({
  compactChrome = false,
  onComplete,
}: {
  /** /worm-app — no fake status bar; keep a small top inset only. */
  compactChrome?: boolean;
  traders?: PolymarketLeaderboardWallet[];
  tradersStatus?: "loading" | "ready" | "error";
  marketImages?: string[];
  teamLogos?: string[];
  isFollowing?: (wallet: string) => boolean;
  onToggleFollow?: (wallet: string, displayName?: string | null) => void;
  onComplete: (username: string | null) => void;
}) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState(false);
  const [snakeOpen, setSnakeOpen] = useState(false);

  const submitInvite = () => {
    if (inviteCode === INVITE_CODE) setStep("in");
    else setInviteError(true);
  };

  const finish = () => onComplete(null);

  const back = () => {
    if (step === "in") setStep("invite");
    else setStep("welcome");
  };

  const goInvite = () => {
    setSnakeOpen(false);
    setStep("invite");
  };

  const enterFromGame = useCallback(() => {
    setSnakeOpen(false);
    setStep("in");
  }, []);

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col overflow-hidden bg-black px-5 pb-5 ${
        compactChrome ? "pt-5" : "pt-[64px]"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Get started"
    >
      <AnimatePresence initial={false}>
        {step === "in" ? (
          <motion.div
            key="river"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: STEP_EASE }}
          >
            <OnboardingPhysics />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[28%] bg-gradient-to-t from-black via-black/55 to-transparent"
            />
          </motion.div>
        ) : (
          <motion.div
            key="glow"
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[48%]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: STEP_EASE }}
            style={{
              background:
                "radial-gradient(ellipse 110% 90% at 50% -8%, rgba(58, 86, 104, 0.58) 0%, rgba(34, 53, 68, 0.28) 38%, transparent 72%)",
            }}
          />
        )}
      </AnimatePresence>
      {/* Pinned to the dialog so progress/step swaps don't shove it around. */}
      <AnimatePresence initial={false} mode="wait">
        {step === "welcome" && !snakeOpen ? (
          <motion.div
            key="float-logo"
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center pb-[8%]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ duration: 0.32, ease: STEP_EASE }}
          >
            <FloatingLogo />
          </motion.div>
        ) : null}
        {step === "welcome" && snakeOpen ? (
          <motion.div
            key="snake-game"
            className="absolute inset-x-0 top-[8%] bottom-[120px] z-[2]"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ duration: 0.32, ease: STEP_EASE }}
          >
            <Worm embedded onWin={enterFromGame} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className={`relative z-[3] flex min-h-0 flex-1 flex-col ${
          step === "welcome" || step === "in" ? "pointer-events-none" : ""
        }`}
      >
      <AnimatePresence initial={false}>
      {step !== "welcome" && (
        <motion.div
          key="progress"
          className="pointer-events-auto mb-6 grid grid-cols-[1fr_auto_1fr] items-center"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.3, delay: 0.18, ease: STEP_EASE }}
        >
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="-ml-2 flex h-9 w-9 items-center justify-center justify-self-start rounded-full text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path
                d="M10 3.5 5.5 8l4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex gap-1.5" aria-hidden>
            {(["invite", "in"] as const).map((id) => (
              <span
                key={id}
                className={`h-1 w-6 rounded-full ${
                  step === id ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        className="flex min-h-0 flex-1 flex-col"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10, transition: { duration: 0.16, ease: "easeIn" } }}
        transition={{ duration: 0.32, ease: STEP_EASE }}
      >
      {step === "welcome" && (
        <div className="relative flex min-h-0 flex-1 flex-col justify-end pb-5">
          <div className="relative z-10 flex w-full shrink-0 items-center justify-center gap-2">
            <AquaButton
              onClick={goInvite}
              className="pointer-events-auto h-12 min-w-0 flex-1 whitespace-nowrap px-4 text-[15px]"
            >
              I have a code
            </AquaButton>
            <AquaButton
              gloss={false}
              variant="secondary"
              aria-pressed={snakeOpen}
              onClick={() => setSnakeOpen((open) => !open)}
              className="pointer-events-auto h-12 min-w-0 flex-1 whitespace-nowrap px-4 text-[15px]"
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={snakeOpen ? "close" : "play"}
                  className="inline-flex items-center justify-center whitespace-nowrap"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: STEP_EASE }}
                >
                  {snakeOpen ? "Close" : "Play to get in"}
                </motion.span>
              </AnimatePresence>
            </AquaButton>
          </div>
        </div>
      )}

      {step === "invite" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-center text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            Enter the invite code
          </h1>
          <InviteCodeInput
            value={inviteCode}
            onChange={(value) => {
              setInviteCode(value);
              setInviteError(false);
            }}
            onSubmit={submitInvite}
          />
          <p
            role="alert"
            className={`mt-3 text-center text-[13px] font-medium text-[#FF375F] transition-opacity ${
              inviteError ? "opacity-100" : "opacity-0"
            }`}
          >
            That invite code isn&apos;t valid
          </p>
          <div className="mt-auto flex flex-col">
            <AquaButton
              disabled={inviteCode.length < INVITE_LENGTH}
              onClick={submitInvite}
              className="h-12 w-full px-5 text-[16px]"
            >
              Let me in
            </AquaButton>
          </div>
        </div>
      )}


      {step === "in" && (
        <div className="relative flex min-h-0 flex-1 flex-col justify-end pb-1">
          <div className="pointer-events-none absolute inset-x-0 top-[8%] z-10 flex flex-col items-center px-2 text-center">
            <h1 className="text-[40px] font-semibold leading-tight tracking-[-0.035em]">
              You&apos;re in
            </h1>
            <p className="mt-1.5 max-w-[300px] text-[14px] leading-snug text-white/55">
              Copy whales, track markets, get instant alerts — trade and have
              fun.
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col gap-4">
            <div className="pointer-events-auto">
              <AquaButton
                onClick={finish}
                className="h-12 w-full px-5 text-[16px]"
              >
                Get started
              </AquaButton>
            </div>
            <div className="pointer-events-auto">
              <TermsNote />
            </div>
          </div>
        </div>
      )}
      </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
