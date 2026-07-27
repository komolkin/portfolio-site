import { NextResponse } from "next/server";
import { getSpotifyRedirectUri } from "@/lib/spotify-redirect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "SPOTIFY_CLIENT_ID not found in environment variables" },
      { status: 500 }
    );
  }

  const redirectUri = getSpotifyRedirectUri(request);
  const scopes = "user-read-currently-playing user-read-recently-played";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    // Force consent so Spotify issues a fresh refresh token
    show_dialog: "true",
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
