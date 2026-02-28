/**
 * /api/admin/password-requests
 * GET    — 申請一覧（super_admin only）
 * POST   — 承認 / 却下（super_admin only）
 *   body: { id, action: "approve" | "reject", newPassword?, rejectReason? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/server-auth";
import { hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending";

  try {
    const rows = await query<{
      id: string; user_id: string; agent_id: string; display_name: string;
      level: number; division_name: string | null;
      reason: string; status: string;
      reviewed_by_name: string | null; reviewed_at: string | null;
      reject_reason: string | null; created_at: string;
    }>(db, `
      SELECT
        r.id, r.user_id,
        u.username AS agent_id,
        COALESCE(u.display_name, u.username) AS display_name,
        u.clearance_level AS level,
        d.name AS division_name,
        r.reason, r.status,
        COALESCE(u2.display_name, u2.username) AS reviewed_by_name,
        r.reviewed_at, r.reject_reason, r.created_at
      FROM password_change_requests r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN divisions d ON d.id = u.division_id
      LEFT JOIN users u2 ON u2.id = r.reviewed_by
      ${status === "all" ? "" : "WHERE r.status = ?"}
      ORDER BY r.created_at DESC
      LIMIT 100
    `, status === "all" ? [] : [status]);

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const reviewerId = auth.user.userId;
  const db = getDb();

  const { id, action, newPassword, rejectReason } = await req.json().catch(() => ({}));

  if (!id || !action) {
    return NextResponse.json({ error: "id と action は必須です" }, { status: 400 });
  }

  try {
    // 申請存在確認
    const rows = await query<{ id: string; user_id: string; status: string }>(db,
      `SELECT id, user_id, status FROM password_change_requests WHERE id = ? LIMIT 1`, [id]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "申請が見つかりません" }, { status: 404 });
    }
    if (rows[0].status !== "pending") {
      return NextResponse.json({ error: "この申請は既に処理されています" }, { status: 409 });
    }

    const targetUserId = rows[0].user_id;

    if (action === "approve") {
      if (!newPassword || String(newPassword).length < 8) {
        return NextResponse.json({ error: "新しいパスワードは8文字以上にしてください" }, { status: 400 });
      }
      const hash = await hashPassword(String(newPassword));

      // パスワード更新
      await execute(db,
        `UPDATE users SET password_hash = ? WHERE id = ? AND deleted_at IS NULL`,
        [hash, targetUserId]
      );

      // 申請ステータス更新
      await execute(db, `
        UPDATE password_change_requests
        SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now')
        WHERE id = ?
      `, [reviewerId, id]);

      // ユーザーへ通知
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body)
        VALUES (?, 'info', 'パスワード変更申請が承認されました',
          '管理者があなたのパスワード変更申請を承認しました。新しいパスワードでログインしてください。')
      `, [targetUserId]);

      return NextResponse.json({ ok: true, message: "承認しパスワードを変更しました" });

    } else if (action === "reject") {
      await execute(db, `
        UPDATE password_change_requests
        SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'),
            reject_reason = ?
        WHERE id = ?
      `, [reviewerId, rejectReason ? String(rejectReason).trim() : null, id]);

      // ユーザーへ通知
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body)
        VALUES (?, 'warning', 'パスワード変更申請が却下されました',
          ?)
      `, [targetUserId, rejectReason
          ? `申請が却下されました。理由: ${rejectReason}`
          : "申請が却下されました。詳細は管理者にお問い合わせください。"
        ]);

      return NextResponse.json({ ok: true, message: "申請を却下しました" });

    } else {
      return NextResponse.json({ error: "action は approve または reject にしてください" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
