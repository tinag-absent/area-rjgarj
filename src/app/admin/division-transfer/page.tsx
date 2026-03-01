"use client";
import { apiFetch } from "@/lib/fetch";

import { useEffect, useState, useCallback } from "react";
import { useUserStore } from "@/store/userStore";

const S = {
  bg: "#07090f", panel: "#0c1018", panel2: "#111620", border: "#1a2030", border2: "#263040",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740", red: "#ff5252",
  purple: "#ce93d8", text: "#cdd6e8", text2: "#7a8aa0", text3: "#445060",
  mono: "'Share Tech Mono', 'Courier New', monospace",
};

type TransferRequest = {
  id: string;
  user_id: string;
  agent_id: string;
  agent_name: string;
  clearance_level: number;
  from_division_id: string | null;
  from_division_name: string | null;
  to_division_id: string;
  to_division_name: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
};

const LEVEL_COLORS: Record<number, string> = {
  0: "#445060", 1: "#4fc3f7", 2: "#00e676", 3: "#ffd740", 4: "#ff9800", 5: "#ff5252",
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontFamily: S.mono, fontSize: 9, padding: "2px 7px",
      border: `1px solid ${color}`, color, borderRadius: 2, letterSpacing: ".05em",
    }}>{text}</span>
  );
}

export default function DivisionTransferPage() {
  const { user } = useUserStore();
  const isSuperAdmin = user?.role === "super_admin";

  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TransferRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModal, setRejectModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: string } | null>(null);

  const showToast = (msg: string, type = "") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/division-transfer?status=${statusFilter}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      showToast("読み込み失敗", "err");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleAction = async (action: "approve" | "reject") => {
    if (!selected) return;
    if (action === "reject" && !rejectModal) {
      setRejectModal(true);
      return;
    }
    setProcessing(true);
    try {
      const res = await apiFetch("/api/admin/division-transfer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          action,
          rejectReason: action === "reject" ? rejectReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, action === "approve" ? "" : "warn");
      setSelected(null);
      setRejectModal(false);
      setRejectReason("");
      await loadRequests();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "処理失敗", "err");
    } finally {
      setProcessing(false);
    }
  };

  const counts = {
    pending: requests.filter(r => r.status === "pending").length,
  };

  // super_admin ガード
  if (user && !isSuperAdmin) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
        <div style={{ fontFamily: S.mono, fontSize: 32, color: S.red, opacity: 0.5 }}>⚠</div>
        <div style={{ fontFamily: S.mono, fontSize: 14, color: S.red, letterSpacing: ".1em" }}>ACCESS DENIED</div>
        <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3 }}>
          部門移動審査は <strong style={{ color: S.red }}>super_admin</strong> 専用です
        </div>
        <a href="/admin" style={{ fontFamily: S.mono, fontSize: 10, color: S.cyan, textDecoration: "none", border: `1px solid ${S.cyan}`, padding: "6px 16px" }}>← Admin Hub に戻る</a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg }}>

      {/* 左ペイン: 申請リスト */}
      <div style={{ width: 300, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* ヘッダー */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontFamily: S.mono, fontSize: 11, color: S.purple, letterSpacing: ".15em", marginBottom: 10 }}>
            ◈ DIVISION TRANSFER
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["pending", "approved", "rejected"] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setSelected(null); }}
                style={{
                  flex: 1, background: "none", border: `1px solid ${statusFilter === s ? S.cyan : S.border2}`,
                  color: statusFilter === s ? S.cyan : S.text3,
                  fontFamily: S.mono, fontSize: 9, padding: "5px 0", cursor: "pointer", letterSpacing: ".05em",
                }}>
                {s === "pending" ? "審査中" : s === "approved" ? "承認済" : "却下済"}
              </button>
            ))}
          </div>
        </div>

        {/* 統計バー */}
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", gap: 20 }}>
          <div>
            <div style={{ fontFamily: S.mono, fontSize: 18, color: S.yellow }}>{loading ? "—" : requests.length}</div>
            <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>
              {statusFilter === "pending" ? "PENDING" : statusFilter === "approved" ? "APPROVED" : "REJECTED"}
            </div>
          </div>
          <button onClick={loadRequests}
            style={{ marginLeft: "auto", background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 10, padding: "4px 10px", cursor: "pointer" }}>
            ⟳
          </button>
        </div>

        {/* リスト */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>読み込み中...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: 24, fontFamily: S.mono, fontSize: 11, color: S.text3, textAlign: "center" }}>申請なし</div>
          ) : requests.map(r => {
            const lvColor = LEVEL_COLORS[r.clearance_level] ?? S.text3;
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                style={{
                  padding: "12px 14px", borderBottom: `1px solid ${S.border}`, cursor: "pointer",
                  background: selected?.id === r.id ? "#0a1828" : "transparent",
                  borderLeft: selected?.id === r.id ? `2px solid ${S.cyan}` : "2px solid transparent",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text }}>{r.agent_name}</span>
                  <span style={{ fontFamily: S.mono, fontSize: 9, color: lvColor }}>LV{r.clearance_level}</span>
                </div>
                <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 5 }}>{r.agent_id}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: S.mono, fontSize: 10, color: S.text2 }}>
                    {r.from_division_name ?? "未所属"}
                  </span>
                  <span style={{ color: S.cyan, fontSize: 10 }}>→</span>
                  <span style={{ fontFamily: S.mono, fontSize: 10, color: S.cyan }}>
                    {r.to_division_name}
                  </span>
                </div>
                <div style={{ marginTop: 5, fontFamily: S.mono, fontSize: 9, color: S.text3 }}>
                  {new Date(r.created_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右ペイン: 詳細 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: S.text3 }}>
            <div style={{ fontFamily: S.mono, fontSize: 36, opacity: .3 }}>[ 未選択 ]</div>
            <p style={{ fontFamily: S.mono, fontSize: 11 }}>左リストから申請を選択してください</p>
          </div>
        ) : (
          <>
            {/* 詳細コンテンツ */}
            <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>

              {/* ステータスバナー */}
              <div style={{
                padding: "10px 16px", marginBottom: 24, fontFamily: S.mono, fontSize: 11, letterSpacing: ".1em",
                border: `1px solid ${selected.status === "pending" ? S.yellow : selected.status === "approved" ? S.green : S.red}`,
                color: selected.status === "pending" ? S.yellow : selected.status === "approved" ? S.green : S.red,
                background: selected.status === "pending" ? "rgba(255,215,64,.04)" : selected.status === "approved" ? "rgba(0,230,118,.04)" : "rgba(255,82,82,.04)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>{selected.status === "pending" ? "⏳" : selected.status === "approved" ? "✓" : "✕"}</span>
                <span>
                  {selected.status === "pending" ? "審査待ち" : selected.status === "approved" ? "承認済み" : "却下済み"}
                </span>
                {selected.reviewed_at && (
                  <span style={{ marginLeft: "auto", color: S.text3, fontSize: 10 }}>
                    審査日: {new Date(selected.reviewed_at).toLocaleString("ja-JP")}
                    {selected.reviewer_name ? ` by ${selected.reviewer_name}` : ""}
                  </span>
                )}
              </div>

              {/* 申請者情報 */}
              <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: 20, marginBottom: 16 }}>
                <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".12em", marginBottom: 14 }}>
                  // 申請者情報
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>機関員ID</div>
                    <div style={{ fontFamily: S.mono, fontSize: 13, color: S.cyan }}>{selected.agent_id}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>氏名</div>
                    <div style={{ fontSize: 13, color: S.text }}>{selected.agent_name}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 4 }}>クリアランス</div>
                    <div style={{ fontFamily: S.mono, fontSize: 13, color: LEVEL_COLORS[selected.clearance_level] ?? S.text }}>
                      LV{selected.clearance_level}
                    </div>
                  </div>
                </div>
              </div>

              {/* 移動内容 */}
              <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: 20, marginBottom: 16 }}>
                <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".12em", marginBottom: 14 }}>
                  // 移動内容
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, textAlign: "center", padding: "14px 12px", border: `1px solid ${S.border2}`, background: S.bg }}>
                    <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginBottom: 6 }}>現在の部門</div>
                    <div style={{ fontFamily: S.mono, fontSize: 14, color: S.text2 }}>{selected.from_division_name ?? "未所属"}</div>
                  </div>
                  <div style={{ fontSize: 22, color: S.cyan, flexShrink: 0 }}>→</div>
                  <div style={{ flex: 1, textAlign: "center", padding: "14px 12px", border: `1px solid ${S.cyan}`, background: "rgba(0,212,255,.04)" }}>
                    <div style={{ fontFamily: S.mono, fontSize: 9, color: S.cyan, marginBottom: 6 }}>希望部門</div>
                    <div style={{ fontFamily: S.mono, fontSize: 14, color: S.cyan }}>{selected.to_division_name}</div>
                  </div>
                </div>
              </div>

              {/* 申請理由 */}
              <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: 20, marginBottom: 16 }}>
                <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, letterSpacing: ".12em", marginBottom: 10 }}>
                  // 申請理由
                </div>
                <div style={{ fontFamily: S.mono, fontSize: 12, color: S.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {selected.reason || <span style={{ color: S.text3 }}>（理由なし）</span>}
                </div>
              </div>

              {/* 却下理由（却下時のみ） */}
              {selected.status === "rejected" && selected.reject_reason && (
                <div style={{ background: "rgba(255,82,82,.05)", border: `1px solid ${S.red}`, padding: 20 }}>
                  <div style={{ fontFamily: S.mono, fontSize: 9, color: S.red, letterSpacing: ".12em", marginBottom: 10 }}>
                    // 却下理由
                  </div>
                  <div style={{ fontFamily: S.mono, fontSize: 12, color: S.text, lineHeight: 1.7 }}>
                    {selected.reject_reason}
                  </div>
                </div>
              )}
            </div>

            {/* アクションバー */}
            {selected.status === "pending" && (
              <div style={{ padding: "14px 28px", background: S.panel, borderTop: `1px solid ${S.border}`, display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
                <button onClick={() => handleAction("approve")} disabled={processing}
                  style={{
                    background: "rgba(0,230,118,.1)", border: `1px solid ${S.green}`, color: S.green,
                    fontFamily: S.mono, fontSize: 11, padding: "9px 24px", cursor: "pointer", letterSpacing: ".1em",
                  }}>
                  {processing ? "処理中..." : "✓ 承認する"}
                </button>
                <button onClick={() => handleAction("reject")} disabled={processing}
                  style={{
                    background: "rgba(255,82,82,.08)", border: `1px solid ${S.red}`, color: S.red,
                    fontFamily: S.mono, fontSize: 11, padding: "9px 24px", cursor: "pointer", letterSpacing: ".1em",
                  }}>
                  ✕ 却下する
                </button>
                <div style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 10, color: S.text3 }}>
                  申請 ID: {selected.id.slice(0, 8)}…
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 却下理由モーダル */}
      {rejectModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 9000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 480, background: S.panel, border: `1px solid ${S.red}`, padding: 28 }}>
            <div style={{ fontFamily: S.mono, fontSize: 12, color: S.red, letterSpacing: ".1em", marginBottom: 18 }}>
              ✕ 却下理由を入力
            </div>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={5}
              placeholder="却下理由（省略可）"
              style={{
                width: "100%", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text,
                padding: "10px 12px", fontFamily: S.mono, fontSize: 12, outline: "none", resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => { setRejectModal(false); setRejectReason(""); }}
                style={{ background: "none", border: `1px solid ${S.border2}`, color: S.text2, fontFamily: S.mono, fontSize: 11, padding: "7px 18px", cursor: "pointer" }}>
                キャンセル
              </button>
              <button onClick={() => handleAction("reject")} disabled={processing}
                style={{ background: "rgba(255,82,82,.1)", border: `1px solid ${S.red}`, color: S.red, fontFamily: S.mono, fontSize: 11, padding: "7px 18px", cursor: "pointer" }}>
                {processing ? "処理中..." : "確定"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, background: S.panel,
          border: `1px solid ${toast.type === "err" ? S.red : toast.type === "warn" ? S.yellow : S.green}`,
          color: toast.type === "err" ? S.red : toast.type === "warn" ? S.yellow : S.green,
          fontFamily: S.mono, fontSize: 11, padding: "10px 16px", zIndex: 9999,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
