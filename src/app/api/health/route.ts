import { NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    await query(db, "SELECT 1 AS ok");
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    // [FIX-NEW-17] DB エラー詳細を外部に露出しない
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
