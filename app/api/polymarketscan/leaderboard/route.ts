import { NextResponse } from "next/server";
import {
  getPopularWatchLists,
  getWalletLeaderboard,
} from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "wallets";
  const limitParam = Number(searchParams.get("limit") ?? "15");
  const limit = Number.isFinite(limitParam) ? limitParam : 15;

  if (type === "lists") {
    const lists = await getPopularWatchLists({ limit });
    return NextResponse.json(
      { lists },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }

  const wallets = await getWalletLeaderboard({ limit });
  return NextResponse.json(
    { wallets },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
