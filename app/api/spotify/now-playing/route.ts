import { NextResponse } from "next/server";
import { getNowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getNowPlaying();

  const body = data ?? { isPlaying: false, track: null };

  return NextResponse.json(body, {
    headers: {
      // Short public cache — Spotify quota is limited; server also caches in-memory.
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
