import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { TRIGGERS } from "@/lib/event-triggers";

// [O-009] 許可済みイベント ID のホワイトリスト
const ALLOWED_EVENT_IDS = new Set(TRIGGERS.map(t => t.id));

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { eventId } = await req.json().catch(() => ({}));
  if (!eventId) return NextResponse.json({ error: "eventId は必須です" }, { status: 400 });

  // [O-009] TRIGGERS に定義されていない eventId は拒否
  if (!ALLOWED_EVENT_IDS.has(eventId)) {
    return NextResponse.json({ error: "無効なイベントIDです" }, { status: 400 });
  }

  const db = getDb();
  try {
    await execute(db, `INSERT INTO fired_events (user_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [authUser.userId, eventId]);
    return NextResponse.json({ ok: true, eventId });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
