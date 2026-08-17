import { NextResponse } from "next/server";
import {
  getLiveSportsMarkets,
  getTrendingMarkets,
} from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [live, trending] = await Promise.all([
    getLiveSportsMarkets(10),
    getTrendingMarkets(40),
  ]);

  if (live.length === 0 && trending.length === 0) {
    return NextResponse.json(
      { live: [], trending: [], error: "Unable to fetch markets" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(
    { live, trending },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
