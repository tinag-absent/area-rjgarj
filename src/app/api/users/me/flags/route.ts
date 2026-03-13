import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

// [T-007] ユーザーが直接設定できないシステムフラグのブロックリスト
const BLOCKED_FLAG_PREFIXES = ["level", "admin_", "system_", "super_"];
const BLOCKED_FLAG_KEYS = new Set(["level5_unlocked", "level4_unlocked", "level3_unlocked", "account_banned", "account_suspended"]);
const FLAG_KEY_PATTERN = /^[a-zA-Z0-9_\-]{1,100}$/;

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { key, value } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "key は必須です" }, { status: 400 });
  // [T-007] フラグキーのバリデーション
  if (!FLAG_KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "フラグキーに無効な文字が含まれています" }, { status: 400 });
  }
  if (BLOCKED_FLAG_KEYS.has(key) || BLOCKED_FLAG_PREFIXES.some(p => key.startsWith(p))) {
    return NextResponse.json({ error: "このフラグキーは変更できません" }, { status: 403 });
  }
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

// [AE-033] フラグ削除エンドポイント（ユーザーが削除可能な非システムフラグのみ）
export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { key } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "key は必須です" }, { status: 400 });
  if (!FLAG_KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "フラグキーに無効な文字が含まれています" }, { status: 400 });
  }
  // システムフラグは削除不可
  if (BLOCKED_FLAG_KEYS.has(key) || BLOCKED_FLAG_PREFIXES.some(p => key.startsWith(p))) {
    return NextResponse.json({ error: "このフラグキーは削除できません" }, { status: 403 });
  }
  const db = getDb();
  try {
    await execute(db,
      `DELETE FROM progress_flags WHERE user_id = ? AND flag_key = ?`,
      [authUser.userId, key]
    );
    return NextResponse.json({ ok: true, key });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
