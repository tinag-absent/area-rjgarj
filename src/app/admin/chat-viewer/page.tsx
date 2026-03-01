"use client";
import { apiFetch } from "@/lib/fetch";

import { useEffect, useState, useCallback } from "react";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

const ARG_KEYWORDS = ["海は削れている", "海蝕プロジェクト", "収束", "西堂", "次元", "監視されている", "封印", "観測者は存在しない", "記憶", "境界", "消滅"];
const COLORS = ["#00d4ff", "#00e676", "#ffd740", "#ce93d8", "#ff9800", "#4fc3f7", "#f06292"];

type ConvoMeta = { chatId: string; msgCount: number; lastMsg: string; lastAt: string; participantCount: number };
type Message = { id: string; senderId: string; senderName: string; text: string; type: string; timestamp: string };

export default function ChatViewerPage() {
  const [convos, setConvos] = useState<ConvoMeta[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);

  const colorMap: Record<string, string> = {};
  let colorIdx = 0;
  const getUserColor = (id: string) => {
    if (!colorMap[id]) colorMap[id] = COLORS[colorIdx++ % COLORS.length];
    return colorMap[id];
  };

  const showToast = (msg: string, type = "") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadConvos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/chats");
      const data = await res.json();
      setConvos(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  const selectChat = async (chatId: string) => {
    setSelectedChat(chatId);
    try {
      const res = await apiFetch(`/api/admin/chats/${chatId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch { showToast("メッセージ取得失敗", "err"); }
  };

  const deleteConvo = async () => {
    if (!selectedChat || !confirm(`会話 "${selectedChat}" を削除しますか？`)) return;
    try {
      await apiFetch(`/api/admin/chats/${selectedChat}`, { method: "DELETE" });
      showToast("削除しました", "warn");
      setSelectedChat(null);
      setMessages([]);
      await loadConvos();
    } catch { showToast("削除失敗", "err"); }
  };

  const exportConvo = () => {
    if (!selectedChat) return;
    const blob = new Blob([JSON.stringify({ chatId: selectedChat, messages }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `chat-${selectedChat}.json`; a.click();
  };

  const filteredMsgs = filter ? messages.filter(m => m.text.toLowerCase().includes(filter.toLowerCase()) || m.senderName.toLowerCase().includes(filter.toLowerCase())) : messages;

  const stats = {
    total: convos.reduce((s, c) => s + c.msgCount, 0),
    convos: convos.length,
    keywords: messages.filter(m => ARG_KEYWORDS.some(k => m.text.includes(k))).length,
    users: new Set(messages.map(m => m.senderId)).size,
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg }}>
      {/* Conversation list */}
      <div style={{ width: 260, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: S.mono, fontSize: 11, color: S.purple, letterSpacing: ".1em" }}>会話一覧</span>
          <button onClick={loadConvos} style={{ background: "none", border: "none", color: S.text3, fontFamily: S.mono, fontSize: 10, cursor: "pointer" }}>⟳</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? <div style={{ padding: 20, fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>読み込み中...</div> :
            convos.map(c => {
              const hasArg = ARG_KEYWORDS.some(k => c.lastMsg?.includes(k));
              return (
                <div key={c.chatId} onClick={() => selectChat(c.chatId)}
                  style={{ padding: "11px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer", background: selectedChat === c.chatId ? "#12081e" : "transparent", borderLeft: selectedChat === c.chatId ? `2px solid ${S.purple}` : "2px solid transparent" }}>
                  <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 3 }}>
                    {c.chatId} {hasArg && <span style={{ color: S.yellow }}>★ARG</span>}
                  </div>
                  <div style={{ fontSize: 11, color: S.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>
                    {c.lastMsg || "(メッセージなし)"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{c.msgCount}件</span>
                    <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{c.lastAt ? new Date(c.lastAt).toLocaleDateString("ja-JP") : "—"}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Message pane */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Stats */}
        <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, padding: "8px 18px", display: "flex", gap: 22, flexShrink: 0 }}>
          {[{ label: "総メッセージ", value: stats.total }, { label: "会話数", value: stats.convos }, { label: "ARGキーワード", value: stats.keywords }, { label: "参加ユーザー", value: stats.users }].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: S.mono, fontSize: 15, color: S.cyan }}>{s.value}</div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ background: S.panel, borderBottom: `1px solid ${S.border}`, padding: "8px 18px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="キーワード検索..."
            style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "5px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", width: 180 }} />
          {filter && <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{filteredMsgs.length}件</span>}
          <div style={{ flex: 1 }} />
          {selectedChat && <>
            <button onClick={exportConvo} style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>↓ エクスポート</button>
            <button onClick={deleteConvo} style={{ background: "none", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>✕ 会話を削除</button>
          </>}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {!selectedChat ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: S.text3 }}>
              <div style={{ fontFamily: S.mono, fontSize: 32, opacity: .3 }}>[ CHAT ]</div>
              <p style={{ fontFamily: S.mono, fontSize: 11 }}>左の会話を選択してください</p>
            </div>
          ) : filteredMsgs.length === 0 ? (
            <div style={{ textAlign: "center", fontFamily: S.mono, fontSize: 11, color: S.text3, padding: 24 }}>メッセージなし</div>
          ) : filteredMsgs.map(msg => {
            const col = getUserColor(msg.senderId);
            const argMatches = ARG_KEYWORDS.filter(k => msg.text.includes(k));
            return (
              <div key={msg.id} style={{ display: "flex", gap: 10, maxWidth: "80%" }}>
                <div style={{ width: 30, height: 30, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, fontSize: 10, fontWeight: "bold", background: `${col}22`, color: col, flexShrink: 0, alignSelf: "flex-start" }}>
                  {(msg.senderName || "?").charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontFamily: S.mono, fontSize: 11, fontWeight: "bold", color: col }}>{msg.senderName}</span>
                    <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{new Date(msg.timestamp).toLocaleString("ja-JP")}</span>
                  </div>
                  <div style={{ background: S.panel2, border: `1px solid ${S.border}`, padding: "8px 12px", fontSize: 12, lineHeight: 1.6, color: S.text }}>
                    {msg.text}
                  </div>
                  {argMatches.length > 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,215,64,.05)", border: `1px solid ${S.yellow}`, color: S.yellow, fontFamily: S.mono, fontSize: 9, padding: "2px 6px", marginTop: 4 }}>
                      ★ ARG: {argMatches.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: S.panel, border: `1px solid ${toast.type === "err" ? S.red : toast.type === "warn" ? S.yellow : S.purple}`, color: toast.type === "err" ? S.red : toast.type === "warn" ? S.yellow : S.purple, fontFamily: S.mono, fontSize: 11, padding: "10px 16px", zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
