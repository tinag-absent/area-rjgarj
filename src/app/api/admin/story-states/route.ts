import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const db = getDb();
  try {
    const whereClause = userId ? "WHERE pf.user_id = ?" : "";
    const args = userId ? [userId] : [];
    const [flagRows, varRows, eventRows] = await Promise.all([
      query<{ user_id: string; username: string; flag_key: string; flag_value: string; set_at: string }>(db, `
        SELECT pf.user_id, u.username, pf.flag_key, pf.flag_value, pf.set_at
        FROM progress_flags pf JOIN users u ON u.id = pf.user_id
        ${whereClause}
        ORDER BY pf.set_at DESC LIMIT 200
      `, args),
      query<{ user_id: string; username: string; var_key: string; var_value: number }>(db, `
        SELECT sv.user_id, u.username, sv.var_key, sv.var_value
        FROM story_variables sv JOIN users u ON u.id = sv.user_id
        ${whereClause ? whereClause.replace("pf.", "sv.") : ""}
        ORDER BY sv.var_key LIMIT 500
      `, args),
      query<{ user_id: string; username: string; event_id: string; fired_at: string }>(db, `
        SELECT fe.user_id, u.username, fe.event_id, fe.fired_at
        FROM fired_events fe JOIN users u ON u.id = fe.user_id
        ${whereClause ? whereClause.replace("pf.", "fe.") : ""}
        ORDER BY fe.fired_at DESC LIMIT 200
      `, args),
    ]);
    return NextResponse.json({ flags: flagRows, variables: varRows, events: eventRows });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
