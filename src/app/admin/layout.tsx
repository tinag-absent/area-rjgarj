import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const role = h.get("x-user-role") ?? "";
  if (!["admin", "super_admin"].includes(role)) {
    redirect("/dashboard");
  }

  const adminNav = [
    { href: "/admin", label: "Admin Hub", icon: "◈" },
    { href: "/admin/players", label: "機関員管理", icon: "◉" },
    { href: "/admin/analytics", label: "分析", icon: "▦" },
    { href: "/admin/story-engine", label: "ストーリー管理", icon: "⬡" },
    { href: "/admin/map-admin", label: "マップ管理", icon: "◫" },
    { href: "/admin/balance-editor", label: "バランス調整", icon: "▤" },
    { href: "/admin/novel-editor", label: "ノベル編集", icon: "◧" },
    { href: "/admin/chat-viewer", label: "チャット閲覧", icon: "●" },
    { href: "/admin/dm",          label: "ユーザーDM",   icon: "✉" },
    ...(role === "super_admin"
      ? [
          { href: "/admin/division-transfer", label: "部門移動審査", icon: "⇄" },
          { href: "/admin/announcements", label: "お知らせ管理", icon: "📢" },
          { href: "/admin/db-editor", label: "DBエディタ", icon: "⬛" },
        ]
      : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Admin Sidebar */}
      <aside style={{ width: "14rem", backgroundColor: "hsl(220,35%,5%)", borderRight: "1px solid rgba(239,68,68,0.2)", position: "fixed", height: "100vh", overflowY: "auto", zIndex: 1000 }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--destructive)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            ⚠ ADMIN MODE
          </div>
          <Link href="/dashboard" style={{ display: "block", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
            ← メインに戻る
          </Link>
        </div>
        <nav style={{ padding: "1rem 0.75rem" }}>
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", marginBottom: "0.25rem", borderRadius: "0.375rem", color: "var(--foreground)", fontSize: "0.875rem", transition: "all 0.2s" }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, marginLeft: "14rem", padding: "2rem 1.5rem" }}>
        {children}
      </main>
    </div>
  );
}
