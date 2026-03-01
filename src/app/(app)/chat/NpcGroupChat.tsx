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
}: {
  activeNpcs: Set<string>;
  typingNpcs: Set<string>;
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
          const c = getNpcColor(npc.username);
          return (
            <div key={npc.username} style={{
              padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.6rem",
              transition: "background 0.2s",
              backgroundColor: isTyping ? c.glow : "transparent",
            }}>
              <NpcAvatar username={npc.username} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: c.name, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
                  {npc.username}
                </div>
                <div style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.35)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isTyping ? (
                    <span style={{ color: c?.name, opacity: 0.8 }}>入力中...</span>
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

// ── Main NpcGroupChat ─────────────────────────────────────────────────────

export default function NpcGroupChat({ agentId }: { agentId: string }) {
  const addToast = useNotificationStore((s) => s.addToast);
  const addXp = useUserStore((s) => s.addXp);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingNpcs, setTypingNpcs] = useState<Set<string>>(new Set());
  const [activeNpcs, setActiveNpcs] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: messages = [], mutate } = useSWR<ChatMessage[]>(
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
        apiFetch(`/api/chat/${CHAT_ID}/read`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastMessageId: parseInt(lastId) }),
        }).catch(() => {});
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
          if (!data.responded) return;
          // タイピングインジケーター（UX演出のみ）
          showTyping(data.npc, data.delayMs);
          setTimeout(() => { mutate(); }, data.delayMs + 500);

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
        .npc-group-scroll::-webkit-scrollbar { width: 4px; }
        .npc-group-scroll::-webkit-scrollbar-track { background: transparent; }
        .npc-group-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
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
          backgroundColor: "rgba(0,0,0,0.4)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            backgroundColor: "#50dc78",
            boxShadow: "0 0 8px #50dc78",
            animation: "groupPulse 2s ease-in-out infinite",
          }} />
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", fontWeight: 700, color: "white", letterSpacing: "0.05em" }}>
              NPC グループチャット
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>
              CHANNEL: NPC_GROUP · {NPC_MEMBERS.length} エージェント参加中
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.35rem" }}>
            {NPC_MEMBERS.map(npc => {
              const c = getNpcColor(npc.username);
              return (
                <div key={npc.username} title={npc.username} style={{
                  width: 20, height: 20, borderRadius: "50%",
                  backgroundColor: c.bg,
                  border: `1.5px solid ${c.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.55rem", color: c.name,
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

            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} agentId={agentId} />
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
          <MemberSidebar activeNpcs={activeNpcs} typingNpcs={typingNpcs} />
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
