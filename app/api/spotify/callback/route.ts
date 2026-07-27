import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: `Spotify authorization failed: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    const url = new URL(request.url);
    const authUrl = `${url.protocol}//${url.host}/api/spotify/auth`;
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Start Spotify auth</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 48px auto; padding: 24px; background: #000; color: #fff; }
  a { color: #1db954; }
</style>
</head>
<body>
  <h1>No authorization code</h1>
  <p>Open the auth URL first — don't visit the callback directly.</p>
  <p><a href="${authUrl}">${authUrl}</a></p>
  <p>Also confirm this redirect URI is listed in the Spotify Developer Dashboard:</p>
  <p><code>${url.protocol}//${url.host}/api/spotify/callback</code></p>
</body>
</html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  // Get the base URL from the request to ensure it matches what was sent in auth
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Spotify credentials not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env.local' },
      { status: 500 }
    );
  }

  try {
    // Exchange code for tokens
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Failed to exchange code: ${errorData}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const refreshToken = data.refresh_token;

    // Return an HTML page with the refresh token
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
      background: #1a1a1a;
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
    <h1>✅ Success! Your Spotify Refresh Token</h1>
    <p>Copy this refresh token into your env vars:</p>
    <div class="token">${refreshToken}</div>
    <div class="instructions">
      <h3>Production (Vercel)</h3>
      <ol>
        <li>Vercel → Project → Settings → Environment Variables</li>
        <li>Set <code>SPOTIFY_REFRESH_TOKEN</code> (and client id/secret if missing)</li>
        <li>Redeploy so the new token is picked up</li>
      </ol>
      <h3>Local</h3>
      <ol>
        <li>Set <code>SPOTIFY_REFRESH_TOKEN</code> in <code>.env.local</code></li>
        <li>Restart the dev server</li>
      </ol>
    </div>
    <div class="warning">
      <strong>⚠️ Important:</strong> This token is sensitive. Never commit it to git or share it publicly.
    </div>
  </div>
</body>
</html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

