"use client";

import { useEffect, useMemo, useState } from "react";
import type { PolymarketTradeWithPnl } from "@/lib/polymarketscan";
import UserAvatar from "./UserAvatar";
import { GifThumb, MessageComposer, pickGif, REACTION_GIFS } from "./richMessage";
import { useImageAccent } from "./imageAccent";
import {
  loadUserComments,
  saveUserComments,
  seedCommentsForTrade,
  tradeKey,
  type TradeComment,
} from "./tradeComments";

function formatUsdPrecise(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedPercent(value: number): string {
  const abs = Math.abs(value);
  const formatted = `${abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)}%`;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return "0%";
}

function formatOdds(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function formatTimeAgo(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const then = Date.parse(timestamp);
  if (!Number.isFinite(then)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function tradePotentialReturnPct(price: number): number | null {
  if (!(price > 0) || !(price < 1)) return null;
  return ((1 - price) / price) * 100;
}

function HeartIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 13.25S2.75 10.1 2.75 6.6A2.85 2.85 0 0 1 8 5.05 2.85 2.85 0 0 1 13.25 6.6C13.25 10.1 8 13.25 8 13.25Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3.2 3.5h9.6c.7 0 1.2.5 1.2 1.2v5.1c0 .7-.5 1.2-1.2 1.2H7.1L4.4 13.2V11H3.2c-.7 0-1.2-.5-1.2-1.2V4.7c0-.7.5-1.2 1.2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type TradePostTrade = PolymarketTradeWithPnl & {
  userCaption?: string | null;
  userGifUrl?: string | null;
};

export function captionGifForTrade(trade: TradePostTrade): string | null {
  if (trade.userGifUrl) return trade.userGifUrl;
  if (trade.userCaption?.trim()) return null;
  const seed = hashString(
    `${trade.wallet}-${trade.txHash ?? trade.timestamp ?? trade.marketSlug}`,
  );
  if (seed % 4 !== 0) return null;
  return pickGif(seed).url;
}

export default function TradePost({
  trade,
  handle,
  caption,
  gifUrl,
  marketImage,
  currentUser,
  onOpenWallet,
  onOpenTrade,
  lifted = false,
}: {
  trade: TradePostTrade;
  handle: string;
  caption: string;
  gifUrl: string | null;
  marketImage?: string;
  currentUser: { wallet: string; handle: string } | null;
  onOpenWallet: (wallet: string) => void;
  onOpenTrade: () => void;
  lifted?: boolean;
}) {
  const accent = useImageAccent(marketImage ?? null);
  const key = tradeKey(trade);
  const seed = hashString(
    `${trade.wallet}-${trade.txHash ?? trade.timestamp ?? ""}`,
  );
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(seed % 3 === 0);
  const [likeBump, setLikeBump] = useState(0);
  const [draft, setDraft] = useState("");
  const [draftGif, setDraftGif] = useState<string | null>(null);
  const [userComments, setUserComments] = useState<TradeComment[]>([]);

  useEffect(() => {
    setUserComments(loadUserComments().filter((item) => item.tradeKey === key));
  }, [key]);

  const seeded = useMemo(
    () => seedCommentsForTrade(key, REACTION_GIFS.map((gif) => gif.url)),
    [key],
  );
  const comments = useMemo(
    () => [...seeded, ...userComments],
    [seeded, userComments],
  );

  const isBuy = trade.side.toUpperCase() === "BUY";
  const timeAgo = formatTimeAgo(trade.timestamp) ?? "Just now";
  const potentialPct = tradePotentialReturnPct(trade.price);
  const outcomeLabel =
    trade.outcome.trim().length > 0 ? trade.outcome.trim() : "—";
  const likeCount = 1 + (seed % 12) + likeBump;
  const replyCount = comments.length;

  const submitComment = () => {
    if (!currentUser) return;
    const text = draft.trim();
    if (!text && !draftGif) return;
    const next: TradeComment = {
      id: `user-${Date.now()}`,
      tradeKey: key,
      wallet: currentUser.wallet,
      handle: currentUser.handle,
      text,
      gifUrl: draftGif,
      timestamp: new Date().toISOString(),
    };
    const stored = [...loadUserComments(), next];
    saveUserComments(stored);
    setUserComments((prev) => [...prev, next]);
    setDraft("");
    setDraftGif(null);
  };

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onOpenWallet(trade.wallet)}
        className="shrink-0 rounded-full transition-opacity hover:opacity-80"
        aria-label={`Open ${handle}`}
      >
        <UserAvatar seed={trade.wallet} label={handle} className="h-10 w-10" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug text-white">
          <button
            type="button"
            onClick={() => onOpenWallet(trade.wallet)}
            className="font-semibold hover:underline"
          >
            {handle}
          </button>{" "}
          {isBuy ? "bought" : "sold"}{" "}
          <span className="font-semibold tabular-nums">
            {formatUsdPrecise(trade.amountUsd)}
          </span>{" "}
          {outcomeLabel}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-white/35">
          {timeAgo}
        </p>
        {caption.trim() ? (
          <p className="mt-1.5 text-[15px] leading-snug text-white">{caption}</p>
        ) : null}
        {gifUrl ? (
          <div className="mt-2">
            <GifThumb url={gifUrl} />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onOpenTrade}
          className={
            lifted
              ? "mt-3 w-full rounded-[20px] p-3.5 text-left"
              : "mt-3 w-full rounded-[20px] p-3.5 text-left transition-[filter,background-color] duration-500 hover:brightness-110"
          }
          style={{
            backgroundColor: lifted ? "rgba(255, 255, 255, 0.08)" : accent,
          }}
        >
          <div className="flex items-center gap-3">
            {marketImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={marketImage}
                alt=""
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[13px] font-semibold text-white/40">
                {trade.marketTitle.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-white">
                {trade.marketTitle}
              </p>
              <p className="mt-1 text-[12px] text-white/45">
                {outcomeLabel} · {formatOdds(trade.price)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-end justify-between border-t border-white/[0.08] pt-3">
            <p className="text-[20px] font-semibold tabular-nums leading-none">
              {formatUsdPrecise(trade.amountUsd)}
            </p>
            <p
              className={`text-[15px] font-semibold tabular-nums leading-none ${
                potentialPct === null
                  ? "invisible"
                  : isBuy
                    ? "text-[#00D54B]"
                    : "text-[#FF375F]"
              }`}
            >
              {potentialPct !== null ? formatSignedPercent(potentialPct) : "0%"}
            </p>
          </div>
        </button>

        <div className="mt-3 flex items-center gap-5 text-[13px] text-white/40">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            className={`inline-flex items-center gap-1.5 ${open ? "text-white" : ""}`}
          >
            <ReplyIcon className="h-4 w-4" />
            {replyCount > 0
              ? `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
              : "Reply"}
          </button>
          <button
            type="button"
            onClick={() => {
              setLiked((prev) => {
                setLikeBump((n) => n + (prev ? -1 : 1));
                return !prev;
              });
            }}
            className={`inline-flex items-center gap-1.5 ${liked ? "text-[#ff3b30]" : ""}`}
          >
            <HeartIcon className="h-4 w-4" filled={liked} />
            {likeCount}
          </button>
        </div>

        {open && (
          <div className="mt-3 flex flex-col gap-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenWallet(comment.wallet)}
                  className="shrink-0 rounded-full"
                  aria-label={`Open ${comment.handle}`}
                >
                  <UserAvatar
                    seed={comment.wallet}
                    label={comment.handle}
                    className="h-7 w-7"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-white">
                    <button
                      type="button"
                      onClick={() => onOpenWallet(comment.wallet)}
                      className="font-semibold hover:underline"
                    >
                      {comment.handle}
                    </button>
                    <span className="text-white/35">
                      {" "}
                      · {formatTimeAgo(comment.timestamp) ?? "Just now"}
                    </span>
                  </p>
                  {comment.text ? (
                    <p className="mt-0.5 text-[13px] leading-snug text-white/85">
                      {comment.text}
                    </p>
                  ) : null}
                  {comment.gifUrl ? (
                    <div className="mt-1.5">
                      <GifThumb url={comment.gifUrl} className="max-h-[120px]" />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {currentUser ? (
              <div className="flex items-start gap-2.5">
                <UserAvatar
                  seed={currentUser.wallet}
                  label={currentUser.handle}
                  className="mt-1 h-7 w-7"
                />
                <div className="min-w-0 flex-1">
                  <MessageComposer
                    text={draft}
                    gifUrl={draftGif}
                    onTextChange={setDraft}
                    onGifChange={setDraftGif}
                    onSubmit={submitComment}
                    placeholder="Add a reply…"
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-white/40">Sign in to reply.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
