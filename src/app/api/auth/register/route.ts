import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { AGENT_ID_REGEX } from "@/lib/constants";
import { sanitizeDisplayText } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const { agentId, name: rawName, password, division } = await req.json().catch(() => ({}));
  const name = sanitizeDisplayText(rawName);

  if (!agentId || !name || !password || !division)
    return NextResponse.json({ error: "全フィールドは必須です" }, { status: 400 });
  if (!AGENT_ID_REGEX.test(agentId))
    return NextResponse.json({ error: "機関員IDの形式が正しくありません (K-XXX-XXX)" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "パスキーは最低8文字必要です" }, { status: 400 });
  if (name.length > 50)
    return NextResponse.json({ error: "名前は50文字以内にしてください" }, { status: 400 });

  try {
    const db = getDb();

    const exists = await query(db,
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [agentId]
    );
    if (exists.length > 0)
      return NextResponse.json({ error: "この機関員IDは既に使用されています" }, { status: 409 });

    const divRows = await query<{ id: string }>(db,
      `SELECT id FROM divisions WHERE slug = ? AND is_active = 1 LIMIT 1`,
      [division]
    );
    const divisionId = divRows.length > 0 ? divRows[0].id : null;

    const passwordHash = await hashPassword(password);
    const pseudoEmail = agentId.toLowerCase().replace(/-/g, ".") + "@kaishoku.local";
    const newId = crypto.randomUUID();

    await execute(db, `
      INSERT INTO users (id, username, email, password_hash, display_name, role, status,
                         clearance_level, division_id, email_verified, created_at)
      VALUES (?, ?, ?, ?, ?, 'player', 'active', 0, ?, 1, datetime('now'))
    `, [newId, agentId, pseudoEmail, passwordHash, name, divisionId]);

    return NextResponse.json({
      user: {
        id: agentId, _uuid: newId, name,
        role: "player", level: 0, xp: 0,
        division, registeredAt: new Date().toISOString(),
      }
    }, { status: 201 });
  } catch (err) {
    console.error("[register] エラー:", err);
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE"))
      return NextResponse.json({ error: "この機関員IDは既に使用されています" }, { status: 409 });
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
