export type TradeComment = {
  id: string;
  tradeKey: string;
  wallet: string;
  handle: string;
  text: string;
  gifUrl: string | null;
  timestamp: string;
};

const COMMENTS_KEY = "playground-api-trade-comments";

const SEED_LINES = [
  "I'm on this too 🔥",
  "Size is wild",
  "This is the number",
  "Not fading it",
  "Locking in with you",
  "Tape looks one-sided",
  "Easy lean imo",
  "Market is slow here",
  "Let's go 🚀",
  "Respect the conviction",
  "Need a little more confirmation",
  "This prints if it rips",
];

export function tradeKey(trade: {
  wallet: string;
  txHash?: string | null;
  timestamp?: string | null;
  outcome?: string;
}): string {
  return (
    trade.txHash ??
    `${trade.wallet}-${trade.timestamp ?? ""}-${trade.outcome ?? ""}`
  );
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function loadUserComments(): TradeComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TradeComment =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as TradeComment).id === "string" &&
        typeof (item as TradeComment).tradeKey === "string" &&
        typeof (item as TradeComment).text === "string",
    );
  } catch {
    return [];
  }
}

export function saveUserComments(comments: TradeComment[]): void {
  try {
    window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function seedCommentsForTrade(
  key: string,
  gifUrls: string[],
): TradeComment[] {
  if (key.startsWith("local-")) return [];
  const seed = hashString(key);
  const count = seed % 5;
  if (count === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const local = seed + index * 17;
    const wallet = `0xseed${(local % 999983).toString(16).padStart(8, "0")}`;
    const handle = wallet.replace(/^0x/i, "").slice(0, 5);
    const gifUrl =
      local % 4 === 0 ? (gifUrls[local % gifUrls.length] ?? null) : null;
    return {
      id: `seed-${key}-${index}`,
      tradeKey: key,
      wallet,
      handle,
      text:
        gifUrl && local % 3 === 0
          ? ""
          : SEED_LINES[local % SEED_LINES.length]!,
      gifUrl,
      timestamp: new Date(
        Date.now() - (index + 1) * 1000 * 60 * (4 + (local % 40)),
      ).toISOString(),
    };
  });
}
