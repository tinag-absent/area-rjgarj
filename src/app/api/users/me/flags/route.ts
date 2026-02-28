import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { key, value } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "key は必須です" }, { status: 400 });
  const db = getDb();
  try {
    await execute(db, `
      INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = ?, set_at = datetime('now')
    `, [authUser.userId, key, JSON.stringify(value ?? true), JSON.stringify(value ?? true)]);
    return NextResponse.json({ ok: true, key, value: value ?? true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
