import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

// [AA-001] UI が POST を送信するため POST ハンドラを追加（PUT のエイリアス）
export async function POST(req: NextRequest) {
  return PUT(req);
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();
  try {
    await execute(db,
      `UPDATE notifications SET is_read = 1, read_at = datetime('now') WHERE user_id = ? AND is_read = 0`,
      [authUser.userId]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
