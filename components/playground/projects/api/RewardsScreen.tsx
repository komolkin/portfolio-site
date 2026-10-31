"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import UserAvatar, { PROFILE_AVATAR_SRC } from "./UserAvatar";
import { ActivityRow, ui } from "./ui";

const HOW_TO_EARN_STEPS = [
  {
    title: "Trade markets",
    body: "Place trades to earn points. Larger and more frequent trades earn more.",
  },
  {
    title: "Refer friends",
    body: "Share your link. You earn points and 50% of referral fees when they trade.",
  },
  {
    title: "Stay active",
    body: "Keep trading each week to maximize your season points and leaderboard rank.",
  },
] as const;

const CLOSE_THRESHOLD_PX = 72;

export function HowToEarnSheet({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheetRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartY.current = event.clientY;
    dragStartOffset.current = drawerOffset;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = event.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    if (drawerOffset > CLOSE_THRESHOLD_PX) {
      closeSheet();
      return;
    }
    setDrawerOffset(0);
  };

  return (
    <div className="absolute inset-0 z-50">
      <div
        className={`absolute inset-0 ${ui.backdrop} transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How to earn"
        className={`absolute inset-x-0 bottom-0 flex max-h-[78%] flex-col overflow-hidden rounded-t-[1.75rem] ${ui.sheet} shadow-[0_-12px_40px_rgba(0,0,0,0.45)]`}
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
          className="flex shrink-0 touch-none flex-col px-5 pb-3 pt-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span
            aria-hidden
            className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/30"
          />
          <h2 className="text-[20px] font-semibold tracking-[-0.03em]">
            How to earn
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[14px] leading-snug text-white/50">
            Earn points by trading and referring friends. Climb the leaderboard
            before the season ends.
          </p>
          <ol className="mt-5 flex flex-col gap-4">
            {HOW_TO_EARN_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.1] text-[13px] font-semibold tabular-nums text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[15px] font-semibold text-white">
                    {step.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-snug text-white/50">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Match Search → Top traders medals. */
const RANK_MEDALS: Record<number, { face: string; text: string }> = {
  1: {
    face: "radial-gradient(circle at 35% 30%, #f7d77a 0%, #d9a73a 55%, #a87a1f 100%)",
    text: "#4a3308",
  },
  2: {
    face: "radial-gradient(circle at 35% 30%, #d8d8dc 0%, #9a9aa0 55%, #6c6c72 100%)",
    text: "#2a2a2e",
  },
  3: {
    face: "radial-gradient(circle at 35% 30%, #e7a77a 0%, #b8703f 55%, #864a22 100%)",
    text: "#3b1e0b",
  },
};

const LEADERBOARD: readonly {
  rank: number;
  handle: string;
  username: string;
  points: number;
  seed: string;
}[] = [
  {
    rank: 1,
    handle: "ryanbet",
    username: "Ryanbet",
    points: 21686,
    seed: "0xrewards01",
  },
  {
    rank: 2,
    handle: "polyverse",
    username: "polyverse",
    points: 5469,
    seed: "0xrewards02",
  },
  {
    rank: 3,
    handle: "tomo",
    username: "Tomo",
    points: 5181,
    seed: "0xrewards03",
  },
  {
    rank: 4,
    handle: "nova.eth",
    username: "Nova",
    points: 4820,
    seed: "0xrewards04",
  },
  {
    rank: 5,
    handle: "sharpe",
    username: "Sharpe",
    points: 3914,
    seed: "0xrewards05",
  },
];

/** Season end ~36h from first mount of this module in a session. */
const SEASON_END_AT = Date.now() + (1 * 24 + 7) * 60 * 60 * 1000 + 4 * 60 * 1000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `In ${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 10V3M8 3 5.5 5.5M8 3l2.5 2.5M3.5 9v3.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 4.75V8l2.1 1.4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = RANK_MEDALS[rank];
  if (!medal) {
    return (
      <span className="w-5 text-center text-[12px] font-semibold tabular-nums text-white/35">
        {rank}
      </span>
    );
  }
  return (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(0,0,0,0.25),0_1px_2px_rgba(0,0,0,0.4)]"
      style={{ background: medal.face, color: medal.text }}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  );
}

export default function RewardsScreen({
  username,
  wallet,
  points = 0,
  titleRef,
  onOpenProfile,
  onShare,
  onOpenHowToEarn,
}: {
  username: string | null;
  wallet: string | null;
  points?: number;
  titleRef?: RefObject<HTMLElement | null>;
  onOpenProfile: () => void;
  onShare: () => void;
  onOpenHowToEarn: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, SEASON_END_AT - Date.now()),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, SEASON_END_AT - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const referralCode = useMemo(() => {
    if (username) return username.toLowerCase();
    if (wallet) return wallet.slice(2, 10).toLowerCase();
    return "invite";
  }, [username, wallet]);

  const referralLink = `worm.wtf/r/${referralCode}`;
  const youSeed = wallet ?? username ?? "you";
  const youLabel = username ?? "You";

  const copyAndSend = async () => {
    try {
      await navigator.clipboard.writeText(`https://${referralLink}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open profile"
          className="shrink-0 rounded-full"
        >
          <UserAvatar
            seed={youSeed}
            label={youLabel}
            src={PROFILE_AVATAR_SRC}
            className="h-9 w-9"
          />
        </button>
        <h1
          ref={titleRef as RefObject<HTMLHeadingElement>}
          className="text-[17px] font-semibold tracking-[-0.02em] text-white"
        >
          Rewards
        </h1>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share rewards"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </header>

      <section
        className="rounded-[24px] bg-white/[0.08] px-5 pb-4 pt-3.5 ring-1 ring-white/[0.06]"
        aria-label="Your points"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-medium text-white/50">Your Points</p>
          <button
            type="button"
            onClick={onOpenHowToEarn}
            className="shrink-0 text-[14px] font-semibold text-white/55 transition-colors hover:text-white"
          >
            How to earn
          </button>
        </div>
        <p className="mt-1 text-[44px] font-semibold leading-none tracking-tight tabular-nums text-white">
          {points.toLocaleString("en-US")}
        </p>
      </section>

      <section aria-labelledby="revenue-share-heading">
        <h2
          id="revenue-share-heading"
          className="mb-3 text-[17px] font-semibold tracking-[-0.02em] text-white"
        >
          Revenue Share
        </h2>
        <div className="flex items-center gap-2 rounded-full bg-white/[0.08] py-1.5 pl-4 pr-1.5 ring-1 ring-white/[0.06]">
          <p className="min-w-0 flex-1 truncate text-[13px] text-white/70">
            {referralLink}
          </p>
          <button
            type="button"
            onClick={() => void copyAndSend()}
            className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-black"
          >
            {copied ? "Copied" : "Send"}
          </button>
        </div>
        <p className="mt-3 text-[13px] text-white/40">
          $0 Earnings
          <span className="mx-2 text-white/25" aria-hidden>
            ·
          </span>
          0 Referrals
        </p>
      </section>

      <section aria-labelledby="leaderboard-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="leaderboard-heading"
            className="min-w-0 text-[18px] font-semibold tracking-[-0.02em] text-white"
          >
            Leaderboard
          </h2>
          <p className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium tabular-nums text-white/45">
            <ClockIcon className="h-3.5 w-3.5" />
            {formatCountdown(remainingMs)}
          </p>
        </div>

        <ol className="divide-y divide-white/[0.06]">
          <li>
            <ActivityRow
              compact
              leading={
                <div className="flex items-center gap-2">
                  <RankBadge rank={145} />
                  <UserAvatar
                    seed={youSeed}
                    label={youLabel}
                    src={PROFILE_AVATAR_SRC}
                    className="h-9 w-9 text-[12px]"
                  />
                </div>
              }
              title="You"
              trailing={
                <span className="text-[16px] font-semibold tabular-nums text-white">
                  {points.toLocaleString("en-US")}
                </span>
              }
            />
          </li>
          {LEADERBOARD.map((row) => (
            <li key={row.handle}>
              <ActivityRow
                compact
                leading={
                  <div className="flex items-center gap-2">
                    <RankBadge rank={row.rank} />
                    <UserAvatar
                      seed={row.seed}
                      label={row.username}
                      className="h-9 w-9 text-[12px]"
                    />
                  </div>
                }
                title={row.username}
                subtitle={`@${row.handle}`}
                trailing={
                  <span className="text-[16px] font-semibold tabular-nums text-white">
                    {row.points.toLocaleString("en-US")}
                  </span>
                }
              />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
