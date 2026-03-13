import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { key, delta } = await req.json().catch(() => ({}));
  if (!key) return NextResponse.json({ error: "key は必須です" }, { status: 400 });

  // [FIX] key の文字種バリデーション
  const KEY_PATTERN = /^[\w\-]{1,100}$/;
  if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
    return NextResponse.json({ error: "キー名に無効な文字が含まれています" }, { status: 400 });
  }

  // [Q-004][FIX-C01/C02/C03] ゲーム進行・セキュリティに直結する保護キーはユーザーが直接書き込めない
  // anomaly_score / observer_load はサーバー内部ロジックのみが更新する
  const BLOCKED_KEYS = ["total_xp", "xp_total", "clearance_level", "level", "anomaly_score", "observer_load"];
  if (BLOCKED_KEYS.includes(key)) {
    return NextResponse.json({ error: "このキーは変更できません" }, { status: 403 });
  }

  // [FIX-L03] delta が数値でない場合は 0 として扱う（null/undefined/""を区別）
  const deltaNum = typeof delta === "number" && Number.isFinite(delta) ? delta : 0;

  const db = getDb();
  try {
    await execute(db, `
      INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, ?, ?)
      ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?
    `, [authUser.userId, key, deltaNum, deltaNum]);
    const row = await query<{ var_value: number }>(db,
      `SELECT var_value FROM story_variables WHERE user_id = ? AND var_key = ?`,
      [authUser.userId, key]
    );
    const newValue = parseFloat(String(row[0]?.var_value || 0));
    return NextResponse.json({ ok: true, key, newValue });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
