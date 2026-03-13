import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const userId = authUser.userId;

  const db = getDb();
  try {
    const [flags, vars, user] = await Promise.all([
      query<{ flag_key: string; set_at: string }>(db,
        `SELECT flag_key, set_at FROM progress_flags WHERE user_id = ?`, [userId]
      ),
      query<{ var_key: string; var_value: number }>(db,
        `SELECT var_key, var_value FROM story_variables WHERE user_id = ?`, [userId]
      ),
      query<{ login_count: number; consecutive_login_days: number; created_at: string }>(db,
        `SELECT login_count, consecutive_login_days, created_at FROM users WHERE id = ?`, [userId]
      ),
    ]);
    return NextResponse.json({
      flags: Object.fromEntries(flags.map(f => [f.flag_key, f.set_at])),
      variables: Object.fromEntries(vars.map(v => [v.var_key, v.var_value])),
      loginCount: user[0]?.login_count ?? 0,
      streak: user[0]?.consecutive_login_days ?? 0,
      joinedAt: user[0]?.created_at ?? "",
    });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
