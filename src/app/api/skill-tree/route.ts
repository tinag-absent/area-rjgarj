import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  const rows = await query<{ id:string; data_json:string }>(db,
    "SELECT id, data_json FROM skill_tree_tracks WHERE active=1 ORDER BY sort_order ASC"
  ).catch(() => [] as { id:string; data_json:string }[]);
  return NextResponse.json(rows.map(r => JSON.parse(r.data_json)));
}
