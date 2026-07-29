import { NextResponse } from "next/server";
import { getParisWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getParisWeather();

  if (!data) {
    return NextResponse.json(
      { celsius: null, weatherCode: null, error: "Unable to fetch Paris weather" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
