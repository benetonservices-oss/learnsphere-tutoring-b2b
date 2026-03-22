import { NextResponse } from "next/server";

// ── Env validation (fail-fast at cold start) ──
const DAILY_API_KEY = process.env.DAILY_API_KEY;

if (!DAILY_API_KEY) throw new Error("Missing DAILY_API_KEY");

// ── Daily.co response shape ──
interface DailyRoomResponse {
  url: string;
  name: string;
  id: string;
  privacy: string;
}

export async function POST() {
  try {
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        privacy: "public",
        properties: {
          exp: Math.round(Date.now() / 1000) + 7200,
        },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Daily.co API error (${res.status}):`, errorBody);
      return NextResponse.json(
        { error: "Failed to create classroom" },
        { status: res.status }
      );
    }

    const room = (await res.json()) as DailyRoomResponse;

    return NextResponse.json({ url: room.url, name: room.name });
  } catch (err: unknown) {
    console.error("Classroom creation error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
