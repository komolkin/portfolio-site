import { NextResponse } from "next/server";
import { summarizeMarketOverview } from "@/lib/parallel-market-news";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() || undefined;
  const headlinesParam = searchParams.get("headlines")?.trim() || "";

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!process.env.PARALLEL_API_KEY) {
    return NextResponse.json(
      {
        overview: null,
        error: "PARALLEL_API_KEY is not set",
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  try {
    const headlines = headlinesParam
      ? headlinesParam
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 6)
      : undefined;

    const overview = await summarizeMarketOverview({
      title,
      category,
      headlines,
    });

    return NextResponse.json(
      { overview, source: "parallel" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Parallel overview failed";
    return NextResponse.json(
      { overview: null, error: message },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
