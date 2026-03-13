"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { useNotificationStore } from "@/store/notificationStore";
import { useUserStore } from "@/store/userStore";
import { apiFetch } from "@/lib/fetch";
import {
  NPC_COLORS, NPC_ICONS, NPC_MEMBERS, NPC_USERNAMES,
  getNpcColor, getNpcIcon,
} from "@/lib/npc-config";

const CHAT_ID = "npc_group";

interface ChatMessage {
  id: string; senderId: string; senderName: string;
  text: string; type: string; timestamp: string;
}

const fetcher = (url: string) => apiFetch(url).then(r => r.json());

// ── NPC Avatar ────────────────────────────────────────────────────────────

function NpcAvatar({ username, size = 32 }: { username: string; size?: number }) {
  const c = getNpcColor(username);
  const icon = getNpcIcon(username);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: c.bg,
      border: `1.5px solid ${c.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, color: c.name,
      flexShrink: 0,
      boxShadow: `0 0 ${size * 0.3}px ${c.glow}`,
    }}>
      {icon}
    </div>
  );
}

// ── Member sidebar ────────────────────────────────────────────────────────

function MemberSidebar({
  activeNpcs,
  typingNpcs,
  glitchNpc,
}: {
  activeNpcs: Set<string>;
  typingNpcs: Set<string>;
  glitchNpc: string | null;
}) {
  return (
    <div style={{
      width: "200px", flexShrink: 0,
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      backgroundColor: "rgba(0,0,0,0.2)",
    }}>
      <div style={{
        padding: "0.75rem 1rem",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem",
        color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em",
      }}>
        MEMBERS — {NPC_MEMBERS.length + 1}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
        {/* User (self) */}
        <div style={{ padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            backgroundColor: "rgba(0,255,255,0.08)",
            border: "1.5px solid rgba(0,255,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.7rem", color: "var(--primary)",
            flexShrink: 0,
          }}>◎</div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600 }}>あなた</div>
            <div style={{ fontSize: "0.55rem", color: "rgba(0,255,255,0.5)", marginTop: "1px" }}>接続中</div>
          </div>
          <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#50dc78" }} />
        </div>

        <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "0.25rem 0.75rem" }} />

        {/* NPCs */}
        {NPC_MEMBERS.map(npc => {
          const isTyping = typingNpcs.has(npc.username);
          const isActive = activeNpcs.has(npc.username);
          const isGlitch = glitchNpc === npc.username;
          const c = getNpcColor(npc.username);
          return (
            <div key={npc.username} style={{
              padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.6rem",
              backgroundColor: isTyping ? c.glow : "transparent",
              filter: isGlitch ? "brightness(2) hue-rotate(90deg)" : "none",
              transition: "filter 0.1s, background 0.2s",
            }}>
              <NpcAvatar username={npc.username} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: c.name, fontWeight: 600, fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: isGlitch ? "0.15em" : "0",
                  transition: "letter-spacing 0.1s",
                }}>
                  {isGlitch ? npc.username.split("").reverse().join("") : npc.username}
                </div>
                <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isTyping ? (
                    <span style={{ color: c?.name, opacity: 0.8 }}>入力中...</span>
                  ) : isGlitch ? (
                    <span style={{ color: "rgba(255,0,100,0.7)" }}>///干渉検知///</span>
                  ) : (
                    npc.personality
                  )}
                </div>
              </div>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                backgroundColor: isActive ? c?.dot ?? "#fff" : "rgba(255,255,255,0.15)",
                boxShadow: isActive ? `0 0 6px ${c?.dot ?? "#fff"}` : "none",
                transition: "all 0.3s",
              }} />
            </div>
          );
        })}
      </div>

      {/* Keyword hint */}
      <div style={{
        padding: "0.75rem",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em", lineHeight: 1.6 }}>
          <div style={{ marginBottom: "0.35rem", color: "rgba(255,255,255,0.4)" }}>TRIGGER WORDS</div>
          <div style={{ color: "#00c8ff" }}>K-ECHO: 異常/収束/観測</div>
          <div style={{ color: "#a064ff" }}>N-VEIL: 境界/次元/夢</div>
          <div style={{ color: "#50dc78" }}>L-RIFT: 機器/システム/通信</div>
          <div style={{ color: "#ffb43c" }}>A-PHOS: 疲れ/休憩/辛い</div>
          <div style={{ color: "#a0a0a0" }}>G-MIST: 海/港/霧</div>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────

function MessageBubble({ msg, agentId }: { msg: ChatMessage; agentId: string }) {
  const isMe = msg.senderName === agentId;
  const isNpc = NPC_USERNAMES.has(msg.senderName);
  const c = isNpc ? getNpcColor(msg.senderName) : null;
  const icon = isNpc ? getNpcIcon(msg.senderName) : null;

  if (isMe) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(0,255,255,0.5)" }}>
          {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString("ja-JP")}
        </span>
        <div style={{
          maxWidth: "65%", padding: "0.6rem 0.9rem", borderRadius: "12px 12px 2px 12px",
          backgroundColor: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.25)",
          color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.55, wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  if (isNpc && c) {
    return (
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
        <NpcAvatar username={msg.senderName} size={32} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.65rem", color: c.name, fontWeight: 700 }}>
              {msg.senderName}
            </span>
            <span style={{
              fontSize: "0.5rem", padding: "0.1rem 0.3rem", borderRadius: "2px",
              backgroundColor: `${c.name}15`, border: `1px solid ${c.name}40`, color: c.name,
              letterSpacing: "0.08em",
            }}>NPC</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>
              · {new Date(msg.timestamp).toLocaleTimeString("ja-JP")}
            </span>
          </div>
          <div style={{
            maxWidth: "500px", padding: "0.6rem 0.9rem",
            borderRadius: "2px 12px 12px 12px",
            backgroundColor: c.bg, border: `1px solid ${c.border}`,
            color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.6,
            wordBreak: "break-word", fontStyle: "italic",
            boxShadow: `0 0 12px ${c.glow}`,
          }}>
            {msg.text}
          </div>
        </div>
      </div>
    );
  }

  // その他ユーザー
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)" }}>
        {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString("ja-JP")}
      </span>
      <div style={{
        maxWidth: "65%", padding: "0.6rem 0.9rem", borderRadius: "12px 12px 12px 2px",
        backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.55, wordBreak: "break-word",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

// ── Autonomous NPC behaviors ──────────────────────────────────────────────

// NPCが自律的に時々つぶやくメッセージプール
const AUTONOMOUS_MESSAGES: Record<string, string[]> = {
  "K-ECHO": [
    "…収束指数に微細な変動を検知した。",
    "次元境界モニタリング中。異常なし。",
    "…定期報告。現在の観測値は正常範囲内。",
    "GSI値を継続監視している。",
    "…静寂が続いている。嵐の前触れかもしれない。",
  ],
  "N-VEIL": [
    "…夢と現実の境界が、今日は薄く感じる。",
    "あなたはいま、何を見ている？",
    "…時間というものは、均等には流れない。",
    "存在するということの意味を、また考えていた。",
    "…霧の向こうには、必ず何かがある。",
  ],
  "L-RIFT": [
    "システムステータス: 正常稼働中。",
    "通信ログ確認完了。",
    "…バックアップ処理を実行した。",
    "センサー類: 全系統グリーン。",
    "定期メンテナンス: スケジュール通り。",
  ],
  "A-PHOS": [
    "みなさん、今日もお疲れさまです。",
    "…無理していないか、心配しています。",
    "休憩は取れていますか？",
    "…困ったことがあれば、いつでも声をかけてください。",
    "今日の気温差が大きいです。体に気をつけて。",
  ],
  "G-MIST": [
    "…港に、霧が出てきた。",
    "波の音が、いつもと違う。",
    "…海は、何かを知っている。",
    "今夜は船が少ない。",
    "…沖の方に、光が見えた気がした。",
  ],
};

// ── Main NpcGroupChat ─────────────────────────────────────────────────────

export default function NpcGroupChat({ agentId }: { agentId: string }) {
  const addToast = useNotificationStore((s) => s.addToast);
  const addXp = useUserStore((s) => s.addXp);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingNpcs, setTypingNpcs] = useState<Set<string>>(new Set());
  const [activeNpcs, setActiveNpcs] = useState<Set<string>>(new Set());
  const [connectionPulse, setConnectionPulse] = useState(false);
  const [glitchNpc, setGlitchNpc] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const autonomousRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutonomousRef = useRef<Record<string, number>>({});

  const { data: messages = [], mutate, error: chatError } = useSWR<ChatMessage[]>(
    `/api/chat/${CHAT_ID}?limit=80`,
    fetcher,
    { refreshInterval: 3000 }
  );

  // 最後にアクティブだったNPCを追跡
  useEffect(() => {
    const names = new Set(
      messages.filter(m => NPC_USERNAMES.has(m.senderName)).map(m => m.senderName)
    );
    setActiveNpcs(names);
  }, [messages]);

  // スクロール + 既読
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1]?.id;
      if (lastId) {
        // [O-004] parseInt が NaN になる文字列 ID は送信しない
        const parsedId = parseInt(lastId, 10);
        if (!isNaN(parsedId)) {
          apiFetch(`/api/chat/${CHAT_ID}/read`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastMessageId: parsedId }),
          }).catch(() => {});
        }
      }
    }
  }, [messages]);

  const showTyping = useCallback((npcName: string, durationMs: number) => {
    setTypingNpcs(prev => new Set([...prev, npcName]));
    clearTimeout(typingTimers.current[npcName]);
    typingTimers.current[npcName] = setTimeout(() => {
      setTypingNpcs(prev => {
        const next = new Set(prev);
        next.delete(npcName);
        return next;
      });
    }, durationMs);
  }, []);

  // ── 自律的なNPC発言（クライアントサイド演出 + APIで実際に投稿） ──
  const triggerAutonomousNpc = useCallback(() => {
    const npcs = NPC_MEMBERS;
    const now = Date.now();
    // 最近5分以内に喋っていないNPCから選ぶ
    const eligible = npcs.filter(npc => {
      const last = lastAutonomousRef.current[npc.username] ?? 0;
      return now - last > 5 * 60 * 1000;
    });
    if (eligible.length === 0) return;

    const npc = eligible[Math.floor(Math.random() * eligible.length)];
    const pool = AUTONOMOUS_MESSAGES[npc.username] ?? [];
    const msg = pool[Math.floor(Math.random() * pool.length)];
    if (!msg) return;

    lastAutonomousRef.current[npc.username] = now;
    const delay = 1000 + Math.random() * 2000;

    // タイピング演出
    showTyping(npc.username, delay);

    // [O-005/Q-002] /api/npc/post は管理者権限が必要。
    // ユーザー画面からの自律投稿は行わず、タイピング演出のみ表示する。
    // 実際のNPC自律発言はサーバー側の /api/cron/npc-schedule で行う。
    setTimeout(() => {
      mutate();
    }, delay);
  }, [showTyping, mutate]);

  // 定期的にNPCを自律発言させる（45〜120秒ランダム）
  useEffect(() => {
    const schedule = () => {
      const interval = 45_000 + Math.random() * 75_000;
      autonomousRef.current = setTimeout(() => {
        if (Math.random() < 0.7) triggerAutonomousNpc();
        schedule();
      }, interval);
    };
    // 初回は15〜40秒後に開始
    autonomousRef.current = setTimeout(() => {
      triggerAutonomousNpc();
      schedule();
    }, 15_000 + Math.random() * 25_000);
    return () => {
      if (autonomousRef.current) clearTimeout(autonomousRef.current);
    };
  }, [triggerAutonomousNpc]);

  // 接続パルスアニメーション
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionPulse(true);
      setTimeout(() => setConnectionPulse(false), 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // NPCアバターにランダムグリッチ効果
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.2) {
        const npc = NPC_MEMBERS[Math.floor(Math.random() * NPC_MEMBERS.length)];
        setGlitchNpc(npc.username);
        setTimeout(() => setGlitchNpc(null), 300);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/chat/${CHAT_ID}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const sentText = text;
        setText("");
        mutate();

        // [SECURITY FIX #4] senderUsername はサーバー側でセッションから取得するため送信不要
        apiFetch("/api/npc/process", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: CHAT_ID, messageText: sentText }),
        }).then(r => r.json()).then(data => {
          const responses = data.responses;
          if (!responses || responses.length === 0) return;

          // responses配列の各NPCレスポンスを処理
          responses.forEach((resp: { npcKey: string; text: string; delaySeconds?: number }, idx: number) => {
            const delayMs = (resp.delaySeconds ?? 0) * 1000 + idx * 800;
            showTyping(resp.npcKey, delayMs + 1200);
            // NPC投稿を専用APIに送信
            setTimeout(() => {
              apiFetch(`/api/npc/post`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: CHAT_ID, npcKey: resp.npcKey, text: resp.text }),
              }).then(() => mutate()).catch(() => mutate());
            }, delayMs);
          });

          const totalDelay = (responses[responses.length - 1]?.delaySeconds ?? 0) * 1000 + responses.length * 800;
          setTimeout(() => { mutate(); }, totalDelay + 500);

          // XP
          apiFetch("/api/users/me/xp", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activity: "chat_message" }),
          }).then(r => r.json()).then(xpData => {
            if (xpData.xpGained > 0) {
              addToast({ type: "xp", title: "通信ログ", body: "NPCグループにメッセージ送信", xpAmount: xpData.xpGained });
              if (xpData.leveledUp) addToast({ type: "levelup", title: `LEVEL UP → LEVEL ${xpData.newLevel}` });
              addXp(xpData.xpGained);
            }
          }).catch(() => {});
        }).catch(() => {});
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <style>{`
        @keyframes npcDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes groupPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .npc-group-scroll::-webkit-scrollbar { width: 4px; }
        .npc-group-scroll::-webkit-scrollbar-track { background: transparent; }
        .npc-group-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .npc-msg-enter { animation: fadeInUp 0.3s ease-out forwards; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100%", minHeight: 0,
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px", overflow: "hidden",
        backgroundColor: "rgba(0,0,0,0.3)",
      }}>
        {/* Header */}
        <div style={{
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: "0.75rem",
          flexShrink: 0,
          transition: "background 0.3s",
          backgroundColor: connectionPulse ? "rgba(0,255,100,0.04)" : "rgba(0,0,0,0.4)",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            backgroundColor: connectionPulse ? "#a0ffb0" : "#50dc78",
            boxShadow: connectionPulse ? "0 0 16px #50dc78" : "0 0 8px #50dc78",
            animation: "groupPulse 2s ease-in-out infinite",
            transition: "all 0.3s",
          }} />
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
              NPC グループチャット
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
              CHANNEL: NPC_GROUP · {NPC_MEMBERS.length} エージェント参加中
              {connectionPulse && <span style={{ color: "#50dc78", marginLeft: "0.5rem" }}>● LIVE</span>}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem" }}>
            {NPC_MEMBERS.map(npc => {
              const c = getNpcColor(npc.username);
              const isTypingNow = typingNpcs.has(npc.username);
              return (
                <div key={npc.username} title={npc.username} style={{
                  width: 20, height: 20, borderRadius: "50%",
                  backgroundColor: isTypingNow ? c.name + "30" : c.bg,
                  border: `1.5px solid ${isTypingNow ? c.name : c.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", color: c.name,
                  boxShadow: isTypingNow ? `0 0 8px ${c.name}` : "none",
                  transition: "all 0.3s",
                  animation: isTypingNow ? "groupPulse 0.8s ease-in-out infinite" : "none",
                }}>
                  {getNpcIcon(npc.username)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body: messages + sidebar */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Messages */}
          <div className="npc-group-scroll" style={{
            flex: 1, overflowY: "auto",
            padding: "1rem 1.25rem",
            display: "flex", flexDirection: "column", gap: "1rem",
          }}>
            {/* [FIX NEW-008] チャット取得エラー表示 */}
            {chatError && (
              <div style={{
                padding: "0.6rem 1rem", margin: "0.5rem 0",
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "4px",
                fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem",
                color: "#ef4444",
              }}>
                ⚠ 通信エラー — メッセージの取得に失敗しました。再試行中...
              </div>
            )}
            {/* Welcome */}
            <div style={{
              textAlign: "center", padding: "1.5rem",
              fontFamily: "JetBrains Mono, monospace", fontSize: "0.7rem",
              color: "rgba(255,255,255,0.3)", lineHeight: 1.8,
            }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>⬡</div>
              <div>NPCグループチャットに接続しました</div>
              <div style={{ marginTop: "0.25rem", fontSize: "0.6rem" }}>
                エージェントたちはあなたのメッセージに反応します
              </div>
            </div>

            {messages.map((msg, i) => (
              <div key={msg.id} className="npc-msg-enter" style={{ animationDelay: i === messages.length - 1 ? "0ms" : "0ms", animationFillMode: "both" }}>
                <MessageBubble msg={msg} agentId={agentId} />
              </div>
            ))}

            {/* Typing indicators */}
            {[...typingNpcs].map(npcName => {
              const c = getNpcColor(npcName);
              return (
                <div key={npcName} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-end" }}>
                  <NpcAvatar username={npcName} size={32} />
                  <div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: c.name, marginBottom: "0.3rem" }}>
                      {npcName} が入力中...
                    </div>
                    <div style={{
                      display: "inline-flex", gap: "4px", alignItems: "center",
                      padding: "0.5rem 0.75rem", borderRadius: "2px 12px 12px 12px",
                      backgroundColor: c.bg, border: `1px solid ${c.border}`,
                    }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 5, height: 5, borderRadius: "50%",
                          backgroundColor: c.name, display: "inline-block",
                          animation: `npcDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* NPC member sidebar */}
          <MemberSidebar activeNpcs={activeNpcs} typingNpcs={typingNpcs} glitchNpc={glitchNpc} />
        </div>

        {/* Input */}
        <div style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          backgroundColor: "rgba(0,0,0,0.2)",
        }}>
          <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              backgroundColor: "rgba(0,255,255,0.08)",
              border: "1.5px solid rgba(0,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", color: "var(--primary)",
            }}>◎</div>
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="NPCグループにメッセージを送る..."
              maxLength={1000}
              disabled={sending}
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "20px",
                padding: "0.5rem 1rem",
                color: "var(--foreground)",
                fontSize: "0.875rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              style={{
                padding: "0.5rem 1.25rem",
                backgroundColor: text.trim() ? "rgba(0,255,255,0.12)" : "transparent",
                border: `1px solid ${text.trim() ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "20px",
                color: text.trim() ? "var(--primary)" : "rgba(255,255,255,0.3)",
                fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
                cursor: sending || !text.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s", whiteSpace: "nowrap",
                letterSpacing: "0.05em",
              }}
            >
              {sending ? "..." : "送信"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
