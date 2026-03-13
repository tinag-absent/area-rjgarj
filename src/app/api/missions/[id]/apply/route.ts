import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

// [FIX-H15] CREATE TABLE IF NOT EXISTS をリクエストごとに実行しないよう global フラグで管理
declare global {
  // eslint-disable-next-line no-var
  var _missionParticipantsEnsured: boolean | undefined;
}

async function ensureMissionParticipantsTable(db: ReturnType<typeof getDb>) {
  if (globalThis._missionParticipantsEnsured) return;
  await execute(db, `
    CREATE TABLE IF NOT EXISTS mission_participants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      mission_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL REFERENCES users(id),
      status      TEXT NOT NULL DEFAULT 'applied',
      joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (mission_id, user_id)
    )
  `, []).catch(() => {});
  globalThis._missionParticipantsEnsured = true;
}

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

  // [N-012] JWT の level はログイン時の値で古い可能性があるため、DB から最新値を取得
  const db = getDb();
  try {
    const levelRow = await query<{ clearance_level: number }>(db,
      `SELECT clearance_level FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [user.userId]
    );
    // [FIX-H07] ユーザーが存在しない場合は 404、DB エラーは 503 で返す
    if (!levelRow.length) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }
    const actualLevel = levelRow[0]?.clearance_level ?? 0;
    if (actualLevel < 4) {
      return NextResponse.json({ error: "LV4以上の機関員のみ参加申請できます" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "一時的にサービスが利用できません" }, { status: 503 });
  }
  try {
    // [FIX-H15] テーブル作成を関数化し global フラグで重複実行を防止
    await ensureMissionParticipantsTable(db);

    // [FIX BUG#13] missionIdをmissionsテーブルで実在確認（架空IDでのレコード作成を防止）
    const missionExists = await query<{ id: string }>(db,
      `SELECT id FROM missions WHERE id = ? LIMIT 1`, [missionId]
    ).catch(() => [] as { id: string }[]);
    if (!missionExists.length) {
      return NextResponse.json({ error: "指定されたミッションが存在しません" }, { status: 404 });
    }

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
