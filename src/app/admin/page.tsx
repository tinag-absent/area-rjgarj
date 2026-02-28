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
  { href: "/admin/players", label: "機関員管理", desc: "プレイヤーアカウントの管理・権限変更", icon: "◉", color: "rgba(0,255,255,0.1)" },
  { href: "/admin/analytics", label: "プレイヤー分析", desc: "行動分析・統計ダッシュボード", icon: "▦", color: "rgba(167,139,250,0.1)" },
  { href: "/admin/story-engine", label: "ストーリーエンジン", desc: "フラグ・変数・イベント管理", icon: "⬡", color: "rgba(249,115,22,0.1)" },
  { href: "/admin/map-admin", label: "マップ管理", desc: "インシデントマップの編集", icon: "◫", color: "rgba(34,197,94,0.1)" },
  { href: "/admin/balance-editor", label: "バランス調整", desc: "XP報酬・レベル閾値の設定", icon: "▤", color: "rgba(234,179,8,0.1)" },
  { href: "/admin/novel-editor", label: "ノベル編集", desc: "記録文庫コンテンツの管理", icon: "◧", color: "rgba(0,255,255,0.1)" },
  { href: "/admin/chat-viewer", label: "チャット閲覧", desc: "通信ログの閲覧・モデレーション", icon: "●", color: "rgba(239,68,68,0.1)" },
  { href: "/admin/db-editor", label: "DBエディタ", desc: "直接SQL実行 — super_admin 専用", icon: "⬛", color: "rgba(255,82,82,0.06)" },
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
