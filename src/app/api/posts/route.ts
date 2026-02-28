import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { getAuthUser } from "@/lib/server-auth";
import { sanitizeDisplayText, sanitizeMultilineText } from "@/lib/sanitize";

function formatPost(row: Record<string, unknown>) {
  let meta: Record<string, unknown> = {};
  try { meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown> || {}); } catch {}
  return {
    id: row.id, title: row.title, body: row.body, status: row.status,
    likeCount: row.like_count || 0, commentCount: row.comment_count || 0,
    viewCount: row.view_count || 0, classification: row.classification,
    requiredClearance: row.required_clearance || 0, isLore: !!row.is_lore,
    slug: row.slug, authorId: row.author_id, authorName: row.author_name,
    divisionSlug: row.division_slug, divisionName: row.division_name,
    createdAt: row.created_at, updatedAt: row.updated_at,
    timestamp: row.created_at, author: row.author_name, desc: row.body,
    severity: meta.severity || "safe", location: meta.location || "",
  };
}

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req);
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30");
  const offset = parseInt(searchParams.get("offset") || "0");
  const division = searchParams.get("division");
  const userClearance = authUser?.level || 0;
  const db = getDb();

  try {
    const baseSelect = `SELECT p.id, p.title, p.body, p.status, p.like_count, p.comment_count, p.view_count,
      p.classification, p.required_clearance, p.is_lore, p.slug, p.metadata, p.created_at, p.updated_at,
      u.username AS author_id, u.display_name AS author_name, d.slug AS division_slug, d.name AS division_name
      FROM posts p JOIN users u ON u.id = p.user_id LEFT JOIN divisions d ON d.id = p.division_id
      WHERE p.status = 'published' AND p.deleted_at IS NULL AND p.required_clearance <= ?`;

    const rows = await query<Record<string, unknown>>(db,
      division
        ? `${baseSelect} AND d.slug = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
        : `${baseSelect} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      division ? [userClearance, division, limit, offset] : [userClearance, limit, offset]
    );
    return NextResponse.json(rows.map(formatPost));
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authUser = getAuthUser(req);
  if (!authUser) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const { title: rawTitle, body: rawBody, severity, location, entityDesc, author } = await req.json().catch(() => ({}));

  // XSSサニタイズ
  const title = sanitizeDisplayText(rawTitle);
  const body = sanitizeMultilineText(rawBody);
  const sanitizedLocation = sanitizeDisplayText(location);
  const sanitizedEntityDesc = sanitizeMultilineText(entityDesc);
  const sanitizedAuthor = sanitizeDisplayText(author);

  if (!body) return NextResponse.json({ error: "body は必須です" }, { status: 400 });

  const db = getDb();
  try {
    const classMap: Record<string, string> = { critical: "CRITICAL", warning: "CONFIDENTIAL", safe: "UNCLASSIFIED" };
    const newId = crypto.randomUUID();
    const metadata = JSON.stringify({ location: sanitizedLocation || null, entityDesc: sanitizedEntityDesc || null, authorName: sanitizedAuthor || null, severity: severity || "safe" });
    await execute(db, `
      INSERT INTO posts (id, user_id, title, body, status, classification, required_clearance, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'published', ?, 0, ?, datetime('now'), datetime('now'))
    `, [newId, authUser.userId, title || null, body, classMap[severity] || "UNCLASSIFIED", metadata]);

    return NextResponse.json(formatPost({
      id: newId, title, body, status: "published",
      classification: classMap[severity] || "UNCLASSIFIED",
      like_count: 0, comment_count: 0, created_at: new Date().toISOString(),
      author_id: authUser.agentId, author_name: sanitizedAuthor || authUser.agentId, metadata,
    }), { status: 201 });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
