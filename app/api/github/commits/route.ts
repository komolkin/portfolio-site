import { NextResponse } from "next/server";
import { getCurrentYearCommits } from "@/lib/github";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getCurrentYearCommits();

  if (!data) {
    return NextResponse.json(
      { commits: null, error: "Unable to fetch GitHub commits" },
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
