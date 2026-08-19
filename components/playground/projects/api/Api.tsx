"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import NumberFlow from "@number-flow/react";
import { Liveline, type LivelinePoint } from "liveline";
import type {
  PolymarketDemoProfile,
  PolymarketLeaderboardWallet,
  PolymarketMarketActivity,
  PolymarketMarketData,
  PolymarketMarketTrade,
  PolymarketTradeWithPnl,
  PolymarketWatchList,
  PolymarketWatchListDetail,
  PolymarketWalletPosition,
  PolymarketWalletProfile,
  PolymarketWalletTrade,
} from "@/lib/polymarketscan";
import { sportsOutcomeAbbr } from "@/lib/polymarketscan";
import { instrumentSansCondensed } from "@/lib/fonts";
import FeedPositionSheet, { FollowButton } from "./FeedPositionSheet";
import Onboarding from "./Onboarding";
import ReferralScreen from "./ReferralScreen";
import SettingsScreen from "./SettingsScreen";
import FollowListSheet, {
  type FollowListPerson,
} from "./FollowListSheet";
import SharePositionModal, {
  type SharePositionPayload,
} from "./SharePositionModal";
import TradeFlowModal from "./TradeFlowModal";
import TradePost, {
  captionGifForTrade,
  type TradePostTrade,
} from "./TradePost";
import CashOutModal from "./CashOutModal";
import CopyTradeModal from "./CopyTradeModal";
import DepositModal from "./DepositModal";
import {
  COPY_TRADES_KEY,
  applyCopyFills,
  copiedTradesForWallet,
  copyRelationshipEntries,
  copyRelationshipPnl,
  formatCopyRule,
  loadCopyTrades,
  saveCopyTrades,
  simulateCopySource,
  sourcesFromFeedTrades,
  sourcesFromWalletProfile,
  tickCopiedMarks,
  type CopyTrade,
} from "./copyTrades";
import UserAvatar from "./UserAvatar";
import {
  ActivityRow,
  BlurBackButton,
  BlurShareButton,
  ChipTabs,
  ui,
} from "./ui";
import { hexToRgba, useImageAccent } from "./imageAccent";
import {
  isBinaryMarket,
  getMarketOddsSides,
  loadUserTrades,
  saveUserTrades,
  type StoredUserTrade,
  type UserPlacedTrade,
} from "./userTrades";

const nfMaskStyle = {
  ["--number-flow-mask-height" as string]: "0em",
} as const;

type SectionId = "explore" | "search" | "feed" | "leaderboard" | "profile";
type ProfileSubScreen = "referral" | "settings";
type ListDetailTab = "trades" | "wallets";
type LeaderboardTab = "all" | "friends" | "lists";
type MarketDetailTab = "trades" | "traders" | "rules";
type ProfileTab = "positions" | "history" | "copying";
type TrendingView = "masonry" | "list";

const MARKET_ENTER =
  "motion-safe:animate-[api-market-enter_300ms_cubic-bezier(0.32,0.72,0,1)_both]";
const MARKET_ENTER_DELAYED =
  "motion-safe:animate-[api-market-enter_300ms_cubic-bezier(0.32,0.72,0,1)_70ms_both]";

const PROFILE_BALANCE = 123_293.12;
const ONBOARDING_DONE_KEY = "playground-api-onboarded";
const ONBOARDING_USERNAME_KEY = "playground-api-username";
const ONBOARDING_FOLLOWS_KEY = "playground-api-follows";
const DEPOSITS_KEY = "playground-api-deposits";

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function storageRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

type OnboardingCache = {
  done: boolean;
  username: string | null;
  follows: string[];
};

let onboardingCache: OnboardingCache | null = null;

function readOnboardingCache(): OnboardingCache {
  if (onboardingCache) return onboardingCache;
  if (typeof window === "undefined") {
    return { done: false, username: null, follows: [] };
  }
  let follows: string[] = [];
  const followsRaw = storageGet(ONBOARDING_FOLLOWS_KEY);
  if (followsRaw) {
    try {
      const parsed = JSON.parse(followsRaw) as unknown;
      if (Array.isArray(parsed)) {
        follows = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // Ignore malformed follow lists — don't treat this as a first visit.
    }
  }
  onboardingCache = {
    done: storageGet(ONBOARDING_DONE_KEY) === "1",
    username: storageGet(ONBOARDING_USERNAME_KEY),
    follows,
  };
  return onboardingCache;
}

function markOnboardingDone(username: string | null) {
  const prev = readOnboardingCache();
  onboardingCache = {
    done: true,
    username: username ?? prev.username,
    follows: prev.follows,
  };
  storageSet(ONBOARDING_DONE_KEY, "1");
  if (username) storageSet(ONBOARDING_USERNAME_KEY, username);
}

function persistFollows(follows: Iterable<string>) {
  const next = [...follows];
  const prev = readOnboardingCache();
  onboardingCache = { ...prev, follows: next };
  storageSet(ONBOARDING_FOLLOWS_KEY, JSON.stringify(next));
}

function persistUsername(username: string) {
  const prev = readOnboardingCache();
  onboardingCache = { ...prev, username };
  storageSet(ONBOARDING_USERNAME_KEY, username);
}

function clearOnboardingCache() {
  onboardingCache = { done: false, username: null, follows: [] };
  storageRemove(ONBOARDING_DONE_KEY);
  storageRemove(ONBOARDING_USERNAME_KEY);
  storageRemove(ONBOARDING_FOLLOWS_KEY);
}

function seedPortfolioHistory(endValue: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: LivelinePoint[] = [];
  const steps = 48;
  const stepSecs = 60 * 60 * 12; // 12h steps ≈ 24 days
  let value = endValue * 0.72;

  for (let i = 0; i < steps; i++) {
    const progress = i / (steps - 1);
    const drift = (endValue - value) * (0.04 + progress * 0.08);
    const wave = Math.sin(i * 0.55) * endValue * 0.012;
    const noise = Math.sin(i * 1.7 + 0.4) * endValue * 0.008;
    value = Math.max(endValue * 0.65, value + drift + wave + noise);
    points.push({
      time: now - (steps - 1 - i) * stepSecs,
      value: Math.round(value * 100) / 100,
    });
  }

  points[points.length - 1] = { time: now, value: endValue };
  return points;
}

function seedPnlHistory(endValue: number, salt = 0): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const points: LivelinePoint[] = [];
  const steps = 48;
  const stepSecs = 60 * 60 * 12;
  const start = endValue * 0.38;
  const amp = Math.max(Math.abs(endValue) * 0.07, 40);

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const eased = t * t * (3 - 2 * t);
    const wave = Math.sin(i * 0.55 + salt) * amp * (1 - t * 0.35);
    const noise = Math.sin(i * 1.7 + salt * 1.3) * amp * 0.32;
    points.push({
      time: now - (steps - 1 - i) * stepSecs,
      value: Math.round((start + (endValue - start) * eased + wave + noise) * 100) / 100,
    });
  }

  points[points.length - 1] = { time: now, value: endValue };
  return points;
}

const BOTTOM_TABS = [
  { id: "explore", label: "Explore" },
  { id: "search", label: "Search" },
  { id: "feed", label: "Feed" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "profile", label: "Profile" },
] as const;

const DEMO_LIVE_MARKET_ID = "demo-live-lal-bos";

function createDemoLiveMarket(): PolymarketMarketData {
  return {
    marketId: DEMO_LIVE_MARKET_ID,
    title: "Lakers vs. Celtics",
    slug: DEMO_LIVE_MARKET_ID,
    category: "Sports",
    yesPrice: 0.54,
    noPrice: 0.46,
    volumeUsd: 2_480_000,
    volume24h: 412_000,
    liquidityUsd: 180_000,
    image: "/playground/api/lakers-celtics.jpg",
    closesAt: null,
    isResolved: false,
    price24hChange: 0.02,
    outcomes: [
      {
        label: "Lakers",
        price: 0.54,
        marketId: DEMO_LIVE_MARKET_ID,
        slug: DEMO_LIVE_MARKET_ID,
      },
      {
        label: "Celtics",
        price: 0.46,
        marketId: DEMO_LIVE_MARKET_ID,
        slug: DEMO_LIVE_MARKET_ID,
      },
    ],
    relatedMarketCount: 1,
    liveGame: {
      league: "NBA",
      status: "live",
      clock: "Q3 8:42",
      away: {
        name: "Lakers",
        score: 78,
        abbr: "LAL",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/lal.png",
      },
      home: {
        name: "Celtics",
        score: 81,
        abbr: "BOS",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/bos.png",
      },
    },
    teams: [
      {
        name: "Lakers",
        abbr: "LAL",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/lal.png",
      },
      {
        name: "Celtics",
        abbr: "BOS",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/bos.png",
      },
    ],
    rules:
      "This market will resolve to the team that wins this NBA game.\n\nIf the game is postponed, delayed, or suspended, this market will remain open until the game is completed. If the game is cancelled and not rescheduled, this market will resolve according to Polymarket's standard sports cancellation rules.\n\nOvertime counts. The resolution source is the official NBA box score.",
  };
}

function formatDemoClock(quarter: number, totalSeconds: number): string {
  const mins = Math.floor(Math.max(0, totalSeconds) / 60);
  const secs = Math.max(0, totalSeconds) % 60;
  return `Q${quarter} ${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

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

function formatSignedUsd(value: number): string {
  const formatted = formatUsd(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted.replace("-", "")}`;
  return formatUsd(0);
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

function titlesClose(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function marketMatchesOpen(
  market: PolymarketMarketData,
  slug: string | null,
  title: string | null,
): boolean {
  const requestedSlug = slug?.trim().toLowerCase() || "";
  const marketSlug = (market.slug || "").toLowerCase();
  const marketId = (market.marketId || "").toLowerCase();
  const eventSlug = (market.eventSlug || "").toLowerCase();
  const slugHit =
    Boolean(requestedSlug) &&
    (marketSlug === requestedSlug ||
      marketId === requestedSlug ||
      eventSlug === requestedSlug);
  if (title) {
    const titleHit =
      titlesClose(market.title, title) ||
      titlesClose(market.groupItemTitle ?? "", title);
    if (titleHit) return true;
    if (slugHit && eventSlug === requestedSlug && eventSlug !== marketSlug) {
      return false;
    }
  }
  return slugHit;
}

function findLocalMarket(
  markets: PolymarketMarketData[],
  slug: string,
  title?: string,
): PolymarketMarketData | undefined {
  const requestedSlug = slug.trim().toLowerCase();
  const requestedTitle = title?.trim().toLowerCase() ?? "";
  if (requestedSlug) {
    const exact = markets.find(
      (market) =>
        market.slug.toLowerCase() === requestedSlug ||
        market.marketId.toLowerCase() === requestedSlug,
    );
    if (exact) {
      if (!requestedTitle || titlesClose(exact.title, requestedTitle)) return exact;
    }
  }
  if (requestedTitle) {
    return markets.find(
      (market) => market.title.trim().toLowerCase() === requestedTitle,
    );
  }
  return undefined;
}

function optimisticMarketFromOpen(
  slug: string,
  title: string,
  preview?: { image?: string | null; price?: number; outcome?: string },
): PolymarketMarketData {
  const identity = slug || title;
  const price = Math.max(0.01, Math.min(0.99, preview?.price ?? 0.5));
  const outcome = (preview?.outcome ?? "Yes").trim() || "Yes";
  const lower = outcome.toLowerCase();
  const isNoLike = lower === "no" || lower === "down";
  const yesPrice = isNoLike ? 1 - price : price;
  const noPrice = 1 - yesPrice;
  const matchup = title.split(/\s+vs\.?\s+/i).map((part) => part.trim());
  const other =
    lower === "yes"
      ? "No"
      : lower === "no"
        ? "Yes"
        : lower === "up"
          ? "Down"
          : lower === "down"
            ? "Up"
            : matchup.length === 2
              ? (matchup.find((part) => part.toLowerCase() !== lower) ?? "No")
              : "No";
  const yesLabel = isNoLike ? other : outcome;
  const noLabel = isNoLike ? outcome : other;
  return {
    marketId: identity,
    title,
    slug: identity,
    category: null,
    yesPrice,
    noPrice,
    volumeUsd: 0,
    volume24h: 0,
    liquidityUsd: 0,
    image: preview?.image ?? null,
    closesAt: null,
    isResolved: false,
    price24hChange: null,
    groupItemTitle:
      lower !== "yes" && lower !== "no" && lower !== "up" && lower !== "down"
        ? outcome
        : null,
    outcomes: [
      { label: yesLabel, price: yesPrice, marketId: identity, slug: identity },
      { label: noLabel, price: noPrice, marketId: identity, slug: identity },
    ],
  };
}

function marketFromFeedTrade(
  trade: PolymarketTradeWithPnl,
  cached: PolymarketMarketData | undefined,
  image?: string,
): PolymarketMarketData {
  if (cached) {
    return cached.image || !image ? cached : { ...cached, image };
  }

  const slug = trade.marketSlug || trade.marketTitle;
  const price = Math.max(0.01, Math.min(0.99, trade.price));
  const outcome = trade.outcome.trim() || "Yes";
  const lower = outcome.toLowerCase();
  const isNoLike = lower === "no" || lower === "down";
  const yesPrice = isNoLike ? 1 - price : price;
  const noPrice = 1 - yesPrice;
  const matchup = trade.marketTitle.split(/\s+vs\.?\s+/i).map((part) => part.trim());
  const other =
    lower === "yes"
      ? "No"
      : lower === "no"
        ? "Yes"
        : lower === "up"
          ? "Down"
          : lower === "down"
            ? "Up"
            : matchup.length === 2
              ? matchup.find((part) => part.toLowerCase() !== lower) ?? "No"
              : "No";
  const yesLabel = isNoLike ? other : outcome;
  const noLabel = isNoLike ? outcome : other;

  return {
    marketId: slug,
    title: trade.marketTitle,
    slug,
    category: trade.marketCategory,
    yesPrice,
    noPrice,
    volumeUsd: 0,
    volume24h: 0,
    liquidityUsd: 0,
    image: image ?? null,
    closesAt: null,
    isResolved: false,
    price24hChange: null,
    groupItemTitle:
      lower !== "yes" && lower !== "no" && lower !== "up" && lower !== "down"
        ? outcome
        : null,
    outcomes: [
      { label: yesLabel, price: yesPrice, marketId: slug, slug },
      { label: noLabel, price: noPrice, marketId: slug, slug },
    ],
  };
}

function markCopiedToMarket(
  items: StoredUserTrade[],
  marketBySlug: Map<string, PolymarketMarketData>,
): StoredUserTrade[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.copiedFrom || item.cashedOut) return item;
    if (item.trade.side.toUpperCase() === "SELL") return item;
    const slug = item.position.marketSlug || item.trade.marketSlug;
    if (!slug) return item;
    const market = marketBySlug.get(slug);
    if (!market) return item;
    const sides = getMarketOddsSides(market);
    const side =
      sides.find(
        (entry) =>
          entry.label.toLowerCase() === item.trade.outcome.toLowerCase(),
      ) ?? null;
    if (!side) return item;
    const markPrice = side.price;
    const image = item.position.image ?? market.image;
    if (
      Math.abs(markPrice - item.position.markPrice) < 0.0005 &&
      image === item.position.image
    ) {
      return item;
    }
    const valueUsd = item.position.shares * markPrice;
    changed = true;
    return {
      ...item,
      position: {
        ...item.position,
        markPrice,
        valueUsd,
        pnlUsd: valueUsd - item.trade.amountUsd,
        image,
      },
    };
  });
  return changed ? next : items;
}

function seedProfileCounts(seed: string): { following: number; followers: number } {
  const hash = hashString(seed.toLowerCase());
  return {
    following: 2 + (hash % 36),
    followers: 18 + ((hash >> 3) % 842),
  };
}

const MAX_FOLLOW_LIST = 40;

function pickSeededPeople(
  seed: string,
  count: number,
  pool: PolymarketLeaderboardWallet[],
  exclude: Iterable<string>,
): FollowListPerson[] {
  const skip = new Set(
    [...exclude].map((wallet) => wallet.toLowerCase()).filter(Boolean),
  );
  const candidates = pool.filter(
    (wallet) => !skip.has(wallet.wallet.toLowerCase()),
  );
  const limit = Math.min(Math.max(0, count), MAX_FOLLOW_LIST);
  if (limit === 0) return [];

  const hash = hashString(seed.toLowerCase());
  const picked: FollowListPerson[] = [];
  const used = new Set<number>();

  if (candidates.length > 0) {
    for (let i = 0; picked.length < Math.min(limit, candidates.length); i += 1) {
      let index = Math.abs(hash + i * 9973) % candidates.length;
      let spins = 0;
      while (used.has(index) && spins < candidates.length) {
        index = (index + 1) % candidates.length;
        spins += 1;
      }
      used.add(index);
      const wallet = candidates[index]!;
      picked.push({
        wallet: wallet.wallet,
        displayName: wallet.displayName,
        totalPnl: wallet.totalPnl,
      });
    }
  }

  let pad = 0;
  while (picked.length < limit) {
    const hex = hashString(`${seed}:pad:${pad}`).toString(16).padStart(8, "0");
    const extra = hashString(`${hex}:${pad}`).toString(16).padStart(32, "0");
    pad += 1;
    const wallet = `0x${(hex + extra).slice(0, 40)}`;
    if (skip.has(wallet) || picked.some((person) => person.wallet === wallet)) {
      continue;
    }
    picked.push({
      wallet,
      displayName: null,
      totalPnl: ((hash + pad * 131) % 9000) - 1200,
    });
  }

  return picked;
}

function feedHandle(wallet: string): string {
  const raw = wallet.replace(/^0x/i, "").toLowerCase();
  if (raw.length < 4) return shortWallet(wallet);
  const letters = raw.replace(/[^a-f]/g, "");
  if (letters.length >= 5) return letters.slice(0, 5);
  return raw.slice(0, 6);
}

function feedCaption(trade: PolymarketTradeWithPnl & { userCaption?: string | null }): string {
  if (trade.userCaption?.trim()) return trade.userCaption.trim();
  if (trade.userCaption === null) return "";

  const outcome = trade.outcome.trim();
  const looksLikeTeam =
    outcome.length > 2 &&
    outcome.toLowerCase() !== "yes" &&
    outcome.toLowerCase() !== "no" &&
    outcome.toLowerCase() !== "up" &&
    outcome.toLowerCase() !== "down";

  if (looksLikeTeam) {
    const teamLines = [
      `Honestly think ${outcome} is walking into this one 🔥`,
      `${outcome} looks locked in from here — not fading them`,
      `Taking ${outcome} with size. The tape feels one-sided tonight`,
      `${outcome} is the side. Momentum + price is still generous imo`,
      `Going ${outcome} here. Feels like the market is slow to reprice 👀`,
      `${outcome} just has more ways to win. Easy lean for me`,
    ];
    return teamLines[hashString(trade.wallet + trade.marketSlug) % teamLines.length]!;
  }

  const captions = [
    "I like the setup a lot — risk/reward still looks asymmetric from here 👀",
    "Taking this one. Clean lean and the number feels soft vs my read",
    "Size looks right. Not trying to be a hero, just following through 🔥",
    "This is the number I've been waiting for. Jumping in before it runs",
    "Not fading this. Flow + narrative are lining up too cleanly",
    "Easy lean for me. Gonna hold through the next catalyst and reassess",
    "Conviction trade. If I'm wrong I'll cut it, but this feels underpriced 🧠",
    "Adding here. Market is still pricing in way too much noise imo",
    "Following through on this — been watching the book all morning 📈",
    "Pretty locked on this outcome. Upside is still there if it rips",
  ];
  return captions[hashString(trade.wallet + (trade.marketSlug ?? trade.marketTitle)) % captions.length]!;
}

function marketTradeAsFeedTrade(
  trade: PolymarketMarketTrade,
  market: PolymarketMarketData,
): TradePostTrade {
  return {
    side: trade.side,
    outcome: trade.outcome,
    price: trade.price,
    amountUsd: trade.amountUsd,
    marketTitle: market.title,
    marketSlug: market.slug || market.marketId,
    marketCategory: market.category,
    wallet: trade.wallet,
    timestamp: trade.timestamp,
    txHash: trade.txHash,
    totalPnl: null,
    winRate: null,
    tradeCount: null,
  };
}

function formatClosesAt(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const then = Date.parse(timestamp);
  if (!Number.isFinite(then)) return null;

  const deltaMs = then - Date.now();
  if (deltaMs <= 0) return "Closed";

  const seconds = Math.floor(deltaMs / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `in ${days}d`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLiveClock(clock: string, status: string): string {
  if (status === "final") return "Final";
  if (status === "live") return clock || "Live";
  const compact = clock
    .replace(/\s+(EDT|EST|PDT|PST|CT|ET)$/i, "")
    .replace(/^[A-Za-z]{3},\s+/i, "");
  return compact || "Soon";
}

function liveSideName(name: string): string {
  const last = name.trim().split(/\s+/).at(-1) ?? name;
  const compact = last.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toUpperCase();
  return compact || name.slice(0, 7).toUpperCase();
}

function nickMatch(label: string, name: string): boolean {
  const a = label.toLowerCase();
  const b = name.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function isSportsMarket(market: PolymarketMarketData): boolean {
  return (
    Boolean(market.liveGame) ||
    Boolean(market.teams && market.teams.length > 0) ||
    market.category?.toLowerCase() === "sports"
  );
}

function resolveSportsSides(market: PolymarketMarketData) {
  const odds = getMarketOddsSides(market);
  const game = market.liveGame;
  const overlay = (
    side: {
      name: string;
      score: number | null;
      logo?: string | null;
      abbr?: string | null;
      portrait?: boolean;
    },
    team:
      | { name: string; logo: string | null; abbr: string | null; portrait?: boolean }
      | undefined,
  ) =>
    team
      ? {
          ...side,
          name: team.name || side.name,
          logo: team.logo ?? side.logo,
          abbr: team.abbr ?? side.abbr,
          portrait: team.portrait ?? side.portrait,
        }
      : side;
  const away = overlay(
    game?.away ?? {
      name: odds[0]?.label ?? "Away",
      score: null,
      logo: null,
      abbr: null,
    },
    market.teams?.[0],
  );
  const home = overlay(
    game?.home ?? {
      name: odds[1]?.label ?? "Home",
      score: null,
      logo: null,
      abbr: null,
    },
    market.teams?.[1],
  );
  const awayOdds =
    odds.find((side) => nickMatch(side.label, away.name)) ?? odds[0];
  const homeOdds =
    odds.find(
      (side) => side !== awayOdds && nickMatch(side.label, home.name),
    ) ??
    odds.find((side) => side !== awayOdds) ??
    odds[1];
  return { game, away, home, awayOdds, homeOdds };
}

function ChanceFlow({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  return (
    <NumberFlow
      value={Math.round(price * 100)}
      suffix="%"
      trend={0}
      className={className}
      style={nfMaskStyle}
    />
  );
}

function OddsCentsFlow({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  return (
    <NumberFlow
      value={Math.round(price * 100)}
      suffix="¢"
      trend={0}
      className={className}
      style={nfMaskStyle}
    />
  );
}

function BalanceFlow({
  value,
  className,
  fractionClassName,
}: {
  value: number;
  className?: string;
  fractionClassName?: string;
}) {
  const abs = Math.abs(value);
  let whole = Math.floor(abs);
  let cents = Math.round((abs - whole) * 100);
  if (cents >= 100) {
    whole += 1;
    cents = 0;
  }
  return (
    <span className={`inline-flex items-baseline ${className ?? ""}`}>
      {value < 0 ? "-" : null}$
      <NumberFlow
        value={whole}
        trend={0}
        format={{ useGrouping: true, maximumFractionDigits: 0 }}
        style={nfMaskStyle}
      />
      <span className={fractionClassName}>
        .
        <NumberFlow
          value={cents}
          trend={0}
          format={{
            minimumIntegerDigits: 2,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            useGrouping: false,
          }}
          style={nfMaskStyle}
        />
      </span>
    </span>
  );
}

function SignedUsdFlow({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const abs = Math.abs(value);
  const prefix = value > 0 ? "+$" : value < 0 ? "-$" : "$";
  return (
    <span className={`inline-flex items-baseline ${className ?? ""}`}>
      <span>{prefix}</span>
      <NumberFlow
        value={abs}
        trend={0}
        format={{
          useGrouping: true,
          maximumFractionDigits: abs >= 100 ? 0 : 2,
          minimumFractionDigits: abs >= 100 ? 0 : 2,
        }}
        style={nfMaskStyle}
      />
    </span>
  );
}

function SignedPercentFlow({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const abs = Math.abs(value);
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return (
    <span className={`inline-flex items-baseline ${className ?? ""}`}>
      <span>{prefix}</span>
      <NumberFlow
        value={abs}
        trend={0}
        suffix="%"
        format={{
          maximumFractionDigits: abs >= 10 ? 0 : 1,
          minimumFractionDigits: abs >= 10 ? 0 : 1,
        }}
        style={nfMaskStyle}
      />
    </span>
  );
}

function LiveScoreFlow({
  away,
  home,
}: {
  away: number;
  home: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <NumberFlow
        value={away}
        trend={1}
        format={{ useGrouping: false }}
        className="tabular-nums text-inherit"
        style={nfMaskStyle}
      />
      <span>-</span>
      <NumberFlow
        value={home}
        trend={1}
        format={{ useGrouping: false }}
        className="tabular-nums text-inherit"
        style={nfMaskStyle}
      />
    </span>
  );
}

function LivePeriodFlow({
  clock,
  status,
}: {
  clock: string;
  status: string;
}) {
  if (status === "final") return <>Final</>;
  if (status === "live") {
    const match = clock.match(/^(Q\d+|OT|HT)\s+(\d+):(\d{2})$/i);
    if (match) {
      const period = match[1]!;
      const minutes = Number(match[2]);
      const seconds = Number(match[3]);
      return (
        <span className="inline-flex items-baseline gap-1">
          <span>{period}</span>
          <span className="inline-flex items-baseline tabular-nums">
            <NumberFlow
              value={minutes}
              trend={1}
              format={{ useGrouping: false }}
              style={nfMaskStyle}
            />
            :
            <NumberFlow
              value={seconds}
              trend={1}
              format={{ useGrouping: false, minimumIntegerDigits: 2 }}
              style={nfMaskStyle}
            />
          </span>
        </span>
      );
    }
    return <>{clock || "Live"}</>;
  }
  return <>{formatLiveClock(clock, status)}</>;
}

const OUTCOME_BAR_COLORS = ["#00D54B", "#4C8DFF", "#FF9F1C"] as const;

function formatOutcomeLabel(label: string): string {
  const compact = label.replace(/,/g, "").trim();
  if (/^\d+(\.\d+)?$/.test(compact)) {
    const value = Number(compact);
    if (Number.isFinite(value)) return value.toLocaleString("en-US");
  }
  return label;
}

function previewOdds(market: PolymarketMarketData): {
  shown: Array<{ label: string; price: number; key: string }>;
  total: number;
} {
  const outcomes = (market.outcomes ?? []).filter(
    (outcome) => outcome.label.trim().length > 0,
  );
  const rows =
    outcomes.length > 0
      ? [...outcomes].sort((a, b) => b.price - a.price)
      : [
          {
            label: "Yes",
            price: market.yesPrice,
            marketId: market.marketId,
            slug: market.slug,
          },
          {
            label: "No",
            price: market.noPrice,
            marketId: market.marketId,
            slug: market.slug,
          },
        ];

  return {
    shown: rows.slice(0, 3).map((outcome, index) => ({
      label: outcome.label,
      price: outcome.price,
      key: `${outcome.marketId}-${outcome.label}-${index}`,
    })),
    total: Math.max(market.relatedMarketCount ?? 0, rows.length),
  };
}

function MarketOddsPreview({ market }: { market: PolymarketMarketData }) {
  const { shown } = previewOdds(market);

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      {shown.map((outcome, index) => (
        <div key={outcome.key}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-[13px] font-semibold leading-snug">
              {formatOutcomeLabel(outcome.label)}
            </p>
            <p className="shrink-0 text-[13px] font-semibold tabular-nums">
              <ChanceFlow price={outcome.price} />
            </p>
          </div>
          <div
            className="mt-1 h-[2px] rounded-full"
            style={{
              width: `${Math.max(8, Math.min(100, outcome.price * 100))}%`,
              backgroundColor:
                OUTCOME_BAR_COLORS[index % OUTCOME_BAR_COLORS.length],
            }}
          />
        </div>
      ))}
    </div>
  );
}

const TRENDING_IMAGE_HEIGHT = 136;

const CLIP_POOLS = {
  baseball: [
    "/playground/api/clips/baseball.mp4",
    "/playground/api/clips/baseball-2.mp4",
    "/playground/api/clips/baseball-3.mp4",
    "/playground/api/clips/baseball-4.mp4",
  ],
  basketball: [
    "/playground/api/clips/basketball.mp4",
    "/playground/api/clips/basketball-2.mp4",
    "/playground/api/clips/basketball-3.mp4",
  ],
  tennis: [
    "/playground/api/clips/tennis.mp4",
    "/playground/api/clips/tennis-2.mp4",
    "/playground/api/clips/tennis-3.mp4",
    "/playground/api/clips/tennis-4.mp4",
  ],
  soccer: [
    "/playground/api/clips/soccer.mp4",
    "/playground/api/clips/soccer-2.mp4",
    "/playground/api/clips/soccer-3.mp4",
    "/playground/api/clips/soccer-4.mp4",
  ],
} as const;

type SportClipKind = keyof typeof CLIP_POOLS;

type MarketClipRef = { src: string; startRatio: number };

function pickClip(kind: SportClipKind, seed: string): MarketClipRef {
  const pool = CLIP_POOLS[kind];
  const hash = hashString(seed);
  return {
    src: pool[hash % pool.length],
    startRatio: 0.08 + (hash % 37) / 100,
  };
}

function sportClipForMarket(market: PolymarketMarketData): MarketClipRef | null {
  if (!isSportsMarket(market)) return null;
  const haystack =
    `${market.title} ${market.category ?? ""} ${market.liveGame?.league ?? ""}`.toLowerCase();
  if (
    /\b(lol:|league of legends|cs2|counter-strike|dota|valorant|esport|lck|lpl|lec)\b/.test(
      haystack,
    )
  ) {
    return null;
  }
  const seed = market.slug || market.marketId || market.title;
  if (
    /\b(nba|wnba|lakers|celtics|pistons|knicks|bulls|spurs|heat|nets|jazz|dunk|basketball)\b/.test(
      haystack,
    )
  ) {
    return pickClip("basketball", seed);
  }
  if (
    /\b(atp|wta|tennis|cincinnati open|wimbledon|roland\s*garros|us open|australian open|medvedev|swiatek|sakkari|rublev|nakashima)\b/.test(
      haystack,
    ) ||
    /open:\s/.test(haystack)
  ) {
    return pickClip("tennis", seed);
  }
  if (
    /\b(epl|mls|ucl|fifa|soccer|premier league|la liga|bundesliga|serie a|ligue 1|world cup|sounders|cardiff|wrexham)\b/.test(
      haystack,
    ) ||
    /\bfc\b/.test(haystack)
  ) {
    return pickClip("soccer", seed);
  }
  return pickClip("baseball", seed);
}

function MarketClip({ clip }: { clip: MarketClipRef }) {
  return (
    <video
      src={clip.src}
      autoPlay
      muted
      loop
      playsInline
      disablePictureInPicture
      controls={false}
      tabIndex={-1}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (Number.isFinite(video.duration) && video.duration > 1) {
          video.currentTime = video.duration * clip.startRatio;
        }
      }}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
    />
  );
}

function TrendingViewIcons({
  value,
  onChange,
}: {
  value: TrendingView;
  onChange: (view: TrendingView) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label="Trending layout"
    >
      <button
        type="button"
        aria-label="Masonry grid"
        aria-pressed={value === "masonry"}
        onClick={() => onChange("masonry")}
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          value === "masonry" ? "text-white" : "text-white/35"
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="1" y="1" width="6.2" height="8.2" rx="1.3" />
          <rect x="8.8" y="1" width="6.2" height="5.2" rx="1.3" />
          <rect x="1" y="10.4" width="6.2" height="4.6" rx="1.3" />
          <rect x="8.8" y="7.4" width="6.2" height="7.6" rx="1.3" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          value === "list" ? "text-white" : "text-white/35"
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="1" y="1.6" width="3.6" height="3.6" rx="0.9" />
          <rect x="6.2" y="2.4" width="8.8" height="2" rx="1" />
          <rect x="1" y="6.2" width="3.6" height="3.6" rx="0.9" />
          <rect x="6.2" y="7" width="8.8" height="2" rx="1" />
          <rect x="1" y="10.8" width="3.6" height="3.6" rx="0.9" />
          <rect x="6.2" y="11.6" width="8.8" height="2" rx="1" />
        </svg>
      </button>
    </div>
  );
}

function TrendingMarketMedia({
  market,
  clip,
}: {
  market: PolymarketMarketData;
  clip: MarketClipRef | null;
}) {
  if (clip) return <MarketClip clip={clip} />;
  if (market.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={market.image} alt="" className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-white/[0.08] text-[11px] font-semibold text-white/35">
      Market
    </div>
  );
}

function TrendingMarketCard({
  market,
  onOpen,
  variant = "masonry",
}: {
  market: PolymarketMarketData;
  onOpen: (market: PolymarketMarketData) => void;
  variant?: TrendingView;
}) {
  const accent = useImageAccent(market.image);
  const odds = previewOdds(market);
  const clip = sportClipForMarket(market);
  const top = odds.shown[0];

  if (variant === "list") {
    return (
      <button
        type="button"
        onClick={() => onOpen(market)}
        className="flex w-full items-center gap-3 overflow-hidden rounded-[20px] text-left transition-[filter,background-color] duration-500 hover:brightness-110"
        style={{ backgroundColor: accent }}
      >
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden">
          <TrendingMarketMedia market={market} clip={null} />
        </div>
        <div className="min-w-0 flex-1 py-2.5 pr-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug">
            {market.title}
          </p>
          <p className="mt-1 text-[11px] text-white/45">
            {formatUsd(market.volumeUsd || market.volume24h)} Vol
          </p>
        </div>
        {top ? (
          <p
            className={`shrink-0 pr-3 text-[16px] font-semibold tabular-nums ${instrumentSansCondensed.className}`}
          >
            <ChanceFlow price={top.price} />
          </p>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(market)}
      className="w-full overflow-hidden rounded-[20px] text-left transition-[filter,background-color] duration-500 hover:brightness-110"
      style={{ backgroundColor: accent }}
    >
      <div className="relative overflow-hidden" style={{ height: TRENDING_IMAGE_HEIGHT }}>
        <TrendingMarketMedia market={market} clip={clip} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
          style={{
            backgroundImage: `linear-gradient(to top, ${accent}, transparent)`,
          }}
        />
      </div>
      <div className="px-2.5 pb-2.5 pt-1.5">
        <p className="line-clamp-3 text-[12px] font-semibold leading-snug">
          {market.title}
        </p>
        <MarketOddsPreview market={market} />
        <p className="mt-2.5 flex flex-wrap gap-x-2 text-[10px] text-white/40">
          <span>{formatUsd(market.volumeUsd || market.volume24h)} Vol</span>
          {odds.total > 3 ? <span>{odds.total} Markets</span> : null}
        </p>
      </div>
    </button>
  );
}

function ListsPreviewRail({
  lists,
  status,
  onOpen,
}: {
  lists: PolymarketWatchList[];
  status: "loading" | "ready" | "error";
  onOpen: (id: string) => void;
}) {
  return (
    <section aria-label="Watch lists">
      <h3 className={`mb-2.5 ${ui.section}`}>Lists</h3>

      {status === "loading" && (
        <div
          className="-mx-5 flex gap-2.5 overflow-hidden px-5 animate-pulse"
          aria-hidden
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[100px] w-[168px] shrink-0 rounded-[20px] bg-white/10"
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-white/55">Couldn&apos;t load watch lists.</p>
      )}

      {status === "ready" && lists.length === 0 && (
        <p className="text-sm text-white/55">No popular watch lists.</p>
      )}

      {status === "ready" && lists.length > 0 && (
        <div className="-mx-5 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-2.5 pb-0.5">
            {lists.map((list) => {
              const pnlPositive = list.aggregatedPnl >= 0;
              return (
                <li key={list.id} className="w-[168px] shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpen(list.id)}
                    className="flex h-[100px] w-full flex-col justify-between rounded-[20px] bg-white/[0.08] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.1]"
                  >
                    <p className="truncate text-[13px] font-semibold leading-snug">
                      {list.name}
                    </p>
                    <p className="mt-1 truncate text-[11px] tabular-nums text-white/45">
                      {list.walletCount}{" "}
                      {list.walletCount === 1 ? "wallet" : "wallets"}
                    </p>
                    <p
                      className={`mt-auto pt-2 text-[14px] font-semibold tabular-nums ${
                        pnlPositive ? "text-[#00D54B]" : "text-[#FF375F]"
                      }`}
                    >
                      {formatSignedUsd(list.aggregatedPnl)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function teamShortLabel(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
}

function teamAbbrLabel(name: string, abbr?: string | null): string {
  if (abbr && abbr.trim()) return abbr.trim().toUpperCase().slice(0, 4);
  return liveSideName(name);
}

function teamAccent(name: string, abbr: string | null | undefined, side: 0 | 1): string {
  const key = `${abbr ?? ""} ${name}`.toLowerCase();
  if (/knicks|nyk/.test(key)) return "#F58426";
  if (/spurs|sas/.test(key)) return "#8B9DC3";
  if (/lakers|lal/.test(key)) return "#FDB927";
  if (/celtics|bos/.test(key)) return "#00A86B";
  if (/warriors|gsw/.test(key)) return "#1D428A";
  if (/heat|mia/.test(key)) return "#98002E";
  if (/nets|bkn|brooklyn/.test(key)) return "#E8E8E8";
  if (/bulls|chi/.test(key)) return "#CE1141";
  if (/yankees|nyy/.test(key)) return "#0C2340";
  if (/dodgers|lad/.test(key)) return "#005A9C";
  return side === 0 ? "#F58426" : "#7EB6FF";
}

function leagueLogoUrl(league: string): string | null {
  const key = league.trim().toUpperCase();
  const map: Record<string, string> = {
    NBA: "nba",
    NFL: "nfl",
    NHL: "nhl",
    MLB: "mlb",
  };
  const slug = map[key];
  if (!slug) return null;
  return `https://a.espncdn.com/i/teamlogos/leagues/500/${slug}.png`;
}

function formatSportsDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const then = Date.parse(value);
  if (!Number.isFinite(then)) return null;
  return new Date(then).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type SportsChartRange = "1H" | "6H" | "1D" | "1W" | "1M" | "MAX";

const SPORTS_CHART_RANGES: SportsChartRange[] = [
  "1H",
  "6H",
  "1D",
  "1W",
  "1M",
  "MAX",
];

const SPORTS_RANGE_STEPS: Record<SportsChartRange, number> = {
  "1H": 12,
  "6H": 18,
  "1D": 24,
  "1W": 28,
  "1M": 32,
  MAX: 36,
};

function seedSportsOddsSeries(
  endPercent: number,
  seed: number,
  steps: number,
): number[] {
  const clampedEnd = Math.max(4, Math.min(96, endPercent));
  let value = Math.max(8, Math.min(88, clampedEnd * 0.55 + (seed % 16)));
  const points: number[] = [];
  for (let i = 0; i < steps; i++) {
    const progress = i / Math.max(1, steps - 1);
    const drift = (clampedEnd - value) * (0.06 + progress * 0.12);
    const wave = Math.sin(i * 0.42 + (seed % 9)) * 5.5;
    value = Math.max(4, Math.min(96, value + drift + wave));
    points.push(Math.round(value * 10) / 10);
  }
  points[points.length - 1] = clampedEnd;
  return points;
}

function seriesToPath(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
): string {
  if (values.length === 0) return "";
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  return values
    .map((value, index) => {
      const x =
        padX +
        (values.length === 1 ? innerW / 2 : (index / (values.length - 1)) * innerW);
      const y = padY + innerH * (1 - Math.max(0, Math.min(100, value)) / 100);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function LiveTeamMark({
  logo,
  name,
  abbr,
  size = "md",
  portrait = false,
}: {
  logo?: string | null;
  name: string;
  abbr?: string | null;
  size?: "md" | "lg" | "header";
  portrait?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const label = (abbr ?? liveSideName(name)).slice(0, 3).toUpperCase();
  const face = portrait || /\.jpe?g(?:$|\?)/i.test(logo ?? "");
  const box =
    size === "header"
      ? "h-11 w-11 rounded-full text-[11px]"
      : size === "lg"
        ? "h-14 w-14 rounded-[10px] text-[12px]"
        : "h-10 w-10 rounded-[8px] text-[10px]";
  const img =
    size === "header"
      ? "h-11 w-11"
      : size === "lg"
        ? "h-14 w-14"
        : "h-10 w-10";

  if (!logo || failed) {
    return (
      <span
        className={`flex items-center justify-center bg-white/10 font-semibold tracking-wide text-white/80 ${box}`}
      >
        {label}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      onError={() => setFailed(true)}
      className={`${img} ${
        face ? "rounded-full object-cover" : "object-contain"
      }`}
    />
  );
}

function LiveGameCard({
  market,
  onOpen,
}: {
  market: PolymarketMarketData;
  onOpen: (market: PolymarketMarketData) => void;
}) {
  const { game, away, home, awayOdds, homeOdds } = resolveSportsSides(market);
  const accent = useImageAccent(
    market.image ?? away.logo ?? home.logo ?? null,
  );
  const isLive = game?.status === "live";
  const hasScore = away.score != null && home.score != null;
  const period = game ? formatLiveClock(game.clock, game.status) : "Sports";

  return (
    <button
      type="button"
      onClick={() => onOpen(market)}
      className="flex h-[124px] w-full flex-col justify-center overflow-hidden rounded-[20px] px-3 py-2.5 text-left transition-[filter,background-color] duration-500 hover:brightness-110"
      style={{ backgroundColor: accent }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-1">
        <div className="flex min-w-0 flex-col items-center">
          <LiveTeamMark
            logo={away.logo}
            name={away.name}
            abbr={away.abbr}
            portrait={away.portrait}
          />
          <p className="mt-1.5 max-w-full truncate text-center text-[11px] font-semibold uppercase tracking-[0.06em]">
            {liveSideName(away.name)}
          </p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums leading-none text-[#E8C44A]">
            <ChanceFlow price={awayOdds?.price ?? market.yesPrice} />
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 px-3">
          <div className="flex h-[14px] items-center justify-center">
            {isLive ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FF3B30]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF3B30]" />
                Live
              </span>
            ) : null}
          </div>
          <p
            className={`text-[28px] font-semibold tabular-nums leading-none tracking-tight text-white ${instrumentSansCondensed.className}`}
          >
            {hasScore ? (
              <LiveScoreFlow away={away.score!} home={home.score!} />
            ) : (
              <span className="text-white/40">vs</span>
            )}
          </p>
          <p className="max-w-[108px] truncate text-center text-[11px] leading-none text-white/35">
            {game ? (
              <LivePeriodFlow clock={game.clock} status={game.status} />
            ) : (
              period
            )}
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-center">
          <LiveTeamMark
            logo={home.logo}
            name={home.name}
            abbr={home.abbr}
            portrait={home.portrait}
          />
          <p className="mt-1.5 max-w-full truncate text-center text-[11px] font-semibold uppercase tracking-[0.06em]">
            {liveSideName(home.name)}
          </p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums leading-none text-[#FF5C5C]">
            <ChanceFlow price={homeOdds?.price ?? market.noPrice} />
          </p>
        </div>
      </div>
    </button>
  );
}

function SportsOddsChart({
  awayValues,
  homeValues,
  awayColor,
  homeColor,
  awayLabel,
  homeLabel,
  awayPct,
  homePct,
}: {
  awayValues: number[];
  homeValues: number[];
  awayColor: string;
  homeColor: string;
  awayLabel: string;
  homeLabel: string;
  awayPct: number;
  homePct: number;
}) {
  const width = 320;
  const height = 118;
  const padX = 8;
  const padY = 10;
  const awayPath = seriesToPath(awayValues, width, height, padX, padY);
  const homePath = seriesToPath(homeValues, width, height, padX, padY);

  return (
    <div className="relative h-[118px] w-full pr-[3.75rem]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={awayPath}
          fill="none"
          stroke={awayColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={homePath}
          fill="none"
          stroke={homeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-center gap-0.5 text-right">
        <p
          className={`text-[15px] font-semibold leading-none tabular-nums ${instrumentSansCondensed.className}`}
          style={{ color: awayColor }}
        >
          {Math.round(awayPct)}%
        </p>
        <p className="text-[11px] font-semibold leading-none" style={{ color: awayColor }}>
          {awayLabel}
        </p>
        <p
          className="mt-1.5 text-[11px] font-semibold leading-none"
          style={{ color: homeColor }}
        >
          {homeLabel}
        </p>
        <p
          className={`text-[15px] font-semibold leading-none tabular-nums ${instrumentSansCondensed.className}`}
          style={{ color: homeColor }}
        >
          {Math.round(homePct)}%
        </p>
      </div>
    </div>
  );
}

function SportsVolumeRow({
  market,
  trailing,
}: {
  market: PolymarketMarketData;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="shrink-0 text-[11px] tabular-nums text-white/40">
        US{formatUsd(market.volumeUsd || market.volume24h)} Vol
      </p>
      {trailing}
    </div>
  );
}

function SportsTeamsList({
  market,
  teams,
}: {
  market: PolymarketMarketData;
  teams: NonNullable<PolymarketMarketData["teams"]>;
}) {
  const outcomes = market.outcomes ?? [];
  return (
    <div className="flex flex-col gap-3">
      {teams.map((team, index) => {
        const outcome =
          outcomes.find((item) => nickMatch(item.label, team.name)) ??
          outcomes[index];
        const price = outcome?.price ?? 0;
        return (
          <div
            key={`${team.name}-${index}`}
            className="flex items-center gap-3 px-0.5"
          >
            <LiveTeamMark
              logo={team.logo}
              name={team.name}
              abbr={team.abbr}
              portrait={team.portrait}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] font-semibold">
                  {team.name}
                </p>
                <p
                  className={`shrink-0 text-[18px] font-semibold tabular-nums ${instrumentSansCondensed.className}`}
                >
                  <ChanceFlow price={price} />
                </p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.min(100, price * 100))}%`,
                    backgroundColor:
                      OUTCOME_BAR_COLORS[index % OUTCOME_BAR_COLORS.length],
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <SportsVolumeRow market={market} />
    </div>
  );
}

function SportsOneTeamBoard({
  market,
  team,
}: {
  market: PolymarketMarketData;
  team: NonNullable<PolymarketMarketData["teams"]>[number];
}) {
  const odds = getMarketOddsSides(market);
  const yes = odds.find((side) => side.side === "yes") ?? odds[0];
  const no = odds.find((side) => side.side === "no") ?? odds[1];
  const yesPrice = yes?.price ?? market.yesPrice;
  const noPrice = no?.price ?? market.noPrice;
  const yesPct = Math.max(1, Math.min(99, yesPrice * 100));
  const noPct = Math.max(1, Math.min(99, noPrice * 100));
  const [range, setRange] = useState<SportsChartRange>("MAX");
  const seed = hashString(market.slug || market.marketId || market.title);
  const steps = SPORTS_RANGE_STEPS[range];
  const yesSeries = useMemo(
    () => seedSportsOddsSeries(yesPct, seed, steps),
    [yesPct, seed, steps],
  );
  const noSeries = useMemo(
    () =>
      seedSportsOddsSeries(noPct, seed + 17, steps).map((value, index) => {
        const complement = 100 - (yesSeries[index] ?? yesPct);
        return Math.round((value * 0.35 + complement * 0.65) * 10) / 10;
      }),
    [noPct, seed, steps, yesPct, yesSeries],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-0.5">
        <LiveTeamMark
          logo={team.logo}
          name={team.name}
          abbr={team.abbr}
          size="header"
          portrait={team.portrait}
        />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold leading-tight">
            {team.name}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-white/45">
            {market.liveGame?.league ?? market.category ?? "Sports"}
          </p>
        </div>
      </div>

      <SportsOddsChart
        awayValues={yesSeries}
        homeValues={noSeries}
        awayColor="#00D54B"
        homeColor="#FF5C5C"
        awayLabel={yes?.label ?? "Yes"}
        homeLabel={no?.label ?? "No"}
        awayPct={yesPct}
        homePct={noPct}
      />

      <SportsVolumeRow
        market={market}
        trailing={
          <SportsChartRangeTabs range={range} onChange={setRange} />
        }
      />
    </div>
  );
}

function SportsChartRangeTabs({
  range,
  onChange,
}: {
  range: SportsChartRange;
  onChange: (range: SportsChartRange) => void;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-end gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Chart range"
    >
      {SPORTS_CHART_RANGES.map((item) => {
        const active = item === range;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item)}
            className={`shrink-0 text-[11px] font-semibold tracking-[0.02em] ${
              active ? "text-white" : "text-white/35 hover:text-white/55"
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

function SportsScoreboard({ market }: { market: PolymarketMarketData }) {
  const teams = market.teams ?? [];
  if (teams.length > 2) {
    return <SportsTeamsList market={market} teams={teams} />;
  }
  if (teams.length === 1) {
    return <SportsOneTeamBoard market={market} team={teams[0]!} />;
  }
  return <SportsMatchupBoard market={market} />;
}

function SportsMatchupBoard({ market }: { market: PolymarketMarketData }) {
  const { game, away, home, awayOdds, homeOdds } = resolveSportsSides(market);
  const [range, setRange] = useState<SportsChartRange>("MAX");
  const awayPrice = awayOdds?.price ?? market.yesPrice;
  const homePrice = homeOdds?.price ?? market.noPrice;
  const awayPct = Math.max(1, Math.min(99, awayPrice * 100));
  const homePct = Math.max(1, Math.min(99, homePrice * 100));
  const awayColor = teamAccent(away.name, away.abbr, 0);
  const homeColor = teamAccent(home.name, home.abbr, 1);
  const awayName = teamShortLabel(away.name);
  const homeName = teamShortLabel(home.name);
  const awayAbbr = teamAbbrLabel(away.name, away.abbr);
  const homeAbbr = teamAbbrLabel(home.name, home.abbr);
  const seed = hashString(market.slug || market.marketId || market.title);
  const steps = SPORTS_RANGE_STEPS[range];
  const awaySeries = useMemo(
    () => seedSportsOddsSeries(awayPct, seed, steps),
    [awayPct, seed, steps],
  );
  const homeSeries = useMemo(
    () => seedSportsOddsSeries(homePct, seed + 17, steps).map((v, i) => {
      const complement = 100 - (awaySeries[i] ?? awayPct);
      return Math.round((v * 0.35 + complement * 0.65) * 10) / 10;
    }),
    [awaySeries, awayPct, homePct, seed, steps],
  );

  const hasScore = away.score != null && home.score != null;
  const statusTop =
    game?.status === "final"
      ? "Final"
      : game?.status === "live"
        ? "Live"
        : game?.status === "upcoming"
          ? "Upcoming"
          : market.isResolved
            ? "Final"
            : "Open";
  const periodLabel =
    game?.status === "live"
      ? formatLiveClock(game.clock, game.status)
      : formatSportsDate(market.closesAt) ??
        (game?.clock && game.status !== "final"
          ? formatLiveClock(game.clock, game.status)
          : null);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-0.5">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <LiveTeamMark
            logo={away.logo}
            name={away.name}
            abbr={away.abbr}
            size="header"
            portrait={away.portrait}
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {awayName}
            </p>
            <p
              className="mt-0.5 text-[13px] font-semibold leading-none tabular-nums"
              style={{ color: awayColor }}
            >
              {awayAbbr}
            </p>
          </div>
        </div>

        <div className="flex min-w-[5.5rem] flex-col items-center pt-0.5 text-center">
          <p
            className={`text-[12px] font-medium leading-none ${
              statusTop === "Live" ? "text-[#FF3B30]" : "text-white/45"
            }`}
          >
            {statusTop}
          </p>
          {hasScore ? (
            <p
              className={`mt-1.5 text-[42px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSansCondensed.className}`}
            >
              <LiveScoreFlow away={away.score!} home={home.score!} />
            </p>
          ) : null}
          {periodLabel ? (
            <p
              className={`text-[13px] font-semibold leading-none tabular-nums text-white ${
                hasScore ? "mt-1.5 text-white/55" : "mt-1.5"
              }`}
            >
              {game?.status === "live" ? (
                <LivePeriodFlow clock={game.clock} status={game.status} />
              ) : (
                periodLabel
              )}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1.5 text-right">
          <LiveTeamMark
            logo={home.logo}
            name={home.name}
            abbr={home.abbr}
            size="header"
            portrait={home.portrait}
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {homeName}
            </p>
            <p
              className="mt-0.5 text-[13px] font-semibold leading-none tabular-nums"
              style={{ color: homeColor }}
            >
              {homeAbbr}
            </p>
          </div>
        </div>
      </div>

      <SportsOddsChart
        awayValues={awaySeries}
        homeValues={homeSeries}
        awayColor={awayColor}
        homeColor={homeColor}
        awayLabel={awayName}
        homeLabel={homeName}
        awayPct={awayPct}
        homePct={homePct}
      />

      <div className="flex items-center justify-between gap-2">
        <p className="shrink-0 text-[11px] tabular-nums text-white/40">
          US{formatUsd(market.volumeUsd || market.volume24h)} Vol
        </p>
        <div
          className="flex min-w-0 items-center justify-end gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Chart range"
        >
          {SPORTS_CHART_RANGES.map((item) => {
            const active = item === range;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRange(item)}
                className={`shrink-0 text-[11px] font-semibold tracking-[0.02em] ${
                  active ? "text-white" : "text-white/35 hover:text-white/55"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function shortWallet(wallet: string): string {
  if (wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function ShareGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M8 10V3M8 3 5.5 5.5M8 3l2.5 2.5M3.5 9v3.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarketYourPosition({
  item,
  market,
  handle,
  referralCode,
  onCashOut,
  onShare,
}: {
  item: StoredUserTrade;
  market: PolymarketMarketData;
  handle: string;
  referralCode: string;
  onCashOut: () => void;
  onShare: (payload: SharePositionPayload) => void;
}) {
  const sides = getMarketOddsSides(market);
  const liveSide =
    sides.find(
      (side) =>
        side.label.toLowerCase() === item.trade.outcome.toLowerCase(),
    ) ?? null;
  const markPrice = liveSide?.price ?? item.position.markPrice;
  const invested = item.trade.amountUsd;
  const toWin = item.position.shares;
  const cashOut = item.position.shares * markPrice;
  const pnlUsd = cashOut - invested;
  const pnlPct = invested > 0 ? (pnlUsd / invested) * 100 : 0;
  const progressPct = Math.round(Math.max(2, Math.min(98, markPrice * 100)));
  const image = item.position.image ?? market.image;

  return (
    <section aria-label="Your position">
      <h3 className={`mb-2.5 ${ui.section}`}>Your position</h3>
      <div className="rounded-[20px] bg-white/[0.08] p-3.5">
        <div className="flex items-center gap-2.5">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/40">
              {item.trade.outcome.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="min-w-0 truncate text-[15px] font-semibold">
            {item.trade.outcome}
          </p>
        </div>

        <p className="mt-2.5 text-[15px] font-semibold tabular-nums">
          <span className="text-white">{formatUsdPrecise(invested)}</span>
          <span className="text-white/45"> → </span>
          <span className="text-[#00D54B]">{formatUsdPrecise(toWin)}</span>
        </p>

        <div className="relative mt-3 h-7 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-[18%] opacity-90"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #FF375F 0 5px, #FF8A9B 5px 10px)",
            }}
          />
          <div
            className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-[#00D54B] pr-2.5"
            style={{ width: `${progressPct}%` }}
          >
            <span className="text-[11px] font-bold tabular-nums text-[#06381a]">
              {progressPct}%
            </span>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-1 w-px border-l border-dashed border-black/35"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Share position"
            onClick={() =>
              onShare({
                title: market.title,
                subtitle: item.trade.outcome,
                image,
                handle,
                wallet: item.trade.wallet,
                timestamp: item.trade.timestamp,
                invested,
                entryPrice: item.trade.price,
                markPrice,
                currentValue: cashOut,
                pnlUsd,
                pnlPct,
                exitLabel: "Now",
                closed: false,
                referralCode,
              })
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white transition-colors hover:bg-white/10"
          >
            <ShareGlyph className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCashOut}
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-white/[0.08] text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            Cash out {formatUsdPrecise(cashOut)}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfilePositionRow({
  position,
  onOpen,
}: {
  position: PolymarketWalletPosition;
  onOpen: (
    slug: string,
    title: string,
    preview?: { image?: string | null; price?: number; outcome?: string },
  ) => void;
}) {
  return (
    <ActivityRow
      leading={
        position.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={position.image}
            alt=""
            className="h-11 w-11 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.1] text-[12px] font-semibold text-white/40">
            {position.outcome.slice(0, 1)}
          </div>
        )
      }
      title={position.marketTitle}
      subtitle={`${position.outcome} · ${formatOdds(position.markPrice)}`}
      trailing={
        <div>
          <p className="text-[16px] font-semibold tabular-nums">
            {formatUsd(position.valueUsd)}
          </p>
          <p
            className={`mt-0.5 text-[13px] font-semibold tabular-nums ${
              position.pnlUsd > 0
                ? "text-[#00D54B]"
                : position.pnlUsd < 0
                  ? "text-[#FF375F]"
                  : "text-white/45"
            }`}
          >
            {formatSignedUsd(position.pnlUsd)}
          </p>
        </div>
      }
      onClick={() =>
        onOpen(position.marketSlug ?? "", position.marketTitle, {
          image: position.image,
          price: position.markPrice,
          outcome: position.outcome,
        })
      }
    />
  );
}

function ProfileHistoryRow({
  trade,
  marketImage,
  onOpen,
}: {
  trade: PolymarketWalletTrade;
  marketImage?: string;
  onOpen: (
    slug: string,
    title: string,
    preview?: { image?: string | null; price?: number; outcome?: string },
  ) => void;
}) {
  const isBuy = trade.side.toUpperCase() === "BUY";
  const timeAgo = formatTimeAgo(trade.timestamp);
  return (
    <ActivityRow
      leading={
        marketImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={marketImage}
            alt=""
            className="h-11 w-11 rounded-2xl object-cover"
          />
        ) : (
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-[13px] font-semibold ${
              isBuy
                ? "bg-[#00D54B]/15 text-[#00D54B]"
                : "bg-[#FF375F]/15 text-[#FF375F]"
            }`}
          >
            {isBuy ? "B" : "S"}
          </div>
        )
      }
      title={trade.marketTitle}
      subtitle={`${trade.side} · ${trade.outcome} · ${formatOdds(trade.price)}${timeAgo ? ` · ${timeAgo}` : ""}`}
      trailing={
        <span className="text-[16px] font-semibold tabular-nums">
          {formatUsd(trade.size * trade.price)}
        </span>
      }
      onClick={() =>
        onOpen(trade.marketSlug ?? "", trade.marketTitle, {
          image: marketImage,
          price: trade.price,
          outcome: trade.outcome,
        })
      }
    />
  );
}

function CopyTradeCard({
  trade,
  copied,
  onManage,
}: {
  trade: CopyTrade;
  copied: StoredUserTrade[];
  onManage: () => void;
}) {
  const entries = copyRelationshipEntries(copied);
  const pnl = copyRelationshipPnl(copied);
  const handle = trade.handle.startsWith("@")
    ? trade.handle
    : `@${trade.handle}`;

  return (
    <button
      type="button"
      onClick={onManage}
      className="flex w-full items-center gap-3 rounded-[20px] bg-white/[0.08] px-3.5 py-3.5 text-left transition-colors hover:bg-white/[0.1]"
    >
      <UserAvatar
        seed={trade.wallet}
        label={trade.displayName}
        className="h-11 w-11 text-[13px]"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold leading-snug">
          {handle}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-white/55">
          {formatCopyRule(trade)}
          {entries.length > 0 ? ` · ${entries.length} copied` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-[16px] font-semibold tabular-nums ${
            pnl > 0
              ? "text-[#00D54B]"
              : pnl < 0
                ? "text-[#FF375F]"
                : "text-white/45"
          }`}
        >
          <SignedUsdFlow value={pnl} />
        </p>
        <p
          className={`mt-0.5 text-[13px] font-semibold ${
            trade.status === "active" ? "text-[#00D54B]" : "text-white/45"
          }`}
        >
          {trade.status === "active" ? "Active" : "Paused"}
        </p>
      </div>
    </button>
  );
}

function ProfileCountRow({
  following,
  followers,
  winRate,
  onFollowingClick,
  onFollowersClick,
}: {
  following: number;
  followers: number;
  winRate: number | null;
  onFollowingClick?: () => void;
  onFollowersClick?: () => void;
}) {
  const countClass =
    "flex items-baseline gap-1.5 rounded-md text-left transition-opacity hover:opacity-80";
  return (
    <div className="mt-3 flex items-baseline gap-5 text-[13px] leading-none">
      <button
        type="button"
        onClick={onFollowingClick}
        className={countClass}
      >
        <span className="text-white/45">Following</span>
        <span className="font-semibold tabular-nums">
          {following.toLocaleString()}
        </span>
      </button>
      <button
        type="button"
        onClick={onFollowersClick}
        className={countClass}
      >
        <span className="text-white/45">Followers</span>
        <span className="font-semibold tabular-nums">
          {followers.toLocaleString()}
        </span>
      </button>
      <p className="flex items-baseline gap-1.5">
        <span className="text-white/45">Win rate</span>
        <span className="font-semibold tabular-nums">
          {winRate === null ? "—" : `${winRate.toFixed(1)}%`}
        </span>
      </p>
    </div>
  );
}

function ProfileIdentityHeader({
  seed,
  name,
  wallet,
  nameRef,
  trailing,
}: {
  seed: string;
  name: string;
  wallet: string;
  nameRef?: RefObject<HTMLElement | null>;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar seed={seed} label={name} className="h-11 w-11 text-[13px]" />
      <div className="min-w-0 flex-1">
        <p
          ref={nameRef as RefObject<HTMLParagraphElement>}
          className="truncate text-[15px] font-semibold"
        >
          {name}
        </p>
        <p className="mt-0.5 text-[11px] tabular-nums text-white/40">
          {shortWallet(wallet)}
        </p>
      </div>
      {trailing ? (
        <div className="flex shrink-0 items-center gap-1">{trailing}</div>
      ) : null}
    </div>
  );
}

function ProfileBalanceChart({
  balance,
  loading,
  totalPnl,
  roiPercent,
  history,
  onDeposit,
}: {
  balance: number;
  loading: boolean;
  totalPnl: number | null;
  roiPercent: number | null;
  history: LivelinePoint[];
  onDeposit?: () => void;
}) {
  return (
    <>
      <header className="mb-2 mt-4">
        <p
          className={`text-[42px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSansCondensed.className}`}
        >
          {loading ? (
            "—"
          ) : (
            <BalanceFlow
              value={balance}
              fractionClassName="text-white/40"
            />
          )}
        </p>
        {!loading && totalPnl !== null && (
          <p
            className={`mt-1.5 inline-flex items-baseline gap-1 text-[13px] font-semibold tabular-nums ${
              totalPnl > 0
                ? "text-[#00D54B]"
                : totalPnl < 0
                  ? "text-[#FF375F]"
                  : "text-white/45"
            }`}
          >
            <SignedUsdFlow value={totalPnl} />
            {roiPercent !== null ? (
              <span className="inline-flex items-baseline">
                (
                <SignedPercentFlow value={roiPercent} />)
              </span>
            ) : null}
          </p>
        )}
      </header>
      <div
        className="-mx-5 h-[88px] w-[calc(100%+2.5rem)]"
        aria-label="Portfolio value chart"
      >
        {!loading && history.length >= 2 ? (
          <Liveline
            data={history}
            value={history[history.length - 1]?.value ?? balance}
            theme="dark"
            color="#00D54B"
            grid={false}
            badge={false}
            pulse={false}
            momentum={false}
            scrub
            fill
            paused
            showValue={false}
            window={60 * 60 * 24 * Math.max(history.length - 1, 1)}
            formatValue={(v) => formatUsd(v)}
            formatTime={() => ""}
            padding={{ top: 6, right: 12, bottom: 6, left: 12 }}
            className="h-full w-full"
          />
        ) : (
          <div
            className={`h-full w-full ${loading ? "animate-pulse bg-white/[0.04]" : ""}`}
          />
        )}
      </div>
      {onDeposit ? (
        <button
          type="button"
          onClick={onDeposit}
          className="mt-4 w-full rounded-full bg-white py-3 text-[15px] font-semibold text-black transition-opacity hover:opacity-90"
        >
          Deposit
        </button>
      ) : null}
    </>
  );
}

function ListPnlChart({
  pnl,
  loading,
  history,
}: {
  pnl: number | null;
  loading: boolean;
  history: LivelinePoint[];
}) {
  const color = (pnl ?? 0) >= 0 ? "#00D54B" : "#FF375F";

  return (
    <>
      <header className="mb-2 mt-4">
        <p
          className={`text-[42px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSansCondensed.className}`}
        >
          {loading || pnl === null ? (
            "—"
          ) : (
            <>
              {pnl > 0 ? "+" : null}
              <BalanceFlow value={pnl} fractionClassName="text-white/40" />
            </>
          )}
        </p>
      </header>
      <div
        className="-mx-5 h-[88px] w-[calc(100%+2.5rem)]"
        aria-label="List PnL chart"
      >
        {!loading && history.length >= 2 ? (
          <Liveline
            data={history}
            value={history[history.length - 1]?.value ?? pnl ?? 0}
            theme="dark"
            color={color}
            grid={false}
            badge={false}
            pulse={false}
            momentum={false}
            scrub
            fill
            paused
            showValue={false}
            window={60 * 60 * 24 * Math.max(history.length - 1, 1)}
            formatValue={(v) => formatUsd(v)}
            formatTime={() => ""}
            padding={{ top: 6, right: 12, bottom: 6, left: 12 }}
            className="h-full w-full"
          />
        ) : (
          <div
            className={`h-full w-full ${loading ? "animate-pulse bg-white/[0.04]" : ""}`}
          />
        )}
      </div>
    </>
  );
}

function FeedItemSkeleton() {
  return (
    <li className="border-b border-white/[0.06] py-5 first:pt-0">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-[78%] rounded bg-white/10" />
          <div className="mt-2 h-4 w-[62%] rounded bg-white/10" />
          <div className="mt-3 rounded-[20px] bg-white/[0.08] p-3.5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/10" />
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-[70%] rounded bg-white/10" />
                <div className="mt-2 h-3 w-16 rounded bg-white/10" />
              </div>
            </div>
            <div className="mt-3 flex justify-between">
              <div className="h-5 w-16 rounded bg-white/10" />
              <div className="h-5 w-12 rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-5">
            <div className="h-3.5 w-14 rounded bg-white/10" />
            <div className="h-3.5 w-8 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </li>
  );
}

function ReferralIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12h16M12 22V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 7h20v5H2V7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function ExploreTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.18" />
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M14.8 9.2 10.6 10.6 9.2 14.8 13.4 13.4 14.8 9.2Z"
            fill="currentColor"
          />
        </>
      ) : (
        <>
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M14.8 9.2 10.6 10.6 9.2 14.8 13.4 13.4 14.8 9.2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

function SearchTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <circle cx="11" cy="11" r="7" fill="currentColor" opacity="0.2" />
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M20 20L16.5 16.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M20 20L16.5 16.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function FeedTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" fill="currentColor" />
          <path
            d="M8 10h8M8 14h5"
            stroke="#000000"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="4"
            y="5"
            width="16"
            height="14"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M8 10h8M8 14h5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function LeaderboardTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <rect x="4" y="13" width="4" height="7" rx="1.2" fill="currentColor" />
          <rect x="10" y="6" width="4" height="14" rx="1.2" fill="currentColor" />
          <rect x="16" y="10" width="4" height="10" rx="1.2" fill="currentColor" />
        </>
      ) : (
        <path
          d="M6 20V13M12 20V6M18 20V10"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function ProfileTabIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[28px] w-[28px]" aria-hidden>
      {active ? (
        <>
          <circle cx="12" cy="8" r="3.5" fill="currentColor" />
          <path
            d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8"
            fill="currentColor"
          />
        </>
      ) : (
        <>
          <circle
            cx="12"
            cy="8"
            r="3.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M5.5 19c1.5-3 3.8-4.5 6.5-4.5s5 1.5 6.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function TabIcon({ id, active }: { id: SectionId; active: boolean }) {
  switch (id) {
    case "explore":
      return <ExploreTabIcon active={active} />;
    case "search":
      return <SearchTabIcon active={active} />;
    case "feed":
      return <FeedTabIcon active={active} />;
    case "leaderboard":
      return <LeaderboardTabIcon active={active} />;
    case "profile":
      return <ProfileTabIcon active={active} />;
  }
}

export default function Api() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyTitleRef = useRef<HTMLElement>(null);
  const stickyNavRef = useRef<HTMLDivElement>(null);
  const stickyMarketFadeRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SectionId>("explore");
  const [liveMarkets, setLiveMarkets] = useState<PolymarketMarketData[]>([]);
  const [trendingMarkets, setTrendingMarkets] = useState<
    PolymarketMarketData[]
  >([]);
  const [trades, setTrades] = useState<PolymarketTradeWithPnl[]>([]);
  const [lists, setLists] = useState<PolymarketWatchList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [listDetailTab, setListDetailTab] = useState<ListDetailTab>("trades");
  const [marketDetailTab, setMarketDetailTab] =
    useState<MarketDetailTab>("trades");
  const [marketActivity, setMarketActivity] =
    useState<PolymarketMarketActivity | null>(null);
  const [leaderboardTab, setLeaderboardTab] =
    useState<LeaderboardTab>("all");
  const [profileTab, setProfileTab] = useState<ProfileTab>("positions");
  const [trendingView, setTrendingView] = useState<TrendingView>("masonry");
  const [walletProfileTab, setWalletProfileTab] =
    useState<ProfileTab>("positions");
  const [profileHistoryTrades, setProfileHistoryTrades] = useState<
    PolymarketWalletTrade[]
  >([]);
  const [profileHistoryStatus, setProfileHistoryStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [leaderboardWallets, setLeaderboardWallets] = useState<
    PolymarketLeaderboardWallet[]
  >([]);
  const [leaderboardLists, setLeaderboardLists] = useState<
    PolymarketWatchList[]
  >([]);
  const [listDetail, setListDetail] = useState<PolymarketWatchListDetail | null>(
    null,
  );
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string | null>(
    null,
  );
  const [selectedMarket, setSelectedMarket] =
    useState<PolymarketMarketData | null>(null);
  const [walletProfile, setWalletProfile] =
    useState<PolymarketWalletProfile | null>(null);
  const [marketsStatus, setMarketsStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [tradesStatus, setTradesStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [listsStatus, setListsStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [leaderboardStatus, setLeaderboardStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [listDetailStatus, setListDetailStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [walletStatus, setWalletStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [marketStatus, setMarketStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [marketActivityStatus, setMarketActivityStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [demoProfile, setDemoProfile] = useState<PolymarketDemoProfile | null>(
    null,
  );
  const [demoProfileStatus, setDemoProfileStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PolymarketMarketData[]>(
    [],
  );
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [feedPositionTrade, setFeedPositionTrade] =
    useState<PolymarketTradeWithPnl | null>(null);
  const [feedFriendsOnly, setFeedFriendsOnly] = useState(false);
  const [followedWallets, setFollowedWallets] = useState<Set<string>>(
    () => new Set(),
  );
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileSubScreen, setProfileSubScreen] =
    useState<ProfileSubScreen | null>(null);
  const [tradeFlowMarket, setTradeFlowMarket] =
    useState<PolymarketMarketData | null>(null);
  const [tradeFlowOutcome, setTradeFlowOutcome] = useState<string | null>(
    null,
  );
  const [cashOutItem, setCashOutItem] = useState<StoredUserTrade | null>(null);
  const [userTrades, setUserTrades] = useState<StoredUserTrade[]>([]);
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>([]);
  const [copyTradeTarget, setCopyTradeTarget] = useState<{
    wallet: string;
    displayName: string;
    handle: string;
  } | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [sharePosition, setSharePosition] =
    useState<SharePositionPayload | null>(null);
  const [followList, setFollowList] = useState<{
    kind: "following" | "followers";
    people: FollowListPerson[];
  } | null>(null);
  const [extraDepositUsd, setExtraDepositUsd] = useState(0);
  const skipUserTradesPersist = useRef(true);
  const skipCopyTradesPersist = useRef(true);
  const seededCopyWallets = useRef(new Set<string>());
  const copySimTick = useRef(0);
  const copySimMarketsRef = useRef({
    live: [] as PolymarketMarketData[],
    trending: [] as PolymarketMarketData[],
  });
  const copyTradesRef = useRef(copyTrades);
  const ownWalletRef = useRef(demoProfile?.wallet ?? "");

  useEffect(() => {
    const cached = readOnboardingCache();
    if (cached.username) setProfileUsername(cached.username);
    if (cached.follows.length > 0) {
      setFollowedWallets(new Set(cached.follows));
    }
    const deposits = Number(storageGet(DEPOSITS_KEY) ?? 0);
    if (Number.isFinite(deposits) && deposits > 0) {
      setExtraDepositUsd(deposits);
    }
    setUserTrades(loadUserTrades());
    setCopyTrades(loadCopyTrades());
  }, []);

  useEffect(() => {
    if (skipUserTradesPersist.current) {
      skipUserTradesPersist.current = false;
      return;
    }
    saveUserTrades(userTrades);
  }, [userTrades]);

  useEffect(() => {
    if (skipCopyTradesPersist.current) {
      skipCopyTradesPersist.current = false;
      return;
    }
    saveCopyTrades(copyTrades);
  }, [copyTrades]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setDemoProfileStatus("loading");
      try {
        const res = await fetch("/api/polymarketscan/profile?limit=8", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketDemoProfile;
        if (controller.signal.aborted) return;
        setDemoProfile(data);
        setDemoProfileStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load demo profile:", error);
        setDemoProfileStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (section !== "profile" || !demoProfile?.wallet) {
      setProfileHistoryTrades([]);
      setProfileHistoryStatus("idle");
      return;
    }

    const controller = new AbortController();
    const wallet = demoProfile.wallet;

    const load = async () => {
      setProfileHistoryStatus("loading");
      try {
        const res = await fetch(
          `/api/polymarketscan/wallet/${encodeURIComponent(wallet)}?limit=50`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketWalletProfile;
        if (controller.signal.aborted) return;
        setProfileHistoryTrades(data.recentTrades);
        setProfileHistoryStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load profile history:", error);
        setProfileHistoryStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, [section, demoProfile?.wallet]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearchStatus("loading");
        try {
          const res = await fetch(
            `/api/polymarketscan/search?q=${encodeURIComponent(q)}&limit=12`,
            { signal: controller.signal },
          );
          if (!res.ok) throw new Error("fetch failed");
          const data = (await res.json()) as {
            markets?: PolymarketMarketData[];
          };
          if (controller.signal.aborted) return;
          setSearchResults(Array.isArray(data.markets) ? data.markets : []);
          setSearchStatus("ready");
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error("Failed to search markets:", error);
          setSearchStatus("error");
        }
      })();
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setMarketsStatus("loading");
      try {
        const res = await fetch("/api/polymarketscan/markets", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as {
          live?: PolymarketMarketData[];
          trending?: PolymarketMarketData[];
        };
        if (controller.signal.aborted) return;
        const remoteLive = Array.isArray(data.live) ? data.live : [];
        setLiveMarkets([
          createDemoLiveMarket(),
          ...remoteLive.filter((market) => market.marketId !== DEMO_LIVE_MARKET_ID),
        ]);
        setTrendingMarkets(Array.isArray(data.trending) ? data.trending : []);
        setMarketsStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load markets feed:", error);
        setLiveMarkets([createDemoLiveMarket()]);
        setMarketsStatus("ready");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let quarter = 3;
    let clockSeconds = 8 * 60 + 42;
    let tick = 0;

    const id = window.setInterval(() => {
      tick += 1;
      clockSeconds -= 1;
      if (clockSeconds < 0) {
        if (quarter < 4) {
          quarter += 1;
          clockSeconds = 12 * 60;
        } else {
          clockSeconds = 0;
        }
      }

      let demoLiveNext: PolymarketMarketData | null = null;

      setLiveMarkets((prev) => {
        const index = prev.findIndex(
          (market) => market.marketId === DEMO_LIVE_MARKET_ID,
        );
        if (index < 0) return prev;

        const current = prev[index]!;
        const game = current.liveGame;
        if (!game) return prev;

        let awayScore = game.away.score ?? 78;
        let homeScore = game.home.score ?? 81;
        let yesPrice = current.yesPrice;
        let noPrice = current.noPrice;

        // Occasional scoring bursts so the board feels live.
        if (tick % 7 === 0) {
          if (Math.random() > 0.45) awayScore += Math.random() > 0.55 ? 3 : 2;
          else homeScore += Math.random() > 0.55 ? 3 : 2;

          const lead = awayScore - homeScore;
          yesPrice = Math.max(
            0.18,
            Math.min(0.82, 0.5 + lead * 0.012 + (Math.random() - 0.5) * 0.03),
          );
          noPrice = Math.max(0.08, Math.min(0.92, 1 - yesPrice));
        }

        const next: PolymarketMarketData = {
          ...current,
          yesPrice,
          noPrice,
          outcomes: [
            {
              label: "Lakers",
              price: yesPrice,
              marketId: DEMO_LIVE_MARKET_ID,
              slug: DEMO_LIVE_MARKET_ID,
            },
            {
              label: "Celtics",
              price: noPrice,
              marketId: DEMO_LIVE_MARKET_ID,
              slug: DEMO_LIVE_MARKET_ID,
            },
          ],
          liveGame: {
            ...game,
            status: "live",
            clock: formatDemoClock(quarter, clockSeconds),
            away: { ...game.away, score: awayScore },
            home: { ...game.home, score: homeScore },
          },
        };

        demoLiveNext = next;
        const copy = [...prev];
        copy[index] = next;
        return copy;
      });

      if (demoLiveNext) {
        setSelectedMarket((selected) =>
          selected?.marketId === DEMO_LIVE_MARKET_ID ? demoLiveNext! : selected,
        );
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setTradesStatus("loading");
      try {
        const res = await fetch("/api/polymarketscan/trades?limit=30&sports=1");
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { trades?: PolymarketTradeWithPnl[] };
        if (cancelled) return;
        setTrades(data.trades ?? []);
        setTradesStatus("ready");
      } catch {
        if (cancelled) return;
        setTradesStatus("error");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setListsStatus("loading");
      try {
        const res = await fetch("/api/polymarketscan/lists?limit=8", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { lists?: PolymarketWatchList[] };
        if (controller.signal.aborted) return;
        setLists(Array.isArray(data.lists) ? data.lists : []);
        setListsStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load watch lists:", error);
        setListsStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLeaderboardStatus("loading");
      try {
        const [walletsRes, listsRes] = await Promise.all([
          fetch("/api/polymarketscan/leaderboard?type=wallets&limit=15", {
            signal: controller.signal,
          }),
          fetch("/api/polymarketscan/leaderboard?type=lists&limit=15", {
            signal: controller.signal,
          }),
        ]);
        if (!walletsRes.ok || !listsRes.ok) throw new Error("fetch failed");
        const walletsData = (await walletsRes.json()) as {
          wallets?: PolymarketLeaderboardWallet[];
        };
        const listsData = (await listsRes.json()) as {
          lists?: PolymarketWatchList[];
        };
        if (controller.signal.aborted) return;
        setLeaderboardWallets(
          Array.isArray(walletsData.wallets) ? walletsData.wallets : [],
        );
        setLeaderboardLists(
          Array.isArray(listsData.lists) ? listsData.lists : [],
        );
        setLeaderboardStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load leaderboard:", error);
        setLeaderboardStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedListId) {
      setListDetail(null);
      setListDetailStatus("idle");
      setListDetailTab("trades");
      return;
    }

    setListDetailTab("trades");

    const controller = new AbortController();

    const load = async () => {
      setListDetailStatus("loading");
      try {
        const res = await fetch(
          `/api/polymarketscan/lists/${encodeURIComponent(selectedListId)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketWatchListDetail;
        if (controller.signal.aborted) return;
        setListDetail(data);
        setListDetailStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load watch list detail:", error);
        setListDetailStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, [selectedListId]);

  useEffect(() => {
    if (!selectedWallet) {
      setWalletProfile(null);
      setWalletStatus("idle");
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setWalletStatus("loading");
      try {
        const res = await fetch(
          `/api/polymarketscan/wallet/${encodeURIComponent(selectedWallet)}?limit=50`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketWalletProfile;
        if (controller.signal.aborted) return;
        setWalletProfile(data);
        setWalletStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load wallet profile:", error);
        setWalletStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, [selectedWallet]);

  useEffect(() => {
    if (!selectedMarketSlug) {
      if (!selectedMarket) setMarketStatus("idle");
      return;
    }

    const controller = new AbortController();
    const slug = selectedMarketSlug;
    const requestedTitle = selectedMarket?.title ?? null;
    const looksLikeSlug = Boolean(slug) && !/\s/.test(slug);

    const load = async () => {
      setMarketStatus((prev) => (prev === "ready" ? prev : "loading"));
      try {
        const params = new URLSearchParams();
        if (looksLikeSlug) params.set("slug", slug);
        if (requestedTitle) params.set("q", requestedTitle);
        const res = await fetch(`/api/polymarketscan/market?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketMarketData;
        if (controller.signal.aborted) return;
        if (!marketMatchesOpen(data, slug, requestedTitle)) return;
        setSelectedMarket((current) =>
          current
            ? {
                ...data,
                image: data.image || current.image,
                title: requestedTitle || data.title,
              }
            : data,
        );
        setMarketStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load market:", error);
        // Keep any optimistic market from the feed/list preview.
        setMarketStatus((prev) => (prev === "ready" ? "ready" : "error"));
      }
    };

    void load();
    return () => {
      controller.abort();
    };
    // Only re-fetch when the slug identity changes; marketId/title are read
    // from the current selection at request time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketSlug]);

  useEffect(() => {
    if (!selectedMarketSlug) {
      setMarketActivity(null);
      setMarketActivityStatus("idle");
      setMarketDetailTab("trades");
      return;
    }

    setMarketDetailTab("trades");
    const controller = new AbortController();
    const slug = selectedMarketSlug;
    const requestedTitle = selectedMarket?.title ?? null;
    const looksLikeSlug = Boolean(slug) && !/\s/.test(slug);

    const load = async () => {
      setMarketActivityStatus("loading");
      try {
        const params = new URLSearchParams();
        if (looksLikeSlug) params.set("slug", slug);
        if (requestedTitle) params.set("q", requestedTitle);
        const res = await fetch(
          `/api/polymarketscan/market/activity?${params}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketMarketActivity;
        if (controller.signal.aborted) return;
        setMarketActivity({
          trades: Array.isArray(data.trades) ? data.trades : [],
          traders: Array.isArray(data.traders) ? data.traders : [],
        });
        setMarketActivityStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load market activity:", error);
        setMarketActivityStatus("error");
      }
    };

    void load();
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketSlug]);

  const showingWalletProfile = selectedWallet !== null;
  const showingMarketDetail =
    selectedMarketSlug !== null && selectedWallet === null;
  const marketAccent = useImageAccent(
    showingMarketDetail ? (selectedMarket?.image ?? null) : null,
  );
  const sportsMarketView = Boolean(
    selectedMarket
      ? isSportsMarket(selectedMarket)
      : selectedMarketSlug &&
          [...liveMarkets, ...trendingMarkets].some(
            (market) =>
              market.slug === selectedMarketSlug && isSportsMarket(market),
          ),
  );
  const marketClip = selectedMarket
    ? sportClipForMarket(selectedMarket)
    : null;
  const showingListDetail =
    (section === "explore" ||
      section === "search" ||
      section === "leaderboard") &&
    selectedListId !== null &&
    selectedWallet === null &&
    selectedMarketSlug === null;
  const showingDrillDown =
    showingListDetail || showingWalletProfile || showingMarketDetail;
  const showingProfileSubScreen = profileSubScreen !== null;
  const showingOwnProfile =
    section === "profile" && !showingDrillDown && !showingProfileSubScreen;
  const isOwnSelectedWallet = Boolean(
    selectedWallet &&
      demoProfile?.wallet &&
      selectedWallet.toLowerCase() === demoProfile.wallet.toLowerCase(),
  );

  const isFollowing = (wallet: string | null | undefined) =>
    Boolean(wallet && followedWallets.has(wallet.toLowerCase()));

  const toggleFollow = (wallet: string) => {
    const key = wallet.toLowerCase();
    setFollowedWallets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persistFollows(next);
      return next;
    });
  };

  const getCopyTrade = (wallet: string | null | undefined) => {
    if (!wallet) return null;
    const key = wallet.toLowerCase();
    return (
      copyTrades.find((trade) => trade.wallet.toLowerCase() === key) ?? null
    );
  };

  const copyButtonState = (
    wallet: string | null | undefined,
  ): "idle" | "copying" | "paused" => {
    const trade = getCopyTrade(wallet);
    if (!trade) return "idle";
    return trade.status === "paused" ? "paused" : "copying";
  };

  const openCopyTrade = (wallet: string, displayName: string | null) => {
    setCopyTradeTarget({
      wallet,
      displayName: displayName ?? walletLabel ?? shortWallet(wallet),
      handle: resolveFeedHandle(wallet),
    });
  };

  const seedCopiedTrades = async (rule: CopyTrade) => {
    const ownWallet = demoProfile?.wallet;
    if (!ownWallet) return;

    let profile =
      walletProfile &&
      walletProfile.wallet.toLowerCase() === rule.wallet.toLowerCase()
        ? walletProfile
        : null;
    if (!profile) {
      try {
        const res = await fetch(
          `/api/polymarketscan/wallet/${encodeURIComponent(rule.wallet)}?limit=50`,
        );
        if (res.ok) {
          profile = (await res.json()) as PolymarketWalletProfile;
        }
      } catch {
        profile = null;
      }
    }

    const sources = [
      ...(profile ? sourcesFromWalletProfile(profile) : []),
      ...sourcesFromFeedTrades(trades, rule),
    ];
    if (sources.length === 0) return;

    setUserTrades((prev) =>
      applyCopyFills({
        existing: prev,
        rule,
        ownWallet,
        sources,
      }),
    );
  };

  const saveCopyTrade = (trade: CopyTrade) => {
    const key = trade.wallet.toLowerCase();
    const isNew = !copyTrades.some((item) => item.wallet.toLowerCase() === key);
    setCopyTrades((prev) => {
      const index = prev.findIndex((item) => item.wallet.toLowerCase() === key);
      if (index === -1) return [trade, ...prev];
      const next = [...prev];
      next[index] = trade;
      return next;
    });
    if (isNew) {
      void seedCopiedTrades(trade);
      if (!isFollowing(trade.wallet)) toggleFollow(trade.wallet);
    }
  };

  const stopCopyTrade = (wallet: string) => {
    const key = wallet.toLowerCase();
    setCopyTrades((prev) =>
      prev.filter((item) => item.wallet.toLowerCase() !== key),
    );
  };

  const viewCopyTradesOnProfile = () => {
    setCopyTradeTarget(null);
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(null);
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setFeedPositionTrade(null);
    setTradeFlowMarket(null);
    setTradeFlowOutcome(null);
    setProfileSubScreen(null);
    setProfileTab("copying");
    setSection("profile");
  };

  const completeOnboarding = (username: string | null) => {
    markOnboardingDone(username);
    persistFollows(followedWallets);
    setOnboardingOpen(false);
    if (username) setProfileUsername(username);
  };

  const handleSectionChange = (next: SectionId) => {
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(null);
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setFeedPositionTrade(null);
    setProfileSubScreen(null);
    setCopyTradeTarget(null);
    setSection(next);
  };

  const backFromProfileSubScreen = () => {
    setProfileSubScreen(null);
  };

  const updateProfileUsername = (username: string) => {
    setProfileUsername(username);
    persistUsername(username);
  };

  const resetOnboarding = () => {
    clearOnboardingCache();
    storageRemove(COPY_TRADES_KEY);
    setProfileUsername(null);
    setFollowedWallets(new Set());
    setUserTrades([]);
    setCopyTrades([]);
    seededCopyWallets.current.clear();
    setProfileSubScreen(null);
    setOnboardingOpen(true);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    const id = window.requestAnimationFrame(() => {
      el.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(id);
  }, [
    section,
    selectedMarketSlug,
    selectedWallet,
    selectedListId,
    profileSubScreen,
  ]);

  const stickyTitle = showingMarketDetail
    ? sportsMarketView
      ? null
      : (selectedMarket?.title ?? null)
    : showingWalletProfile
      ? (walletLabel ?? shortWallet(selectedWallet ?? ""))
      : showingOwnProfile
        ? (profileUsername ??
          demoProfile?.displayName ??
          (demoProfile?.wallet ? shortWallet(demoProfile.wallet) : null))
        : section === "explore" && !showingDrillDown
          ? demoProfileStatus === "loading"
            ? "—"
            : formatUsd(
                (demoProfile?.portfolioValue ?? PROFILE_BALANCE) +
                  extraDepositUsd +
                  userTrades.reduce((sum, item) => {
                    if (!item.copiedFrom || item.cashedOut) return sum;
                    if (item.trade.side.toUpperCase() === "SELL") return sum;
                    return sum + item.position.pnlUsd;
                  }, 0),
              )
          : section === "feed" && !showingDrillDown
            ? "Feed"
          : section === "leaderboard" && !showingDrillDown
            ? "Leaderboard"
            : null;

  useEffect(() => {
    const nav = stickyNavRef.current;
    const marketFade = stickyMarketFadeRef.current;
    if (nav) nav.style.opacity = "0";
    if (marketFade) marketFade.style.opacity = "0";
    if (!stickyTitle && !marketFade) return;
    const scroller = scrollRef.current;
    if (!scroller) return;

    let frame = 0;
    let restTitleBottom = 0;
    const update = () => {
      const fade = stickyMarketFadeRef.current;
      if (fade) {
        fade.style.opacity =
          scroller.scrollTop <= 0
            ? "0"
            : String(Math.max(0, Math.min(1, scroller.scrollTop / 40)));
      }

      const header = stickyNavRef.current;
      const title = stickyTitleRef.current;
      if (!header) return;
      if (!title || scroller.scrollTop <= 0) {
        if (title) {
          const scrollerTop = scroller.getBoundingClientRect().top;
          restTitleBottom =
            title.getBoundingClientRect().bottom - scrollerTop;
        }
        header.style.opacity = "0";
        return;
      }

      const scrollerTop = scroller.getBoundingClientRect().top;
      const titleBottom = title.getBoundingClientRect().bottom - scrollerTop;
      const fadeStart = Math.max(restTitleBottom, 48);
      const fadeEnd = 18;
      const progress = Math.max(
        0,
        Math.min(1, (fadeStart - titleBottom) / Math.max(1, fadeStart - fadeEnd)),
      );
      header.style.opacity = String(progress);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      if (nav) nav.style.opacity = "0";
      if (marketFade) marketFade.style.opacity = "0";
    };
  }, [
    stickyTitle,
    showingMarketDetail,
    showingWalletProfile,
    showingOwnProfile,
    section,
  ]);

  const openMarket = (market: PolymarketMarketData) => {
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedMarket(market);
    setSelectedMarketSlug(market.slug || market.marketId);
    setMarketStatus("ready");
  };

  const openMarketBySlug = (
    slug: string,
    title?: string,
    preview?: { image?: string | null; price?: number; outcome?: string },
  ) => {
    if (!slug && !title) return;
    const local = findLocalMarket(
      [...liveMarkets, ...trendingMarkets, ...searchResults],
      slug,
      title,
    );
    if (local) {
      openMarket(
        preview?.image && !local.image
          ? { ...local, image: preview.image }
          : local,
      );
      return;
    }
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedMarket(
      title ? optimisticMarketFromOpen(slug, title, preview) : null,
    );
    setSelectedMarketSlug(slug || title || null);
    setMarketStatus(title ? "ready" : "loading");
  };

  const openList = (id: string) => {
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(id);
  };

  const openWallet = (wallet: string, displayName: string | null) => {
    setSelectedWallet(wallet);
    setWalletLabel(displayName ?? shortWallet(wallet));
    setWalletProfileTab("positions");
  };

  const backFromWallet = () => {
    setSelectedWallet(null);
    setWalletLabel(null);
  };

  const backFromList = () => {
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(null);
  };

  const backFromMarket = () => {
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setMarketStatus("idle");
    setTradeFlowMarket(null);
    setTradeFlowOutcome(null);
    setCashOutItem(null);
  };

  const shareMarket = async () => {
    if (!selectedMarket) return;
    const text = selectedMarket.title;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // User cancelled the share sheet, or clipboard is unavailable.
    }
  };

  const openTradeFlow = (
    market: PolymarketMarketData,
    outcome: string | null = null,
  ) => {
    setTradeFlowMarket(market);
    setTradeFlowOutcome(outcome);
  };

  const closeTradeFlow = () => {
    setTradeFlowMarket(null);
    setTradeFlowOutcome(null);
  };

  const handleTradeComplete = (
    trade: UserPlacedTrade,
    position: StoredUserTrade["position"],
  ) => {
    setUserTrades((prev) => [{ trade, position }, ...prev]);
  };

  const handleDepositComplete = (amountUsd: number) => {
    setExtraDepositUsd((prev) => {
      const next = prev + amountUsd;
      storageSet(DEPOSITS_KEY, String(next));
      return next;
    });
  };

  const resolveFeedHandle = (wallet: string) => {
    const ownWallet = demoProfile?.wallet?.toLowerCase();
    if (ownWallet && wallet.toLowerCase() === ownWallet && profileUsername) {
      return profileUsername;
    }
    return feedHandle(wallet);
  };

  const commentAuthor = useMemo(() => {
    if (!demoProfile?.wallet) return null;
    return {
      wallet: demoProfile.wallet,
      handle: profileUsername ?? feedHandle(demoProfile.wallet),
    };
  }, [demoProfile?.wallet, profileUsername]);

  const ownShareHandle =
    profileUsername ??
    (demoProfile?.wallet ? feedHandle(demoProfile.wallet) : "you");
  const referralCode = useMemo(() => {
    if (profileUsername) return profileUsername.toLowerCase();
    if (demoProfile?.wallet) return demoProfile.wallet.slice(2, 10).toLowerCase();
    return "invite";
  }, [demoProfile?.wallet, profileUsername]);

  const walletBackLabel = selectedListId
    ? (listDetail?.name ?? "List")
    : selectedMarketSlug
      ? "Market"
      : section === "leaderboard"
        ? "Leaderboard"
        : "Back";
  const listBackLabel =
    section === "leaderboard"
      ? "Leaderboard"
      : section === "search"
        ? "Search"
        : "Lists";
  const marketBackLabel = selectedListId
    ? (listDetail?.name ?? "List")
    : section === "feed"
      ? "Feed"
      : section === "leaderboard"
        ? "Leaderboard"
        : "Explore";

  const drillBack = showingWalletProfile
    ? { onClick: backFromWallet, label: `Back to ${walletBackLabel}` }
    : showingListDetail
      ? { onClick: backFromList, label: `Back to ${listBackLabel}` }
      : showingMarketDetail
        ? { onClick: backFromMarket, label: `Back to ${marketBackLabel}` }
        : showingProfileSubScreen
          ? { onClick: backFromProfileSubScreen, label: "Back to profile" }
          : null;

  const copiedOpenPnl = useMemo(
    () =>
      userTrades.reduce((sum, item) => {
        if (!item.copiedFrom || item.cashedOut) return sum;
        if (item.trade.side.toUpperCase() === "SELL") return sum;
        return sum + item.position.pnlUsd;
      }, 0),
    [userTrades],
  );

  const profileBalance =
    (demoProfile?.portfolioValue ?? PROFILE_BALANCE) +
    extraDepositUsd +
    copiedOpenPnl;
  const portfolioHistory = useMemo(() => {
    const baseBalance = demoProfile?.portfolioValue ?? PROFILE_BALANCE;
    const base =
      demoProfile?.history && demoProfile.history.length >= 2
        ? demoProfile.history
        : seedPortfolioHistory(baseBalance);
    const endValue = baseBalance + extraDepositUsd + copiedOpenPnl;
    if (extraDepositUsd <= 0 && Math.abs(copiedOpenPnl) < 0.01) return base;
    return [
      ...base,
      {
        time: Math.floor(Date.now() / 1000),
        value: endValue,
      },
    ];
  }, [copiedOpenPnl, demoProfile, extraDepositUsd]);

  const walletBalance =
    walletProfile?.portfolioValue ??
    walletProfile?.positions?.reduce((sum, p) => sum + p.valueUsd, 0) ??
    0;
  const walletHistory = useMemo(() => {
    if (walletProfile?.history && walletProfile.history.length >= 2) {
      return walletProfile.history;
    }
    if (walletBalance > 0) return seedPortfolioHistory(walletBalance);
    return [];
  }, [walletProfile, walletBalance]);

  const listHistory = useMemo(() => {
    if (!listDetail) return [];
    let salt = 0;
    for (let i = 0; i < listDetail.id.length; i += 1) {
      salt = (salt * 31 + listDetail.id.charCodeAt(i)) | 0;
    }
    return seedPnlHistory(listDetail.aggregatedPnl, (salt % 1000) / 80);
  }, [listDetail]);

  const marketImageBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const market of [...liveMarkets, ...trendingMarkets]) {
      if (market.slug && market.image && !map.has(market.slug)) {
        map.set(market.slug, market.image);
      }
    }
    for (const trade of trades) {
      if (trade.marketSlug && trade.marketImage && !map.has(trade.marketSlug)) {
        map.set(trade.marketSlug, trade.marketImage);
      }
    }
    return map;
  }, [liveMarkets, trendingMarkets, trades]);

  const onboardingImages = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const keyOf = (src: string) => {
      try {
        if (src.startsWith("/")) return src;
        const url = new URL(src);
        return `${url.hostname}${url.pathname}`;
      } catch {
        return src;
      }
    };
    const add = (src: string | null | undefined) => {
      if (!src) return;
      const normalized = src.startsWith("//") ? `https:${src}` : src;
      const key = keyOf(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      urls.push(normalized);
    };
    add("/playground/api/lakers-celtics.jpg");
    for (const market of [...liveMarkets, ...trendingMarkets]) {
      add(market.image);
      for (const team of market.teams ?? []) add(team.logo);
      for (const outcome of market.outcomes ?? []) add(outcome.logo);
    }
    for (const trade of trades) {
      add(trade.marketImage);
    }
    return urls;
  }, [liveMarkets, trendingMarkets, trades]);

  const marketBySlug = useMemo(() => {
    const map = new Map<string, PolymarketMarketData>();
    for (const market of [...liveMarkets, ...trendingMarkets]) {
      if (market.slug && !map.has(market.slug)) {
        map.set(market.slug, market);
      }
    }
    return map;
  }, [liveMarkets, trendingMarkets]);

  useEffect(() => {
    const ownWallet = demoProfile?.wallet;
    if (!ownWallet || copyTrades.length === 0) return;

    for (const rule of copyTrades) {
      const key = rule.wallet.toLowerCase();
      if (seededCopyWallets.current.has(key)) continue;
      if (copiedTradesForWallet(userTrades, rule.wallet).length > 0) {
        seededCopyWallets.current.add(key);
        continue;
      }
      seededCopyWallets.current.add(key);
      void seedCopiedTrades(rule);
    }
  }, [copyTrades, demoProfile?.wallet, userTrades]);

  useEffect(() => {
    const ownWallet = demoProfile?.wallet;
    if (!ownWallet) return;
    const active = copyTrades.filter((rule) => rule.status === "active");
    if (active.length === 0 || trades.length === 0) return;

    setUserTrades((prev) => {
      let next = prev;
      for (const rule of active) {
        const sources = sourcesFromFeedTrades(trades, rule);
        if (sources.length === 0) continue;
        next = applyCopyFills({
          existing: next,
          rule,
          ownWallet,
          sources,
        });
      }
      return next;
    });
  }, [copyTrades, demoProfile?.wallet, trades]);

  useEffect(() => {
    if (marketBySlug.size === 0) return;
    setUserTrades((prev) => markCopiedToMarket(prev, marketBySlug));
  }, [marketBySlug]);

  copySimMarketsRef.current = {
    live: liveMarkets,
    trending: trendingMarkets,
  };
  copyTradesRef.current = copyTrades;
  ownWalletRef.current = demoProfile?.wallet ?? "";

  const hasActiveCopy = copyTrades.some((rule) => rule.status === "active");

  useEffect(() => {
    if (!hasActiveCopy) return;

    const id = window.setInterval(() => {
      copySimTick.current += 1;
      const tick = copySimTick.current;
      const now = Date.now();
      const { live, trending } = copySimMarketsRef.current;
      const pool = [...live, ...trending];
      const active = copyTradesRef.current.filter(
        (rule) => rule.status === "active",
      );
      if (active.length === 0) return;
      const ownWallet = ownWalletRef.current || "0xcopy-sim";

      setUserTrades((prev) => {
        let next = tickCopiedMarks(
          prev,
          active.map((rule) => rule.wallet),
          now,
        );
        if (tick % 6 === 0 && pool.length > 0) {
          const rule = active[tick % active.length]!;
          const source = simulateCopySource(rule, pool, next, now);
          if (source) {
            next = applyCopyFills({
              existing: next,
              rule,
              ownWallet,
              sources: [source],
            });
          }
        }
        return next;
      });
    }, 1400);

    return () => window.clearInterval(id);
  }, [hasActiveCopy]);

  const friendLeaderboard = useMemo(() => {
    const known = new Map(
      leaderboardWallets.map((wallet) => [
        wallet.wallet.toLowerCase(),
        wallet,
      ]),
    );
    return [...followedWallets]
      .map((addr) => known.get(addr))
      .filter((wallet): wallet is PolymarketLeaderboardWallet => Boolean(wallet))
      .sort((a, b) => b.totalPnl - a.totalPnl);
  }, [followedWallets, leaderboardWallets]);

  const userFeedTrades = useMemo(
    () =>
      userTrades
        .map((item) => item.trade)
        .filter(
          (trade) =>
            Boolean(trade.userCaption?.trim()) || Boolean(trade.userGifUrl),
        ),
    [userTrades],
  );

  const feedTrades = useMemo(() => {
    const ownWallet = demoProfile?.wallet?.toLowerCase();
    const apiTrades = trades.filter(
      (trade) => !ownWallet || trade.wallet.toLowerCase() !== ownWallet,
    );
    return [...userFeedTrades, ...apiTrades];
  }, [demoProfile?.wallet, trades, userFeedTrades]);

  const visibleFeedTrades = useMemo(() => {
    if (!feedFriendsOnly) return feedTrades;
    const ownWallet = demoProfile?.wallet?.toLowerCase();
    return feedTrades.filter((trade) => {
      const wallet = trade.wallet.toLowerCase();
      if (ownWallet && wallet === ownWallet) return true;
      return followedWallets.has(wallet);
    });
  }, [feedFriendsOnly, feedTrades, demoProfile?.wallet, followedWallets]);

  const profilePositions = useMemo(() => {
    const userPositions = userTrades
      .filter((item) => !item.cashedOut)
      .map((item) => item.position);
    if (!demoProfile) return userPositions;
    const seen = new Set(
      userPositions.map(
        (position) =>
          `${position.marketSlug ?? position.marketTitle}-${position.outcome}`,
      ),
    );
    const merged = [...userPositions];
    for (const position of demoProfile.positions) {
      const key = `${position.marketSlug ?? position.marketTitle}-${position.outcome}`;
      if (!seen.has(key)) merged.push(position);
    }
    return merged;
  }, [demoProfile, userTrades]);

  const profileMarketImages = useMemo(() => {
    const map = new Map(marketImageBySlug);
    for (const position of profilePositions) {
      if (position.marketSlug && position.image && !map.has(position.marketSlug)) {
        map.set(position.marketSlug, position.image);
      }
    }
    for (const item of userTrades) {
      const slug = item.trade.marketSlug;
      const image = item.position.image;
      if (slug && image && !map.has(slug)) {
        map.set(slug, image);
      }
    }
    return map;
  }, [marketImageBySlug, profilePositions, userTrades]);

  const profilePositionCount = profilePositions.length;

  const marketUserPosition = useMemo(() => {
    if (!selectedMarket) return null;
    const slug = (selectedMarket.slug || selectedMarket.marketId).toLowerCase();
    const title = selectedMarket.title.trim().toLowerCase();
    return (
      userTrades.find((item) => {
        if (item.cashedOut) return false;
        const itemSlug = (item.trade.marketSlug ?? "").toLowerCase();
        const itemTitle = item.trade.marketTitle.trim().toLowerCase();
        return (
          (itemSlug && (itemSlug === slug || itemSlug === selectedMarket.marketId.toLowerCase())) ||
          itemTitle === title
        );
      }) ?? null
    );
  }, [selectedMarket, userTrades]);

  const marketFeedTrades = useMemo(() => {
    if (!selectedMarket) return [];
    const slug = (selectedMarket.slug || selectedMarket.marketId).toLowerCase();
    const title = selectedMarket.title.trim().toLowerCase();
    const ownWallet = demoProfile?.wallet?.toLowerCase();
    const userOnes = userTrades
      .map((item) => item.trade)
      .filter((trade) => {
        const itemSlug = (trade.marketSlug ?? "").toLowerCase();
        const itemTitle = trade.marketTitle.trim().toLowerCase();
        return (
          (itemSlug &&
            (itemSlug === slug ||
              itemSlug === selectedMarket.marketId.toLowerCase())) ||
          itemTitle === title
        );
      });
    const seen = new Set(
      userOnes.map(
        (trade) =>
          trade.txHash ?? `${trade.wallet}-${trade.timestamp}-${trade.outcome}`,
      ),
    );
    const apiOnes = (marketActivity?.trades ?? [])
      .map((trade) => marketTradeAsFeedTrade(trade, selectedMarket))
      .filter((trade) => {
        const key =
          trade.txHash ?? `${trade.wallet}-${trade.timestamp}-${trade.outcome}`;
        if (seen.has(key)) return false;
        if (ownWallet && trade.wallet.toLowerCase() === ownWallet) return false;
        return true;
      });
    return [...userOnes, ...apiOnes];
  }, [demoProfile?.wallet, marketActivity, selectedMarket, userTrades]);

  const cashOutMarketPosition = (
    item: StoredUserTrade,
    result: { price: number; amountUsd: number; pnlUsd: number },
  ) => {
    const key =
      item.trade.txHash ?? `${item.trade.timestamp}-${item.trade.outcome}`;
    const sell: StoredUserTrade = {
      trade: {
        ...item.trade,
        side: "SELL",
        price: result.price,
        amountUsd: result.amountUsd,
        timestamp: new Date().toISOString(),
        txHash: `local-cashout-${Date.now()}`,
        userCaption: null,
        userGifUrl: null,
      },
      position: {
        ...item.position,
        markPrice: result.price,
        valueUsd: result.amountUsd,
        pnlUsd: result.pnlUsd,
        shares: 0,
      },
      cashedOut: true,
      copiedFrom: item.copiedFrom,
    };
    setUserTrades((prev) => [
      sell,
      ...prev.map((row) => {
        const rowKey =
          row.trade.txHash ?? `${row.trade.timestamp}-${row.trade.outcome}`;
        return rowKey === key ? { ...row, cashedOut: true } : row;
      }),
    ]);
  };

  const userHistoryTrades = useMemo(
    (): PolymarketWalletTrade[] =>
      userTrades.map(({ trade }) => ({
        side: trade.side,
        outcome: trade.outcome,
        price: trade.price,
        size: trade.price > 0 ? trade.amountUsd / trade.price : 0,
        marketTitle: trade.marketTitle,
        marketSlug: trade.marketSlug,
        timestamp: trade.timestamp,
        txHash: trade.txHash,
      })),
    [userTrades],
  );

  const mergedProfileHistory = useMemo(() => {
    const seen = new Set<string>();
    const merged: PolymarketWalletTrade[] = [];
    for (const trade of [...userHistoryTrades, ...profileHistoryTrades]) {
      const key =
        trade.txHash ??
        `${trade.timestamp}-${trade.side}-${trade.outcome}-${trade.price}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(trade);
    }
    return merged;
  }, [profileHistoryTrades, userHistoryTrades]);

  const walletPositions = walletProfile?.positions ?? [];
  const walletHistoryTrades = walletProfile?.recentTrades ?? [];
  const walletMarketImages = useMemo(() => {
    const map = new Map(marketImageBySlug);
    for (const position of walletPositions) {
      if (position.marketSlug && position.image && !map.has(position.marketSlug)) {
        map.set(position.marketSlug, position.image);
      }
    }
    return map;
  }, [marketImageBySlug, walletPositions]);

  const ownProfileCounts = seedProfileCounts(
    demoProfile?.wallet ?? profileUsername ?? "profile",
  );
  const walletProfileCounts = selectedWallet
    ? seedProfileCounts(selectedWallet)
    : { following: 0, followers: 0 };

  const followPeopleFromAddresses = (
    addresses: Iterable<string>,
  ): FollowListPerson[] => {
    const known = new Map(
      leaderboardWallets.map((wallet) => [
        wallet.wallet.toLowerCase(),
        wallet,
      ]),
    );
    return [...addresses].map((address) => {
      const match = known.get(address.toLowerCase());
      return {
        wallet: match?.wallet ?? address,
        displayName: match?.displayName ?? null,
        totalPnl: match?.totalPnl ?? null,
      };
    });
  };

  const openFollowList = (
    kind: "following" | "followers",
    people: FollowListPerson[],
  ) => {
    setFollowList({ kind, people });
  };

  const openOwnFollowList = (kind: "following" | "followers") => {
    if (kind === "following") {
      openFollowList("following", followPeopleFromAddresses(followedWallets));
      return;
    }
    openFollowList(
      "followers",
      pickSeededPeople(
        `${demoProfile?.wallet ?? profileUsername ?? "profile"}:followers`,
        ownProfileCounts.followers,
        leaderboardWallets,
        [demoProfile?.wallet ?? ""],
      ),
    );
  };

  const openWalletFollowList = (kind: "following" | "followers") => {
    if (!selectedWallet) return;
    const people = pickSeededPeople(
      `${selectedWallet}:${kind}`,
      kind === "following"
        ? walletProfileCounts.following
        : walletProfileCounts.followers,
      leaderboardWallets,
      [selectedWallet, demoProfile?.wallet ?? ""],
    );
    if (
      kind === "followers" &&
      isFollowing(selectedWallet) &&
      demoProfile?.wallet
    ) {
      people.unshift({
        wallet: demoProfile.wallet,
        displayName: profileUsername,
        totalPnl: demoProfile.totalPnl,
      });
    }
    openFollowList(kind, people);
  };

  const exploreHeader = (
    <header className="mb-4 flex items-start justify-between gap-3">
      <button
        type="button"
        onClick={() => handleSectionChange("profile")}
        className="min-w-0 text-left"
        aria-label="Open profile"
      >
        <p
          ref={stickyTitleRef as React.RefObject<HTMLParagraphElement>}
          className={`text-[42px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSansCondensed.className}`}
        >
          {demoProfileStatus === "loading" ? (
            "—"
          ) : (
            <BalanceFlow
              value={profileBalance}
              fractionClassName="text-white/40"
            />
          )}
        </p>
        {demoProfileStatus === "ready" &&
          demoProfile &&
          demoProfile.totalPnl !== null && (
            <p
              className={`mt-1.5 inline-flex items-baseline gap-1 text-[13px] font-semibold tabular-nums ${
                demoProfile.totalPnl > 0
                  ? "text-[#00D54B]"
                  : demoProfile.totalPnl < 0
                    ? "text-[#FF375F]"
                    : "text-white/45"
              }`}
            >
              <SignedUsdFlow value={demoProfile.totalPnl} />
              {demoProfile.roiPercent !== null ? (
                <span className="inline-flex items-baseline">
                  (
                  <SignedPercentFlow value={demoProfile.roiPercent} />)
                </span>
              ) : null}
            </p>
          )}
      </button>
      <button
        type="button"
        onClick={() => setDepositOpen(true)}
        className="mt-1 shrink-0 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black transition-opacity hover:opacity-90"
      >
        Deposit
      </button>
    </header>
  );

  return (
    <div className="relative flex h-full w-full items-center justify-center px-4">
      <article
        className="relative flex h-[700px] w-full max-w-[360px] flex-col overflow-hidden rounded-[32px] bg-black text-white transition-[background-color] duration-100 motion-safe:[&_button]:origin-center motion-safe:[&_button]:transition-[transform,color,background-color,border-color,opacity] motion-safe:[&_button]:duration-150 motion-safe:[&_button]:ease-out motion-safe:[&_button:active]:scale-[0.96]"
        style={
          showingMarketDetail ? { backgroundColor: marketAccent } : undefined
        }
        aria-label="Polymarket API data"
        aria-busy={
          (section === "explore" &&
            !showingDrillDown &&
            (marketsStatus === "loading" || listsStatus === "loading")) ||
          (section === "feed" && tradesStatus === "loading") ||
          (showingListDetail && listDetailStatus === "loading") ||
          (showingWalletProfile && walletStatus === "loading") ||
          (showingMarketDetail && marketStatus === "loading") ||
          (section === "profile" &&
            !showingDrillDown &&
            demoProfileStatus === "loading") ||
          (section === "leaderboard" &&
            !showingDrillDown &&
            leaderboardStatus === "loading")
        }
      >
        {!showingMarketDetail && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[48%]"
            style={{
              background:
                "radial-gradient(ellipse 110% 90% at 50% -8%, rgba(58, 86, 104, 0.58) 0%, rgba(34, 53, 68, 0.28) 38%, transparent 72%)",
            }}
          />
        )}
        <div
          ref={scrollRef}
          className={`relative z-[1] h-full min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 [scrollbar-gutter:stable] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            showingMarketDetail && !showingWalletProfile
              ? "pb-24"
              : showingDrillDown || showingProfileSubScreen
                ? "pb-5"
                : "pb-24"
          }`}
        >
          {showingWalletProfile ? (
            <header className="mb-4 pt-9">
              <ProfileIdentityHeader
                seed={selectedWallet ?? "wallet"}
                name={walletLabel ?? shortWallet(selectedWallet ?? "")}
                wallet={selectedWallet ?? ""}
                nameRef={stickyTitleRef}
                trailing={
                  selectedWallet ? (
                    <FollowButton
                      following={isFollowing(selectedWallet)}
                      onClick={() => toggleFollow(selectedWallet)}
                    />
                  ) : null
                }
              />
              <ProfileCountRow
                following={walletProfileCounts.following}
                followers={
                  walletProfileCounts.followers +
                  (isFollowing(selectedWallet) ? 1 : 0)
                }
                winRate={walletProfile?.winRate ?? null}
                onFollowingClick={() => openWalletFollowList("following")}
                onFollowersClick={() => openWalletFollowList("followers")}
              />
              <ProfileBalanceChart
                balance={walletBalance}
                loading={walletStatus === "loading"}
                totalPnl={walletProfile?.totalPnl ?? null}
                roiPercent={walletProfile?.roiPercent ?? null}
                history={walletHistory}
              />
              {selectedWallet && !isOwnSelectedWallet && (
                <button
                  type="button"
                  onClick={() => openCopyTrade(selectedWallet, walletLabel)}
                  className={`mt-4 flex w-full items-center justify-center gap-1.5 ${ui.pillSecondary}`}
                >
                  {copyButtonState(selectedWallet) === "copying" ? (
                    <>
                      <svg
                        viewBox="0 0 12 12"
                        className="h-3.5 w-3.5"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M2.5 6.2 4.8 8.5 9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Copying
                    </>
                  ) : copyButtonState(selectedWallet) === "paused" ? (
                    "Copying paused"
                  ) : (
                    "Copy"
                  )}
                </button>
              )}
            </header>
          ) : showingListDetail ? (
            <header className="mb-4 pt-9">
              <h2 className={ui.title}>
                {listDetail?.name ?? "Watch list"}
              </h2>
              <ListPnlChart
                pnl={listDetail?.aggregatedPnl ?? null}
                loading={listDetailStatus === "loading"}
                history={listHistory}
              />
            </header>
          ) : showingMarketDetail ? (
            sportsMarketView ? (
              <header
                key={`market-header-${selectedMarketSlug}`}
                className={`relative -mx-5 -mt-5 mb-3 overflow-hidden ${MARKET_ENTER}`}
              >
                {marketClip || selectedMarket?.image ? (
                  <div className="relative h-[168px] overflow-hidden">
                    {marketClip ? (
                      <MarketClip clip={marketClip} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedMarket?.image ?? ""}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    )}
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `linear-gradient(to bottom, ${hexToRgba(marketAccent, 0.2)} 0%, ${hexToRgba(marketAccent, 0.08)} 40%, ${marketAccent} 100%)`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="pt-12" />
                )}
                <h2 className="sr-only">
                  {selectedMarket?.title ?? "Market"}
                </h2>
              </header>
            ) : (
            <header
              key={`market-header-${selectedMarketSlug}`}
              className={`relative -mx-5 -mt-5 mb-4 overflow-hidden ${MARKET_ENTER}`}
            >
              <div
                className={`relative ${
                  selectedMarket?.image ? "min-h-[240px]" : "pt-14"
                }`}
              >
                {selectedMarket?.image && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMarket.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `linear-gradient(to bottom, ${hexToRgba(marketAccent, 0.15)} 0%, ${hexToRgba(marketAccent, 0.45)} 35%, ${hexToRgba(marketAccent, 0.82)} 70%, ${marketAccent} 100%)`,
                      }}
                    />
                  </>
                )}
                <div
                  className={`relative z-10 px-5 ${
                    selectedMarket?.image
                      ? "flex min-h-[240px] flex-col pb-1 pt-14"
                      : ""
                  }`}
                >
                  <div className={selectedMarket?.image ? "mt-auto" : undefined}>
                    {(selectedMarket?.liveGame?.league ??
                      selectedMarket?.category) && (
                      <p className="text-[12px] font-medium text-white/55">
                        {selectedMarket.liveGame?.league ??
                          selectedMarket.category}
                      </p>
                    )}
                    <h2
                      ref={stickyTitleRef as RefObject<HTMLHeadingElement>}
                      className={`text-[22px] font-semibold leading-tight tracking-[-0.03em] ${
                        selectedMarket?.liveGame?.league ||
                        selectedMarket?.category
                          ? "mt-1"
                          : ""
                      }`}
                    >
                      {selectedMarket?.title ?? "Market"}
                    </h2>
                  </div>
                </div>
              </div>
            </header>
            )
          ) : showingProfileSubScreen ? (
            <header className="mb-4 pt-9">
              <h2 className={ui.title}>
                {profileSubScreen === "referral" ? "Referrals" : "Settings"}
              </h2>
            </header>
          ) : section === "explore" ? (
            exploreHeader
          ) : section === "search" ? (
            <header className="mb-4">
              <h2 className={ui.title}>
                Search
              </h2>
              <label className="mt-4 flex items-center gap-2.5 rounded-full bg-white/[0.08] px-4 py-3 text-white/40">
                <span className="shrink-0">
                  <SearchTabIcon active={false} />
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search markets"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/35"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </header>
          ) : section === "profile" ? (
            <div className="mb-4">
              <ProfileIdentityHeader
                seed={demoProfile?.wallet ?? profileUsername ?? "profile"}
                name={
                  demoProfileStatus === "loading" && !profileUsername
                    ? "—"
                    : (profileUsername ??
                      demoProfile?.displayName ??
                      shortWallet(demoProfile?.wallet ?? ""))
                }
                wallet={
                  demoProfileStatus === "loading"
                    ? "…"
                    : (demoProfile?.wallet ?? "")
                }
                nameRef={stickyTitleRef}
                trailing={
                  <>
                    <button
                      type="button"
                      aria-label="Referral"
                      onClick={() => setProfileSubScreen("referral")}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <ReferralIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Settings"
                      onClick={() => setProfileSubScreen("settings")}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <SettingsIcon className="h-5 w-5" />
                    </button>
                  </>
                }
              />
              <ProfileCountRow
                following={followedWallets.size}
                followers={ownProfileCounts.followers}
                winRate={demoProfile?.winRate ?? null}
                onFollowingClick={() => openOwnFollowList("following")}
                onFollowersClick={() => openOwnFollowList("followers")}
              />
              <ProfileBalanceChart
                balance={profileBalance}
                loading={demoProfileStatus === "loading"}
                totalPnl={(demoProfile?.totalPnl ?? 0) + copiedOpenPnl}
                roiPercent={demoProfile?.roiPercent ?? null}
                history={portfolioHistory}
                onDeposit={() => setDepositOpen(true)}
              />
            </div>
          ) : section === "feed" ? (
            <header className="mb-4 flex items-start justify-between gap-3">
              <h2
                ref={stickyTitleRef as RefObject<HTMLHeadingElement>}
                className={ui.title}
              >
                Feed
              </h2>
              <button
                type="button"
                role="switch"
                aria-checked={feedFriendsOnly}
                onClick={() => setFeedFriendsOnly((on) => !on)}
                className="mt-1.5 flex shrink-0 items-center gap-2"
              >
                <span
                  className={`text-[13px] font-semibold ${
                    feedFriendsOnly ? "text-white" : "text-white/45"
                  }`}
                >
                  Friends only
                </span>
                <span
                  aria-hidden
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    feedFriendsOnly ? "bg-[#00D54B]" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      feedFriendsOnly ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </header>
          ) : (
            <header className="mb-4">
              <h2
                ref={stickyTitleRef as RefObject<HTMLHeadingElement>}
                className={ui.title}
              >
                {section === "leaderboard"
                  ? "Leaderboard"
                  : section === "search"
                    ? "Search"
                    : "Profile"}
              </h2>
              {section === "leaderboard" && (
                <div className="mt-4">
                  <ChipTabs
                    ariaLabel="Leaderboard type"
                    value={leaderboardTab}
                    onChange={setLeaderboardTab}
                    tabs={
                      [
                        { id: "all", label: "All" },
                        { id: "friends", label: "Friends" },
                        { id: "lists", label: "Lists" },
                      ] as const
                    }
                  />
                </div>
              )}
            </header>
          )}

          {section === "search" && !showingDrillDown && (
            <div className="flex flex-col gap-6">
              <ListsPreviewRail
                lists={lists}
                status={listsStatus}
                onOpen={openList}
              />

              {searchQuery.trim() === "" && (
                <section aria-label="Recent searches">
                  <h3 className={`mb-2.5 ${ui.section}`}>Recents</h3>
                  <p className="py-1 text-[14px] text-white/45">
                    No recent searches
                  </p>
                </section>
              )}

              <div className="flex flex-col gap-2.5">
              {searchStatus === "loading" && (
                <div className="space-y-2.5 animate-pulse" aria-hidden>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[64px] rounded-xl bg-white/10" />
                  ))}
                </div>
              )}
              {searchStatus === "error" && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t search right now.
                </p>
              )}
              {searchStatus === "ready" && searchResults.length === 0 && (
                <p className="text-sm text-white/55">No markets found.</p>
              )}
              {searchStatus === "ready" && searchResults.length > 0 && (
                <ul className="flex flex-col gap-2.5">
                  {searchResults.map((market) => (
                    <li key={market.marketId}>
                      <button
                        type="button"
                        onClick={() => openMarket(market)}
                        className="w-full rounded-[20px] bg-white/[0.08] p-3.5 text-left transition-colors hover:bg-white/[0.1]"
                      >
                        <div className="flex items-start gap-3">
                          {market.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={market.image}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[12px] font-semibold text-white/40">
                              M
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {market.category ? (
                              <p className="text-[11px] font-medium text-white/40">
                                {market.category}
                              </p>
                            ) : null}
                            <p className="line-clamp-2 text-[15px] font-semibold leading-snug">
                              {market.title}
                            </p>
                            <p className="mt-1 text-[12px] text-white/45">
                              {formatUsd(market.volumeUsd || market.volume24h)}{" "}
                              Vol
                              {(market.relatedMarketCount ?? 1) > 1
                                ? ` · ${market.relatedMarketCount} Markets`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <MarketOddsPreview market={market} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              </div>
            </div>
          )}

          {section === "explore" && !showingDrillDown && (
            <div className="flex flex-col gap-6">
              {copyTrades.length > 0 && (
                <section aria-label="Copying">
                  <button
                    type="button"
                    onClick={viewCopyTradesOnProfile}
                    className={`mb-3 flex items-center gap-1 ${ui.section}`}
                  >
                    Copying
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-4 w-4 text-white/35"
                      aria-hidden
                    >
                      <path
                        d="M6 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className="-mx-5 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <ul className="flex w-max flex-nowrap gap-2.5 pb-0.5">
                      {copyTrades.map((trade) => (
                        <li key={trade.wallet} className="w-[292px] shrink-0">
                          <CopyTradeCard
                            trade={trade}
                            copied={copiedTradesForWallet(
                              userTrades,
                              trade.wallet,
                            )}
                            onManage={() =>
                              openCopyTrade(trade.wallet, trade.displayName)
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              <section aria-label="Live games">
                <h3 className={`mb-3 ${ui.section}`}>Live Games</h3>

                {marketsStatus === "loading" && (
                  <div
                    className="-mx-5 flex gap-2.5 overflow-hidden px-5 animate-pulse"
                    aria-hidden
                  >
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[124px] w-[292px] shrink-0 rounded-[20px] bg-white/10"
                      />
                    ))}
                  </div>
                )}

                {marketsStatus === "error" && (
                  <p className="text-sm text-white/55">
                    Couldn&apos;t load live markets.
                  </p>
                )}

                {marketsStatus === "ready" && liveMarkets.length === 0 && (
                  <p className="text-sm text-white/55">No live sports markets.</p>
                )}

                {marketsStatus === "ready" && liveMarkets.length > 0 && (
                  <div className="-mx-5 overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <ul className="flex w-max gap-2.5 pb-0.5">
                      {liveMarkets.map((market) => (
                        <li key={market.marketId} className="w-[292px] shrink-0">
                          <LiveGameCard market={market} onOpen={openMarket} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section aria-label="Trending markets">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 className={ui.section}>Trending</h3>
                  <TrendingViewIcons
                    value={trendingView}
                    onChange={setTrendingView}
                  />
                </div>

                {marketsStatus === "loading" && (
                  <div
                    className={
                      trendingView === "list"
                        ? "space-y-2.5 animate-pulse"
                        : "columns-2 gap-2.5 animate-pulse"
                    }
                    aria-hidden
                  >
                    {trendingView === "list"
                      ? Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-[72px] rounded-[20px] bg-white/10"
                          />
                        ))
                      : [72, 108, 88, 124, 80, 96, 116, 76, 104, 92].map(
                          (body, i) => (
                            <div
                              key={i}
                              className="mb-2.5 break-inside-avoid overflow-hidden rounded-[20px] bg-white/10"
                            >
                              <div
                                className="bg-white/[0.08]"
                                style={{ height: TRENDING_IMAGE_HEIGHT }}
                              />
                              <div style={{ height: body }} />
                            </div>
                          ),
                        )}
                  </div>
                )}

                {marketsStatus === "error" && (
                  <p className="text-sm text-white/55">
                    Couldn&apos;t load trending markets.
                  </p>
                )}

                {marketsStatus === "ready" && trendingMarkets.length === 0 && (
                  <p className="text-sm text-white/55">No trending markets.</p>
                )}

                {marketsStatus === "ready" && trendingMarkets.length > 0 && (
                  <ul
                    className={
                      trendingView === "list"
                        ? "flex flex-col gap-2.5"
                        : "columns-2 gap-2.5"
                    }
                  >
                    {trendingMarkets.map((market) => (
                      <li
                        key={market.marketId}
                        className={
                          trendingView === "list" ? undefined : "mb-2.5 break-inside-avoid"
                        }
                      >
                        <TrendingMarketCard
                          market={market}
                          onOpen={openMarket}
                          variant={trendingView}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {showingMarketDetail && (
            <div
              key={`market-body-${selectedMarketSlug}`}
              className={MARKET_ENTER_DELAYED}
            >
              {marketStatus === "loading" && !selectedMarket && (
                <div className="space-y-3 animate-pulse" aria-hidden>
                  <div className="h-24 rounded-xl bg-white/10" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="h-20 rounded-xl bg-white/10" />
                    <div className="h-20 rounded-xl bg-white/10" />
                  </div>
                  <div className="h-28 rounded-xl bg-white/10" />
                </div>
              )}

              {marketStatus === "error" && !selectedMarket && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load this market. Try again in a moment.
                </p>
              )}

              {selectedMarket && (
                <div
                  className={`flex flex-col ${
                    isSportsMarket(selectedMarket) ? "gap-4" : "gap-5"
                  }`}
                >
                  {isSportsMarket(selectedMarket) ? (
                    <SportsScoreboard market={selectedMarket} />
                  ) : (
                  (() => {
                    const odds = getMarketOddsSides(selectedMarket);
                    const multi =
                      (selectedMarket.outcomes?.length ?? 0) > 2
                        ? [...(selectedMarket.outcomes ?? [])]
                            .sort((a, b) => b.price - a.price)
                            .slice(0, 6)
                        : null;

                    if (multi && multi.length > 2) {
                      return (
                        <div className="flex flex-col gap-3 px-1">
                          {multi.map((outcome, index) => (
                            <div key={`${outcome.marketId}-${outcome.label}`}>
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="min-w-0 truncate text-[15px] font-semibold">
                                  {outcome.label}
                                </p>
                                <p
                                  className={`shrink-0 text-[22px] font-semibold tabular-nums ${instrumentSansCondensed.className}`}
                                >
                                  <ChanceFlow price={outcome.price} />
                                </p>
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(2, Math.min(100, outcome.price * 100))}%`,
                                    backgroundColor:
                                      OUTCOME_BAR_COLORS[
                                        index % OUTCOME_BAR_COLORS.length
                                      ],
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    const left = odds[0]!;
                    const right = odds[1]!;
                    return (
                      <>
                        <div className="flex items-end justify-between gap-4 px-1">
                          <div>
                            <p className="text-[13px] font-medium text-white/45">
                              {left.label}
                            </p>
                            <p
                              className={`mt-1 text-[40px] font-semibold leading-none tracking-[-0.05em] tabular-nums ${instrumentSansCondensed.className}`}
                            >
                              <OddsCentsFlow price={left.price} />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-medium text-white/45">
                              {right.label}
                            </p>
                            <p
                              className={`mt-1 text-[40px] font-semibold leading-none tracking-[-0.05em] tabular-nums text-white/55 ${instrumentSansCondensed.className}`}
                            >
                              <OddsCentsFlow price={right.price} />
                            </p>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className="h-1.5 rounded-full bg-[#00D54B]"
                            style={{
                              width: `${Math.max(
                                2,
                                Math.min(98, left.price * 100),
                              )}%`,
                            }}
                          />
                        </div>
                      </>
                    );
                  })()
                  )}

                  {!isSportsMarket(selectedMarket) && (
                    <p className="px-1 text-[12px] tabular-nums text-white/40">
                      {formatUsd(
                        selectedMarket.volumeUsd || selectedMarket.volume24h,
                      )}{" "}
                      Vol
                    </p>
                  )}

                  {marketUserPosition && (
                    <MarketYourPosition
                      item={marketUserPosition}
                      market={selectedMarket}
                      handle={ownShareHandle}
                      referralCode={referralCode}
                      onCashOut={() => setCashOutItem(marketUserPosition)}
                      onShare={setSharePosition}
                    />
                  )}

                  <div className="flex flex-col">
                  <ChipTabs
                    ariaLabel="Market activity"
                    value={marketDetailTab}
                    onChange={setMarketDetailTab}
                    tabs={
                      [
                        {
                          id: "trades",
                          label: "Takes",
                          count:
                            marketFeedTrades.length > 0
                              ? marketFeedTrades.length
                              : undefined,
                        },
                        {
                          id: "traders",
                          label: "Traders",
                          count: marketActivity?.traders.length || undefined,
                        },
                        { id: "rules", label: "Rules" },
                      ] as const
                    }
                  />

                  {marketDetailTab !== "rules" &&
                    marketActivityStatus === "loading" &&
                    marketFeedTrades.length === 0 && (
                    <div className="mt-1 space-y-2 animate-pulse" aria-hidden>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-[148px] rounded-[20px] bg-white/10" />
                      ))}
                    </div>
                  )}

                  {marketDetailTab !== "rules" &&
                    marketActivityStatus === "error" &&
                    marketFeedTrades.length === 0 && (
                    <p className="mt-2 text-sm text-white/55">
                      Couldn&apos;t load market activity.
                    </p>
                  )}

                  {marketDetailTab === "trades" &&
                    (marketActivityStatus === "ready" ||
                      marketFeedTrades.length > 0) &&
                    marketFeedTrades.length === 0 && (
                      <p className="mt-2 text-sm text-white/55">No recent takes.</p>
                    )}

                  {marketDetailTab === "trades" &&
                    marketFeedTrades.length > 0 &&
                    selectedMarket && (
                      <ul className="flex flex-col">
                        {marketFeedTrades.map((trade) => (
                          <li
                            key={`${trade.txHash ?? trade.timestamp}-${trade.wallet}-${trade.outcome}`}
                            className="border-b border-white/[0.06] py-5 first:pt-3 last:border-b-0"
                          >
                            <TradePost
                              trade={trade}
                              handle={resolveFeedHandle(trade.wallet)}
                              caption={feedCaption(trade)}
                              gifUrl={captionGifForTrade(trade)}
                              lifted
                              marketImage={
                                selectedMarket.image ??
                                (trade.marketSlug
                                  ? marketImageBySlug.get(trade.marketSlug)
                                  : undefined)
                              }
                              onOpenWallet={(wallet) => openWallet(wallet, null)}
                              onOpenTrade={() => setFeedPositionTrade(trade)}
                              currentUser={commentAuthor}
                            />
                          </li>
                        ))}
                      </ul>
                    )}

                  {marketActivityStatus === "ready" &&
                    marketDetailTab === "traders" &&
                    (marketActivity?.traders.length ?? 0) === 0 && (
                      <p className="mt-2 text-sm text-white/55">No traders found.</p>
                    )}

                  {marketActivityStatus === "ready" &&
                    marketDetailTab === "traders" &&
                    (marketActivity?.traders.length ?? 0) > 0 && (
                      <ol className="divide-y divide-white/[0.06]">
                        {marketActivity!.traders.map((trader, index) => {
                          const pnlPositive =
                            trader.totalPnl === null
                              ? null
                              : trader.totalPnl >= 0;
                          return (
                            <li key={trader.wallet}>
                              <ActivityRow
                                leading={
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-5 text-center text-[13px] font-semibold tabular-nums text-white/35">
                                      {index + 1}
                                    </span>
                                    <UserAvatar
                                      seed={trader.wallet}
                                      className="h-11 w-11 text-[13px]"
                                    />
                                  </div>
                                }
                                title={shortWallet(trader.wallet)}
                                subtitle={`${formatUsd(trader.volumeUsd)} vol${
                                  trader.winRate !== null
                                    ? ` · ${trader.winRate.toFixed(0)}% win`
                                    : ""
                                }`}
                                trailing={
                                  <span
                                    className={`text-[16px] font-semibold tabular-nums ${
                                      pnlPositive === null
                                        ? "text-white/55"
                                        : pnlPositive
                                          ? "text-[#00D54B]"
                                          : "text-[#FF375F]"
                                    }`}
                                  >
                                    {trader.totalPnl === null
                                      ? "—"
                                      : formatSignedUsd(trader.totalPnl)}
                                  </span>
                                }
                                onClick={() => openWallet(trader.wallet, null)}
                              />
                            </li>
                          );
                        })}
                      </ol>
                    )}

                  {marketDetailTab === "rules" && (
                    <div className="mt-3">
                      {selectedMarket.rules?.trim() ? (
                        <p className="whitespace-pre-wrap text-[14px] leading-[1.55] text-white/75">
                          {selectedMarket.rules}
                        </p>
                      ) : (
                        <p className="text-sm text-white/55">
                          No rules posted for this market yet.
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}

          {showingListDetail && (
            <>
              {listDetailStatus === "loading" && (
                <div className="space-y-3 animate-pulse" aria-hidden>
                  <div className="h-16 rounded-xl bg-white/10" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-white/10" />
                  ))}
                </div>
              )}

              {listDetailStatus === "error" && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load this list. Try again in a moment.
                </p>
              )}

              {listDetailStatus === "ready" && listDetail && (
                <div className="flex flex-col gap-4">
                  <ChipTabs
                    ariaLabel="List content"
                    value={listDetailTab}
                    onChange={setListDetailTab}
                    tabs={
                      [
                        {
                          id: "trades",
                          label: "Trades",
                          count:
                            listDetail.recentTrades.length > 0
                              ? listDetail.recentTrades.length
                              : undefined,
                        },
                        {
                          id: "wallets",
                          label: "Wallets",
                          count:
                            listDetail.walletCount > 0
                              ? listDetail.walletCount
                              : undefined,
                        },
                      ] as const
                    }
                  />

                  {listDetailTab === "trades" && (
                    <section aria-label="Recent trades">
                      {listDetail.recentTrades.length === 0 ? (
                        <p className="text-sm text-white/55">No recent trades.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {listDetail.recentTrades.map((trade, index) => {
                            const isBuy = trade.side.toUpperCase() === "BUY";
                            const timeAgo = formatTimeAgo(trade.timestamp);
                            return (
                              <li
                                key={`${trade.timestamp}-${trade.wallet}-${trade.outcome}-${index}`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    openMarketBySlug(
                                      trade.marketSlug ?? "",
                                      trade.marketTitle,
                                    )
                                  }
                                  className="w-full rounded-[20px] bg-white/[0.08] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.1]"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 truncate text-[12px] font-semibold leading-snug">
                                      {trade.marketTitle}
                                    </p>
                                    {timeAgo && (
                                      <p className="shrink-0 text-[11px] text-white/35">
                                        {timeAgo}
                                      </p>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[11px] text-white/45">
                                    <span
                                      className={
                                        isBuy
                                          ? "text-[#00D54B]"
                                          : "text-[#FF375F]"
                                      }
                                    >
                                      {trade.side}
                                    </span>
                                    {" · "}
                                    {trade.outcome}
                                    {" · "}
                                    {formatOdds(trade.price)}
                                  </p>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </section>
                  )}

                  {listDetailTab === "wallets" && (
                    <section aria-label="Wallets">
                      {listDetail.wallets.length === 0 ? (
                        <p className="text-sm text-white/55">
                          No wallets in this list.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {listDetail.wallets.slice(0, 20).map((wallet) => (
                            <li key={wallet.wallet}>
                              <button
                                type="button"
                                onClick={() =>
                                  openWallet(wallet.wallet, wallet.displayName)
                                }
                                className="flex w-full items-center gap-3 rounded-[20px] bg-white/[0.08] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.1]"
                              >
                                <UserAvatar
                                  seed={wallet.wallet}
                                  label={wallet.displayName ?? wallet.wallet}
                                  className="h-9 w-9 text-[12px]"
                                />
                                <span className="min-w-0 flex-1 truncate text-[12px] font-medium tabular-nums text-white/80">
                                  {wallet.displayName ??
                                    shortWallet(wallet.wallet)}
                                </span>
                                <span
                                  className={`shrink-0 text-[12px] font-semibold tabular-nums ${
                                    wallet.totalPnl >= 0
                                      ? "text-[#00D54B]"
                                      : "text-[#FF375F]"
                                  }`}
                                >
                                  {formatSignedUsd(wallet.totalPnl)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {showingWalletProfile && (
            <>
              {walletStatus === "loading" && (
                <div className="space-y-3 animate-pulse" aria-hidden>
                  <div className="h-16 rounded-xl bg-white/10" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-xl bg-white/10" />
                  ))}
                </div>
              )}

              {walletStatus === "error" && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load this wallet. Try again in a moment.
                </p>
              )}

              {walletStatus === "ready" && walletProfile && (
                <div className="flex flex-col gap-4">
                  <section
                    className="flex flex-col"
                    aria-label={
                      walletProfileTab === "positions"
                        ? "Open positions"
                        : "Transaction history"
                    }
                  >
                    <ChipTabs
                      ariaLabel="Wallet portfolio"
                      value={walletProfileTab}
                      onChange={setWalletProfileTab}
                      tabs={
                        [
                          {
                            id: "positions",
                            label: "Positions",
                            count: walletPositions.length,
                          },
                          {
                            id: "history",
                            label: "History",
                            count: walletHistoryTrades.length,
                          },
                        ] as const
                      }
                    />

                    {walletProfileTab === "positions" &&
                      walletPositions.length === 0 && (
                        <p className="text-sm text-white/55">
                          No open positions.
                        </p>
                      )}

                    {walletProfileTab === "positions" &&
                      walletPositions.length > 0 && (
                        <ul className="divide-y divide-white/[0.06]">
                          {walletPositions.map((position, index) => (
                            <li
                              key={`${position.marketSlug ?? position.marketTitle}-${position.outcome}-${index}`}
                            >
                              <ProfilePositionRow
                                position={position}
                                onOpen={openMarketBySlug}
                              />
                            </li>
                          ))}
                        </ul>
                      )}

                    {walletProfileTab === "history" &&
                      walletHistoryTrades.length === 0 && (
                        <p className="text-sm text-white/55">
                          No transactions yet.
                        </p>
                      )}

                    {walletProfileTab === "history" &&
                      walletHistoryTrades.length > 0 && (
                        <ul className="divide-y divide-white/[0.06]">
                          {walletHistoryTrades.map((trade, index) => (
                            <li
                              key={`${trade.txHash ?? trade.timestamp}-${trade.outcome}-${index}`}
                            >
                              <ProfileHistoryRow
                                trade={trade}
                                marketImage={
                                  trade.marketSlug
                                    ? walletMarketImages.get(trade.marketSlug)
                                    : undefined
                                }
                                onOpen={openMarketBySlug}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                  </section>
                </div>
              )}
            </>
          )}

          {section === "feed" && !showingDrillDown && (
            <>
              {tradesStatus === "loading" && userFeedTrades.length === 0 && (
                <ul className="flex flex-col gap-5 animate-pulse" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <FeedItemSkeleton key={i} />
                  ))}
                </ul>
              )}
              {tradesStatus === "error" && userFeedTrades.length === 0 && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load feed. Try again in a moment.
                </p>
              )}
              {tradesStatus === "ready" && visibleFeedTrades.length === 0 && (
                <p className="text-sm text-white/55">
                  {feedFriendsOnly
                    ? followedWallets.size === 0
                      ? "Follow people to see their trades here."
                      : "No trades from friends yet."
                    : "No recent trades in the feed."}
                </p>
              )}
              {(tradesStatus === "ready" || userFeedTrades.length > 0) &&
                visibleFeedTrades.length > 0 && (
                <ul className="flex flex-col">
                  {visibleFeedTrades.map((trade) => (
                    <li
                      key={`${trade.txHash ?? trade.timestamp}-${trade.wallet}-${trade.outcome}`}
                      className="border-b border-white/[0.06] py-5 first:pt-0 last:border-b-0"
                    >
                      <TradePost
                        trade={trade}
                        handle={resolveFeedHandle(trade.wallet)}
                        caption={feedCaption(trade)}
                        gifUrl={captionGifForTrade(trade)}
                        marketImage={
                          trade.marketSlug
                            ? marketImageBySlug.get(trade.marketSlug)
                            : undefined
                        }
                        onOpenWallet={(wallet) => openWallet(wallet, null)}
                        onOpenTrade={() => setFeedPositionTrade(trade)}
                        currentUser={commentAuthor}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {section === "leaderboard" && !showingDrillDown && (
            <>
              {leaderboardStatus === "loading" &&
                (leaderboardTab !== "friends" || followedWallets.size > 0) && (
                <div className="space-y-2.5 animate-pulse" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[64px] rounded-xl bg-white/10" />
                  ))}
                </div>
              )}
              {leaderboardStatus === "error" && leaderboardTab !== "friends" && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load leaderboard. Try again in a moment.
                </p>
              )}

              {leaderboardStatus === "ready" &&
                leaderboardTab === "all" &&
                leaderboardWallets.length === 0 && (
                  <p className="text-sm text-white/55">
                    No wallet leaderboard entries yet.
                  </p>
                )}

              {leaderboardStatus === "ready" &&
                leaderboardTab === "all" &&
                leaderboardWallets.length > 0 && (
                  <ol className="divide-y divide-white/[0.06]">
                    {leaderboardWallets.map((wallet, index) => {
                      const pnlPositive = wallet.totalPnl >= 0;
                      return (
                        <li key={wallet.wallet}>
                          <ActivityRow
                            leading={
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 text-center text-[13px] font-semibold tabular-nums text-white/35">
                                  {index + 1}
                                </span>
                                <UserAvatar
                                  seed={wallet.wallet}
                                  label={wallet.displayName ?? wallet.wallet}
                                  className="h-11 w-11 text-[13px]"
                                />
                              </div>
                            }
                            title={
                              wallet.displayName ?? shortWallet(wallet.wallet)
                            }
                            subtitle={
                              wallet.displayName
                                ? shortWallet(wallet.wallet)
                                : wallet.winRate > 0
                                  ? `${wallet.winRate.toFixed(0)}% win`
                                  : "Trader"
                            }
                            trailing={
                              <span
                                className={`text-[16px] font-semibold tabular-nums ${
                                  pnlPositive
                                    ? "text-[#00D54B]"
                                    : "text-[#FF375F]"
                                }`}
                              >
                                {formatSignedUsd(wallet.totalPnl)}
                              </span>
                            }
                            onClick={() =>
                              openWallet(wallet.wallet, wallet.displayName)
                            }
                          />
                        </li>
                      );
                    })}
                  </ol>
                )}

              {leaderboardTab === "friends" && followedWallets.size === 0 && (
                <p className="text-sm text-white/55">
                  Follow traders to see their ranking here.
                </p>
              )}

              {leaderboardTab === "friends" &&
                followedWallets.size > 0 &&
                friendLeaderboard.length === 0 &&
                leaderboardStatus !== "loading" && (
                  <p className="text-sm text-white/55">
                    None of the people you follow are on the leaderboard yet.
                  </p>
                )}

              {leaderboardTab === "friends" && friendLeaderboard.length > 0 && (
                <ol className="divide-y divide-white/[0.06]">
                  {friendLeaderboard.map((wallet, index) => {
                    const pnlPositive = wallet.totalPnl >= 0;
                    return (
                      <li key={wallet.wallet}>
                        <ActivityRow
                          leading={
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 text-center text-[13px] font-semibold tabular-nums text-white/35">
                                {index + 1}
                              </span>
                              <UserAvatar
                                seed={wallet.wallet}
                                label={wallet.displayName ?? wallet.wallet}
                                className="h-11 w-11 text-[13px]"
                              />
                            </div>
                          }
                          title={
                            wallet.displayName ?? shortWallet(wallet.wallet)
                          }
                          subtitle={
                            wallet.displayName
                              ? shortWallet(wallet.wallet)
                              : wallet.winRate > 0
                                ? `${wallet.winRate.toFixed(0)}% win`
                                : "Trader"
                          }
                          trailing={
                            <span
                              className={`text-[16px] font-semibold tabular-nums ${
                                pnlPositive
                                  ? "text-[#00D54B]"
                                  : "text-[#FF375F]"
                              }`}
                            >
                              {formatSignedUsd(wallet.totalPnl)}
                            </span>
                          }
                          onClick={() =>
                            openWallet(wallet.wallet, wallet.displayName)
                          }
                        />
                      </li>
                    );
                  })}
                </ol>
              )}

              {leaderboardStatus === "ready" &&
                leaderboardTab === "lists" &&
                leaderboardLists.length === 0 && (
                  <p className="text-sm text-white/55">
                    No list leaderboard entries yet.
                  </p>
                )}

              {leaderboardStatus === "ready" &&
                leaderboardTab === "lists" &&
                leaderboardLists.length > 0 && (
                  <ol className="divide-y divide-white/[0.06]">
                    {[...leaderboardLists]
                      .sort((a, b) => b.aggregatedPnl - a.aggregatedPnl)
                      .map((list, index) => {
                        const pnlPositive = list.aggregatedPnl >= 0;
                        return (
                          <li key={list.id}>
                            <ActivityRow
                              leading={
                                <div className="flex items-center gap-2.5">
                                  <span className="w-5 text-center text-[13px] font-semibold tabular-nums text-white/35">
                                    {index + 1}
                                  </span>
                                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.1] text-[13px] font-semibold">
                                    {list.name.slice(0, 1).toUpperCase()}
                                  </div>
                                </div>
                              }
                              title={list.name}
                              subtitle={`${list.walletCount} ${
                                list.walletCount === 1 ? "wallet" : "wallets"
                              }`}
                              trailing={
                                <span
                                  className={`text-[16px] font-semibold tabular-nums ${
                                    pnlPositive
                                      ? "text-[#00D54B]"
                                      : "text-[#FF375F]"
                                  }`}
                                >
                                  {formatSignedUsd(list.aggregatedPnl)}
                                </span>
                              }
                              onClick={() => openList(list.id)}
                            />
                          </li>
                        );
                      })}
                  </ol>
                )}
            </>
          )}

          {showingProfileSubScreen && profileSubScreen === "referral" && (
            <ReferralScreen
              username={profileUsername}
              wallet={demoProfile?.wallet ?? null}
            />
          )}

          {showingProfileSubScreen && profileSubScreen === "settings" && (
            <SettingsScreen
              username={profileUsername}
              wallet={demoProfile?.wallet ?? null}
              followingCount={followedWallets.size}
              copyTradeCount={copyTrades.length}
              onUsernameChange={updateProfileUsername}
              onResetOnboarding={resetOnboarding}
              onOpenCopytrades={viewCopyTradesOnProfile}
            />
          )}

          {section === "profile" && !showingDrillDown && !showingProfileSubScreen && (
            <div className="flex flex-col gap-3">
              {demoProfileStatus === "loading" && (
                <div className="space-y-2.5 animate-pulse" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[72px] rounded-xl bg-white/10" />
                  ))}
                </div>
              )}

              {demoProfileStatus === "error" && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load a wallet profile right now.
                </p>
              )}

              {demoProfileStatus === "ready" && demoProfile && (
                <>
                  <section
                    aria-label={
                      profileTab === "positions"
                        ? "Open positions"
                        : "Transaction history"
                    }
                  >
                    <div className="mb-3">
                      <ChipTabs
                        ariaLabel="Profile portfolio"
                        value={profileTab}
                        onChange={setProfileTab}
                        tabs={
                          [
                            {
                              id: "positions",
                              label: "Positions",
                              count:
                                profilePositionCount > 0
                                  ? profilePositionCount
                                  : undefined,
                            },
                            {
                              id: "history",
                              label: "History",
                              count:
                                mergedProfileHistory.length > 0
                                  ? mergedProfileHistory.length
                                  : undefined,
                            },
                            {
                              id: "copying",
                              label: "Copying",
                              count:
                                copyTrades.length > 0
                                  ? copyTrades.length
                                  : undefined,
                            },
                          ] as const
                        }
                      />
                    </div>

                    {profileTab === "positions" && (
                      <ul className="divide-y divide-white/[0.06]">
                        {profilePositions.map((position, index) => (
                          <li key={`${position.marketSlug ?? position.marketTitle}-${position.outcome}-${index}`}>
                            <ProfilePositionRow
                              position={position}
                              onOpen={openMarketBySlug}
                            />
                          </li>
                        ))}
                      </ul>
                    )}

                    {profileTab === "history" && profileHistoryStatus === "loading" && (
                      <div className="space-y-2 animate-pulse" aria-hidden>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-[58px] rounded-xl bg-white/10" />
                        ))}
                      </div>
                    )}

                    {profileTab === "history" && profileHistoryStatus === "error" && (
                      <p className="text-sm text-white/55">
                        Couldn&apos;t load transaction history.
                      </p>
                    )}

                    {profileTab === "history" &&
                      profileHistoryStatus === "ready" &&
                      mergedProfileHistory.length === 0 && (
                        <p className="text-sm text-white/55">
                          No transactions yet.
                        </p>
                      )}

                    {profileTab === "history" &&
                      (profileHistoryStatus === "ready" ||
                        userHistoryTrades.length > 0) &&
                      mergedProfileHistory.length > 0 && (
                        <ul className="divide-y divide-white/[0.06]">
                          {mergedProfileHistory.map((trade, index) => (
                            <li
                              key={`${trade.txHash ?? trade.timestamp}-${trade.outcome}-${index}`}
                            >
                              <ProfileHistoryRow
                                trade={trade}
                                marketImage={
                                  trade.marketSlug
                                    ? profileMarketImages.get(trade.marketSlug)
                                    : undefined
                                }
                                onOpen={openMarketBySlug}
                              />
                            </li>
                          ))}
                        </ul>
                      )}

                    {profileTab === "copying" && copyTrades.length === 0 && (
                      <p className="text-sm text-white/55">
                        You&apos;re not copying anyone yet. Open a trader&apos;s
                        profile and tap Copy.
                      </p>
                    )}

                    {profileTab === "copying" && copyTrades.length > 0 && (
                      <ul className="flex flex-col gap-3">
                        {copyTrades.map((trade) => (
                          <li key={trade.wallet}>
                            <CopyTradeCard
                              trade={trade}
                              copied={copiedTradesForWallet(
                                userTrades,
                                trade.wallet,
                              )}
                              onManage={() =>
                                openCopyTrade(trade.wallet, trade.displayName)
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </div>

        {showingMarketDetail && (
          <div
            key={`market-fade-${selectedMarketSlug}`}
            ref={stickyMarketFadeRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[68px] opacity-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${marketAccent} 42%, ${hexToRgba(marketAccent, 0.75)}, transparent)`,
            }}
          >
            {sportsMarketView &&
              !tradeFlowMarket &&
              !feedPositionTrade &&
              !cashOutItem &&
              !copyTradeTarget &&
              !depositOpen && (
                <div className="absolute inset-x-0 top-3.5 flex justify-center px-16">
                  <div className="flex h-10 min-w-0 max-w-full items-center gap-1.5">
                    {(() => {
                      const photo = selectedMarket?.image;
                      const league =
                        selectedMarket?.liveGame?.league ??
                        selectedMarket?.category ??
                        "";
                      const logo = photo ?? leagueLogoUrl(league);
                      return logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className={
                            photo
                              ? "h-5 w-5 shrink-0 rounded-full object-cover"
                              : "h-5 w-5 shrink-0 object-contain"
                          }
                        />
                      ) : null;
                    })()}
                    <p className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.02em]">
                      {selectedMarket?.title ?? "Market"}
                    </p>
                  </div>
                </div>
              )}
          </div>
        )}

        {stickyTitle && (
          <div
            key={`${section}-${showingOwnProfile ? "me" : showingWalletProfile ? "wallet" : showingMarketDetail ? "market" : "page"}`}
            ref={stickyNavRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 opacity-0"
          >
            {showingMarketDetail ? null : (
              <div className="h-[68px] bg-gradient-to-b from-black from-[42%] via-black/75 to-transparent" />
            )}
            <p
              className={`absolute top-3.5 truncate text-center text-[15px] font-semibold leading-10 tracking-[-0.02em] text-white ${
                drillBack ? "inset-x-[4.5rem]" : "inset-x-8"
              }`}
            >
              {stickyTitle}
            </p>
          </div>
        )}

        {drillBack &&
          !tradeFlowMarket &&
          !feedPositionTrade &&
          !cashOutItem &&
          !copyTradeTarget &&
          !depositOpen && (
          <div className="absolute left-3.5 top-3.5 z-30">
            <BlurBackButton
              onClick={drillBack.onClick}
              label={drillBack.label}
            />
          </div>
        )}

        {showingMarketDetail &&
          selectedMarket &&
          !tradeFlowMarket &&
          !feedPositionTrade &&
          !cashOutItem &&
          !copyTradeTarget &&
          !depositOpen && (
            <div className="absolute right-3.5 top-3.5 z-30">
              <BlurShareButton
                onClick={() => void shareMarket()}
              />
            </div>
          )}

        {showingMarketDetail &&
          !showingWalletProfile &&
          selectedMarket &&
          !tradeFlowMarket &&
          !cashOutItem &&
          !copyTradeTarget &&
          !depositOpen && (
          <div
            key={`market-cta-${selectedMarketSlug}`}
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-5 pt-8 ${MARKET_ENTER_DELAYED}`}
            style={{
              backgroundImage: `linear-gradient(to top, ${marketAccent} 0%, ${hexToRgba(marketAccent, 0.9)} 55%, ${hexToRgba(marketAccent, 0)} 100%)`,
            }}
          >
            {isBinaryMarket(selectedMarket) ? (
              <div className="pointer-events-auto flex gap-2.5">
                {getMarketOddsSides(selectedMarket).map((side) => (
                  <button
                    key={side.side}
                    type="button"
                    disabled={!demoProfile?.wallet}
                    onClick={() => openTradeFlow(selectedMarket, side.label)}
                    className={`min-w-0 flex-1 overflow-hidden px-3 ${
                      side.side === "yes" ? ui.pillYes : ui.pillNo
                    }`}
                  >
                    <span className="flex min-w-0 items-baseline justify-center gap-1">
                      <span className="min-w-0 truncate">
                        {sportsOutcomeAbbr(selectedMarket, side.label) ??
                          side.label}
                      </span>
                      <span className="shrink-0">
                        <OddsCentsFlow price={side.price} />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={!demoProfile?.wallet}
                onClick={() => openTradeFlow(selectedMarket)}
                className={`pointer-events-auto w-full ${ui.pillPrimary}`}
              >
                Trade
              </button>
            )}
          </div>
        )}

        {!showingDrillDown &&
          !showingProfileSubScreen &&
          !feedPositionTrade &&
          !tradeFlowMarket &&
          !copyTradeTarget &&
          !depositOpen &&
          !sharePosition &&
          !followList &&
          !onboardingOpen && (
          <nav
            className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center"
            aria-label="Main sections"
          >
            <div
              className="pointer-events-auto relative flex rounded-full bg-black/65 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl"
              role="tablist"
            >
              <div
                aria-hidden
                className="absolute top-2 left-2 h-12 w-12 rounded-full bg-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{
                  transform: `translateX(${Math.max(0, BOTTOM_TABS.findIndex((tab) => tab.id === section)) * 48}px)`,
                }}
              />
              {BOTTOM_TABS.map((tab) => {
                const isActive = section === tab.id;
                const profileSeed =
                  demoProfile?.wallet ?? profileUsername ?? null;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-label={tab.label}
                    aria-selected={isActive}
                    onClick={() => handleSectionChange(tab.id)}
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                      isActive
                        ? "text-white"
                        : "text-white/45 hover:text-white/70"
                    }`}
                  >
                    {tab.id === "profile" && profileSeed ? (
                      <UserAvatar
                        seed={profileSeed}
                        label={profileUsername ?? "You"}
                        className="h-7 w-7"
                      />
                    ) : (
                      <TabIcon id={tab.id} active={isActive} />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
        {onboardingOpen && (
          <Onboarding
            traders={leaderboardWallets}
            tradersStatus={leaderboardStatus}
            marketImages={onboardingImages}
            isFollowing={isFollowing}
            onToggleFollow={toggleFollow}
            onComplete={completeOnboarding}
          />
        )}
        {feedPositionTrade && (
          <FeedPositionSheet
            trade={feedPositionTrade}
            handle={resolveFeedHandle(feedPositionTrade.wallet)}
            marketImage={
              feedPositionTrade.marketSlug
                ? marketImageBySlug.get(feedPositionTrade.marketSlug)
                : undefined
            }
            volume24h={
              feedPositionTrade.marketSlug
                ? marketBySlug.get(feedPositionTrade.marketSlug)?.volume24h
                : undefined
            }
            market={
              feedPositionTrade.marketSlug
                ? marketBySlug.get(feedPositionTrade.marketSlug)
                : undefined
            }
            onClose={() => setFeedPositionTrade(null)}
            following={isFollowing(feedPositionTrade.wallet)}
            onFollowToggle={() => toggleFollow(feedPositionTrade.wallet)}
            isOwn={Boolean(
              demoProfile?.wallet &&
                feedPositionTrade.wallet.toLowerCase() ===
                  demoProfile.wallet.toLowerCase(),
            )}
            onOpenWallet={() =>
              openWallet(
                feedPositionTrade.wallet,
                resolveFeedHandle(feedPositionTrade.wallet),
              )
            }
            onTrade={
              demoProfile?.wallet
                ? (outcome) => {
                    openTradeFlow(
                      marketFromFeedTrade(
                        feedPositionTrade,
                        marketBySlug.get(feedPositionTrade.marketSlug),
                        feedPositionTrade.marketSlug
                          ? marketImageBySlug.get(feedPositionTrade.marketSlug)
                          : undefined,
                      ),
                      outcome,
                    );
                  }
                : undefined
            }
            onShare={(payload) => setSharePosition(payload)}
            referralCode={referralCode}
          />
        )}
        {tradeFlowMarket && demoProfile?.wallet && (
          <TradeFlowModal
            market={tradeFlowMarket}
            initialOutcome={tradeFlowOutcome}
            wallet={demoProfile.wallet}
            handle={ownShareHandle}
            referralCode={referralCode}
            maxAmount={Math.max(100, profileBalance)}
            nested={Boolean(feedPositionTrade)}
            onClose={closeTradeFlow}
            onComplete={handleTradeComplete}
            onShare={setSharePosition}
          />
        )}
        {cashOutItem && selectedMarket && (
          <CashOutModal
            item={cashOutItem}
            market={selectedMarket}
            handle={ownShareHandle}
            referralCode={referralCode}
            onClose={() => setCashOutItem(null)}
            onConfirm={(result) => cashOutMarketPosition(cashOutItem, result)}
            onShare={setSharePosition}
          />
        )}
        {copyTradeTarget && (
          <CopyTradeModal
            key={copyTradeTarget.wallet}
            wallet={copyTradeTarget.wallet}
            displayName={copyTradeTarget.displayName}
            handle={copyTradeTarget.handle}
            existing={getCopyTrade(copyTradeTarget.wallet)}
            copied={copiedTradesForWallet(
              userTrades,
              copyTradeTarget.wallet,
            )}
            images={profileMarketImages}
            maxAmount={Math.max(100, profileBalance)}
            onClose={() => setCopyTradeTarget(null)}
            onSave={saveCopyTrade}
            onStop={stopCopyTrade}
            onViewProfile={viewCopyTradesOnProfile}
            onOpenMarket={openMarketBySlug}
          />
        )}
        {depositOpen && (
          <DepositModal
            balance={profileBalance}
            wallet={demoProfile?.wallet ?? ""}
            onClose={() => setDepositOpen(false)}
            onComplete={handleDepositComplete}
          />
        )}
        {sharePosition && (
          <SharePositionModal
            payload={sharePosition}
            onClose={() => setSharePosition(null)}
          />
        )}
        {followList && (
          <FollowListSheet
            kind={followList.kind}
            people={followList.people}
            ownWallet={demoProfile?.wallet ?? null}
            isFollowing={isFollowing}
            onToggleFollow={toggleFollow}
            onOpenWallet={openWallet}
            onClose={() => setFollowList(null)}
          />
        )}
        <style>{`
          @keyframes api-market-enter {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </article>
    </div>
  );
}
