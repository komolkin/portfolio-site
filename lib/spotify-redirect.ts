/** Shared Spotify OAuth redirect URI — must match the Developer Dashboard exactly. */
export function getSpotifyRedirectUri(request: Request): string {
  const configured = process.env.SPOTIFY_REDIRECT_URI?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/spotify/callback`;
}
