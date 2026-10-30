"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PolymarketMarketTrade } from "@/lib/polymarketscan";
import { ActivityRow } from "./ui";

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

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
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

export default function MarketTopTraders({
  marketKey,
  sides,
  trades,
  resolveHandle,
  onOpenWallet,
}: {
  marketKey: string;
  sides: TopTradersSide[];
  trades: readonly PolymarketMarketTrade[];
  resolveHandle: (wallet: string) => string;
  onOpenWallet: (wallet: string) => void;
}) {
  const [active, setActive] = useState(0);
  const sideIndex = Math.min(active, Math.max(0, sides.length - 1));
  const side = sides[sideIndex];
  const tabListRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
    height: number;
    top: number;
  } | null>(null);

  const positions = useMemo(() => {
    if (!side) return [];
    const real = positionsFromTrades(trades, side, resolveHandle);
    const filled =
      real.length >= LIST_SIZE
        ? real
        : [...real, ...demoPositions(marketKey, side, sideIndex, LIST_SIZE - real.length)];
    return filled.sort((a, b) => b.valueUsd - a.valueUsd).slice(0, LIST_SIZE);
  }, [marketKey, side, sideIndex, trades, resolveHandle]);

  const sidesKey = sides.map((entry) => entry.label).join("|");

  useLayoutEffect(() => {
    const list = tabListRef.current;
    if (!list || sides.length < 2) return;
    const measure = () => {
      const selected = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!selected) return;
      const listRect = list.getBoundingClientRect();
      const tabRect = selected.getBoundingClientRect();
      const next = {
        left: tabRect.left - listRect.left,
        top: tabRect.top - listRect.top,
        width: tabRect.width,
        height: tabRect.height,
      };
      setIndicator((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [sideIndex, sidesKey, sides.length]);

  if (!side) return null;

  return (
    <div className="flex flex-col">
      {sides.length > 1 && (
        <div
          ref={tabListRef}
          className="relative mt-1 flex rounded-full bg-white/[0.06] p-0.5"
          role="tablist"
          aria-label="Side"
        >
          {indicator ? (
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full transition-[transform,width,height,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
              style={{
                width: indicator.width,
                height: indicator.height,
                transform: `translate(${indicator.left}px, ${indicator.top}px)`,
                backgroundColor: withAlpha(side.color, 0.18),
              }}
            />
          ) : null}
          {sides.map((entry, index) => {
            const selected = index === sideIndex;
            const pct = Math.round(entry.price * 100);
            return (
              <button
                key={entry.label}
                type="button"
                role="tab"
                aria-selected={selected}
                data-sfx="click"
                onClick={() => setActive(index)}
                className={`relative z-[1] min-w-0 flex-1 truncate rounded-full px-3 py-2 text-center text-[13px] font-semibold transition-colors duration-200 ${
                  selected ? "" : "text-white/40 hover:text-white/60"
                }`}
                style={selected ? { color: entry.color } : undefined}
              >
                <span className="truncate">{entry.label}</span>
                <span
                  className={`ml-1.5 tabular-nums ${
                    selected ? "opacity-85" : "text-white/30"
                  }`}
                >
                  {pct}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      <ol className="mt-1">
        {positions.map((position) => {
          const up = position.pnlPct >= 0;
          return (
            <li key={position.key}>
              <ActivityRow
                compact
                leading={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={position.photo}
                    alt=""
                    className="h-10 w-10 rounded-full bg-white/10 object-cover"
                  />
                }
                title={position.handle}
                subtitle={`Bought at ${Math.round(position.avgPrice * 100)}%`}
                trailing={
                  <div>
                    <p className="text-[15px] font-semibold tabular-nums leading-snug">
                      {formatUsd(position.valueUsd)}
                    </p>
                    <p
                      className={`mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${
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
                    </p>
                  </div>
                }
                onClick={() => onOpenWallet(position.wallet)}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
