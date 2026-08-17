import { NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "polymarket-upload.s3.us-east-2.amazonaws.com",
  "polymarket-upload.s3.amazonaws.com",
  "polymarket.com",
  "a.espncdn.com",
  "upload.wikimedia.org",
];

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url")?.trim();
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  const upstream = await fetch(target.toString(), {
    headers: { Accept: "image/*" },
    cache: "force-cache",
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 415 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
