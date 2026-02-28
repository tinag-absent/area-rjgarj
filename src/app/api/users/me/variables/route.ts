import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { key, delta } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "key は必須です" }, { status: 400 });
  const db = getDb();
  try {
    await execute(db, `
      INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, ?, ?)
      ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?
    `, [authUser.userId, key, delta || 0, delta || 0]);
    const row = await query<{ var_value: number }>(db,
      `SELECT var_value FROM story_variables WHERE user_id = ? AND var_key = ?`,
      [authUser.userId, key]
    );
    const newValue = parseFloat(String(row[0]?.var_value || 0));
    if (key === "anomaly_score") await execute(db, `UPDATE users SET anomaly_score = ? WHERE id = ?`, [newValue, authUser.userId]);
    if (key === "observer_load") await execute(db, `UPDATE users SET observer_load = ? WHERE id = ?`, [Math.min(100, newValue), authUser.userId]);
    return NextResponse.json({ ok: true, key, newValue });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
