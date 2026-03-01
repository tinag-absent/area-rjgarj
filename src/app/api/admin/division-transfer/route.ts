import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth, requireSuperAdmin } from "@/lib/server-auth";

// GET: 部門移動申請一覧
export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  try {
    const rows = await db.execute({
      sql: `
      SELECT
        dt.id,
        dt.user_id,
        u.username   AS agent_id,
        u.display_name AS agent_name,
        u.clearance_level,
        dt.from_division_id,
        fd.name AS from_division_name,
        dt.to_division_id,
        td.name AS to_division_name,
        dt.reason,
        dt.status,
        dt.reviewed_by,
        rv.username AS reviewer_name,
        dt.reviewed_at,
        dt.reject_reason,
        dt.created_at
      FROM division_transfer_requests dt
      JOIN users u   ON u.id = dt.user_id
      LEFT JOIN divisions fd ON fd.id = dt.from_division_id
      LEFT JOIN divisions td ON td.id = dt.to_division_id
      LEFT JOIN users rv ON rv.id = dt.reviewed_by
      WHERE dt.status = ?
      ORDER BY dt.created_at DESC
    `,
      args: [status],
    });

    return NextResponse.json(rows.rows);
  } catch {
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}

// POST: 申請を新規作成（プレイヤー向け — admin不要）
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const userId = authUser.userId;

  const { toDivisionId, reason } = await req.json().catch(() => ({}));
  if (!toDivisionId) return NextResponse.json({ error: "移動先部門が必要です" }, { status: 400 });

  const db = getDb();

  try {
    // 既存の pending 申請確認
    const existing = await db.execute({
      sql: `SELECT id FROM division_transfer_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      args: [userId],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "既に審査中の申請があります" }, { status: 409 });
    }

    // 現在の部門取得
    const userRow = await db.execute({
      sql: `SELECT division_id FROM users WHERE id = ? LIMIT 1`,
      args: [userId],
    });
    const fromDivisionId = (userRow.rows[0] as unknown as { division_id: string | null })?.division_id ?? null;

    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO division_transfer_requests (id, user_id, from_division_id, to_division_id, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      args: [id, userId, fromDivisionId, toDivisionId, reason ?? ""],
    });

    return NextResponse.json({ id, message: "申請を送信しました" });
  } catch {
    return NextResponse.json({ error: "申請失敗" }, { status: 500 });
  }
}

// PUT: 申請を承認 / 却下
export async function PUT(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const reviewerId = auth.user.userId;

  const { id, action, rejectReason } = await req.json().catch(() => ({}));
  if (!id || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "id と action (approve|reject) が必要です" }, { status: 400 });
  }

  const db = getDb();

  try {
    // 申請取得
    const requestRow = await db.execute({
      sql: `SELECT * FROM division_transfer_requests WHERE id = ? AND status = 'pending' LIMIT 1`,
      args: [id],
    });
    if (requestRow.rows.length === 0) {
      return NextResponse.json({ error: "申請が見つからないか既に処理済みです" }, { status: 404 });
    }

    const request = requestRow.rows[0] as unknown as {
      user_id: string; to_division_id: string;
    };

    if (action === "approve") {
      // users.division_id を更新
      await db.execute({
      sql: `UPDATE users SET division_id = ? WHERE id = ?`,
      args: [request.to_division_id, request.user_id],
    });
      // フラグ設定
      await db.execute({
      sql: `INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
         VALUES (?, 'division_joined', 'true', datetime('now'))
         ON CONFLICT(user_id, flag_key) DO UPDATE SET flag_value='true', set_at=datetime('now')`,
      args: [request.user_id],
    });
    }

    // ステータス更新
    await db.execute({
      sql: `UPDATE division_transfer_requests
       SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), reject_reason = ?
       WHERE id = ?`,
      args: [action === "approve" ? "approved" : "rejected", reviewerId, rejectReason ?? null, id],
    });

    return NextResponse.json({ message: action === "approve" ? "承認しました" : "却下しました" });
  } catch {
    return NextResponse.json({ error: "処理失敗" }, { status: 500 });
  }
}
