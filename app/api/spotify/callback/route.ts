import { NextResponse } from "next/server";
import { getSpotifyRedirectUri } from "@/lib/spotify-redirect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const redirectUri = getSpotifyRedirectUri(request);
  const url = new URL(request.url);
  const authUrl = `${url.protocol}//${url.host}/api/spotify/auth`;

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:system-ui;background:#000;color:#fff;padding:40px">
        <h1>Spotify authorization failed</h1>
        <p>${error}</p>
        <p><a href="${authUrl}" style="color:#1db954">Try again</a></p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Start Spotify auth</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 24px; background: #000; color: #fff; }
  a { color: #1db954; }
  code { background:#111; padding:2px 6px; border-radius:4px; }
</style>
</head>
<body>
  <h1>No authorization code</h1>
  <p>Open the auth URL first — don't visit the callback directly.</p>
  <p><a href="${authUrl}">${authUrl}</a></p>
  <p>Redirect URI that must be in the Spotify Dashboard (exact match):</p>
  <p><code>${redirectUri}</code></p>
</body>
</html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Spotify credentials not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.text();
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:system-ui;background:#000;color:#fff;padding:40px">
          <h1>Token exchange failed</h1>
          <pre style="white-space:pre-wrap">${errorData}</pre>
          <p>Redirect URI used: <code>${redirectUri}</code></p>
          <p>That URI must match the Spotify Dashboard <em>and</em> the one used in /api/spotify/auth.</p>
          <p><a href="${authUrl}" style="color:#1db954">Try auth again</a></p>
        </body></html>`,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    const data = await response.json();
    const refreshToken = data.refresh_token as string | undefined;

    if (!refreshToken) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:system-ui;background:#000;color:#fff;padding:40px;max-width:720px;margin:0 auto">
          <h1>No refresh token returned</h1>
          <p>Spotify often skips issuing a new refresh token if the app is still connected.</p>
          <ol>
            <li>Open <a href="https://www.spotify.com/account/apps/" style="color:#1db954">spotify.com/account/apps</a></li>
            <li>Remove this app’s access</li>
            <li>Then open <a href="${authUrl}" style="color:#1db954">${authUrl}</a> again</li>
          </ol>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Spotify Refresh Token</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #000;
      color: #fff;
    }
    .container {
      background: #1a1a1a;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #333;
    }
    h1 { color: #1db954; margin-top: 0; }
    .token {
      background: #0a0a0a;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #333;
      font-family: monospace;
      word-break: break-all;
      margin: 20px 0;
      color: #1db954;
    }
    .instructions {
      padding: 20px;
      border-radius: 4px;
      margin-top: 20px;
      border-left: 3px solid #1db954;
    }
    .warning {
      color: #ffa500;
      margin-top: 20px;
      padding: 15px;
      background: #2a1a00;
      border-radius: 4px;
    }
    code {
      background: #0a0a0a;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Success — Spotify refresh token</h1>
    <p>Copy this into Vercel as <code>SPOTIFY_REFRESH_TOKEN</code>, then <strong>redeploy</strong>:</p>
    <div class="token">${refreshToken}</div>
    <div class="instructions">
      <ol>
        <li>Vercel → Project → Settings → Environment Variables</li>
        <li>Update <code>SPOTIFY_REFRESH_TOKEN</code> for Production</li>
        <li>Deployments → Redeploy (required — env changes don’t apply live)</li>
        <li>Check <a href="/api/spotify/debug" style="color:#1db954">/api/spotify/debug</a> → <code>tokenRefresh: "ok"</code></li>
      </ol>
    </div>
    <div class="warning">
      <strong>Important:</strong> Never commit this token to git.
    </div>
  </div>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
