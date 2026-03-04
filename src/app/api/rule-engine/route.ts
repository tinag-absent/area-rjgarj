import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { getAuthUser, unauthorized } from "@/lib/auth";

/** 認証済みユーザー向けエンドポイント — activeなルールのみ返す */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const type = new URL(req.url).searchParams.get("type");
  if (!type) return NextResponse.json({ error:"type が必要" },{status:400});
  try {
    const db = getDb();
    const rows = await query<{ id:string; data_json:string }>(
      db, "SELECT id, data_json FROM rule_engine_entries WHERE type=? AND active=1 ORDER BY priority ASC, created_at ASC",
      [type]
    ).catch(() => [] as { id:string; data_json:string }[]);
    return NextResponse.json(rows.map(r => ({ id:r.id, ...JSON.parse(r.data_json||"{}") })));
  } catch { return NextResponse.json([]); }
}
