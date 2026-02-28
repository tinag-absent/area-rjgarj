"use client";

import { useEffect, useState, useCallback } from "react";

const S = {
  bg: "#05070d", panel: "#090c14", panel2: "#0d1120", panel3: "#111828",
  border: "#151d2e", border2: "#1e2a40",
  cyan: "#00d4ff", green: "#00e676", yellow: "#ffd740",
  red: "#ff5252", orange: "#ff9800", purple: "#ce93d8",
  text: "#cdd6e8", text2: "#7a8aa0", text3: "#3a4a60",
  mono: "'Share Tech Mono','Courier New',monospace",
} as const;

const LEVEL_COLORS: Record<number, string> = {
  0: "#445060", 1: "#4fc3f7", 2: "#00e676",
  3: "#ffd740", 4: "#ff9800", 5: "#ff5252",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: "審査中",   color: S.yellow },
  approved: { label: "承認済み", color: S.green },
  rejected: { label: "却下",     color: S.red },
};

type PwRequest = {
  id: string; user_id: string; agent_id: string; display_name: string;
  level: number; division_name: string | null;
  reason: string; status: string;
  reviewed_by_name: string | null; reviewed_at: string | null;
  reject_reason: string | null; created_at: string;
};

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontFamily: S.mono, fontSize: 9, padding: "2px 7px", border: `1px solid ${color}`, color, borderRadius: 2, letterSpacing: ".05em" }}>{text}</span>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function PasswordRequestsPage() {
  const [requests, setRequests] = useState<PwRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selected, setSelected] = useState<PwRequest | null>(null);

  // 承認フォーム
  const [newPw, setNewPw]       = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [confPw, setConfPw]     = useState("");
  const [showConf, setShowConf] = useState(false);

  // 却下フォーム
  const [rejectReason, setRejectReason] = useState("");

  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/password-requests?status=${filterStatus}`);
      if (res.status === 403) { showToast("アクセス権限がありません", false); return; }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { showToast("読み込み失敗", false); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  function selectRequest(r: PwRequest) {
    setSelected(r);
    setNewPw(""); setConfPw(""); setRejectReason("");
  }

  async function handleApprove() {
    if (!selected) return;
    if (newPw.length < 8) { showToast("パスワードは8文字以上にしてください", false); return; }
    if (newPw !== confPw)  { showToast("パスワードが一致しません", false); return; }
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/password-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action: "approve", newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "エラーが発生しました", false); return; }
      showToast(data.message ?? "承認しました");
      setSelected(null);
      await loadRequests();
    } catch { showToast("通信エラー", false); }
    finally { setProcessing(false); }
  }

  async function handleReject() {
    if (!selected) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/password-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, action: "reject", rejectReason: rejectReason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "エラーが発生しました", false); return; }
      showToast(data.message ?? "却下しました");
      setSelected(null);
      await loadRequests();
    } catch { showToast("通信エラー", false); }
    finally { setProcessing(false); }
  }

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 4rem)", overflow: "hidden", margin: "-2rem -1.5rem", background: S.bg }}>

      {/* ── 左：申請リスト ── */}
      <div style={{ width: 300, background: S.panel, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* ヘッダー */}
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily: S.mono, fontSize: 11, color: S.purple, letterSpacing: ".1em" }}>
                🔑 PASSWORD REQUESTS
              </div>
              <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3, marginTop: 2 }}>SUPER ADMIN ONLY</div>
            </div>
            <button onClick={loadRequests} style={{ background: "none", border: "none", color: S.text3, cursor: "pointer", fontFamily: S.mono, fontSize: 12 }}>⟳</button>
          </div>

          {/* フィルタ */}
          <div style={{ display: "flex", gap: 5 }}>
            {(["pending", "approved", "rejected", "all"] as const).map(s => {
              const meta = STATUS_META[s] || { label: "全件", color: S.text2 };
              const isActive = filterStatus === s;
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{
                  background: "none",
                  border: `1px solid ${isActive ? (meta.color || S.cyan) : S.border2}`,
                  color: isActive ? (meta.color || S.cyan) : S.text3,
                  fontFamily: S.mono, fontSize: 9, padding: "3px 8px", cursor: "pointer",
                }}>{s === "all" ? "全件" : meta.label}</button>
              );
            })}
          </div>
        </div>

        {/* 統計バー */}
        {filterStatus !== "all" && pendingCount > 0 && (
          <div style={{ padding: "8px 14px", background: `${S.yellow}10`, borderBottom: `1px solid ${S.yellow}30`, fontFamily: S.mono, fontSize: 10, color: S.yellow }}>
            ⚠ 審査待ち {pendingCount}件
          </div>
        )}

        {/* リスト */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", fontFamily: S.mono, fontSize: 11, color: S.text3 }}>読み込み中...</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontFamily: S.mono, fontSize: 11, color: S.text3 }}>申請なし</div>
          ) : requests.map(r => {
            const meta = STATUS_META[r.status] || { label: r.status, color: S.text2 };
            const isSelected = selected?.id === r.id;
            return (
              <div key={r.id} onClick={() => selectRequest(r)}
                style={{
                  padding: "11px 14px", borderBottom: `1px solid ${S.border}`,
                  cursor: "pointer",
                  background: isSelected ? "#120a20" : "transparent",
                  borderLeft: `2px solid ${isSelected ? S.purple : "transparent"}`,
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, fontSize: 9, fontWeight: "bold", background: `${LEVEL_COLORS[r.level] || S.text3}22`, color: LEVEL_COLORS[r.level] || S.text3 }}>
                      {(r.display_name || "?").charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text }}>{r.display_name}</div>
                      <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>{r.agent_id}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: S.mono, fontSize: 9, padding: "1px 6px", border: `1px solid ${meta.color}`, color: meta.color }}>{meta.label}</span>
                </div>
                <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                  {r.reason}
                </div>
                <div style={{ fontFamily: S.mono, fontSize: 9, color: S.text3 }}>
                  {new Date(r.created_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 右：詳細・審査 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: S.text3 }}>
            <div style={{ fontFamily: S.mono, fontSize: 36, opacity: .15 }}>[ 🔑 ]</div>
            <p style={{ fontFamily: S.mono, fontSize: 11 }}>左から申請を選択してください</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* 申請者情報カード */}
            <div style={{ background: S.panel, border: `1px solid ${S.border2}`, padding: 18, marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: S.mono, fontSize: 18, fontWeight: "bold", background: `${LEVEL_COLORS[selected.level] || S.text3}20`, color: LEVEL_COLORS[selected.level] || S.text3, flexShrink: 0 }}>
                {(selected.display_name || "?").charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, color: S.text, marginBottom: 3 }}>{selected.display_name}</div>
                <div style={{ fontFamily: S.mono, fontSize: 11, color: S.text3, marginBottom: 8 }}>{selected.agent_id}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge text={`LV${selected.level}`} color={LEVEL_COLORS[selected.level] || S.text3} />
                  {selected.division_name && <Badge text={selected.division_name} color={S.text2} />}
                  <Badge text={STATUS_META[selected.status]?.label || selected.status} color={STATUS_META[selected.status]?.color || S.text2} />
                </div>
              </div>
              <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, textAlign: "right" }}>
                <div>申請日</div>
                <div style={{ color: S.text2, marginTop: 2 }}>{new Date(selected.created_at).toLocaleString("ja-JP")}</div>
              </div>
            </div>

            {/* 申請理由 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, letterSpacing: ".1em", marginBottom: 8 }}>// 申請理由</div>
              <div style={{ background: S.panel2, border: `1px solid ${S.border2}`, padding: "12px 16px", fontFamily: S.mono, fontSize: 12, color: S.text, lineHeight: 1.7 }}>
                {selected.reason}
              </div>
            </div>

            {/* 処理済みの場合 */}
            {selected.status !== "pending" && (
              <div style={{ padding: "14px 16px", background: selected.status === "approved" ? `${S.green}08` : `${S.red}08`, border: `1px solid ${selected.status === "approved" ? S.green : S.red}40`, marginBottom: 20 }}>
                <div style={{ fontFamily: S.mono, fontSize: 11, color: selected.status === "approved" ? S.green : S.red, marginBottom: 6 }}>
                  {selected.status === "approved" ? "✓ 承認済み" : "✗ 却下済み"}
                </div>
                {selected.reviewed_by_name && (
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3 }}>
                    処理者: {selected.reviewed_by_name} / {selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString("ja-JP") : ""}
                  </div>
                )}
                {selected.reject_reason && (
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.red, marginTop: 6 }}>
                    却下理由: {selected.reject_reason}
                  </div>
                )}
              </div>
            )}

            {/* 審査フォーム（pendingのみ） */}
            {selected.status === "pending" && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>

                {/* 承認パネル */}
                <div style={{ flex: 1, minWidth: 260, background: S.panel, border: `1px solid ${S.green}30`, padding: 18 }}>
                  <div style={{ fontFamily: S.mono, fontSize: 11, color: S.green, letterSpacing: ".08em", marginBottom: 14 }}>
                    ✓ 申請を承認する
                  </div>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, lineHeight: 1.6, marginBottom: 14, padding: "8px 10px", background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
                    承認すると、入力したパスワードが即座に設定されます。<br />
                    ユーザーに通知が送信されます。
                  </div>

                  {/* 新パスワード */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 5 }}>新しいパスワード（8文字以上）</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPw ? "text" : "password"}
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: "100%", boxSizing: "border-box", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "8px 36px 8px 10px", fontFamily: S.mono, fontSize: 12, outline: "none" }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: S.text3, cursor: "pointer", display: "flex" }}>
                        <EyeIcon open={showPw} />
                      </button>
                    </div>
                  </div>

                  {/* 確認 */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 5 }}>確認入力</div>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showConf ? "text" : "password"}
                        value={confPw}
                        onChange={e => setConfPw(e.target.value)}
                        placeholder="••••••••"
                        style={{ width: "100%", boxSizing: "border-box", background: S.panel2, border: `1px solid ${confPw && confPw !== newPw ? S.red : S.border2}`, color: S.text, padding: "8px 36px 8px 10px", fontFamily: S.mono, fontSize: 12, outline: "none" }}
                      />
                      <button type="button" onClick={() => setShowConf(v => !v)}
                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: S.text3, cursor: "pointer", display: "flex" }}>
                        <EyeIcon open={showConf} />
                      </button>
                    </div>
                    {confPw && confPw !== newPw && (
                      <div style={{ fontFamily: S.mono, fontSize: 9, color: S.red, marginTop: 4 }}>パスワードが一致しません</div>
                    )}
                  </div>

                  <button
                    onClick={handleApprove}
                    disabled={processing || newPw.length < 8 || newPw !== confPw}
                    style={{
                      width: "100%", padding: "9px", background: `${S.green}15`,
                      border: `1px solid ${S.green}`, color: S.green,
                      fontFamily: S.mono, fontSize: 11, cursor: "pointer",
                      letterSpacing: ".08em",
                      opacity: (processing || newPw.length < 8 || newPw !== confPw) ? 0.4 : 1,
                    }}>
                    {processing ? "処理中..." : "▶ 承認してパスワードを設定"}
                  </button>
                </div>

                {/* 却下パネル */}
                <div style={{ flex: 1, minWidth: 240, background: S.panel, border: `1px solid ${S.red}25`, padding: 18 }}>
                  <div style={{ fontFamily: S.mono, fontSize: 11, color: S.red, letterSpacing: ".08em", marginBottom: 14 }}>
                    ✕ 申請を却下する
                  </div>
                  <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, lineHeight: 1.6, marginBottom: 14, padding: "8px 10px", background: `${S.red}08`, border: `1px solid ${S.red}20` }}>
                    却下するとユーザーに通知が送られます。<br />
                    理由を入力するとユーザーに伝わります。
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: S.mono, fontSize: 10, color: S.text3, marginBottom: 5 }}>却下理由（任意）</div>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={4}
                      placeholder="例：本人確認が取れないため"
                      style={{ width: "100%", boxSizing: "border-box", background: S.panel2, border: `1px solid ${S.border2}`, color: S.text, padding: "8px 10px", fontFamily: S.mono, fontSize: 11, outline: "none", resize: "vertical", lineHeight: 1.6 }}
                    />
                  </div>

                  <button
                    onClick={handleReject}
                    disabled={processing}
                    style={{
                      width: "100%", padding: "9px", background: `${S.red}10`,
                      border: `1px solid ${S.red}80`, color: S.red,
                      fontFamily: S.mono, fontSize: 11, cursor: "pointer",
                      letterSpacing: ".08em", opacity: processing ? 0.4 : 1,
                    }}>
                    {processing ? "処理中..." : "✕ 却下する"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: S.panel, padding: "10px 16px",
          border: `1px solid ${toast.ok ? S.green : S.red}`,
          color: toast.ok ? S.green : S.red,
          fontFamily: S.mono, fontSize: 11,
        }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
