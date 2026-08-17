import { NextResponse } from "next/server";
import { getLatestTradesWithPnl } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "30");
  const limit = Number.isFinite(limitParam) ? limitParam : 30;
  const sportsOnly = searchParams.get("sports") !== "0";

  const trades = await getLatestTradesWithPnl({ limit, sportsOnly });

  return NextResponse.json(
    { trades },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
