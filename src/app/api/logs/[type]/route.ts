import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const { type: logType } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();

  if (logType === "access") {
    const { path, statusCode } = body;
    // userIdはクライアントから受け取らず認証済みトークンから取得
    const userId = authUser.userId;
    try {
      await execute(db, `
        INSERT INTO access_logs (user_id, method, path, status_code, ip_address, created_at)
        VALUES (?, 'GET', ?, ?, ?, datetime('now'))
      `, [userId, path || "/", statusCode || 200,
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null]);
    } catch {}
    return new NextResponse(null, { status: 204 });
  }

  if (logType === "view") {
    const { type, itemId, name } = body;
    // userIdはクライアントから受け取らず認証済みトークンから取得
    const userId = authUser.userId;
    try {
      await execute(db, `
        INSERT INTO player_action_logs (user_id, action_type, action_target, metadata, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [userId, `view_${type || "page"}`, itemId || null, JSON.stringify({ name: name || null, type: type || null })]);
    } catch {}
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
