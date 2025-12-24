import { NextRequest, NextResponse } from "next/server";
import { realtime } from "@/lib/realtime";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (event === "cursor.move") {
      await realtime.emit("cursor.move", data);
    } else if (event === "cursor.leave") {
      await realtime.emit("cursor.leave", data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error emitting realtime event:", error);
    return NextResponse.json(
      { error: "Failed to emit event" },
      { status: 500 }
    );
  }
}
