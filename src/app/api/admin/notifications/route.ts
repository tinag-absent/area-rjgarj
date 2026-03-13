import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute, transaction } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";
import { sanitizeDisplayText, sanitizeMultilineText } from "@/lib/sanitize";

// GET: 最近送信した通知の一覧（admin確認用）
export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  try {
    const rows = await query<{
      id: number; user_id: string; username: string; type: string;
      title: string; body: string; is_read: number; created_at: string;
    }>(db, `
      SELECT n.id, n.user_id, u.username, n.type, n.title, n.body, n.is_read, n.created_at
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      WHERE n.created_at > datetime('now', '-7 days')
      ORDER BY n.created_at DESC LIMIT 100
    `, []);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}

// POST: 通知を送信
// body: { target: "all" | "division:slug" | "level:N" | "user:id", type, title, body }
export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { target, type = "info", title: rawTitle, body: rawBody } = await req.json().catch(() => ({}));

  // [FIX-NEW-01] title/body をサニタイズして XSS を防止
  const title = sanitizeDisplayText(rawTitle);
  const bodyText = sanitizeMultilineText(rawBody);

  if (!title || !bodyText) {
    return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });
  }
  // [FIX-NEW-01] 長さ制限を追加（DoS防止）
  if (title.length > 200) {
    return NextResponse.json({ error: "title は200文字以内にしてください" }, { status: 400 });
  }
  if (bodyText.length > 2000) {
    return NextResponse.json({ error: "body は2000文字以内にしてください" }, { status: 400 });
  }
  if (!target) {
    return NextResponse.json({ error: "target は必須です（all / division:slug / level:N / user:id）" }, { status: 400 });
  }

  // [AE-029] type フィールドのホワイトリスト検証
  const ALLOWED_TYPES = ["info", "warning", "error", "xp", "levelup", "admin_dm", "critical", "login"];
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: `type は ${ALLOWED_TYPES.join(" / ")} のいずれかです` }, { status: 400 });
  }

  // [AB-010] "all" への一括通知は super_admin のみ
  if (target === "all" && auth.user.role !== "super_admin") {
    return NextResponse.json({ error: "全体通知の送信には super_admin 権限が必要です" }, { status: 403 });
  }

  const db = getDb();
  try {
    // 対象ユーザーIDを解決
    let userIds: string[] = [];

    if (target === "all") {
      const rows = await query<{ id: string }>(db,
        `SELECT id FROM users WHERE deleted_at IS NULL AND status = 'active'`, []
      );
      userIds = rows.map(r => r.id);
    } else if (target.startsWith("division:")) {
      const slug = target.slice(9);
      // [FIX] division slug のフォーマット検証（SQLインジェクション防護の追加層）
      if (!/^[\w\-]{1,64}$/.test(slug)) {
        return NextResponse.json({ error: "不正な division slug です" }, { status: 400 });
      }
      const rows = await query<{ id: string }>(db,
        `SELECT u.id FROM users u JOIN divisions d ON d.id = u.division_id
         WHERE d.slug = ? AND u.deleted_at IS NULL AND u.status = 'active'`, [slug]
      );
      userIds = rows.map(r => r.id);
    } else if (target.startsWith("level:")) {
      const lvl = parseInt(target.slice(6), 10);
      // [FIX] lvl が有効な整数でない場合は拒否
      if (isNaN(lvl) || lvl < 0 || lvl > 5) {
        return NextResponse.json({ error: "level は 0〜5 の整数で指定してください" }, { status: 400 });
      }
      const rows = await query<{ id: string }>(db,
        `SELECT id FROM users WHERE clearance_level >= ? AND deleted_at IS NULL AND status = 'active'`, [lvl]
      );
      userIds = rows.map(r => r.id);
    } else if (target.startsWith("user:")) {
      // [BUG-25 FIX] user:<uuid> 形式 — ユーザー存在を確認してから追加
      const targetId = target.slice(5);
      // [FIX] targetId を UUID 形式で検証
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
        return NextResponse.json({ error: "user: の後には UUID 形式のユーザー ID を指定してください" }, { status: 400 });
      }
      const rows = await query<{ id: string }>(db,
        `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [targetId]
      );
      if (!rows.length) {
        return NextResponse.json({ error: "指定されたユーザーが見つかりません" }, { status: 404 });
      }
      userIds = [rows[0].id];
    } else {
      return NextResponse.json({ error: "不正な target 形式です" }, { status: 400 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: "対象ユーザーが0人です", sent: 0 });
    }

    // [BUG-09 FIX] 一括INSERTをトランザクション内で実行。
    // 途中エラー時にロールバックされ、N+1のラウンドトリップも削減。
    await transaction(db, async (tx) => {
      for (const uid of userIds) {
        await tx.execute({
          sql: `INSERT INTO notifications (user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
          args: [uid, type, title, bodyText],
        });
      }
    });

    return NextResponse.json({ message: `${userIds.length}名に送信しました`, sent: userIds.length });
  } catch {
    return NextResponse.json({ error: "送信失敗" }, { status: 500 });
  }
}
