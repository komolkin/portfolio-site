import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const LAST_TRACK_ROW_ID = "current";

/** Reuse a successful API response briefly to avoid hammering Spotify. */
const RESULT_CACHE_TTL_MS = 30_000;
/** Minimum wait after a 429 before calling Spotify again. */
const RATE_LIMIT_BACKOFF_MS = 60_000;

const fetchNoStore = {
  cache: "no-store" as const,
};

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

type StoredLastTrack = {
  track: SpotifyTrack;
  playedAt?: string;
  savedAt: number;
};

type SpotifyLastTrackRow = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  url: string;
  played_at: string | null;
  updated_at: string;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

let resultCache: CacheEntry<SpotifyNowPlaying> | null = null;
let memoryLastTrack: StoredLastTrack | null = null;
let rateLimitedUntil = 0;
let inFlight: Promise<SpotifyNowPlaying | null> | null = null;
let supabaseAdmin: SupabaseClient | null | undefined;

function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdmin !== undefined) return supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    supabaseAdmin = null;
    return supabaseAdmin;
  }

  supabaseAdmin = createClient(url, key);
  return supabaseAdmin;
}

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

function sameTrack(a: SpotifyTrack, b: SpotifyTrack): boolean {
  return a.url === b.url && a.title === b.title && a.artist === b.artist;
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

function markRateLimited(response: Response) {
  const retryAfter = Number(response.headers.get("retry-after"));
  const waitMs =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : RATE_LIMIT_BACKOFF_MS;
  rateLimitedUntil = Date.now() + waitMs;
}

function rowToStored(row: SpotifyLastTrackRow): StoredLastTrack {
  return {
    track: {
      title: row.title,
      artist: row.artist,
      artwork: row.artwork ?? "",
      url: row.url,
    },
    playedAt: row.played_at ?? undefined,
    savedAt: Date.parse(row.updated_at) || Date.now(),
  };
}

async function readStoredLastTrack(): Promise<StoredLastTrack | null> {
  const client = getSupabaseAdmin();
  if (client) {
    try {
      const { data, error } = await client
        .from("spotify_last_track")
        .select("id, title, artist, artwork, url, played_at, updated_at")
        .eq("id", LAST_TRACK_ROW_ID)
        .maybeSingle();

      if (error) {
        console.error("Failed to read Spotify last track from Supabase:", error);
      } else if (data?.title && data.url) {
        const stored = rowToStored(data as SpotifyLastTrackRow);
        memoryLastTrack = stored;
        return stored;
      }
    } catch (error) {
      console.error("Failed to read Spotify last track from Supabase:", error);
    }
  }

  return memoryLastTrack;
}

async function writeStoredLastTrack(
  track: SpotifyTrack,
  playedAt?: string
): Promise<void> {
  const existing = memoryLastTrack;
  if (existing && sameTrack(existing.track, track)) {
    return;
  }

  const entry: StoredLastTrack = {
    track,
    playedAt,
    savedAt: Date.now(),
  };

  memoryLastTrack = entry;

  const client = getSupabaseAdmin();
  if (!client) return;

  try {
    const { error } = await client.from("spotify_last_track").upsert(
      {
        id: LAST_TRACK_ROW_ID,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        url: track.url,
        played_at: playedAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Failed to write Spotify last track to Supabase:", error);
    }
  } catch (error) {
    console.error("Failed to write Spotify last track to Supabase:", error);
  }
}

function asListened(stored: StoredLastTrack): SpotifyNowPlaying {
  return {
    isPlaying: false,
    track: stored.track,
    playedAt: stored.playedAt,
  };
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

async function bootstrapFromRecentlyPlayed(
  accessToken: string
): Promise<SpotifyNowPlaying | null> {
  const recentResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
    ...fetchNoStore,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (recentResponse.status === 429) {
    markRateLimited(recentResponse);
    console.error("Spotify recently-played rate limited during bootstrap");
    return null;
  }

  if (!recentResponse.ok) {
    console.error(
      "Spotify recently-played failed:",
      recentResponse.status,
      await recentResponse.text()
    );
    return null;
  }

  const recentData = await recentResponse.json();
  const items = recentData.items as
    | { played_at?: string; track?: Parameters<typeof trackFromItem>[0] }[]
    | undefined;

  const mostRecent = items?.[0];
  const track = mostRecent?.track ? trackFromItem(mostRecent.track) : null;
  if (!track || !mostRecent) return null;

  await writeStoredLastTrack(track, mostRecent.played_at);
  return {
    isPlaying: false,
    track,
    playedAt: mostRecent.played_at,
  };
}

async function fetchNowPlayingFromSpotify(): Promise<SpotifyNowPlaying | null> {
  const accessToken = await getAccessToken();
  const stored = await readStoredLastTrack();

  const response = await fetch(NOW_PLAYING_ENDPOINT, {
    ...fetchNoStore,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 429) {
    markRateLimited(response);
    console.error(
      "Spotify currently-playing rate limited; serving stored last track"
    );
    return stored ? asListened(stored) : null;
  }

  if (response.status === 200) {
    const data = await response.json();
    const track = data.item ? trackFromItem(data.item) : null;
    if (track) {
      await writeStoredLastTrack(track);
      const result: SpotifyNowPlaying = {
        isPlaying: Boolean(data.is_playing),
        track,
      };
      rememberResult(result);
      return result;
    }
  }

  // Nothing currently playing — keep showing the last stored song.
  if (stored) {
    const result = asListened(stored);
    rememberResult(result);
    return result;
  }

  // First run / empty store: bootstrap once from recently-played.
  const bootstrapped = await bootstrapFromRecentlyPlayed(accessToken);
  if (bootstrapped) {
    rememberResult(bootstrapped);
    return bootstrapped;
  }

  return null;
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
    const stored = await readStoredLastTrack();
    return stored ? asListened(stored) : resultCache?.value ?? null;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      return await fetchNowPlayingFromSpotify();
    } catch (error) {
      console.error("Error fetching Spotify data:", error);
      const stored = await readStoredLastTrack();
      return stored ? asListened(stored) : resultCache?.value ?? null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
