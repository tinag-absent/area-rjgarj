"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUserStore } from "@/store/userStore";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", orange: "#ff9800", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

type Table = { name: string; type: string };
type Column = { cid: number; name: string; type: string; notnull: number; dflt_value: string; pk: number };
type QueryResult = {
  ok: boolean; readOnly: boolean; rows: Record<string, unknown>[];
  columns: string[]; rowsAffected: number; truncated: boolean; elapsed: number;
  error?: string; requiresConfirmation?: boolean; message?: string;
  lastInsertRowid?: string;
};

const QUICK_QUERIES: { label: string; sql: string }[] = [
  { label: "全ユーザー", sql: "SELECT id, username, display_name, role, status, clearance_level, anomaly_score, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50;" },
  { label: "最近のチャット", sql: "SELECT cl.id, cl.chat_id, cl.username, cl.message, cl.created_at FROM chat_logs cl ORDER BY cl.created_at DESC LIMIT 50;" },
  { label: "XPランキング", sql: "SELECT u.username, CAST(sv.var_value AS INTEGER) AS xp, u.clearance_level FROM story_variables sv JOIN users u ON u.id = sv.user_id WHERE sv.var_key = 'total_xp' ORDER BY xp DESC LIMIT 20;" },
  { label: "アクティブフラグ", sql: "SELECT pf.user_id, u.username, pf.flag_key, pf.flag_value, pf.set_at FROM progress_flags pf JOIN users u ON u.id = pf.user_id ORDER BY pf.set_at DESC LIMIT 50;" },
  { label: "最近のログ", sql: "SELECT user_id, method, path, status_code, ip_address, created_at FROM access_logs ORDER BY created_at DESC LIMIT 50;" },
  { label: "無効化トークン", sql: "SELECT jti, user_id, revoked_at, expires_at FROM revoked_tokens WHERE expires_at > datetime('now') ORDER BY revoked_at DESC;" },
];

export default function DbEditorPage() {
  const { user } = useUserStore();
  const isSuperAdmin = user?.role === "super_admin";

  // super_admin でない場合はアクセス拒否画面を表示
  if (user && !isSuperAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
        <div style={{ fontFamily: S.mono, fontSize: 32, color: S.red, opacity: 0.5 }}>⚠</div>
        <div style={{ fontFamily: S.mono, fontSize: 14, color: S.red, letterSpacing: ".1em" }}>ACCESS DENIED</div>
        <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3 }}>DBエディタは <strong style={{ color: S.red }}>super_admin</strong> 専用です</div>
        <a href="/admin" style={{ fontFamily: S.mono, fontSize: 10, color: S.cyan, textDecoration: "none", border: `1px solid ${S.cyan}`, padding: "6px 16px" }}>← Admin Hub に戻る</a>
      </div>
    );
  }

  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<Column[]>([]);
  const [tableRowCount, setTableRowCount] = useState<number>(0);
  const [sql, setSql] = useState("SELECT * FROM users WHERE deleted_at IS NULL LIMIT 20;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ sql: string; ok: boolean; elapsed: number }[]>([]);
  const [confirmPending, setConfirmPending] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "history">("results");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/admin/db-query")
      .then(r => r.json())
      .then(d => setTables(d.tables || []))
      .catch(() => {});
  }, []);

  const loadTable = useCallback(async (name: string) => {
    setSelectedTable(name);
    try {
      const res = await fetch(`/api/admin/db-query?table=${encodeURIComponent(name)}`);
      const data = await res.json();
      setTableColumns(data.columns || []);
      setTableRowCount(data.rowCount ?? 0);
      setSql(`SELECT * FROM ${name} LIMIT 50;`);
    } catch {}
  }, []);

  const runQuery = useCallback(async (sqlToRun: string, confirmed = false) => {
    setLoading(true);
    setConfirmPending(null);
    try {
      const res = await fetch("/api/admin/db-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun, confirmed }),
      });
      const data: QueryResult = await res.json();
      setResult(data);
      if (data.requiresConfirmation) {
        setConfirmPending(sqlToRun);
        return;
      }
      setActiveTab("results");
      setHistory(h => [{ sql: sqlToRun.slice(0, 120), ok: !!data.ok, elapsed: data.elapsed ?? 0 }, ...h.slice(0, 49)]);
    } catch (err) {
      setResult({ ok: false, error: String(err), readOnly: false, rows: [], columns: [], rowsAffected: 0, truncated: false, elapsed: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery(sql);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = sql.slice(0, start) + "  " + sql.slice(end);
      setSql(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

  const cellValue = (v: unknown): string => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const isNull = (v: unknown) => v === null || v === undefined;

  const tabStyle = (t: string) => ({
    padding: "7px 14px", fontFamily: S.mono, fontSize: 11, cursor: "pointer",
    background: "none", border: "none",
    borderBottomWidth: 2, borderBottomStyle: "solid" as const,
    borderBottomColor: activeTab === t ? S.cyan : "transparent",
    color: activeTab === t ? S.cyan : S.text3, letterSpacing: ".06em",
  });

  return (
    <div style={{ background: S.bg, margin: "-2rem -1.5rem", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ヘッダー */}
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: S.mono, fontSize: 10, color: S.red, letterSpacing: ".12em", marginBottom: 2 }}>
            ⚠ SUPER_ADMIN ONLY — DB DIRECT ACCESS
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: S.text }}>
            データベースエディタ
          </div>
        </div>
        <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "right", lineHeight: 1.8 }}>
          DROP / TRUNCATE / ALTER / CREATE は無効<br />
          <span style={{ color: S.yellow }}>⌘Enter</span> または <span style={{ color: S.yellow }}>Ctrl+Enter</span> で実行
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* サイドバー：テーブル一覧 */}
        <div style={{ width: 200, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ padding: "10px 12px 6px", fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".1em", borderBottom: `1px solid ${S.border}` }}>
            TABLES ({tables.length})
          </div>
          {tables.map(t => (
            <button key={t.name} onClick={() => loadTable(t.name)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "8px 12px",
                background: selectedTable === t.name ? S.panel2 : "none",
                border: "none", borderLeft: `2px solid ${selectedTable === t.name ? S.cyan : "transparent"}`,
                color: selectedTable === t.name ? S.cyan : S.text2,
                fontFamily: S.mono, fontSize: 11, cursor: "pointer",
              }}>
              {t.name}
              {t.type === "view" && <span style={{ marginLeft: 4, fontSize: 9, color: S.purple }}>[view]</span>}
            </button>
          ))}
        </div>

        {/* メインエリア */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* テーブル情報 */}
          {selectedTable && tableColumns.length > 0 && (
            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${S.border}`, background: S.panel2, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontFamily: S.mono, fontSize: 11, color: S.cyan }}>{selectedTable}</span>
              <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>{tableRowCount} rows</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tableColumns.map(c => (
                  <span key={c.name} style={{
                    fontFamily: S.mono, fontSize: 10, padding: "1px 6px",
                    background: S.panel, border: `1px solid ${S.border2}`,
                    color: c.pk ? S.yellow : S.text2,
                  }}>
                    {c.name} <span style={{ color: S.text3 }}>{c.type}</span>
                    {c.pk ? <span style={{ color: S.yellow }}> PK</span> : ""}
                    {c.notnull ? <span style={{ color: S.text3 }}> NN</span> : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* クイッククエリ */}
          <div style={{ padding: "8px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_QUERIES.map(q => (
              <button key={q.label} onClick={() => setSql(q.sql)}
                style={{
                  fontFamily: S.mono, fontSize: 10, padding: "3px 8px", cursor: "pointer",
                  background: S.panel2, border: `1px solid ${S.border2}`,
                  color: S.text2, letterSpacing: ".04em",
                }}>
                {q.label}
              </button>
            ))}
          </div>

          {/* SQLエディタ */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}` }}>
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={e => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={6}
              spellCheck={false}
              style={{
                width: "100%", background: S.panel2, border: `1px solid ${S.border2}`,
                color: S.text, fontFamily: S.mono, fontSize: 13, padding: "10px 12px",
                resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box",
              }}
              placeholder="SELECT * FROM users LIMIT 10;"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 8 }}>
              <button onClick={() => setSql("")}
                style={{ fontFamily: S.mono, fontSize: 11, padding: "6px 14px", cursor: "pointer", background: "none", border: `1px solid ${S.border2}`, color: S.text3 }}>
                クリア
              </button>
              <button onClick={() => runQuery(sql)} disabled={loading || !sql.trim()}
                style={{
                  fontFamily: S.mono, fontSize: 11, padding: "6px 20px", cursor: "pointer",
                  background: loading ? S.panel2 : S.cyan, border: "none",
                  color: loading ? S.text3 : "#000", fontWeight: 700, letterSpacing: ".06em",
                  opacity: (!sql.trim() || loading) ? 0.5 : 1,
                }}>
                {loading ? "実行中..." : "▶ 実行"}
              </button>
            </div>
          </div>

          {/* 確認ダイアログ */}
          {confirmPending && (
            <div style={{ margin: "12px 16px", padding: "14px 16px", background: "rgba(255,82,82,0.08)", border: `1px solid ${S.red}`, borderRadius: 4 }}>
              <div style={{ fontFamily: S.mono, fontSize: 12, color: S.red, marginBottom: 8 }}>
                ⚠ 書き込み操作です。この操作は取り消せません。本当に実行しますか？
              </div>
              <code style={{ display: "block", fontFamily: S.mono, fontSize: 11, color: S.yellow, marginBottom: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {confirmPending}
              </code>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => runQuery(confirmPending, true)}
                  style={{ fontFamily: S.mono, fontSize: 11, padding: "5px 16px", cursor: "pointer", background: S.red, border: "none", color: "#fff", fontWeight: 700 }}>
                  実行する
                </button>
                <button onClick={() => setConfirmPending(null)}
                  style={{ fontFamily: S.mono, fontSize: 11, padding: "5px 16px", cursor: "pointer", background: "none", border: `1px solid ${S.border2}`, color: S.text3 }}>
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* タブ */}
          <div style={{ borderBottom: `1px solid ${S.border}`, display: "flex", paddingLeft: 8 }}>
            <button style={tabStyle("results")} onClick={() => setActiveTab("results")}>
              RESULTS {result ? `(${result.rowsAffected ?? 0})` : ""}
            </button>
            <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>
              HISTORY ({history.length})
            </button>
          </div>

          {/* 結果エリア */}
          <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>

            {activeTab === "results" && (
              <>
                {/* エラー */}
                {result?.error && (
                  <div style={{ padding: "12px 16px", fontFamily: S.mono, fontSize: 12, color: S.red, background: "rgba(255,82,82,0.06)", borderBottom: `1px solid ${S.border}` }}>
                    ✗ {result.error}
                  </div>
                )}

                {/* 書き込み結果 */}
                {result?.ok && !result.readOnly && (
                  <div style={{ padding: "12px 16px", fontFamily: S.mono, fontSize: 12, color: S.green, borderBottom: `1px solid ${S.border}` }}>
                    ✓ {result.rowsAffected} 行が影響を受けました
                    {result.lastInsertRowid ? ` — lastInsertRowid: ${result.lastInsertRowid}` : ""}
                    <span style={{ marginLeft: 16, color: S.text3 }}>{result.elapsed}ms</span>
                  </div>
                )}

                {/* SELECT結果テーブル */}
                {result?.ok && result.readOnly && result.rows.length > 0 && (
                  <>
                    <div style={{ padding: "6px 16px", fontFamily: S.mono, fontSize: 10, color: S.text3, borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between" }}>
                      <span>{result.rowsAffected} rows{result.truncated ? " (500件上限)" : ""}</span>
                      <span>{result.elapsed}ms</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: S.mono, fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: S.panel2 }}>
                            <th style={{ padding: "6px 12px", borderBottom: `1px solid ${S.border}`, color: S.text3, textAlign: "right", fontWeight: 400, fontSize: 10, minWidth: 40 }}>#</th>
                            {result.columns.map(c => (
                              <th key={c} style={{ padding: "6px 12px", borderBottom: `1px solid ${S.border}`, color: S.cyan, textAlign: "left", fontWeight: 400, whiteSpace: "nowrap" }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                              <td style={{ padding: "5px 12px", color: S.text3, textAlign: "right", fontSize: 10 }}>{i + 1}</td>
                              {result.columns.map(c => (
                                <td key={c} style={{ padding: "5px 12px", color: isNull(row[c]) ? S.text3 : S.text, whiteSpace: "nowrap", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {isNull(row[c]) ? <span style={{ fontStyle: "italic", color: S.text3 }}>NULL</span> : cellValue(row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {result?.ok && result.readOnly && result.rows.length === 0 && (
                  <div style={{ padding: "24px", fontFamily: S.mono, fontSize: 12, color: S.text3, textAlign: "center" }}>
                    結果なし — {result.elapsed}ms
                  </div>
                )}

                {!result && !loading && (
                  <div style={{ padding: "24px", fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>
                    SQLを入力して実行してください
                  </div>
                )}
              </>
            )}

            {activeTab === "history" && (
              <div style={{ padding: "8px 0" }}>
                {history.length === 0 && (
                  <div style={{ padding: "24px", fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>履歴なし</div>
                )}
                {history.map((h, i) => (
                  <div key={i}
                    onClick={() => { setSql(h.sql); setActiveTab("results"); }}
                    style={{ padding: "8px 16px", borderBottom: `1px solid ${S.border}`, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontFamily: S.mono, fontSize: 10, color: h.ok ? S.green : S.red, marginTop: 1 }}>{h.ok ? "✓" : "✗"}</span>
                    <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text2, flex: 1, wordBreak: "break-all" }}>{h.sql}</span>
                    <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, flexShrink: 0 }}>{h.elapsed}ms</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
