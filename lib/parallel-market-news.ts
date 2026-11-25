import OpenAI from "openai";
import Parallel from "parallel-web";

export type ParallelNewsItem = {
  id: string;
  image: string;
  source: string;
  headline: string;
  time: string;
  url: string;
};

const FALLBACK_IMAGES = [
  "/worm-app-3/bg/jensen-huang.jpg?v=2",
  "/worm-app-3/bg/fed-rates.jpg",
  "/worm-app-3/bg/dc-monument.jpg",
  "/worm-app-3/bg/assembly-hall.jpg",
  "/worm-app-3/bg/lady-justice.jpg",
  "/worm-app-3/bg/ballot.jpg",
  "/worm-app-3/bg/nba-2.jpg",
  "/worm-app-3/bg/hawks-pistons.jpg",
  "/worm-app-3/logos/gta-vi-backdrop.jpg?v=3",
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function sourceLabel(hostname: string | null): string {
  if (!hostname) return "News";
  const base = hostname.split(".")[0] ?? hostname;
  if (!base) return hostname;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function relativeTime(publishDate: string | null | undefined): string {
  if (!publishDate) return "Recent";
  const parsed = Date.parse(publishDate);
  if (!Number.isFinite(parsed)) return "Recent";
  const deltaMs = Date.now() - parsed;
  if (deltaMs < 0) return "Recent";
  const hours = Math.floor(deltaMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days}d ago`;
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function cleanHeadline(title: string): string {
  return title
    .replace(/\s+[—|-]\s+(Reuters|Bloomberg|WSJ|CNN|BBC|The Verge|TechCrunch|CoinDesk).*$/i, "")
    .replace(/\s*\.\.\.\s*$/, "")
    .trim();
}

function searchQueries(title: string, category?: string): string[] {
  const bare = title.replace(/[?]/g, "").trim();
  const words = bare.split(/\s+/).filter(Boolean);
  const core = words.slice(0, 6).join(" ");
  const queries = [`${core} news`, `${core} latest`];
  if (category) {
    queries.push(`${category} ${words.slice(0, 4).join(" ")}`);
  }
  return [...new Set(queries.map((q) => q.slice(0, 72)))].slice(0, 3);
}

function absolutizeUrl(candidate: string, pageUrl: string): string | null {
  try {
    const resolved = new URL(candidate, pageUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

function extractMetaImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match?.[1]?.trim();
    if (!value) continue;
    const absolute = absolutizeUrl(value, pageUrl);
    if (absolute) return absolute;
  }
  return null;
}

async function fetchArticleImage(pageUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(pageUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (compatible; WormMarketBot/1.0; +https://komolk.in)",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("xml")) {
      return null;
    }
    const html = (await response.text()).slice(0, 180_000);
    return extractMetaImage(html, response.url || pageUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function proxiedNewsImage(imageUrl: string): string {
  return `/api/worm-app-3/news-image?url=${encodeURIComponent(imageUrl)}`;
}

export function fallbackNewsItems(input: {
  marketId: string;
  fallbackImage?: string;
}): ParallelNewsItem[] {
  const seed = hashString(input.marketId);
  return Array.from({ length: 4 }, (_, index) => {
    const poolIndex = (seed + index * 3) % FALLBACK_IMAGES.length;
    return {
      id: `${input.marketId}-fallback-${index}`,
      image:
        index === 0 && input.fallbackImage
          ? input.fallbackImage
          : FALLBACK_IMAGES[poolIndex]!,
      source: "Worm Wire",
      headline: "Fresh reporting tied to this market’s latest odds move",
      time: "Recent",
      url: "",
    };
  });
}

export async function searchMarketNews(input: {
  marketId: string;
  title: string;
  category?: string;
  fallbackImage?: string;
}): Promise<ParallelNewsItem[]> {
  const apiKey = process.env.PARALLEL_API_KEY;
  if (!apiKey) {
    throw new Error("PARALLEL_API_KEY is not set");
  }

  const client = new Parallel({ apiKey });
  const objective = [
    `Find recent news and reporting relevant to this prediction market: "${input.title}".`,
    "Prefer reputable outlets, concrete developments, and coverage from the last two weeks.",
  ].join(" ");

  const search = await client.search({
    objective,
    search_queries: searchQueries(input.title, input.category),
    mode: "fast",
    advanced_settings: {
      max_results: 8,
    },
  });

  const seed = hashString(input.marketId);
  const drafted: Omit<ParallelNewsItem, "image">[] = [];

  for (const [index, result] of search.results.entries()) {
    const headline = cleanHeadline(result.title ?? "").trim();
    if (!headline || headline.length < 12) continue;
    drafted.push({
      id: `${input.marketId}-news-${index}`,
      source: sourceLabel(hostnameOf(result.url)),
      headline,
      time: relativeTime(result.publish_date),
      url: result.url,
    });
    if (drafted.length >= 6) break;
  }

  const images = await Promise.all(
    drafted.map((item) => fetchArticleImage(item.url)),
  );

  return drafted.map((item, index) => {
    const articleImage = images[index];
    const poolIndex = (seed + index * 3) % FALLBACK_IMAGES.length;
    const fallback =
      index === 0 && input.fallbackImage
        ? input.fallbackImage
        : FALLBACK_IMAGES[poolIndex]!;
    return {
      ...item,
      image: articleImage ? proxiedNewsImage(articleImage) : fallback,
    };
  });
}

export async function summarizeMarketOverview(input: {
  title: string;
  category?: string;
  headlines?: string[];
}): Promise<string> {
  const apiKey = process.env.PARALLEL_API_KEY;
  if (!apiKey) {
    throw new Error("PARALLEL_API_KEY is not set");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.parallel.ai/v1",
  });

  const headlineBlock =
    input.headlines && input.headlines.length > 0
      ? `\n\nRecent headlines to fold into the overview:\n${input.headlines
          .slice(0, 6)
          .map((line, index) => `${index + 1}. ${line}`)
          .join("\n")}`
      : "";

  const response = await client.responses.create(
    {
      model: "parallel",
      reasoning: { effort: "low" },
      input: [
        `Write a very short overview for a prediction market.`,
        `Market: "${input.title}"${input.category ? ` · ${input.category}` : ""}.`,
        `One or two short sentences max. Under 35 words. Neutral and factual.`,
        `Only the key latest fact that matters for the question.`,
        `No betting advice, no odds, no bullet points, no title line.`,
        headlineBlock,
      ]
        .filter(Boolean)
        .join(" "),
    },
    { timeout: 60_000 },
  );

  const text = response.output_text?.trim() ?? "";
  if (!text) {
    throw new Error("Parallel Responses returned an empty overview");
  }
  return text;
}
