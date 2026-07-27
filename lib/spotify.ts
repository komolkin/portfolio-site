const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

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

export async function getNowPlaying(): Promise<SpotifyNowPlaying | null> {
  const status = getSpotifyCredentialStatus();
  if (!status.clientId || !status.clientSecret || !status.refreshToken) {
    console.error("Spotify credentials incomplete:", status);
    return null;
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      ...fetchNoStore,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      const data = await response.json();
      const track = data.item ? trackFromItem(data.item) : null;
      if (track) {
        return {
          isPlaying: Boolean(data.is_playing),
          track,
        };
      }
    }

    // Fallback to recently played (204 = nothing currently playing)
    const recentResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      ...fetchNoStore,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      const item = recentData.items?.[0]?.track;
      const track = item ? trackFromItem(item) : null;
      if (track) {
        return {
          isPlaying: false,
          track,
        };
      }
    } else {
      console.error(
        "Spotify recently-played failed:",
        recentResponse.status,
        await recentResponse.text()
      );
    }

    return null;
  } catch (error) {
    console.error("Error fetching Spotify data:", error);
    return null;
  }
}
