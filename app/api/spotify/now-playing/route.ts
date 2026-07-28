import { NextResponse } from "next/server";
import { getNowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getNowPlaying();

  const body = data ?? { isPlaying: false, track: null };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
