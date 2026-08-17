import { NextResponse } from "next/server";
import { getWatchListDetail } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const listId = context.params.id?.trim();

  if (!listId) {
    return NextResponse.json({ error: "Missing list id" }, { status: 400 });
  }

  const list = await getWatchListDetail(listId);

  if (!list) {
    return NextResponse.json(
      { error: "Watch list not found" },
      {
        status: 404,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  return NextResponse.json(list, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
