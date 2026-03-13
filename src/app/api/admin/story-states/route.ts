import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // [FIX-NEW-09] userId パラメータを UUID 形式で検証（任意値注入防止）
  if (userId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: "無効な userId です" }, { status: 400 });
  }

  const db = getDb();
  try {
    // [W-004] whereClause.replace("pf.", ...)は壊れやすいため、テーブルエイリアスごとに個別に構築
    const whereArgs = userId ? [userId] : [];
    const pfWhere = userId ? "WHERE pf.user_id = ?" : "";
    const svWhere = userId ? "WHERE sv.user_id = ?" : "";
    const feWhere = userId ? "WHERE fe.user_id = ?" : "";
    const [flagRows, varRows, eventRows] = await Promise.all([
      query<{ user_id: string; username: string; flag_key: string; flag_value: string; set_at: string }>(db, `
        SELECT pf.user_id, u.username, pf.flag_key, pf.flag_value, pf.set_at
        FROM progress_flags pf JOIN users u ON u.id = pf.user_id
        ${pfWhere}
        ORDER BY pf.set_at DESC LIMIT 200
      `, whereArgs),
      query<{ user_id: string; username: string; var_key: string; var_value: number }>(db, `
        SELECT sv.user_id, u.username, sv.var_key, sv.var_value
        FROM story_variables sv JOIN users u ON u.id = sv.user_id
        ${svWhere}
        ORDER BY sv.var_key LIMIT 500
      `, whereArgs),
      query<{ user_id: string; username: string; event_id: string; fired_at: string }>(db, `
        SELECT fe.user_id, u.username, fe.event_id, fe.fired_at
        FROM fired_events fe JOIN users u ON u.id = fe.user_id
        ${feWhere}
        ORDER BY fe.fired_at DESC LIMIT 200
      `, whereArgs),
    ]);
    return NextResponse.json({ flags: flagRows, variables: varRows, events: eventRows });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
