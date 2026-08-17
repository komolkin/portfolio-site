import { NextResponse } from "next/server";
import {
  getMarketData,
  getMarketDataBySlug,
  getTopMarketData,
  type PolymarketMarketData,
} from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugsParam = searchParams.get("slugs")?.trim();
  const slug = searchParams.get("slug")?.trim() || null;
  const id = searchParams.get("id")?.trim() || null;
  const query = searchParams.get("q")?.trim() || null;

  if (slugsParam) {
    const slugs = [
      ...new Set(
        slugsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ].slice(0, 8);

    const results = await Promise.all(slugs.map((s) => getMarketDataBySlug(s)));
    const markets = results.filter((m): m is PolymarketMarketData => m !== null);

    return NextResponse.json(
      { markets },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  }

  const data =
    slug || id || query
      ? await getMarketData({ slug, id, query, withRules: true })
      : await getTopMarketData();

  if (!data) {
    return NextResponse.json(
      { error: "Unable to fetch market data" },
      {
        status: 404,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
