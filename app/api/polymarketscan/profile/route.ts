import { NextResponse } from "next/server";
import { getDemoProfilePortfolio } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "8");
  const positionLimit = Number.isFinite(limitParam) ? limitParam : 8;

  const profile = await getDemoProfilePortfolio({ positionLimit });

  if (!profile) {
    return NextResponse.json(
      { error: "Unable to load demo profile" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(profile, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
