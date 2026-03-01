"use client";
import { apiFetch } from "@/lib/fetch";

import { useEffect, useState, useCallback } from "react";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  orange: "#ff9800", purple: "#ce93d8", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff5252", high: "#ff9800", medium: "#ffd740", low: "#00e676",
};

type Incident = {
  id: string; name: string; severity: string; position: { x: number; y: number };
  location: string; status: string; entity?: string; gsi?: string;
  assignedDivision?: string; description: string; timestamp?: string;
};

export default function MapAdminPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // まずDBから取得（空なら静的JSONにフォールバック）
      const res = await apiFetch("/api/admin/map-incidents");
      const data = await res.json();
      if (res.ok && Array.isArray(data.incidents) && data.incidents.length > 0) {
        setIncidents(data.incidents);
      } else {
        // DBが空の場合は静的JSONを読み込む
        const fallback = await fetch("/data/map-incidents.json");
        const fd = await fallback.json();
        setIncidents(fd.incidents || []);
      }
    } catch {
      // 通信エラー時は静的JSONにフォールバック
      try {
        const fallback = await fetch("/data/map-incidents.json");
        const fd = await fallback.json();
        setIncidents(fd.incidents || []);
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectIncident = (inc: Incident) => {
    setSelected(inc);
    setEditing({ ...inc });
  };

  const saveEditing = async () => {
    if (!editing || !selected) return;
    const updated = incidents.map(i => i.id === selected.id ? editing : i);
    setIncidents(updated);
    setSelected(editing);
    try {
      const res = await apiFetch("/api/admin/map-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents: updated }),
      });
      const data = await res.json();
      showToast(res.ok ? "✓ DBに保存しました" : `✕ ${data.error || "保存失敗"}`);
    } catch {
      showToast("✕ 通信エラー");
    }
  };

  const deleteIncident = async () => {
    if (!selected || !confirm(`${selected.name} を削除しますか？`)) return;
    const updated = incidents.filter(i => i.id !== selected.id);
    setIncidents(updated);
    setSelected(null);
    setEditing(null);
    try {
      const res = await apiFetch("/api/admin/map-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents: updated }),
      });
      const data = await res.json();
      showToast(res.ok ? "✓ 削除してDBに保存しました" : `✕ ${data.error || "保存失敗"}`);
    } catch {
      showToast("✕ 通信エラー");
    }
  };

  const addNew = () => {
    const newId = `inc-${String(incidents.length + 1).padStart(3, "0")}`;
    const newInc: Incident = {
      id: newId, name: "新規インシデント", severity: "medium",
      position: { x: 50, y: 50 }, location: "未設定", status: "調査中",
      description: "",
    };
    setIncidents(prev => [...prev, newInc]);
    selectIncident(newInc);
  };

  const saveAll = async () => {
    try {
      const res = await apiFetch("/api/admin/map-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents }),
      });
      const data = await res.json();
      showToast(res.ok ? `✓ ${data.count}件をDBに保存しました` : `✕ ${data.error || "保存失敗"}`);
    } catch {
      showToast("✕ 通信エラー");
    }
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ incidents }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "map-incidents.json"; a.click();
    showToast("map-incidents.json をエクスポートしました");
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editing || !dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setEditing(prev => prev ? { ...prev, position: { x, y } } : null);
  };

  const FieldEdit = ({ label, field, type = "text" }: { label: string; field: keyof Incident; type?: string }) => {
    const val = editing?.[field];
    if (typeof val === "object") return null;
    return (
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 3 }}>{label}</label>
        <input type={type} value={String(val || "")} onChange={e => setEditing(prev => prev ? { ...prev, [field]: e.target.value } : null)}
          style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "6px 10px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg }}>
      {/* Sidebar */}
      <div style={{ width: 260, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.green, boxShadow: `0 0 6px ${S.green}` }} />
          <span style={{ fontFamily: S.mono, fontSize: 10, color: S.green, letterSpacing: ".12em", flex: 1 }}>インシデント ({incidents.length})</span>
          <button onClick={addNew} style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 9, padding: "3px 8px", cursor: "pointer" }}>+ 追加</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? <div style={{ padding: 20, fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>読み込み中...</div> :
            incidents.map(inc => {
              const col = SEVERITY_COLORS[inc.severity] || S.text3;
              return (
                <div key={inc.id} onClick={() => selectIncident(inc)}
                  style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer", background: selected?.id === inc.id ? "#0a2010" : "transparent", borderLeft: selected?.id === inc.id ? `2px solid ${col}` : "2px solid transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, boxShadow: `0 0 4px ${col}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: S.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.name}</span>
                  </div>
                  <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, paddingLeft: 15 }}>{inc.location} — {inc.status}</div>
                </div>
              );
            })}
        </div>
        <div style={{ padding: 10, borderTop: `1px solid ${S.border}` }}>
          <button onClick={saveAll} style={{ width: "100%", background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 10, padding: "6px", cursor: "pointer" }}>▶ 全件をDBに保存</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Map preview */}
        <div style={{ height: 220, background: S.panel2, borderBottom: `1px solid ${S.border}`, position: "relative", overflow: "hidden", cursor: editing ? "crosshair" : "default", flexShrink: 0 }}
          onClick={handleMapClick}
          onMouseEnter={() => editing && setDragging(true)}
          onMouseLeave={() => setDragging(false)}>
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 30px,rgba(0,212,255,.03) 30px,rgba(0,212,255,.03) 31px),repeating-linear-gradient(90deg,transparent,transparent 30px,rgba(0,212,255,.03) 30px,rgba(0,212,255,.03) 31px)" }} />
          <div style={{ position: "absolute", top: 10, left: 14, fontFamily: S.mono, fontSize: 9, color: S.text3 }}>
            KAISHOKU INCIDENT MAP — {editing ? "クリックで位置を移動" : "インシデントを選択"}
          </div>
          {incidents.map(inc => {
            const col = SEVERITY_COLORS[inc.severity] || S.text3;
            const isSelected = selected?.id === inc.id;
            return (
              <div key={inc.id} onClick={e => { e.stopPropagation(); selectIncident(inc); }}
                style={{ position: "absolute", left: `${inc.position.x}%`, top: `${inc.position.y}%`, transform: "translate(-50%,-50%)", cursor: "pointer" }}>
                <div style={{ width: isSelected ? 14 : 10, height: isSelected ? 14 : 10, borderRadius: "50%", background: col, boxShadow: `0 0 ${isSelected ? 12 : 6}px ${col}`, border: isSelected ? `2px solid white` : "none", transition: "all .2s" }} />
              </div>
            );
          })}
        </div>

        {/* Editor */}
        {!editing ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: S.text3 }}>
            <div style={{ fontFamily: S.mono, fontSize: 28, opacity: .3 }}>[ MAP ]</div>
            <p style={{ fontFamily: S.mono, fontSize: 11 }}>インシデントを選択して編集</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <FieldEdit label="インシデント名" field="name" />
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 3 }}>深刻度</label>
                  <select value={editing.severity} onChange={e => setEditing(prev => prev ? { ...prev, severity: e.target.value } : null)}
                    style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: SEVERITY_COLORS[editing.severity] || S.text, padding: "6px 10px", fontFamily: S.mono, fontSize: 11, outline: "none" }}>
                    {Object.keys(SEVERITY_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <FieldEdit label="場所" field="location" />
                <FieldEdit label="ステータス" field="status" />
                <FieldEdit label="関連エンティティ" field="entity" />
                <FieldEdit label="GSI値" field="gsi" />
                <FieldEdit label="担当部門" field="assignedDivision" />
                <FieldEdit label="タイムスタンプ" field="timestamp" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 3 }}>位置 (マップクリックで変更可)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>X</span>
                    <input type="number" min={0} max={100} value={editing.position.x} onChange={e => setEditing(prev => prev ? { ...prev, position: { ...prev.position, x: Number(e.target.value) } } : null)}
                      style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "5px 8px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>Y</span>
                    <input type="number" min={0} max={100} value={editing.position.y} onChange={e => setEditing(prev => prev ? { ...prev, position: { ...prev.position, y: Number(e.target.value) } } : null)}
                      style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "5px 8px", fontFamily: S.mono, fontSize: 11, outline: "none" }} />
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textTransform: "uppercase", letterSpacing: ".08em", display: "block", marginBottom: 3 }}>説明</label>
                <textarea value={editing.description} onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : null)} rows={4}
                  style={{ width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "7px 10px", fontFamily: "'Noto Sans JP', sans-serif", fontSize: 12, outline: "none", resize: "vertical", lineHeight: 1.7 }} />
              </div>
            </div>
            <div style={{ padding: "10px 16px", background: S.panel, borderTop: `1px solid ${S.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={saveEditing} style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 11, padding: "6px 16px", cursor: "pointer" }}>▶ 変更を適用</button>
              <button onClick={saveAll} style={{ background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green, fontFamily: S.mono, fontSize: 11, padding: "6px 14px", cursor: "pointer" }}>▶ DBに保存</button>
              <button onClick={deleteIncident} style={{ marginLeft: "auto", background: "none", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 11, padding: "6px 14px", cursor: "pointer" }}>✕ 削除</button>
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
