import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconCompass,
  IconUsers,
  IconGrid,
  IconStory,
  IconMap,
  IconLayers,
  IconBook,
  IconCircleFill,
  IconMail,
  IconTransfer,
  IconAnnouncement,
  IconTerminal,
  IconWarning,
} from "@/components/ui/Icons";
import type { ReactNode } from "react";

function NavIcon({ icon }: { icon: ReactNode }) {
  return (
    <span style={{ width: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icon}
    </span>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const role = h.get("x-user-role") ?? "";
  if (!["admin", "super_admin"].includes(role)) {
    redirect("/dashboard");
  }

  const adminNav = [
    { href: "/admin",               label: "Admin Hub",     icon: <IconCompass size={14} /> },
    { href: "/admin/players",       label: "機関員管理",    icon: <IconUsers size={14} /> },
    { href: "/admin/analytics",     label: "分析",          icon: <IconGrid size={14} /> },
    { href: "/admin/story-engine",  label: "ストーリー管理", icon: <IconStory size={14} /> },
    { href: "/admin/map-admin",     label: "マップ管理",    icon: <IconMap size={14} /> },
    { href: "/admin/balance-editor",label: "バランス調整",  icon: <IconLayers size={14} /> },
    { href: "/admin/novel-editor",  label: "ノベル編集",    icon: <IconBook size={14} /> },
    { href: "/admin/chat-viewer",   label: "チャット閲覧",  icon: <IconCircleFill size={14} /> },
    { href: "/admin/dm",            label: "ユーザーDM",    icon: <IconMail size={14} /> },
    ...(role === "super_admin"
      ? [
          { href: "/admin/division-transfer", label: "部門移動審査",   icon: <IconTransfer size={14} /> },
          { href: "/admin/announcements",     label: "お知らせ管理",   icon: <IconAnnouncement size={14} /> },
          { href: "/admin/db-editor",         label: "DBエディタ",     icon: <IconTerminal size={14} /> },
        ]
      : []),
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Admin Sidebar */}
      <aside style={{ width: "14rem", backgroundColor: "hsl(220,35%,5%)", borderRight: "1px solid rgba(239,68,68,0.2)", position: "fixed", height: "100vh", overflowY: "auto", zIndex: 1000 }}>
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--destructive)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <IconWarning size={13} color="var(--destructive)" /> ADMIN MODE
          </div>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            メインに戻る
          </Link>
        </div>
        <nav style={{ padding: "1rem 0.75rem" }}>
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", marginBottom: "0.25rem", borderRadius: "0.375rem", color: "var(--foreground)", fontSize: "0.875rem", transition: "all 0.2s" }}>
              <NavIcon icon={item.icon} />
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
