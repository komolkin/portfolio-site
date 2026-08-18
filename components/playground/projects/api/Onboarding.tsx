"use client";

import { useMemo, useState } from "react";
import type { PolymarketLeaderboardWallet } from "@/lib/polymarketscan";
import { FollowButton } from "./FeedPositionSheet";
import MarketRiver from "./MarketRiver";
import UserAvatar from "./UserAvatar";

type OnboardingStep = "welcome" | "username" | "follow";

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <rect
        x="1.75"
        y="4"
        width="12.5"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M1.75 6.5h12.5" stroke="currentColor" strokeWidth="1.4" />
      <circle
        cx="11.5"
        cy="9.75"
        r="1.05"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function ProgressiveBlur({ edge }: { edge: "top" | "bottom" }) {
  const to = edge === "top" ? "to bottom" : "to top";
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-[2] h-[46%] ${
        edge === "top" ? "top-0" : "bottom-0"
      }`}
      aria-hidden
    >
      {[24, 14, 8, 4, 1].map((blur, i) => (
        <div
          key={blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            maskImage: `linear-gradient(${to}, black 0%, black ${10 + i * 8}%, transparent ${38 + i * 14}%)`,
            WebkitMaskImage: `linear-gradient(${to}, black 0%, black ${10 + i * 8}%, transparent ${38 + i * 14}%)`,
          }}
        />
      ))}
    </div>
  );
}

export default function Onboarding({
  traders,
  tradersStatus,
  marketImages,
  isFollowing,
  onToggleFollow,
  onComplete,
}: {
  traders: PolymarketLeaderboardWallet[];
  tradersStatus: "loading" | "ready" | "error";
  marketImages: string[];
  isFollowing: (wallet: string) => boolean;
  onToggleFollow: (wallet: string) => void;
  onComplete: (username: string | null) => void;
}) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [username, setUsername] = useState("");
  const suggested = useMemo(
    () => traders.slice(0, 8),
    [traders],
  );

  const trimmed = username.trim().replace(/^@/, "");
  const usernameValid = /^[a-zA-Z0-9_]{3,16}$/.test(trimmed);

  const finish = (name: string | null) => {
    onComplete(name && name.length > 0 ? name : null);
  };

  const skip = () => {
    if (step === "welcome") setStep("username");
    else if (step === "username") setStep("follow");
    else finish(trimmed || null);
  };

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-black px-5 pt-6 pb-5"
      role="dialog"
      aria-modal="true"
      aria-label="Get started"
    >
      {step === "welcome" ? (
        <>
          <MarketRiver images={marketImages} />
          <ProgressiveBlur edge="top" />
          <ProgressiveBlur edge="bottom" />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[48%]"
          style={{
            background:
              "radial-gradient(ellipse 110% 90% at 50% -8%, rgba(58, 86, 104, 0.58) 0%, rgba(34, 53, 68, 0.28) 38%, transparent 72%)",
          }}
        />
      )}
      <div className="relative z-[3] flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden>
          {(["welcome", "username", "follow"] as const).map((id) => (
            <span
              key={id}
              className={`h-1 w-6 rounded-full ${
                step === id ? "bg-white" : "bg-white/20"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          className={`text-[12px] font-semibold hover:text-white/80 ${
            step === "welcome" ? "text-white/70" : "text-white/45"
          }`}
        >
          Skip
        </button>
      </div>

      {step === "welcome" && (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative z-10 mt-4 shrink-0">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] [text-shadow:0_2px_24px_rgba(0,0,0,0.75)]">
              Copy traders, track markets, and see what&apos;s moving — all in
              one feed.
            </h1>
          </div>
          <div className="relative z-10 mt-auto flex shrink-0 flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setStep("username")}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[15px] font-semibold text-black"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setStep("username")}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white/[0.08] text-[15px] font-semibold text-white"
            >
              <WalletIcon />
              Connect wallet
            </button>
          </div>
        </div>
      )}

      {step === "username" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            Choose a username
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">
            This is how other traders will see you in the feed.
          </p>
          <label className="mt-6 flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-3">
            <span className="text-[15px] font-semibold text-white/35">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
              }
              placeholder="yourname"
              maxLength={16}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:text-white/30"
            />
          </label>
          <p className="mt-2 text-[11px] text-white/40">
            3–16 characters. Letters, numbers, and underscores.
          </p>
          <button
            type="button"
            disabled={!usernameValid}
            onClick={() => setStep("follow")}
            className="mt-auto h-12 w-full rounded-full bg-white text-[15px] font-semibold text-black disabled:bg-white/20 disabled:text-white/40"
          >
            Continue
          </button>
        </div>
      )}

      {step === "follow" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">
            Who to follow
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-white/55">
            Top traders from the leaderboard. You can unfollow anytime.
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
            onClick={() => finish(trimmed || null)}
            className="mt-4 h-12 w-full shrink-0 rounded-full bg-white text-[15px] font-semibold text-black"
          >
            Done
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
