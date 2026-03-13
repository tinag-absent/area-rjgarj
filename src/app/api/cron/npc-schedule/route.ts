/**
 * /api/cron/npc-schedule — NPCスケジュール発言Cronジョブ
 * Vercel Cronで毎時実行（vercel.json: "0 * * * *"）
 * npc_engine_rulesのscheduleタイプのルールを評価してchat_messagesに投稿する
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { NPCS } from "@/lib/npc-engine";

interface ScheduleRule {
  id: string;
  npcKey: string;
  messages: string[];
  probability: number;
  daysOfWeek?: number[]; // 0=日, 1=月, ..., 6=土
  hoursOfDay?: number[];  // 0-23
}

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(req: NextRequest) {
  // [AE-017] CRON_SECRET が未設定の場合も認証を要求（フェイルクローズ）
  // CRON_SECRET が空の場合は誰でも呼び出せてしまうバグを修正
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();
  const posted: string[] = [];

  try {
    // scheduleタイプのNPCエンジンルールを取得
    const rows = await query<{ id: string; npc_key: string; data_json: string }>(
      db,
      "SELECT id, npc_key, data_json FROM npc_engine_rules WHERE type = 'schedule' AND active = 1"
    );

    for (const row of rows) {
      let rule: ScheduleRule;
      try {
        const data = JSON.parse(row.data_json || "{}");
        rule = {
          id: row.id,
          npcKey: row.npc_key,
          messages: Array.isArray(data.messages) ? data.messages : [],
          probability: typeof data.probability === "number" ? data.probability : 0.5,
          daysOfWeek: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : undefined,
          hoursOfDay: Array.isArray(data.hoursOfDay) ? data.hoursOfDay : undefined,
        };
      } catch {
        continue;
      }

      // 曜日・時間フィルタ
      if (rule.daysOfWeek && !rule.daysOfWeek.includes(currentDay)) continue;
      if (rule.hoursOfDay && !rule.hoursOfDay.includes(currentHour)) continue;

      // 確率チェック
      if (Math.random() > rule.probability) continue;

      // NPCが存在するか確認
      if (!NPCS[rule.npcKey]) continue;

      // メッセージをランダムに選択
      const text = pickRandom(rule.messages);
      if (!text) continue;

      // [H-001/H-002] id を crypto.randomUUID() で明示付与（TEXT PRIMARY KEY にNULLを挿入しない）
      const nowSql = now.toISOString().replace("T", " ").slice(0, 19);
      const schedMsgId = crypto.randomUUID();
      await execute(db,
        `INSERT INTO chat_messages (id, chat_id, sender_id, sender_name, text, type, created_at)
         VALUES (?, 'npc_group', ?, ?, ?, 'npc', ?)`,
        [schedMsgId, `npc_${rule.npcKey}`, rule.npcKey, text, nowSql]
      );

      posted.push(`${rule.npcKey}: ${text.slice(0, 30)}...`);
    }

    return NextResponse.json({ success: true, posted: posted.length, messages: posted });
  } catch (err) {
    console.error("[npc-schedule cron]", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
