/**
 * src/app/api/npc/process/route.ts
 *
 * POST /api/npc/process — ユーザーメッセージに対して NPC が応答するか判定し、
 *                         応答する場合はメッセージを DB に保存する。
 *
 * セキュリティ対応:
 * - [SECURITY FIX #4] senderUsername はリクエストボディから取得しない。
 *   認証済みセッションの agentId を使用する（なりすまし防止）。
 * - [SECURITY FIX #6] chatId をホワイトリスト検証
 */
import { NextRequest } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/auth";
import { getDb, execute } from "@/lib/db";
import { ALLOWED_CHAT_CHANNELS } from "@/lib/constants";

// ── NPC 定義 ─────────────────────────────────────────────────────
const NPC_BOTS: Record<string, {
  triggers: string[];
  personality: string;
  division: string;
  responses: string[];
}> = {
  "K-ECHO": {
    triggers: ["異常", "収束", "観測", "次元", "境界"],
    personality: "冷静・分析的",
    division: "収束部門",
    responses: [
      "…異常値を検知した。収束指数が上昇している。",
      "観測データを確認中。次元境界の揺らぎが大きい。",
      "この現象はパターン化されていない。引き続き監視する。",
      "収束処理を優先すべきだ。指示を待て。",
    ],
  },
  "N-VEIL": {
    triggers: ["境界", "次元", "夢", "意識", "現実"],
    personality: "謎めいた・哲学的",
    division: "外事部門",
    responses: [
      "…境界とは、何かが終わり、何かが始まる場所。",
      "この次元に在ることの意味を、あなたは問うたことがあるか？",
      "夢と現実の間に、私たちは立っている。",
      "見えないものこそが、真実に近い。",
    ],
  },
  "L-RIFT": {
    triggers: ["機器", "システム", "通信", "信号", "コード", "エラー"],
    personality: "技術者・簡潔",
    division: "工作部門",
    responses: [
      "システム確認完了。異常なし。",
      "通信品質：82%。許容範囲内。",
      "機器の再起動を推奨する。",
      "エラーコードを転送した。確認しろ。",
    ],
  },
  "A-PHOS": {
    triggers: ["疲れ", "休憩", "辛い", "しんどい", "大変"],
    personality: "温かい・気遣い",
    division: "支援部門",
    responses: [
      "お疲れさまです。無理しないでくださいね。",
      "少し休みましょう。あなたのことが心配です。",
      "大変でしたね。何か力になれることはありますか？",
      "支援部門に来てください。温かいコーヒーを用意しています。",
    ],
  },
  "G-MIST": {
    triggers: ["海", "港", "霧", "船", "波"],
    personality: "不穏・不確か",
    division: "港湾部門",
    responses: [
      "…霧が、濃くなってきた。",
      "港に何かがいる。見えないが、感じる。",
      "波の音が、おかしい。周波数が…",
      "海は、すべてを知っている。",
    ],
  },
};

// 最近の応答を追跡してスパムを防ぐ（インメモリキャッシュ、再起動でリセット）
const RECENT_RESPONSES = new Map<string, number>(); // key: `${npcName}:${chatId}`, value: timestamp
const NPC_COOLDOWN_MS = 30_000; // 30秒のクールダウン

function selectNpc(
  messageText: string,
  chatId: string
): { npc: string; response: string; delayMs: number } | null {
  const lowerText = messageText.toLowerCase();
  const now = Date.now();

  for (const [npcName, npc] of Object.entries(NPC_BOTS)) {
    const cacheKey = `${npcName}:${chatId}`;
    const lastResponse = RECENT_RESPONSES.get(cacheKey) ?? 0;

    // クールダウン中はスキップ
    if (now - lastResponse < NPC_COOLDOWN_MS) continue;

    // トリガーワードが含まれているか確認
    const triggered = npc.triggers.some(t => lowerText.includes(t));
    if (!triggered) continue;

    // 確率的に応答（30%）
    if (Math.random() > 0.3) continue;

    const response = npc.responses[Math.floor(Math.random() * npc.responses.length)];
    const delayMs = 1500 + Math.floor(Math.random() * 2000); // 1.5〜3.5秒の自然な遅延

    RECENT_RESPONSES.set(cacheKey, now);
    return { npc: npcName, response, delayMs };
  }

  return null;
}

export async function POST(request: NextRequest) {
  // [SECURITY FIX #4] セッションからユーザーを取得（リクエストボディの senderUsername は無視）
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  let body: { chatId?: unknown; messageText?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 });
  }

  // chatId のバリデーション
  const chatId = typeof body.chatId === "string" ? body.chatId : "";
  if (!ALLOWED_CHAT_CHANNELS.has(chatId)) {
    return forbidden("無効なチャンネルです");
  }

  const messageText = typeof body.messageText === "string" ? body.messageText : "";
  if (!messageText.trim()) {
    return Response.json({ responded: false });
  }

  // NPC 応答判定
  const result = selectNpc(messageText, chatId);
  if (!result) {
    return Response.json({ responded: false });
  }

  // NPC メッセージを DB に保存
  // NPC の sender_id は固定値（NPC アカウントの ID）を使用する想定。
  // ここでは "system" を使うが、本番では NPC ユーザーの DB レコードを用意すること。
  const db = getDb();
  await execute(
    db,
    `INSERT INTO chat_messages (chat_id, sender_id, sender_name, text, type, created_at)
     VALUES (?, 'system', ?, ?, 'npc', datetime('now', ? || ' seconds'))`,
    [chatId, result.npc, result.response, String(Math.floor(result.delayMs / 1000))]
  );

  return Response.json({
    responded: true,
    npc:       result.npc,
    delayMs:   result.delayMs,
  });
}
