/**
 * /api/users/me/password-request
 * GET  — 自分の申請履歴を取得
 * POST — 新規申請を送信
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.userId;
  const db = getDb();

  try {
    const rows = await query<{
      id: string; reason: string; status: string;
      reviewed_by_name: string | null; reviewed_at: string | null;
      reject_reason: string | null; created_at: string;
    }>(db, `
      SELECT
        r.id, r.reason, r.status,
        u2.display_name AS reviewed_by_name,
        r.reviewed_at, r.reject_reason, r.created_at
      FROM password_change_requests r
      LEFT JOIN users u2 ON u2.id = r.reviewed_by
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [userId]);

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.userId;
  const db = getDb();

  const { reason } = await req.json().catch(() => ({}));
  if (!reason || String(reason).trim().length < 5) {
    return NextResponse.json({ error: "申請理由を5文字以上で入力してください" }, { status: 400 });
  }

  try {
    // 既存のpending申請があればエラー
    const existing = await query<{ id: string }>(db,
      `SELECT id FROM password_change_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [userId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "既に審査中の申請があります。結果をお待ちください。" }, { status: 409 });
    }

    const id = randomUUID();
    await execute(db,
      `INSERT INTO password_change_requests (id, user_id, reason) VALUES (?, ?, ?)`,
      [id, userId, String(reason).trim()]
    );

    return NextResponse.json({ ok: true, id, message: "申請を送信しました。管理者の審査をお待ちください。" });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
