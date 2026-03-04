/**
 * /api/npc/process — NPCスクリプト分岐処理 + ストーリーエンジン統合
 * POST: { chatId, text }
 *
 * データモデル:
 *   ScriptStep  = ノード { id, label, branches[] }
 *   StepBranch  = { id, keywords[], response, nextStepId, conditions, effects }
 *   conditions  = { requireFlag?, minXp? }
 *   effects     = { setFlag?, fireEvent?, grantXp?, notify? }
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { getDb, query, execute } from "@/lib/db";
import { ALLOWED_CHAT_CHANNELS } from "@/lib/constants";
import { NPCS } from "@/lib/npc-engine";
import { loadRules } from "@/lib/rule-engine";

interface AnomalyFlagRule {
  id: string; triggerType: "flag"; triggerValue: string; delta: number; maxPerDay: number;
  effectStatusThreshold: number; effectStatusChange: string;
}

async function applyFlagAnomalyRules(db: ReturnType<typeof getDb>, userId: string, flagKey: string) {
  try {
    const rules = await loadRules<AnomalyFlagRule>("anomaly_rule");
    const flagRules = rules.filter(r => r.triggerType === "flag" && r.triggerValue === flagKey && r.delta !== 0);
    if (!flagRules.length) return;
    let totalDelta = 0;
    for (const rule of flagRules) {
      totalDelta += rule.delta;
    }
    if (totalDelta !== 0) {
      await execute(db,
        `UPDATE users SET anomaly_score = MAX(0, MIN(100, anomaly_score + ?)) WHERE id=?`,
        [totalDelta, userId]
      ).catch(() => {});
      // threshold check
      const thresholdRules = rules.filter(r => r.triggerType === "score_threshold" && r.effectStatusThreshold > 0 && r.effectStatusChange);
      if (thresholdRules.length) {
        const rows = await query<{ anomaly_score: number }>(db,
          "SELECT anomaly_score FROM users WHERE id=?", [userId]
        ).catch(() => [] as { anomaly_score: number }[]);
        const score = rows[0]?.anomaly_score || 0;
        for (const tr of thresholdRules.sort((a,b) => b.effectStatusThreshold - a.effectStatusThreshold)) {
          if (score >= tr.effectStatusThreshold && tr.effectStatusChange) {
            await execute(db, "UPDATE users SET status=? WHERE id=?", [tr.effectStatusChange, userId]).catch(()=>{});
            break;
          }
        }
      }
    }
  } catch { /* non-critical */ }
}

interface BranchConditions {
  requireFlag?: { key: string; value: string };
  minXp?: number;
}
interface BranchEffects {
  setFlag?: { key: string; value: string };
  fireEvent?: string;
  grantXp?: number;
  notify?: { type: string; title: string; body: string };
}
interface StepBranch {
  id: string;
  keywords: string[];
  response: string;
  nextStepId: string | null;
  conditions: BranchConditions;
  effects: BranchEffects;
}
interface ScriptStep {
  id: string;
  label: string;
  branches: StepBranch[];
}
interface NpcScript {
  id: string;
  npc_key: string;
  entryStepId: string;
  steps: ScriptStep[];
}

// ── 状態管理（メモリ, 30分TTL） ────────────────────────────────────────────
interface ConvState { scriptId: string; stepId: string; ts: number; }
const CONV_STATE = new Map<string, ConvState>();
const STATE_TTL  = 30 * 60 * 1000;

function convKey(chatId: string, userId: string) { return `${chatId}:${userId}`; }

function getState(chatId: string, userId: string): ConvState | null {
  const s = CONV_STATE.get(convKey(chatId, userId));
  if (!s) return null;
  if (Date.now() - s.ts > STATE_TTL) { CONV_STATE.delete(convKey(chatId, userId)); return null; }
  return s;
}

function setState(chatId: string, userId: string, scriptId: string, stepId: string | null) {
  if (!stepId) { CONV_STATE.delete(convKey(chatId, userId)); return; }
  CONV_STATE.set(convKey(chatId, userId), { scriptId, stepId, ts: Date.now() });
}

// ── スクリプトキャッシュ ────────────────────────────────────────────────────
let scriptCache: NpcScript[] = [];
let cachedAt = 0;

async function loadScripts(db: ReturnType<typeof getDb>): Promise<NpcScript[]> {
  if (Date.now() - cachedAt < 60_000) return scriptCache;
  try {
    const rows = await query<{
      id: string; npc_key: string; entry_step_id: string; steps_json: string;
    }>(db, "SELECT id, npc_key, entry_step_id, steps_json FROM npc_scripts WHERE active = 1");
    scriptCache = rows.map(r => ({
      id: r.id, npc_key: r.npc_key, entryStepId: r.entry_step_id,
      steps: JSON.parse(r.steps_json || "[]") as ScriptStep[],
    }));
    cachedAt = Date.now();
  } catch { /* table not yet created */ }
  return scriptCache;
}

// ── 条件チェック ────────────────────────────────────────────────────────────
async function checkConditions(
  db: ReturnType<typeof getDb>, userId: string, cond: BranchConditions
): Promise<boolean> {
  if (!cond) return true;
  if (cond.requireFlag?.key) {
    const rows = await query<{ flag_value: string }>(db,
      "SELECT flag_value FROM progress_flags WHERE user_id = ? AND flag_key = ? LIMIT 1",
      [userId, cond.requireFlag.key]
    ).catch(() => [] as { flag_value: string }[]);
    if (!rows.length) return false;
    if (cond.requireFlag.value && rows[0].flag_value !== cond.requireFlag.value) return false;
  }
  if (cond.minXp !== undefined && cond.minXp > 0) {
    const rows = await query<{ var_value: number }>(db,
      "SELECT var_value FROM story_variables WHERE user_id = ? AND var_key = 'total_xp' LIMIT 1",
      [userId]
    ).catch(() => [] as { var_value: number }[]);
    const xp = rows[0]?.var_value ?? 0;
    if (xp < cond.minXp) return false;
  }
  return true;
}

// ── エフェクト実行 ──────────────────────────────────────────────────────────
async function applyEffects(
  db: ReturnType<typeof getDb>, userId: string, effects: BranchEffects
) {
  if (!effects) return;
  if (effects.setFlag?.key) {
    await execute(db,
      `INSERT INTO progress_flags (user_id, flag_key, flag_value, set_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (user_id, flag_key) DO UPDATE SET flag_value = excluded.flag_value`,
      [userId, effects.setFlag.key, effects.setFlag.value ?? "true"]
    ).catch(() => {});
    // ⑥ フラグ取得時に異常スコアルール評価
    applyFlagAnomalyRules(db, userId, effects.setFlag.key).catch(() => {});
  }
  if (effects.grantXp && Number(effects.grantXp) > 0) {
    await execute(db,
      `INSERT INTO story_variables (user_id, var_key, var_value)
       VALUES (?, 'total_xp', ?)
       ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?`,
      [userId, Number(effects.grantXp), Number(effects.grantXp)]
    ).catch(() => {});
  }
  if (effects.fireEvent) {
    await execute(db,
      `INSERT INTO fired_events (user_id, event_id, fired_at)
       VALUES (?, ?, datetime('now')) ON CONFLICT DO NOTHING`,
      [userId, effects.fireEvent]
    ).catch(() => {});
  }
  if (effects.notify?.title) {
    await execute(db,
      `INSERT INTO notifications (user_id, type, title, body, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [userId, effects.notify.type ?? "info", effects.notify.title, effects.notify.body ?? ""]
    ).catch(() => {});
  }
}

// ── POST ────────────────────────────────────────────────────────────────────
// ── エンジンルール読み込み (60s キャッシュ) ───────────────────────
let engineRulesCache: Record<string, { data: Record<string, unknown>[]; at: number }> = {};
async function loadEngineRules(db: ReturnType<typeof getDb>, type: string) {
  const now = Date.now();
  const cached = engineRulesCache[type];
  if (cached && now - cached.at < 60_000) return cached.data;
  const rows = await query<{ id:string; npc_key:string; active:number; data_json:string }>(
    db, "SELECT id, npc_key, active, data_json FROM npc_engine_rules WHERE type=? AND active=1 ORDER BY rowid ASC", [type]
  ).catch(() => [] as { id:string; npc_key:string; active:number; data_json:string }[]);
  const data = rows.map(r => ({ id:r.id, npcKey:r.npc_key, ...JSON.parse(r.data_json||"{}") }));
  engineRulesCache[type] = { data, at: now };
  return data;
}

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── トリガールール評価 ───────────────────────────────────────────
async function evalTriggerRules(db: ReturnType<typeof getDb>, lower: string): Promise<{ npcKey:string; text:string }[]> {
  const rules = await loadEngineRules(db, "trigger");
  const results: { npcKey:string; text:string }[] = [];
  for (const rule of rules) {
    const keywords: string[] = Array.isArray(rule.keywords) ? rule.keywords : [];
    if (!keywords.some(kw => lower.includes(String(kw).toLowerCase()))) continue;
    const responses: string[] = Array.isArray(rule.responses) ? rule.responses : [];
    const picked = pickRandom(responses);
    if (picked && rule.npcKey && NPCS[rule.npcKey as string]) {
      results.push({ npcKey: rule.npcKey as string, text: picked });
    }
  }
  return results;
}

// ── アイドルルール評価（マッチなし時の独り言）───────────────────
async function evalIdleRules(db: ReturnType<typeof getDb>): Promise<{ npcKey:string; text:string }[]> {
  const rules = await loadEngineRules(db, "idle");
  if (!rules.length || Math.random() > 0.3) return []; // 30%確率で発言
  const active = rules.filter(r => NPCS[r.npcKey as string]);
  const rule = pickRandom(active);
  if (!rule) return [];
  const texts: string[] = Array.isArray(rule.messages) ? rule.messages : rule.text ? [rule.text as string] : [];
  const picked = pickRandom(texts);
  return picked ? [{ npcKey: rule.npcKey as string, text: picked }] : [];
}

// ── NPC連鎖反応評価 ──────────────────────────────────────────────
async function evalReactionRules(db: ReturnType<typeof getDb>, firstNpcKey: string): Promise<{ npcKey:string; text:string }[]> {
  const rules = await loadEngineRules(db, "reaction");
  const results: { npcKey:string; text:string }[] = [];
  for (const rule of rules) {
    if ((rule.sourceNpcKey as string) !== firstNpcKey) continue;
    const prob = typeof rule.probability === "number" ? rule.probability : 0.3;
    if (Math.random() > prob) continue;
    const reactions: string[] = Array.isArray(rule.reactions) ? rule.reactions : [];
    const picked = pickRandom(reactions);
    const reactingKey = rule.reactingNpcKey as string;
    if (picked && reactingKey && NPCS[reactingKey]) {
      results.push({ npcKey: reactingKey, text: picked });
    }
  }
  return results;
}

// ── 条件放送評価 ─────────────────────────────────────────────────
async function evalConditionRules(
  db: ReturnType<typeof getDb>, userId: string, userLevel: number
): Promise<{ npcKey:string; text:string }[]> {
  const rules = await loadEngineRules(db, "condition");
  if (!rules.length) return [];
  const flagRows = await query<{ flag_key:string; flag_value:string }>(db,
    "SELECT flag_key, flag_value FROM progress_flags WHERE user_id=?", [userId]
  ).catch(() => [] as { flag_key:string; flag_value:string }[]);
  const flags: Record<string,string> = {};
  flagRows.forEach(f => { flags[f.flag_key] = f.flag_value; });
  const xpRows = await query<{ v:number }>(db,
    "SELECT var_value as v FROM story_variables WHERE user_id=? AND var_key='total_xp'", [userId]
  ).catch(() => [] as { v:number }[]);
  const totalXp = xpRows[0]?.v || 0;
  const results: { npcKey:string; text:string }[] = [];
  for (const rule of rules) {
    const ct = rule.conditionType as string;
    let condMet = false;
    if (ct === "flag") condMet = flags[rule.flagKey as string] === (rule.flagValue as string || "true");
    else if (ct === "xp") condMet = totalXp >= (rule.minXp as number || 0);
    else if (ct === "level") condMet = userLevel >= (rule.minLevel as number || 1);
    if (!condMet) continue;
    const npcKey = rule.npcKey as string;
    const message = rule.message as string;
    if (message && npcKey && NPCS[npcKey]) {
      results.push({ npcKey, text: message });
      // oneShot: このユーザーには一度だけ → fired_events に記録
      if (rule.oneShot) {
        const evtId = `condition_msg:${rule.id}`;
        await execute(db,
          `INSERT INTO fired_events (user_id, event_id, fired_at) VALUES (?,?,datetime('now')) ON CONFLICT DO NOTHING`,
          [userId, evtId]
        ).catch(() => {});
      }
    }
  }
  return results;
}

// ── 多段放送評価（キーワードトリガー） ──────────────────────────
async function evalBroadcastRules(
  db: ReturnType<typeof getDb>, lower: string, userId: string
): Promise<{ npcKey:string; text:string; delaySeconds:number }[]> {
  const rules = await loadEngineRules(db, "broadcast");
  const results: { npcKey:string; text:string; delaySeconds:number }[] = [];
  for (const rule of rules) {
    if (rule.triggerType !== "keyword") continue;
    const kws: string[] = Array.isArray(rule.keywords) ? rule.keywords : [];
    if (!kws.some(kw => lower.includes(String(kw).toLowerCase()))) continue;
    // 発火済みチェック（多段放送は一度だけ起動）
    const evtId = `broadcast:${rule.id}`;
    const fired = await query<{ cnt:number }>(db,
      "SELECT COUNT(*) as cnt FROM fired_events WHERE user_id=? AND event_id=?", [userId, evtId]
    ).catch(() => [] as { cnt:number }[]);
    if ((fired[0]?.cnt||0) > 0) continue;
    await execute(db,
      `INSERT INTO fired_events (user_id, event_id, fired_at) VALUES (?,?,datetime('now')) ON CONFLICT DO NOTHING`,
      [userId, evtId]
    ).catch(() => {});
    const sequence: { npcKey:string; text:string; delaySeconds:number }[] = Array.isArray(rule.sequence)
      ? rule.sequence.map((s: { npcKey:string; text:string; delaySeconds?:number }) => ({
          npcKey: s.npcKey, text: s.text, delaySeconds: s.delaySeconds || 0
        }))
      : [];
    results.push(...sequence.filter(s => s.npcKey && s.text && NPCS[s.npcKey]));
  }
  return results;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  let body: { chatId?: string; text?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ responses: [] }); }

  const { chatId, text } = body;
  if (!chatId || !text || !ALLOWED_CHAT_CHANNELS.has(chatId))
    return NextResponse.json({ responses: [] });

  const db = getDb();
  const lower = text.toLowerCase();
  const state = getState(chatId, user.id);
  const results: { npcKey: string; text: string; delaySeconds?: number }[] = [];

  // ── ① 分岐スクリプトエンジン ─────────────────────────────────
  const scripts = await loadScripts(db);
  let scriptMatched = false;

  if (state) {
    const script = scripts.find(s => s.id === state.scriptId);
    if (script) {
      const step = script.steps.find(s => s.id === state.stepId);
      if (step) {
        for (const branch of (step.branches ?? [])) {
          const hit = (branch.keywords ?? []).some(kw => lower.includes(kw.toLowerCase()));
          if (!hit) continue;
          const ok = await checkConditions(db, user.id, branch.conditions ?? {});
          if (!ok) continue;
          await applyEffects(db, user.id, branch.effects ?? {});
          setState(chatId, user.id, state.scriptId, branch.nextStepId ?? null);
          if (branch.response && NPCS[script.npc_key]) {
            results.push({ npcKey: script.npc_key, text: branch.response });
            scriptMatched = true;
          }
          break;
        }
      }
    }
  } else {
    for (const script of scripts) {
      const entryStep = script.steps.find(s => s.id === script.entryStepId);
      if (!entryStep) continue;
      let matched = false;
      for (const branch of (entryStep.branches ?? [])) {
        const hit = (branch.keywords ?? []).some(kw => lower.includes(kw.toLowerCase()));
        if (!hit) continue;
        const ok = await checkConditions(db, user.id, branch.conditions ?? {});
        if (!ok) continue;
        await applyEffects(db, user.id, branch.effects ?? {});
        setState(chatId, user.id, script.id, branch.nextStepId ?? null);
        if (branch.response && NPCS[script.npc_key]) {
          results.push({ npcKey: script.npc_key, text: branch.response });
          scriptMatched = true;
        }
        matched = true;
        break;
      }
      if (matched) break;
    }
  }

  // ── ② トリガールール ──────────────────────────────────────────
  if (!scriptMatched) {
    const triggerResults = await evalTriggerRules(db, lower);
    results.push(...triggerResults);

    // ── ③ NPC連鎖反応（最初に返答したNPCに対して）───────────────
    if (triggerResults.length > 0) {
      const reactions = await evalReactionRules(db, triggerResults[0].npcKey);
      results.push(...reactions);
    }

    // ── ④ アイドル（トリガーも反応もなかった場合）─────────────
    if (results.length === 0) {
      const idles = await evalIdleRules(db);
      results.push(...idles);
    }
  }

  // ── ⑤ 多段放送（キーワードトリガー）────────────────────────
  const broadcasts = await evalBroadcastRules(db, lower, user.id);
  if (broadcasts.length > 0) {
    results.push(...broadcasts);
  }

  // ── ⑥ 条件放送（ユーザー状態ベース）───────────────────────
  // NOTE: oneShotの場合はfired_eventsでフィルタ済みのため1回のみ発火
  const conditionResponses = await evalConditionRules(db, user.id, user.level);
  if (conditionResponses.length > 0 && Math.random() < 0.25) { // チャット時の25%で評価
    results.push(...conditionResponses.slice(0, 1));
  }

  return NextResponse.json({ responses: results });
}
