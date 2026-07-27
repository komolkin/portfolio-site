import { NextResponse } from "next/server";
import {
  getSpotifyCredentialStatus,
  probeSpotifyAuth,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/spotify/callback`;
  const credentials = getSpotifyCredentialStatus();
  const auth = credentials.clientId && credentials.clientSecret && credentials.refreshToken
    ? await probeSpotifyAuth()
    : { ok: false, error: "Missing one or more Spotify env vars" };

  return NextResponse.json({
    credentials: {
      SPOTIFY_CLIENT_ID: credentials.clientId ? "set" : "missing",
      SPOTIFY_CLIENT_SECRET: credentials.clientSecret ? "set" : "missing",
      SPOTIFY_REFRESH_TOKEN: credentials.refreshToken ? "set" : "missing",
    },
    tokenRefresh: auth.ok ? "ok" : "failed",
    tokenRefreshError: auth.ok ? undefined : auth.error,
    baseUrl,
    redirectUri,
    authUrl: `${baseUrl}/api/spotify/auth`,
    message:
      "Add this exact redirect URI in the Spotify Developer Dashboard, then open authUrl to mint a new refresh token.",
    spotifyDashboardUrl: "https://developer.spotify.com/dashboard",
  });
}
