import { NextResponse } from "next/server";
import { getMarketActivity } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() || null;
  const id = searchParams.get("id")?.trim() || null;
  const title = searchParams.get("q")?.trim() || null;

  if (!slug && !id && !title) {
    return NextResponse.json(
      { error: "slug, id, or q is required" },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const activity = await getMarketActivity({
    slug,
    id,
    title,
    tradeLimit: 12,
    traderLimit: 15,
  });

  return NextResponse.json(activity, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
