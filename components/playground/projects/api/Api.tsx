"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
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
import { instrumentSans } from "@/lib/fonts";
import FeedPositionSheet from "./FeedPositionSheet";
import Onboarding from "./Onboarding";
import PositionsSheet, { BubblyPositionCard } from "./PositionsSheet";
import MarketTopTraders from "./MarketTopTraders";
import ReferralScreen from "./ReferralScreen";
import RewardsScreen, { HowToEarnSheet } from "./RewardsScreen";
import MarketInsightsPager from "./MarketInsightsPager";
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
  copiedTradesForWallet,
  copyRelationshipEntries,
  copyRelationshipPnl,
  formatCopyRule,
  loadCopyTrades,
  saveCopyTrades,
  tickCopiedMarks,
  type CopyTrade,
} from "./copyTrades";
import UserAvatar from "./UserAvatar";
import TabBar, {
  SearchTabIcon,
  TAB_BAR_BOTTOM,
  TAB_BAR_CONTENT_INSET,
  TAB_BAR_HEIGHT,
  type TabId,
} from "./TabBar";
import {
  ActivityRow,
  BlurBackButton,
  BlurShareButton,
  ChipTabs,
  FilterDropdown,
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

type SectionId = "explore" | "search" | "feed" | "rewards" | "profile";
type ProfileSubScreen = "referral" | "settings";
type ListDetailTab = "trades" | "wallets";
type LeaderboardCategory = "all" | "sports" | "crypto" | "politics";
type LeaderboardPeriod = "24h" | "week" | "month";
type MarketDetailTab = "trades" | "traders" | "rules";
type ProfileTab = "positions" | "history" | "copying";
const MARKET_ENTER =
  "motion-safe:animate-[api-market-enter_300ms_cubic-bezier(0.32,0.72,0,1)_both]";
const MARKET_ENTER_DELAYED =
  "motion-safe:animate-[api-market-enter_300ms_cubic-bezier(0.32,0.72,0,1)_70ms_both]";

const IOS_STATUS_PAD = "pt-[52px]";
const IOS_STATUS_BLEED = "-mt-[52px]";
const IOS_CHROME_TOP = "top-12";

const PROFILE_BALANCE = 1_347;
const MARKET_PAGE_BG = "#000000";
/** Feed edges fade over 24px; snap pages pad 24px so resting cards stay fully opaque. */
const FEED_EDGE_MASK =
  "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.35) 8px, rgba(0,0,0,0.8) 16px, #000 24px, #000 calc(100% - 24px), rgba(0,0,0,0.8) calc(100% - 16px), rgba(0,0,0,0.35) calc(100% - 8px), transparent 100%)";
/** Lets trading work before (or without) the remote demo profile loading. */
const LOCAL_TRADER_WALLET = "0x000000000000000000000000000000000000d3a0";
const SHOW_ONBOARDING = false;
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

function portfolioSeedRand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedPortfolioHistory(endValue: number): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000);
  // ~90 days at 6h — enough for scrub ranges without a synthetic sawtooth.
  const steps = 360;
  const stepSecs = 60 * 60 * 6;
  const start = endValue * 0.76;
  const rand = portfolioSeedRand(Math.round(endValue * 97) ^ 0x9e3779b9);

  // Sparse irregular control offsets → smooth organic dips/rallies.
  const controlCount = 14;
  const controls: number[] = [];
  for (let c = 0; c < controlCount; c++) {
    const edge = c === 0 || c === controlCount - 1;
    controls.push(edge ? 0 : (rand() - 0.46) * endValue * 0.09);
  }

  const points: LivelinePoint[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const eased = t * t * (3 - 2 * t);
    const cf = t * (controlCount - 1);
    const ci = Math.min(controlCount - 2, Math.floor(cf));
    const ct = cf - ci;
    const smooth = ct * ct * (3 - 2 * ct);
    const wobble = controls[ci]! + (controls[ci + 1]! - controls[ci]!) * smooth;
    const value = start + (endValue - start) * eased + wobble;
    points.push({
      time: now - (steps - 1 - i) * stepSecs,
      value: Math.round(Math.max(endValue * 0.62, value) * 100) / 100,
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

const LEADERBOARD_CATEGORY_OPTIONS = [
  { id: "all", label: "All" },
  { id: "sports", label: "Sports" },
  { id: "crypto", label: "Crypto" },
  { id: "politics", label: "Politics" },
] as const;

const LEADERBOARD_PERIOD_OPTIONS = [
  { id: "24h", label: "24h" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
] as const;

const LEADERBOARD_CATEGORY_KEYS = ["sports", "crypto", "politics"] as const;

function walletLeaderboardCategory(
  wallet: string,
): (typeof LEADERBOARD_CATEGORY_KEYS)[number] {
  return LEADERBOARD_CATEGORY_KEYS[hashString(wallet) % 3]!;
}

const DEMO_LIVE_MARKET_ID = "demo-live-lal-bos";
const DEMO_F1_MARKET_ID = "demo-f1-ver-nor";
const DEMO_MLB_MARKET_ID = "demo-mlb-tb-mil";
const DEMO_EPL_MARKET_ID = "demo-epl-mci-ars";
const DEMO_TREND_BTC_ID = "demo-trend-btc-81500";
const DEMO_TREND_FED_HIKE_ID = "demo-trend-fed-hike";
const DEMO_TREND_FED_FUNDS_ID = "demo-trend-fed-funds";

const DEMO_MARKET_IDS = new Set([
  DEMO_LIVE_MARKET_ID,
  DEMO_F1_MARKET_ID,
  DEMO_MLB_MARKET_ID,
  DEMO_EPL_MARKET_ID,
  DEMO_TREND_BTC_ID,
  DEMO_TREND_FED_HIKE_ID,
  DEMO_TREND_FED_FUNDS_ID,
]);

function isDemoMarketId(id: string | null | undefined): boolean {
  return Boolean(id && DEMO_MARKET_IDS.has(id));
}

const F1_VERSTAPPEN_HEADSHOT =
  "https://a.espncdn.com/i/headshots/rpm/players/full/4665.png";
const F1_NORRIS_HEADSHOT =
  "https://a.espncdn.com/i/headshots/rpm/players/full/5579.png";

const MLB_RAYS_LOGO = "https://a.espncdn.com/i/teamlogos/mlb/500-dark/tb.png";
const MLB_BREWERS_LOGO =
  "https://a.espncdn.com/i/teamlogos/mlb/500-dark/mil.png";

function createDemoLiveMarket(): PolymarketMarketData {
  return {
    marketId: DEMO_LIVE_MARKET_ID,
    title: "Lakers vs. Warriors",
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
        label: "Warriors",
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
        color: "#552583",
        altColor: "#fdb927",
      },
      home: {
        name: "Warriors",
        score: 81,
        abbr: "GSW",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/gs.png",
        color: "#1D428A",
        altColor: "#ffc72c",
      },
    },
    teams: [
      {
        name: "Lakers",
        abbr: "LAL",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/lal.png",
        color: "#552583",
        altColor: "#fdb927",
      },
      {
        name: "Warriors",
        abbr: "GSW",
        logo: "https://a.espncdn.com/i/teamlogos/nba/500-dark/gs.png",
        color: "#1D428A",
        altColor: "#ffc72c",
      },
    ],
    rules:
      "This market will resolve to the team that wins this NBA game.\n\nIf the game is postponed, delayed, or suspended, this market will remain open until the game is completed. If the game is cancelled and not rescheduled, this market will resolve according to Polymarket's standard sports cancellation rules.\n\nOvertime counts. The resolution source is the official NBA box score.",
  };
}

function createDemoF1Market(): PolymarketMarketData {
  return {
    marketId: DEMO_F1_MARKET_ID,
    title: "Australian Grand Prix: Verstappen vs. Norris",
    slug: DEMO_F1_MARKET_ID,
    category: "Sports",
    yesPrice: 0.58,
    noPrice: 0.42,
    volumeUsd: 1_820_000,
    volume24h: 178_200,
    liquidityUsd: 140_000,
    image: null,
    closesAt: null,
    isResolved: false,
    price24hChange: 0.03,
    outcomes: [
      {
        label: "Max Verstappen",
        price: 0.58,
        marketId: DEMO_F1_MARKET_ID,
        slug: DEMO_F1_MARKET_ID,
        logo: F1_VERSTAPPEN_HEADSHOT,
      },
      {
        label: "Lando Norris",
        price: 0.42,
        marketId: DEMO_F1_MARKET_ID,
        slug: DEMO_F1_MARKET_ID,
        logo: F1_NORRIS_HEADSHOT,
      },
    ],
    relatedMarketCount: 1,
    liveGame: {
      league: "F1 Australia",
      status: "upcoming",
      clock: "",
      away: {
        name: "Max Verstappen",
        score: null,
        abbr: "VER",
        logo: F1_VERSTAPPEN_HEADSHOT,
        portrait: true,
      },
      home: {
        name: "Lando Norris",
        score: null,
        abbr: "NOR",
        logo: F1_NORRIS_HEADSHOT,
        portrait: true,
      },
    },
    teams: [
      {
        name: "Max Verstappen",
        abbr: "VER",
        logo: F1_VERSTAPPEN_HEADSHOT,
        portrait: true,
      },
      {
        name: "Lando Norris",
        abbr: "NOR",
        logo: F1_NORRIS_HEADSHOT,
        portrait: true,
      },
    ],
    rules:
      "This market will resolve to the driver who finishes ahead at the Australian Grand Prix.\n\nIf the race is postponed, this market remains open until it is completed. If a driver does not start, resolution follows Polymarket motorsport rules.",
  };
}

function createDemoMlbMarket(): PolymarketMarketData {
  return {
    marketId: DEMO_MLB_MARKET_ID,
    title: "Rays vs. Brewers",
    slug: DEMO_MLB_MARKET_ID,
    category: "Sports",
    yesPrice: 0.48,
    noPrice: 0.52,
    volumeUsd: 960_000,
    volume24h: 142_000,
    liquidityUsd: 95_000,
    image: null,
    closesAt: null,
    isResolved: false,
    price24hChange: -0.01,
    outcomes: [
      {
        label: "Rays",
        price: 0.48,
        marketId: DEMO_MLB_MARKET_ID,
        slug: DEMO_MLB_MARKET_ID,
        logo: MLB_RAYS_LOGO,
      },
      {
        label: "Brewers",
        price: 0.52,
        marketId: DEMO_MLB_MARKET_ID,
        slug: DEMO_MLB_MARKET_ID,
        logo: MLB_BREWERS_LOGO,
      },
    ],
    relatedMarketCount: 1,
    liveGame: {
      league: "MLB",
      status: "upcoming",
      clock: "",
      away: {
        name: "Tampa Bay Rays",
        score: null,
        abbr: "TB",
        logo: MLB_RAYS_LOGO,
        color: "#092c5c",
        altColor: "#8fbce6",
      },
      home: {
        name: "Milwaukee Brewers",
        score: null,
        abbr: "MIL",
        logo: MLB_BREWERS_LOGO,
        color: "#13294b",
        altColor: "#ffc52f",
      },
    },
    teams: [
      {
        name: "Tampa Bay Rays",
        abbr: "TB",
        logo: MLB_RAYS_LOGO,
        color: "#092c5c",
        altColor: "#8fbce6",
      },
      {
        name: "Milwaukee Brewers",
        abbr: "MIL",
        logo: MLB_BREWERS_LOGO,
        color: "#13294b",
        altColor: "#ffc52f",
      },
    ],
    rules:
      "This market will resolve to the team that wins this MLB game.\n\nExtra innings count. If the game is postponed, the market remains open until it is completed.",
  };
}

const ONBOARDING_NBA_LOGOS = [
  "lal", "bos", "gs", "mia", "chi", "ny", "dal", "den", "phx", "mil",
  "okc", "phi", "lac", "cle", "sa", "min", "hou", "mem", "sac", "ind",
  "atl", "orl", "tor", "bkn", "no", "por", "utah", "det", "cha", "wsh",
].map((abbr) => `https://a.espncdn.com/i/teamlogos/nba/500/${abbr}.png`);

const ONBOARDING_LEAGUE_LOGOS = [
  "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png",
  "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  "https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png",
  "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png",
  "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  "https://a.espncdn.com/i/teamlogos/leagues/500/mls.png",
];

const EPL_MAN_CITY_LOGO = "https://a.espncdn.com/i/teamlogos/soccer/500/382.png";
const EPL_ARSENAL_LOGO = "https://a.espncdn.com/i/teamlogos/soccer/500/359.png";

function createDemoEplMarket(): PolymarketMarketData {
  const city = {
    name: "Manchester City",
    abbr: "MCI",
    logo: EPL_MAN_CITY_LOGO,
    color: "#6cabdd",
    altColor: "#1c2c5b",
  };
  const arsenal = {
    name: "Arsenal",
    abbr: "ARS",
    logo: EPL_ARSENAL_LOGO,
    color: "#ef0107",
    altColor: "#ffffff",
  };
  return {
    marketId: DEMO_EPL_MARKET_ID,
    title: "Man City vs. Arsenal",
    slug: DEMO_EPL_MARKET_ID,
    category: "Sports",
    yesPrice: 0.64,
    noPrice: 0.36,
    volumeUsd: 3_140_000,
    volume24h: 526_000,
    liquidityUsd: 240_000,
    image: null,
    closesAt: null,
    isResolved: false,
    price24hChange: 0.09,
    outcomes: [
      {
        label: "Man City",
        price: 0.64,
        marketId: DEMO_EPL_MARKET_ID,
        slug: DEMO_EPL_MARKET_ID,
        logo: EPL_MAN_CITY_LOGO,
      },
      {
        label: "Arsenal",
        price: 0.36,
        marketId: DEMO_EPL_MARKET_ID,
        slug: DEMO_EPL_MARKET_ID,
        logo: EPL_ARSENAL_LOGO,
      },
    ],
    relatedMarketCount: 1,
    liveGame: {
      league: "Premier League",
      status: "live",
      clock: "2H 67:12",
      away: { ...city, score: 2 },
      home: { ...arsenal, score: 1 },
    },
    teams: [city, arsenal],
    rules:
      "This market will resolve to the team that wins this Premier League match in regulation time, including stoppage time.\n\nIf the match ends in a draw, the market resolves to No for both teams. The resolution source is the official Premier League match report.",
  };
}

/** Search-tab Trending rows — crypto/politics movers matching the product reference. */
function createSearchTrendingDemos(): PolymarketMarketData[] {
  const row = (
    id: string,
    title: string,
    outcome: string,
    price: number,
    change: number,
    category: string,
  ): PolymarketMarketData => ({
    marketId: id,
    title,
    slug: id,
    category,
    yesPrice: price,
    noPrice: Math.max(0.01, 1 - price),
    volumeUsd: 1_200_000,
    volume24h: 340_000,
    liquidityUsd: 90_000,
    image: null,
    closesAt: null,
    isResolved: false,
    price24hChange: change,
    groupItemTitle: outcome,
    outcomes: [
      { label: outcome, price, marketId: id, slug: id },
      {
        label: "No",
        price: Math.max(0.01, 1 - price),
        marketId: id,
        slug: id,
      },
    ],
    relatedMarketCount: 1,
    rules: null,
  });

  return [
    row(
      DEMO_TREND_BTC_ID,
      "BTC price tomorrow at 5pm EDT?",
      "$81,500 or above",
      0.46,
      0.14,
      "Crypto",
    ),
    row(
      DEMO_TREND_FED_HIKE_ID,
      "Fed decision in December?",
      "Hike 25bps",
      0.77,
      0.02,
      "Politics",
    ),
    row(
      DEMO_TREND_FED_FUNDS_ID,
      "Fed funds rate at end of 2027",
      "Above 4.25%",
      0.52,
      0.23,
      "Politics",
    ),
  ];
}

type SearchTrendingRow = {
  market: PolymarketMarketData;
  outcome: string;
  chance: number;
  changePts: number;
  up: boolean;
};

function searchTrendingRow(market: PolymarketMarketData): SearchTrendingRow {
  const top =
    [...(market.outcomes ?? [])].sort((a, b) => b.price - a.price)[0] ?? null;
  const chance = Math.round(
    Math.max(0, Math.min(1, top?.price ?? market.yesPrice)) * 100,
  );
  const changeRaw = market.price24hChange;
  const changePts =
    changeRaw != null
      ? Math.max(1, Math.round(Math.abs(changeRaw) * 100))
      : 2 + (hashString(market.marketId) % 22);
  return {
    market,
    outcome:
      market.groupItemTitle?.trim() ||
      top?.label?.trim() ||
      "Yes",
    chance,
    changePts,
    up: changeRaw == null ? true : changeRaw >= 0,
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

/** Stretch a short trade pool into a longer feed with stable unique keys. */
function expandFeedTrades(
  trades: PolymarketTradeWithPnl[],
  salt: string,
  target: number,
): PolymarketTradeWithPnl[] {
  if (trades.length === 0) return trades;
  if (trades.length >= target) return trades.slice(0, target);

  const out: PolymarketTradeWithPnl[] = [...trades];
  let i = 0;
  while (out.length < target) {
    const base = trades[i % trades.length]!;
    const n = out.length;
    const jitter = 0.82 + ((hashString(`${salt}-${base.wallet}-${n}`) % 35) / 100);
    out.push({
      ...base,
      amountUsd: Math.max(1, Math.round(base.amountUsd * jitter * 100) / 100),
      txHash: `${base.txHash ?? "feed"}-${salt}-${n}`,
      timestamp: base.timestamp
        ? new Date(
            Date.parse(base.timestamp) - n * 47 * 60_000,
          ).toISOString()
        : base.timestamp,
    });
    i += 1;
  }
  return out;
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

function storedTradeFromPosition(
  position: PolymarketWalletPosition,
  wallet: string,
): StoredUserTrade {
  const invested = Math.max(0, position.valueUsd - position.pnlUsd);
  const slug = position.marketSlug ?? position.marketTitle;
  return {
    trade: {
      side: "BUY",
      outcome: position.outcome,
      price: position.avgPrice,
      amountUsd: invested,
      marketTitle: position.marketTitle,
      marketSlug: slug,
      marketCategory: null,
      marketImage: position.image,
      wallet,
      timestamp: new Date(0).toISOString(),
      txHash: `position-${slug}-${position.outcome}`,
      totalPnl: null,
      winRate: null,
      tradeCount: null,
      userCaption: null,
      userGifUrl: null,
    },
    position,
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

/** Demo wallet profile when the API has no data (synthetic float wallets, etc.). */
function seedDemoWalletProfile(
  wallet: string,
  markets: PolymarketMarketData[],
): PolymarketWalletProfile {
  const root = hashString(wallet.toLowerCase());
  const pool = markets.length > 0 ? markets : [];
  const positionCount = 2 + (root % 4);
  const positions: PolymarketWalletPosition[] = [];
  for (let i = 0; i < positionCount; i++) {
    const market =
      pool.length > 0
        ? pool[(root + i * 17) % pool.length]!
        : null;
    const sides = market ? getMarketOddsSides(market) : [];
    const side = sides[(root + i) % Math.max(1, sides.length)];
    const avgPrice = Math.max(
      0.12,
      Math.min(0.88, (side?.price ?? 0.45) * (0.82 + ((root >> i) % 7) * 0.03)),
    );
    const markPrice = Math.max(
      0.08,
      Math.min(0.95, (side?.price ?? 0.52) * (0.9 + ((root >> (i + 3)) % 5) * 0.04)),
    );
    const shares = 40 + ((root + i * 31) % 220);
    const valueUsd = shares * markPrice;
    const costUsd = shares * avgPrice;
    positions.push({
      marketTitle: market?.title ?? `Market ${i + 1}`,
      marketSlug: market?.slug ?? null,
      outcome: side?.label ?? (i % 2 === 0 ? "Yes" : "No"),
      shares,
      avgPrice,
      markPrice,
      valueUsd,
      pnlUsd: valueUsd - costUsd,
      image: market?.image ?? null,
    });
  }

  const recentTrades: PolymarketWalletTrade[] = positions.slice(0, 5).map(
    (position, index) => {
      const hoursAgo = 2 + ((root + index * 11) % 48);
      return {
        side: index % 3 === 0 ? "SELL" : "BUY",
        outcome: position.outcome,
        price: position.avgPrice,
        size: Math.max(8, Math.round(position.shares * (0.25 + (index % 3) * 0.15))),
        marketTitle: position.marketTitle,
        marketSlug: position.marketSlug,
        timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
        txHash: `0xdemo${hashString(`${wallet}:tx:${index}`).toString(16).padStart(60, "0").slice(0, 60)}`,
      };
    },
  );

  const totalPnl = positions.reduce((sum, p) => sum + p.pnlUsd, 0);
  const portfolioValue = Math.max(
    420,
    positions.reduce((sum, p) => sum + p.valueUsd, 0) + 80 + (root % 400),
  );
  const tradeCount = 12 + (root % 90);
  const winRate = 44 + (root % 41);
  const wins = Math.round((tradeCount * winRate) / 100);
  const historyEnd = portfolioValue;
  const history = seedPortfolioHistory(historyEnd).map((point) => ({
    time: point.time,
    value: point.value,
  }));

  return {
    wallet,
    totalPnl,
    realizedPnl: totalPnl * 0.35,
    unrealizedPnl: totalPnl * 0.65,
    roiPercent: 6 + (root % 38) + (root % 10) / 10,
    winRate,
    wins,
    losses: Math.max(0, tradeCount - wins),
    tradeCount,
    totalVolumeUsd: 8_000 + (root % 60_000),
    portfolioValue,
    recentTrades,
    positions,
    history,
  };
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
      color?: string | null;
      altColor?: string | null;
    },
    team:
      | {
          name: string;
          logo: string | null;
          abbr: string | null;
          portrait?: boolean;
          color?: string | null;
          altColor?: string | null;
        }
      | undefined,
  ) =>
    team
      ? {
          ...side,
          name: team.name || side.name,
          logo: team.logo ?? side.logo,
          abbr: team.abbr ?? side.abbr,
          portrait: team.portrait ?? side.portrait,
          color: team.color ?? side.color,
          altColor: team.altColor ?? side.altColor,
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

type TeamTone = {
  /** Button fill. */
  fill: string;
  /** Label color on top of `fill`. */
  ink: string;
  /** Readable accent for text on the dark card. */
  text: string;
};

function parseHex(hex: string): [number, number, number] | null {
  const match = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function saturation([r, g, b]: [number, number, number]): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function mixWithWhite(
  rgb: [number, number, number],
  amount: number,
): [number, number, number] {
  return rgb.map((channel) => channel + (255 - channel) * amount) as [
    number,
    number,
    number,
  ];
}

/** Lighten toward white until luminance reaches `target`. */
function liftToLuminance(
  rgb: [number, number, number],
  target: number,
): [number, number, number] {
  if (relativeLuminance(rgb) >= target) return rgb;
  for (let step = 1; step <= 20; step++) {
    const next = mixWithWhite(rgb, step * 0.05);
    if (relativeLuminance(next) >= target) return next;
  }
  return mixWithWhite(rgb, 1);
}

/** Black, white and greys read as "no color" on a dark card. */
function isUsableTeamColor(rgb: [number, number, number]): boolean {
  return saturation(rgb) >= 0.25 && relativeLuminance(rgb) >= 0.015;
}

function colorDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function toneFromRgb(rgb: [number, number, number]): TeamTone {
  const fill = liftToLuminance(rgb, 0.06);
  return {
    fill: toHex(fill),
    ink: relativeLuminance(fill) > 0.4 ? "#000000" : "#FFFFFF",
    text: toHex(liftToLuminance(rgb, 0.3)),
  };
}

/** Trade colors for both sides of a matchup, derived from team colors. */
function matchupTeamTones(
  market: PolymarketMarketData,
): { away: TeamTone; home: TeamTone } | null {
  if (!isSportsMarket(market)) return null;
  const { away, home } = resolveSportsSides(market);
  const candidates = (side: { color?: string | null; altColor?: string | null }) =>
    [side.color, side.altColor]
      .map((hex) => (hex ? parseHex(hex) : null))
      .filter((rgb): rgb is [number, number, number] => Boolean(rgb && isUsableTeamColor(rgb)));
  const awayOptions = candidates(away);
  const homeOptions = candidates(home);
  const awayRgb = awayOptions[0];
  if (!awayRgb || homeOptions.length === 0) return null;
  // Avoid two near-identical buttons (e.g. two navy teams): use an alternate color.
  const homeRgb =
    homeOptions.find((rgb) => colorDistance(rgb, awayRgb) >= 90) ?? homeOptions[0]!;
  const awayFinal =
    colorDistance(awayRgb, homeRgb) >= 90
      ? awayRgb
      : (awayOptions.slice(1).find((rgb) => colorDistance(rgb, homeRgb) >= 90) ?? awayRgb);
  return { away: toneFromRgb(awayFinal), home: toneFromRgb(homeRgb) };
}

function labelMatchesTeam(
  label: string,
  team: { name: string; abbr?: string | null },
): boolean {
  if (nickMatch(label, team.name)) return true;
  if (team.abbr && nickMatch(label, team.abbr)) return true;
  return false;
}

/** Team fill for one outcome's trade button, matching the market page CTA. */
function outcomeTeamTone(
  market: PolymarketMarketData,
  label: string,
): TeamTone | null {
  const tones = matchupTeamTones(market);
  if (!tones) return null;
  const { away, home } = resolveSportsSides(market);
  const matchesHome = labelMatchesTeam(label, home);
  const matchesAway = labelMatchesTeam(label, away);
  if (matchesHome && !matchesAway) return tones.home;
  if (matchesAway && !matchesHome) return tones.away;

  const sides = getMarketOddsSides(market);
  const index = sides.findIndex(
    (side) =>
      side.label.trim().toLowerCase() === label.trim().toLowerCase() ||
      nickMatch(label, side.label),
  );
  // Never collapse both buttons onto the same tone when the label is unknown.
  if (index < 0) return null;
  return index >= Math.ceil(sides.length / 2) ? tones.home : tones.away;
}

/** Soft glass volume tinted with the outcome's active color. */
function teamPillVolumeStyle(accent: string): CSSProperties {
  return {
    color: accent,
    borderColor: hexToRgba(accent, 0.4),
    backgroundColor: "rgba(0,0,0,0.42)",
    backgroundImage: `linear-gradient(165deg, ${hexToRgba(accent, 0.38)} 0%, ${hexToRgba(accent, 0.14)} 42%, rgba(0,0,0,0.28) 100%)`,
    boxShadow: `inset 0 1px 0 ${hexToRgba(accent, 0.5)}, inset 0 -12px 20px ${hexToRgba(accent, 0.1)}, 0 1px 0 rgba(255,255,255,0.06)`,
  };
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

function formatChancePct(price: number): string {
  return `${Math.round(Math.max(0, Math.min(1, price)) * 100)}%`;
}

/** Shorter hero card under the balance on the first snap page. */
const FEATURED_MARKET_PREVIEW_HEIGHT = 400;

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

const ORDINAL_PERIOD: Record<string, string> = {
  "1st": "Q1",
  "2nd": "Q2",
  "3rd": "Q3",
  "4th": "Q4",
};

/** Parses "Q3 4:18", "4:18 - 3rd", "3rd 4:18" or "42.3 - 4th" into period + seconds left. */
function parseGameClock(
  clock: string,
): { period: string; seconds: number; countUp?: boolean } | null {
  const text = clock.trim();
  const normalizePeriod = (raw: string) => {
    const key = raw.trim().toLowerCase();
    return ORDINAL_PERIOD[key] ?? raw.trim().toUpperCase();
  };
  const toSeconds = (mins: string | undefined, secs: string) =>
    Number(mins ?? 0) * 60 + Math.floor(Number(secs));

  // Soccer halves count up from kickoff: "2H 67:12".
  let match = text.match(/^(1H|2H|ET)\s+(\d{1,3}):(\d{2})$/i);
  if (match) {
    return {
      period: match[1]!.toUpperCase(),
      seconds: toSeconds(match[2], match[3]!),
      countUp: true,
    };
  }
  match = text.match(/^(Q\d|OT\d?|\d(?:st|nd|rd|th))\s+(\d{1,2}):(\d{2})$/i);
  if (match) {
    return { period: normalizePeriod(match[1]!), seconds: toSeconds(match[2], match[3]!) };
  }
  match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d(?:st|nd|rd|th)|OT\d?)$/i);
  if (match) {
    return { period: normalizePeriod(match[3]!), seconds: toSeconds(match[1], match[2]!) };
  }
  match = text.match(/^(\d{1,2}(?:\.\d)?)\s*-\s*(\d(?:st|nd|rd|th)|OT\d?)$/i);
  if (match) {
    return { period: normalizePeriod(match[2]!), seconds: toSeconds(undefined, match[1]!) };
  }
  return null;
}

/** Live game clock: period label + mm:ss counting down between data updates. */
function LivePeriodFlow({
  clock,
  status,
  active = true,
}: {
  clock: string;
  status: string;
  active?: boolean;
}) {
  const parsed = status === "live" ? parseGameClock(clock) : null;
  const period = parsed?.period ?? null;
  const sourceSeconds = parsed?.seconds ?? null;
  const step = parsed?.countUp ? 1 : -1;
  const [seconds, setSeconds] = useState<number | null>(sourceSeconds);

  useEffect(() => {
    setSeconds((prev) => {
      if (sourceSeconds == null) return null;
      // Small drift from the local tick is fine; avoid visible back-jumps.
      if (prev != null && Math.abs(prev - sourceSeconds) <= 3) {
        const ahead = step > 0 ? prev >= sourceSeconds : prev <= sourceSeconds;
        if (ahead) return prev;
      }
      return sourceSeconds;
    });
  }, [period, sourceSeconds, step]);

  useEffect(() => {
    if (!active || sourceSeconds == null) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setSeconds((prev) => (prev == null ? prev : Math.max(0, prev + step)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, period, sourceSeconds, step]);

  if (status === "final") return <>Final</>;
  if (status !== "live") return <>{formatLiveClock(clock, status)}</>;
  if (!period || seconds == null) return <>{clock || "Live"}</>;

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span>{period}</span>
      <span className="inline-flex items-baseline tabular-nums">
        <NumberFlow
          value={Math.floor(seconds / 60)}
          trend={step}
          format={{ useGrouping: false }}
          style={nfMaskStyle}
        />
        <span>:</span>
        <NumberFlow
          value={seconds % 60}
          trend={step}
          format={{ useGrouping: false, minimumIntegerDigits: 2 }}
          style={nfMaskStyle}
        />
      </span>
    </span>
  );
}

const OUTCOME_BAR_COLORS = ["#00D54B", "#4C8DFF", "#FF9F1C", "#FF375F"] as const;

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

const LUKA_FEATURE_CLIP = "/playground/api/clips/luka-doncic.mp4";

type SportClipKind =
  | "baseball"
  | "basketball"
  | "tennis"
  | "soccer"
  | "combat"
  | "motorsport";

type TaggedClip = {
  src: string;
  kind: SportClipKind;
  /** Lowercase tokens matched against market title / teams / league. */
  tags: readonly string[];
};

/** Real highlight moments only — no stock footage. */
const HIGHLIGHT_CLIPS: readonly TaggedClip[] = [
  {
    src: LUKA_FEATURE_CLIP,
    kind: "basketball",
    tags: ["luka", "doncic", "mavericks", "mavs", "dallas"],
  },
  {
    src: "/playground/api/clips/nba-luka-alt.mp4",
    kind: "basketball",
    tags: ["luka", "doncic", "mavericks", "mavs", "dallas"],
  },
  {
    src: "/playground/api/clips/nba-lebron.mp4",
    kind: "basketball",
    tags: ["lebron", "lakers", "james", "los angeles lakers"],
  },
  {
    src: "/playground/api/clips/nba-tatum.mp4",
    kind: "basketball",
    tags: ["tatum", "celtics", "boston"],
  },
  {
    src: "/playground/api/clips/nba-giannis.mp4",
    kind: "basketball",
    tags: ["giannis", "antetokounmpo", "bucks", "milwaukee"],
  },
  {
    src: "/playground/api/clips/nba-martin.mp4",
    kind: "basketball",
    tags: ["martin", "rockets", "sixers", "76ers", "philadelphia"],
  },
  {
    src: "/playground/api/clips/soccer-haaland.mp4",
    kind: "soccer",
    tags: ["haaland", "manchester city", "man city"],
  },
  {
    src: "/playground/api/clips/soccer-messi.mp4",
    kind: "soccer",
    tags: ["messi", "inter miami", "argentina", "barcelona"],
  },
  {
    src: "/playground/api/clips/soccer-messi-2.mp4",
    kind: "soccer",
    tags: ["messi", "inter miami", "argentina", "barcelona"],
  },
  {
    src: "/playground/api/clips/soccer-messi-3.mp4",
    kind: "soccer",
    tags: ["messi", "inter miami", "argentina", "barcelona", "celtic"],
  },
  {
    src: "/playground/api/clips/soccer-messi-4.mp4",
    kind: "soccer",
    tags: ["messi", "celtic", "barcelona"],
  },
  {
    src: "/playground/api/clips/soccer-ronaldo.mp4",
    kind: "soccer",
    tags: ["ronaldo", "cr7", "real madrid", "portugal", "al nassr"],
  },
  {
    src: "/playground/api/clips/soccer-zlatan.mp4",
    kind: "soccer",
    tags: ["zlatan", "ibrahimovic", "sweden", "milan", "premier"],
  },
  {
    src: "/playground/api/clips/soccer-handanovic.mp4",
    kind: "soccer",
    tags: ["inter", "goalkeeper", "serie a", "ulytau", "kazakhstan"],
  },
  {
    src: "/playground/api/clips/mlb-ohtani.mp4",
    kind: "baseball",
    tags: ["ohtani", "shohei", "dodgers", "angels"],
  },
  {
    src: "/playground/api/clips/mlb-judge.mp4",
    kind: "baseball",
    tags: ["judge", "yankees", "aaron"],
  },
  {
    src: "/playground/api/clips/mlb-judge-2.mp4",
    kind: "baseball",
    tags: ["judge", "yankees", "bellinger"],
  },
  {
    src: "/playground/api/clips/mlb-judge-3.mp4",
    kind: "baseball",
    tags: ["judge", "yankees"],
  },
  {
    src: "/playground/api/clips/mlb-semien.mp4",
    kind: "baseball",
    tags: ["semien", "rangers", "texas", "mvp", "american league"],
  },
  {
    src: "/playground/api/clips/mlb-gonzalez.mp4",
    kind: "baseball",
    tags: ["gonzalez", "mlb", "national league", "rookie"],
  },
  {
    src: "/playground/api/clips/ufc-barboza.mp4",
    kind: "combat",
    tags: ["ufc", "mma", "knockout", "barboza", "welterweight", "fight"],
  },
  {
    src: "/playground/api/clips/ufc-ngannou.mp4",
    kind: "combat",
    tags: ["ufc", "mma", "ngannou", "heavyweight", "knockout", "champion"],
  },
  {
    src: "/playground/api/clips/f1-verstappen.mp4",
    kind: "motorsport",
    tags: ["f1", "formula", "verstappen", "australia", "grand prix", "racing"],
  },
];

const CLIP_POOLS: Record<SportClipKind, readonly string[]> = {
  baseball: HIGHLIGHT_CLIPS.filter((c) => c.kind === "baseball").map((c) => c.src),
  basketball: HIGHLIGHT_CLIPS.filter((c) => c.kind === "basketball").map(
    (c) => c.src,
  ),
  tennis: HIGHLIGHT_CLIPS.filter((c) => c.kind === "tennis").map((c) => c.src),
  soccer: HIGHLIGHT_CLIPS.filter((c) => c.kind === "soccer").map((c) => c.src),
  combat: HIGHLIGHT_CLIPS.filter((c) => c.kind === "combat").map((c) => c.src),
  motorsport: HIGHLIGHT_CLIPS.filter((c) => c.kind === "motorsport").map(
    (c) => c.src,
  ),
};

const ALL_HIGHLIGHT_SRCS = HIGHLIGHT_CLIPS.map((c) => c.src).filter(
  (src) => src !== LUKA_FEATURE_CLIP,
);

type MarketClipRef = {
  src: string;
  startRatio: number;
  /** When set, play this many seconds (or full duration if larger). Featured clips use a longer window. */
  windowSec?: number;
};

function marketClipHaystack(market: PolymarketMarketData): string {
  const teams = (market.teams ?? [])
    .map((team) => `${team.name} ${team.abbr ?? ""}`)
    .join(" ");
  const live = market.liveGame
    ? `${market.liveGame.league} ${market.liveGame.away.name} ${market.liveGame.home.name}`
    : "";
  return `${market.title} ${market.category ?? ""} ${teams} ${live}`.toLowerCase();
}

function sportKindForMarket(market: PolymarketMarketData): SportClipKind | null {
  if (!isSportsMarket(market)) return null;
  const haystack = marketClipHaystack(market);
  if (
    /\b(lol:|league of legends|cs2|counter-strike|dota|valorant|esport|lck|lpl|lec)\b/.test(
      haystack,
    )
  ) {
    return null;
  }
  if (
    /\b(nba|wnba|lakers|celtics|pistons|knicks|bulls|spurs|heat|nets|jazz|dunk|basketball|bucks|rockets|warriors|suns|nuggets|mavericks|mavs)\b/.test(
      haystack,
    )
  ) {
    return "basketball";
  }
  if (
    /\b(mlb|baseball|al\b|nl\b|american league|national league|world series|home run|cy young|platinum glove|rookie of the year|ohtani|judge|yankees|dodgers|cubs|red sox|astros|rangers|mets|padres|giants|phillies|braves|bellinger|vargas|messick)\b/.test(
      haystack,
    )
  ) {
    return "baseball";
  }
  if (
    /\b(atp|wta|tennis|cincinnati open|wimbledon|roland\s*garros|us open|australian open|medvedev|swiatek|sakkari|rublev|nakashima)\b/.test(
      haystack,
    ) ||
    /open:\s/.test(haystack)
  ) {
    return "tennis";
  }
  if (
    /\b(epl|mls|ucl|fifa|soccer|premier league|la liga|bundesliga|serie a|ligue 1|world cup|sounders|cardiff|wrexham|haaland|messi|ulytau|kazakhstan)\b/.test(
      haystack,
    ) ||
    /\bfc\b/.test(haystack)
  ) {
    return "soccer";
  }
  if (
    /\b(ufc|mma|fight|welterweight|heavyweight|knockout|chimaev|strickland|bonfim|fortune)\b/.test(
      haystack,
    )
  ) {
    return "combat";
  }
  if (/\b(f1|formula\s*1|grand prix|verstappen|motorsport)\b/.test(haystack)) {
    return "motorsport";
  }
  // Default sports markets to baseball highlights rather than nothing.
  return "baseball";
}

function clipMatchScore(haystack: string, tags: readonly string[]): number {
  let score = 0;
  for (const tag of tags) {
    if (haystack.includes(tag)) score += tag.length >= 5 ? 3 : 2;
  }
  return score;
}

/** Assign unique clip sources across a feed — no repeated video until the pool is exhausted. */
function assignUniqueClips(
  markets: readonly PolymarketMarketData[],
): Map<string, MarketClipRef> {
  const assigned = new Map<string, MarketClipRef>();
  const usedSrc = new Set<string>();

  const takeUnused = (candidates: readonly string[], seed: string) => {
    const pool =
      candidates.length > 0
        ? candidates
        : ALL_HIGHLIGHT_SRCS.filter((src) => src !== LUKA_FEATURE_CLIP);
    const fresh = pool.filter((src) => !usedSrc.has(src));
    if (fresh.length > 0) {
      const src = fresh[hashString(seed) % fresh.length]!;
      usedSrc.add(src);
      return { src, startRatio: 0 } as MarketClipRef;
    }
    // Every highlight already used — scrub a different moment from one of them.
    const src = pool[hashString(seed) % pool.length]!;
    const moment = hashString(`moment:${seed}`) % 5;
    return {
      src,
      startRatio: 0.06 + moment * 0.16,
    } as MarketClipRef;
  };

  for (const market of markets) {
    const id = market.marketId;
    if (assigned.has(id)) continue;

    if (id === DEMO_LIVE_MARKET_ID || market.slug === DEMO_LIVE_MARKET_ID) {
      usedSrc.add(LUKA_FEATURE_CLIP);
      assigned.set(id, {
        src: LUKA_FEATURE_CLIP,
        startRatio: 0,
        windowSec: 22,
      });
      continue;
    }

    if (id === DEMO_F1_MARKET_ID || market.slug === DEMO_F1_MARKET_ID) {
      const f1Clip = "/playground/api/clips/f1-verstappen.mp4";
      usedSrc.add(f1Clip);
      assigned.set(id, { src: f1Clip, startRatio: 0.08 });
      continue;
    }

    const kind = sportKindForMarket(market);
    if (!kind) {
      assigned.set(id, takeUnused(ALL_HIGHLIGHT_SRCS, market.slug || id));
      continue;
    }

    const haystack = marketClipHaystack(market);
    const highlights = HIGHLIGHT_CLIPS.filter(
      (clip) =>
        clip.kind === kind &&
        !usedSrc.has(clip.src) &&
        clip.src !== LUKA_FEATURE_CLIP,
    );
    let best: TaggedClip | null = null;
    let bestScore = 0;
    for (const clip of highlights) {
      const score = clipMatchScore(haystack, clip.tags);
      if (score > bestScore) {
        best = clip;
        bestScore = score;
      }
    }
    if (best && bestScore > 0) {
      usedSrc.add(best.src);
      assigned.set(id, { src: best.src, startRatio: 0 });
      continue;
    }

    const kindPool = (CLIP_POOLS[kind] ?? []).filter(
      (src) => src !== LUKA_FEATURE_CLIP,
    );
    assigned.set(id, takeUnused(kindPool, market.slug || id));
  }

  return assigned;
}

function sportClipForMarket(market: PolymarketMarketData): MarketClipRef | null {
  const kind = sportKindForMarket(market);
  if (!kind) return null;
  if (
    market.marketId === DEMO_LIVE_MARKET_ID ||
    market.slug === DEMO_LIVE_MARKET_ID
  ) {
    return { src: LUKA_FEATURE_CLIP, startRatio: 0, windowSec: 22 };
  }
  if (
    market.marketId === DEMO_F1_MARKET_ID ||
    market.slug === DEMO_F1_MARKET_ID
  ) {
    return { src: "/playground/api/clips/f1-verstappen.mp4", startRatio: 0.08 };
  }
  const assigned = assignUniqueClips([market]);
  return assigned.get(market.marketId) ?? null;
}

function MarketClip({
  clip,
  active = true,
}: {
  clip: MarketClipRef;
  active?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekingRef = useRef(false);
  const startRatio = Math.max(0, Math.min(0.85, clip.startRatio));

  const ensurePlaying = useCallback(() => {
    const video = videoRef.current;
    if (!video || !active || document.hidden) return;
    if (video.paused || video.ended) {
      void video.play().catch(() => {});
    }
  }, [active]);

  const restartWindow = useCallback(() => {
    const video = videoRef.current;
    if (!video || seekingRef.current) return;
    const start = Number(video.dataset.momentStart);
    if (!Number.isFinite(start)) return;
    seekingRef.current = true;
    try {
      video.currentTime = start;
    } catch {
      seekingRef.current = false;
      ensurePlaying();
    }
  }, [ensurePlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active || document.hidden) {
      video.pause();
      return;
    }
    ensurePlaying();
  }, [active, clip.src, ensurePlaying]);

  useEffect(() => {
    const onVis = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden || !active) video.pause();
      else ensurePlaying();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, ensurePlaying]);

  return (
    <video
      ref={videoRef}
      src={clip.src}
      muted
      loop
      playsInline
      preload={active ? "auto" : "metadata"}
      disablePictureInPicture
      controls={false}
      tabIndex={-1}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget;
        if (!Number.isFinite(video.duration) || video.duration <= 1) return;
        // Featured clips can run longer; others keep a short moment window.
        const requested = clip.windowSec;
        const windowSec =
          typeof requested === "number" && requested > 0
            ? Math.min(video.duration, requested)
            : Math.min(8, Math.max(3.5, video.duration * 0.45));
        const start = Math.min(
          video.duration * startRatio,
          Math.max(0, video.duration - windowSec),
        );
        const end = Math.min(video.duration, start + windowSec);
        // Native `loop` covers full-file windows; moment windows seek manually.
        const useNativeLoop = start <= 0.05 && end >= video.duration - 0.15;
        video.dataset.momentStart = String(start);
        video.dataset.momentEnd = String(end);
        video.dataset.nativeLoop = useNativeLoop ? "1" : "0";
        video.loop = useNativeLoop;
        if (start > 0.05) {
          seekingRef.current = true;
          video.currentTime = start;
        }
        ensurePlaying();
      }}
      onSeeked={() => {
        seekingRef.current = false;
        ensurePlaying();
      }}
      onEnded={() => {
        // Fallback if native loop is off or browser drops it mid-window.
        if (!active) return;
        restartWindow();
        ensurePlaying();
      }}
      onWaiting={() => ensurePlaying()}
      onTimeUpdate={(event) => {
        if (!active || seekingRef.current) return;
        const video = event.currentTarget;
        if (video.dataset.nativeLoop === "1") return;
        const end = Number(video.dataset.momentEnd);
        const start = Number(video.dataset.momentStart);
        if (!Number.isFinite(end) || !Number.isFinite(start)) return;
        if (video.currentTime >= end - 0.08) {
          restartWindow();
        }
      }}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
    />
  );
}

function parseMatchupNames(title: string): [string, string] | null {
  const cleaned = title.replace(/\?+$/, "").trim();
  const fight = cleaned.match(/^will\s+(.+?)\s+fight\s+(.+?)(?:\s+next)?$/i);
  if (fight?.[1] && fight[2]) return [fight[1].trim(), fight[2].trim()];
  const vs = cleaned.match(
    /(?:^|:\s*)(.+?)\s+vs\.?\s+(.+?)(?:\s+\([^)]*\))?$/i,
  );
  if (vs?.[1] && vs[2]) {
    const left = vs[1].replace(/^.*:\s*/, "").trim();
    const right = vs[2].replace(/\s+\([^)]*\)\s*$/, "").trim();
    if (left && right && !/^(will|spread|over|under)\b/i.test(left)) {
      return [left, right];
    }
  }
  const at = cleaned.match(/^(.+?)\s+@\s+(.+)$/i);
  if (at?.[1] && at[2]) return [at[1].trim(), at[2].trim()];
  return null;
}

/** True only for real two-sided matchups (both sides named). */
function isTwoSidedMatchup(market: PolymarketMarketData): boolean {
  if (parseMatchupNames(market.title)) return true;
  if ((market.teams?.length ?? 0) >= 2) {
    const a = market.teams![0]?.name?.trim() ?? "";
    const b = market.teams![1]?.name?.trim() ?? "";
    return Boolean(a && b && !nickMatch(a, b));
  }
  const named = (market.outcomes ?? []).filter((outcome) => {
    const label = outcome.label.trim();
    return label.length > 0 && !/^(yes|no)$/i.test(label);
  });
  return named.length >= 2;
}

function canShowSportsMatchHeader(market: PolymarketMarketData): boolean {
  if (!isSportsMarket(market)) return false;
  // Never show the match header for single-side awards / Yes-No futures.
  return isTwoSidedMatchup(market);
}

/** Known ESPN MMA cutouts for fight markets that only expose Yes/No outcomes. */
const FIGHTER_HEADSHOTS: Record<string, string> = {
  "khamzat chimaev":
    "https://a.espncdn.com/i/headshots/mma/players/full/4684751.png",
  "sean strickland":
    "https://a.espncdn.com/i/headshots/mma/players/full/3093653.png",
  "merab dvalishvili":
    "https://a.espncdn.com/i/headshots/mma/players/full/3948572.png",
  "petr yan":
    "https://a.espncdn.com/i/headshots/mma/players/full/4293517.png",
  "gabriel bonfim":
    "https://a.espncdn.com/i/headshots/mma/players/full/4921516.png",
  "tyrell fortune":
    "https://a.espncdn.com/i/headshots/mma/players/full/4065006.png",
  "max verstappen": F1_VERSTAPPEN_HEADSHOT,
  "lando norris": F1_NORRIS_HEADSHOT,
};

function fighterHeadshotUrl(name: string): string | null {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return FIGHTER_HEADSHOTS[key] ?? null;
}

function sportsLeagueLabel(market: PolymarketMarketData): string {
  const haystack =
    `${market.title} ${market.eventTitle ?? ""} ${market.category ?? ""} ${market.liveGame?.league ?? ""} ${marketClipHaystack(market)}`.toLowerCase();

  // Prefer an explicit non-generic league from live data.
  const liveLeague = market.liveGame?.league?.trim();
  if (liveLeague && !/^sports$/i.test(liveLeague)) return liveLeague;

  // F1 — Australian GP when the title says so, otherwise plain F1.
  if (
    sportKindForMarket(market) === "motorsport" ||
    /\b(f1|formula\s*1|grand prix)\b/.test(haystack)
  ) {
    if (/\baustralia|australian\b/.test(haystack)) return "F1 Australia";
    return "F1";
  }

  if (/\bwnba\b/.test(haystack)) return "WNBA";
  if (/\bnba\b|lakers|celtics|pistons|suns|76ers|pelicans|nuggets|thunder/.test(haystack)) {
    return "NBA";
  }
  if (/\bnfl\b|bills|broncos|rams|bears|patriots|chiefs|super bowl/.test(haystack)) {
    return "NFL";
  }
  if (/\bnhl\b|stanley cup/.test(haystack)) return "NHL";
  if (
    /\bmlb\b|world series|platinum glove|cy young|rookie of the year|\bal\b|\bnl\b|american league|national league|yankees|dodgers|cubs|red sox|astros|rangers|mets|padres|giants|phillies|braves|bellinger|vargas|messick|otto lopez\b/.test(
      haystack,
    )
  ) {
    return "MLB";
  }
  if (
    /\b(ufc|mma|bantamweight|welterweight|heavyweight|fight|chimaev|strickland|bonfim|fortune|dvalishvili|petr yan)\b/.test(
      haystack,
    )
  ) {
    return "UFC";
  }
  if (/\bwta\b/.test(haystack)) return "WTA";
  if (
    /\b(atp|tennis|wimbledon|roland\s*garros|french open|australian open|us open|cincinnati open)\b/.test(
      haystack,
    ) ||
    /open:\s/.test(haystack)
  ) {
    return "ATP";
  }
  if (/\bpremier league\b|\bepl\b/.test(haystack)) return "EPL";
  if (/\bchampions league\b|\bucl\b/.test(haystack)) return "UCL";
  if (/\bla liga\b/.test(haystack)) return "La Liga";
  if (/\bbundesliga\b/.test(haystack)) return "Bundesliga";
  if (/\bserie a\b/.test(haystack)) return "Serie A";
  if (/\bligue 1\b/.test(haystack)) return "Ligue 1";
  if (/\bmls\b|sounders|wrexham|cardiff/.test(haystack)) return "MLS";
  if (/\bworld cup\b|\bfifa\b/.test(haystack)) return "FIFA";
  if (/\bkazakhstan premier league\b|ulytau/.test(haystack)) {
    return "KPL";
  }
  if (
    /\b(soccer|football|fc\b|netherlands|haaland|messi)\b/.test(haystack) ||
    sportKindForMarket(market) === "soccer"
  ) {
    return "Soccer";
  }

  const kind = sportKindForMarket(market);
  if (kind === "basketball") return "NBA";
  if (kind === "baseball") return "MLB";
  if (kind === "tennis") return "ATP";
  if (kind === "combat") return "UFC";
  if (kind === "soccer") return "Soccer";

  const category = market.category?.trim();
  if (category && !/^sports$/i.test(category)) return category;
  // Never surface the generic "Sports" label in match headers.
  return kind === "motorsport" ? "F1 Australia" : "Sports";
}

function resolveMatchSides(market: PolymarketMarketData): {
  left: {
    name: string;
    image: string | null;
    abbr: string | null;
    portrait: boolean;
    score: number | null;
  };
  right: {
    name: string;
    image: string | null;
    abbr: string | null;
    portrait: boolean;
    score: number | null;
  };
} {
  const { away, home } = resolveSportsSides(market);
  const parsed = parseMatchupNames(market.title);
  const kind = sportKindForMarket(market);
  // Fighter cutouts for UFC only — F1 header stays text/timer, no photos.
  const personSides = kind === "combat";
  const hideSideImages = kind === "motorsport";
  const teamLeft = market.teams?.[0];
  const teamRight = market.teams?.[1];
  const namedOutcomes = (market.outcomes ?? []).filter((outcome) => {
    const label = outcome.label.trim();
    return label.length > 0 && !/^(yes|no)$/i.test(label);
  });

  const leftName =
    parsed?.[0] ?? teamLeft?.name ?? namedOutcomes[0]?.label ?? away.name;
  const rightName =
    parsed?.[1] ?? teamRight?.name ?? namedOutcomes[1]?.label ?? home.name;

  const isAthleteShot = (url: string | null | undefined) =>
    Boolean(url && /headshots\//i.test(url));
  const isTeamLogo = (url: string | null | undefined) =>
    Boolean(url && /teamlogos\//i.test(url));

  const pickImage = (
    name: string,
    sideLogo?: string | null,
    teamSlotLogo?: string | null,
  ) => {
    if (hideSideImages) return null;
    const outcomeLogo =
      market.outcomes?.find((o) => nickMatch(o.label, name))?.logo ?? null;
    const byTeamName =
      market.teams?.find((team) => nickMatch(team.name, name))?.logo ?? null;
    if (personSides) {
      return (
        (teamSlotLogo && isAthleteShot(teamSlotLogo) ? teamSlotLogo : null) ??
        (sideLogo && isAthleteShot(sideLogo) ? sideLogo : null) ??
        fighterHeadshotUrl(name) ??
        (outcomeLogo && isAthleteShot(outcomeLogo) ? outcomeLogo : null) ??
        teamSlotLogo ??
        sideLogo ??
        outcomeLogo ??
        null
      );
    }
    const candidates = [teamSlotLogo, sideLogo, byTeamName, outcomeLogo];
    return (
      candidates.find((url) => isTeamLogo(url)) ??
      candidates.find((url) => url && !isAthleteShot(url)) ??
      null
    );
  };

  // Always bind left/right to team slots 0/1 when present so both logos show.
  const leftLogo = pickImage(leftName, away.logo, teamLeft?.logo);
  const rightLogo = pickImage(rightName, home.logo, teamRight?.logo);
  return {
    left: {
      name: hideSideImages ? "—" : leftName,
      image: proxyImageSrc(leftLogo),
      abbr: teamLeft?.abbr ?? away.abbr ?? null,
      portrait: personSides,
      score: away.score,
    },
    right: {
      name: hideSideImages ? "—" : rightName,
      image: proxyImageSrc(rightLogo),
      abbr: teamRight?.abbr ?? home.abbr ?? null,
      portrait: personSides,
      score: home.score,
    },
  };
}

/** Per-market countdown length under 24h (stable for a given market id). */
function eventDurationMs(market: PolymarketMarketData): number {
  const seed = hashString(market.marketId || market.slug || market.title);
  return (45 * 60 + (seed % (23 * 3600 - 45 * 60))) * 1000 + (seed % 55) * 1000;
}

/** Target timestamp for countdown (client-only; uses closesAt when within 24h). */
function eventTargetMs(market: PolymarketMarketData, now: number): number {
  if (market.closesAt) {
    const closes = Date.parse(market.closesAt);
    if (Number.isFinite(closes)) {
      const remaining = closes - now;
      if (remaining > 0 && remaining < 24 * 3600_000) return closes;
    }
  }
  return now + eventDurationMs(market);
}

function formatEventWhen(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

function MatchSideVisual({
  name,
  image,
  abbr,
}: {
  name: string;
  image: string | null;
  abbr: string | null;
  portrait?: boolean;
  mode?: "score" | "timer";
}) {
  const [failed, setFailed] = useState(false);
  const label =
    (abbr ?? liveSideName(name)).slice(0, 3).toUpperCase() || "?";
  const isTeamLogo = isTeamLogoSrc(image);
  const logoScale = isTeamLogo ? teamLogoVisualScale(name, abbr, image) : 1;

  if (name === "—") {
    return <span className="mx-auto block h-12 w-12" aria-hidden />;
  }

  // Shared middle box — team logos scaled slightly so they match headshot weight.
  return (
    <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center">
      {image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          onError={() => setFailed(true)}
          style={
            logoScale !== 1 ? { transform: `scale(${logoScale})` } : undefined
          }
          className={
            isTeamLogo
              ? "h-[82%] w-[82%] object-contain"
              : "h-full w-full object-contain"
          }
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[12px] font-semibold tracking-wide text-white/80">
          {label}
        </span>
      )}
    </div>
  );
}

function SportsMatchHeader({
  market,
  active = true,
}: {
  market: PolymarketMarketData;
  active?: boolean;
}) {
  const sides = useMemo(() => resolveMatchSides(market), [market]);
  const game = market.liveGame;
  const hasScore = sides.left.score != null && sides.right.score != null;
  const isLive = game?.status === "live";
  const showScore = hasScore;
  const hidePhotos = sportKindForMarket(market) === "motorsport";
  const league = sportsLeagueLabel(market);
  const [now, setNow] = useState<number | null>(null);
  const [targetMs, setTargetMs] = useState<number | null>(null);

  useEffect(() => {
    if (showScore || !active) return;
    const start = Date.now();
    setNow(start);
    setTargetMs(eventTargetMs(market, start));
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [showScore, market, active]);

  // Shared middle size for live scores and countdown timers.
  const matchValueClass = `text-[32px] font-semibold tabular-nums leading-none tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] ${instrumentSans.className}`;

  if (showScore) {
    const period = game
      ? formatLiveClock(game.clock, game.status)
      : isLive
        ? "Live"
        : null;
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-[12px] font-semibold tracking-[0.04em] text-white/80">
            {league}
          </p>
          {period ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold tabular-nums text-[#FF3B30]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF3B30]" />
              {game ? (
                <LivePeriodFlow
                  clock={game.clock}
                  status={game.status}
                  active={active}
                />
              ) : (
                period
              )}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center justify-center gap-3 px-1">
          <MatchSideVisual
            name={sides.left.name}
            image={sides.left.image}
            abbr={sides.left.abbr}
            portrait={sides.left.portrait}
          />
          <p className={`inline-flex items-center gap-1.5 ${matchValueClass}`}>
            <NumberFlow
              value={sides.left.score!}
              trend={1}
              format={{ useGrouping: false }}
              style={nfMaskStyle}
            />
            <span className="text-[18px] font-semibold leading-none text-white/55">
              -
            </span>
            <NumberFlow
              value={sides.right.score!}
              trend={1}
              format={{ useGrouping: false }}
              style={nfMaskStyle}
            />
          </p>
          <MatchSideVisual
            name={sides.right.name}
            image={sides.right.image}
            abbr={sides.right.abbr}
            portrait={sides.right.portrait}
          />
        </div>
      </div>
    );
  }

  const remaining =
    targetMs != null && now != null ? Math.max(0, targetMs - now) : 0;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const timerReady = targetMs != null && now != null;

  return (
    <div
      className={
        hidePhotos
          ? "relative flex flex-col items-center justify-center px-1"
          : "relative grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-x-2 px-1"
      }
    >
      {hidePhotos ? null : (
        <MatchSideVisual
          name={sides.left.name}
          image={sides.left.image}
          abbr={sides.left.abbr}
          portrait={sides.left.portrait}
        />
      )}
      <div className="flex min-w-0 flex-col items-center justify-center px-1 text-center">
        <p className="text-[12px] font-medium tracking-[0.02em] text-white/45">
          {league}
        </p>
        <p
          className={`mt-1 flex items-baseline justify-center gap-[2px] ${matchValueClass}`}
        >
          <span className="mr-1 text-[15px] font-semibold text-white/75">
            in
          </span>
          {timerReady ? (
            <>
              <NumberFlow
                value={hours}
                trend={-1}
                format={{
                  minimumIntegerDigits: hours >= 100 ? 3 : 2,
                  useGrouping: false,
                }}
                style={nfMaskStyle}
              />
              <span className="text-white/55">:</span>
              <NumberFlow
                value={minutes}
                trend={-1}
                format={{ minimumIntegerDigits: 2, useGrouping: false }}
                style={nfMaskStyle}
              />
              <span className="text-white/55">:</span>
              <NumberFlow
                value={seconds}
                trend={-1}
                format={{ minimumIntegerDigits: 2, useGrouping: false }}
                style={nfMaskStyle}
              />
            </>
          ) : (
            <span className="tabular-nums text-white/40">--:--:--</span>
          )}
        </p>
        <p className="mt-1.5 text-[12px] font-medium text-white/45">
          {targetMs != null ? formatEventWhen(targetMs) : "—"}
        </p>
      </div>
      {hidePhotos ? null : (
        <MatchSideVisual
          name={sides.right.name}
          image={sides.right.image}
          abbr={sides.right.abbr}
          portrait={sides.right.portrait}
        />
      )}
    </div>
  );
}

function PreviewActionPill({
  label,
  price,
  color,
  onClick,
}: {
  label: string;
  price?: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="min-w-0 flex-1 rounded-full border px-3 py-3 text-center text-[16px] font-semibold backdrop-blur-md transition-[filter,opacity] hover:brightness-110"
      style={teamPillVolumeStyle(color)}
    >
      <span className="block truncate">
        {label}
        {price != null ? (
          <>
            {" "}
            <ChanceFlow price={price} />
          </>
        ) : null}
      </span>
    </button>
  );
}

type FloatPositionBubble = {
  id: string;
  handle: string;
  avatarUrl: string;
  pnl: number;
  side: 0 | 1;
  edgePx: number;
  bottomPx: number;
  delayMs: number;
  floatDur: number;
  driftX: number;
  driftY: number;
};

type FeedPositionSelection = {
  trade: PolymarketTradeWithPnl;
  handle?: string;
  avatarUrl?: string | null;
};

const FLOAT_HANDLES = [
  "maya",
  "knox",
  "rio",
  "nova",
  "jax",
  "luna",
  "cole",
  "aria",
  "zane",
  "ivy",
  "reed",
  "sage",
  "knoxx",
  "remi",
  "theo",
  "wren",
  "kai",
  "eden",
  "ash",
  "mila",
  "leo",
  "nina",
  "omar",
  "skye",
] as const;

/** Synthetic feed trade so preview uspics open the same position sheet as the feed. */
const FEED_TRADES_STORAGE_KEY = "api-playground-feed-trades-v1";
const DEMO_PROFILE_STORAGE_KEY = "api-playground-demo-profile-v1";

const MAX_PROFILE_POSITIONS = 5;
const FLOAT_PNL_MIN = 450;
const FLOAT_PNL_MAX = 2_239;

function tradeFromFloatBubble(
  bubble: FloatPositionBubble,
  market: PolymarketMarketData,
  livePnl: number,
): PolymarketTradeWithPnl {
  const sides = getMarketOddsSides(market);
  const outcome = sides[bubble.side] ?? sides[0]!;
  const price = Math.max(0.08, Math.min(0.92, outcome.price || 0.5));
  const walletHex = hashString(bubble.id).toString(16).padStart(40, "0").slice(0, 40);
  const txHex = hashString(`${bubble.id}:tx`)
    .toString(16)
    .padStart(64, "0")
    .slice(0, 64);
  const wallet = `0x${walletHex}`;
  const txHash = `0x${txHex}`;
  const seed = hashString(`${wallet}-${txHash}`);
  const markMove = 0.08 + (seed % 22) / 100;
  const amountUsd = Math.max(50, Math.round(Math.max(24, livePnl) / markMove));
  const hoursAgo = 1 + (seed % 36);
  return {
    side: "BUY",
    outcome: outcome.label,
    price,
    amountUsd,
    marketTitle: market.title,
    marketSlug: market.slug,
    marketCategory: market.category,
    marketImage: market.image,
    wallet,
    timestamp: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    txHash,
    totalPnl: Math.round(livePnl * (2.4 + (seed % 5) * 0.35)),
    winRate: 46 + (seed % 42),
    tradeCount: 8 + (seed % 90),
  };
}

/** Deterministic “top positions” stickers per market — 3 left, 2 right, corner-hugged. */
function buildFloatPositions(marketId: string): FloatPositionBubble[] {
  const leftCount = 3;
  const rightCount = 2;
  const raw: FloatPositionBubble[] = [];
  const usedPhotoKeys = new Set<string>();
  const usedHandles = new Set<string>();

  /** Solid JPEG portraits — no transparent cutouts. */
  const uniquePhoto = (seed: string) => {
    const h = hashString(seed);
    for (let attempt = 0; attempt < 120; attempt++) {
      const gender = (h + attempt) % 2 === 0 ? "men" : "women";
      const id = (h + attempt * 13) % 99;
      const key = `${gender}:${id}`;
      if (usedPhotoKeys.has(key)) continue;
      usedPhotoKeys.add(key);
      return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
    }
    const gender = h % 2 === 0 ? "men" : "women";
    const id = h % 99;
    return `https://randomuser.me/api/portraits/${gender}/${id}.jpg`;
  };

  const uniqueHandle = (seed: string) => {
    const h = hashString(`${seed}:handle`);
    for (let attempt = 0; attempt < FLOAT_HANDLES.length; attempt++) {
      const name = FLOAT_HANDLES[(h + attempt) % FLOAT_HANDLES.length]!;
      if (usedHandles.has(name)) continue;
      usedHandles.add(name);
      return name;
    }
    return `${FLOAT_HANDLES[h % FLOAT_HANDLES.length]}${(h % 90) + 10}`;
  };

  const pushSide = (side: 0 | 1, count: number) => {
    // Avatar is 44px; keep clear vertical gaps so rings don't overlap.
    const stackGap = 64;
    const baseBottom = 8 + (hashString(`${marketId}:base:${side}`) % 8);
    const sideBubbles: FloatPositionBubble[] = [];
    for (let n = 0; n < count; n++) {
      const seed = `${marketId}::side${side}::${n}`;
      const h = hashString(seed);
      const pnl =
        FLOAT_PNL_MIN +
        (Math.abs(hashString(`${seed}:pnl`)) % (FLOAT_PNL_MAX - FLOAT_PNL_MIN + 1));
      // Inset from corners so drift + PnL badge stay inside the card.
      const edgePx = 10 + (h % 6) + n * 2;
      // n=0 is lowest; highest n sits at the top of the stack.
      const bottomPx = baseBottom + n * stackGap + ((h >>> 3) % 4);
      const driftX = (1.2 + (h % 3) * 0.4) * (side === 0 ? 1 : -1);
      const driftY = (1.5 + ((h >>> 6) % 3) * 0.4) * ((h >>> 3) % 2 === 0 ? 1 : -1);
      sideBubbles.push({
        id: seed,
        handle: uniqueHandle(seed),
        avatarUrl: uniquePhoto(seed),
        pnl,
        side,
        edgePx,
        bottomPx,
        delayMs: 0,
        floatDur: 5.5 + ((h >>> 2) % 25) / 10,
        driftX,
        driftY,
      });
    }

    // Assign PnLs so the visually top bubble always has the largest value.
    const pnls = sideBubbles
      .map((bubble) => bubble.pnl)
      .sort((a, b) => a - b);
    const byHeight = [...sideBubbles].sort((a, b) => a.bottomPx - b.bottomPx);
    byHeight.forEach((bubble, index) => {
      bubble.pnl = pnls[index]!;
    });
    // Nudge the top one clearly ahead of the rest.
    if (byHeight.length >= 2) {
      const top = byHeight[byHeight.length - 1]!;
      const below = byHeight[byHeight.length - 2]!;
      top.pnl = Math.min(
        FLOAT_PNL_MAX,
        Math.max(top.pnl, below.pnl + 80 + (hashString(`${marketId}:top:${side}`) % 220)),
      );
    }
    raw.push(...sideBubbles);
  };

  pushSide(0, leftCount);
  pushSide(1, rightCount);

  const order = [...raw].sort(
    (a, b) => hashString(`${a.id}:ord`) - hashString(`${b.id}:ord`),
  );
  order.forEach((bubble, index) => {
    bubble.delayMs = 60 + index * 95 + (hashString(bubble.id) % 70);
  });
  return order;
}

function FloatingTopPositions({
  market,
  onOpenPosition,
  active = true,
}: {
  market: PolymarketMarketData;
  onOpenPosition?: (selection: FeedPositionSelection) => void;
  active?: boolean;
}) {
  const bubbles = useMemo(
    () => buildFloatPositions(market.marketId),
    [market.marketId],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [livePnl, setLivePnl] = useState<Record<string, number>>(() =>
    Object.fromEntries(bubbles.map((b) => [b.id, b.pnl])),
  );
  const show = active && visible;

  useEffect(() => {
    setLivePnl(Object.fromEntries(bubbles.map((b) => [b.id, b.pnl])));
  }, [bubbles]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.35));
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [market.marketId]);

  useEffect(() => {
    if (!show || bubbles.length === 0) return;
    let timeout = 0;
    const schedule = () => {
      // Rare ticks — avoid constant React churn on every card.
      const wait = 14_000 + Math.floor(Math.random() * 16_000);
      timeout = window.setTimeout(() => {
        if (document.hidden) {
          schedule();
          return;
        }
        const target = bubbles[Math.floor(Math.random() * bubbles.length)]!;
        const delta =
          (12 + Math.floor(Math.random() * 48)) *
          (Math.random() > 0.35 ? 1 : -1);
        setLivePnl((prev) => {
          const current = prev[target.id] ?? target.pnl;
          return {
            ...prev,
            [target.id]: Math.min(
              FLOAT_PNL_MAX,
              Math.max(FLOAT_PNL_MIN, current + delta),
            ),
          };
        });
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, [show, bubbles]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none relative mb-1 h-[220px] w-full overflow-visible"
    >
      {bubbles.map((bubble) => {
        const pnl = Math.round(livePnl[bubble.id] ?? bubble.pnl);
        return (
          <div
            key={bubble.id}
            className={`absolute origin-center transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] ${
              show
                ? "opacity-100 scale-100"
                : "opacity-0 scale-50"
            }`}
            style={{
              ...(bubble.side === 0
                ? { left: bubble.edgePx }
                : { right: bubble.edgePx }),
              bottom: bubble.bottomPx,
              transitionDelay: show ? `${bubble.delayMs}ms` : "0ms",
            }}
          >
            <button
              type="button"
              aria-label={`Open top position +$${pnl.toLocaleString("en-US")}`}
              className="pointer-events-auto relative h-11 w-11 cursor-pointer appearance-none border-0 bg-transparent p-0"
              style={
                show
                  ? ({
                      ["--float-x"]: `${bubble.driftX}px`,
                      ["--float-y"]: `${bubble.driftY}px`,
                      animation: `api-float-drift ${bubble.floatDur}s ease-in-out ${bubble.delayMs + 400}ms infinite`,
                    } as CSSProperties)
                  : undefined
              }
              onClick={(event) => {
                event.stopPropagation();
                onOpenPosition?.({
                  trade: tradeFromFloatBubble(bubble, market, pnl),
                  handle: bubble.handle,
                  avatarUrl: bubble.avatarUrl,
                });
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bubble.avatarUrl}
                alt=""
                className="h-full w-full rounded-full bg-[#2a2a2e] object-cover shadow-[0_6px_18px_rgba(0,0,0,0.45)] ring-2 ring-white/30"
                draggable={false}
                loading="lazy"
                decoding="async"
              />
              <span
                className="api-pnl-shine pointer-events-none absolute -bottom-1.5 left-1/2 inline-flex -translate-x-1/2 items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-black/45 px-2 py-1.5 text-[11px] font-semibold leading-none tabular-nums tracking-tight text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.35)] backdrop-blur-md"
              >
                +${pnl.toLocaleString("en-US")}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Shared shell — radius clipping lives in `.api-market-preview` (globals.css). */
const MARKET_PREVIEW_CLIP =
  "api-market-preview w-full cursor-pointer text-left";

/** Eased top + bottom darkening so the scrim has no visible bands. */
const PREVIEW_SCRIM = [
  "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.5) 8%, rgba(0,0,0,0.36) 16%, rgba(0,0,0,0.22) 24%, rgba(0,0,0,0.1) 32%, rgba(0,0,0,0.03) 38%, transparent 44%)",
  "linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.9) 10%, rgba(0,0,0,0.78) 20%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.22) 50%, rgba(0,0,0,0.09) 58%, rgba(0,0,0,0.02) 64%, transparent 70%)",
].join(", ");

function MarketPreviewMedia({
  market,
  clip,
  accent,
  active = true,
}: {
  market: PolymarketMarketData;
  clip: MarketClipRef | null;
  accent: string;
  /** Only the on-screen (or adjacent) card should decode/play video. */
  active?: boolean;
}) {
  const poster = proxyImageSrc(market.image);
  return (
    <div className="api-market-preview-media">
      {clip && active ? (
        <MarketClip clip={clip} active={active} />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      ) : clip && !active ? (
        // Keep a dark plate while off-screen so snap pages stay cheap.
        <div className="absolute inset-0 bg-black" />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: accent }} />
      )}
      <div aria-hidden className="api-progressive-blur h-[34%]" data-edge="top">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div aria-hidden className="api-progressive-blur h-[52%]" data-edge="bottom">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 z-[2]"
        style={{ backgroundImage: PREVIEW_SCRIM }}
      />
      <MarketAmbient market={market} accent={accent} active={active} />
    </div>
  );
}

/** Slow team-colored glows rising from behind the trade buttons. */
function MarketAmbient({
  market,
  accent,
  active,
}: {
  market: PolymarketMarketData;
  accent: string;
  active: boolean;
}) {
  const tones = matchupTeamTones(market);
  const left = tones?.away.text ?? accent;
  const right = tones?.home.text ?? accent;
  const glow = (color: string) =>
    `radial-gradient(closest-side, ${hexToRgba(color, 0.85)} 0%, ${hexToRgba(color, 0.4)} 42%, ${hexToRgba(color, 0.12)} 72%, transparent 100%)`;
  return (
    <div aria-hidden className="api-market-ambient" data-active={active}>
      <span data-side="left" style={{ backgroundImage: glow(left) }} />
      <span data-side="right" style={{ backgroundImage: glow(right) }} />
    </div>
  );
}

function marketScheduleLabel(market: PolymarketMarketData): string | null {
  const game = market.liveGame;
  if (game?.status === "live") {
    return formatLiveClock(game.clock, game.status);
  }
  if (market.closesAt) {
    const closes = Date.parse(market.closesAt);
    if (Number.isFinite(closes)) {
      const when = new Date(closes);
      const now = new Date();
      const sameDay =
        when.getFullYear() === now.getFullYear() &&
        when.getMonth() === now.getMonth() &&
        when.getDate() === now.getDate();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isTomorrow =
        when.getFullYear() === tomorrow.getFullYear() &&
        when.getMonth() === tomorrow.getMonth() &&
        when.getDate() === tomorrow.getDate();
      const time = when.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      if (sameDay) return `Today, ${time}`;
      if (isTomorrow) return `Tomorrow, ${time}`;
      return when.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }
  return null;
}

function TrendingMarketCard({
  market,
  onOpen,
  onTrade,
  onOpenPosition,
  fill = false,
  height = FEATURED_MARKET_PREVIEW_HEIGHT,
  clip: clipOverride = null,
  active = true,
  autoSwipeInsights = false,
}: {
  market: PolymarketMarketData;
  onOpen: (market: PolymarketMarketData) => void;
  onTrade?: (market: PolymarketMarketData, outcome?: string) => void;
  onOpenPosition?: (selection: FeedPositionSelection) => void;
  /** Stretch to the parent height (full snap page above the tab bar). */
  fill?: boolean;
  height?: number;
  clip?: MarketClipRef | null;
  /** When false, skip video decode / timers / float motion. */
  active?: boolean;
  /** Landing embed: auto-flip buttons ↔ insights. */
  autoSwipeInsights?: boolean;
}) {
  const odds = previewOdds(market);
  const clip = clipOverride ?? sportClipForMarket(market);
  const accent = useImageAccent(market.image);
  const volume = market.volumeUsd || market.volume24h;
  const openTrade = (outcome?: string) => {
    if (onTrade) onTrade(market, outcome);
    else onOpen(market);
  };

  type Pill = {
    key: string;
    label: string;
    price?: number;
    color: string;
    outcome?: string;
  };
  let pills: Pill[] = [];

  if (isSportsMarket(market)) {
    const { away, home, awayOdds, homeOdds } = resolveSportsSides(market);
    const tones = matchupTeamTones(market);
    const awayPrice = awayOdds?.price ?? market.yesPrice;
    const homePrice = homeOdds?.price ?? market.noPrice;
    const outcomes = (market.outcomes ?? []).filter(
      (outcome) => outcome.label.trim().length > 0,
    );
    const draw = outcomes.find((outcome) =>
      /\bdraw\b|\btie\b/i.test(outcome.label),
    );
    const awayAbbr =
      sportsOutcomeAbbr(market, away.name) ??
      (away.abbr ?? liveSideName(away.name)).slice(0, 3).toUpperCase();
    const homeAbbr =
      sportsOutcomeAbbr(market, home.name) ??
      (home.abbr ?? liveSideName(home.name)).slice(0, 3).toUpperCase();
    pills = draw
      ? [
          {
            key: "away",
            label: awayAbbr,
            price: awayPrice,
            color: tones?.away.text ?? "#C4B5FD",
            outcome: away.name,
          },
          {
            key: "draw",
            label: "Draw",
            price: draw.price,
            color: "#FFFFFF",
            outcome: draw.label,
          },
          {
            key: "home",
            label: homeAbbr,
            price: homePrice,
            color: tones?.home.text ?? "#E8C44A",
            outcome: home.name,
          },
        ]
      : [
          {
            key: "away",
            label: awayAbbr,
            price: awayPrice,
            color: tones?.away.text ?? "#C4B5FD",
            outcome: away.name,
          },
          {
            key: "home",
            label: homeAbbr,
            price: homePrice,
            color: tones?.home.text ?? "#E8C44A",
            outcome: home.name,
          },
        ];
  } else {
    const isBinary =
      isBinaryMarket(market) ||
      odds.shown.every((row) =>
        /^(yes|no|up|down)$/i.test(row.label.trim()),
      );

    if (isBinary && odds.shown.length >= 1) {
      const primary = odds.shown[0];
      const secondary =
        odds.shown[1] ??
        ({
          label: /^(yes|up)$/i.test(primary.label) ? "No" : "Yes",
          price: Math.max(0, 1 - primary.price),
          key: "secondary",
        } as const);
      const normalize = (label: string) =>
        /up/i.test(label)
          ? "UP"
          : /down/i.test(label)
            ? "DOWN"
            : /^(yes|no)$/i.test(label)
              ? label
              : formatOutcomeLabel(label);
      const toneFor = (label: string) =>
        /^(yes|up)$/i.test(label)
          ? "#00D54B"
          : /^(no|down)$/i.test(label)
            ? "#FF375F"
            : "#FFFFFF";
      const primaryLabel = normalize(primary.label);
      const secondaryLabel = normalize(secondary.label);
      pills = [
        {
          key: "primary",
          label: primaryLabel,
          price: primary.price,
          color: toneFor(primaryLabel),
          outcome: primary.label,
        },
        {
          key: "secondary",
          label: secondaryLabel,
          price: secondary.price,
          color: toneFor(secondaryLabel),
          outcome: secondary.label,
        },
      ];
    } else {
      const shown = odds.shown.slice(0, 2);
      const relatedExtra = Math.max(0, (market.relatedMarketCount ?? 0) - 1);
      pills =
        relatedExtra > 1
          ? [
              {
                key: "more",
                label: `${relatedExtra} more markets`,
                color: "#FFFFFF",
              },
            ]
          : shown.map((outcome, index) => ({
              key: outcome.key,
              label: formatOutcomeLabel(outcome.label),
              price: outcome.price,
              color: OUTCOME_BAR_COLORS[index % OUTCOME_BAR_COLORS.length],
              outcome: outcome.label,
            }));
    }
  }

  const schedule = marketScheduleLabel(market);
  const eyebrow = isSportsMarket(market)
    ? [
        market.liveGame?.league ?? market.category ?? "Sports",
        schedule,
      ]
        .filter(Boolean)
        .join(" · ")
    : volume > 0
      ? `${formatUsd(volume)} Vol.`
      : market.category;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${market.title}`}
      onClick={() => onOpen(market)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(market);
        }
      }}
      className={`${MARKET_PREVIEW_CLIP} ${fill ? "h-full min-h-0" : ""}`}
      style={fill ? undefined : { height }}
    >
      <MarketPreviewMedia
        market={market}
        clip={clip}
        accent={accent}
        active={active}
      />

      <div className="relative z-10 flex h-full flex-col px-4 pb-4 pt-3.5">
        {canShowSportsMatchHeader(market) ? (
          <SportsMatchHeader market={market} active={active} />
        ) : (
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[12px] font-semibold tracking-[0.04em] text-white/70">
                {eyebrow}
              </p>
            ) : null}
            <p className="mt-1.5 line-clamp-3 text-[22px] font-semibold leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
              {market.title}
            </p>
          </div>
        )}

        <MarketInsightsPager
          market={market}
          enabled={Boolean(clip)}
          autoSwipe={autoSwipeInsights && active}
        >
          <div className="relative">
            <FloatingTopPositions
              market={market}
              onOpenPosition={onOpenPosition}
              active={active}
            />
            <div className="flex gap-2">
              {pills.map((pill) => (
                <PreviewActionPill
                  key={pill.key}
                  label={pill.label}
                  price={pill.price}
                  color={pill.color}
                  onClick={() => {
                    if (pill.outcome) openTrade(pill.outcome);
                    else onOpen(market);
                  }}
                />
              ))}
            </div>
          </div>
        </MarketInsightsPager>
      </div>
    </div>
  );
}

function leaderboardWinRate(wallet: { wallet: string; winRate: number }): number {
  if (wallet.winRate > 0) return Math.round(wallet.winRate);
  return 52 + (Math.abs(hashString(wallet.wallet.toLowerCase())) % 27);
}

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

function teamShortLabel(name: string): string {
  return name.trim().split(/\s+/).at(-1) ?? name;
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

/** True for ESPN team marks, including image-proxy encoded URLs. */
function isTeamLogoSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    const raw = src.includes("url=")
      ? decodeURIComponent(src.slice(src.indexOf("url=") + 4))
      : src;
    return /teamlogos\//i.test(raw);
  } catch {
    return /teamlogos/i.test(src);
  }
}

/** Optical scale so logos that fill the ESPN canvas match padded marks (e.g. Lakers). */
function teamLogoVisualScale(
  name: string,
  abbr?: string | null,
  src?: string | null,
): number {
  const key = `${abbr ?? ""} ${name} ${src ?? ""}`.toLowerCase();
  // GSW bridge mark fills the asset a bit more — nudge it down only slightly.
  if (/warriors|\bgsw\b|gs\.png|(^|[^a-z])gs([^a-z]|$)/.test(key)) return 0.84;
  return 1;
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

const SPORTS_RANGE_SECS: Record<SportsChartRange, number> = {
  "1H": 60 * 60,
  "6H": 6 * 60 * 60,
  "1D": 24 * 60 * 60,
  "1W": 7 * 24 * 60 * 60,
  "1M": 30 * 24 * 60 * 60,
  MAX: 90 * 24 * 60 * 60,
};

const SPORTS_CHART_STEPS = 96;

function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded two-way odds history ending at `endPercent` now. Walked backwards
 * from the current price with noise + occasional swings (scores, news).
 */
function sportsOddsHistory(
  endPercent: number,
  seed: number,
  rangeSecs: number,
): LivelinePoint[] {
  const now = Math.floor(Date.now() / 1000);
  const stepSecs = rangeSecs / (SPORTS_CHART_STEPS - 1);
  const rand = seededRandom(seed ^ Math.round(rangeSecs));
  const end = Math.max(3, Math.min(97, endPercent));
  const volatility = 0.35 + Math.log10(rangeSecs / 3600 + 1) * 0.55;
  const values: number[] = [end];
  let value = end;
  for (let i = 1; i < SPORTS_CHART_STEPS; i++) {
    const noise = (rand() - 0.5) * 2 * volatility;
    const swing = rand() < 0.05 ? (rand() - 0.5) * volatility * 10 : 0;
    const rail = value < 8 ? 0.6 : value > 92 ? -0.6 : 0;
    value = Math.max(2, Math.min(98, value + noise + swing + rail));
    values.push(value);
  }
  values.reverse();
  // Light smoothing keeps swings readable without flattening them; the last
  // point stays pinned to today's price.
  const smoothed = values.map((_, i) => {
    const prev = values[Math.max(0, i - 1)]!;
    const next = values[Math.min(values.length - 1, i + 1)]!;
    return (prev + values[i]! * 2 + next) / 4;
  });
  smoothed[smoothed.length - 1] = end;
  return smoothed.map((v, i) => ({
    time: Math.round(now - (SPORTS_CHART_STEPS - 1 - i) * stepSecs),
    value: Math.round(v * 10) / 10,
  }));
}

function formatSportsChartTime(time: number, rangeSecs: number): string {
  const date = new Date(time * 1000);
  if (rangeSecs <= 24 * 60 * 60) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function proxyImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  try {
    const url = new URL(src.startsWith("//") ? `https:${src}` : src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return src;
    return `/api/image-proxy?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return src;
  }
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
  size?: "sm" | "md" | "lg" | "header" | "hero";
  portrait?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const label = (abbr ?? liveSideName(name)).slice(0, 3).toUpperCase();
  const face = portrait || /\.jpe?g(?:$|\?)/i.test(logo ?? "");
  const src = proxyImageSrc(logo);
  const isTeamLogo = isTeamLogoSrc(logo);
  const logoScale =
    !face && isTeamLogo ? teamLogoVisualScale(name, abbr, logo) : 1;
  const box =
    size === "hero"
      ? "h-16 w-16 rounded-full text-[13px]"
      : size === "header"
      ? "h-11 w-11 rounded-full text-[11px]"
      : size === "lg"
        ? "h-14 w-14 rounded-[10px] text-[12px]"
        : size === "sm"
          ? "h-7 w-7 rounded-full text-[9px]"
          : "h-10 w-10 rounded-[8px] text-[10px]";
  const img =
    size === "hero"
      ? "h-16 w-16"
      : size === "header"
      ? "h-11 w-11"
      : size === "lg"
        ? "h-14 w-14"
        : size === "sm"
          ? "h-7 w-7"
          : "h-10 w-10";
  // Team logos keep their own shape; only headshots get cropped to a circle.
  const round =
    size === "hero"
      ? face
        ? "rounded-full object-cover"
        : "object-contain"
      : size === "sm" || size === "header" || face
      ? "rounded-full object-cover"
      : "object-contain";

  if (!src || failed) {
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
      src={src}
      alt=""
      onError={() => setFailed(true)}
      style={logoScale !== 1 ? { transform: `scale(${logoScale})` } : undefined}
      className={`${img} ${round}`}
    />
  );
}

function LiveGameCard({
  market,
  onOpen,
  onTrade,
  onOpenPosition,
  featured = false,
  fill = false,
  height = FEATURED_MARKET_PREVIEW_HEIGHT,
  clip: clipOverride = null,
  active = true,
  autoSwipeInsights = false,
}: {
  market: PolymarketMarketData;
  onOpen: (market: PolymarketMarketData) => void;
  onTrade?: (market: PolymarketMarketData, outcome: string) => void;
  onOpenPosition?: (selection: FeedPositionSelection) => void;
  featured?: boolean;
  fill?: boolean;
  height?: number;
  clip?: MarketClipRef | null;
  active?: boolean;
  autoSwipeInsights?: boolean;
}) {
  const { game, away, home, awayOdds, homeOdds } = resolveSportsSides(market);
  const accent = useImageAccent(
    market.image ?? away.logo ?? home.logo ?? null,
  );
  const clip = clipOverride ?? sportClipForMarket(market);
  const isLive = game?.status === "live";
  const hasScore = away.score != null && home.score != null;
  const period = game ? formatLiveClock(game.clock, game.status) : "Sports";
  const league = game?.league ?? market.category ?? "Sports";
  const awayPrice = awayOdds?.price ?? market.yesPrice;
  const homePrice = homeOdds?.price ?? market.noPrice;
  const tradeOutcomes = (() => {
    const listed = market.outcomes ?? [];
    if (listed.length >= 2) return listed.slice(0, 3);
    return [
      { label: away.name, price: awayPrice, marketId: market.marketId, slug: market.slug },
      { label: home.name, price: homePrice, marketId: market.marketId, slug: market.slug },
    ];
  })();

  if (!featured) {
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
              <ChanceFlow price={awayPrice} />
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
              className={`text-[28px] font-semibold tabular-nums leading-none tracking-tight text-white ${instrumentSans.className}`}
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
              <ChanceFlow price={homePrice} />
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${market.title}`}
      onClick={() => onOpen(market)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(market);
        }
      }}
      className={`${MARKET_PREVIEW_CLIP} ${fill ? "h-full min-h-0" : ""}`}
      style={fill ? undefined : { height }}
    >
      <MarketPreviewMedia
        market={market}
        clip={clip}
        accent={accent}
        active={active}
      />

      <div className="relative z-10 flex h-full flex-col px-4 pb-4 pt-3.5">
        <SportsMatchHeader market={market} active={active} />

        {onTrade ? (
          <MarketInsightsPager
            market={market}
            enabled={Boolean(clip)}
            autoSwipe={autoSwipeInsights && active}
          >
            <div className="relative">
              <FloatingTopPositions
                market={market}
                onOpenPosition={onOpenPosition}
                active={active}
              />
              <div className="flex gap-2">
                {tradeOutcomes.map((outcome, index) => {
                  const isDraw = /draw/i.test(outcome.label);
                  const name =
                    sportsOutcomeAbbr(market, outcome.label) ??
                    (isDraw ? "Draw" : liveSideName(outcome.label));
                  const teamTone = outcomeTeamTone(market, outcome.label);
                  const accent = isDraw
                    ? "#FFFFFF"
                    : (teamTone?.text ??
                      (nickMatch(outcome.label, away.name) || index === 0
                        ? "#C4B5FD"
                        : "#E8C44A"));
                  return (
                    <button
                      key={`${outcome.marketId}-${outcome.label}`}
                      type="button"
                      data-sfx="press"
                      onClick={(event) => {
                        event.stopPropagation();
                        onTrade(market, outcome.label);
                      }}
                      className="min-w-0 flex-1 rounded-full border py-3 text-[16px] font-semibold backdrop-blur-md transition-[filter,opacity] hover:brightness-110"
                      style={teamPillVolumeStyle(accent)}
                    >
                      {name} <ChanceFlow price={outcome.price} />
                    </button>
                  );
                })}
              </div>
            </div>
          </MarketInsightsPager>
        ) : null}
      </div>
    </div>
  );
}

const SPORTS_CHART_PAD = { top: 12, right: 8, bottom: 26, left: 4 } as const;

/** Two-way odds history on liveline: both sides always sum to 100%. */
function SportsOddsChart({
  awayPct,
  awayColor,
  homeColor,
  awayLabel,
  homeLabel,
  seed,
  range,
}: {
  awayPct: number;
  awayColor: string;
  homeColor: string;
  awayLabel: string;
  homeLabel: string;
  seed: number;
  range: SportsChartRange;
}) {
  const rangeSecs = SPORTS_RANGE_SECS[range];
  const homePct = 100 - awayPct;
  const awayData = useMemo(
    () => sportsOddsHistory(awayPct, seed, rangeSecs),
    [awayPct, seed, rangeSecs],
  );
  const homeData = useMemo(
    () =>
      awayData.map((point) => ({
        time: point.time,
        value: Math.round((100 - point.value) * 10) / 10,
      })),
    [awayData],
  );

  return (
    <div className="relative h-[156px] w-full">
      <div className="api-odds-chart absolute inset-y-0 left-0 right-[3.75rem]">
        <Liveline
          data={awayData}
          value={awayPct}
          series={[
            { id: "away", data: awayData, value: awayPct, color: awayColor },
            { id: "home", data: homeData, value: homePct, color: homeColor },
          ]}
          theme="dark"
          grid={false}
          badge={false}
          pulse={false}
          momentum={false}
          scrub
          paused
          showValue={false}
          lineWidth={2}
          window={rangeSecs}
          formatValue={(v) => `${Math.round(v)}%`}
          formatTime={(t) => formatSportsChartTime(t, rangeSecs)}
          padding={SPORTS_CHART_PAD}
          className="h-full w-full"
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-center gap-0.5 pb-3 text-right">
        <p
          className={`text-[18px] font-semibold leading-none tabular-nums ${instrumentSans.className}`}
          style={{ color: awayColor }}
        >
          <NumberFlow
            value={Math.round(awayPct)}
            suffix="%"
            trend={0}
            style={nfMaskStyle}
          />
        </p>
        <p className="text-[11px] font-semibold leading-none" style={{ color: awayColor }}>
          {awayLabel}
        </p>
        <p
          className="mt-2 text-[11px] font-semibold leading-none"
          style={{ color: homeColor }}
        >
          {homeLabel}
        </p>
        <p
          className={`text-[18px] font-semibold leading-none tabular-nums ${instrumentSans.className}`}
          style={{ color: homeColor }}
        >
          <NumberFlow
            value={Math.round(homePct)}
            suffix="%"
            trend={0}
            style={nfMaskStyle}
          />
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
                  className={`shrink-0 text-[18px] font-semibold tabular-nums ${instrumentSans.className}`}
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
  const yesPct = Math.max(
    1,
    Math.min(99, (yesPrice / Math.max(0.0001, yesPrice + noPrice)) * 100),
  );
  const [range, setRange] = useState<SportsChartRange>("MAX");
  const seed = hashString(market.slug || market.marketId || market.title);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-0.5">
        <LiveTeamMark
          logo={team.logo ?? market.image}
          name={team.name}
          abbr={team.abbr}
          size="header"
          portrait={team.logo ? team.portrait : false}
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
        awayPct={yesPct}
        awayColor="#00D54B"
        homeColor="#FF5C5C"
        awayLabel={yes?.label ?? "Yes"}
        homeLabel={no?.label ?? "No"}
        seed={seed}
        range={range}
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
  const awayPct = Math.max(
    1,
    Math.min(99, (awayPrice / Math.max(0.0001, awayPrice + homePrice)) * 100),
  );
  const tones = matchupTeamTones(market);
  const awayColor = tones?.away.text ?? teamAccent(away.name, away.abbr, 0);
  const homeColor = tones?.home.text ?? teamAccent(home.name, home.abbr, 1);
  const awayName = teamShortLabel(away.name);
  const homeName = teamShortLabel(home.name);
  const seed = hashString(market.slug || market.marketId || market.title);
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
  const subLabel =
    game?.status === "live"
      ? formatLiveClock(game.clock, game.status)
      : game?.status === "final" || market.isResolved
        ? null
        : marketScheduleLabel(market) ?? formatSportsDate(market.closesAt);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-0.5">
        <div className="flex min-w-0 flex-col items-center">
          <LiveTeamMark
            logo={away.logo}
            name={away.name}
            abbr={away.abbr}
            size="hero"
            portrait={away.portrait}
          />
        </div>

        <div className="flex min-w-[5.5rem] flex-col items-center text-center">
          <p
            className={`text-[12px] font-medium leading-none ${
              statusTop === "Live" ? "text-[#FF3B30]" : "text-white/45"
            }`}
          >
            {statusTop}
          </p>
          <p
            className={`mt-1.5 text-[42px] font-semibold leading-none tracking-tight tabular-nums ${
              hasScore ? "text-white" : "text-white/30"
            } ${instrumentSans.className}`}
          >
            {hasScore ? (
              <LiveScoreFlow away={away.score!} home={home.score!} />
            ) : (
              "vs"
            )}
          </p>
          <p className="mt-1.5 min-h-[13px] text-[13px] font-semibold leading-none tabular-nums text-white/55">
            {game?.status === "live" ? (
              <LivePeriodFlow clock={game.clock} status={game.status} />
            ) : (
              subLabel
            )}
          </p>
        </div>

        <div className="flex min-w-0 flex-col items-center">
          <LiveTeamMark
            logo={home.logo}
            name={home.name}
            abbr={home.abbr}
            size="hero"
            portrait={home.portrait}
          />
        </div>
      </div>

      <SportsOddsChart
        awayPct={awayPct}
        awayColor={awayColor}
        homeColor={homeColor}
        awayLabel={awayName}
        homeLabel={homeName}
        seed={seed}
        range={range}
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
  const cashOut = item.position.shares * markPrice;
  const pnlUsd = cashOut - invested;
  const pnlPct = invested > 0 ? (pnlUsd / invested) * 100 : 0;
  const image = item.position.image ?? market.image;
  const position: PolymarketWalletPosition = {
    ...item.position,
    marketTitle: market.title,
    outcome: item.trade.outcome,
    avgPrice: item.trade.price,
    markPrice,
    valueUsd: cashOut,
    pnlUsd,
    image,
  };

  return (
    <section aria-label="Your position">
      <h3 className={`mb-2.5 ${ui.section}`}>Your position</h3>
      <BubblyPositionCard
        position={position}
        onCashOut={onCashOut}
        onShare={() =>
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
      />
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
      compact
      leading={
        position.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={position.image}
            alt=""
            className="h-10 w-10 rounded-[14px] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/[0.1] text-[12px] font-semibold text-white/40">
            {position.outcome.slice(0, 1)}
          </div>
        )
      }
      title={position.marketTitle}
      subtitle={`${position.outcome} · ${formatOdds(position.markPrice)}`}
      trailing={
        <div>
          <p className="text-[15px] font-semibold tabular-nums leading-snug">
            {formatUsd(position.valueUsd)}
          </p>
          <p
            className={`mt-0.5 text-[12px] font-semibold tabular-nums ${
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

function formatHistoryPnl(value: number): string {
  const abs = Math.abs(value);
  const amount = abs.toLocaleString("en-US", {
    minimumFractionDigits: abs < 100 ? 2 : 0,
    maximumFractionDigits: abs < 100 ? 2 : 0,
  });
  return `${value < 0 ? "-" : "+"}$${amount}`;
}

function ProfileHistoryRow({
  trade,
  pnlUsd,
  marketImage,
  onOpen,
}: {
  trade: PolymarketWalletTrade;
  pnlUsd?: number;
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
        pnlUsd !== undefined ? (
          <span
            className={`text-[16px] font-semibold tabular-nums ${
              pnlUsd < 0 ? "text-[#FF375F]" : "text-[#00D54B]"
            }`}
          >
            {formatHistoryPnl(pnlUsd)}
          </span>
        ) : (
          <span className="text-[16px] font-semibold tabular-nums text-white/45">
            {formatUsd(trade.size * trade.price)}
          </span>
        )
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

function CheckGlyph() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
    "flex items-baseline gap-1 rounded-md transition-opacity hover:opacity-80";
  return (
    <div className="mt-3 flex w-full flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-center text-[14px] leading-none">
      <button type="button" onClick={onFollowingClick} className={countClass}>
        <span className="font-semibold tabular-nums text-white">
          {following.toLocaleString()}
        </span>
        <span className="text-white/45">Following</span>
      </button>
      <button type="button" onClick={onFollowersClick} className={countClass}>
        <span className="font-semibold tabular-nums text-white">
          {followers.toLocaleString()}
        </span>
        <span className="text-white/45">Followers</span>
      </button>
      <p className="flex items-baseline gap-1">
        <span className="font-semibold tabular-nums text-white">
          {winRate === null ? "—" : `${winRate.toFixed(1)}%`}
        </span>
        <span className="text-white/45">Win rate</span>
      </p>
    </div>
  );
}

function ProfileIdentityHeader({
  seed,
  name,
  wallet,
  avatarUrl,
  nameRef,
  trailing,
}: {
  seed: string;
  name: string;
  wallet: string;
  avatarUrl?: string | null;
  nameRef?: RefObject<HTMLElement | null>;
  trailing?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const hasAddress = wallet.startsWith("0x");
  const nameIsAddress =
    name.startsWith("0x") ||
    (hasAddress && (name === shortWallet(wallet) || name === wallet));
  // Title is always a username/handle — never the raw truncated address.
  const displayName =
    nameIsAddress && hasAddress ? feedHandle(wallet) : name || "You";
  const walletShort = hasAddress ? shortWallet(wallet) : wallet.trim();
  const showWallet = Boolean(walletShort) && walletShort !== displayName;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyWallet = async () => {
    if (!hasAddress) return;
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
    } catch {
      // Clipboard can be blocked in embedded previews.
    }
  };

  return (
    <div className="relative">
      {trailing ? (
        <div className="absolute right-0 top-0 z-[1] flex shrink-0 items-center gap-1">
          {trailing}
        </div>
      ) : null}
      <div className="flex flex-col items-center text-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full bg-[#2a2a2e] object-cover"
          />
        ) : (
          <UserAvatar seed={seed} label={name} className="h-16 w-16 text-[18px]" />
        )}
        <p
          ref={nameRef as RefObject<HTMLParagraphElement>}
          className="mt-3 max-w-full truncate text-[24px] font-semibold leading-tight tracking-[-0.03em]"
        >
          {displayName}
        </p>
        {showWallet ? (
          <button
            type="button"
            onClick={() => void copyWallet()}
            aria-label={copied ? "Address copied" : "Copy wallet address"}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px] tabular-nums text-white/45 transition-colors hover:text-white/70"
          >
            {copied ? "Copied" : walletShort}
            {hasAddress && !copied ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <rect x="5" y="5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M3 10.5V4.5A1.5 1.5 0 0 1 4.5 3h6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const PORTFOLIO_RANGE_OPTIONS = [
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "all", label: "All time" },
] as const;

type PortfolioRangeId = (typeof PORTFOLIO_RANGE_OPTIONS)[number]["id"];

const PORTFOLIO_RANGE_SECS: Record<PortfolioRangeId, number | null> = {
  "1d": 24 * 60 * 60,
  "1w": 7 * 24 * 60 * 60,
  "1m": 30 * 24 * 60 * 60,
  "3m": 90 * 24 * 60 * 60,
  all: null,
};

function filterPortfolioHistory(
  history: LivelinePoint[],
  range: PortfolioRangeId,
): LivelinePoint[] {
  if (history.length < 2) return history;
  const secs = PORTFOLIO_RANGE_SECS[range];
  if (secs == null) return history;
  const end = history[history.length - 1]!.time;
  const start = end - secs;
  const sliced = history.filter((point) => point.time >= start);
  if (sliced.length >= 2) return sliced;
  return history.slice(-2);
}

function PortfolioSparkline({
  data,
  color,
  onScrub,
}: {
  data: LivelinePoint[];
  color: string;
  onScrub: (value: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const fillId = useId().replace(/:/g, "");
  const [size, setSize] = useState({ w: 1, h: 104 });
  const [scrubIdx, setScrubIdx] = useState<number | null>(null);
  const scrubbingRef = useRef(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(1, rect.width), h: Math.max(1, rect.height) });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padT = 8;
  const padB = 4;
  const values = data.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = Math.max(maxV - minV, 1);
  const chartH = Math.max(1, size.h - padT - padB);

  const points = data.map((point, i) => {
    const x =
      data.length <= 1 ? 0 : (i / (data.length - 1)) * size.w;
    const y = padT + (1 - (point.value - minV) / span) * chartH;
    return { x, y, value: point.value };
  });

  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");
  const fillD =
    points.length >= 2
      ? `${lineD} L${points[points.length - 1]!.x.toFixed(2)} ${size.h} L${points[0]!.x.toFixed(2)} ${size.h} Z`
      : "";

  const indexAtX = (clientX: number) => {
    const el = svgRef.current;
    if (!el || points.length === 0) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const t = rect.width <= 0 ? 1 : x / rect.width;
    return Math.round(t * (points.length - 1));
  };

  const applyScrub = (clientX: number) => {
    const idx = indexAtX(clientX);
    if (idx == null) return;
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    setScrubIdx(clamped);
    onScrub(points[clamped]!.value);
  };

  const clearScrub = () => {
    scrubbingRef.current = false;
    setScrubIdx(null);
    onScrub(null);
  };

  const scrubPoint = scrubIdx != null ? points[scrubIdx] : null;
  const clipId = `${fillId}-active`;
  const isScrubbing = scrubPoint != null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
      className="h-full w-full touch-none"
      aria-hidden
      onPointerDown={(event) => {
        // Touch needs capture so scrub continues while dragging.
        if (event.pointerType === "touch") {
          scrubbingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        applyScrub(event.clientX);
      }}
      onPointerMove={(event) => {
        // Desktop: scrub on hover. Touch: only while dragging.
        if (event.pointerType === "touch" && !scrubbingRef.current) return;
        applyScrub(event.clientX);
      }}
      onPointerUp={() => {
        if (scrubbingRef.current) clearScrub();
      }}
      onPointerCancel={clearScrub}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") return;
        clearScrub();
      }}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {isScrubbing ? (
          <clipPath id={clipId}>
            <rect x={0} y={0} width={scrubPoint.x} height={size.h} />
          </clipPath>
        ) : null}
      </defs>
      {/* Full series — dimmed while scrubbing so the future side stays visible but quiet */}
      {fillD ? (
        <path
          d={fillD}
          fill={`url(#${fillId})`}
          opacity={isScrubbing ? 0.22 : 1}
        />
      ) : null}
      {lineD ? (
        <path
          d={lineD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          opacity={isScrubbing ? 0.22 : 1}
        />
      ) : null}
      {/* Bright past (left of scrub) */}
      {isScrubbing && fillD ? (
        <path
          d={fillD}
          fill={`url(#${fillId})`}
          clipPath={`url(#${clipId})`}
        />
      ) : null}
      {isScrubbing && lineD ? (
        <path
          d={lineD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${clipId})`}
        />
      ) : null}
      {scrubPoint ? (
        <>
          <line
            x1={scrubPoint.x}
            y1={padT}
            x2={scrubPoint.x}
            y2={size.h - padB}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={1}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={scrubPoint.x}
            cy={scrubPoint.y}
            r={4}
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : null}
    </svg>
  );
}

function ProfileBalanceChart({
  balance,
  loading,
  totalPnl,
  roiPercent,
  history,
  actions,
}: {
  balance: number;
  loading: boolean;
  totalPnl: number | null;
  roiPercent: number | null;
  history: LivelinePoint[];
  actions?: ReactNode;
}) {
  const [range, setRange] = useState<PortfolioRangeId>("all");
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  const visibleHistory = useMemo(
    () => filterPortfolioHistory(history, range),
    [history, range],
  );
  const first = visibleHistory[0];
  const last = visibleHistory[visibleHistory.length - 1];
  const trend = first && last ? last.value - first.value : 0;
  const lineColor = trend < 0 ? "#FF375F" : "#00D54B";

  const rangePnl =
    range === "all"
      ? totalPnl
      : first && last
        ? Math.round((last.value - first.value) * 100) / 100
        : null;
  const rangeRoi =
    range === "all"
      ? roiPercent
      : first && last && first.value !== 0
        ? Math.round(((last.value - first.value) / Math.abs(first.value)) * 1000) /
          10
        : null;

  const displayBalance = scrubValue ?? balance;

  return (
    // Match home video-market side inset (px-1): page is px-5, so -mx-4 → 4px edges.
    <section className="-mx-4 mt-5 overflow-hidden rounded-[28px] bg-white/[0.08] px-5 pb-5 pt-4">
      <p className="text-[13px] font-medium text-white/45">Portfolio</p>
      <p
        className={`mt-1 text-[36px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSans.className}`}
      >
        {loading ? (
          "—"
        ) : (
          <BalanceFlow
            value={displayBalance}
            fractionClassName="text-white/40"
          />
        )}
      </p>
      {!loading && rangePnl !== null ? (
        <div className="mt-2 flex items-baseline gap-1.5 text-[14px] font-semibold tabular-nums">
          <span
            className={`inline-flex items-baseline gap-1 ${
              rangePnl > 0
                ? "text-[#00D54B]"
                : rangePnl < 0
                  ? "text-[#FF375F]"
                  : "text-white/45"
            }`}
          >
            <SignedUsdFlow value={rangePnl} />
            {rangeRoi !== null ? (
              <span className="inline-flex items-baseline">
                (
                <SignedPercentFlow value={rangeRoi} />)
              </span>
            ) : null}
          </span>
          <FilterDropdown
            ariaLabel="Portfolio timeframe"
            value={range}
            onChange={(id) => {
              setScrubValue(null);
              setRange(id);
            }}
            options={PORTFOLIO_RANGE_OPTIONS}
            menuAlign="left"
            triggerClassName="inline-flex items-center gap-0.5 text-[14px] font-medium text-white/40"
          />
        </div>
      ) : null}
      <div
        className="-mx-5 mt-3 h-[104px] w-[calc(100%+2.5rem)]"
        aria-label="Portfolio value chart"
      >
        {!loading && visibleHistory.length >= 2 ? (
          <PortfolioSparkline
            data={visibleHistory}
            color={lineColor}
            onScrub={setScrubValue}
          />
        ) : (
          <div
            className={`h-full w-full ${loading ? "animate-pulse bg-white/[0.04]" : ""}`}
          />
        )}
      </div>
      {actions ? <div className="mt-4 flex gap-2">{actions}</div> : null}
    </section>
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
          className={`text-[42px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSans.className}`}
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
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-[88%] rounded bg-white/10" />
          <div className="mt-2 h-4 w-[55%] rounded bg-white/10" />
          <div className="mt-3 flex items-center gap-4">
            <div className="h-3.5 w-12 rounded bg-white/10" />
            <div className="h-3.5 w-12 rounded bg-white/10" />
            <div className="h-3.5 w-12 rounded bg-white/10" />
          </div>
        </div>
      </div>
    </li>
  );
}

const SEARCH_PLACEHOLDER_WORDS = ["markets", "traders"] as const;

/** "Search markets/traders" — rotating noun with a soft vertical crossfade. */
function SearchPlaceholderHint({ active }: { active: boolean }) {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDER_WORDS.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [active]);

  const word = SEARCH_PLACEHOLDER_WORDS[wordIndex]!;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center text-[14px] text-white/35"
    >
      <span className="whitespace-pre">Search </span>
      <span className="relative inline-grid overflow-hidden leading-none">
        {/* Reserve width for the longer word so the field doesn't jump. */}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          markets
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={word}
            initial={{ y: "55%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-55%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            className="col-start-1 row-start-1 whitespace-nowrap"
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

function FeedPlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M6.5 4.8v10.4L15.2 10 6.5 4.8Z" />
    </svg>
  );
}

function FeedPauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <rect x="5.5" y="4.5" width="3.2" height="11" rx="1" />
      <rect x="11.3" y="4.5" width="3.2" height="11" rx="1" />
    </svg>
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

function IosStatusBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const time =
    now?.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }) ?? "";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex h-[44px] items-end justify-between px-7 pb-[6px] text-white"
    >
      <p className="min-w-[54px] text-[15px] font-semibold tabular-nums tracking-[-0.02em]">
        {time}
      </p>
      <div className="flex items-center gap-[5px]">
        <svg viewBox="0 0 18 12" className="h-[11px] w-[17px]" fill="currentColor">
          <rect x="0" y="7" width="3" height="5" rx="0.6" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.6" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.6" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.6" opacity="0.35" />
        </svg>
        <svg
          viewBox="0 0 16 12"
          className="h-[11px] w-[15px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M1.6 3.8c1.8-1.7 4.1-2.6 6.4-2.6s4.6.9 6.4 2.6" />
          <path d="M3.7 6.2c1.2-1.15 2.75-1.75 4.3-1.75s3.1.6 4.3 1.75" />
          <path d="M5.85 8.5c.6-.55 1.35-.85 2.15-.85s1.55.3 2.15.85" />
          <circle
            cx="8"
            cy="10.55"
            r="0.95"
            fill="currentColor"
            stroke="none"
          />
        </svg>
        <svg viewBox="0 0 27 12" className="h-[12px] w-[27px]" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="11"
            rx="3.2"
            stroke="currentColor"
            strokeOpacity="0.45"
          />
          <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
          <path
            d="M25 3.8v4.4a2 2 0 0 0 0-4.4Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
        </svg>
      </div>
    </div>
  );
}

export default function Api({
  embed = false,
}: {
  /** Fill a parent phone frame — no outer chrome, skip onboarding. */
  embed?: boolean;
} = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const feedSnapRef = useRef<HTMLElement>(null);
  /** Scroll offsets of the views underneath each drill-in, restored on back. */
  const scrollStackRef = useRef<Array<{ outer: number; feed: number }>>([]);
  const pendingScrollRef = useRef<{ outer: number; feed: number } | null>(null);
  const stickyTitleRef = useRef<HTMLElement>(null);
  const stickyNavRef = useRef<HTMLDivElement>(null);
  const stickyMarketFadeRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SectionId>("explore");
  const [feedPastHero, setFeedPastHero] = useState(false);
  const [feedScrolled, setFeedScrolled] = useState(false);
  const [exploreHeaderHeight, setExploreHeaderHeight] = useState(0);
  const exploreHeaderRef = useRef<HTMLDivElement>(null);
  const [feedPageIndex, setFeedPageIndex] = useState(0);
  const [positionsOpen, setPositionsOpen] = useState(false);
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
  const [marketPhotoPool, setMarketPhotoPool] = useState<string[]>([]);
  const [marketActivity, setMarketActivity] =
    useState<PolymarketMarketActivity | null>(null);
  const [leaderboardCategory, setLeaderboardCategory] =
    useState<LeaderboardCategory>("all");
  const [leaderboardPeriod, setLeaderboardPeriod] =
    useState<LeaderboardPeriod>("24h");
  const [profileTab, setProfileTab] = useState<ProfileTab>("positions");
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
  const [listDetail, setListDetail] = useState<PolymarketWatchListDetail | null>(
    null,
  );
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const [walletAvatarUrl, setWalletAvatarUrl] = useState<string | null>(null);
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
    useState<FeedPositionSelection | null>(null);
  const [feedLivePlaying, setFeedLivePlaying] = useState(true);
  const [liveFeedItems, setLiveFeedItems] = useState<
    Array<TradePostTrade & { liveId: string }>
  >([]);
  const liveFeedCursorRef = useRef(0);
  const liveFeedBottomRef = useRef<HTMLDivElement | null>(null);
  const [marketPulseItems, setMarketPulseItems] = useState<
    Array<TradePostTrade & { liveId: string }>
  >([]);
  const marketPulseCursorRef = useRef(0);
  const marketPulseSlugRef = useRef<string | null>(null);
  const [followedWallets, setFollowedWallets] = useState<Set<string>>(
    () => new Set(),
  );
  const [onboardingOpen, setOnboardingOpen] = useState(
    embed ? false : SHOW_ONBOARDING,
  );
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  /** Where Back goes when own profile was opened from a non-tab entry point. */
  const [profileReturnSection, setProfileReturnSection] =
    useState<Exclude<SectionId, "profile">>("explore");
  const [profileSubScreen, setProfileSubScreen] =
    useState<ProfileSubScreen | null>(null);
  const [tradeFlowMarket, setTradeFlowMarket] =
    useState<PolymarketMarketData | null>(null);
  const [tradeFlowOutcome, setTradeFlowOutcome] = useState<string | null>(
    null,
  );
  const [cashOutItem, setCashOutItem] = useState<StoredUserTrade | null>(null);
  const [cashOutMarket, setCashOutMarket] =
    useState<PolymarketMarketData | null>(null);
  const [userTrades, setUserTrades] = useState<StoredUserTrade[]>([]);
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>([]);
  const [copyTradeTarget, setCopyTradeTarget] = useState<{
    wallet: string;
    displayName: string;
    handle: string;
  } | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [howToEarnOpen, setHowToEarnOpen] = useState(false);
  const [sharePosition, setSharePosition] =
    useState<SharePositionPayload | null>(null);
  const [followList, setFollowList] = useState<{
    kind: "following" | "followers";
    people: FollowListPerson[];
  } | null>(null);
  const [extraDepositUsd, setExtraDepositUsd] = useState(0);
  const skipUserTradesPersist = useRef(true);
  const skipCopyTradesPersist = useRef(true);
  const copyTradesRef = useRef(copyTrades);

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
    let openKept = 0;
    setUserTrades(
      loadUserTrades().filter(
        (item) => item.cashedOut || ++openKept <= MAX_PROFILE_POSITIONS,
      ),
    );
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
    let retryTimer: number | null = null;
    let hasProfile = false;
    let shownWallet: string | null = null;

    const show = (data: PolymarketDemoProfile) => {
      hasProfile = true;
      shownWallet = data.wallet.toLowerCase();
      // Demo balance is fixed — keep PnL/ROI positive and believable for that
      // balance (API lifetime PnL on the seed wallet can be huge or negative).
      const rawRoi =
        typeof data.roiPercent === "number" ? data.roiPercent : 8.1;
      const roiPercent = Math.min(18, Math.max(4, Math.abs(rawRoi) || 8.1));
      const totalPnl =
        Math.round(PROFILE_BALANCE * (roiPercent / 100) * 100) / 100;
      setDemoProfile({
        ...data,
        portfolioValue: PROFILE_BALANCE,
        history: seedPortfolioHistory(PROFILE_BALANCE),
        totalPnl,
        roiPercent: Math.round(roiPercent * 10) / 10,
      });
      setDemoProfileStatus("ready");
    };

    try {
      const cached = JSON.parse(
        window.localStorage.getItem(DEMO_PROFILE_STORAGE_KEY) ?? "null",
      ) as PolymarketDemoProfile | null;
      if (cached?.wallet) show(cached);
    } catch {
      // Ignore a corrupt cache; the network load below replaces it.
    }

    const load = async (attempt: number) => {
      if (!hasProfile) setDemoProfileStatus("loading");
      try {
        const res = await fetch("/api/polymarketscan/profile?limit=8", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketDemoProfile;
        if (controller.signal.aborted) return;
        // Keep one identity per browser so the profile doesn't swap wallets.
        if (shownWallet && data.wallet.toLowerCase() !== shownWallet) return;
        show(data);
        try {
          window.localStorage.setItem(
            DEMO_PROFILE_STORAGE_KEY,
            JSON.stringify(data),
          );
        } catch {
          // Storage full or unavailable; the in-memory profile still works.
        }
      } catch (error) {
        if (controller.signal.aborted || hasProfile) return;
        console.error("Failed to load demo profile:", error);
        if (attempt < 3) {
          retryTimer = window.setTimeout(
            () => void load(attempt + 1),
            2000 * (attempt + 1),
          );
        } else {
          setDemoProfileStatus("error");
        }
      }
    };

    void load(0);
    return () => {
      controller.abort();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
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
        const remoteTrending = Array.isArray(data.trending) ? data.trending : [];
        setMarketPhotoPool(
          [...remoteLive, ...remoteTrending]
            .map((market) => market.image)
            .filter((src): src is string => Boolean(src)),
        );
        setTrendingMarkets([
          createDemoF1Market(),
          createDemoEplMarket(),
          createDemoMlbMarket(),
          ...remoteTrending.filter(
            (market) =>
              market.marketId !== DEMO_F1_MARKET_ID &&
              market.marketId !== DEMO_EPL_MARKET_ID &&
              market.marketId !== DEMO_MLB_MARKET_ID &&
              !(isSportsMarket(market) && sportKindForMarket(market) === null) &&
              !(market.category ?? "").toLowerCase().includes("crypto") &&
              !/\b(bitcoin|ethereum|btc\b|eth\b)\b/i.test(market.title) &&
              sportKindForMarket(market) !== "combat" &&
              // Keep only two-sided sports cards in the snap feed.
              (!isSportsMarket(market) || isTwoSidedMatchup(market)),
          ),
        ]);
        setMarketsStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load markets feed:", error);
        setLiveMarkets([createDemoLiveMarket()]);
        setTrendingMarkets([
          createDemoF1Market(),
          createDemoEplMarket(),
          createDemoMlbMarket(),
        ]);
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
      if (document.hidden) return;
      tick += 1;
      // Interval is 3s — advance clock ~3 seconds per tick.
      clockSeconds -= 3;
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
              label: "Warriors",
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
    }, 3000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let hasTrades = false;
    let emptyRetries = 0;

    try {
      const cached = JSON.parse(
        window.localStorage.getItem(FEED_TRADES_STORAGE_KEY) ?? "null",
      ) as PolymarketTradeWithPnl[] | null;
      if (Array.isArray(cached) && cached.length > 0) {
        hasTrades = true;
        setTrades(cached);
        setTradesStatus("ready");
      }
    } catch {
      // Ignore unreadable cache; the network load below fills the feed.
    }

    const load = async () => {
      if (!hasTrades) setTradesStatus("loading");
      let next: PolymarketTradeWithPnl[] | null = null;
      try {
        const res = await fetch("/api/polymarketscan/trades?limit=80&sports=1", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { trades?: PolymarketTradeWithPnl[] };
        next = data.trades ?? [];
      } catch {
        next = null;
      }
      if (cancelled) return;

      if (next && next.length > 0) {
        hasTrades = true;
        emptyRetries = 0;
        setTrades(next);
        setTradesStatus("ready");
        try {
          window.localStorage.setItem(
            FEED_TRADES_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch {
          // Storage can be full or disabled; the in-memory feed still works.
        }
      } else if (!hasTrades) {
        emptyRetries += 1;
        // Upstream sometimes returns nothing while rate limited; keep the
        // skeleton up through a few quick retries before giving up.
        if (emptyRetries <= 4) {
          timer = window.setTimeout(load, 2500 * emptyRetries);
          return;
        }
        setTradesStatus(next ? "ready" : "error");
      }
      timer = window.setTimeout(load, hasTrades ? 30_000 : 5_000);
    };

    void load();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
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
        const walletsRes = await fetch(
          "/api/polymarketscan/leaderboard?type=wallets&limit=15",
          { signal: controller.signal },
        );
        if (!walletsRes.ok) throw new Error("fetch failed");
        const walletsData = (await walletsRes.json()) as {
          wallets?: PolymarketLeaderboardWallet[];
        };
        if (controller.signal.aborted) return;
        setLeaderboardWallets(
          Array.isArray(walletsData.wallets) ? walletsData.wallets : [],
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

  const marketsForDemoRef = useRef<PolymarketMarketData[]>([]);
  marketsForDemoRef.current = [...liveMarkets, ...trendingMarkets];
  const demoWalletCacheRef = useRef(
    new Map<string, PolymarketWalletProfile>(),
  );

  useEffect(() => {
    if (!selectedWallet) {
      setWalletProfile(null);
      setWalletStatus("idle");
      return;
    }

    const controller = new AbortController();
    const wallet = selectedWallet;
    const cached = demoWalletCacheRef.current.get(wallet.toLowerCase());

    const load = async () => {
      // Keep prior chart/data visible while fetching — avoids loading flicker.
      if (!cached) setWalletStatus("loading");
      else {
        setWalletProfile(cached);
        setWalletStatus("ready");
      }
      try {
        const res = await fetch(
          `/api/polymarketscan/wallet/${encodeURIComponent(wallet)}?limit=50`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PolymarketWalletProfile;
        if (controller.signal.aborted) return;
        const hasBody =
          (data.positions?.length ?? 0) > 0 ||
          (data.recentTrades?.length ?? 0) > 0 ||
          data.portfolioValue > 0;
        const profile = hasBody
          ? data
          : cached ??
            seedDemoWalletProfile(wallet, marketsForDemoRef.current);
        if (!hasBody) {
          demoWalletCacheRef.current.set(wallet.toLowerCase(), profile);
        }
        setWalletProfile(profile);
        setWalletStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load wallet profile:", error);
        const profile =
          cached ??
          seedDemoWalletProfile(wallet, marketsForDemoRef.current);
        demoWalletCacheRef.current.set(wallet.toLowerCase(), profile);
        setWalletProfile(profile);
        setWalletStatus("ready");
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

    // Local demo markets must not be replaced by Polymarket title search —
    // that swap changes slug/title and drops "Your position" after ~1s.
    if (isDemoMarketId(selectedMarketSlug)) {
      setMarketStatus("ready");
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

    if (isDemoMarketId(selectedMarketSlug)) {
      setMarketActivity({ trades: [], traders: [] });
      setMarketActivityStatus("ready");
      return;
    }

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
  const marketAccent = MARKET_PAGE_BG;
  const sportsMarketView = Boolean(
    selectedMarket
      ? isSportsMarket(selectedMarket)
      : selectedMarketSlug &&
          [...liveMarkets, ...trendingMarkets].some(
            (market) =>
              market.slug === selectedMarketSlug && isSportsMarket(market),
          ),
  );
  const showingListDetail =
    (section === "explore" || section === "search" || section === "feed") &&
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
    const label = (displayName ?? walletLabel)?.trim() || null;
    const short = shortWallet(wallet);
    // Prefer the username from the profile/feed you opened from — not a
    // hex-derived handle from the wallet address.
    const isRealUsername =
      Boolean(label) &&
      !/^0x/i.test(label!) &&
      label !== short &&
      label!.toLowerCase() !== wallet.toLowerCase();
    const username = isRealUsername
      ? label!.replace(/^@/, "")
      : resolveFeedHandle(wallet);
    setCopyTradeTarget({
      wallet,
      displayName: username,
      handle: username,
    });
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
    if (isNew && !isFollowing(trade.wallet)) toggleFollow(trade.wallet);
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
    setProfileReturnSection(
      section === "profile" ? profileReturnSection : section,
    );
    setSection("profile");
  };

  const openOwnProfile = (
    from: Exclude<SectionId, "profile"> = section === "profile"
      ? profileReturnSection
      : section,
  ) => {
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(null);
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setFeedPositionTrade(null);
    setProfileSubScreen(null);
    setCopyTradeTarget(null);
    setPositionsOpen(false);
    setProfileReturnSection(from);
    setSection("profile");
  };

  const backFromOwnProfile = () => {
    setProfileSubScreen(null);
    setSection(profileReturnSection);
  };

  const completeOnboarding = (username: string | null) => {
    markOnboardingDone(username);
    persistFollows(followedWallets);
    setOnboardingOpen(false);
    if (username) setProfileUsername(username);
  };

  const handleSectionChange = (next: TabId) => {
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(null);
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setFeedPositionTrade(null);
    setProfileSubScreen(null);
    setCopyTradeTarget(null);
    if (next === "positions") {
      setPositionsOpen(true);
      return;
    }
    setPositionsOpen(false);
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
    setProfileSubScreen(null);
    if (!embed && SHOW_ONBOARDING) setOnboardingOpen(true);
  };

  const isExploreFeed = section === "explore" && !showingDrillDown;
  const homeFeedMarkets = useMemo(() => {
    const featured = liveMarkets[0] ?? null;
    const f1 =
      trendingMarkets.find((market) => market.marketId === DEMO_F1_MARKET_ID) ??
      createDemoF1Market();
    const mlb =
      trendingMarkets.find((market) => market.marketId === DEMO_MLB_MARKET_ID) ??
      createDemoMlbMarket();
    const epl =
      trendingMarkets.find((market) => market.marketId === DEMO_EPL_MARKET_ID) ??
      createDemoEplMarket();
    const rest = trendingMarkets.filter(
      (market) =>
        market.marketId !== featured?.marketId &&
        market.marketId !== DEMO_F1_MARKET_ID &&
        market.marketId !== DEMO_MLB_MARKET_ID &&
        market.marketId !== DEMO_EPL_MARKET_ID &&
        // Esports matchups have no clips or team marks to show.
        !(isSportsMarket(market) && sportKindForMarket(market) === null) &&
        !(market.category ?? "").toLowerCase().includes("crypto") &&
        !/\b(bitcoin|ethereum|btc\b|eth\b)\b/i.test(market.title) &&
        // Feed is team sports + F1 — no UFC fighter cards.
        sportKindForMarket(market) !== "combat" &&
        (!isSportsMarket(market) || isTwoSidedMatchup(market)),
    );
    // Featured live, F1 Australia, Premier League, other matchups, MLB last.
    return featured
      ? [featured, f1, epl, ...rest, mlb]
      : [f1, epl, ...rest, mlb];
  }, [liveMarkets, trendingMarkets]);

  const searchTrendingRows = useMemo(
    () => createSearchTrendingDemos().map(searchTrendingRow),
    [],
  );

  useEffect(() => {
    const el = exploreHeaderRef.current;
    if (!isExploreFeed || !el) return;
    const measure = () => setExploreHeaderHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isExploreFeed]);

  const homeFeedClips = useMemo(
    () => assignUniqueClips(homeFeedMarkets),
    [homeFeedMarkets],
  );

  useEffect(() => {
    if (!isExploreFeed) {
      setFeedPastHero(false);
      setFeedScrolled(false);
      setFeedPageIndex(0);
      return;
    }
    const scroller = feedSnapRef.current;
    if (!scroller) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const page = Math.max(1, scroller.clientHeight);
      const index = Math.round(scroller.scrollTop / page);
      setFeedPastHero(index > 0);
      setFeedScrolled(scroller.scrollTop > 12);
      setFeedPageIndex(index);
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isExploreFeed, homeFeedMarkets.length, marketsStatus]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const restore = pendingScrollRef.current;
    pendingScrollRef.current = null;
    if (!showingDrillDown && !showingProfileSubScreen) {
      scrollStackRef.current = [];
    }
    // Pulse is a live chat — always land on the newest messages.
    const pinPulseBottom = section === "feed" && !showingDrillDown;
    const apply = () => {
      if (pinPulseBottom) {
        el.scrollTop = el.scrollHeight;
        return;
      }
      if (restore) {
        el.scrollTop = restore.outer;
        const feed = feedSnapRef.current;
        if (feed) feed.scrollTop = restore.feed;
        return;
      }
      el.scrollTop = 0;
    };
    apply();
    let id2 = 0;
    const id1 = window.requestAnimationFrame(() => {
      apply();
      id2 = window.requestAnimationFrame(apply);
    });
    return () => {
      window.cancelAnimationFrame(id1);
      if (id2) window.cancelAnimationFrame(id2);
    };
    // Only navigation should reset or restore scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    section,
    selectedMarketSlug,
    selectedWallet,
    selectedListId,
    profileSubScreen,
    showingDrillDown,
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
          (demoProfile?.wallet ? feedHandle(demoProfile.wallet) : null))
        : section === "feed" && !showingDrillDown
          ? "Pulse"
          : section === "search" && !showingDrillDown
            ? "Search"
            : section === "rewards" && !showingDrillDown
              ? "Rewards"
              : null;

  const pulseStickyAlways =
    section === "feed" && !showingDrillDown && stickyTitle === "Pulse";

  useEffect(() => {
    const nav = stickyNavRef.current;
    const marketFade = stickyMarketFadeRef.current;
    if (nav) nav.style.opacity = pulseStickyAlways ? "1" : "0";
    if (marketFade) marketFade.style.opacity = "0";
    if (!stickyTitle && !marketFade) return;
    if (pulseStickyAlways) return;
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
    pulseStickyAlways,
    showingMarketDetail,
    showingWalletProfile,
    showingOwnProfile,
    section,
  ]);

  const rememberScroll = () => {
    scrollStackRef.current.push({
      outer: scrollRef.current?.scrollTop ?? 0,
      feed: feedSnapRef.current?.scrollTop ?? 0,
    });
  };

  const restoreScrollOnBack = () => {
    pendingScrollRef.current = scrollStackRef.current.pop() ?? null;
  };

  const openMarket = (market: PolymarketMarketData, remember = true) => {
    if (remember) rememberScroll();
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
    rememberScroll();
    if (local) {
      openMarket(
        preview?.image && !local.image
          ? { ...local, image: preview.image }
          : local,
        false,
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
    rememberScroll();
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setSelectedWallet(null);
    setWalletLabel(null);
    setSelectedListId(id);
  };

  const openWallet = (
    wallet: string,
    displayName: string | null,
    avatarUrl?: string | null,
  ) => {
    rememberScroll();
    setSelectedWallet(wallet);
    setWalletLabel(displayName ?? shortWallet(wallet));
    setWalletAvatarUrl(avatarUrl ?? null);
    setWalletProfileTab("positions");
  };

  const backFromWallet = () => {
    restoreScrollOnBack();
    setSelectedWallet(null);
    setWalletLabel(null);
    setWalletAvatarUrl(null);
  };

  const backFromList = () => {
    restoreScrollOnBack();
    setSelectedWallet(null);
    setWalletLabel(null);
    setWalletAvatarUrl(null);
    setSelectedListId(null);
  };

  const backFromMarket = () => {
    restoreScrollOnBack();
    setSelectedMarketSlug(null);
    setSelectedMarket(null);
    setMarketStatus("idle");
    setTradeFlowMarket(null);
    setTradeFlowOutcome(null);
    setCashOutItem(null);
    setCashOutMarket(null);
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

  const shareRewards = async () => {
    const text = `Join me on Worm — earn rewards: https://worm.wtf/r/${referralCode}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Worm Rewards", text });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // User cancelled the share sheet, or clipboard is unavailable.
    }
  };

  const walletBackLabel = selectedListId
    ? (listDetail?.name ?? "List")
    : selectedMarketSlug
      ? "Market"
      : section === "feed"
        ? "Pulse"
        : section === "search"
          ? "Search"
          : "Back";
  const listBackLabel =
    section === "feed"
      ? "Pulse"
      : section === "search"
        ? "Search"
        : "Squads";
  const marketBackLabel = selectedListId
    ? (listDetail?.name ?? "Squad")
    : section === "feed"
      ? "Pulse"
      : section === "search"
        ? "Search"
        : "Explore";

  const drillBack = showingWalletProfile
    ? { onClick: backFromWallet, label: `Back to ${walletBackLabel}` }
    : showingListDetail
      ? { onClick: backFromList, label: `Back to ${listBackLabel}` }
      : showingMarketDetail
        ? { onClick: backFromMarket, label: `Back to ${marketBackLabel}` }
        : showingProfileSubScreen
          ? { onClick: backFromProfileSubScreen, label: "Back to profile" }
          : showingOwnProfile
            ? {
                onClick: backFromOwnProfile,
                label:
                  profileReturnSection === "rewards"
                    ? "Back to Rewards"
                    : profileReturnSection === "feed"
                      ? "Back to Pulse"
                      : profileReturnSection === "search"
                        ? "Back to Search"
                        : "Back",
              }
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
    PROFILE_BALANCE + extraDepositUsd + copiedOpenPnl;
  const portfolioHistory = useMemo(() => {
    const base =
      demoProfile?.history && demoProfile.history.length >= 2
        ? demoProfile.history
        : seedPortfolioHistory(PROFILE_BALANCE);
    const endValue = PROFILE_BALANCE + extraDepositUsd + copiedOpenPnl;
    if (base.length < 2) return base;
    const last = base[base.length - 1]!;
    // Update the last point in place — don't append a new timestamp every PnL tick
    // (copy-sim updates were making Liveline feel laggy).
    if (Math.abs(last.value - endValue) < 0.005) return base;
    return base.map((point, index) =>
      index === base.length - 1 ? { ...point, value: endValue } : point,
    );
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
  }, [walletProfile]);

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
      if (/\/soccer-leagues\//i.test(normalized)) return;
      const key = keyOf(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      urls.push(normalized);
    };
    add("/playground/api/lakers-celtics.jpg");
    for (const market of [...liveMarkets, ...trendingMarkets]) {
      add(market.image);
    }
    for (const src of marketPhotoPool) add(src);
    for (const trade of trades) {
      add(trade.marketImage);
    }
    return urls;
  }, [liveMarkets, trendingMarkets, marketPhotoPool, trades]);

  const onboardingLogos = useMemo(() => {
    const teams = [...ONBOARDING_NBA_LOGOS];
    const add = (src: string | null | undefined) => {
      if (src && /teamlogos\/nba\//i.test(src)) {
        teams.push(src.replace("/500-dark/", "/500/"));
      }
    };
    for (const market of [...liveMarkets, ...trendingMarkets]) {
      for (const team of market.teams ?? []) add(team.logo);
    }
    // Interleave so leagues stay visible among the many team logos.
    const leagues = [...ONBOARDING_LEAGUE_LOGOS];
    const mixed: string[] = [];
    while (teams.length > 0 || leagues.length > 0) {
      mixed.push(...teams.splice(0, 3));
      if (leagues.length > 0) mixed.push(leagues.shift()!);
    }
    return mixed;
  }, [liveMarkets, trendingMarkets]);

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
    if (marketBySlug.size === 0) return;
    setUserTrades((prev) => markCopiedToMarket(prev, marketBySlug));
  }, [marketBySlug]);

  copyTradesRef.current = copyTrades;

  const hasActiveCopy = copyTrades.some((rule) => rule.status === "active");

  useEffect(() => {
    if (!hasActiveCopy) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      const active = copyTradesRef.current.filter(
        (rule) => rule.status === "active",
      );
      if (active.length === 0) return;
      setUserTrades((prev) =>
        tickCopiedMarks(
          prev,
          active.map((rule) => rule.wallet),
          Date.now(),
        ),
      );
    }, 4000);

    return () => window.clearInterval(id);
  }, [hasActiveCopy]);

  const visibleLeaderboardWallets = useMemo(() => {
    if (leaderboardCategory === "all") return leaderboardWallets;
    return leaderboardWallets.filter(
      (wallet) =>
        walletLeaderboardCategory(wallet.wallet) === leaderboardCategory,
    );
  }, [leaderboardCategory, leaderboardWallets]);

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

  const feedPoolTrades = useMemo(
    () => expandFeedTrades(feedTrades, "live", 64),
    [feedTrades],
  );

  // Seed a short chat history once the pool is ready.
  useEffect(() => {
    if (feedPoolTrades.length === 0) {
      setLiveFeedItems([]);
      liveFeedCursorRef.current = 0;
      return;
    }
    setLiveFeedItems((prev) => {
      if (prev.length > 0) return prev;
      const seedCount = Math.min(8, feedPoolTrades.length);
      liveFeedCursorRef.current = seedCount;
      return feedPoolTrades.slice(0, seedCount).map((trade, index) => ({
        ...trade,
        liveId: `seed-${trade.txHash ?? trade.timestamp ?? index}-${index}`,
      }));
    });
  }, [feedPoolTrades]);

  useEffect(() => {
    if (
      section !== "feed" ||
      showingDrillDown ||
      feedPositionTrade ||
      !feedLivePlaying
    ) {
      return;
    }
    if (feedPoolTrades.length === 0) return;

    const pushNext = () => {
      const index = liveFeedCursorRef.current % feedPoolTrades.length;
      const base = feedPoolTrades[index]!;
      liveFeedCursorRef.current += 1;
      const n = liveFeedCursorRef.current;
      const next: TradePostTrade & { liveId: string } = {
        ...base,
        amountUsd: Math.max(
          1,
          Math.round(
            base.amountUsd *
              (0.78 + (hashString(`${base.wallet}-${n}`) % 40) / 100) *
              100,
          ) / 100,
        ),
        txHash: `${base.txHash ?? "live"}-stream-${n}`,
        timestamp: new Date().toISOString(),
        liveId: `live-${n}-${base.wallet}`,
      };
      setLiveFeedItems((prev) => [...prev, next].slice(-48));
    };

    const id = window.setInterval(pushNext, 1600);
    return () => window.clearInterval(id);
  }, [
    section,
    showingDrillDown,
    feedPositionTrade,
    feedLivePlaying,
    feedPoolTrades,
  ]);

  useEffect(() => {
    if (section !== "feed" || showingDrillDown) return;
    const scroller = scrollRef.current;
    if (!scroller || liveFeedItems.length === 0) return;
    // Instant on entry / when paused; smooth while Live appends new takes.
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: feedLivePlaying ? "smooth" : "auto",
    });
  }, [liveFeedItems, section, showingDrillDown, feedLivePlaying]);

  const profilePositions = useMemo(() => {
    const closedKeys = new Set(
      userTrades
        .filter(
          (item) =>
            item.cashedOut || item.trade.side.toUpperCase() === "SELL",
        )
        .map(
          (item) =>
            `${(item.trade.marketSlug || item.trade.marketTitle).toLowerCase()}|${item.trade.outcome.trim().toLowerCase()}`,
        ),
    );
    const userPositions = userTrades
      .filter((item) => !item.cashedOut && item.trade.side.toUpperCase() !== "SELL")
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
      if (merged.length >= MAX_PROFILE_POSITIONS) break;
      const key = `${position.marketSlug ?? position.marketTitle}-${position.outcome}`;
      const closedKey = `${(position.marketSlug || position.marketTitle).toLowerCase()}|${position.outcome.trim().toLowerCase()}`;
      if (!seen.has(key) && !closedKeys.has(closedKey)) merged.push(position);
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
  const profilePositionsPnl = useMemo(
    () => profilePositions.reduce((sum, position) => sum + position.pnlUsd, 0),
    [profilePositions],
  );
  const profilePositionsInvested = useMemo(
    () =>
      profilePositions.reduce(
        (sum, position) => sum + Math.max(0, position.valueUsd - position.pnlUsd),
        0,
      ),
    [profilePositions],
  );

  const marketUserPosition = useMemo(() => {
    if (!selectedMarket && !selectedMarketSlug) return null;
    const openSlug = (selectedMarketSlug ?? "").toLowerCase();
    const slug = (
      selectedMarket?.slug ||
      selectedMarket?.marketId ||
      openSlug
    ).toLowerCase();
    const marketId = (selectedMarket?.marketId ?? "").toLowerCase();
    const title = (selectedMarket?.title ?? "").trim();
    return (
      userTrades.find((item) => {
        if (item.cashedOut) return false;
        if (item.trade.side.toUpperCase() === "SELL") return false;
        const itemSlug = (item.trade.marketSlug ?? "").toLowerCase();
        const itemTitle = item.trade.marketTitle.trim();
        return (
          (itemSlug &&
            (itemSlug === slug ||
              itemSlug === marketId ||
              (openSlug && itemSlug === openSlug))) ||
          (title &&
            (itemTitle.toLowerCase() === title.toLowerCase() ||
              titlesClose(itemTitle, title)))
        );
      }) ?? null
    );
  }, [selectedMarket, selectedMarketSlug, userTrades]);

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

  const marketPulsePool = useMemo(() => {
    if (!selectedMarket) return [];
    const slugKey = selectedMarket.slug || selectedMarket.marketId;
    const fromMarket = marketFeedTrades;
    const fromGlobal = trades.filter((trade) => {
      const itemSlug = (trade.marketSlug ?? "").toLowerCase();
      const itemTitle = trade.marketTitle.trim().toLowerCase();
      return (
        itemSlug === slugKey.toLowerCase() ||
        itemTitle === selectedMarket.title.trim().toLowerCase()
      );
    });
    let merged = fromMarket.length > 0 ? fromMarket : fromGlobal;
    // Sparse markets: remix the global Pulse pool onto this market so the
    // stream still feels live (outcomes stay market-local).
    if (merged.length < 4 && feedTrades.length > 0) {
      const sides = getMarketOddsSides(selectedMarket);
      const remixed = feedTrades.slice(0, 24).map((trade, index) => {
        const side = sides[index % Math.max(1, sides.length)] ?? sides[0];
        return {
          ...trade,
          marketTitle: selectedMarket.title,
          marketSlug: slugKey,
          marketCategory: selectedMarket.category,
          outcome: side?.label ?? trade.outcome,
          price: side?.price ?? trade.price,
          marketImage: undefined,
        } satisfies TradePostTrade;
      });
      merged = [...merged, ...remixed];
    }
    return expandFeedTrades(merged, `market-${slugKey}`, 48);
  }, [feedTrades, marketFeedTrades, selectedMarket, trades]);

  // Market-page Pulse: seed + prepend new takes at the top.
  useEffect(() => {
    if (!showingMarketDetail || !selectedMarketSlug) {
      setMarketPulseItems([]);
      marketPulseCursorRef.current = 0;
      marketPulseSlugRef.current = null;
      return;
    }
    if (marketPulsePool.length === 0) {
      if (marketPulseSlugRef.current !== selectedMarketSlug) {
        setMarketPulseItems([]);
        marketPulseCursorRef.current = 0;
        marketPulseSlugRef.current = selectedMarketSlug;
      }
      return;
    }
    if (marketPulseSlugRef.current !== selectedMarketSlug) {
      marketPulseSlugRef.current = selectedMarketSlug;
      const seedCount = Math.min(6, marketPulsePool.length);
      marketPulseCursorRef.current = seedCount;
      setMarketPulseItems(
        marketPulsePool.slice(0, seedCount).map((trade, index) => ({
          ...trade,
          liveId: `mseed-${selectedMarketSlug}-${index}`,
        })),
      );
      return;
    }
    setMarketPulseItems((prev) => {
      if (prev.length > 0) return prev;
      const seedCount = Math.min(6, marketPulsePool.length);
      marketPulseCursorRef.current = seedCount;
      return marketPulsePool.slice(0, seedCount).map((trade, index) => ({
        ...trade,
        liveId: `mseed-${selectedMarketSlug}-${index}`,
      }));
    });
  }, [showingMarketDetail, selectedMarketSlug, marketPulsePool]);

  useEffect(() => {
    if (
      !showingMarketDetail ||
      marketDetailTab !== "trades" ||
      feedPositionTrade ||
      marketPulsePool.length === 0
    ) {
      return;
    }

    const pushNext = () => {
      const index = marketPulseCursorRef.current % marketPulsePool.length;
      const base = marketPulsePool[index]!;
      marketPulseCursorRef.current += 1;
      const n = marketPulseCursorRef.current;
      const next: TradePostTrade & { liveId: string } = {
        ...base,
        amountUsd: Math.max(
          1,
          Math.round(
            base.amountUsd *
              (0.78 + (hashString(`${base.wallet}-m${n}`) % 40) / 100) *
              100,
          ) / 100,
        ),
        txHash: `${base.txHash ?? "mpulse"}-stream-${n}`,
        timestamp: new Date().toISOString(),
        liveId: `mpulse-${n}-${base.wallet}`,
      };
      setMarketPulseItems((prev) => [next, ...prev].slice(0, 48));
    };

    const id = window.setInterval(pushNext, 1800);
    return () => window.clearInterval(id);
  }, [
    showingMarketDetail,
    marketDetailTab,
    feedPositionTrade,
    marketPulsePool,
  ]);

  const cashOutMarketPosition = (
    item: StoredUserTrade,
    result: {
      price: number;
      amountUsd: number;
      pnlUsd: number;
      userCaption?: string | null;
      userGifUrl?: string | null;
    },
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
        userCaption: result.userCaption ?? null,
        userGifUrl: result.userGifUrl ?? null,
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

  const beginCashOut = (position: PolymarketWalletPosition) => {
    const posSlug = (position.marketSlug ?? "").toLowerCase();
    const posTitle = position.marketTitle.trim().toLowerCase();
    const posOutcome = position.outcome.trim().toLowerCase();
    const match =
      userTrades.find((item) => {
        if (item.cashedOut || item.trade.side.toUpperCase() === "SELL") {
          return false;
        }
        const slug = (item.trade.marketSlug ?? "").toLowerCase();
        const title = item.trade.marketTitle.trim().toLowerCase();
        const sameMarket = (posSlug && slug === posSlug) || title === posTitle;
        return sameMarket && item.trade.outcome.trim().toLowerCase() === posOutcome;
      }) ?? null;
    const local = findLocalMarket(
      [...liveMarkets, ...trendingMarkets, ...searchResults],
      position.marketSlug ?? "",
      position.marketTitle,
    );
    const market =
      local ??
      (selectedMarket &&
      ((posSlug &&
        (selectedMarket.slug || selectedMarket.marketId).toLowerCase() ===
          posSlug) ||
        selectedMarket.title.trim().toLowerCase() === posTitle)
        ? selectedMarket
        : null) ??
      optimisticMarketFromOpen(
        position.marketSlug ?? position.marketTitle,
        position.marketTitle,
        {
          image: position.image,
          price: position.markPrice,
          outcome: position.outcome,
        },
      );
    const withImage =
      position.image && !market.image ? { ...market, image: position.image } : market;
    setCashOutItem(
      match ??
        storedTradeFromPosition(
          position,
          demoProfile?.wallet ?? LOCAL_TRADER_WALLET,
        ),
    );
    setCashOutMarket(withImage);
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

  /** Realized PnL per closed (SELL) history row, keyed like the row itself. */
  const profileHistoryPnl = useMemo(() => {
    const keyOf = (trade: PolymarketWalletTrade) =>
      trade.txHash ??
      `${trade.timestamp}-${trade.side}-${trade.outcome}-${trade.price}`;
    const pnl = new Map<string, number>();
    for (const item of userTrades) {
      if (item.cashedOut && item.trade.side.toUpperCase() === "SELL") {
        pnl.set(
          item.trade.txHash ?? `${item.trade.timestamp}-${item.trade.side}-${item.trade.outcome}-${item.trade.price}`,
          item.position.pnlUsd,
        );
      }
    }
    const holdings = new Map<string, { shares: number; cost: number }>();
    const chronological = [...mergedProfileHistory].sort(
      (a, b) => Date.parse(a.timestamp ?? "") - Date.parse(b.timestamp ?? ""),
    );
    for (const trade of chronological) {
      const position = `${(trade.marketSlug ?? trade.marketTitle).toLowerCase()}-${trade.outcome.toLowerCase()}`;
      const held = holdings.get(position) ?? { shares: 0, cost: 0 };
      if (trade.side.toUpperCase() === "BUY") {
        holdings.set(position, {
          shares: held.shares + trade.size,
          cost: held.cost + trade.size * trade.price,
        });
        continue;
      }
      if (held.shares <= 0) continue;
      const avg = held.cost / held.shares;
      const sold = Math.min(trade.size, held.shares);
      const key = keyOf(trade);
      if (!pnl.has(key)) pnl.set(key, sold * (trade.price - avg));
      holdings.set(position, {
        shares: held.shares - sold,
        cost: held.cost - sold * avg,
      });
    }
    return pnl;
  }, [mergedProfileHistory, userTrades]);

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

  const exploreHeaderPnlRaw =
    demoProfile?.roiPercent != null
      ? profileBalance * (Math.max(0, demoProfile.roiPercent) / 100) +
        Math.max(0, copiedOpenPnl)
      : demoProfile?.totalPnl != null
        ? demoProfile.totalPnl + Math.max(0, copiedOpenPnl)
        : null;
  const exploreHeaderPnl =
    exploreHeaderPnlRaw == null ? null : Math.max(0, exploreHeaderPnlRaw);
  const exploreHeaderRoi =
    demoProfile?.roiPercent != null
      ? Math.max(0, demoProfile.roiPercent)
      : null;

  const exploreHeader = (
    <header className="mb-4 shrink-0 pt-2">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => openOwnProfile("explore")}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label="Open profile"
        >
          <UserAvatar
            seed={demoProfile?.wallet ?? profileUsername ?? "you"}
            label={profileUsername ?? "You"}
            className="h-10 w-10 shrink-0"
          />
          <div className="min-w-0">
            <p
              className={`text-[24px] font-semibold leading-none tracking-tight tabular-nums text-white ${instrumentSans.className}`}
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
            {demoProfileStatus === "ready" && exploreHeaderPnl !== null && (
              <p
                className={`mt-0.5 inline-flex items-baseline gap-1 text-[13px] font-semibold tabular-nums ${
                  exploreHeaderPnl > 0
                    ? "text-[#00D54B]"
                    : "text-white/45"
                }`}
              >
                <SignedUsdFlow value={exploreHeaderPnl} />
                {exploreHeaderRoi != null ? (
                  <span className="inline-flex items-baseline">
                    (
                    <SignedPercentFlow value={exploreHeaderRoi} />)
                  </span>
                ) : null}
              </p>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => setDepositOpen(true)}
          className="shrink-0 rounded-full bg-white/[0.1] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-opacity hover:opacity-90"
        >
          Deposit
        </button>
      </div>
    </header>
  );

  return (
    <div
      className={
        embed
          ? "relative h-full w-full min-h-0"
          : "relative flex h-full w-full items-center justify-center px-4"
      }
    >
      <article
        className={
          embed
            ? "relative flex h-full w-full min-h-0 select-none flex-col overflow-hidden bg-black text-white transition-[background-color] duration-100 [&_input]:select-text [&_textarea]:select-text motion-safe:[&_button]:origin-center motion-safe:[&_button]:transition-[transform,color,background-color,border-color,opacity] motion-safe:[&_button]:duration-150 motion-safe:[&_button]:ease-out motion-safe:[&_button:active]:scale-[0.96]"
            : "relative flex h-[740px] w-full max-w-[360px] select-none flex-col overflow-hidden rounded-[32px] bg-black text-white transition-[background-color] duration-100 [&_input]:select-text [&_textarea]:select-text motion-safe:[&_button]:origin-center motion-safe:[&_button]:transition-[transform,color,background-color,border-color,opacity] motion-safe:[&_button]:duration-150 motion-safe:[&_button]:ease-out motion-safe:[&_button:active]:scale-[0.96]"
        }
        style={
          showingMarketDetail ? { backgroundColor: marketAccent } : undefined
        }
        aria-label="Polymarket API data"
        aria-busy={
          (section === "explore" &&
            !showingDrillDown &&
            (marketsStatus === "loading" || listsStatus === "loading")) ||
          (section === "search" &&
            !showingDrillDown &&
            (searchStatus === "loading" || leaderboardStatus === "loading")) ||
          (showingListDetail && listDetailStatus === "loading") ||
          (showingWalletProfile && walletStatus === "loading") ||
          (showingMarketDetail && marketStatus === "loading") ||
          (section === "profile" &&
            !showingDrillDown &&
            demoProfileStatus === "loading") ||
          (section === "feed" &&
            !showingDrillDown &&
            tradesStatus === "loading")
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
        <IosStatusBar />
        <div
          ref={scrollRef}
          className={`relative z-[1] h-full min-h-0 px-5 ${IOS_STATUS_PAD} [scrollbar-gutter:stable] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isExploreFeed
              ? "flex flex-col overflow-hidden"
              : showingDrillDown || showingProfileSubScreen
                ? "overflow-y-auto overscroll-contain pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                : "overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          }`}
          style={
            !showingDrillDown && !showingProfileSubScreen
              ? {
                  // Flow: clear floating Live control + tab bar.
                  paddingBottom:
                    section === "feed"
                      ? TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + 12 + 52
                      : TAB_BAR_CONTENT_INSET,
                }
              : showingMarketDetail
                ? { paddingBottom: TAB_BAR_CONTENT_INSET }
                : undefined
          }
        >
          {showingWalletProfile ? (
            <header className="mb-4 pt-12">
              <ProfileIdentityHeader
                seed={selectedWallet ?? "wallet"}
                name={walletLabel ?? shortWallet(selectedWallet ?? "")}
                wallet={selectedWallet ?? ""}
                avatarUrl={walletAvatarUrl}
                nameRef={stickyTitleRef}
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
                actions={
                  selectedWallet && !isOwnSelectedWallet ? (
                    <>
                      <button
                        type="button"
                        aria-pressed={isFollowing(selectedWallet)}
                        onClick={() => toggleFollow(selectedWallet)}
                        className={`flex flex-1 items-center justify-center gap-1.5 ${
                          isFollowing(selectedWallet)
                            ? ui.pillSecondary
                            : ui.pillPrimary
                        }`}
                      >
                        {isFollowing(selectedWallet) ? (
                          <>
                            <CheckGlyph />
                            Following
                          </>
                        ) : (
                          "Follow"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openCopyTrade(selectedWallet, walletLabel)}
                        className={`flex flex-1 items-center justify-center gap-1.5 ${ui.pillSecondary}`}
                      >
                        {copyButtonState(selectedWallet) === "copying" ? (
                          <>
                            <CheckGlyph />
                            Copying
                          </>
                        ) : copyButtonState(selectedWallet) === "paused" ? (
                          "Paused"
                        ) : (
                          "Copy trades"
                        )}
                      </button>
                    </>
                  ) : null
                }
              />
            </header>
          ) : showingListDetail ? (
            <header className="mb-4 pt-12">
              <h2 className={ui.title}>
                {listDetail?.name ?? "Squad"}
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
                className={`relative -mx-5 ${IOS_STATUS_BLEED} mb-3 overflow-hidden ${MARKET_ENTER}`}
              >
                <div className="pt-[92px]" />
                <h2 className="sr-only">
                  {selectedMarket?.title ?? "Market"}
                </h2>
              </header>
            ) : (
              <header
                key={`market-header-${selectedMarketSlug}`}
                className={`relative mb-4 pt-12 ${MARKET_ENTER}`}
              >
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
              </header>
            )
          ) : showingProfileSubScreen ? (
            <header className="mb-4 pt-12">
              <h2 className={ui.title}>
                {profileSubScreen === "referral" ? "Referrals" : "Settings"}
              </h2>
            </header>
          ) : section === "search" ? (
            <header className="mb-4">
              <h2
                ref={stickyTitleRef as RefObject<HTMLHeadingElement>}
                className={ui.title}
              >
                Search
              </h2>
              <label className="mt-4 flex items-center gap-2.5 rounded-full bg-white/[0.08] px-4 py-3 text-white/40">
                <span className="shrink-0">
                  <SearchTabIcon active={false} />
                </span>
                <span className="relative min-w-0 flex-1">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search markets or traders"
                    placeholder=""
                    className="relative z-[1] w-full bg-transparent text-[14px] text-white outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {!searchQuery.trim() && (
                    <SearchPlaceholderHint active={section === "search"} />
                  )}
                </span>
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
                      (demoProfile?.wallet
                        ? feedHandle(demoProfile.wallet)
                        : "You"))
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
                actions={
                  <button
                    type="button"
                    onClick={() => setDepositOpen(true)}
                    className={`flex-1 ${ui.pillPrimary}`}
                  >
                    Deposit
                  </button>
                }
              />
            </div>
          ) : null}

          {section === "search" && !showingDrillDown && (
            <div className="flex flex-col gap-6">
              <section aria-label="Trending">
                <h3 className="mb-3 text-[18px] font-semibold tracking-[-0.02em] text-white">
                  Trending
                </h3>
                <ul className="overflow-hidden rounded-[20px] bg-white/[0.08] ring-1 ring-white/[0.06]">
                  {searchTrendingRows.map((row) => (
                    <li key={row.market.marketId}>
                      <button
                        type="button"
                        onClick={() => openMarket(row.market)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold leading-snug text-white">
                            {row.market.title}
                          </p>
                          <p className="mt-0.5 truncate text-[13px] leading-snug text-white/45">
                            {row.outcome}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`text-[15px] font-semibold tabular-nums leading-none text-white ${instrumentSans.className}`}
                          >
                            {row.chance}%
                          </p>
                          <p
                            className={`mt-1 inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums leading-none ${
                              row.up ? "text-[#00D54B]" : "text-[#FF375F]"
                            }`}
                          >
                            <span aria-hidden>{row.up ? "▲" : "▼"}</span>
                            {row.changePts}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Top traders">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="min-w-0 shrink text-[18px] font-semibold tracking-[-0.02em] text-white">
                      Top traders
                    </h3>
                    <div className="flex shrink-0 items-center gap-4">
                      <FilterDropdown
                        ariaLabel="Leaderboard category"
                        value={leaderboardCategory}
                        onChange={setLeaderboardCategory}
                        options={LEADERBOARD_CATEGORY_OPTIONS}
                      />
                      <FilterDropdown
                        ariaLabel="Leaderboard period"
                        value={leaderboardPeriod}
                        onChange={setLeaderboardPeriod}
                        options={LEADERBOARD_PERIOD_OPTIONS}
                      />
                    </div>
                  </div>

                  {leaderboardStatus === "loading" && (
                    <div className="space-y-2.5 animate-pulse" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-[64px] rounded-xl bg-white/10"
                        />
                      ))}
                    </div>
                  )}
                  {leaderboardStatus === "error" && (
                    <p className="text-sm text-white/55">
                      Couldn&apos;t load leaderboard. Try again in a moment.
                    </p>
                  )}
                  {leaderboardStatus === "ready" &&
                    visibleLeaderboardWallets.length === 0 && (
                      <p className="text-sm text-white/55">
                        {leaderboardCategory === "all"
                          ? "No wallet leaderboard entries yet."
                          : "No traders in this category yet."}
                      </p>
                    )}
                  {leaderboardStatus === "ready" &&
                    visibleLeaderboardWallets.length > 0 && (
                      <ol className="divide-y divide-white/[0.06]">
                        {visibleLeaderboardWallets.map((wallet, index) => {
                          const pnlPositive = wallet.totalPnl >= 0;
                          return (
                            <li key={wallet.wallet}>
                              <ActivityRow
                                compact
                                leading={
                                  <div className="flex items-center gap-2">
                                    <RankBadge rank={index + 1} />
                                    <UserAvatar
                                      seed={wallet.wallet}
                                      label={
                                        wallet.displayName ?? wallet.wallet
                                      }
                                      className="h-9 w-9 text-[12px]"
                                    />
                                  </div>
                                }
                                title={
                                  wallet.displayName ??
                                  shortWallet(wallet.wallet)
                                }
                                subtitle={`${leaderboardWinRate(wallet)}% win rate`}
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
                </div>
              </section>

              <div className="flex flex-col gap-2.5">
                {searchStatus === "loading" && (
                  <div className="space-y-2.5 animate-pulse" aria-hidden>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[64px] rounded-xl bg-white/10"
                      />
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
                            {proxyImageSrc(market.image) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={proxyImageSrc(market.image)!}
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
                                {formatUsd(
                                  market.volumeUsd || market.volume24h,
                                )}{" "}
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

          {section === "rewards" && !showingDrillDown && (
            <RewardsScreen
              username={profileUsername}
              wallet={demoProfile?.wallet ?? null}
              points={0}
              titleRef={stickyTitleRef}
              onOpenProfile={() => openOwnProfile("rewards")}
              onShare={() => void shareRewards()}
              onOpenHowToEarn={() => setHowToEarnOpen(true)}
            />
          )}

          {section === "feed" && !showingDrillDown && (
            <>
              {tradesStatus === "loading" && liveFeedItems.length === 0 && (
                <ul className="flex flex-col animate-pulse" aria-hidden>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FeedItemSkeleton key={i} />
                  ))}
                </ul>
              )}
              {tradesStatus === "error" && liveFeedItems.length === 0 && (
                <p className="text-sm text-white/55">
                  Couldn&apos;t load Pulse. Try again in a moment.
                </p>
              )}
              {tradesStatus === "ready" &&
                feedPoolTrades.length === 0 &&
                liveFeedItems.length === 0 && (
                  <p className="text-sm text-white/55">
                    No recent trades yet. Check back in a moment.
                  </p>
                )}
              {liveFeedItems.length > 0 && (
                <div className="flex min-h-[calc(100%-0.5rem)] flex-col justify-end">
                  <ul className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {liveFeedItems.map((trade) => (
                        <motion.li
                          key={trade.liveId}
                          layout
                          initial={{ opacity: 0, y: 18 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 420,
                            damping: 32,
                            mass: 0.7,
                          }}
                        >
                          <TradePost
                            variant="message"
                            trade={trade}
                            handle={resolveFeedHandle(trade.wallet)}
                            caption=""
                            gifUrl={null}
                            marketImage={
                              trade.marketImage ??
                              (trade.marketSlug
                                ? marketImageBySlug.get(trade.marketSlug)
                                : undefined) ??
                              undefined
                            }
                            onOpenWallet={(wallet) => openWallet(wallet, null)}
                            onOpenTrade={() => setFeedPositionTrade({ trade })}
                            onOpenMarket={() =>
                              openMarketBySlug(
                                trade.marketSlug || trade.marketTitle,
                                trade.marketTitle,
                                {
                                  image:
                                    trade.marketImage ??
                                    (trade.marketSlug
                                      ? marketImageBySlug.get(trade.marketSlug)
                                      : undefined) ??
                                    null,
                                  price: trade.price,
                                  outcome: trade.outcome,
                                },
                              )
                            }
                            currentUser={commentAuthor}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  <div ref={liveFeedBottomRef} aria-hidden className="h-px" />
                </div>
              )}
            </>
          )}

          {isExploreFeed && (
            <div
              ref={exploreHeaderRef}
              className={`absolute inset-x-5 top-[52px] z-0 origin-top transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                feedScrolled ? "pointer-events-none" : ""
              }`}
              style={{
                opacity: feedScrolled ? 0 : 1,
                transform: feedScrolled ? "scale(0.92)" : "scale(1)",
              }}
            >
              {exploreHeader}
            </div>
          )}

          {isExploreFeed && (
            <section
              ref={feedSnapRef}
              aria-label="Market previews"
              className="pointer-events-none relative z-[1] -mx-5 -my-6 min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{
                maskImage: FEED_EDGE_MASK,
                WebkitMaskImage: FEED_EDGE_MASK,
              }}
            >
              {marketsStatus === "loading" &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-full min-h-full snap-start snap-always flex-col px-1 py-6"
                    aria-hidden
                  >
                    {i === 0 ? (
                      <div aria-hidden className="shrink-0" style={{ height: exploreHeaderHeight }} />
                    ) : null}
                    <div className="min-h-0 w-full flex-1 animate-pulse rounded-[24px] bg-white/10" />
                  </div>
                ))}

              {marketsStatus === "error" && (
                <div className="px-5 pt-6">
                  <div aria-hidden className="shrink-0" style={{ height: exploreHeaderHeight }} />
                  <p className="text-sm text-white/55">
                    Couldn&apos;t load markets.
                  </p>
                </div>
              )}

              {marketsStatus === "ready" && homeFeedMarkets.length === 0 && (
                <div className="px-5 pt-6">
                  <div aria-hidden className="shrink-0" style={{ height: exploreHeaderHeight }} />
                  <p className="text-sm text-white/55">No markets right now.</p>
                </div>
              )}

              {marketsStatus === "ready" &&
                homeFeedMarkets.map((market, index) => {
                  const isFirst = index === 0;
                  const isFeaturedLive =
                    isFirst &&
                    liveMarkets[0]?.marketId === market.marketId &&
                    isSportsMarket(market);
                  // Only the current + next/prev page decode video & run timers.
                  const cardActive = Math.abs(index - feedPageIndex) <= 1;
                  return (
                    <div
                      key={market.marketId}
                      className="flex h-full min-h-full snap-start snap-always flex-col px-1 py-6"
                      style={{
                        contentVisibility: cardActive ? "visible" : "auto",
                        containIntrinsicSize: "auto 640px",
                      }}
                    >
                      {isFirst ? (
                        <div aria-hidden className="shrink-0" style={{ height: exploreHeaderHeight }} />
                      ) : null}
                      <div className="pointer-events-auto min-h-0 flex-1 pb-1">
                        {isFeaturedLive ? (
                          <LiveGameCard
                            market={market}
                            featured
                            fill
                            active={cardActive}
                            autoSwipeInsights={embed}
                            clip={homeFeedClips.get(market.marketId) ?? null}
                            onOpen={openMarket}
                            onTrade={openTradeFlow}
                            onOpenPosition={setFeedPositionTrade}
                          />
                        ) : (
                          <TrendingMarketCard
                            market={market}
                            fill
                            active={cardActive}
                            autoSwipeInsights={embed}
                            clip={homeFeedClips.get(market.marketId) ?? null}
                            onOpen={openMarket}
                            onTrade={openTradeFlow}
                            onOpenPosition={setFeedPositionTrade}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </section>
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
                                  className={`shrink-0 text-[22px] font-semibold tabular-nums ${instrumentSans.className}`}
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
                              className={`mt-1 text-[40px] font-semibold leading-none tracking-[-0.05em] tabular-nums ${instrumentSans.className}`}
                            >
                              <OddsCentsFlow price={left.price} />
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-medium text-white/45">
                              {right.label}
                            </p>
                            <p
                              className={`mt-1 text-[40px] font-semibold leading-none tracking-[-0.05em] tabular-nums text-white/55 ${instrumentSans.className}`}
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
                      onCashOut={() => beginCashOut(marketUserPosition.position)}
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
                          label: "Pulse",
                          count:
                            marketPulseItems.length > 0
                              ? marketPulseItems.length
                              : marketFeedTrades.length > 0
                                ? marketFeedTrades.length
                                : undefined,
                        },
                        {
                          id: "traders",
                          label: "Top performers",
                        },
                        { id: "rules", label: "Rules" },
                      ] as const
                    }
                  />

                  {marketDetailTab === "trades" &&
                    marketActivityStatus === "loading" &&
                    marketPulseItems.length === 0 &&
                    marketFeedTrades.length === 0 && (
                      <ul className="mt-3 flex flex-col gap-3 animate-pulse" aria-hidden>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <FeedItemSkeleton key={i} />
                        ))}
                      </ul>
                    )}

                  {marketDetailTab === "trades" &&
                    marketActivityStatus === "error" &&
                    marketPulseItems.length === 0 &&
                    marketFeedTrades.length === 0 && (
                      <p className="mt-3 text-sm text-white/55">
                        Couldn&apos;t load market activity.
                      </p>
                    )}

                  {marketDetailTab === "trades" &&
                    marketActivityStatus !== "loading" &&
                    marketPulseItems.length === 0 &&
                    marketFeedTrades.length === 0 && (
                      <p className="mt-3 text-sm text-white/55">
                        No pulse yet for this market.
                      </p>
                    )}

                  {marketDetailTab === "trades" && marketPulseItems.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-3">
                      <AnimatePresence initial={false}>
                        {marketPulseItems.map((trade) => (
                          <motion.li
                            key={trade.liveId}
                            layout
                            initial={{ opacity: 0, y: -14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 32,
                              mass: 0.7,
                            }}
                          >
                            <TradePost
                              variant="message"
                              trade={trade}
                              handle={resolveFeedHandle(trade.wallet)}
                              caption=""
                              gifUrl={null}
                              showMarketThumb={false}
                              showUserThumb
                              onOpenWallet={(wallet) =>
                                openWallet(wallet, null)
                              }
                              onOpenTrade={() =>
                                setFeedPositionTrade({ trade })
                              }
                              currentUser={commentAuthor}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}

                  {marketDetailTab === "traders" &&
                    marketActivityStatus !== "loading" &&
                    selectedMarket && (
                      <MarketTopTraders
                        marketKey={selectedMarket.slug || selectedMarket.marketId}
                        sides={getMarketOddsSides(selectedMarket).map(
                          (side, index, all) => {
                            const tones = matchupTeamTones(selectedMarket);
                            const { away, home } =
                              resolveSportsSides(selectedMarket);
                            const tone = tones
                              ? nickMatch(side.label, home.name) &&
                                !nickMatch(side.label, away.name)
                                ? tones.home
                                : nickMatch(side.label, away.name)
                                  ? tones.away
                                  : index === all.length - 1
                                    ? tones.home
                                    : tones.away
                              : null;
                            return {
                              label: side.label,
                              price: side.price,
                              color:
                                tone?.text ??
                                (index === 0 ? "#00D54B" : "#FF375F"),
                            };
                          },
                        )}
                        trades={marketActivity?.trades ?? []}
                        resolveHandle={resolveFeedHandle}
                        isFollowing={isFollowing}
                        onToggleFollow={toggleFollow}
                        onOpenWallet={(wallet) => openWallet(wallet, null)}
                      />
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

              {demoProfileStatus !== "loading" && (
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

                    {profileTab === "positions" && profilePositions.length === 0 && (
                      <p className="text-sm text-white/55">
                        No open positions yet. Pick a market and place your
                        first trade.
                      </p>
                    )}

                    {profileTab === "positions" && profilePositions.length > 0 && (
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
                      (profileHistoryStatus === "ready" ||
                        profileHistoryStatus === "idle") &&
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
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[96px] opacity-0"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${marketAccent} 42%, ${hexToRgba(marketAccent, 0.75)}, transparent)`,
            }}
          />
        )}

        {showingMarketDetail && (
          <div
            key={`market-title-${selectedMarketSlug}`}
            className="pointer-events-none absolute inset-x-0 top-0 z-20"
          >
            {sportsMarketView &&
              !tradeFlowMarket &&
              !feedPositionTrade &&
              !cashOutItem &&
              !copyTradeTarget &&
              !depositOpen && (
                <div className={`absolute inset-x-0 ${IOS_CHROME_TOP} flex justify-center px-16`}>
                  <div className="flex h-10 min-w-0 max-w-full items-center">
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
            aria-hidden={!pulseStickyAlways}
            className={`pointer-events-none absolute inset-x-0 top-0 z-20 ${
              pulseStickyAlways ? "opacity-100" : "opacity-0"
            }`}
          >
            {showingMarketDetail ? null : (
              <div className="h-[96px] bg-gradient-to-b from-black from-[42%] via-black/75 to-transparent" />
            )}
            <p
              className={`absolute ${IOS_CHROME_TOP} truncate text-center text-[15px] font-semibold leading-10 tracking-[-0.02em] text-white ${
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
          <div className={`absolute left-3.5 ${IOS_CHROME_TOP} z-30`}>
            <BlurBackButton
              onClick={drillBack.onClick}
              label={drillBack.label}
              circle
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
            <div className={`absolute right-3.5 ${IOS_CHROME_TOP} z-30`}>
              <BlurShareButton onClick={() => void shareMarket()} circle />
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
                {getMarketOddsSides(selectedMarket).map((side) => {
                  const tone = outcomeTeamTone(selectedMarket, side.label);
                  return (
                  <button
                    key={side.side}
                    type="button"
                    data-sfx="press"
                    onClick={() => openTradeFlow(selectedMarket, side.label)}
                    className={`min-w-0 flex-1 overflow-hidden px-3 ${
                      side.side === "yes" ? ui.pillYes : ui.pillNo
                    }`}
                    style={
                      tone
                        ? { backgroundColor: tone.fill, color: tone.ink }
                        : undefined
                    }
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
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                data-sfx="press"
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
          !howToEarnOpen &&
          !positionsOpen &&
          !onboardingOpen && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[9] h-[140px]"
            >
              <div
                className="absolute inset-0 backdrop-blur-[1px]"
                style={{
                  maskImage:
                    "linear-gradient(to top, black 0%, black 55%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to top, black 0%, black 55%, transparent 100%)",
                }}
              />
              <div
                className="absolute inset-0 backdrop-blur-[4px]"
                style={{
                  maskImage:
                    "linear-gradient(to top, black 0%, black 40%, transparent 78%)",
                  WebkitMaskImage:
                    "linear-gradient(to top, black 0%, black 40%, transparent 78%)",
                }}
              />
              <div
                className="absolute inset-0 backdrop-blur-[10px]"
                style={{
                  maskImage:
                    "linear-gradient(to top, black 0%, black 28%, transparent 62%)",
                  WebkitMaskImage:
                    "linear-gradient(to top, black 0%, black 28%, transparent 62%)",
                }}
              />
              <div
                className="absolute inset-0 backdrop-blur-[18px]"
                style={{
                  maskImage:
                    "linear-gradient(to top, black 0%, black 18%, transparent 48%)",
                  WebkitMaskImage:
                    "linear-gradient(to top, black 0%, black 18%, transparent 48%)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black from-15% via-black/55 to-transparent" />
            </div>
            {section === "feed" && (
              <div
                className="pointer-events-none absolute inset-x-0 z-[11] flex justify-center px-5"
                style={{
                  bottom: TAB_BAR_BOTTOM + TAB_BAR_HEIGHT + 12,
                }}
              >
                <button
                  type="button"
                  data-sfx="press"
                  onClick={() => setFeedLivePlaying((prev) => !prev)}
                  aria-pressed={feedLivePlaying}
                  aria-label={
                    feedLivePlaying ? "Pause live pulse" : "Play live pulse"
                  }
                  style={{ width: feedLivePlaying ? 79 : 99 }}
                  className="pointer-events-auto inline-flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-white/[0.12] text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md hover:bg-white/[0.18] motion-safe:!transition-[width,background-color] motion-safe:!duration-200 motion-safe:!ease-[cubic-bezier(0.32,0.72,0,1)]"
                >
                  {feedLivePlaying ? (
                    <FeedPauseIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <FeedPlayIcon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">
                    {feedLivePlaying ? "Live" : "Paused"}
                  </span>
                </button>
              </div>
            )}
            <TabBar
              activeTab={
                positionsOpen
                  ? "positions"
                  : section === "profile"
                    ? null
                    : section
              }
              onChange={handleSectionChange}
              positionCount={profilePositionCount}
              positionsPnl={profilePositionsPnl}
              positionsInvested={profilePositionsInvested}
              compact={isExploreFeed && feedPastHero}
            />
          </>
        )}
        {positionsOpen && (
          <PositionsSheet
            positions={profilePositions}
            loading={demoProfileStatus === "loading"}
            history={
              mergedProfileHistory.length > 0 ? (
                <ul className="divide-y divide-white/[0.06] px-1">
                  {mergedProfileHistory.map((trade, index) => (
                    <li
                      key={`${trade.txHash ?? trade.timestamp}-${trade.outcome}-${index}`}
                    >
                      <ProfileHistoryRow
                        trade={trade}
                        pnlUsd={profileHistoryPnl.get(
                          trade.txHash ??
                            `${trade.timestamp}-${trade.side}-${trade.outcome}-${trade.price}`,
                        )}
                        marketImage={
                          trade.marketSlug
                            ? profileMarketImages.get(trade.marketSlug)
                            : undefined
                        }
                        onOpen={(slug, title, hint) => {
                          setPositionsOpen(false);
                          openMarketBySlug(slug, title, hint);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              ) : profileHistoryStatus === "loading" ? (
                <div className="space-y-2 animate-pulse" aria-hidden>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[58px] rounded-xl bg-white/10" />
                  ))}
                </div>
              ) : undefined
            }
            onClose={() => setPositionsOpen(false)}
            onOpenPosition={(position) => {
              openMarketBySlug(
                position.marketSlug ?? "",
                position.marketTitle,
                {
                  image: position.image,
                  price: position.markPrice,
                  outcome: position.outcome,
                },
              );
            }}
            onCashOut={beginCashOut}
          />
        )}
        {SHOW_ONBOARDING && !embed && onboardingOpen && (
          <Onboarding
            traders={leaderboardWallets}
            tradersStatus={leaderboardStatus}
            marketImages={onboardingImages}
            teamLogos={onboardingLogos}
            isFollowing={isFollowing}
            onToggleFollow={toggleFollow}
            onComplete={completeOnboarding}
          />
        )}
        {feedPositionTrade && (
          <FeedPositionSheet
            trade={feedPositionTrade.trade}
            handle={
              feedPositionTrade.handle ??
              resolveFeedHandle(feedPositionTrade.trade.wallet)
            }
            avatarUrl={feedPositionTrade.avatarUrl}
            marketImage={
              feedPositionTrade.trade.marketImage ??
              (feedPositionTrade.trade.marketSlug
                ? marketImageBySlug.get(feedPositionTrade.trade.marketSlug)
                : undefined) ??
              undefined
            }
            volume24h={
              feedPositionTrade.trade.marketSlug
                ? marketBySlug.get(feedPositionTrade.trade.marketSlug)
                    ?.volume24h
                : undefined
            }
            market={
              feedPositionTrade.trade.marketSlug
                ? marketBySlug.get(feedPositionTrade.trade.marketSlug)
                : undefined
            }
            outcomeTone={(label) => {
              const slug = feedPositionTrade.trade.marketSlug;
              const market = slug ? marketBySlug.get(slug) : undefined;
              return market ? outcomeTeamTone(market, label) : null;
            }}
            onClose={() => setFeedPositionTrade(null)}
            following={isFollowing(feedPositionTrade.trade.wallet)}
            onFollowToggle={() =>
              toggleFollow(feedPositionTrade.trade.wallet)
            }
            isOwn={Boolean(
              demoProfile?.wallet &&
                feedPositionTrade.trade.wallet.toLowerCase() ===
                  demoProfile.wallet.toLowerCase(),
            )}
            onOpenWallet={() =>
              openWallet(
                feedPositionTrade.trade.wallet,
                feedPositionTrade.handle ??
                  resolveFeedHandle(feedPositionTrade.trade.wallet),
                feedPositionTrade.avatarUrl,
              )
            }
            onTrade={
              demoProfile?.wallet
                ? (outcome) => {
                    openTradeFlow(
                      marketFromFeedTrade(
                        feedPositionTrade.trade,
                        marketBySlug.get(
                          feedPositionTrade.trade.marketSlug,
                        ),
                        feedPositionTrade.trade.marketSlug
                          ? marketImageBySlug.get(
                              feedPositionTrade.trade.marketSlug,
                            )
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
        {tradeFlowMarket && (
          <TradeFlowModal
            market={tradeFlowMarket}
            initialOutcome={tradeFlowOutcome}
            wallet={demoProfile?.wallet ?? LOCAL_TRADER_WALLET}
            handle={ownShareHandle}
            referralCode={referralCode}
            maxAmount={Math.max(100, profileBalance)}
            nested={Boolean(feedPositionTrade)}
            onClose={closeTradeFlow}
            onComplete={handleTradeComplete}
            onShare={setSharePosition}
          />
        )}
        {cashOutItem && cashOutMarket && (
          <CashOutModal
            item={cashOutItem}
            market={cashOutMarket}
            handle={ownShareHandle}
            referralCode={referralCode}
            onClose={() => {
              setCashOutItem(null);
              setCashOutMarket(null);
            }}
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
        {howToEarnOpen && (
          <HowToEarnSheet onClose={() => setHowToEarnOpen(false)} />
        )}
      </article>
    </div>
  );
}
