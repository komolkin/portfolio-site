import { NextResponse } from "next/server";
import { searchMarkets } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitParam) ? limitParam : 12;

  if (!q) {
    return NextResponse.json(
      { markets: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const markets = await searchMarkets(q, { limit });

  return NextResponse.json(
    { markets },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
