import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/spotify/callback`;

  return NextResponse.json({
    clientId: clientId ? 'Set' : 'NOT SET',
    baseUrl,
    redirectUri,
    message: 'Make sure this EXACT redirect URI is added in Spotify Dashboard',
    spotifyDashboardUrl: 'https://developer.spotify.com/dashboard',
  });
}

