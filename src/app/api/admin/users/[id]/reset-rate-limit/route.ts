/**
 * POST /api/admin/users/[id]/reset-rate-limit
 * 指定ユーザーのレート制限ロックを管理者がリセットする。
 * レート制限により正規ユーザーがログインできなくなった場合に使用する。
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, execute, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // [BUG-K FIX] id を UUID 形式で検証（隣接する reset-password / route.ts と統一）
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "無効なユーザー ID です" }, { status: 400 });
  }

  const db = getDb();

  try {
    // ユーザーのagent_id（username）を取得
    const userRows = await query<{ username: string }>(
      db,
      `SELECT username FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id]
    );
    if (!userRows.length) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const agentId = userRows[0].username.toLowerCase();

    // アカウント単位の失敗ログを削除
    await execute(
      db,
      `DELETE FROM rate_limit_attempts WHERE key_type = 'account' AND key_value = ?`,
      [agentId]
    );

    // IP単位のロックも解除するため、対象アカウントに紐づくIPを特定して削除
    // (ただし他のアカウントへの攻撃記録は維持する)
    // シンプルに直近の失敗IPを一括削除する代わりにアカウント記録のみリセット
    return NextResponse.json({
      ok: true,
      message: `${userRows[0].username} のレート制限をリセットしました`,
    });
  } catch (err) {
    console.error("[reset-rate-limit] エラー:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
