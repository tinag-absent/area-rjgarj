import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import type { InValue } from "@libsql/client";
import { requireAuth } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const db = getDb();
  try {
    const [flagRows, varRows, eventRows] = await Promise.all([
      query<{ flag_key: string; flag_value: string }>(db,
        `SELECT flag_key, flag_value FROM progress_flags WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
        [authUser.userId]
      ),
      query<{ var_key: string; var_value: number }>(db,
        `SELECT var_key, var_value FROM story_variables WHERE user_id = ?`,
        [authUser.userId]
      ),
      query<{ event_id: string; fired_at: string }>(db,
        `SELECT event_id, fired_at FROM fired_events WHERE user_id = ? ORDER BY fired_at ASC`,
        [authUser.userId]
      ),
    ]);

    const flags: Record<string, unknown> = {};
    flagRows.forEach((r) => { try { flags[r.flag_key] = JSON.parse(r.flag_value); } catch { flags[r.flag_key] = r.flag_value; } });

    const variables: Record<string, number> = {};
    varRows.forEach((r) => { variables[r.var_key] = parseFloat(String(r.var_value)); });

    const firedSet: Record<string, boolean> = {};
    const history = eventRows.map((r) => { firedSet[r.event_id] = true; return { eventId: r.event_id, time: new Date(r.fired_at).getTime() }; });

    return NextResponse.json({ flags, variables, history, firedSet });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;
  const { flags, variables, firedSet } = await req.json().catch(() => ({}));
  const db = getDb();
  try {
    if (flags && typeof flags === "object") {
      for (const [key, value] of Object.entries(flags)) {
        await execute(db, `
          INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = ?, set_at = datetime('now')
        `, [authUser.userId, key, JSON.stringify(value), JSON.stringify(value)]);
      }
    }
    if (variables && typeof variables === "object") {
      for (const [key, value] of Object.entries(variables)) {
        await execute(db, `
          INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, ?, ?)
          ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = ?
        `, [authUser.userId, key, value as InValue, value as InValue]);
      }
      if (variables.anomaly_score !== undefined)
        await execute(db, `UPDATE users SET anomaly_score = ? WHERE id = ?`, [variables.anomaly_score, authUser.userId]);
      if (variables.observer_load !== undefined)
        await execute(db, `UPDATE users SET observer_load = ? WHERE id = ?`, [Math.min(100, variables.observer_load as number), authUser.userId]);
    }
    if (firedSet && typeof firedSet === "object") {
      for (const eventId of Object.keys(firedSet)) {
        if (firedSet[eventId]) {
          await execute(db, `INSERT INTO fired_events (user_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [authUser.userId, eventId]);
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
