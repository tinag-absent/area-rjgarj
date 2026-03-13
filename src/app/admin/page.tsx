import { headers } from "next/headers";
import { getDb, query } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Hub - 海蝕機関" };

async function getStats() {
  try {
    const db = getDb();
    const [userCount, postCount, chatCount] = await Promise.all([
      query<{ count: number }>(db, `SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL`),
      query<{ count: number }>(db, `SELECT COUNT(*) as count FROM posts WHERE status = 'published'`),
      query<{ count: number }>(db, `SELECT COUNT(*) as count FROM chat_logs WHERE created_at > datetime('now', '-1 day')`),
    ]);
    return {
      users: Number(userCount[0]?.count || 0),
      posts: Number(postCount[0]?.count || 0),
      chatToday: Number(chatCount[0]?.count || 0),
    };
  } catch { return { users: 0, posts: 0, chatToday: 0 }; }
}

const ADMIN_TOOLS = [
  { href: "/admin/players", label: "機関員管理", desc: "プレイヤーアカウントの管理・権限変更", icon: "target", color: "rgba(0,255,255,0.1)" },
  { href: "/admin/analytics", label: "プレイヤー分析", desc: "行動分析・統計ダッシュボード", icon: "grid", color: "rgba(167,139,250,0.1)" },
  { href: "/admin/story-engine", label: "ストーリーエンジン", desc: "フラグ・変数・イベント管理", icon: "hexagon", color: "rgba(249,115,22,0.1)" },
  { href: "/admin/map-admin", label: "マップ管理", desc: "インシデントマップの編集", icon: "map", color: "rgba(34,197,94,0.1)" },
  { href: "/admin/balance-editor", label: "バランス調整", desc: "XP報酬・レベル閾値の設定", icon: "layers", color: "rgba(234,179,8,0.1)" },
  { href: "/admin/novel-editor", label: "ノベル編集", desc: "記録文庫コンテンツの管理", icon: "book", color: "rgba(0,255,255,0.1)" },
  { href: "/admin/chat-viewer", label: "チャット閲覧", desc: "通信ログの閲覧・モデレーション", icon: "circle", color: "rgba(239,68,68,0.1)" },
  { href: "/admin/db-editor", label: "DBエディタ", desc: "直接SQL実行 — super_admin 専用", icon: "terminal", color: "rgba(255,82,82,0.06)" },
  { href: "/admin/announcements", label: "お知らせ管理", desc: "全体アナウンスの作成・編集・削除", icon: "diamond", color: "rgba(56,189,248,0.1)" },
  { href: "/admin/division-transfer", label: "部署異動管理", desc: "機関員の部署間異動の承認・処理", icon: "transfer", color: "rgba(52,211,153,0.1)" },
  { href: "/admin/dm", label: "DMツール", desc: "プレイヤーへのダイレクトメッセージ送信", icon: "circletarget", color: "rgba(251,191,36,0.1)" },
  { href: "/admin/npc-scripts", label: "NPCスクリプト", desc: "キーワード連鎖による会話フローの管理", icon: "circletarget", color: "rgba(206,147,216,0.1)" },
  { href: "/admin/rule-engine",   label: "ルールエンジン",  desc: "ARGキーワード・フラグ・XP・異常スコア等のDB管理", icon: "hexagon", color: "rgba(251,113,133,0.1)" },
  { href: "/admin/achievements", label: "実績・バッジ",     desc: "バッジ定義・条件・シークレット実績の管理",         icon: "trophy", color: "rgba(255,215,64,0.1)"  },
  { href: "/admin/skill-tree",   label: "スキルツリー",     desc: "トラック・スキル定義・前提条件・XPコストの編集",  icon: "diamond", color: "rgba(163,230,53,0.1)"  },
];

export default async function AdminHubPage() {
  const h = await headers();
  const agentId = h.get("x-user-agent-id") ?? "";
  const stats = await getStats();

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--destructive)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
          ⚠ RESTRICTED ACCESS — ADMIN CONSOLE
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.25rem" }}>
          管理コンソール
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          {agentId} — 管理者アクセス確認済み
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "総機関員数", value: stats.users, color: "var(--primary)" },
          { label: "投稿数", value: stats.posts, color: "#a78bfa" },
          { label: "本日のチャット", value: stats.chatToday, color: "#fb923c" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <div className="font-mono" style={{ fontSize: "2rem", fontWeight: 700, color }}>{value}</div>
            <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tools Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {ADMIN_TOOLS.map((tool) => (
          <a key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ cursor: "pointer", transition: "all 0.2s", backgroundColor: tool.color, borderColor: "rgba(255,255,255,0.1)", padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{tool.icon}</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1rem", color: "white" }}>{tool.label}</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>{tool.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function AdminCardIcon({ icon, color }: { icon: string; color: string }) {
  const p = { width:24, height:24, fill:"none" as const, stroke:color, strokeWidth:"1.5" as const, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (icon === "target")      return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>;
  if (icon === "grid")        return <svg {...p} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>;
  if (icon === "hexagon")     return <svg {...p} viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>;
  if (icon === "map")         return <svg {...p} viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>;
  if (icon === "layers")      return <svg {...p} viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
  if (icon === "book")        return <svg {...p} viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
  if (icon === "circle")      return <svg {...p} fill={color} stroke="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
  if (icon === "terminal")    return <svg {...p} viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>;
  if (icon === "diamond")     return <svg {...p} viewBox="0 0 24 24"><path d="M12 2L2 9l10 13L22 9z" /><line x1="2" y1="9" x2="22" y2="9" /></svg>;
  if (icon === "transfer")    return <svg {...p} viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
  if (icon === "circletarget")return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
  if (icon === "trophy")      return <svg {...p} viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>;
  return <svg {...p} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>;
}


