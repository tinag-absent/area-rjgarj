import { NextRequest, NextResponse } from "next/server";
import { getDb, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

// [FIX-C07/C08] 入力バリデーション定数
const MAX_PATH_LENGTH = 2048;
const MAX_ITEM_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 256;
const MAX_TYPE_LENGTH = 64;

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const { type: logType } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();

  if (logType === "access") {
    const { path, statusCode } = body;
    const userId = authUser.userId;

    // [FIX-C07] path の長さ・型チェック
    const safePath = typeof path === "string" && path.length <= MAX_PATH_LENGTH ? path : "/";
    // [FIX-C08] statusCode が有効な整数か確認
    const safeStatusCode = typeof statusCode === "number" && Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
      ? statusCode
      : 200;

    try {
      await execute(db, `
        INSERT INTO access_logs (user_id, method, path, status_code, ip_address, created_at)
        VALUES (?, 'GET', ?, ?, ?, datetime('now'))
      `, [userId, safePath, safeStatusCode,
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null]);
    } catch {}
    return new NextResponse(null, { status: 204 });
  }

  if (logType === "view") {
    const { type, itemId, name } = body;
    const userId = authUser.userId;

    // [FIX-C07] type, itemId, name の長さ・型チェック
    const safeType = typeof type === "string" && type.length <= MAX_TYPE_LENGTH ? type : "page";
    const safeItemId = typeof itemId === "string" && itemId.length <= MAX_ITEM_ID_LENGTH ? itemId : null;
    const safeName = typeof name === "string" && name.length <= MAX_NAME_LENGTH ? name : null;

    try {
      await execute(db, `
        INSERT INTO player_action_logs (user_id, action_type, action_target, metadata, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [userId, `view_${safeType}`, safeItemId, JSON.stringify({ name: safeName, type: safeType })]);
    } catch {}
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
