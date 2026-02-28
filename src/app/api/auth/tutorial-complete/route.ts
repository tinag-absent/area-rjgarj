import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();
  try {
    await execute(db, `
      INSERT INTO progress_flags (user_id, flag_key, flag_value)
      VALUES (?, 'tutorial_complete', 'true')
      ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = 'true'
    `, [authUser.userId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // サイレント失敗
  }
}
