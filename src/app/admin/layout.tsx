import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

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
    ...(role === "super_admin"
      ? [
          { href: "/admin/player-watch", label: "PLAYER WATCH", icon: "◎", superAdmin: true },
          { href: "/admin/password-requests", label: "PW申請審査", icon: "🔑", superAdmin: true },
          { href: "/admin/division-transfer", label: "部門移動審査", icon: "⇄" },
          { href: "/admin/announcements", label: "お知らせ管理", icon: "📢" },
          { href: "/admin/db-editor", label: "DBエディタ", icon: "⬛" },
        ]
      : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar adminNav={adminNav} />
      <main
        id="admin-main-content"
        style={{
          flex: 1,
          marginLeft: "14rem",
          padding: "2rem 1.5rem",
          minHeight: "100vh",
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}
