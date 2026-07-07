import { NextResponse } from "next/server";
import {
  getWormLeaderboard,
  submitWormScore,
} from "@/lib/worm-leaderboard";

export async function GET() {
  const entries = await getWormLeaderboard();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  let body: { username?: string; score?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await submitWormScore(body.username ?? "", body.score ?? -1);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const entries = await getWormLeaderboard();
  return NextResponse.json({ entries });
}
