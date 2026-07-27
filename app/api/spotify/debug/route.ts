import { NextResponse } from "next/server";
import {
  getSpotifyCredentialStatus,
  probeSpotifyAuth,
} from "@/lib/spotify";
import { getSpotifyRedirectUri } from "@/lib/spotify-redirect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = getSpotifyRedirectUri(request);
  const credentials = getSpotifyCredentialStatus();
  const auth =
    credentials.clientId && credentials.clientSecret && credentials.refreshToken
      ? await probeSpotifyAuth()
      : { ok: false, error: "Missing one or more Spotify env vars" };

  return NextResponse.json({
    credentials: {
      SPOTIFY_CLIENT_ID: credentials.clientId ? "set" : "missing",
      SPOTIFY_CLIENT_SECRET: credentials.clientSecret ? "set" : "missing",
      SPOTIFY_REFRESH_TOKEN: credentials.refreshToken ? "set" : "missing",
      SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI?.trim()
        ? "set"
        : "missing (using request host)",
    },
    tokenRefresh: auth.ok ? "ok" : "failed",
    tokenRefreshError: auth.ok ? undefined : auth.error,
    baseUrl,
    redirectUri,
    authUrl: `${baseUrl}/api/spotify/auth`,
    checklist: [
      `Add exactly this Redirect URI in Spotify Dashboard: ${redirectUri}`,
      "Open authUrl, approve access, copy the refresh token",
      "Paste into Vercel SPOTIFY_REFRESH_TOKEN and Redeploy",
      'Confirm tokenRefresh is "ok" on this debug endpoint',
    ],
    spotifyDashboardUrl: "https://developer.spotify.com/dashboard",
    revokeAppUrl: "https://www.spotify.com/account/apps/",
  });
}
