import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // [BUG-K FIX] id を UUID 形式で検証（隣接する reset-password / route.ts と統一）
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "無効なユーザー ID です" }, { status: 400 });
  }

  const db = getDb();

  try {
    const [accessLogs, xpHistory, flags, variables] = await Promise.all([
      query<Record<string, unknown>>(db,
        `SELECT method, path, status_code, created_at FROM access_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`, [id]
      ),
      // [FIX NEW-001] XPはusers.xp_totalから取得
      query<{ xp_total: number }>(db,
        `SELECT COALESCE(xp_total, 0) AS xp_total FROM users WHERE id = ? LIMIT 1`, [id]
      ),
      query<{ flag_key: string; flag_value: string; set_at: string }>(db,
        `SELECT flag_key, flag_value, set_at FROM progress_flags WHERE user_id = ? ORDER BY set_at DESC`, [id]
      ),
      query<{ var_key: string; var_value: number }>(db,
        `SELECT var_key, var_value FROM story_variables WHERE user_id = ? ORDER BY var_key`, [id]
      ),
    ]);
    return NextResponse.json({ accessLogs, totalXp: xpHistory[0]?.xp_total ?? 0, flags, variables });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
