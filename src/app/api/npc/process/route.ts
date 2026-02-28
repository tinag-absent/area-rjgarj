/**
 * /api/npc/process
 * POST: { chatId, messageText, senderUsername }
 *
 * - global / division_* チャット: 単一NPC返答
 * - npc_group チャット: 複数NPC連鎖返答
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb, execute, query } from "@/lib/db";
import {
  NPC_USERNAMES,
  generateNpcResponse,
  generateGroupResponses,
  randomDelay,
  NPCS,
} from "@/lib/npc-engine";

const NPC_GROUP_CHAT_ID = "npc_group";

// アイドルインデックスをチャットIDごとにメモリ管理
const idleIndexMap: Record<string, number> = {};
// スパム防止: 同一チャット2秒以内は無視
const lastProcessedAt: Record<string, number> = {};

async function insertNpcMessage(chatId: string, npc: (typeof NPCS)[string], text: string) {
  const db = getDb();
  // 直前5秒に同NPCが同チャットに書いていたら重複送信しない
  const recent = await query<{ cnt: number }>(db,
    `SELECT COUNT(*) AS cnt FROM chat_logs
     WHERE chat_id = ? AND user_id = ? AND created_at > datetime('now', '-5 seconds')`,
    [chatId, npc.id]
  );
  if ((recent[0]?.cnt ?? 0) > 0) return;
  await execute(db,
    `INSERT INTO chat_logs (chat_id, user_id, username, message, message_type, created_at)
     VALUES (?, ?, ?, ?, 'npc', datetime('now'))`,
    [chatId, npc.id, npc.username, text]
  );
}

export async function POST(req: NextRequest) {
  const { chatId, messageText, senderUsername } = await req.json().catch(() => ({}));

  if (!chatId || !messageText || !senderUsername) {
    return NextResponse.json({ ok: false, reason: "missing params" }, { status: 400 });
  }
  if (NPC_USERNAMES.has(senderUsername)) {
    return NextResponse.json({ ok: false, reason: "sender is npc" });
  }

  const now = Date.now();
  if (lastProcessedAt[chatId] && now - lastProcessedAt[chatId] < 2000) {
    return NextResponse.json({ ok: false, reason: "too fast" });
  }
  lastProcessedAt[chatId] = now;

  const idleIndex = idleIndexMap[chatId] ?? 0;

  // ── グループチャット: 複数NPC返答 ─────────────────────────────────────
  if (chatId === NPC_GROUP_CHAT_ID) {
    const { responses, nextIdleIndex, triggered } = generateGroupResponses(messageText, idleIndex);
    idleIndexMap[chatId] = nextIdleIndex;

    if (responses.length === 0) {
      return NextResponse.json({ ok: true, responded: false });
    }

    // 全返答をスケジュール（それぞれ独立した遅延）
    for (const r of responses) {
      setTimeout(async () => {
        try { await insertNpcMessage(chatId, r.npc, r.text); }
        catch (err) { console.error("[npc/process group]", err); }
      }, r.delayMs);
    }

    // フロントには先頭の返答情報を返す（タイピングインジケーター用）
    const first = responses[0];
    const maxDelay = Math.max(...responses.map(r => r.delayMs));
    return NextResponse.json({
      ok: true, responded: true, triggered,
      npc: first.npc.username,
      delayMs: Math.round(first.delayMs),
      totalResponses: responses.length,
      maxDelayMs: Math.round(maxDelay),
    });
  }

  // ── 通常チャット: 単一NPC返答 ─────────────────────────────────────────
  const { npc, text, nextIdleIndex: nextIdle, triggered } = generateNpcResponse(messageText, idleIndex);
  idleIndexMap[chatId] = nextIdle;

  if (!text) {
    return NextResponse.json({ ok: true, responded: false });
  }

  const delay = randomDelay(npc);
  setTimeout(async () => {
    try { await insertNpcMessage(chatId, npc, text); }
    catch (err) { console.error("[npc/process]", err); }
  }, delay);

  return NextResponse.json({
    ok: true, responded: true, triggered,
    npc: npc.username,
    delayMs: Math.round(delay),
  });
}

export async function GET() {
  return NextResponse.json(
    Object.values(NPCS).map(n => ({
      username: n.username,
      displayName: n.displayName,
      division: n.division,
      personality: n.personality,
    }))
  );
}

