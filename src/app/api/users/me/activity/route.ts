import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const db = getDb();
  try {
    // 過去1年間の日別XPログ集計
    const rows = await query<{ date: string; count: number }>(db,
      `SELECT date(created_at) AS date, COUNT(*) AS count
       FROM xp_logs
       WHERE user_id = ? AND created_at >= date('now', '-364 days')
       GROUP BY date(created_at)
       ORDER BY date ASC`,
      [user.userId]
    );

    // 日別マップに変換
    const activityMap: Record<string, number> = {};
    for (const row of rows) {
      activityMap[row.date] = Number(row.count);
    }

    return NextResponse.json({ activity: activityMap });
  } catch (err) {
    console.error("[me/activity GET]", err);
    return NextResponse.json({ activity: {} });
  }
}
