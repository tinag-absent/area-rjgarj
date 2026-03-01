"use client";
import { apiFetch } from "@/lib/fetch";

import { useState, useEffect, useCallback } from "react";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

const LEVEL_LABELS: Record<number, string> = {
  0: "見習い", 1: "補助要員", 2: "正規要員", 3: "上級要員", 4: "機密取扱者", 5: "最高幹部",
};
const LEVEL_COLORS: Record<number, string> = {
  0: "#445060", 1: "#4fc3f7", 2: "#00e676", 3: "#ffd740", 4: "#ff9800", 5: "#ff5252",
};

type Config = {
  levelThresholds: Record<string, number>;
  xpRewards: Record<string, number>;
  dailyLoginRewards: Record<string, number>;
};

const DEFAULTS: Config = {
  levelThresholds: { "0": 0, "1": 100, "2": 300, "3": 600, "4": 1200, "5": 2500 },
  xpRewards: {
    first_login: 50, profile_view: 10, chat_message: 5, division_view: 20,
    codex_view: 30, mission_complete: 100, daily_login: 25, location_view: 15,
    entity_view: 15, module_view: 15, search_use: 8, bookmark_add: 5,
  },
  dailyLoginRewards: { "1": 25, "2": 30, "3": 35, "4": 40, "5": 45, "6": 50, "7": 100 },
};

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
      style={{ background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "6px 10px", fontFamily: S.mono, fontSize: 13, outline: "none", width: 100, textAlign: "right" }} />
  );
}

export default function BalanceEditorPage() {
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/balance");
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data }));
        setCanSave(true);
      } else if (res.status === 403) {
        setCanSave(false);
      }
    } catch {
      showToast("設定の読み込みに失敗しました", "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateThreshold = (lv: string, val: number) => {
    setConfig(c => ({ ...c, levelThresholds: { ...c.levelThresholds, [lv]: val } }));
  };
  const addXP = (key: string, val: number) => {
    setConfig(c => ({ ...c, xpRewards: { ...c.xpRewards, [key]: val } }));
  };
  const updateDaily = (day: string, val: number) => {
    setConfig(c => ({ ...c, dailyLoginRewards: { ...c.dailyLoginRewards, [day]: val } }));
  };

  const saveConfig = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("✓ 設定をDBに保存しました", "ok");
      } else if (res.status === 403) {
        setCanSave(false);
        showToast("⚠ super_admin 権限が必要です", "err");
      } else {
        showToast(`✕ ${data.error || "保存に失敗しました"}`, "err");
      }
    } catch {
      showToast("✕ 通信エラーが発生しました", "err");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (confirm("デフォルト値にリセットしますか？")) {
      setConfig(DEFAULTS);
      showToast("リセットしました");
    }
  };

  const toastColor = toast?.type === "err" ? S.red : S.green;

  return (
    <div style={{ background: S.bg, margin: "-2rem -1.5rem", minHeight: "100vh" }}>
      <div style={{ background: S.panel, borderBottom: `1px solid ${S.border2}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: S.yellow, boxShadow: `0 0 8px ${S.yellow}` }} />
        <span style={{ fontFamily: S.mono, fontSize: 12, color: S.yellow, letterSpacing: ".2em" }}>バランス調整 // BALANCE EDITOR</span>
        <div style={{ flex: 1 }} />
        {loading && <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>読み込み中...</span>}
        <button onClick={resetDefaults} style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "5px 12px", cursor: "pointer" }}>↺ リセット</button>
        <button
          onClick={saveConfig}
          disabled={saving || !canSave}
          title={!canSave ? "super_admin 権限が必要です" : ""}
          style={{
            background: canSave ? "rgba(0,230,118,.1)" : "rgba(255,255,255,.03)",
            border: `1px solid ${canSave ? S.green : S.border2}`,
            color: canSave ? S.green : S.text3,
            fontFamily: S.mono, fontSize: 10, padding: "5px 14px",
            cursor: canSave ? "pointer" : "not-allowed",
            letterSpacing: ".08em", opacity: saving ? 0.6 : 1,
          }}>
          {saving ? "保存中..." : "▶ DBに保存"}
        </button>
      </div>

      {!canSave && !loading && (
        <div style={{ margin: "12px 20px 0", padding: "8px 14px", background: "rgba(255,82,82,.07)", border: `1px solid ${S.red}`, fontFamily: S.mono, fontSize: 11, color: S.red }}>
          ⚠ 閲覧のみ可能です。設定の保存には <strong>super_admin</strong> 権限が必要です。
        </div>
      )}

      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 1000 }}>
        <div style={{ background: S.panel, border: `1px solid ${S.border}` }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.cyan, boxShadow: `0 0 6px ${S.cyan}` }} />
            <span style={{ fontFamily: S.mono, fontSize: 10, color: S.cyan, letterSpacing: ".15em", textTransform: "uppercase" }}>レベル閾値 (XP)</span>
          </div>
          <div style={{ padding: 14 }}>
            {Object.entries(config.levelThresholds).map(([lv, val]) => (
              <div key={lv} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "8px 12px", background: S.panel2, border: `1px solid ${S.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: LEVEL_COLORS[Number(lv)] || S.text3, flexShrink: 0 }} />
                <span style={{ fontFamily: S.mono, fontSize: 12, color: LEVEL_COLORS[Number(lv)] || S.text3, width: 30 }}>LV{lv}</span>
                <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, flex: 1 }}>{LEVEL_LABELS[Number(lv)]}</span>
                <NumInput value={val} onChange={v => updateThreshold(lv, v)} />
                <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>XP</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: S.panel, border: `1px solid ${S.border}` }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.green, boxShadow: `0 0 6px ${S.green}` }} />
            <span style={{ fontFamily: S.mono, fontSize: 10, color: S.green, letterSpacing: ".15em", textTransform: "uppercase" }}>XP報酬</span>
          </div>
          <div style={{ padding: 14 }}>
            {Object.entries(config.xpRewards).map(([key, val]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "7px 10px", background: S.panel2, border: `1px solid ${S.border}` }}>
                <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text2, flex: 1 }}>{key}</span>
                <NumInput value={val} onChange={v => addXP(key, v)} />
                <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>XP</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: S.panel, border: `1px solid ${S.border}` }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: S.yellow, boxShadow: `0 0 6px ${S.yellow}` }} />
            <span style={{ fontFamily: S.mono, fontSize: 10, color: S.yellow, letterSpacing: ".15em", textTransform: "uppercase" }}>連続ログイン報酬 (日数別)</span>
          </div>
          <div style={{ padding: 14 }}>
            {Object.entries(config.dailyLoginRewards).map(([day, val]) => (
              <div key={day} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "7px 10px", background: S.panel2, border: `1px solid ${S.border}` }}>
                <span style={{ fontFamily: S.mono, fontSize: 11, color: day === "7" ? S.yellow : S.text2, width: 60 }}>DAY {day}{day === "7" ? " 🏆" : ""}</span>
                <NumInput value={val} onChange={v => updateDaily(day, v)} />
                <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>XP</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: S.panel, border: `1px solid ${S.border}`, padding: 14 }}>
          <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".1em", marginBottom: 12 }}>// 使い方</div>
          <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text2, lineHeight: 1.8 }}>
            <p>1. 数値を編集して設定を調整します。</p>
            <p>2. 「▶ DBに保存」ボタンで設定を即時反映します。</p>
            <p>3. 保存にはサーバーへの書き込み権限 <span style={{ color: S.red }}>（super_admin）</span> が必要です。</p>
          </div>
          <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(0,212,255,.04)", border: `1px solid ${S.border}`, fontFamily: S.mono, fontSize: 10, color: S.text3 }}>
            設定は <span style={{ color: S.cyan }}>balance_config</span> テーブルに保存され、サーバー再起動なしで即時反映されます。
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: S.panel, border: `1px solid ${toastColor}`, color: toastColor, fontFamily: S.mono, fontSize: 11, padding: "10px 16px", zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
