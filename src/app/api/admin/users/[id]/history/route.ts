import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = getDb();

  try {
    const [accessLogs, xpHistory, flags, variables] = await Promise.all([
      query<Record<string, unknown>>(db,
        `SELECT method, path, status_code, created_at FROM access_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`, [id]
      ),
      query<{ var_value: number }>(db,
        `SELECT var_value FROM story_variables WHERE user_id = ? AND var_key = 'total_xp' LIMIT 1`, [id]
      ),
      query<{ flag_key: string; flag_value: string; set_at: string }>(db,
        `SELECT flag_key, flag_value, set_at FROM progress_flags WHERE user_id = ? ORDER BY set_at DESC`, [id]
      ),
      query<{ var_key: string; var_value: number }>(db,
        `SELECT var_key, var_value FROM story_variables WHERE user_id = ? ORDER BY var_key`, [id]
      ),
    ]);
    return NextResponse.json({ accessLogs, totalXp: xpHistory[0]?.var_value ?? 0, flags, variables });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
