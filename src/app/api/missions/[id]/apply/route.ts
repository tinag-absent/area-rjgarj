import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

// GET: ミッションへの自分の申請状況
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id: missionId } = await params;

  const db = getDb();
  try {
    // mission_participantsテーブルが存在しない場合は空を返す
    const rows = await query<{ status: string; joined_at: string }>(db,
      `SELECT status, joined_at FROM mission_participants WHERE mission_id = ? AND user_id = ? LIMIT 1`,
      [missionId, user.userId]
    ).catch(() => []);
    return NextResponse.json(rows[0] ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

// POST: ミッション参加申請
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id: missionId } = await params;

  if ((user.level ?? 0) < 4) {
    return NextResponse.json({ error: "LV4以上の機関員のみ参加申請できます" }, { status: 403 });
  }

  const db = getDb();
  try {
    // テーブルが存在しない場合は作成
    await execute(db, `
      CREATE TABLE IF NOT EXISTS mission_participants (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id  TEXT NOT NULL,
        user_id     TEXT NOT NULL REFERENCES users(id),
        status      TEXT NOT NULL DEFAULT 'applied',
        joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (mission_id, user_id)
      )
    `, []);

    // 既存申請チェック
    const existing = await query<{ status: string }>(db,
      `SELECT status FROM mission_participants WHERE mission_id = ? AND user_id = ?`,
      [missionId, user.userId]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "すでに申請済みです", status: existing[0].status }, { status: 409 });
    }

    await execute(db,
      `INSERT INTO mission_participants (mission_id, user_id, status) VALUES (?, ?, 'applied')`,
      [missionId, user.userId]
    );

    return NextResponse.json({ message: "参加申請しました", status: "applied" });
  } catch {
    return NextResponse.json({ error: "申請に失敗しました" }, { status: 500 });
  }
}
