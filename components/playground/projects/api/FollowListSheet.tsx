"use client";

import { useEffect, useRef, useState } from "react";
import { FollowButton } from "./FeedPositionSheet";
import UserAvatar from "./UserAvatar";

const CLOSE_THRESHOLD_PX = 72;

export type FollowListPerson = {
  wallet: string;
  displayName: string | null;
  totalPnl: number | null;
};

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function formatSignedUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : value > 0 ? "+" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function handleFor(person: FollowListPerson): string {
  if (person.displayName?.trim()) return person.displayName.trim();
  return shortWallet(person.wallet);
}

export default function FollowListSheet({
  kind,
  people,
  ownWallet,
  isFollowing,
  onToggleFollow,
  onOpenWallet,
  onClose,
}: {
  kind: "following" | "followers";
  people: FollowListPerson[];
  ownWallet: string | null;
  isFollowing: (wallet: string) => boolean;
  onToggleFollow: (wallet: string) => void;
  onOpenWallet: (wallet: string, displayName: string | null) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const title = kind === "following" ? "Following" : "Followers";

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
        className={`absolute inset-0 bg-[#6e6e73]/45 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSheet}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex h-[80%] flex-col overflow-hidden rounded-t-[1.75rem] bg-black shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
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
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em]">
              {title}
            </h2>
            {people.length > 0 ? (
              <span className="text-[13px] font-semibold tabular-nums text-white/40">
                {people.length.toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {people.length === 0 ? (
            <p className="text-sm text-white/55">
              {kind === "following"
                ? "Not following anyone yet."
                : "No followers yet."}
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {people.map((person) => {
                const own =
                  Boolean(ownWallet) &&
                  person.wallet.toLowerCase() === ownWallet.toLowerCase();
                const name = handleFor(person);
                return (
                  <li key={person.wallet}>
                    <div className="flex items-center gap-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenWallet(person.wallet, person.displayName);
                          closeSheet();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <UserAvatar
                          seed={person.wallet}
                          label={name}
                          className="h-11 w-11 text-[13px]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">
                            {name}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] tabular-nums text-white/45">
                            {person.displayName
                              ? shortWallet(person.wallet)
                              : person.totalPnl !== null
                                ? formatSignedUsd(person.totalPnl)
                                : "Trader"}
                          </span>
                        </span>
                      </button>
                      {own ? null : (
                        <FollowButton
                          following={isFollowing(person.wallet)}
                          onClick={() => onToggleFollow(person.wallet)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
