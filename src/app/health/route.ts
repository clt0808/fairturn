import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Confirms the Worker can read the D1 queue. */
export async function GET() {
  try {
    const row = await (await getDb()).prepare("SELECT 1 AS ok").first<{ ok: number }>();
    if (!row || Number(row.ok) !== 1) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("health check failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
