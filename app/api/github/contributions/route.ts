import { NextResponse } from "next/server";
import { getContributionCalendar } from "@/lib/github";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getContributionCalendar();

  if (!data) {
    return NextResponse.json(
      { weeks: null, error: "Unable to fetch GitHub contributions" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
