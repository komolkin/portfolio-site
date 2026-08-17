import { NextResponse } from "next/server";
import { getWalletProfile } from "@/lib/polymarketscan";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: { address: string };
};

export async function GET(request: Request, context: RouteContext) {
  const address = context.params.address?.trim();
  if (!address) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? "12");
  const tradeLimit = Number.isFinite(limitParam) ? limitParam : 12;

  const profile = await getWalletProfile(address, { tradeLimit });

  if (!profile) {
    return NextResponse.json(
      { error: "Wallet profile not found" },
      {
        status: 404,
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
