/**
 * PolymarketScan Agent API — free market data, no API key required.
 * Docs: https://polymarketscan.org/api / https://polymarketscan.org/agents
 */
const AGENT_API_BASE =
  "https://gzydspfquuaudqeztorw.supabase.co/functions/v1/agent-api";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

/** PolymarketScan public Supabase — same anon key shipped in their frontend. */
const SUPABASE_REST_BASE =
  "https://gzydspfquuaudqeztorw.supabase.co/rest/v1";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWRzcGZxdXVhdWRxZXp0b3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTI5NjUsImV4cCI6MjA4MDQ2ODk2NX0.97m7q4bYcy8xU-OqcuAeHytV45XFm8ddLhSu39Ztvmk";

const CACHE_TTL_MS = 60_000;

const fetchNoStore = {
  cache: "no-store" as const,
};

export type LiveGameTeam = {
  name: string;
  score: number | null;
  logo?: string | null;
  abbr?: string | null;
  portrait?: boolean;
};

export type LiveGameInfo = {
  league: string;
  status: "live" | "upcoming" | "final";
  clock: string;
  away: LiveGameTeam;
  home: LiveGameTeam;
};

export type PolymarketMarketOutcome = {
  label: string;
  price: number;
  marketId: string;
  slug: string;
  logo?: string | null;
};

export type PolymarketMarketData = {
  marketId: string;
  title: string;
  slug: string;
  category: string | null;
  yesPrice: number;
  noPrice: number;
  volumeUsd: number;
  volume24h: number;
  liquidityUsd: number;
  image: string | null;
  closesAt: string | null;
  isResolved: boolean;
  price24hChange: number | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  groupItemTitle?: string | null;
  outcomes?: PolymarketMarketOutcome[];
  relatedMarketCount?: number;
  liveGame?: LiveGameInfo;
  /** Team marks for sports markets (matchups, futures, and named outcomes). */
  teams?: PolymarketSportsTeam[];
  /** Polymarket resolution rules / description. */
  rules?: string | null;
};

export type PolymarketSportsTeam = {
  name: string;
  logo: string | null;
  abbr: string | null;
  portrait?: boolean;
};

export type PolymarketTradeWithPnl = {
  side: "BUY" | "SELL" | string;
  outcome: string;
  price: number;
  amountUsd: number;
  marketTitle: string;
  marketSlug: string;
  marketCategory: string | null;
  marketImage?: string | null;
  wallet: string;
  timestamp: string | null;
  txHash: string | null;
  /** Wallet lifetime PnL from wallet_pnl, when available. */
  totalPnl: number | null;
  winRate: number | null;
  tradeCount: number | null;
};

export type PolymarketWatchList = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  walletCount: number;
  aggregatedPnl: number;
  totalVolume: number;
  followerCount: number;
};

export type PolymarketWatchListWallet = {
  wallet: string;
  displayName: string | null;
  totalPnl: number;
  volume: number;
  winRate: number;
  tradeCount: number;
};

export type PolymarketLeaderboardWallet = {
  wallet: string;
  displayName: string | null;
  totalPnl: number;
  volume: number;
  winRate: number;
  tradeCount: number;
};

export type PolymarketMarketTrade = {
  side: string;
  outcome: string;
  price: number;
  amountUsd: number;
  wallet: string;
  timestamp: string | null;
  txHash: string | null;
};

export type PolymarketMarketTrader = {
  wallet: string;
  totalPnl: number | null;
  winRate: number | null;
  tradeCount: number | null;
  volumeUsd: number;
};

export type PolymarketMarketActivity = {
  trades: PolymarketMarketTrade[];
  traders: PolymarketMarketTrader[];
};

export type PolymarketWatchListTrade = {
  side: string;
  outcome: string;
  price: number;
  size: number;
  wallet: string;
  marketTitle: string;
  marketSlug: string | null;
  timestamp: string | null;
};

export type PolymarketWatchListDetail = PolymarketWatchList & {
  wallets: PolymarketWatchListWallet[];
  recentTrades: PolymarketWatchListTrade[];
};

export type PolymarketWalletTrade = {
  side: string;
  outcome: string;
  price: number;
  size: number;
  marketTitle: string;
  marketSlug: string | null;
  timestamp: string | null;
  txHash: string | null;
};

export type PolymarketWalletProfile = {
  wallet: string;
  totalPnl: number | null;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  roiPercent: number | null;
  winRate: number | null;
  wins: number | null;
  losses: number | null;
  tradeCount: number | null;
  totalVolumeUsd: number | null;
  portfolioValue: number;
  recentTrades: PolymarketWalletTrade[];
  positions: PolymarketWalletPosition[];
  history: Array<{ time: number; value: number }>;
};

export type PolymarketWalletPosition = {
  marketTitle: string;
  marketSlug: string | null;
  outcome: string;
  shares: number;
  avgPrice: number;
  markPrice: number;
  valueUsd: number;
  pnlUsd: number;
  image: string | null;
};

export type PolymarketDemoProfile = {
  wallet: string;
  displayName: string | null;
  portfolioValue: number;
  totalPnl: number | null;
  todayPnl: number | null;
  roiPercent: number | null;
  winRate: number | null;
  positionCount: number;
  positions: PolymarketWalletPosition[];
  history: Array<{ time: number; value: number }>;
};

type AgentMarketRaw = {
  market_id?: string;
  title?: string;
  slug?: string;
  category?: string | null;
  yes_price?: number;
  no_price?: number;
  volume_usd?: number;
  volume_24h?: number;
  liquidity_usd?: number;
  image?: string | null;
  closes_at?: string | null;
  is_resolved?: boolean;
  price_24h_change?: number;
  event_title?: string | null;
  event_slug?: string | null;
  group_item_title?: string | null;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cacheByKey = new Map<string, CacheEntry<unknown>>();
const inFlightByKey = new Map<string, Promise<unknown>>();

type AgentWhaleTradeRaw = {
  side?: string;
  price?: number;
  wallet?: string;
  outcome?: string;
  tx_hash?: string;
  timestamp?: string;
  amount_usd?: number;
  market_id?: string;
  market_slug?: string;
  market_title?: string;
  market_category?: string | null;
};

type AgentTransferRaw = {
  tx_hash?: string;
  block_time?: string;
  from_address?: string;
  to_address?: string;
  from_eoa?: string | null;
  to_eoa?: string | null;
  amount?: number;
  notional_usd?: number;
  market_slug?: string;
  market_question?: string;
  outcome_name?: string;
};

type AgentWalletPnlRaw = {
  summary?: {
    total_pnl?: number;
    win_rate?: number;
    trade_count?: number;
  };
};

const SPORTS_HINT =
  /\b(mlb|nba|nfl|nhl|ufc|atp|wta|lol|esports|soccer|football|baseball|basketball|tennis|vs\.|premier league|world cup|champions league)\b/i;

const GAME_DAY_HINT = /\bwin on \d{4}[-/]\d{2}[-/]\d{2}\b/i;

/** Named-outcome markets (teams, spreads, Up/Down) rather than Yes / No. */
const NAMED_OUTCOME_TITLE =
  /\s+vs\.?\s+|^(spread|moneyline|ml)\b|:\s*o\/?u\b|\bo\/?u\b|\bover\/under\b|\bup or down\b|\bhigher or lower\b/i;

const YES_NO_QUESTION =
  /^(will|is|are|does|do|has|have|can|could|should|did|was|were)\b|\?\s*$/i;

/** Titles whose displayed outcomes are Yes / No, not team names. */
export function isYesNoBinaryTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  if (NAMED_OUTCOME_TITLE.test(trimmed)) return false;
  return YES_NO_QUESTION.test(trimmed);
}

export function isYesNoOutcome(outcome: string): boolean {
  const value = outcome.trim().toLowerCase();
  return value === "yes" || value === "no";
}

export function isYesNoBinaryMarket(market: {
  title: string;
  yesPrice: number;
  noPrice: number;
}): boolean {
  if (!isYesNoBinaryTitle(market.title)) return false;
  const sum = market.yesPrice + market.noPrice;
  return sum > 0.85 && sum < 1.15;
}

export type MarketOddsSide = {
  label: string;
  price: number;
  /** PolymarketScan maps side A → yes_price, side B → no_price. */
  side: "yes" | "no";
};

/** Real display odds from PolymarketScan (teams/players/Up-Down), not only Yes/No. */
export function getMarketOddsSides(market: {
  title: string;
  yesPrice: number;
  noPrice: number;
  outcomes?: PolymarketMarketOutcome[];
  groupItemTitle?: string | null;
}): MarketOddsSide[] {
  const named = (market.outcomes ?? []).filter((outcome) => {
    const label = outcome.label.trim().toLowerCase();
    return label.length > 0 && label !== "yes" && label !== "no";
  });

  if (named.length === 2) {
    return named.map((outcome, index) => ({
      label: outcome.label,
      price: outcome.price,
      side: (index === 0 ? "yes" : "no") as "yes" | "no",
    }));
  }

  if (named.length === 1 || (named.length > 2 && market.groupItemTitle)) {
    const label = market.groupItemTitle ?? named[0]!.label;
    return [
      { label, price: market.yesPrice, side: "yes" },
      { label: "No", price: market.noPrice, side: "no" },
    ];
  }

  const matchup = parseMatchupTitle(market.title);
  if (matchup) {
    return [
      { label: matchup.away, price: market.yesPrice, side: "yes" },
      { label: matchup.home, price: market.noPrice, side: "no" },
    ];
  }

  const upDown = market.title.match(/\bup or down\b/i);
  if (upDown) {
    return [
      { label: "Up", price: market.yesPrice, side: "yes" },
      { label: "Down", price: market.noPrice, side: "no" },
    ];
  }

  const overUnder = market.title.match(/\b(o\/?u|over\/under)\b/i);
  if (overUnder) {
    return [
      { label: "Over", price: market.yesPrice, side: "yes" },
      { label: "Under", price: market.noPrice, side: "no" },
    ];
  }

  return [
    { label: "Yes", price: market.yesPrice, side: "yes" },
    { label: "No", price: market.noPrice, side: "no" },
  ];
}

function outcomeMatchesTeam(
  label: string,
  team: { name: string; abbr?: string | null },
): boolean {
  const a = label.trim().toLowerCase();
  const b = team.name.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const abbr = team.abbr?.trim().toLowerCase();
  return Boolean(abbr && a === abbr);
}

/** Team code (NYR, LA) for a sports outcome, when the market already has one. */
export function sportsOutcomeAbbr(
  market: {
    liveGame?: LiveGameInfo;
    teams?: PolymarketSportsTeam[];
  },
  outcomeLabel: string,
): string | null {
  const teams = market.teams ?? [];
  const candidates: { name: string; abbr: string | null }[] = [
    {
      name: teams[0]?.name || market.liveGame?.away.name || "",
      abbr: teams[0]?.abbr ?? market.liveGame?.away.abbr ?? null,
    },
    {
      name: teams[1]?.name || market.liveGame?.home.name || "",
      abbr: teams[1]?.abbr ?? market.liveGame?.home.abbr ?? null,
    },
    ...teams.slice(2),
  ];

  for (const team of candidates) {
    const abbr = team.abbr?.trim();
    if (!abbr) continue;
    if (outcomeMatchesTeam(outcomeLabel, team)) return abbr.toUpperCase();
  }
  return null;
}

/** Two-sided markets we can trade with a pair of outcome buttons. */
export function isTwoSidedMarket(market: {
  title: string;
  yesPrice: number;
  noPrice: number;
  outcomes?: PolymarketMarketOutcome[];
  groupItemTitle?: string | null;
  relatedMarketCount?: number;
}): boolean {
  const sum = market.yesPrice + market.noPrice;
  if (!(sum > 0.85 && sum < 1.15)) return false;
  const named = (market.outcomes ?? []).filter((outcome) => {
    const label = outcome.label.trim().toLowerCase();
    return label.length > 0 && label !== "yes" && label !== "no";
  });
  if (named.length > 2) return false;
  if ((market.relatedMarketCount ?? 1) > 2) return false;
  return getMarketOddsSides(market).length === 2;
}

/** Sports markets shown in the playground API Markets feed. */
export const SPORTS_MARKET_FEED_SLUGS = [
  "will-argentina-win-the-2026-fifa-world-cup-245",
  "will-liverpool-reach-the-uefa-champions-league-quarter-finals",
  "nba-2025-26-rpg-leader-victor-wembanyama",
  "nfl-buf-den-2026-01-17",
] as const;

function normalizeMarket(raw: AgentMarketRaw): PolymarketMarketData | null {
  if (
    typeof raw.market_id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.yes_price !== "number" ||
    typeof raw.no_price !== "number"
  ) {
    return null;
  }

  const groupItemTitle =
    typeof raw.group_item_title === "string" && raw.group_item_title.trim()
      ? raw.group_item_title.trim()
      : null;
  const eventTitle =
    typeof raw.event_title === "string" && raw.event_title.trim()
      ? raw.event_title.trim()
      : null;
  const eventSlug =
    typeof raw.event_slug === "string" && raw.event_slug.trim()
      ? raw.event_slug.trim()
      : null;
  const slug = typeof raw.slug === "string" ? raw.slug : raw.market_id;
  const marketId = raw.market_id;
  const sides = getMarketOddsSides({
    title: raw.title,
    yesPrice: raw.yes_price,
    noPrice: raw.no_price,
    groupItemTitle,
    outcomes: groupItemTitle
      ? [
          {
            label: groupItemTitle,
            price: raw.yes_price,
            marketId,
            slug,
          },
        ]
      : undefined,
  });
  const outcomes: PolymarketMarketOutcome[] = sides.map((side) => ({
    label: side.label,
    price: side.price,
    marketId,
    slug,
  }));

  return {
    marketId,
    title: raw.title,
    slug: typeof raw.slug === "string" ? raw.slug : raw.market_id,
    category: raw.category ?? null,
    yesPrice: raw.yes_price,
    noPrice: raw.no_price,
    volumeUsd: typeof raw.volume_usd === "number" ? raw.volume_usd : 0,
    volume24h: typeof raw.volume_24h === "number" ? raw.volume_24h : 0,
    liquidityUsd: typeof raw.liquidity_usd === "number" ? raw.liquidity_usd : 0,
    image: typeof raw.image === "string" ? raw.image : null,
    closesAt: typeof raw.closes_at === "string" ? raw.closes_at : null,
    isResolved: Boolean(raw.is_resolved),
    price24hChange:
      typeof raw.price_24h_change === "number" ? raw.price_24h_change : null,
    eventTitle,
    eventSlug,
    groupItemTitle,
    outcomes,
    relatedMarketCount: 1,
  };
}

async function fetchMarketDetail(
  params: { id?: string; slug?: string },
): Promise<PolymarketMarketData | null> {
  const query = new URLSearchParams({
    action: "market",
    agent_id: "portfolio-site",
  });
  if (params.id) query.set("id", params.id);
  if (params.slug) query.set("slug", params.slug);

  try {
    const res = await fetch(`${AGENT_API_BASE}?${query}`, fetchNoStore);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      ok?: boolean;
      data?: AgentMarketRaw;
    };
    if (!json.ok || !json.data) return null;
    return normalizeMarket(json.data);
  } catch (error) {
    console.error("PolymarketScan market request failed:", error);
    return null;
  }
}

async function searchMarket(
  queryText: string,
): Promise<PolymarketMarketData | null> {
  const q = queryText.trim();
  if (!q) return null;

  try {
    const query = new URLSearchParams({
      action: "search",
      q,
      agent_id: "portfolio-site",
    });
    const res = await fetch(`${AGENT_API_BASE}?${query}`, fetchNoStore);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      ok?: boolean;
      data?: AgentMarketRaw[];
    };
    if (!json.ok || !Array.isArray(json.data) || json.data.length === 0) {
      return null;
    }

    const candidates = json.data
      .map(normalizeMarket)
      .filter((m): m is PolymarketMarketData => m !== null);
    const exactSlug = candidates.find((m) => m.slug === q);
    const exactTitle = candidates.find(
      (m) => m.title.toLowerCase() === q.toLowerCase(),
    );
    const normalized = exactSlug ?? exactTitle ?? candidates[0] ?? null;
    if (!normalized) return null;

    // Prefer a fresh detail payload when search only returns a partial hit.
    const detailed =
      (await fetchMarketDetail({ slug: normalized.slug })) ??
      (await fetchMarketDetail({ id: normalized.marketId })) ??
      normalized;
    return detailed;
  } catch (error) {
    console.error("PolymarketScan market search failed:", error);
    return null;
  }
}

/** Full-text market search for the Search tab. */
export async function searchMarkets(
  queryText: string,
  options?: { limit?: number },
): Promise<PolymarketMarketData[]> {
  const q = queryText.trim();
  if (!q) return [];

  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 30);
  const key = `search-all-v3:${q.toLowerCase()}:${limit}`;
  const cached = getCached<PolymarketMarketData[]>(key);
  if (cached) return cached;

  try {
    const query = new URLSearchParams({
      action: "search",
      q,
      agent_id: "portfolio-site",
    });
    const res = await fetch(`${AGENT_API_BASE}?${query}`, fetchNoStore);
    if (!res.ok) return [];

    const json = (await res.json()) as {
      ok?: boolean;
      data?: AgentMarketRaw[];
    };
    if (!json.ok || !Array.isArray(json.data)) return [];

    const markets = await withSportsTitlePhotos(
      json.data
        .map(normalizeMarket)
        .filter((m): m is PolymarketMarketData => m !== null)
        .filter((m) => !m.isResolved)
        .slice(0, limit),
    );

    setCache(key, markets, 30_000);
    return markets;
  } catch (error) {
    console.error("PolymarketScan markets search failed:", error);
    return [];
  }
}

/**
 * Resolve a market by slug, id, and/or search query.
 * Agent `market` lookups 404 for many short-lived sports/event slugs, so we
 * fall back across identifiers before giving up.
 */
export async function getMarketData(options: {
  slug?: string | null;
  id?: string | null;
  query?: string | null;
  withRules?: boolean;
}): Promise<PolymarketMarketData | null> {
  const slug = options.slug?.trim() || null;
  const id = options.id?.trim() || null;
  const query = options.query?.trim() || null;
  const key = `market:${slug ?? ""}:${id ?? ""}:${query ?? ""}`;
  const cached = getCached<PolymarketMarketData>(key);
  if (cached) {
    if (!options.withRules || cached.rules) return cached;
    const rules = await fetchMarketRules({
      slug: cached.slug || slug,
      eventSlug: cached.eventSlug,
      id: cached.marketId || id,
    });
    const next = { ...cached, rules };
    setCache(key, next);
    return next;
  }

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketMarketData | null>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const titleOf = (market: PolymarketMarketData | null) =>
        market?.title.trim().toLowerCase() ?? "";
      const queryTitle = query?.trim().toLowerCase() ?? "";
      const titleClose = (market: PolymarketMarketData | null) => {
        if (!queryTitle || !market) return false;
        const title = titleOf(market);
        const group = (market.groupItemTitle ?? "").trim().toLowerCase();
        return (
          title === queryTitle ||
          title.includes(queryTitle) ||
          queryTitle.includes(title) ||
          (group.length > 0 &&
            (queryTitle.includes(group) || group.includes(queryTitle)))
        );
      };

      const [fromSlug, fromId, fromQuery] = await Promise.all([
        slug
          ? fetchMarketDetail({ slug }).then(async (market) => {
              if (market) return market;
              if (/^\d+$/.test(slug)) return fetchMarketDetail({ id: slug });
              return null;
            })
          : Promise.resolve(null),
        !slug && id ? fetchMarketDetail({ id }) : Promise.resolve(null),
        query
          ? searchMarket(query)
          : slug
            ? searchMarket(slug.replace(/-/g, " "))
            : Promise.resolve(null),
      ]);

      const candidates = [fromQuery, fromSlug, fromId].filter(
        (market): market is PolymarketMarketData => market !== null,
      );
      let market: PolymarketMarketData | null = null;
      if (queryTitle) {
        market =
          candidates.find((item) => titleOf(item) === queryTitle) ??
          candidates.find(titleClose) ??
          null;
      } else {
        market = fromSlug ?? fromId ?? fromQuery;
      }

      if (!market) return getCached<PolymarketMarketData>(key);
      market = await withSportsTitlePhoto(market);
      if (options.withRules && !market.rules) {
        const rules = await fetchMarketRules({
          slug: market.slug || slug,
          eventSlug: market.eventSlug,
          id: market.marketId || id,
        });
        market = { ...market, rules };
      }
      setCache(key, market);
      if (slug) setCache(`slug:${slug}`, market);
      if (market.slug) setCache(`slug:${market.slug}`, market);
      return market;
    } catch (error) {
      console.error("Error resolving PolymarketScan market:", error);
      return getCached<PolymarketMarketData>(key);
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

function getCached<T>(key: string): T | null {
  const cached = cacheByKey.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  return null;
}

function setCache<T>(key: string, value: T, ttlMs = CACHE_TTL_MS) {
  cacheByKey.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cleanRules(text: string | null | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  const cleaned = text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function fetchGammaJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GAMMA_API_BASE}${path}`, {
      ...fetchNoStore,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error("Polymarket Gamma request failed:", error);
    return null;
  }
}

type ScanMarketRulesRow = {
  slug?: string | null;
  market_id?: string | null;
  rules_text?: string | null;
};

/** Resolution rules from PolymarketScan `market_rules_cache`. */
export async function fetchMarketRules(options: {
  slug?: string | null;
  eventSlug?: string | null;
  id?: string | null;
}): Promise<string | null> {
  const slugs = [
    ...new Set(
      [options.slug, options.eventSlug]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const id = options.id?.trim() || null;

  for (const slug of slugs) {
    const cached = getCached<string>(`rules:${slug}`);
    if (cached) return cached;
  }
  if (id) {
    const cached = getCached<string>(`rules-id:${id}`);
    if (cached) return cached;
  }

  const remember = (text: string, row?: ScanMarketRulesRow) => {
    const keySlug = row?.slug?.trim() || slugs[0];
    if (keySlug) setCache(`rules:${keySlug}`, text, 10 * 60_000);
    const keyId = row?.market_id?.trim() || id;
    if (keyId) setCache(`rules-id:${keyId}`, text, 10 * 60_000);
    return text;
  };

  for (const slug of slugs) {
    const rows = await supabaseRest<ScanMarketRulesRow[]>(
      `/market_rules_cache?select=slug,market_id,rules_text&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    );
    const text = cleanRules(rows?.[0]?.rules_text);
    if (text) return remember(text, rows?.[0]);
  }

  if (id) {
    const rows = await supabaseRest<ScanMarketRulesRow[]>(
      `/market_rules_cache?select=slug,market_id,rules_text&market_id=eq.${encodeURIComponent(id)}&limit=1`,
    );
    const text = cleanRules(rows?.[0]?.rules_text);
    if (text) return remember(text, rows?.[0]);
  }

  return fetchGammaMarketRules(slugs);
}

async function fetchGammaMarketRules(slugs: string[]): Promise<string | null> {
  for (const slug of slugs) {
    const markets = await fetchGammaJson<
      Array<{
        description?: string | null;
        events?: Array<{ description?: string | null }>;
      }>
    >(`/markets?slug=${encodeURIComponent(slug)}&limit=1`);
    const market = Array.isArray(markets) ? markets[0] : undefined;
    const fromMarket =
      cleanRules(market?.description) ??
      cleanRules(market?.events?.[0]?.description);
    if (fromMarket) {
      setCache(`rules:${slug}`, fromMarket, 10 * 60_000);
      return fromMarket;
    }

    const events = await fetchGammaJson<
      Array<{ description?: string | null }>
    >(`/events?slug=${encodeURIComponent(slug)}&limit=1`);
    const fromEvent = cleanRules(
      Array.isArray(events) ? events[0]?.description : null,
    );
    if (fromEvent) {
      setCache(`rules:${slug}`, fromEvent, 10 * 60_000);
      return fromEvent;
    }
  }

  return null;
}

/** Fixed sports market feed for the playground API project. */
export async function getSportsMarketFeed(): Promise<PolymarketMarketData[]> {
  const results = await Promise.all(
    SPORTS_MARKET_FEED_SLUGS.map((slug) => getMarketDataBySlug(slug)),
  );
  return withSportsTitlePhotos(
    results.filter((m): m is PolymarketMarketData => m !== null),
  );
}

async function fetchMarketsList(options?: {
  limit?: number;
  sort?: string;
  category?: string;
  yesNoOnly?: boolean;
}): Promise<PolymarketMarketData[]> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const sort = options?.sort ?? "volume_24h";
  const yesNoOnly = options?.yesNoOnly ?? false;
  const query = new URLSearchParams({
    action: "markets",
    limit: "50",
    sort,
    agent_id: "portfolio-site",
  });
  if (options?.category) query.set("category", options.category);

  const res = await fetch(`${AGENT_API_BASE}?${query}`, fetchNoStore);
  if (!res.ok) {
    console.error("PolymarketScan markets list failed:", res.status);
    return [];
  }

  const json = (await res.json()) as {
    ok?: boolean;
    data?: AgentMarketRaw[];
  };
  if (!json.ok || !Array.isArray(json.data)) return [];

  const markets = json.data
    .map(normalizeMarket)
    .filter((m): m is PolymarketMarketData => m !== null)
    .filter((m) => (yesNoOnly ? isYesNoBinaryMarket(m) : true));

  return collapseEventMarkets(markets).slice(0, limit);
}

function isOpenCompetitiveMarket(market: PolymarketMarketData): boolean {
  if (market.isResolved) return false;
  // Skip near-settled prices so "Live" feels like active games.
  return market.yesPrice > 0.02 && market.yesPrice < 0.98;
}

function parseMatchupTitle(
  title: string,
): { away: string; home: string } | null {
  // Skip totals / spreads — those are Over/Under or handicap markets.
  if (
    /\b(o\/?u|over\/under|spread:|btts|both teams to score|correct score|total)\b/i.test(
      title,
    )
  ) {
    return null;
  }

  const match = title
    .trim()
    .match(
      /(?:^|:\s*)(.+?)\s+vs\.?\s+(.+?)(?:\s+\([^)]*\))?(?:\s+[-–—].*)?(?:\s+\d{4}[-/]\d{2}[-/]\d{2})?$/i,
    );
  if (!match?.[1] || !match[2]) return null;

  let away = match[1]
    .replace(/^(spread|moneyline|ml):\s*/i, "")
    .replace(/^.*:\s*/, "")
    .trim();
  let home = match[2]
    .replace(/\s+\([^)]*\)\s*$/, "")
    .replace(/\s+[-–—].*$/, "")
    .replace(/:.*$/, "")
    .trim();

  // Keep short display names for cards (last token for long club names).
  if (away.length > 28) away = away.split(/\s+/).slice(-2).join(" ");
  if (home.length > 28) home = home.split(/\s+/).slice(-2).join(" ");

  if (!away || !home) return null;
  if (/^(will|spread|over|under)\b/i.test(away)) return null;
  return { away, home };
}

function collapseEventMarkets(
  markets: PolymarketMarketData[],
): PolymarketMarketData[] {
  const byEvent = new Map<string, PolymarketMarketData[]>();
  const standalone: PolymarketMarketData[] = [];

  for (const market of markets) {
    if (market.eventSlug && market.groupItemTitle) {
      const group = byEvent.get(market.eventSlug) ?? [];
      group.push(market);
      byEvent.set(market.eventSlug, group);
      continue;
    }
    standalone.push(market);
  }

  const merged: PolymarketMarketData[] = [...standalone];
  for (const group of byEvent.values()) {
    if (group.length === 1) {
      merged.push(group[0]!);
      continue;
    }

    const primary = [...group].sort((a, b) => b.volume24h - a.volume24h)[0]!;
    const outcomes = [...group]
      .flatMap((item) => item.outcomes ?? [])
      .sort((a, b) => b.price - a.price);

    merged.push({
      ...primary,
      title: primary.eventTitle?.trim() || primary.title,
      outcomes,
      relatedMarketCount: group.length,
      volumeUsd: group.reduce((sum, item) => sum + item.volumeUsd, 0),
      volume24h: group.reduce((sum, item) => sum + item.volume24h, 0),
    });
  }

  return merged;
}

type EspnBoardGame = {
  league: string;
  status: LiveGameInfo["status"];
  clock: string;
  teams: {
    name: string;
    abbr: string;
    score: number | null;
    logo: string | null;
  }[];
};

const ESPN_TEAMS: { league: string; url: string }[] = [
  {
    league: "NFL",
    url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams",
  },
  {
    league: "NBA",
    url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams",
  },
  {
    league: "NHL",
    url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams",
  },
  {
    league: "MLB",
    url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams",
  },
  {
    league: "WNBA",
    url: "https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams",
  },
  {
    league: "MLS",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams",
  },
  {
    league: "EPL",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams",
  },
  {
    league: "La Liga",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/teams",
  },
  {
    league: "Bundesliga",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/teams",
  },
  {
    league: "Serie A",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/ita.1/teams",
  },
  {
    league: "Ligue 1",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/fra.1/teams",
  },
  {
    league: "UCL",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/teams",
  },
  {
    league: "World Cup",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams",
  },
];

type EspnTeamLogo = {
  league: string;
  name: string;
  displayName: string;
  abbr: string;
  logo: string;
  keys: string[];
};

function pickEspnLogo(
  logos: Array<{ href?: string; rel?: string[] }> | undefined,
): string | null {
  if (!logos?.length) return null;
  const dark = logos.find(
    (logo) =>
      logo.rel?.includes("dark") &&
      !logo.rel.includes("scoreboard") &&
      typeof logo.href === "string",
  );
  const def = logos.find(
    (logo) => logo.rel?.includes("default") && typeof logo.href === "string",
  );
  const any = logos.find((logo) => typeof logo.href === "string");
  return dark?.href ?? def?.href ?? any?.href ?? null;
}

function catalogKeys(team: {
  name?: string;
  nickname?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  location?: string;
}): string[] {
  const values = [
    team.nickname,
    team.name,
    team.abbreviation,
    team.shortDisplayName,
    team.displayName,
    team.location,
  ];
  const keys = new Set<string>();
  for (const value of values) {
    const key = nickKey(value ?? "");
    if (key) keys.add(key);
  }
  const nick = nickKey(team.nickname ?? team.name ?? "");
  const location = nickKey(team.location ?? "");
  if (nick && location) keys.add(`${location} ${nick}`);
  return [...keys];
}

async function fetchEspnTeamCatalog(): Promise<EspnTeamLogo[]> {
  const key = "espn-team-logos-v2";
  const cached = getCached<EspnTeamLogo[]>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as Promise<EspnTeamLogo[]> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const groups = await Promise.all(
        ESPN_TEAMS.map(async ({ league, url }) => {
          try {
            const res = await fetch(url, fetchNoStore);
            if (!res.ok) return [] as EspnTeamLogo[];
            const json = (await res.json()) as {
              sports?: Array<{
                leagues?: Array<{
                  teams?: Array<{
                    team?: {
                      name?: string;
                      nickname?: string;
                      abbreviation?: string;
                      displayName?: string;
                      shortDisplayName?: string;
                      location?: string;
                      logos?: Array<{ href?: string; rel?: string[] }>;
                    };
                  }>;
                }>;
              }>;
            };
            const teams =
              json.sports?.[0]?.leagues?.[0]?.teams ?? [];
            const parsed: EspnTeamLogo[] = [];
            for (const entry of teams) {
              const team = entry.team;
              if (!team) continue;
              const logo = pickEspnLogo(team.logos);
              const abbr = (team.abbreviation ?? "").trim();
              const name =
                team.nickname ?? team.name ?? team.shortDisplayName ?? "";
              if (!logo || !name) continue;
              parsed.push({
                league,
                name,
                displayName:
                  team.displayName ?? team.shortDisplayName ?? name,
                abbr,
                logo,
                keys: catalogKeys(team),
              });
            }
            return parsed;
          } catch (error) {
            console.error(`ESPN ${league} teams failed:`, error);
            return [] as EspnTeamLogo[];
          }
        }),
      );
      const catalog = groups.flat();
      setCache(key, catalog, 6 * 60 * 60 * 1000);
      return catalog;
    } catch (error) {
      console.error("ESPN team catalog failed:", error);
      return getCached<EspnTeamLogo[]>(key) ?? [];
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

function keysMatch(query: string, key: string): boolean {
  if (!query || !key) return false;
  if (key === query) return true;
  if (key.startsWith(`${query} `) || key.endsWith(` ${query}`)) return true;
  if (query.startsWith(`${key} `) || query.endsWith(` ${key}`)) return true;
  return false;
}

function lookupTeamLogo(
  query: string,
  catalog: EspnTeamLogo[],
  league?: string,
): EspnTeamLogo | null {
  const q = nickKey(query);
  if (!q) return null;
  const search = (leagueFilter?: string) =>
    catalog.filter((team) => {
      if (leagueFilter && team.league !== leagueFilter) return false;
      return team.keys.some((key) => keysMatch(q, key));
    });
  let hits = search(league);
  if (hits.length === 0 && league) hits = search(undefined);
  if (hits.length === 1) return hits[0]!;
  if (hits.length > 1) {
    const exact = hits.find((team) => team.keys.includes(q));
    const display = hits.find((team) => nickKey(team.displayName) === q);
    return exact ?? display ?? hits[0]!;
  }
  return null;
}

function resolveMatchupTeams(
  away: string,
  home: string,
  catalog: EspnTeamLogo[],
): { away: EspnTeamLogo | null; home: EspnTeamLogo | null; league: string | null } {
  const awayHits = catalog.filter((team) =>
    team.keys.some((key) => keysMatch(nickKey(away), key)),
  );
  const homeHits = catalog.filter((team) =>
    team.keys.some((key) => keysMatch(nickKey(home), key)),
  );
  const awayLeagues = new Set(awayHits.map((team) => team.league));
  const shared = [...new Set(homeHits.map((team) => team.league))].filter(
    (league) => awayLeagues.has(league),
  );
  const league = shared[0] ?? awayHits[0]?.league ?? homeHits[0]?.league ?? null;
  return {
    away: lookupTeamLogo(away, catalog, league ?? undefined),
    home: lookupTeamLogo(home, catalog, league ?? undefined),
    league,
  };
}

const ESPN_SCOREBOARDS: { league: string; url: string }[] = [
  {
    league: "NFL",
    url: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  },
  {
    league: "NBA",
    url: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  },
  {
    league: "NHL",
    url: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
  },
  {
    league: "MLB",
    url: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  },
  {
    league: "EPL",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard",
  },
  {
    league: "UCL",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
  },
  {
    league: "La Liga",
    url: "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard",
  },
];

function nickKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamMatches(query: string, team: { name: string; abbr: string }): boolean {
  const q = nickKey(query);
  if (!q) return false;
  const name = nickKey(team.name);
  const abbr = nickKey(team.abbr);
  if (!name && !abbr) return false;
  if (q === abbr || name === q) return true;
  const nick = name.split(" ").at(-1) ?? "";
  if (nick.length < 3) return false;
  return nick === q || name.endsWith(` ${q}`) || q.endsWith(` ${nick}`);
}

async function fetchEspnScoreboards(): Promise<EspnBoardGame[]> {
  const boards = await Promise.all(
    ESPN_SCOREBOARDS.map(async ({ league, url }) => {
      try {
        const res = await fetch(url, fetchNoStore);
        if (!res.ok) return [] as EspnBoardGame[];
        const json = (await res.json()) as {
          events?: Array<{
            competitions?: Array<{
              status?: {
                type?: {
                  state?: string;
                  completed?: boolean;
                  shortDetail?: string;
                  detail?: string;
                };
              };
              competitors?: Array<{
                team?: {
                  displayName?: string;
                  abbreviation?: string;
                  logo?: string;
                };
                score?: string;
              }>;
            }>;
          }>;
        };
        const games: EspnBoardGame[] = [];
        for (const event of json.events ?? []) {
          const competition = event.competitions?.[0];
          if (!competition) continue;
          const state = (competition.status?.type?.state ?? "").toLowerCase();
          const status: LiveGameInfo["status"] =
            state === "in"
              ? "live"
              : state === "post" || competition.status?.type?.completed
                ? "final"
                : "upcoming";
          const teams = (competition.competitors ?? [])
            .map((competitor) => ({
              name: competitor.team?.displayName ?? "",
              abbr: competitor.team?.abbreviation ?? "",
              logo:
                typeof competitor.team?.logo === "string"
                  ? competitor.team.logo
                  : null,
              score:
                competitor.score != null && competitor.score !== ""
                  ? Number(competitor.score)
                  : null,
            }))
            .filter((team) => team.name && team.abbr);
          if (teams.length < 2) continue;
          games.push({
            league,
            status,
            clock:
              competition.status?.type?.shortDetail ??
              competition.status?.type?.detail ??
              "",
            teams,
          });
        }
        return games;
      } catch (error) {
        console.error(`ESPN ${league} scoreboard failed:`, error);
        return [] as EspnBoardGame[];
      }
    }),
  );
  return boards.flat();
}

function attachLiveGame(
  market: PolymarketMarketData,
  boards: EspnBoardGame[],
  catalog: EspnTeamLogo[],
): PolymarketMarketData {
  const matchup = parseMatchupTitle(market.title);
  if (!matchup) return market;

  const catalogMatch = resolveMatchupTeams(matchup.away, matchup.home, catalog);
  const board = boards.find((game) => {
    if (catalogMatch.league && game.league !== catalogMatch.league) return false;
    const hits = [matchup.away, matchup.home].filter((nick) =>
      game.teams.some((team) => teamMatches(nick, team)),
    );
    return hits.length === 2;
  });

  const teamFor = (nick: string) =>
    board?.teams.find((item) => teamMatches(nick, item));

  const awayTeam = teamFor(matchup.away);
  const homeTeam = teamFor(matchup.home);
  const awayLogo = catalogMatch.away;
  const homeLogo = catalogMatch.home;

  return {
    ...market,
    liveGame: {
      league: board?.league ?? catalogMatch.league ?? "Sports",
      status: board?.status ?? "upcoming",
      clock: board?.clock ?? "",
      away: {
        name: matchup.away,
        score: awayTeam?.score ?? null,
        logo: awayTeam?.logo ?? awayLogo?.logo ?? null,
        abbr: awayTeam?.abbr ?? awayLogo?.abbr ?? null,
      },
      home: {
        name: matchup.home,
        score: homeTeam?.score ?? null,
        logo: homeTeam?.logo ?? homeLogo?.logo ?? null,
        abbr: homeTeam?.abbr ?? homeLogo?.abbr ?? null,
      },
    },
  };
}

function liveGameRank(market: PolymarketMarketData): number {
  const status = market.liveGame?.status;
  if (status === "live") return 0;
  if (status === "upcoming") return 1;
  if (status === "final") return 3;
  return 2;
}

const WIKIMEDIA_UA =
  "PortfolioSite/1.0 (https://github.com; sports market photos)";
const TITLE_PHOTO_TTL_MS = 24 * 60 * 60 * 1000;
const PHOTO_BLOCKLIST =
  /logo|wordmark|flag|icon|diagram|chart|map|jersey|uniform|kit\b|crest|badge|ticket|signature|pictogram|coat of arms|escudo|coin|stamp|currency|\.svg|\.gif|\.pdf/i;
const SPORT_STOP_WORDS = new Set([
  "football",
  "basketball",
  "hockey",
  "baseball",
  "soccer",
  "game",
  "match",
  "the",
  "and",
]);

function isSportsMarketData(market: PolymarketMarketData): boolean {
  return (
    Boolean(market.liveGame) ||
    market.category?.toLowerCase() === "sports" ||
    isPlayerSport(market)
  );
}

function teamSubjectFromTitle(title: string): string | null {
  const will = title.match(
    /^Will\s+(.+?)\s+(?:win|reach|make|be|become|qualify|finish|advance|take|claim|stay|remain|get|keep)\b/i,
  );
  if (will?.[1]) return will[1].trim();
  const colon = title.match(/:\s*([^:]+)$/);
  if (colon?.[1]) return colon[1].replace(/\([^)]*\)/g, "").trim();
  return null;
}

function guessLeague(market: PolymarketMarketData): string | undefined {
  if (market.liveGame?.league) return market.liveGame.league;
  const text = `${market.title} ${market.category ?? ""}`.toLowerCase();
  if (/\bpremier league\b|\bepl\b/.test(text)) return "EPL";
  if (/\bchampions league\b|\bucl\b/.test(text)) return "UCL";
  if (/\bworld cup\b|\bfifa\b/.test(text)) return "World Cup";
  if (/\bla liga\b/.test(text)) return "La Liga";
  if (/\bbundesliga\b/.test(text)) return "Bundesliga";
  if (/\bserie a\b/.test(text)) return "Serie A";
  if (/\bligue 1\b/.test(text)) return "Ligue 1";
  if (/\bmls\b/.test(text)) return "MLS";
  if (/\bwnba\b/.test(text)) return "WNBA";
  if (/\bnba\b/.test(text)) return "NBA";
  if (/\bnfl\b/.test(text)) return "NFL";
  if (/\bnhl\b/.test(text)) return "NHL";
  if (/\bmlb\b/.test(text)) return "MLB";
  if (
    /\b(tennis|atp|wta|wimbledon|roland\s*garros|french open|australian open|us open)\b/.test(
      text,
    )
  ) {
    return "ATP";
  }
  return undefined;
}

function namedOutcomes(market: PolymarketMarketData): PolymarketMarketOutcome[] {
  return (market.outcomes ?? []).filter((outcome) => {
    const label = outcome.label.trim().toLowerCase();
    return label.length > 0 && label !== "yes" && label !== "no";
  });
}

function sportsTeamsFromMarket(
  market: PolymarketMarketData,
  catalog: EspnTeamLogo[],
): PolymarketSportsTeam[] {
  const league = guessLeague(market);
  const asTeam = (
    name: string,
    logo?: string | null,
    abbr?: string | null,
  ): PolymarketSportsTeam => {
    const hit = lookupTeamLogo(name, catalog, league);
    return {
      name: hit?.displayName ?? name,
      logo: hit?.logo ?? logo ?? null,
      abbr: hit?.abbr ?? abbr ?? null,
    };
  };

  if (market.liveGame) {
    return [
      asTeam(
        market.liveGame.away.name,
        market.liveGame.away.logo,
        market.liveGame.away.abbr,
      ),
      asTeam(
        market.liveGame.home.name,
        market.liveGame.home.logo,
        market.liveGame.home.abbr,
      ),
    ];
  }

  const named = namedOutcomes(market);
  if (named.length >= 2) {
    return named.map((outcome) => asTeam(outcome.label, outcome.logo));
  }

  const subject = teamSubjectFromTitle(market.title);
  if (subject) return [asTeam(subject)];
  if (named.length === 1) return [asTeam(named[0]!.label, named[0]!.logo)];
  return [];
}

function sportKeyword(market: PolymarketMarketData): string {
  const league = (market.liveGame?.league ?? guessLeague(market) ?? "").toUpperCase();
  if (league === "ATP" || league === "WTA") return "tennis";
  if (league === "NFL") return "football";
  if (league === "NBA" || league === "WNBA") return "basketball";
  if (league === "NHL") return "hockey";
  if (league === "MLB") return "baseball";
  if (
    league === "EPL" ||
    league === "UCL" ||
    league === "MLS" ||
    league === "LA LIGA" ||
    league === "BUNDESLIGA" ||
    league === "SERIE A" ||
    league === "LIGUE 1" ||
    league === "WORLD CUP"
  ) {
    return "football";
  }

  const image = market.image ?? "";
  if (/nfl/i.test(image)) return "football";
  if (/nba|basketball/i.test(image)) return "basketball";
  if (/nhl/i.test(image)) return "hockey";
  if (/mlb/i.test(image)) return "baseball";
  if (/\b(world cup|premier league|champions league|fifa|uefa|soccer)\b/i.test(market.title)) {
    return "football";
  }
  if (
    /\b(tennis|atp|wta|wimbledon|roland\s*garros|french open|australian open|us open|cincinnati open|indian wells|miami open|madrid open|national bank open)\b/i.test(
      `${market.title} ${market.category ?? ""}`,
    )
  ) {
    return "tennis";
  }
  return "";
}

async function sportsPhotoQueries(
  market: PolymarketMarketData,
): Promise<string[]> {
  const title = market.title.trim();
  const sport = sportKeyword(market);
  const queries: string[] = [];
  const push = (value: string) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (cleaned && !queries.includes(cleaned)) queries.push(cleaned);
  };

  if (market.teams && market.teams.length > 0) {
    for (const team of market.teams.slice(0, 2)) {
      push([team.name, sport].filter(Boolean).join(" "));
      push(team.name);
    }
    if (market.teams.length >= 2) {
      push(
        [market.teams[0]!.name, market.teams[1]!.name, sport]
          .filter(Boolean)
          .join(" "),
      );
      return queries;
    }
  }

  const matchup = parseMatchupTitle(title);
  if (matchup) {
    const league = market.liveGame?.league;
    const catalog = await fetchEspnTeamCatalog();
    const away =
      lookupTeamLogo(matchup.away, catalog, league)?.displayName ??
      matchup.away;
    const home =
      lookupTeamLogo(matchup.home, catalog, league)?.displayName ??
      matchup.home;
    push([away, sport].filter(Boolean).join(" "));
    push([home, sport].filter(Boolean).join(" "));
    push([away, home, sport].filter(Boolean).join(" "));
    push(away);
    return queries;
  }

  const will = teamSubjectFromTitle(title);
  if (will) {
    push([will, sport].filter(Boolean).join(" "));
    push(`${will} team`);
    push(will);
  }

  const stripped = title
    .replace(/^will\s+/i, "")
    .replace(/\?$/g, "")
    .replace(/\b20\d{2}(?:[-–]\d{2})?\b/g, "")
    .replace(/\b(win|the|a|an|of|on|in|for)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped) push(stripped);
  return queries;
}

function cleanMediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function isPhotoUrl(url: string): boolean {
  return /\.(jpe?g|png|webp)(?:$|\?)/i.test(url) && !/\.svg(?:$|\?)/i.test(url);
}

async function fetchWikimediaJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "force-cache",
      headers: {
        Accept: "application/json",
        "User-Agent": WIKIMEDIA_UA,
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error("Wikimedia photo request failed:", error);
    return null;
  }
}

async function wikipediaPersonPhoto(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "1",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "800",
    format: "json",
    origin: "*",
  });
  const json = await fetchWikimediaJson<{
    query?: {
      pages?: Record<string, { title?: string; thumbnail?: { source?: string } }>;
    };
  }>(`https://en.wikipedia.org/w/api.php?${params}`);
  const pages = Object.values(json?.query?.pages ?? {});
  const page = pages[0];
  const last = query.trim().split(/\s+/).at(-1)?.toLowerCase();
  if (
    last &&
    last.length > 2 &&
    !(page?.title ?? "").toLowerCase().includes(last)
  ) {
    return null;
  }
  const source = page?.thumbnail?.source;
  if (!source || !isPhotoUrl(source) || !/\.jpe?g(?:$|\?)/i.test(source)) {
    return null;
  }
  return cleanMediaUrl(source);
}

function scoreCommonsPhoto(
  title: string,
  mime: string,
  query: string,
): number | null {
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) return null;
  const name = title.replace(/^File:/i, "");
  if (PHOTO_BLOCKLIST.test(name)) return null;

  const haystack = name.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2 && !SPORT_STOP_WORDS.has(term));
  if (terms.length === 0) return null;

  const phrase = terms.join(" ");
  const matched = terms.filter((term) => haystack.includes(term));
  const needed = terms.length >= 3 ? 2 : 1;
  if (matched.length < needed) return null;

  let score = matched.length * 3;
  if (haystack.includes(phrase)) score += 12;
  if (/\bvs\.?\b|\bat\b/.test(haystack)) score += 4;
  if (/jpeg|jpg/i.test(mime)) score += 2;
  return score;
}

async function commonsPhoto(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "800",
    format: "json",
  });
  const json = await fetchWikimediaJson<{
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          index?: number;
          imageinfo?: Array<{
            url?: string;
            thumburl?: string;
            mime?: string;
          }>;
        }
      >;
    };
  }>(`https://commons.wikimedia.org/w/api.php?${params}`);

  const ranked = Object.values(json?.query?.pages ?? {})
    .map((page) => {
      const info = page.imageinfo?.[0];
      const url = info?.thumburl || info?.url;
      if (!url || !info?.mime) return null;
      const score = scoreCommonsPhoto(page.title ?? "", info.mime, query);
      if (score == null) return null;
      return { url: cleanMediaUrl(url), score, index: page.index ?? 99 };
    })
    .filter((item): item is { url: string; score: number; index: number } =>
      Boolean(item),
    )
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked[0]?.url ?? null;
}

async function lookupTitlePhoto(query: string): Promise<string | null> {
  const key = `title-photo-v2:${query.toLowerCase()}`;
  const cached = getCached<string>(key);
  if (cached !== null) return cached || null;

  const existing = inFlightByKey.get(key) as Promise<string | null> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    const tryWiki = !/\b(football|basketball|hockey|baseball|soccer)\b/i.test(
      query,
    );
    const photo =
      (tryWiki ? await wikipediaPersonPhoto(query) : null) ??
      (await commonsPhoto(query));
    setCache(key, photo ?? "", TITLE_PHOTO_TTL_MS);
    return photo;
  })();

  inFlightByKey.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightByKey.delete(key);
  }
}

async function photoForQueries(queries: string[]): Promise<string | null> {
  for (const query of queries) {
    const photo = await lookupTitlePhoto(query);
    if (photo) return photo;
  }
  return null;
}

const PLAYER_SPORT =
  /\b(tennis|atp|wta|wimbledon|roland\s*garros|french open|australian open|us open|cincinnati open|indian wells|miami open|madrid open|italian open|national bank open|china open|paris masters|golf|pga|lpga|ufc|mma|boxing)\b/i;

function isPlayerSport(market: PolymarketMarketData): boolean {
  return PLAYER_SPORT.test(
    `${market.title} ${market.eventTitle ?? ""} ${market.category ?? ""}`,
  );
}

function looksLikePersonName(name: string): boolean {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  if (
    /\b(united|city|fc|cf|sc|hotspur|rangers|rovers|athletic|sporting|club|lakers|celtics|bulls|knicks|spurs|heat|nets|jazz)\b/i.test(
      name,
    )
  ) {
    return false;
  }
  return parts.every((part) => /^[A-Za-z][A-Za-z.'’-]*$/.test(part));
}

async function lookupPlayerPortrait(name: string): Promise<string | null> {
  const key = `player-portrait-v1:${nickKey(name)}`;
  const cached = getCached<string>(key);
  if (cached !== null) return cached || null;

  const existing = inFlightByKey.get(key) as Promise<string | null> | undefined;
  if (existing) return existing;

  const promise = (async () => {
    const photo =
      (await wikipediaPersonPhoto(name)) ??
      (await wikipediaPersonPhoto(`${name} tennis`)) ??
      (await commonsPhoto(name));
    setCache(key, photo ?? "", TITLE_PHOTO_TTL_MS);
    return photo;
  })();

  inFlightByKey.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightByKey.delete(key);
  }
}

async function withPlayerPortraits(
  teams: PolymarketSportsTeam[],
  market: PolymarketMarketData,
): Promise<PolymarketSportsTeam[]> {
  const playerSport = isPlayerSport(market);
  if (teams.length === 0) return teams;

  return Promise.all(
    teams.map(async (team) => {
      if (team.logo) return team;
      if (!playerSport && !looksLikePersonName(team.name)) return team;
      const portrait = await lookupPlayerPortrait(team.name);
      return portrait
        ? { ...team, logo: portrait, portrait: true }
        : team;
    }),
  );
}

async function enrichSportsMarket(
  market: PolymarketMarketData,
): Promise<PolymarketMarketData> {
  if (!isSportsMarketData(market)) return market;

  const [boards, catalog] = await Promise.all([
    fetchEspnScoreboards(),
    fetchEspnTeamCatalog(),
  ]);
  const withGame = attachLiveGame(market, boards, catalog);
  const teams = await withPlayerPortraits(
    sportsTeamsFromMarket(withGame, catalog),
    withGame,
  );
  const withTeams = {
    ...withGame,
    teams,
    outcomes: (withGame.outcomes ?? []).map((outcome) => {
      const team = teams.find(
        (item) =>
          nickKey(item.name) === nickKey(outcome.label) ||
          nickKey(item.name).endsWith(` ${nickKey(outcome.label)}`) ||
          nickKey(outcome.label).endsWith(` ${nickKey(item.name)}`),
      );
      return team?.logo ? { ...outcome, logo: team.logo } : outcome;
    }),
  };

  if (withTeams.image?.startsWith("/")) return withTeams;
  const photo = await photoForQueries(await sportsPhotoQueries(withTeams));
  return photo ? { ...withTeams, image: photo } : withTeams;
}

async function withSportsTitlePhoto(
  market: PolymarketMarketData,
): Promise<PolymarketMarketData> {
  return enrichSportsMarket(market);
}

async function withSportsTitlePhotos(
  markets: PolymarketMarketData[],
): Promise<PolymarketMarketData[]> {
  return Promise.all(markets.map(enrichSportsMarket));
}

/** Open sports matchups for the Explore Live Games rail. */
export async function getLiveSportsMarkets(
  limit = 10,
): Promise<PolymarketMarketData[]> {
  const capped = Math.min(Math.max(limit, 1), 16);
  const key = `live-games-v2:${capped}`;
  const cached = getCached<PolymarketMarketData[]>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketMarketData[]>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const [markets, boards, catalog] = await Promise.all([
        fetchMarketsList({
          limit: 50,
          sort: "volume_24h",
          category: "Sports",
          yesNoOnly: false,
        }),
        fetchEspnScoreboards(),
        fetchEspnTeamCatalog(),
      ]);
      const live = await withSportsTitlePhotos(
        markets
          .filter(isOpenCompetitiveMarket)
          .filter((market) => parseMatchupTitle(market.title))
          .map((market) => attachLiveGame(market, boards, catalog))
          .sort((a, b) => liveGameRank(a) - liveGameRank(b))
          .slice(0, capped),
      );
      setCache(key, live, 20_000);
      return live;
    } catch (error) {
      console.error("Error fetching live sports markets:", error);
      return getCached<PolymarketMarketData[]>(key) ?? [];
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

type WhaleMarketActivity = {
  key: string;
  marketId: string;
  slug: string;
  title: string;
  volumeUsd: number;
  tradeCount: number;
  lastPrice: number | null;
  lastOutcome: string | null;
};

function isFutureClose(closesAt: string | null): boolean {
  if (!closesAt) return true;
  const ms = Date.parse(closesAt);
  if (Number.isNaN(ms)) return true;
  return ms > Date.now();
}

function isPoliticsMarket(market: PolymarketMarketData): boolean {
  const category = (market.category ?? "").trim().toLowerCase();
  if (
    category === "politics" ||
    category === "geopolitics" ||
    category === "election" ||
    category === "elections"
  ) {
    return true;
  }

  const text =
    `${market.title} ${market.eventTitle ?? ""} ${market.slug} ${market.eventSlug ?? ""}`.toLowerCase();
  return /\b(election|electoral|presidential|congress|senate|parliament|democrat|republican|white house|prime minister|impeach|trump|biden|kamala|putin|netanyahu|xi jinping|zelensky)\b/.test(
    text,
  );
}

function isTrendingMarketCandidate(market: PolymarketMarketData): boolean {
  if (!market.image) return false;
  if (market.isResolved) return false;
  if (!isFutureClose(market.closesAt)) return false;
  if (isPoliticsMarket(market)) return false;
  return true;
}

function aggregateWhaleMarketActivity(
  trades: Array<{
    market_id?: string | null;
    market_slug?: string | null;
    market_title?: string | null;
    amount_usd?: number | null;
    price?: number | null;
    outcome?: string | null;
  }>,
): WhaleMarketActivity[] {
  const byKey = new Map<string, WhaleMarketActivity>();

  for (const trade of trades) {
    const slug =
      typeof trade.market_slug === "string" ? trade.market_slug.trim() : "";
    const marketId =
      typeof trade.market_id === "string" ? trade.market_id.trim() : "";
    const key = slug || marketId;
    if (!key) continue;

    const amount =
      typeof trade.amount_usd === "number" && Number.isFinite(trade.amount_usd)
        ? trade.amount_usd
        : 0;
    const existing = byKey.get(key);
    if (existing) {
      existing.volumeUsd += amount;
      existing.tradeCount += 1;
      if (!existing.title && typeof trade.market_title === "string") {
        existing.title = trade.market_title;
      }
      if (!existing.slug && slug) existing.slug = slug;
      if (!existing.marketId && marketId) existing.marketId = marketId;
      if (typeof trade.price === "number") {
        existing.lastPrice = trade.price;
        existing.lastOutcome =
          typeof trade.outcome === "string" ? trade.outcome : null;
      }
      continue;
    }

    byKey.set(key, {
      key,
      marketId,
      slug,
      title: typeof trade.market_title === "string" ? trade.market_title : "",
      volumeUsd: amount,
      tradeCount: 1,
      lastPrice: typeof trade.price === "number" ? trade.price : null,
      lastOutcome: typeof trade.outcome === "string" ? trade.outcome : null,
    });
  }

  return [...byKey.values()].sort((a, b) => b.volumeUsd - a.volumeUsd);
}

/**
 * Explore Trending — markets with recent whale flow that have images.
 * `volume_24h` list sort is often stale, so we fill with newly created open
 * markets that still have images.
 */
export async function getTrendingMarkets(
  limit = 10,
): Promise<PolymarketMarketData[]> {
  const capped = Math.min(Math.max(limit, 1), 48);
  const key = `trending-all-v5:${capped}`;
  const cached = getCached<PolymarketMarketData[]>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketMarketData[]>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

      const [cachedTrades, whaleRes, listedSports, listedCrypto, listedAll] =
        await Promise.all([
          supabaseRest<
            Array<{
              market_id?: string | null;
              market_slug?: string | null;
              market_title?: string | null;
              amount_usd?: number | null;
              price?: number | null;
              outcome?: string | null;
            }>
          >(
            `/whale_trades_cache?select=market_id,market_slug,market_title,amount_usd,price,outcome,timestamp&timestamp=gte.${encodeURIComponent(since)}&order=timestamp.desc&limit=800`,
          ),
          fetch(
            `${AGENT_API_BASE}?action=whales&limit=100&min_size=500&agent_id=portfolio-site`,
            fetchNoStore,
          ),
          fetchMarketsList({
            limit: 50,
            sort: "created_at",
            category: "Sports",
          }),
          fetchMarketsList({
            limit: 50,
            sort: "created_at",
            category: "Crypto",
          }),
          fetchMarketsList({ limit: 50, sort: "created_at" }),
        ]);

      let trades = Array.isArray(cachedTrades) ? cachedTrades : [];
      if (whaleRes.ok) {
        const whaleJson = (await whaleRes.json()) as {
          ok?: boolean;
          data?: AgentWhaleTradeRaw[];
        };
        if (whaleJson.ok && Array.isArray(whaleJson.data)) {
          trades = [...trades, ...whaleJson.data];
        }
      }

      const activities = aggregateWhaleMarketActivity(trades).slice(
        0,
        Math.min(Math.max(capped * 3, 40), 80),
      );
      const resolved = await Promise.all(
        activities.map(async (activity) => {
          const detail = await getMarketData({
            slug: activity.slug || null,
            id: activity.marketId || null,
            query: activity.title || null,
          });
          if (!detail?.image) return null;
          return {
            ...detail,
            volume24h: Math.max(detail.volume24h, activity.volumeUsd),
            volumeUsd: Math.max(detail.volumeUsd, activity.volumeUsd),
          };
        }),
      );

      const seen = new Set<string>();
      const trending: PolymarketMarketData[] = [];
      const pushMarket = (market: PolymarketMarketData) => {
        if (!isTrendingMarketCandidate(market)) return;
        const dedupe = market.eventSlug || market.slug || market.marketId;
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        trending.push(market);
      };

      for (const market of collapseEventMarkets(
        resolved.filter((item): item is PolymarketMarketData => item !== null),
      )) {
        pushMarket(market);
        if (trending.length >= capped) break;
      }

      const listed = collapseEventMarkets(
        [...listedSports, ...listedCrypto, ...listedAll],
      );
      for (const market of listed) {
        pushMarket(market);
        if (trending.length >= capped) break;
      }

      const withPhotos = await withSportsTitlePhotos(trending);
      setCache(key, withPhotos);
      return withPhotos;
    } catch (error) {
      console.error("Error fetching trending markets:", error);
      return getCached<PolymarketMarketData[]>(key) ?? [];
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

/** Market detail by slug (market_data). */
export async function getMarketDataBySlug(
  slug: string,
): Promise<PolymarketMarketData | null> {
  return getMarketData({ slug });
}

function matchesMarket(
  candidate: { market_slug?: string; market_id?: string; market_title?: string },
  slug: string | null,
  id: string | null,
  title: string | null,
): boolean {
  if (slug && candidate.market_slug === slug) return true;
  if (id && String(candidate.market_id ?? "") === id) return true;
  if (
    title &&
    typeof candidate.market_title === "string" &&
    candidate.market_title.toLowerCase() === title.toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * Recent trades + traders leaderboard for a market.
 * Prefers whale trades matched to the market; falls back to CTF transfers.
 */
export async function getMarketActivity(options: {
  slug?: string | null;
  id?: string | null;
  title?: string | null;
  tradeLimit?: number;
  traderLimit?: number;
}): Promise<PolymarketMarketActivity> {
  const slug = options.slug?.trim() || null;
  const id = options.id?.trim() || null;
  const title = options.title?.trim() || null;
  const tradeLimit = Math.min(Math.max(options.tradeLimit ?? 12, 1), 30);
  const traderLimit = Math.min(Math.max(options.traderLimit ?? 15, 1), 25);
  const empty: PolymarketMarketActivity = { trades: [], traders: [] };

  if (!slug && !id && !title) return empty;

  const key = `market-activity:${slug ?? ""}:${id ?? ""}:${tradeLimit}:${traderLimit}`;
  const cached = getCached<PolymarketMarketActivity>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketMarketActivity>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const trades: PolymarketMarketTrade[] = [];
      const volumeByWallet = new Map<string, number>();

      const whaleRes = await fetch(
        `${AGENT_API_BASE}?action=whales&limit=80&min_size=500&agent_id=portfolio-site`,
        fetchNoStore,
      );
      if (whaleRes.ok) {
        const whaleJson = (await whaleRes.json()) as {
          ok?: boolean;
          data?: AgentWhaleTradeRaw[];
        };
        const whales =
          whaleJson.ok && Array.isArray(whaleJson.data) ? whaleJson.data : [];
        for (const t of whales) {
          if (!matchesMarket(t, slug, id, title)) continue;
          if (typeof t.wallet !== "string" || typeof t.amount_usd !== "number") {
            continue;
          }
          trades.push({
            side: t.side ?? "BUY",
            outcome: t.outcome ?? "—",
            price: typeof t.price === "number" ? t.price : 0,
            amountUsd: t.amount_usd,
            wallet: t.wallet,
            timestamp: t.timestamp ?? null,
            txHash: t.tx_hash ?? null,
          });
          const w = t.wallet.toLowerCase();
          volumeByWallet.set(w, (volumeByWallet.get(w) ?? 0) + t.amount_usd);
          if (trades.length >= tradeLimit) break;
        }
      }

      if (trades.length < 3 && slug) {
        const transferRes = await fetch(
          `${AGENT_API_BASE}?action=transfers&limit=60&market_slug=${encodeURIComponent(slug)}&agent_id=portfolio-site`,
          fetchNoStore,
        );
        if (transferRes.ok) {
          const transferJson = (await transferRes.json()) as {
            ok?: boolean;
            data?: AgentTransferRaw[];
          };
          const transfers =
            transferJson.ok && Array.isArray(transferJson.data)
              ? transferJson.data
              : [];
          for (const t of transfers) {
            const wallet =
              (typeof t.to_eoa === "string" && t.to_eoa) ||
              (typeof t.from_eoa === "string" && t.from_eoa) ||
              (typeof t.to_address === "string" && t.to_address) ||
              (typeof t.from_address === "string" && t.from_address) ||
              null;
            if (!wallet) continue;
            const amountUsd =
              typeof t.notional_usd === "number" ? t.notional_usd : 0;
            const amount = typeof t.amount === "number" ? t.amount : 0;
            const price =
              amount > 0 && amountUsd > 0 ? amountUsd / amount : 0;

            if (trades.length < tradeLimit) {
              trades.push({
                side: "BUY",
                outcome: t.outcome_name ?? "—",
                price,
                amountUsd,
                wallet,
                timestamp: t.block_time ?? null,
                txHash: t.tx_hash ?? null,
              });
            }

            for (const addr of [t.to_eoa, t.from_eoa, t.to_address, t.from_address]) {
              if (typeof addr !== "string" || !addr) continue;
              const keyAddr = addr.toLowerCase();
              volumeByWallet.set(
                keyAddr,
                (volumeByWallet.get(keyAddr) ?? 0) + amountUsd,
              );
            }
          }
        }
      }

      const walletRanks = [...volumeByWallet.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.min(traderLimit, 20));

      const pnlEntries = await Promise.all(
        walletRanks.map(
          async ([wallet, volumeUsd]) =>
            [wallet, volumeUsd, await fetchWalletPnlSummary(wallet)] as const,
        ),
      );

      const traders: PolymarketMarketTrader[] = pnlEntries
        .map(([wallet, volumeUsd, pnl]) => ({
          wallet,
          totalPnl: pnl.totalPnl,
          winRate: pnl.winRate,
          tradeCount: pnl.tradeCount,
          volumeUsd,
        }))
        .sort((a, b) => (b.totalPnl ?? -Infinity) - (a.totalPnl ?? -Infinity));

      const activity: PolymarketMarketActivity = {
        trades: trades.slice(0, tradeLimit),
        traders,
      };
      setCache(key, activity, 30_000);
      return activity;
    } catch (error) {
      console.error("Error fetching market activity:", error);
      return getCached<PolymarketMarketActivity>(key) ?? empty;
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

/** Top market by 24h volume, then full market_data detail. */
export async function getTopMarketData(): Promise<PolymarketMarketData | null> {
  const key = "top:volume_24h";
  const cached = getCached<PolymarketMarketData>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketMarketData | null>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const listed = await fetchMarketsList({ limit: 1, sort: "volume_24h" });
      const top = listed[0];
      if (!top) return getCached<PolymarketMarketData>(key);

      const detail =
        (await fetchMarketDetail({ id: top.marketId })) ?? top;
      if (!detail) return getCached<PolymarketMarketData>(key);

      setCache(key, detail);
      return detail;
    } catch (error) {
      console.error("Error fetching PolymarketScan market data:", error);
      return getCached<PolymarketMarketData>(key);
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

async function fetchWalletPnlSummary(wallet: string): Promise<{
  totalPnl: number | null;
  winRate: number | null;
  tradeCount: number | null;
}> {
  const key = `pnl:${wallet.toLowerCase()}`;
  const cached = getCached<{
    totalPnl: number | null;
    winRate: number | null;
    tradeCount: number | null;
  }>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${AGENT_API_BASE}?action=wallet_pnl&wallet=${encodeURIComponent(wallet)}&agent_id=portfolio-site`,
      fetchNoStore,
    );
    if (!res.ok) {
      return { totalPnl: null, winRate: null, tradeCount: null };
    }
    const json = (await res.json()) as {
      ok?: boolean;
      data?: AgentWalletPnlRaw;
    };
    const summary = json.ok ? json.data?.summary : undefined;
    const value = {
      totalPnl: typeof summary?.total_pnl === "number" ? summary.total_pnl : null,
      winRate: typeof summary?.win_rate === "number" ? summary.win_rate : null,
      tradeCount:
        typeof summary?.trade_count === "number" ? summary.trade_count : null,
    };
    setCache(key, value, CACHE_TTL_MS * 5);
    return value;
  } catch (error) {
    console.error("Error fetching wallet PnL:", error);
    return { totalPnl: null, winRate: null, tradeCount: null };
  }
}

function isSportsTrade(trade: AgentWhaleTradeRaw): boolean {
  const title = trade.market_title ?? "";
  const haystack = `${title} ${trade.market_slug ?? ""} ${trade.market_category ?? ""}`;
  if (SPORTS_HINT.test(haystack) || GAME_DAY_HINT.test(title)) return true;
  return (trade.market_category ?? "").trim().toLowerCase() === "sports";
}

/** Latest whale trades from wallets with positive lifetime PnL. */
export async function getLatestTradesWithPnl(options?: {
  limit?: number;
  sportsOnly?: boolean;
  /** Only include trades whose wallet has total PnL > 0. Default true. */
  positivePnlOnly?: boolean;
}): Promise<PolymarketTradeWithPnl[]> {
  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 40);
  const sportsOnly = options?.sportsOnly ?? true;
  const positivePnlOnly = options?.positivePnlOnly ?? true;
  const key = `trades:${sportsOnly ? "sports" : "all"}:${positivePnlOnly ? "pos" : "any"}:${limit}`;
  const cached = getCached<PolymarketTradeWithPnl[]>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketTradeWithPnl[]>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      // Pull a wider whale window so we can still fill `limit` after PnL filtering.
      const res = await fetch(
        `${AGENT_API_BASE}?action=whales&limit=150&min_size=500&agent_id=portfolio-site`,
        fetchNoStore,
      );
      if (!res.ok) {
        console.error("PolymarketScan whales request failed:", res.status);
        return getCached<PolymarketTradeWithPnl[]>(key) ?? [];
      }

      const json = (await res.json()) as {
        ok?: boolean;
        data?: AgentWhaleTradeRaw[];
      };
      const rawTrades = json.ok && Array.isArray(json.data) ? json.data : [];
      const candidates = (sportsOnly ? rawTrades.filter(isSportsTrade) : rawTrades).filter(
        (t) =>
          typeof t.wallet === "string" &&
          typeof t.amount_usd === "number" &&
          typeof t.market_title === "string",
      );

      const wallets = [
        ...new Set(candidates.map((t) => t.wallet!.toLowerCase())),
      ];
      // Cap PnL lookups to stay under the agent API rate limit.
      const walletsToFetch = wallets.slice(0, 40);
      const pnlEntries = await Promise.all(
        walletsToFetch.map(
          async (wallet) => [wallet, await fetchWalletPnlSummary(wallet)] as const,
        ),
      );
      const pnlByWallet = new Map(pnlEntries);

      const pool: PolymarketTradeWithPnl[] = [];
      for (const t of candidates) {
        const wallet = t.wallet!;
        const pnl = pnlByWallet.get(wallet.toLowerCase());
        if (!pnl) continue;
        if (positivePnlOnly && !(pnl.totalPnl !== null && pnl.totalPnl > 0)) {
          continue;
        }

        pool.push({
          side: t.side ?? "BUY",
          outcome: t.outcome ?? "—",
          price: typeof t.price === "number" ? t.price : 0,
          amountUsd: t.amount_usd ?? 0,
          marketTitle: t.market_title!,
          marketSlug: t.market_slug ?? "",
          marketCategory: t.market_category ?? null,
          wallet,
          timestamp: t.timestamp ?? null,
          txHash: t.tx_hash ?? null,
          totalPnl: pnl.totalPnl,
          winRate: pnl.winRate,
          tradeCount: pnl.tradeCount,
        });

        if (pool.length >= Math.max(limit * 4, 80)) break;
      }

      const uniqueSlugs = [
        ...new Set(pool.map((trade) => trade.marketSlug).filter(Boolean)),
      ].slice(0, 50);
      const details = await Promise.all(
        uniqueSlugs.map((slug) => getMarketData({ slug })),
      );
      const imageBySlug = new Map<string, string>();
      for (const detail of details) {
        if (detail?.slug && detail.image) {
          imageBySlug.set(detail.slug, detail.image);
        }
      }

      const enriched = pool.map((trade) => ({
        ...trade,
        marketImage: imageBySlug.get(trade.marketSlug) ?? null,
      }));
      const withImages = enriched.filter((trade) => Boolean(trade.marketImage));
      const withoutImages = enriched.filter((trade) => !trade.marketImage);

      const trades: PolymarketTradeWithPnl[] = [];
      const seen = new Set<string>();
      const pushTrade = (trade: PolymarketTradeWithPnl) => {
        const key = `${trade.txHash ?? trade.timestamp}-${trade.wallet}-${trade.outcome}`;
        if (seen.has(key)) return false;
        seen.add(key);
        trades.push(trade);
        return trades.length >= limit;
      };

      const seenMarkets = new Set<string>();
      for (const trade of withImages) {
        if (seenMarkets.has(trade.marketSlug)) continue;
        seenMarkets.add(trade.marketSlug);
        if (pushTrade(trade)) break;
      }
      if (trades.length < limit) {
        for (const trade of withImages) {
          if (pushTrade(trade)) break;
        }
      }
      if (trades.length < limit) {
        for (const trade of withoutImages) {
          if (pushTrade(trade)) break;
        }
      }

      setCache(key, trades, 30_000);
      return trades;
    } catch (error) {
      console.error("Error fetching PolymarketScan trades:", error);
      return getCached<PolymarketTradeWithPnl[]>(key) ?? [];
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

type WatchListRaw = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
};

type WatchListCacheRaw = {
  list_id?: string;
  aggregated_pnl?: number;
  total_volume?: number;
  wallet_count?: number;
  wallet_summaries?: Array<{
    wallet?: string;
    display_name?: string | null;
    total_pnl?: number;
    volume?: number;
    win_rate?: number;
    num_trades?: number;
  }>;
  recent_trades?: Array<{
    side?: string;
    outcome?: string;
    price?: number;
    size?: number;
    wallet?: string;
    market_question?: string;
    market_slug?: string;
    timestamp?: string;
  }>;
};

type WatchListFollowRaw = {
  watch_list_id?: string;
};

async function supabaseRest<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_REST_BASE}${path}`, {
      ...fetchNoStore,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.error("PolymarketScan Supabase request failed:", res.status, path);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error("PolymarketScan Supabase request error:", error);
    return null;
  }
}

/**
 * Popular public watch lists from PolymarketScan
 * (https://polymarketscan.org/watchlists — Popular Watch Lists).
 * Ranked by follower count, then wallet count, then aggregated PnL.
 */
export async function getPopularWatchLists(options?: {
  limit?: number;
}): Promise<PolymarketWatchList[]> {
  const limit = Math.min(Math.max(options?.limit ?? 8, 1), 20);
  const key = `watchlists:popular:${limit}`;
  const cached = getCached<PolymarketWatchList[]>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketWatchList[]>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const lists = await supabaseRest<WatchListRaw[]>(
        `/watch_lists?select=id,name,slug,description&is_public=eq.true&order=updated_at.desc&limit=50`,
      );
      if (!lists?.length) return getCached<PolymarketWatchList[]>(key) ?? [];

      const ids = lists
        .map((l) => l.id)
        .filter((id): id is string => typeof id === "string")
        .slice(0, 40);
      if (ids.length === 0) return [];

      const inFilter = `(${ids.map((id) => `"${id}"`).join(",")})`;
      const [caches, follows] = await Promise.all([
        supabaseRest<WatchListCacheRaw[]>(
          `/watch_list_cache?select=list_id,aggregated_pnl,total_volume,wallet_count&list_id=in.${inFilter}`,
        ),
        supabaseRest<WatchListFollowRaw[]>(
          `/watch_list_follows?select=watch_list_id&watch_list_id=in.${inFilter}`,
        ),
      ]);

      const cacheById = new Map(
        (caches ?? [])
          .filter((c) => typeof c.list_id === "string")
          .map((c) => [c.list_id!, c]),
      );
      const followerCount = new Map<string, number>();
      for (const follow of follows ?? []) {
        if (typeof follow.watch_list_id !== "string") continue;
        followerCount.set(
          follow.watch_list_id,
          (followerCount.get(follow.watch_list_id) ?? 0) + 1,
        );
      }

      const ranked: PolymarketWatchList[] = lists
        .filter(
          (l): l is WatchListRaw & { id: string; name: string; slug: string } =>
            typeof l.id === "string" &&
            typeof l.name === "string" &&
            typeof l.slug === "string",
        )
        .map((l) => {
          const cache = cacheById.get(l.id);
          return {
            id: l.id,
            name: l.name,
            slug: l.slug,
            description: l.description ?? null,
            walletCount:
              typeof cache?.wallet_count === "number" ? cache.wallet_count : 0,
            aggregatedPnl:
              typeof cache?.aggregated_pnl === "number"
                ? cache.aggregated_pnl
                : 0,
            totalVolume:
              typeof cache?.total_volume === "number" ? cache.total_volume : 0,
            followerCount: followerCount.get(l.id) ?? 0,
          };
        })
        .sort(
          (a, b) =>
            b.followerCount - a.followerCount ||
            b.walletCount - a.walletCount ||
            b.aggregatedPnl - a.aggregatedPnl,
        )
        .slice(0, limit);

      setCache(key, ranked, 60_000);
      return ranked;
    } catch (error) {
      console.error("Error fetching popular watch lists:", error);
      return getCached<PolymarketWatchList[]>(key) ?? [];
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

/**
 * Wallet leaderboard ranked by total PnL, aggregated from public watch-list
 * wallet summaries (Agent API leaderboard endpoint was removed).
 */
export async function getWalletLeaderboard(options?: {
  limit?: number;
}): Promise<PolymarketLeaderboardWallet[]> {
  const limit = Math.min(Math.max(options?.limit ?? 15, 1), 50);
  const key = `leaderboard:wallets:${limit}`;
  const cached = getCached<PolymarketLeaderboardWallet[]>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketLeaderboardWallet[]>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const caches = await supabaseRest<WatchListCacheRaw[]>(
        `/watch_list_cache?select=wallet_summaries&order=aggregated_pnl.desc&limit=40`,
      );
      if (!caches?.length) return getCached<PolymarketLeaderboardWallet[]>(key) ?? [];

      const byWallet = new Map<string, PolymarketLeaderboardWallet>();
      for (const cache of caches) {
        for (const raw of cache.wallet_summaries ?? []) {
          if (typeof raw.wallet !== "string") continue;
          const address = raw.wallet.toLowerCase();
          const totalPnl =
            typeof raw.total_pnl === "number" ? raw.total_pnl : 0;
          const existingEntry = byWallet.get(address);
          if (existingEntry && existingEntry.totalPnl >= totalPnl) continue;

          const displayName =
            typeof raw.display_name === "string" && raw.display_name.trim()
              ? raw.display_name
              : null;

          byWallet.set(address, {
            wallet: raw.wallet,
            displayName,
            totalPnl,
            volume: typeof raw.volume === "number" ? raw.volume : 0,
            winRate: typeof raw.win_rate === "number" ? raw.win_rate : 0,
            tradeCount: typeof raw.num_trades === "number" ? raw.num_trades : 0,
          });
        }
      }

      const ranked = [...byWallet.values()]
        .sort((a, b) => b.totalPnl - a.totalPnl)
        .slice(0, limit);

      setCache(key, ranked, 60_000);
      return ranked;
    } catch (error) {
      console.error("Error fetching wallet leaderboard:", error);
      return getCached<PolymarketLeaderboardWallet[]>(key) ?? [];
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

/** Single public watch list with wallet breakdown and recent trades. */
export async function getWatchListDetail(
  id: string,
): Promise<PolymarketWatchListDetail | null> {
  const key = `watchlist:detail:${id}`;
  const cached = getCached<PolymarketWatchListDetail>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketWatchListDetail | null>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const [lists, caches, follows] = await Promise.all([
        supabaseRest<WatchListRaw[]>(
          `/watch_lists?select=id,name,slug,description&id=eq.${encodeURIComponent(id)}&is_public=eq.true&limit=1`,
        ),
        supabaseRest<WatchListCacheRaw[]>(
          `/watch_list_cache?select=list_id,aggregated_pnl,total_volume,wallet_count,wallet_summaries,recent_trades&list_id=eq.${encodeURIComponent(id)}&limit=1`,
        ),
        supabaseRest<WatchListFollowRaw[]>(
          `/watch_list_follows?select=watch_list_id&watch_list_id=eq.${encodeURIComponent(id)}`,
        ),
      ]);

      const list = lists?.[0];
      if (
        !list ||
        typeof list.id !== "string" ||
        typeof list.name !== "string" ||
        typeof list.slug !== "string"
      ) {
        return getCached<PolymarketWatchListDetail>(key);
      }

      const cache = caches?.[0];
      const wallets: PolymarketWatchListWallet[] = (cache?.wallet_summaries ?? [])
        .filter((w) => typeof w.wallet === "string")
        .map((w) => ({
          wallet: w.wallet!,
          displayName:
            typeof w.display_name === "string" && w.display_name.trim()
              ? w.display_name
              : null,
          totalPnl: typeof w.total_pnl === "number" ? w.total_pnl : 0,
          volume: typeof w.volume === "number" ? w.volume : 0,
          winRate: typeof w.win_rate === "number" ? w.win_rate : 0,
          tradeCount: typeof w.num_trades === "number" ? w.num_trades : 0,
        }))
        .sort((a, b) => b.totalPnl - a.totalPnl);

      const recentTrades: PolymarketWatchListTrade[] = (cache?.recent_trades ?? [])
        .filter((t) => typeof t.wallet === "string")
        .slice(0, 12)
        .map((t) => ({
          side: t.side ?? "BUY",
          outcome: t.outcome ?? "—",
          price: typeof t.price === "number" ? t.price : 0,
          size: typeof t.size === "number" ? t.size : 0,
          wallet: t.wallet!,
          marketTitle:
            typeof t.market_question === "string" ? t.market_question : "Trade",
          marketSlug:
            typeof t.market_slug === "string" && t.market_slug.trim()
              ? t.market_slug
              : null,
          timestamp: typeof t.timestamp === "string" ? t.timestamp : null,
        }));

      const detail: PolymarketWatchListDetail = {
        id: list.id,
        name: list.name,
        slug: list.slug,
        description: list.description ?? null,
        walletCount:
          typeof cache?.wallet_count === "number"
            ? cache.wallet_count
            : wallets.length,
        aggregatedPnl:
          typeof cache?.aggregated_pnl === "number" ? cache.aggregated_pnl : 0,
        totalVolume:
          typeof cache?.total_volume === "number" ? cache.total_volume : 0,
        followerCount: follows?.length ?? 0,
        wallets,
        recentTrades,
      };

      setCache(key, detail, 60_000);
      return detail;
    } catch (error) {
      console.error("Error fetching watch list detail:", error);
      return getCached<PolymarketWatchListDetail>(key);
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

type PnlTimeseriesPoint = {
  date?: string;
  daily_pnl?: number;
  cumulative_pnl?: number;
};

type EquityPoint = { time: number; value: number };

function equityHistoryForPortfolio(
  series: PnlTimeseriesPoint[] | undefined,
  portfolioValue: number,
): { history: EquityPoint[]; todayPnl: number | null } {
  let todayPnl: number | null = null;
  let history: EquityPoint[] = [];
  const points = Array.isArray(series) ? series : [];

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayPoint =
    points.find((point) => point.date?.slice(0, 10) === todayKey) ??
    points[points.length - 1];
  if (todayPoint && typeof todayPoint.daily_pnl === "number") {
    todayPnl = todayPoint.daily_pnl;
  } else if (points.length >= 2) {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    if (
      typeof last?.cumulative_pnl === "number" &&
      typeof prev?.cumulative_pnl === "number"
    ) {
      todayPnl = last.cumulative_pnl - prev.cumulative_pnl;
    }
  }

  history = points
    .map((point) => {
      const time = point.date ? Date.parse(point.date) / 1000 : NaN;
      const value =
        typeof point.cumulative_pnl === "number" ? point.cumulative_pnl : NaN;
      if (!Number.isFinite(time) || !Number.isFinite(value)) return null;
      return { time: Math.floor(time), value };
    })
    .filter((p): p is EquityPoint => p !== null);

  // Rescale equity curve so the chart ends on the displayed portfolio balance.
  if (history.length >= 2 && portfolioValue > 0) {
    const end = history[history.length - 1]!.value;
    if (Math.abs(end) > 1e-6) {
      const scale = portfolioValue / end;
      history = history.map((point) => ({
        time: point.time,
        value: point.value * scale,
      }));
    } else {
      const startValue = Math.max(portfolioValue * 0.72, 0);
      const first = history[0]!.value;
      const last = history[history.length - 1]!.value;
      const span = last - first;
      history = history.map((point, index) => {
        const t =
          Math.abs(span) > 1e-6
            ? (point.value - first) / span
            : index / (history.length - 1);
        return {
          time: point.time,
          value: startValue + (portfolioValue - startValue) * t,
        };
      });
    }
    history[history.length - 1] = {
      time: history[history.length - 1]!.time,
      value: portfolioValue,
    };
  } else if (portfolioValue > 0) {
    const now = Math.floor(Date.now() / 1000);
    history = Array.from({ length: 24 }, (_, i) => {
      const t = i / 23;
      return {
        time: now - (23 - i) * 60 * 60 * 24,
        value: portfolioValue * (0.72 + t * 0.28),
      };
    });
    if (todayPnl === null) todayPnl = 0;
  }

  return { history, todayPnl };
}

/** Wallet profile: PnL summary + recent trades + inferred open positions. */
export async function getWalletProfile(
  wallet: string,
  options?: { tradeLimit?: number },
): Promise<PolymarketWalletProfile | null> {
  const address = wallet.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return null;

  const tradeLimit = Math.min(Math.max(options?.tradeLimit ?? 12, 1), 50);
  const fetchLimit = Math.min(Math.max(tradeLimit, 100), 200);
  const key = `wallet:profile:v2:${address}:${tradeLimit}`;
  const cached = getCached<PolymarketWalletProfile>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketWalletProfile | null>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const [pnlRes, tradesRes] = await Promise.all([
        fetch(
          `${AGENT_API_BASE}?action=wallet_pnl&wallet=${encodeURIComponent(address)}&agent_id=portfolio-site`,
          fetchNoStore,
        ),
        fetch(
          `${AGENT_API_BASE}?action=wallet_trades&wallet=${encodeURIComponent(address)}&limit=${fetchLimit}&agent_id=portfolio-site`,
          fetchNoStore,
        ),
      ]);

      type PnlJson = {
        ok?: boolean;
        data?: {
          summary?: {
            total_pnl?: number;
            realized_pnl?: number;
            unrealized_pnl?: number;
            roi_percent?: number;
            win_rate?: number;
            wins?: number;
            losses?: number;
            trade_count?: number;
            total_volume_usd?: number;
          };
          pnl_timeseries?: PnlTimeseriesPoint[];
        };
      };

      type TradesJson = {
        ok?: boolean;
        data?: Array<{
          side?: string;
          outcome?: string;
          price?: number;
          size?: number;
          market_question?: string;
          event_slug?: string;
          market_slug?: string;
          trade_timestamp?: string;
          transaction_hash?: string;
        }>;
      };

      const pnlJson = pnlRes.ok ? ((await pnlRes.json()) as PnlJson) : null;
      const tradesJson = tradesRes.ok
        ? ((await tradesRes.json()) as TradesJson)
        : null;

      const summary = pnlJson?.ok ? pnlJson.data?.summary : undefined;
      const tradesRaw =
        tradesJson?.ok && Array.isArray(tradesJson.data) ? tradesJson.data : [];

      if (!summary && tradesRaw.length === 0) {
        return getCached<PolymarketWalletProfile>(key);
      }

      const recentTrades = tradesRaw.slice(0, tradeLimit).map((t) => ({
        side: t.side ?? "BUY",
        outcome: t.outcome ?? "—",
        price: typeof t.price === "number" ? t.price : 0,
        size: typeof t.size === "number" ? t.size : 0,
        marketTitle:
          typeof t.market_question === "string" ? t.market_question : "Trade",
        marketSlug:
          typeof t.market_slug === "string" && t.market_slug.trim()
            ? t.market_slug
            : typeof t.event_slug === "string" && t.event_slug.trim()
              ? t.event_slug
              : null,
        timestamp:
          typeof t.trade_timestamp === "string" ? t.trade_timestamp : null,
        txHash:
          typeof t.transaction_hash === "string" ? t.transaction_hash : null,
      }));

      const aggregated = aggregatePositionsFromTrades(tradesRaw).slice(0, 8);
      let positions = aggregated;
      try {
        positions = await enrichPositions(aggregated);
      } catch (error) {
        console.error("Failed to enrich wallet positions:", error);
      }

      const portfolioValue = positions.reduce((sum, p) => sum + p.valueUsd, 0);
      const { history } = equityHistoryForPortfolio(
        pnlJson?.ok ? pnlJson.data?.pnl_timeseries : undefined,
        portfolioValue,
      );

      const profile: PolymarketWalletProfile = {
        wallet: address,
        totalPnl: typeof summary?.total_pnl === "number" ? summary.total_pnl : null,
        realizedPnl:
          typeof summary?.realized_pnl === "number" ? summary.realized_pnl : null,
        unrealizedPnl:
          typeof summary?.unrealized_pnl === "number"
            ? summary.unrealized_pnl
            : null,
        roiPercent:
          typeof summary?.roi_percent === "number" ? summary.roi_percent : null,
        winRate: typeof summary?.win_rate === "number" ? summary.win_rate : null,
        wins: typeof summary?.wins === "number" ? summary.wins : null,
        losses: typeof summary?.losses === "number" ? summary.losses : null,
        tradeCount:
          typeof summary?.trade_count === "number" ? summary.trade_count : null,
        totalVolumeUsd:
          typeof summary?.total_volume_usd === "number"
            ? summary.total_volume_usd
            : null,
        portfolioValue,
        recentTrades,
        positions,
        history,
      };

      setCache(key, profile, 60_000);
      return profile;
    } catch (error) {
      console.error("Error fetching wallet profile:", error);
      return getCached<PolymarketWalletProfile>(key);
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}

type WalletTradeRaw = {
  side?: string;
  outcome?: string;
  price?: number;
  size?: number;
  market_question?: string;
  event_slug?: string;
  market_slug?: string;
  market?: string;
};

function aggregatePositionsFromTrades(
  trades: WalletTradeRaw[],
): PolymarketWalletPosition[] {
  type Acc = {
    marketTitle: string;
    marketSlug: string | null;
    outcome: string;
    shares: number;
    cost: number;
  };

  const byKey = new Map<string, Acc>();

  for (const trade of trades) {
    const title =
      typeof trade.market_question === "string" && trade.market_question.trim()
        ? trade.market_question.trim()
        : null;
    const slug =
      typeof trade.market_slug === "string" && trade.market_slug.trim()
        ? trade.market_slug.trim()
        : typeof trade.event_slug === "string" && trade.event_slug.trim()
          ? trade.event_slug.trim()
          : null;
    const outcome =
      typeof trade.outcome === "string" && trade.outcome.trim()
        ? trade.outcome.trim()
        : "—";
    const size = typeof trade.size === "number" ? trade.size : 0;
    const price = typeof trade.price === "number" ? trade.price : 0;
    if (!title || !(size > 0)) continue;

    const side = (trade.side ?? "BUY").toUpperCase();
    const signed = side === "SELL" ? -size : size;
    const key = `${slug ?? title}::${outcome.toLowerCase()}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.shares += signed;
      existing.cost += signed * price;
      continue;
    }

    byKey.set(key, {
      marketTitle: title,
      marketSlug: slug,
      outcome,
      shares: signed,
      cost: signed * price,
    });
  }

  return [...byKey.values()]
    .filter((p) => Math.abs(p.shares) >= 1)
    .map((p) => {
      const shares = Math.abs(p.shares);
      const avgPrice =
        shares > 0 ? Math.min(1, Math.max(0, Math.abs(p.cost) / shares)) : 0;
      return {
        marketTitle: p.marketTitle,
        marketSlug: p.marketSlug,
        outcome: p.outcome,
        shares,
        avgPrice,
        markPrice: avgPrice,
        valueUsd: shares * avgPrice,
        pnlUsd: 0,
        image: null as string | null,
      };
    })
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

async function enrichPositions(
  positions: PolymarketWalletPosition[],
): Promise<PolymarketWalletPosition[]> {
  return Promise.all(
    positions.map(async (position) => {
      if (!position.marketSlug) return position;
      const market = await getMarketData({
        slug: position.marketSlug,
        query: position.marketTitle,
      });
      if (!market) return position;

      const outcome = position.outcome.toLowerCase();
      let mark = position.avgPrice;
      if (outcome === "no") mark = market.noPrice;
      else if (outcome === "yes") mark = market.yesPrice;
      else if (market.yesPrice > 0) mark = market.yesPrice;

      if (!(mark > 0)) mark = position.avgPrice;
      const valueUsd = position.shares * mark;
      const costUsd = position.shares * position.avgPrice;

      return {
        ...position,
        image: market.image ?? position.image,
        markPrice: mark,
        valueUsd,
        pnlUsd: valueUsd - costUsd,
      };
    }),
  );
}

async function buildWalletDemoProfile(
  wallet: string,
  displayName: string | null,
  positionLimit: number,
  options?: { enrich?: boolean },
): Promise<PolymarketDemoProfile | null> {
  const address = wallet.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return null;
  const shouldEnrich = options?.enrich ?? true;

  const [pnlRes, tradesRes] = await Promise.all([
    fetch(
      `${AGENT_API_BASE}?action=wallet_pnl&wallet=${encodeURIComponent(address)}&agent_id=portfolio-site`,
      fetchNoStore,
    ),
    fetch(
      `${AGENT_API_BASE}?action=wallet_trades&wallet=${encodeURIComponent(address)}&limit=200&agent_id=portfolio-site`,
      fetchNoStore,
    ),
  ]);

  if (!tradesRes.ok) return null;

  const tradesJson = (await tradesRes.json()) as {
    ok?: boolean;
    data?: WalletTradeRaw[];
  };
  const trades =
    tradesJson.ok && Array.isArray(tradesJson.data) ? tradesJson.data : [];
  if (trades.length === 0) return null;

  const aggregated = aggregatePositionsFromTrades(trades);
  if (aggregated.length < 3) return null;

  const shown = shouldEnrich
    ? (await enrichPositions(aggregated.slice(0, positionLimit))).sort(
        (a, b) => b.valueUsd - a.valueUsd,
      )
    : aggregated.slice(0, positionLimit);
  const portfolioValue = shown.reduce((sum, p) => sum + p.valueUsd, 0);
  const costBasis = shown.reduce(
    (sum, p) => sum + p.shares * p.avgPrice,
    0,
  );
  // Unrealized PnL on the open positions — matches the balance above.
  const totalPnl = shown.reduce((sum, p) => sum + p.pnlUsd, 0);
  const roiPercent =
    costBasis > 0 ? (totalPnl / costBasis) * 100 : null;

  let todayPnl: number | null = null;
  let winRate: number | null = null;
  let history: Array<{ time: number; value: number }> = [];

  if (pnlRes.ok) {
    const pnlJson = (await pnlRes.json()) as {
      ok?: boolean;
      data?: {
        summary?: {
          total_pnl?: number;
          roi_percent?: number;
          win_rate?: number;
        };
        pnl_timeseries?: PnlTimeseriesPoint[];
      };
    };
    if (pnlJson.ok && pnlJson.data) {
      if (typeof pnlJson.data.summary?.win_rate === "number") {
        winRate = pnlJson.data.summary.win_rate;
      }
      const equity = equityHistoryForPortfolio(
        pnlJson.data.pnl_timeseries,
        portfolioValue,
      );
      history = equity.history;
      todayPnl = equity.todayPnl;
    }
  }

  if (history.length < 2 && portfolioValue > 0) {
    const equity = equityHistoryForPortfolio(undefined, portfolioValue);
    history = equity.history;
    if (todayPnl === null) todayPnl = equity.todayPnl;
  }

  return {
    wallet: address,
    displayName,
    portfolioValue,
    totalPnl,
    todayPnl,
    roiPercent,
    winRate,
    positionCount: aggregated.length,
    positions: shown,
    history,
  };
}

/**
 * Demo Profile tab: pick a random leaderboard wallet that still has
 * multiple open-ish positions inferred from recent trade history.
 */
export async function getDemoProfilePortfolio(options?: {
  positionLimit?: number;
}): Promise<PolymarketDemoProfile | null> {
  const positionLimit = Math.min(Math.max(options?.positionLimit ?? 8, 3), 16);
  const key = `profile-demo-aligned:${positionLimit}`;
  const cached = getCached<PolymarketDemoProfile>(key);
  if (cached) return cached;

  const existing = inFlightByKey.get(key) as
    | Promise<PolymarketDemoProfile | null>
    | undefined;
  if (existing) return existing;

  const promise = (async () => {
    try {
      const leaderboard = await getWalletLeaderboard({ limit: 20 });
      const fallbackWallet = "0x204f72f35326db932158cba6adff0b9a1da95e14";
      const shuffled = [...leaderboard]
        .map((w, index) => ({
          w,
          rank: Math.sin(Date.now() / 60_000 + index * 12.9898) * 10_000,
        }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 6)
        .map(({ w }) => ({
          wallet: w.wallet,
          displayName: w.displayName,
          winRate: w.winRate,
        }));

      const candidates = [
        ...shuffled,
        {
          wallet: fallbackWallet,
          displayName: null as string | null,
          winRate: null as number | null,
        },
      ];

      for (const candidate of candidates) {
        const draft = await buildWalletDemoProfile(
          candidate.wallet,
          candidate.displayName,
          positionLimit,
          { enrich: false },
        );
        if (!draft || draft.positions.length < 3) continue;

        const profile = await buildWalletDemoProfile(
          candidate.wallet,
          candidate.displayName,
          positionLimit,
          { enrich: true },
        );
        if (!profile || profile.positions.length < 3) continue;

        const resolved =
          profile.winRate === null && candidate.winRate != null
            ? { ...profile, winRate: candidate.winRate }
            : profile;

        setCache(key, resolved, 60_000);
        return resolved;
      }

      return getCached<PolymarketDemoProfile>(key);
    } catch (error) {
      console.error("Error building demo profile portfolio:", error);
      return getCached<PolymarketDemoProfile>(key);
    } finally {
      inFlightByKey.delete(key);
    }
  })();

  inFlightByKey.set(key, promise);
  return promise;
}
