import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { sanitizeDisplayText } from "@/lib/sanitize";

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const userId = authUser.userId;

  const { displayName: rawDisplayName } = await req.json().catch(() => ({}));
  const displayName = sanitizeDisplayText(rawDisplayName);
  if (!displayName)
    return NextResponse.json({ error: "表示名は必須です" }, { status: 400 });
  if (displayName.length > 32)
    return NextResponse.json({ error: "表示名は32文字以内にしてください" }, { status: 400 });

  const db = getDb();
  try {
    await execute(db, `UPDATE users SET display_name = ? WHERE id = ?`, [displayName, userId]);
    const rows = await query<{ display_name: string }>(db,
      `SELECT display_name FROM users WHERE id = ?`, [userId]
    );
    return NextResponse.json({ displayName: rows[0]?.display_name });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
