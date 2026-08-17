import { NextResponse } from "next/server";
import { getPopularWatchLists } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam) ? limitParam : 8;

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
