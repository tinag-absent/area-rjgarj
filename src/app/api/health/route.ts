import { NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    await query(db, "SELECT 1 AS ok");
    return NextResponse.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ status: "error", db: "disconnected", message: String(err) }, { status: 503 });
  }
}
