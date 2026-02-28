"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: string;
  timestamp: string;
}

interface Player {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
  clearance_level: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

function DmThread({ agentId }: { agentId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], mutate } = useSWR<ChatMessage[]>(
    `/api/admin/dm/${agentId}`,
    fetcher,
    { refreshInterval: 4000 }
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/dm/${agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        setText("");
        mutate();
        inputRef.current?.focus();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid rgba(255,80,80,0.15)",
        backgroundColor: "rgba(255,80,80,0.04)", flexShrink: 0,
      }}>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#ff5050", fontWeight: 700 }}>
          ⚑ {agentId} との通信
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: "rgba(255,80,80,0.5)", marginTop: "2px" }}>
          CHANNEL: DM_ADMIN_{agentId.toUpperCase()} · 管理者送信
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.2)" }}>
            まだメッセージはありません
          </div>
        )}
        {messages.map(msg => {
          const isAdmin = msg.type === "admin";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-end" : "flex-start", gap: "0.25rem" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.6rem", color: isAdmin ? "#ff5050" : "rgba(0,255,255,0.5)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {isAdmin && <span>⚑</span>}
                <span style={{ fontWeight: 600 }}>{msg.senderName}</span>
                {isAdmin && (
                  <span style={{ fontSize: "0.5rem", padding: "0.1rem 0.3rem", background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)", color: "#ff5050" }}>
                    ADMIN
                  </span>
                )}
                <span style={{ opacity: 0.5 }}>· {new Date(msg.timestamp).toLocaleTimeString("ja-JP")}</span>
              </div>
              <div style={{
                maxWidth: "72%", padding: "0.625rem 1rem",
                borderRadius: isAdmin ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                backgroundColor: isAdmin ? "rgba(255,80,80,0.06)" : "rgba(0,255,255,0.08)",
                border: `1px solid ${isAdmin ? "rgba(255,80,80,0.25)" : "rgba(0,255,255,0.2)"}`,
                color: "var(--foreground)", fontSize: "0.875rem", lineHeight: 1.6, wordBreak: "break-word",
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,80,80,0.12)", backgroundColor: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
        <form onSubmit={sendMessage} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`${agentId} にメッセージを送る...`}
            maxLength={1000}
            disabled={sending}
            style={{
              flex: 1, backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,80,80,0.2)", borderRadius: "20px",
              padding: "0.5rem 1rem", color: "var(--foreground)", fontSize: "0.875rem", outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: text.trim() ? "rgba(255,80,80,0.1)" : "transparent",
              border: `1px solid ${text.trim() ? "rgba(255,80,80,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "20px",
              color: text.trim() ? "#ff5050" : "rgba(255,255,255,0.3)",
              fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem",
              cursor: sending || !text.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
          >
            {sending ? "..." : "送信"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminDmPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: players = [] } = useSWR<Player[]>(
    "/api/admin/users?limit=200",
    fetcher,
    { refreshInterval: 30000 }
  );

  const filtered = players.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase()) ||
    (p.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", gap: 0 }}>
      {/* Player list */}
      <div style={{
        width: "280px", flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        backgroundColor: "rgba(0,0,0,0.2)",
      }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.8rem", color: "#ff5050", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "0.1em" }}>
            ✉ ユーザーDM
          </h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="エージェントIDを検索..."
            style={{
              width: "100%", padding: "0.4rem 0.75rem",
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px", color: "var(--foreground)",
              fontSize: "0.8rem", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.filter(p => p.role === "player").map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedAgentId(p.username)}
              style={{
                width: "100%", padding: "0.75rem 1rem",
                display: "flex", flexDirection: "column", gap: "0.2rem",
                backgroundColor: selectedAgentId === p.username ? "rgba(255,80,80,0.08)" : "transparent",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                borderLeft: selectedAgentId === p.username ? "2px solid #ff5050" : "2px solid transparent",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              }}
            >
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: selectedAgentId === p.username ? "#ff5050" : "var(--foreground)", fontWeight: 600 }}>
                {p.username}
              </span>
              {p.display_name && (
                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>
                  {p.display_name}
                </span>
              )}
              <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", fontFamily: "JetBrains Mono, monospace" }}>
                LV{p.clearance_level} · {p.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DM thread */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selectedAgentId ? (
          <DmThread agentId={selectedAgentId} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ fontSize: "2rem", opacity: 0.3 }}>✉</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
              左のリストからユーザーを選択してください
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
