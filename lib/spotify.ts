const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=5";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const fetchNoStore = {
  cache: "no-store" as const,
};

/** How long a successful response can be reused before hitting Spotify again. */
const RESULT_CACHE_TTL_MS = 30_000;
/** Recently-played is only needed when idle — refresh it less often. */
const RECENTLY_PLAYED_TTL_MS = 5 * 60_000;
/** Minimum wait after a 429 before calling Spotify again. */
const RATE_LIMIT_BACKOFF_MS = 60_000;

export interface SpotifyTrack {
  title: string;
  artist: string;
  artwork: string;
  url: string;
}

export interface SpotifyNowPlaying {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  /** ISO timestamp from Spotify when the track was last played (recently-played only). */
  playedAt?: string;
}

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

let resultCache: CacheEntry<SpotifyNowPlaying> | null = null;
let recentlyPlayedCache: CacheEntry<SpotifyNowPlaying> | null = null;
let rateLimitedUntil = 0;
let inFlight: Promise<SpotifyNowPlaying | null> | null = null;

function getCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  return { clientId, clientSecret, refreshToken };
}

export function getSpotifyCredentialStatus() {
  const { clientId, clientSecret, refreshToken } = getCredentials();
  return {
    clientId: Boolean(clientId),
    clientSecret: Boolean(clientSecret),
    refreshToken: Boolean(refreshToken),
  };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getCredentials();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Spotify credentials");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(TOKEN_ENDPOINT, {
    ...fetchNoStore,
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to refresh access token (${response.status}): ${body}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error("Spotify token response missing access_token");
  }
  return data.access_token as string;
}

function trackFromItem(item: {
  name?: string;
  artists?: { name: string }[];
  album?: { images?: { url: string }[] };
  images?: { url: string }[];
  show?: { name?: string };
  external_urls?: { spotify?: string };
}): SpotifyTrack | null {
  if (!item?.name || !item.external_urls?.spotify) return null;

  const artist =
    item.artists?.map((a) => a.name).join(", ") ||
    item.show?.name ||
    "Unknown";

  const artwork =
    item.album?.images?.[0]?.url || item.images?.[0]?.url || "";

  return {
    title: item.name,
    artist,
    artwork,
    url: item.external_urls.spotify,
  };
}

function rememberResult(data: SpotifyNowPlaying) {
  resultCache = {
    value: data,
    expiresAt: Date.now() + RESULT_CACHE_TTL_MS,
  };
}

function cachedResult(): SpotifyNowPlaying | null {
  if (resultCache && resultCache.expiresAt > Date.now()) {
    return resultCache.value;
  }
  return null;
}

function lastKnownResult(): SpotifyNowPlaying | null {
  return resultCache?.value ?? recentlyPlayedCache?.value ?? null;
}

function markRateLimited(response: Response) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const waitMs =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : RATE_LIMIT_BACKOFF_MS;
  rateLimitedUntil = Date.now() + waitMs;
}

/** Probe Spotify auth without returning tokens — for /api/spotify/debug. */
export async function probeSpotifyAuth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    await getAccessToken();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown auth error",
    };
  }
}

async function fetchRecentlyPlayed(
  accessToken: string
): Promise<SpotifyNowPlaying | null> {
  if (
    recentlyPlayedCache &&
    recentlyPlayedCache.expiresAt > Date.now()
  ) {
    return recentlyPlayedCache.value;
  }

  const recentResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    ...fetchNoStore,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (recentResponse.status === 429) {
    markRateLimited(recentResponse);
    console.error(
      "Spotify recently-played rate limited; serving cached track if available"
    );
    return recentlyPlayedCache?.value ?? lastKnownResult();
  }

  if (!recentResponse.ok) {
    console.error(
      "Spotify recently-played failed:",
      recentResponse.status,
      await recentResponse.text()
    );
    return recentlyPlayedCache?.value ?? null;
  }

  const recentData = await recentResponse.json();
  const items = recentData.items as
    | { played_at?: string; track?: Parameters<typeof trackFromItem>[0] }[]
    | undefined;

  const mostRecent = (items ?? [])
    .filter((entry) => entry.track)
    .sort(
      (a, b) =>
        Date.parse(b.played_at ?? "") - Date.parse(a.played_at ?? "")
    )[0];

  const track = mostRecent?.track
    ? trackFromItem(mostRecent.track)
    : null;

  if (!track) return recentlyPlayedCache?.value ?? null;

  const data: SpotifyNowPlaying = {
    isPlaying: false,
    track,
    playedAt: mostRecent.played_at,
  };

  recentlyPlayedCache = {
    value: data,
    expiresAt: Date.now() + RECENTLY_PLAYED_TTL_MS,
  };

  return data;
}

async function fetchNowPlayingFromSpotify(): Promise<SpotifyNowPlaying | null> {
  const accessToken = await getAccessToken();

  const response = await fetch(NOW_PLAYING_ENDPOINT, {
    ...fetchNoStore,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 429) {
    markRateLimited(response);
    console.error(
      "Spotify currently-playing rate limited; serving cached track if available"
    );
    return lastKnownResult();
  }

  if (response.status === 200) {
    const data = await response.json();
    const track = data.item ? trackFromItem(data.item) : null;
    if (track) {
      const result: SpotifyNowPlaying = {
        isPlaying: Boolean(data.is_playing),
        track,
      };
      rememberResult(result);
      // Keep recently-played cache warm with the same track while playing.
      recentlyPlayedCache = {
        value: { isPlaying: false, track },
        expiresAt: Date.now() + RECENTLY_PLAYED_TTL_MS,
      };
      return result;
    }
  }

  // Fallback to recently played (204 = nothing currently playing)
  const recent = await fetchRecentlyPlayed(accessToken);
  if (recent) {
    rememberResult(recent);
    return recent;
  }

  return lastKnownResult();
}

export async function getNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const status = getSpotifyCredentialStatus();
  if (!status.clientId || !status.clientSecret || !status.refreshToken) {
    console.error("Spotify credentials incomplete:", status);
    return null;
  }

  const fresh = cachedResult();
  if (fresh) return fresh;

  if (Date.now() < rateLimitedUntil) {
    return lastKnownResult();
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      return await fetchNowPlayingFromSpotify();
    } catch (error) {
      console.error("Error fetching Spotify data:", error);
      return lastKnownResult();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
