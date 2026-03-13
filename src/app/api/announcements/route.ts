import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/server-auth";
import { sanitizeDisplayText, sanitizeMultilineText } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  // [Q-014] 認証チェックを追加（未認証ユーザーがCONFIDENTIAL/CRITICALを閲覧できないよう）
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  // [FIX-L10] limit に上限を設定（DoS防止）
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20));
  const db = getDb();
  try {
    const rows = await query<Record<string, unknown>>(db, `
      SELECT p.id, p.title, p.body, p.classification, p.created_at, p.updated_at,
             u.username AS author_id, u.display_name AS author_name
      FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.is_lore = 1 AND p.status = 'published' AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC LIMIT ?
    `, [limit]);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // [Q-015] requireSuperAdminからrequireAdminへ変更（adminロールも投稿できるよう）
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const userId = authUser.userId;

  const { title: rawTitle, body: rawBody, classification } = await req.json().catch(() => ({}));
  const title = sanitizeDisplayText(rawTitle);
  const body = sanitizeMultilineText(rawBody);
  if (!title || !body) return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });

  // [FIX-L10] title・body の長さ制限
  if (title.length > 300) return NextResponse.json({ error: "title は300文字以内にしてください" }, { status: 400 });
  if (body.length > 20000) return NextResponse.json({ error: "body は20000文字以内にしてください" }, { status: 400 });

  // [FIX-L10] classification のホワイトリスト検証
  const ALLOWED_CLASSIFICATIONS = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "CRITICAL"];
  const safeClassification = ALLOWED_CLASSIFICATIONS.includes(classification) ? classification : "UNCLASSIFIED";

  const db = getDb();
  try {
    const id = crypto.randomUUID();
    await execute(db, `
      INSERT INTO posts (id, user_id, title, body, status, classification, required_clearance, is_lore, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'published', ?, 0, 1, datetime('now'), datetime('now'))
    `, [id, userId, title, body, safeClassification]);
    return NextResponse.json({ id, message: "お知らせを投稿しました" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
