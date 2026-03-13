import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import type { InValue } from "@libsql/client";
import { requireAuth } from "@/lib/server-auth";
import { TRIGGERS } from "@/lib/event-triggers";

// [Q-003] fired_events に書き込める eventId のホワイトリスト
const ALLOWED_EVENT_IDS = new Set(TRIGGERS.map(t => t.id));
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

  // [FIX BUG#12] 巨大オブジェクトによるDB肥大化DoS防止
  const MAX_KEYS = 200;
  const MAX_VALUE_LENGTH = 1000;
  const MAX_KEY_LENGTH = 128;
  if (flags && typeof flags === "object" && Object.keys(flags).length > MAX_KEYS) {
    return NextResponse.json({ error: "flagsのキー数が上限を超えています" }, { status: 400 });
  }
  if (variables && typeof variables === "object" && Object.keys(variables).length > MAX_KEYS) {
    return NextResponse.json({ error: "variablesのキー数が上限を超えています" }, { status: 400 });
  }
  const db = getDb();
  try {
    if (flags && typeof flags === "object") {
      // [FIX-SCAN-04] フラグキーの文字種チェック（SQLインジェクション多層防御）
      const FLAG_KEY_PATTERN = /^[\w\-]{1,128}$/;
      for (const [key, value] of Object.entries(flags)) {
        if (key.length > MAX_KEY_LENGTH) continue;
        // [FIX-SCAN-04] 英数字・アンダースコア・ハイフン以外は拒否
        if (!FLAG_KEY_PATTERN.test(key)) continue;
        const serialized = JSON.stringify(value);
        // [BUG-12 FIX] MAX_VALUE_LENGTHを実際に適用（定義されていたが未使用だった）
        if (serialized.length > MAX_VALUE_LENGTH) continue;
        await execute(db, `
          INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = ?, set_at = datetime('now')
        `, [authUser.userId, key, serialized, serialized]);
      }
    }
    if (variables && typeof variables === "object") {
      // [FIX-SCAN-04] 変数キーの文字種チェック
      const VAR_KEY_PATTERN = /^[\w\-]{1,128}$/;
      for (const [key, value] of Object.entries(variables)) {
        // [FIX-C02/C03] anomaly_score / observer_load はサーバー内部ロジックのみが更新する。
        // ユーザーからの書き込みを完全に禁止する。
        if (key === "anomaly_score" || key === "observer_load") continue;
        // [Q-005] XP・レベルに直結する保護キーはユーザーが直接書き込めない
        if (["total_xp", "xp_total", "clearance_level", "level"].includes(key)) continue;
        // [FIX-SCAN-04] 英数字・アンダースコア・ハイフン以外は拒否
        if (!VAR_KEY_PATTERN.test(key)) continue;
        // [FIX BUG#28] var_valueは数値カラムのため、数値以外はサイレントエラー防止でスキップ
        const numValue = Number(value);
        if (!Number.isFinite(numValue)) continue;
        await execute(db, `
          INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, ?, ?)
          ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = ?
        `, [authUser.userId, key, numValue, numValue]);
      }
      // [FIX-C02] anomaly_score / observer_load のユーザー書き込みを廃止
      // これらの値はサーバー側の anomaly ルールエンジンのみが更新する
    }
    // [FIX-C09] クライアントから firedSet を受け付けない。
    // イベント発火はサーバー側の check-triggers エンドポイントのみが担当する。
    // 以前の実装ではホワイトリスト検証があっても未達成イベントをスキップできた。
    void firedSet; // 意図的に使用しない
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
