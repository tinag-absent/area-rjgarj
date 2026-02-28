"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useNotificationStore } from "@/store/notificationStore";
import { useUserStore } from "@/store/userStore";
import { apiFetch } from "@/lib/fetch";

interface ChatMessage {
  id: string; senderId: string; senderName: string;
  text: string; type: string; timestamp: string;
}

const DIVISION_LABELS: Record<string, string> = {
  convergence: "収束部門",
  engineering: "工作部門",
  foreign:     "外事部門",
  port:        "港湾部門",
  support:     "支援部門",
};

// 傍受メッセージプール（anomalyScore > 40 で混入）
const INTERCEPT_MESSAGES = [
  "…聞こえるか？こちらは…",
  "次元境界が…薄れ…",
  "あなたは本物ですか？それとも…",
  "私たちはずっと見ていた",
  "収束は…嘘だ…",
  "[信号干渉: 解読不能]",
  "K-00?-???からの最後の送信…",
  "境界の向こうから通信を試みている",
];

const fetcher = (url: string) => apiFetch(url).then((r) => r.json());

export default function ChatWindow({ agentId }: { agentId: string }) {
  const user = useUserStore((s) => s.user);
  const addToast = useNotificationStore((s) => s.addToast);
  const updateXp = useUserStore((s) => s.updateXp);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeChannel, setActiveChannel] = useState("global");
  const [interceptVisible, setInterceptVisible] = useState(false);
  const [interceptText, setInterceptText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const division = user?.division ?? "";
  const anomalyScore = user?.anomalyScore ?? 0;

  const channels: { id: string; label: string; icon: string }[] = [
    { id: "global", label: "GLOBAL", icon: "◉" },
  ];
  if (division && DIVISION_LABELS[division]) {
    channels.push({ id: `division_${division}`, label: DIVISION_LABELS[division], icon: "▤" });
  }

  const chatId = activeChannel;
  const { data: messages = [], mutate } = useSWR<ChatMessage[]>(
    `/api/chat/${chatId}?limit=50`,
    fetcher,
    { refreshInterval: 5000 }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // 最新メッセージを既読にマーク
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1]?.id;
      if (lastId) {
        apiFetch(`/api/chat/${chatId}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastMessageId: parseInt(lastId) }),
        }).catch(() => {});
      }
    }
  }, [messages, chatId]);

  // 傍受メッセージ演出（anomalyScore > 40）
  useEffect(() => {
    if (anomalyScore <= 40) return;
    const chance = (anomalyScore - 40) / 200; // 40-80で0-20%
    const interval = setInterval(() => {
      if (Math.random() < chance) {
        const msg = INTERCEPT_MESSAGES[Math.floor(Math.random() * INTERCEPT_MESSAGES.length)];
        setInterceptText(msg);
        setInterceptVisible(true);
        setTimeout(() => setInterceptVisible(false), 3000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [anomalyScore]);

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setText("");
        mutate();
        const xpRes = await fetch("/api/users/me/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activity: "chat_message" }),
        });
        if (xpRes.ok) {
          const xpData = await xpRes.json();
          if (xpData.xpGained > 0) {
            addToast({ type: "xp", title: "通信ログ", body: "メッセージを送信しました", xpAmount: xpData.xpGained });
            if (xpData.leveledUp) addToast({ type: "levelup", title: `LEVEL UP → LEVEL ${xpData.newLevel}` });
            if (user) updateXp(xpData.totalXp, xpData.newLevel);
          }
        }
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: "3rem 1.5rem", display: "flex", flexDirection: "column", height: "calc(100vh - 0px)" }}>
      <div className="animate-fadeIn">
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>
          通信ログ
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
          暗号化通信システム
        </p>
      </div>

      {/* Channel tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {channels.map(ch => (
          <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
            className="font-mono"
            style={{
              fontSize: "0.7rem", padding: "0.4rem 1rem",
              backgroundColor: activeChannel === ch.id ? "rgba(0,255,255,0.1)" : "transparent",
              border: `1px solid ${activeChannel === ch.id ? "rgba(0,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
              color: activeChannel === ch.id ? "var(--primary)" : "rgba(255,255,255,0.5)",
              cursor: "pointer", transition: "all 0.2s",
            }}>
            {ch.icon} {ch.label}
          </button>
        ))}
        {!division && (
          <span className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)", alignSelf: "center", marginLeft: "0.5rem" }}>
            部門に所属すると部門専用チャンネルが解放されます
          </span>
        )}
      </div>

      <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", marginBottom: "0.75rem", letterSpacing: "0.1em" }}>
        CHANNEL: {chatId.toUpperCase().replace("DIVISION_", "DIV:")} — 暗号化通信
      </div>

      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, borderColor: "rgba(0,255,255,0.2)", position: "relative" }}>
        {/* 傍受メッセージオーバーレイ */}
        {interceptVisible && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(139,92,246,0.5)",
            padding: "0.75rem 1.25rem", zIndex: 10, pointerEvents: "none",
            fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem",
            color: "#8b5cf6", letterSpacing: "0.1em",
            animation: "fadeIn 0.5s ease",
          }}>
            [傍受信号] {interceptText}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {messages.length === 0 && (
            <div className="font-mono" style={{ textAlign: "center", color: "var(--muted-foreground)", fontSize: "0.875rem", padding: "2rem" }}>
              [通信ログなし]
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderName === agentId;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                <div className="font-mono" style={{ fontSize: "0.625rem", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>
                  {msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString("ja-JP")}
                </div>
                <div
                  style={{
                    maxWidth: "70%",
                    padding: "0.625rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: isMe ? "rgba(0,255,255,0.1)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isMe ? "rgba(0,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: "1rem", borderTop: "1px solid var(--border)" }}>
          <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`${channels.find(c => c.id === activeChannel)?.label ?? "GLOBAL"} にメッセージ...`}
              maxLength={1000}
              disabled={sending}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="btn-primary"
              style={{ whiteSpace: "nowrap", opacity: sending || !text.trim() ? 0.5 : 1 }}
            >
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
