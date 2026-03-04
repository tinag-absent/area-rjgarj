import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  const rows = await query<Record<string, unknown>>(db,
    "SELECT * FROM achievement_defs WHERE active=1 ORDER BY rowid ASC"
  ).catch(() => [] as Record<string, unknown>[]);
  return NextResponse.json(rows.map(r => ({ ...r, active: r.active === 1, secret: r.secret === 1 })));
}
