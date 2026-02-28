import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { AGENT_ID_REGEX } from "@/lib/constants";

/**
 * GET /api/auth/check-id?agentId=K-XXX-XXX
 * 機関員IDの使用可否をリアルタイムチェックする
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") ?? "";

  // フォーマット検証
  if (!AGENT_ID_REGEX.test(agentId)) {
    return NextResponse.json({ available: false, reason: "format" });
  }

  const db = getDb();
  try {
    const rows = await query(db,
      `SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
      [agentId]
    );
    if (rows.length > 0) {
      return NextResponse.json({ available: false, reason: "taken" });
    }
    return NextResponse.json({ available: true });
  } catch {
    // DBエラー時は判定不能として通過させる
    return NextResponse.json({ available: null, reason: "error" });
  }
}
