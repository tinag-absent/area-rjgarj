import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();
  const rows = await query<Record<string, unknown>>(db,
    "SELECT * FROM achievement_defs WHERE active=1 ORDER BY rowid ASC"
  ).catch(() => [] as Record<string, unknown>[]);

  // [FIX BUG#17] ユーザーの解除済み実績を取得してシークレット判定に使用
  const unlockedRows = await query<{ achievement_id: string }>(db,
    "SELECT achievement_id FROM user_achievements WHERE user_id = ?", [authUser.userId]
  ).catch(() => [] as { achievement_id: string }[]);
  const unlockedSet = new Set(unlockedRows.map(r => r.achievement_id));

  // [AE-004] シークレット実績のタイトル・説明を未取得ユーザーには伏字にする
  return NextResponse.json(rows.map(r => {
    const isSecret = r.secret === 1 || r.secret === true;
    const isUnlocked = unlockedSet.has(String(r.id));
    return {
      ...r,
      active: r.active === 1,
      secret: isSecret,
      unlocked: isUnlocked,
      // 未解除のシークレット実績は内容を伏せる
      title: isSecret && !isUnlocked ? "???" : r.title,
      description: isSecret && !isUnlocked ? "解除条件は不明です" : r.description,
    };
  }));
}
