"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { PolymarketLeaderboardWallet } from "@/lib/polymarketscan";
import OnboardingPhysics from "./OnboardingPhysics";

type OnboardingStep = "welcome" | "invite" | "in";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const TITLE_EASE = [0.16, 1, 0.3, 1] as const;
const TITLE_WORDS = ["follow", "share", "earn", "copy"] as const;
const INVITE_LENGTH = 6;
const INVITE_CODE = "111111";

const letterVariants = {
  initial: { y: "110%" },
  animate: { y: "0%" },
  exit: { y: "-110%" },
};

function WordLetters({
  value,
  className = "",
  ...rest
}: {
  value: string;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`inline-flex whitespace-nowrap ${className}`} {...rest}>
      {value.split("").map((letter, letterIndex) => (
        <span key={`${value}-${letterIndex}`} className="inline-block">
          {letter}
        </span>
      ))}
    </span>
  );
}

/** Same rotating title as /waitlist, sized for the onboarding phone. */
function RotatingTitle() {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState<number | "auto">("auto");
  const measureRef = useRef<HTMLSpanElement>(null);
  const word = TITLE_WORDS[index];
  const letters = word.split("");

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % TITLE_WORDS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-word="${word}"]`);
    if (!el) return;
    const next = Math.ceil(el.getBoundingClientRect().width) + 8;
    let shrinkTimer = 0;
    setWidth((prev) => {
      if (typeof prev !== "number" || next >= prev) return next;
      shrinkTimer = window.setTimeout(() => setWidth(next), 560);
      return prev;
    });
    return () => {
      if (shrinkTimer) window.clearTimeout(shrinkTimer);
    };
  }, [word]);

  return (
    <h1 className="text-balance text-center text-[32px] font-medium leading-[1.05] tracking-[-0.04em]">
      <span className="block text-white/45">Social prediction app</span>
      <span className="block">
        <span className="text-white/45">for you to </span>
        <motion.span
          className="inline-grid overflow-hidden align-baseline leading-[inherit] text-white"
          initial={false}
          animate={{ width }}
          transition={{ duration: 0.6, ease: TITLE_EASE }}
          aria-label={word}
        >
          <WordLetters
            value="follow"
            className="invisible col-start-1 row-start-1"
            aria-hidden
          />
          <span
            ref={measureRef}
            className="pointer-events-none invisible absolute left-0 top-0"
            aria-hidden
          >
            {TITLE_WORDS.map((item) => (
              <span
                key={item}
                data-word={item}
                className="absolute left-0 top-0"
              >
                <WordLetters value={item} />
              </span>
            ))}
          </span>
          <span className="relative col-start-1 row-start-1 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.span
                key={word}
                className="absolute left-0 top-0 inline-flex will-change-transform"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={{
                  initial: {},
                  animate: {
                    transition: {
                      staggerChildren: 0.028,
                      delayChildren: 0.02,
                    },
                  },
                  exit: {
                    transition: {
                      staggerChildren: 0.022,
                      staggerDirection: -1,
                    },
                  },
                }}
              >
                {letters.map((letter, letterIndex) => (
                  <motion.span
                    key={`${word}-${letterIndex}`}
                    variants={letterVariants}
                    transition={{ duration: 0.52, ease: TITLE_EASE }}
                    className="inline-block leading-[inherit]"
                  >
                    {letter}
                  </motion.span>
                ))}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.span>
      </span>
    </h1>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

function WalletGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <rect
        x="2.25"
        y="4.75"
        width="15.5"
        height="11.5"
        rx="2.25"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M2.25 8.25h15.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="14.25" cy="12.15" r="1" fill="currentColor" />
    </svg>
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

/**
 * Aqua gel pill — white primary matches heyclicky “download for windows”
 * (gloss strip + screen / color-burn edge washes).
 */
function AquaButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`aqua-btn relative isolate flex h-12 items-center justify-center gap-2.5 overflow-hidden rounded-full px-5 pb-px text-[16px] font-medium tracking-[-0.03em] transition-[transform,opacity] duration-150 ease-out enabled:hover:opacity-80 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 ${className}`}
      style={{
        color: isPrimary ? "#000" : "#f5f5f5",
        textShadow: isPrimary
          ? "0 2px 2px rgba(255,255,255,0.8)"
          : "0 1px 1px rgba(0,0,0,0.35)",
        background: isPrimary
          ? "linear-gradient(#fbfbfb 0%, #ededed 42%, #e4e4e4 100%)"
          : "linear-gradient(#3a3a3e 0%, #2a2a2e 42%, #1c1c1f 100%)",
        border: isPrimary ? "1px solid #626262" : "1px solid #5a5a60",
        boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
      }}
    >
      {/* Top gloss strip (heyclicky btn-gloss.png) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-[3px] z-[1] h-3 rounded-full bg-[length:100%_100%] bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/worm-app/btn-gloss.png)" }}
      />
      {/* Screen wash + color-burn lip */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] mix-blend-screen"
        style={{ boxShadow: "inset 0 -15px 2px -12px rgba(255,255,255,0.25)" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] mix-blend-color-burn"
        style={{
          boxShadow: isPrimary
            ? "inset 0 -8px 0 4px #b3b3b3"
            : "inset 0 -8px 0 4px #6a6a70",
        }}
      />
      <span className="relative z-[2] flex items-center justify-center gap-2.5">
        {children}
      </span>
    </button>
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
  onComplete,
}: {
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

  const submitInvite = () => {
    if (inviteCode === INVITE_CODE) setStep("in");
    else setInviteError(true);
  };

  const finish = () => onComplete(null);

  const back = () => {
    if (step === "in") setStep("invite");
    else setStep("welcome");
  };

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-black px-5 pt-[64px] pb-5"
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
        <div className="relative flex min-h-0 flex-1 flex-col pb-5">
          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center">
            <motion.img
              src="/worm-app/floating-logo.png"
              alt=""
              draggable={false}
              className="pointer-events-none h-auto w-[72%] max-w-[260px] select-none object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: [0, -10, 0],
                scale: 1,
              }}
              transition={{
                opacity: { duration: 0.5, ease: STEP_EASE },
                scale: { duration: 0.5, ease: STEP_EASE },
                y: {
                  duration: 4.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.35,
                },
              }}
            />
          </div>
          <div className="relative z-10 flex shrink-0 flex-col items-center gap-6">
            <RotatingTitle />
            <AquaButton
              onClick={() => setStep("invite")}
              className="pointer-events-auto mx-auto min-w-[220px]"
            >
              I have an invite code
            </AquaButton>
          </div>
        </div>
      )}

      {step === "invite" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-center text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            Enter the invite code you have received
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
          <div className="mt-auto flex flex-col gap-4">
            <AquaButton
              disabled={inviteCode.length < INVITE_LENGTH}
              onClick={submitInvite}
              className="w-full"
            >
              Let me in
            </AquaButton>
            <TermsNote />
          </div>
        </div>
      )}


      {step === "in" && (
        <div className="relative flex min-h-0 flex-1 flex-col justify-end pb-1">
          <div className="pointer-events-none absolute inset-x-0 top-[8%] z-10 flex flex-col items-center px-2 text-center">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">
              You&apos;re in
            </h1>
            <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-white/55">
              Sign in to copy traders and track your positions.
            </p>
          </div>
          <div className="relative z-10 flex shrink-0 flex-col gap-2.5">
            <AquaButton
              onClick={finish}
              className="pointer-events-auto w-full"
            >
              <GoogleMark />
              Continue with Google
            </AquaButton>
            <AquaButton
              variant="secondary"
              onClick={finish}
              className="pointer-events-auto w-full"
            >
              <WalletGlyph />
              Connect wallet
            </AquaButton>
          </div>
        </div>
      )}
      </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
