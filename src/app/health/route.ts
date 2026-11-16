import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Render health check. Confirms the process can open the SQLite queue. */
export function GET() {
  try {
    const row = getDb().prepare("SELECT 1 AS ok").get() as { ok: number } | undefined;
    if (!row || row.ok !== 1) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
