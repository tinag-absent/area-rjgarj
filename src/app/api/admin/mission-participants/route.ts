import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

// GET: 全参加申請一覧
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  try {
    // テーブルが存在しない場合は空配列を返す
    const rows = await query<{
      id: number; mission_id: string; user_id: string;
      username: string; display_name: string; status: string; joined_at: string;
    }>(db, `
      SELECT mp.id, mp.mission_id, mp.user_id, u.username, u.display_name, mp.status, mp.joined_at
      FROM mission_participants mp
      JOIN users u ON u.id = mp.user_id
      ORDER BY mp.joined_at DESC LIMIT 200
    `, []).catch(() => []);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

// PATCH: 申請ステータス更新 (approved/rejected) + XP付与
export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { participantId, status } = await req.json().catch(() => ({}));
  if (!participantId || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "participantId と status (approved/rejected) が必要です" }, { status: 400 });
  }

  const db = getDb();
  try {
    const rows = await query<{ user_id: string; status: string }>(db,
      `SELECT user_id, status FROM mission_participants WHERE id = ?`, [participantId]
    );
    if (!rows.length) return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });

    const participant = rows[0];
    await execute(db, `UPDATE mission_participants SET status = ? WHERE id = ?`, [status, participantId]);

    // 承認時にXP付与
    if (status === "approved" && participant.status !== "approved") {
      await execute(db, `
        INSERT INTO story_variables (user_id, var_key, var_value, updated_at)
        VALUES (?, 'total_xp', COALESCE((
          SELECT var_value FROM story_variables WHERE user_id = ? AND var_key = 'total_xp'
        ), 0) + 100, datetime('now'))
        ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + 100, updated_at = datetime('now')
      `, [participant.user_id, participant.user_id]);

      // 通知
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body, created_at)
        VALUES (?, 'info', 'ミッション参加承認', 'ミッションへの参加が承認されました。100XP獲得。', datetime('now'))
      `, [participant.user_id]);
    }

    return NextResponse.json({ message: `ステータスを ${status} に更新しました` });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
