import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();
  try {
    const rows = await query(db, `
      SELECT dt.id, dt.status, dt.reason, dt.reject_reason, dt.created_at, dt.reviewed_at,
             fd.name AS from_division_name, td.name AS to_division_name
      FROM division_transfer_requests dt
      LEFT JOIN divisions fd ON fd.id = dt.from_division_id
      LEFT JOIN divisions td ON td.id = dt.to_division_id
      WHERE dt.user_id = ?
      ORDER BY dt.created_at DESC
    `, [authUser.userId]);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
