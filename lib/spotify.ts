const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played?limit=1`;
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

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

async function getAccessToken(): Promise<string> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken!,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

export async function getNowPlaying(): Promise<SpotifyNowPlaying | null> {
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    const accessToken = await getAccessToken();
    
    // Try to get currently playing track
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      const data = await response.json();
      if (data.item) {
        return {
          isPlaying: data.is_playing,
          track: {
            title: data.item.name,
            artist: data.item.artists.map((a: any) => a.name).join(', '),
            artwork: data.item.album.images[0]?.url || '',
            url: data.item.external_urls.spotify,
          },
        };
      }
    }

    // Fallback to recently played
    const recentResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (recentResponse.ok) {
      const recentData = await recentResponse.json();
      if (recentData.items && recentData.items.length > 0) {
        const item = recentData.items[0].track;
        return {
          isPlaying: false,
          track: {
            title: item.name,
            artist: item.artists.map((a: any) => a.name).join(', '),
            artwork: item.album.images[0]?.url || '',
            url: item.external_urls.spotify,
          },
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching Spotify data:', error);
    return null;
  }
}

