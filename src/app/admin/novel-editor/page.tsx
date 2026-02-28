"use client";

import { useEffect, useState, useCallback } from "react";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

type Novel = {
  id: string; title: string; subtitle?: string; author?: string; date?: string;
  category?: string; tags?: string[]; summary?: string; content?: string;
  requiredLevel?: number; status?: string;
  publishAt?: string;       // ISO日時: この日時以降に公開
  requiredFlag?: string;    // このフラグを持つユーザーのみ表示
};

export default function NovelEditorPage() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selected, setSelected] = useState<Novel | null>(null);
  const [editing, setEditing] = useState<Novel | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/novels");
      const data = await res.json();
      if (res.ok && Array.isArray(data.novels) && data.novels.length > 0) {
        setNovels(data.novels);
      } else {
        const fallback = await fetch("/data/novels-data.json");
        const fd = await fallback.json();
        setNovels(fd.novels || []);
      }
    } catch {
      try {
        const fallback = await fetch("/data/novels-data.json");
        const fd = await fallback.json();
        setNovels(fd.novels || []);
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectNovel = (n: Novel) => {
    setSelected(n);
    setEditing({ ...n });
  };

  const saveEditing = async () => {
    if (!editing || !selected) return;
    const updated = novels.map(n => n.id === selected.id ? editing : n);
    setNovels(updated);
    setSelected(editing);
    try {
      const res = await fetch("/api/admin/novels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novels: updated }),
      });
      const data = await res.json();
      showToast(res.ok ? "✓ DBに保存しました" : `✕ ${data.error || "保存失敗"}`);
    } catch {
      showToast("✕ 通信エラー");
    }
  };

  const saveAll = async () => {
    try {
      const res = await fetch("/api/admin/novels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novels }),
      });
      const data = await res.json();
      showToast(res.ok ? `✓ ${data.count}件をDBに保存しました` : `✕ ${data.error || "保存失敗"}`);
    } catch {
      showToast("✕ 通信エラー");
    }
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ novels }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "novels-data.json"; a.click();
    showToast("novels-data.json をエクスポートしました");
  };

  const filtered = search ? novels.filter(n => n.title.includes(search) || n.category?.includes(search) || n.tags?.some(t => t.includes(search))) : novels;

  const FieldEdit = ({ label, field, type = "text" }: { label: string; field: keyof Novel; type?: string }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} value={String(editing?.[field] || "")} onChange={e => setEditing(prev => prev ? { ...prev, [field]: type === "number" ? Number(e.target.value) : e.target.value } : null)}
        style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 12, outline: "none" }} />
    </div>
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.cyan, boxShadow: `0 0 6px ${S.cyan}` }} />
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.cyan, letterSpacing: ".12em", flex: 1 }}>記録文庫エディタ</span>
          <button onClick={saveAll} style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 9, padding: "3px 8px", cursor: "pointer" }}>▶ 保存</button>
        </div>
        <div style={{ padding: 10, borderBottom: `1px solid ${S.border}` }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="タイトル / タグ検索..."
            style={{ width: "100%", background: S.bg, border: `1px solid ${S.border2}`, color: S.text, padding: "6px 10px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? <div style={{ padding: 20, fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>読み込み中...</div> :
            filtered.map(n => (
              <div key={n.id} onClick={() => selectNovel(n)}
                style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer", background: selected?.id === n.id ? "#0a1828" : "transparent", borderLeft: selected?.id === n.id ? `2px solid ${S.cyan}` : "2px solid transparent" }}>
                <div style={{ fontSize: 12, color: S.text, marginBottom: 3, lineHeight: 1.4 }}>{n.title}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {n.category && <span style={{ fontFamily: S.mono, fontSize: 9, padding: "1px 5px", border: `1px solid ${S.border2}`, color: S.text3 }}>{n.category}</span>}
                  {n.requiredLevel !== undefined && <span style={{ fontFamily: S.mono, fontSize: 9, padding: "1px 5px", border: `1px solid ${S.yellow}`, color: S.yellow }}>LV{n.requiredLevel}</span>}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!editing ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: S.text3 }}>
            <div style={{ fontFamily: S.mono, fontSize: 32, opacity: .3 }}>[ NOVEL ]</div>
            <p style={{ fontFamily: S.mono, fontSize: 11 }}>左から記録を選択してください</p>
          </div>
        ) : (
          <>
            <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>
              <div style={{ marginBottom: 8, fontFamily: S.mono, fontSize: 10, color: S.text3 }}>ID: {editing.id}</div>
              <FieldEdit label="タイトル" field="title" />
              <FieldEdit label="サブタイトル" field="subtitle" />
              <FieldEdit label="著者" field="author" />
              <FieldEdit label="日付" field="date" />
              <FieldEdit label="カテゴリ" field="category" />
              <FieldEdit label="必要レベル" field="requiredLevel" type="number" />
              <FieldEdit label="公開日時 (publishAt)" field="publishAt" type="datetime-local" />
              <FieldEdit label="必要フラグ (requiredFlag)" field="requiredFlag" />
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 4 }}>タグ (カンマ区切り)</label>
                <input value={(editing.tags || []).join(", ")} onChange={e => setEditing(prev => prev ? { ...prev, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) } : null)}
                  style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 12, outline: "none" }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 4 }}>サマリー</label>
                <textarea value={editing.summary || ""} onChange={e => setEditing(prev => prev ? { ...prev, summary: e.target.value } : null)} rows={3}
                  style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 11px", fontFamily: S.mono, fontSize: 12, outline: "none", resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".1em", display: "block", marginBottom: 4 }}>本文</label>
                <textarea value={editing.content || ""} onChange={e => setEditing(prev => prev ? { ...prev, content: e.target.value } : null)} rows={12}
                  style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "10px 12px", fontFamily: "'Noto Sans JP', sans-serif", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.8 }} />
              </div>
            </div>
            <div style={{ padding: "12px 20px", background: S.panel, borderTop: `1px solid ${S.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={saveEditing} style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 11, padding: "7px 18px", cursor: "pointer" }}>▶ DBに保存</button>
              <button onClick={exportAll} style={{ background: "rgba(0,212,255,.05)", border: `1px solid ${S.cyan}`, color: S.cyan, fontFamily: S.mono, fontSize: 11, padding: "7px 14px", cursor: "pointer" }}>↓ JSON出力</button>
              <button onClick={() => setEditing(selected ? { ...selected } : null)} style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text3, fontFamily: S.mono, fontSize: 11, padding: "7px 14px", cursor: "pointer" }}>↺ 変更を戻す</button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: S.panel, border: `1px solid ${S.cyan}`, color: S.cyan, fontFamily: S.mono, fontSize: 11, padding: "10px 16px", zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
