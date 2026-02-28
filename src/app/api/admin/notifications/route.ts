import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

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

  const { target, type = "info", title, body: bodyText } = await req.json().catch(() => ({}));
  if (!title || !bodyText) {
    return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });
  }
  if (!target) {
    return NextResponse.json({ error: "target は必須です（all / division:slug / level:N / user:id）" }, { status: 400 });
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
      const rows = await query<{ id: string }>(db,
        `SELECT u.id FROM users u JOIN divisions d ON d.id = u.division_id
         WHERE d.slug = ? AND u.deleted_at IS NULL AND u.status = 'active'`, [slug]
      );
      userIds = rows.map(r => r.id);
    } else if (target.startsWith("level:")) {
      const lvl = parseInt(target.slice(6));
      const rows = await query<{ id: string }>(db,
        `SELECT id FROM users WHERE clearance_level >= ? AND deleted_at IS NULL AND status = 'active'`, [lvl]
      );
      userIds = rows.map(r => r.id);
    } else if (target.startsWith("user:")) {
      // user:<uuid> 形式
      userIds = [target.slice(5)];
    } else {
      return NextResponse.json({ error: "不正な target 形式です" }, { status: 400 });
    }

    if (userIds.length === 0) {
      return NextResponse.json({ message: "対象ユーザーが0人です", sent: 0 });
    }

    // 一括 INSERT
    for (const uid of userIds) {
      await execute(db, `
        INSERT INTO notifications (user_id, type, title, body, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [uid, type, title, bodyText]);
    }

    return NextResponse.json({ message: `${userIds.length}名に送信しました`, sent: userIds.length });
  } catch {
    return NextResponse.json({ error: "送信失敗" }, { status: 500 });
  }
}
