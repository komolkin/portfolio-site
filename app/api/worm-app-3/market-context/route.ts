import { NextResponse } from "next/server";
import {
  fallbackNewsItems,
  searchMarketNews,
} from "@/lib/parallel-market-news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId")?.trim() ?? "";
  const title = searchParams.get("title")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() || undefined;
  const fallbackImage =
    searchParams.get("fallbackImage")?.trim() || undefined;

  if (!marketId || !title) {
    return NextResponse.json(
      { error: "marketId and title are required" },
      { status: 400 },
    );
  }

  if (!process.env.PARALLEL_API_KEY) {
    return NextResponse.json(
      {
        items: fallbackNewsItems({ marketId, fallbackImage }),
        source: "fallback",
        error: "PARALLEL_API_KEY is not set",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  try {
    const items = await searchMarketNews({
      marketId,
      title,
      category,
      fallbackImage,
    });

    if (items.length === 0) {
      return NextResponse.json(
        {
          items: fallbackNewsItems({ marketId, fallbackImage }),
          source: "fallback",
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          },
        },
      );
    }

    return NextResponse.json(
      { items, source: "parallel" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Parallel search failed";
    return NextResponse.json(
      {
        items: fallbackNewsItems({ marketId, fallbackImage }),
        source: "fallback",
        error: message,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
