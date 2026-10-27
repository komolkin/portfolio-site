"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { PolymarketLeaderboardWallet } from "@/lib/polymarketscan";
import { FollowButton } from "./FeedPositionSheet";
import MarketRiver from "./MarketRiver";
import UserAvatar from "./UserAvatar";

type OnboardingStep = "welcome" | "invite" | "in" | "follow";

const STEP_EASE = [0.22, 1, 0.36, 1] as const;
const INVITE_LENGTH = 6;
const INVITE_CODE = "111111";

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

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatSignedUsd(value: number): string {
  const formatted = formatUsd(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted.replace("-", "")}`;
  return formatUsd(0);
}

export default function Onboarding({
  traders,
  tradersStatus,
  marketImages,
  teamLogos,
  isFollowing,
  onToggleFollow,
  onComplete,
}: {
  traders: PolymarketLeaderboardWallet[];
  tradersStatus: "loading" | "ready" | "error";
  marketImages: string[];
  teamLogos: string[];
  isFollowing: (wallet: string) => boolean;
  onToggleFollow: (wallet: string) => void;
  onComplete: (username: string | null) => void;
}) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState(false);

  const submitInvite = () => {
    if (inviteCode === INVITE_CODE) setStep("in");
    else setInviteError(true);
  };
  const suggested = useMemo(
    () => traders.slice(0, 8),
    [traders],
  );

  const finish = () => onComplete(null);

  const back = () => {
    if (step === "follow") setStep("in");
    else if (step === "in") setStep("invite");
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
        {step === "welcome" ? (
          <motion.div
            key="river"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: STEP_EASE }}
          >
            <MarketRiver images={marketImages} logos={teamLogos} />
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
      <div className="relative z-[3] flex min-h-0 flex-1 flex-col">
      <AnimatePresence initial={false}>
      {step !== "welcome" && (
        <motion.div
          key="progress"
          className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center"
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
            {(["invite", "in", "follow"] as const).map((id) => (
              <span
                key={id}
                className={`h-1 w-6 rounded-full ${
                  step === id ? "bg-white" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          {step === "follow" && (
            <button
              type="button"
              onClick={finish}
              className="justify-self-end text-[12px] font-semibold text-white/45 hover:text-white/80"
            >
              Skip
            </button>
          )}
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
          <h1 className="relative z-10 mx-auto mt-auto mb-6 max-w-[300px] text-balance text-center text-[28px] font-semibold leading-tight tracking-[-0.03em] [text-shadow:0_2px_24px_rgba(0,0,0,0.75)]">
            Copy traders, track markets, and see what&apos;s moving
          </h1>
          <div className="relative z-10 flex shrink-0 flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setStep("invite")}
              className="mx-auto flex h-12 items-center justify-center rounded-full bg-white px-8 text-[15px] font-semibold text-black"
            >
              I have an invite code
            </button>
          </div>
        </div>
      )}

      {step === "invite" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">
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
            <button
              type="button"
              disabled={inviteCode.length < INVITE_LENGTH}
              onClick={submitInvite}
              className="h-12 w-full rounded-full bg-white text-[15px] font-semibold text-black disabled:bg-white/20 disabled:text-white/40"
            >
              Let me in
            </button>
            <TermsNote />
          </div>
        </div>
      )}


      {step === "in" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            You&apos;re in
          </h1>
          <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-white/55">
            Sign in to copy traders and track your positions.
          </p>
          <div className="mt-auto flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setStep("follow")}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[15px] font-semibold text-black"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setStep("follow")}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white/[0.1] text-[15px] font-semibold text-white"
            >
              <WalletGlyph />
              Connect wallet
            </button>
          </div>
        </div>
      )}

      {step === "follow" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            Who to follow
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">
            Top performers from the leaderboard. You can unfollow anytime.
          </p>
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tradersStatus === "loading" && (
              <div className="space-y-2.5 animate-pulse" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[58px] rounded-xl bg-white/10" />
                ))}
              </div>
            )}
            {tradersStatus !== "loading" && suggested.length === 0 && (
              <p className="text-sm text-white/55">
                No traders to suggest right now.
              </p>
            )}
            {suggested.length > 0 && (
              <ul className="flex flex-col gap-2">
                {suggested.map((wallet) => {
                  const pnlPositive = wallet.totalPnl >= 0;
                  return (
                    <li
                      key={wallet.wallet}
                      className="flex items-center gap-3 rounded-[20px] bg-white/[0.08] px-3 py-2.5"
                    >
                      <UserAvatar
                        seed={wallet.wallet}
                        label={wallet.displayName ?? wallet.wallet}
                        className="h-9 w-9 text-[12px]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {wallet.displayName ?? shortWallet(wallet.wallet)}
                        </p>
                        <p
                          className={`mt-0.5 text-[11px] font-semibold tabular-nums ${
                            pnlPositive ? "text-[#00D54B]" : "text-[#FF375F]"
                          }`}
                        >
                          {formatSignedUsd(wallet.totalPnl)}
                        </p>
                      </div>
                      <FollowButton
                        following={isFollowing(wallet.wallet)}
                        onClick={() => onToggleFollow(wallet.wallet)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={finish}
            className="mt-4 h-12 w-full shrink-0 rounded-full bg-white text-[15px] font-semibold text-black"
          >
            Done
          </button>
        </div>
      )}
      </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
