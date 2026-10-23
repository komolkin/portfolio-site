"use client";

import { useMemo, useState } from "react";
import type { PolymarketMarketTrade } from "@/lib/polymarketscan";

const LIST_SIZE = 10;

const DEMO_HANDLES = [
  "whale77",
  "cnayh",
  "lisa.sol",
  "eagle45",
  "tiger67",
  "nova.eth",
  "degen_rio",
  "maya.sol",
  "jaxtrades",
  "kairos",
  "sharpe",
  "luna88",
  "oddsgod",
  "pixel.eth",
  "mono_k",
  "fadeboy",
] as const;

export type TopTradersSide = {
  label: string;
  price: number;
  color: string;
};

type SidePosition = {
  key: string;
  wallet: string;
  handle: string;
  photo: string;
  avgPrice: number;
  valueUsd: number;
  pnlPct: number;
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function portraitFor(seed: string): string {
  const h = hash(`${seed}:photo`);
  const gender = h % 2 === 0 ? "men" : "women";
  return `https://randomuser.me/api/portraits/${gender}/${(h >>> 3) % 99}.jpg`;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function positionsFromTrades(
  trades: readonly PolymarketMarketTrade[],
  side: TopTradersSide,
  resolveHandle: (wallet: string) => string,
): SidePosition[] {
  const byWallet = new Map<string, { cost: number; shares: number }>();
  for (const trade of trades) {
    if (trade.side.toUpperCase() !== "BUY") continue;
    if (trade.outcome.trim().toLowerCase() !== side.label.trim().toLowerCase()) {
      continue;
    }
    if (!(trade.price > 0) || !(trade.amountUsd > 0)) continue;
    const entry = byWallet.get(trade.wallet) ?? { cost: 0, shares: 0 };
    entry.cost += trade.amountUsd;
    entry.shares += trade.amountUsd / trade.price;
    byWallet.set(trade.wallet, entry);
  }
  return [...byWallet.entries()].map(([wallet, { cost, shares }]) => {
    const avgPrice = cost / shares;
    return {
      key: wallet,
      wallet,
      handle: resolveHandle(wallet),
      photo: portraitFor(wallet),
      avgPrice,
      valueUsd: shares * side.price,
      pnlPct: (side.price / avgPrice - 1) * 100,
    };
  });
}

/** Deterministic holders so every market shows a full board for both sides. */
function demoPositions(
  marketKey: string,
  side: TopTradersSide,
  sideIndex: number,
  count: number,
): SidePosition[] {
  const root = hash(`${marketKey}:${side.label}`);
  const positions: SidePosition[] = [];
  let value = 1_800 + (root % 3_400);
  for (let i = 0; i < count; i++) {
    const seed = hash(`${root}:${i}`);
    const handle =
      DEMO_HANDLES[(root + i * 5 + sideIndex * 3) % DEMO_HANDLES.length]!;
    // Most holders are in profit on the favourite, mixed on the underdog.
    const swing = side.price >= 0.5 ? 0.08 + (seed % 48) / 100 : -0.3 + (seed % 70) / 100;
    const avgPrice = Math.min(0.97, Math.max(0.02, side.price / (1 + swing)));
    const wallet = `0x${seed.toString(16).padStart(8, "0")}${root.toString(16).padStart(8, "0")}`;
    positions.push({
      key: `demo-${i}`,
      wallet,
      handle,
      photo: portraitFor(`${handle}:${sideIndex}`),
      avgPrice,
      valueUsd: Math.round(value * 100) / 100,
      pnlPct: (side.price / avgPrice - 1) * 100,
    });
    value *= 0.62 + (seed % 25) / 100;
  }
  return positions;
}

function FollowBadge({
  following,
  onClick,
}: {
  following: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={following ? "Unfollow" : "Follow"}
      aria-pressed={following}
      data-sfx="click"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white text-black ring-2 ring-[#111113]"
    >
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" aria-hidden>
        {following ? (
          <path
            d="M2 5.2 4.1 7.2 8 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M5 2v6M2 5h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

export default function MarketTopTraders({
  marketKey,
  sides,
  trades,
  resolveHandle,
  isFollowing,
  onToggleFollow,
  onOpenWallet,
}: {
  marketKey: string;
  sides: TopTradersSide[];
  trades: readonly PolymarketMarketTrade[];
  resolveHandle: (wallet: string) => string;
  isFollowing: (wallet: string) => boolean;
  onToggleFollow: (wallet: string) => void;
  onOpenWallet: (wallet: string) => void;
}) {
  const [active, setActive] = useState(0);
  const sideIndex = Math.min(active, Math.max(0, sides.length - 1));
  const side = sides[sideIndex];

  const positions = useMemo(() => {
    if (!side) return [];
    const real = positionsFromTrades(trades, side, resolveHandle);
    const filled =
      real.length >= LIST_SIZE
        ? real
        : [...real, ...demoPositions(marketKey, side, sideIndex, LIST_SIZE - real.length)];
    return filled.sort((a, b) => b.valueUsd - a.valueUsd).slice(0, LIST_SIZE);
  }, [marketKey, side, sideIndex, trades, resolveHandle]);

  if (!side) return null;

  return (
    <div className="flex flex-col">
      {sides.length > 1 && (
        <div className="mt-1 flex gap-2" role="tablist" aria-label="Side">
          {sides.map((entry, index) => {
            const selected = index === sideIndex;
            return (
              <button
                key={entry.label}
                type="button"
                role="tab"
                aria-selected={selected}
                data-sfx="click"
                onClick={() => setActive(index)}
                className={`min-w-0 flex-1 truncate rounded-full px-3 py-2 text-[14px] font-semibold transition-colors ${
                  selected ? "bg-white/[0.12]" : "bg-white/[0.04] opacity-60"
                }`}
                style={{ color: entry.color }}
              >
                {entry.label} {Math.round(entry.price * 100)}%
              </button>
            );
          })}
        </div>
      )}

      <ol className="mt-2">
        {positions.map((position) => {
          const up = position.pnlPct >= 0;
          return (
            <li key={position.key}>
              <div
                role="button"
                tabIndex={0}
                data-sfx="click"
                onClick={() => onOpenWallet(position.wallet)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenWallet(position.wallet);
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left"
              >
                <span className="relative h-11 w-11 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={position.photo}
                    alt=""
                    className="h-11 w-11 rounded-full bg-white/10 object-cover"
                  />
                  <FollowBadge
                    following={isFollowing(position.wallet)}
                    onClick={() => onToggleFollow(position.wallet)}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold leading-snug">
                    {position.handle}
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-white/55">
                    Bought at {Math.round(position.avgPrice * 100)}%
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[16px] font-semibold tabular-nums leading-snug">
                    {formatUsd(position.valueUsd)}
                  </span>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 text-[13px] font-medium tabular-nums ${
                      up ? "text-[#00D54B]" : "text-[#FF375F]"
                    }`}
                  >
                    <svg
                      viewBox="0 0 8 6"
                      className={`h-1.5 w-2 ${up ? "" : "rotate-180"}`}
                      aria-hidden
                    >
                      <path d="M4 0 8 6H0z" fill="currentColor" />
                    </svg>
                    {up ? "+" : "-"}
                    {Math.abs(position.pnlPct).toFixed(1)}%
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
