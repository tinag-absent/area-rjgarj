import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

export const RULE_TYPES = ["arg_keyword","known_flag","incident_lifecycle","novel_rule","xp_rule","anomaly_rule"] as const;
export type RuleType = typeof RULE_TYPES[number];

const SEEDS: Record<RuleType, object[]> = {
  arg_keyword: [
    { keyword:"海は削れている", description:"ARGの核心フレーズ", phase:"1", severity:"critical" },
    { keyword:"海蝕プロジェクト", description:"プロジェクト名", phase:"1", severity:"high" },
    { keyword:"収束", description:"収束現象に関する言及", phase:"1", severity:"medium" },
    { keyword:"西堂", description:"人物名", phase:"2", severity:"high" },
    { keyword:"次元", description:"次元関連の言及", phase:"2", severity:"medium" },
    { keyword:"監視されている", description:"監視への言及", phase:"1", severity:"medium" },
    { keyword:"封印", description:"封印に関する言及", phase:"2", severity:"high" },
    { keyword:"観測者は存在しない", description:"存在否定フレーズ", phase:"3", severity:"critical" },
    { keyword:"記憶", description:"記憶の改ざん等", phase:"2", severity:"low" },
    { keyword:"境界", description:"境界接触の言及", phase:"2", severity:"medium" },
    { keyword:"消滅", description:"消滅への言及", phase:"3", severity:"critical" },
  ],
  known_flag: [
    { key:"first_login_done", label:"初回ログイン完了", phase:"0", description:"初回ログインが確認された", category:"system" },
    { key:"tutorial_complete", label:"チュートリアル完了", phase:"0", description:"基本操作の習得", category:"system" },
    { key:"division_joined", label:"部署配属済み", phase:"1", description:"いずれかの部署に所属", category:"progress" },
    { key:"phase1_unlocked", label:"フェーズ1解放", phase:"1", description:"第一フェーズのコンテンツ解放", category:"story" },
    { key:"phase2_unlocked", label:"フェーズ2解放", phase:"2", description:"第二フェーズのコンテンツ解放", category:"story" },
    { key:"anomaly_detected", label:"異常検知済み", phase:"2", description:"プレイヤーが異常を認識", category:"story" },
    { key:"observer_warned", label:"観測者警告受信", phase:"3", description:"観測者からの警告を受けた", category:"story" },
    { key:"collapse_imminent", label:"崩壊カウントダウン", phase:"3", description:"崩壊イベント直前フラグ", category:"story" },
    { key:"level2_unlocked", label:"LV2解放フラグ", phase:"1", description:"クリアランスLV2到達", category:"system" },
    { key:"level3_unlocked", label:"LV3解放フラグ", phase:"2", description:"クリアランスLV3到達", category:"system" },
    { key:"level4_unlocked", label:"LV4解放フラグ", phase:"3", description:"クリアランスLV4到達", category:"system" },
    { key:"streak_3days_done", label:"3日連続達成", phase:"0", description:"3日連続ログイン", category:"achievement" },
    { key:"streak_7days_done", label:"7日連続達成", phase:"0", description:"7日連続ログイン", category:"achievement" },
  ],
  incident_lifecycle: [
    { name:"古いインシデント自動クローズ", conditionType:"age_days", conditionValue:30, fromStatus:"調査中", toStatus:"終息", newSeverity:"", notifyAdmin:false },
    { name:"未解決→高リスク自動エスカレーション", conditionType:"age_days", conditionValue:14, fromStatus:"調査中", toStatus:"調査中", newSeverity:"high", notifyAdmin:true },
    { name:"GSI超過で緊急化", conditionType:"gsi_threshold", conditionValue:80, fromStatus:"", toStatus:"", newSeverity:"critical", notifyAdmin:true },
  ],
  novel_rule: [
    { name:"フェーズ2コンテンツ制限", applyTo:"category", applyValue:"phase2", operator:"AND", conditions:[{type:"flag", key:"phase2_unlocked", value:"true"},{type:"level", minLevel:2}] },
    { name:"フェーズ3機密文書", applyTo:"category", applyValue:"classified", operator:"AND", conditions:[{type:"level", minLevel:4},{type:"flag", key:"level4_unlocked", value:"true"}] },
    { name:"崩壊前夜レポート", applyTo:"category", applyValue:"collapse", operator:"AND", conditions:[{type:"flag", key:"collapse_imminent", value:"true"}] },
  ],
  xp_rule: [
    { event:"first_login", baseXp:50, onlyFirst:true, maxPerDay:0, multiplier:1.0, conditions:[], priority:0 },
    { event:"profile_view", baseXp:10, onlyFirst:false, maxPerDay:5, multiplier:1.0, conditions:[], priority:0 },
    { event:"chat_message", baseXp:5, onlyFirst:false, maxPerDay:20, multiplier:1.0, conditions:[], priority:0 },
    { event:"division_view", baseXp:20, onlyFirst:false, maxPerDay:3, multiplier:1.0, conditions:[], priority:0 },
    { event:"codex_view", baseXp:30, onlyFirst:false, maxPerDay:3, multiplier:1.0, conditions:[], priority:0 },
    { event:"mission_complete", baseXp:100, onlyFirst:false, maxPerDay:5, multiplier:1.0, conditions:[], priority:0 },
    { event:"daily_login", baseXp:25, onlyFirst:false, maxPerDay:1, multiplier:1.0, conditions:[], priority:0 },
    { event:"location_view", baseXp:15, onlyFirst:false, maxPerDay:5, multiplier:1.0, conditions:[], priority:0 },
    { event:"entity_view", baseXp:15, onlyFirst:false, maxPerDay:5, multiplier:1.0, conditions:[], priority:0 },
    { event:"module_view", baseXp:15, onlyFirst:false, maxPerDay:5, multiplier:1.0, conditions:[], priority:0 },
    { event:"search_use", baseXp:8, onlyFirst:false, maxPerDay:10, multiplier:1.0, conditions:[], priority:0 },
    { event:"bookmark_add", baseXp:5, onlyFirst:false, maxPerDay:5, multiplier:1.0, conditions:[], priority:0 },
  ],
  anomaly_rule: [
    { name:"ARGキーワード発言 +5", triggerType:"keyword", triggerValue:"境界|消滅|封印|収束", delta:5, maxPerDay:3, effectStatusThreshold:0, effectStatusChange:"", notifyAdminThreshold:80, notifyMessage:"異常スコア80超のユーザーを検知" },
    { name:"観測者警告フラグ取得 +10", triggerType:"flag", triggerValue:"observer_warned", delta:10, maxPerDay:1, effectStatusThreshold:0, effectStatusChange:"", notifyAdminThreshold:0, notifyMessage:"" },
    { name:"崩壊フラグ取得 +20", triggerType:"flag", triggerValue:"collapse_imminent", delta:20, maxPerDay:1, effectStatusThreshold:0, effectStatusChange:"", notifyAdminThreshold:70, notifyMessage:"崩壊フラグユーザーの異常スコアが上昇" },
    { name:"スコア50超でステータス変化", triggerType:"score_threshold", triggerValue:"50", delta:0, maxPerDay:0, effectStatusThreshold:50, effectStatusChange:"要観察", notifyAdminThreshold:50, notifyMessage:"異常スコア50超を検知" },
    { name:"スコア90超で緊急マーク", triggerType:"score_threshold", triggerValue:"90", delta:0, maxPerDay:0, effectStatusThreshold:90, effectStatusChange:"要緊急対応", notifyAdminThreshold:90, notifyMessage:"緊急レベルの異常スコアを検知" },
  ],
};

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(db, `CREATE TABLE IF NOT EXISTS rule_engine_entries (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    active     INTEGER NOT NULL DEFAULT 1,
    priority   INTEGER NOT NULL DEFAULT 0,
    data_json  TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

async function seedIfEmpty(db: ReturnType<typeof getDb>, type: RuleType) {
  const rows = await query<{ cnt: number }>(db, "SELECT COUNT(*) as cnt FROM rule_engine_entries WHERE type=?", [type]);
  if (Number(rows[0]?.cnt) > 0) return;
  for (const seed of SEEDS[type]) {
    const id = type.slice(0,3) + "_" + randomBytes(4).toString("hex");
    await execute(db,
      `INSERT INTO rule_engine_entries (id, type, active, priority, data_json) VALUES (?,?,1,0,?)`,
      [id, type, JSON.stringify(seed)]
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const type = new URL(req.url).searchParams.get("type") as RuleType | null;
  if (!type || !RULE_TYPES.includes(type)) return NextResponse.json({ error: "type が必要" }, { status: 400 });
  try {
    const db = getDb();
    await ensureTable(db);
    await seedIfEmpty(db, type);
    const rows = await query<{ id:string; type:string; active:number; priority:number; data_json:string; created_at:string; updated_at:string }>(
      db, "SELECT * FROM rule_engine_entries WHERE type=? ORDER BY priority ASC, created_at ASC", [type]
    );
    return NextResponse.json(rows.map(r => ({ id:r.id, type:r.type, active:r.active===1, priority:r.priority, ...JSON.parse(r.data_json||"{}"), created_at:r.created_at, updated_at:r.updated_at })));
  } catch(err) { console.error("[rule-engine GET]",err); return NextResponse.json({error:"読み込み失敗"},{status:500}); }
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    if (!body.id || !body.type) return NextResponse.json({ error:"id/type が必要" },{status:400});
    // [AE-011] POST でも RULE_TYPES のホワイトリスト検証を行う
    if (!RULE_TYPES.includes(body.type as RuleType)) {
      return NextResponse.json({ error: `type は ${RULE_TYPES.join(" / ")} のいずれかです` }, { status: 400 });
    }
    // [FIX] id フォーマット検証
    if (typeof body.id !== "string" || !/^[\w\-]{1,128}$/.test(body.id)) {
      return NextResponse.json({ error: "id は128文字以内の英数字・ハイフン・アンダースコアにしてください" }, { status: 400 });
    }
    const { id, type, active, priority, created_at, updated_at, ...rest } = body;
    const dataJson = JSON.stringify(rest);
    // [BUG-27 FIX] data_json のサイズ上限（64KB）を設けてloadRulesのパフォーマンス保護
    if (dataJson.length > 65536) {
      return NextResponse.json({ error: "ルールデータが大きすぎます（上限64KB）" }, { status: 400 });
    }
    const db = getDb();
    await ensureTable(db);
    await execute(db,
      `INSERT INTO rule_engine_entries (id,type,active,priority,data_json,updated_at)
       VALUES (?,?,?,?,?,datetime('now'))
       ON CONFLICT(id) DO UPDATE SET type=excluded.type, active=excluded.active,
         priority=excluded.priority, data_json=excluded.data_json, updated_at=excluded.updated_at`,
      [id, type, active?1:0, priority||0, dataJson]
    );
    // [FIX-M09] ルール更新後にキャッシュを即時無効化
    const { invalidateCache } = await import("@/lib/rule-engine");
    invalidateCache(type);
    return NextResponse.json({ ok:true });
  } catch(err) { console.error("[rule-engine POST]",err); return NextResponse.json({error:"保存失敗"},{status:500}); }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({error:"id が必要"},{status:400});
    // [FIX] id フォーマット検証
    if (!/^[\w\-]{1,128}$/.test(id)) {
      return NextResponse.json({ error: "無効な id です" }, { status: 400 });
    }
    const db = getDb();
    // [FIX-M09] 削除対象のルールタイプを取得してキャッシュを無効化
    const ruleRow = await import("@/lib/db").then(({ query: q }) =>
      q<{ type: string }>(db, "SELECT type FROM rule_engine_entries WHERE id=? LIMIT 1", [id])
    ).catch(() => [] as { type: string }[]);
    await execute(db, "DELETE FROM rule_engine_entries WHERE id=?", [id]);
    if (ruleRow[0]?.type) {
      const { invalidateCache } = await import("@/lib/rule-engine");
      invalidateCache(ruleRow[0].type);
    }
    return NextResponse.json({ ok:true });
  } catch { return NextResponse.json({error:"削除失敗"},{status:500}); }
}
