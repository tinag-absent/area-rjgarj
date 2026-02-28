"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiredLevel: number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  label: "ダッシュボード", icon: "◈", requiredLevel: 0, section: "基本" },
  { href: "/chat",       label: "通信ログ",       icon: "◉", requiredLevel: 1, section: "基本" },
  { href: "/map",        label: "インシデントマップ", icon: "⬡", requiredLevel: 1, section: "基本" },
  { href: "/reports",    label: "レポート",       icon: "▦", requiredLevel: 1, section: "基本" },
  { href: "/bulletin",   label: "掲示板",         icon: "◫", requiredLevel: 1, section: "基本" },
  { href: "/divisions",  label: "部門一覧",       icon: "▤", requiredLevel: 1, section: "機関情報" },
  { href: "/history",    label: "活動履歴",       icon: "◫", requiredLevel: 1, section: "機関情報" },
  { href: "/codex",      label: "コーデックス",   icon: "⬛", requiredLevel: 1, section: "機関情報" },
  { href: "/novel",      label: "記録文庫",       icon: "◧", requiredLevel: 1, section: "機関情報" },
  { href: "/entities",   label: "実体カタログ",   icon: "◈", requiredLevel: 2, section: "データベース" },
  { href: "/modules",    label: "モジュール",     icon: "⬡", requiredLevel: 2, section: "データベース" },
  { href: "/locations",  label: "場所",           icon: "◉", requiredLevel: 1, section: "データベース" },
  { href: "/statistics", label: "統計",           icon: "▦", requiredLevel: 2, section: "データベース" },
  { href: "/skill-tree", label: "スキルツリー",   icon: "◫", requiredLevel: 1, section: "成長" },
  { href: "/missions",   label: "収束案件",       icon: "▲", requiredLevel: 4, section: "機密" },
  { href: "/search",     label: "全文検索",       icon: "◈", requiredLevel: 4, section: "機密" },
  { href: "/classified", label: "機密情報",       icon: "■", requiredLevel: 5, section: "機密" },
  { href: "/personnel",  label: "人員ファイル",   icon: "◉", requiredLevel: 5, section: "機密" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clear);
  const [mobileOpen, setMobileOpen] = useState(false);
  const level = user?.level ?? 0;
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const unreadChatCounts = useNotificationStore((s) => s.unreadChatCounts);
  const totalChatUnread = Object.values(unreadChatCounts).reduce((s, n) => s + n, 0);

  const xp = user?.xp ?? 0;
  const nextLevelXp = [0, 100, 300, 600, 1200, 2500];
  const currentLevelXp = nextLevelXp[level] ?? 0;
  const nextXp = nextLevelXp[Math.min(level + 1, 5)] ?? 2500;
  const xpPercent = level >= 5 ? 100 : Math.min(100, Math.round(((xp - currentLevelXp) / (nextXp - currentLevelXp)) * 100));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearUser();
    router.replace("/login");
  }

  // Group nav items by section
  const sections = NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
    const s = item.section ?? "その他";
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});


  return (
    <aside

        style={{
          width: "16rem",
          backgroundColor: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          position: "fixed",
          height: "100vh",
          overflowY: "auto",
          zIndex: 1000,
          flexDirection: "column",
          display: "flex",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "2.5rem", height: "2.5rem", backgroundColor: "rgba(0,255,255,0.1)", borderRadius: "0.375rem", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,255,255,0.2)", fontSize: "1.25rem" }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.1em", color: "white" }}>海蝕機関</div>
              <div className="font-mono" style={{ fontSize: "0.625rem", color: "var(--sidebar-primary)", opacity: 0.8, letterSpacing: "0.2em" }}>KAISHOKU AGENCY</div>
            </div>
          </div>
          {user && (
            <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "0.375rem", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--sidebar-primary)", fontWeight: 600 }}>{user.id}</div>
              <div style={{ fontSize: "0.875rem", color: "white", marginTop: "0.25rem" }}>{user.name}</div>
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span className="font-mono" style={{ fontSize: "0.625rem", color: "var(--muted-foreground)", textTransform: "uppercase" }}>LEVEL {level}</span>
                  <span className="font-mono" style={{ fontSize: "0.625rem", color: "var(--muted-foreground)" }}>{xp} XP</span>
                </div>
                <div style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${xpPercent}%`, backgroundColor: "var(--sidebar-primary)", borderRadius: "2px", transition: "width 0.5s ease" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}>
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} style={{ marginBottom: "1.5rem" }}>
              <div className="font-mono" style={{ fontSize: "0.625rem", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.15em", padding: "0 0.5rem", marginBottom: "0.5rem" }}>
                {section}
              </div>
              {items.map((item) => {
                const locked = level < item.requiredLevel;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={locked ? "#" : item.href}
                    onClick={locked ? (e) => e.preventDefault() : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.625rem 0.75rem", marginBottom: "0.125rem",
                      borderRadius: "0.375rem", transition: "all 0.2s", textDecoration: "none",
                      color: locked ? "var(--muted-foreground)" : active ? "var(--sidebar-primary)" : "var(--sidebar-foreground)",
                      opacity: locked ? 0.4 : active ? 1 : 0.75,
                      backgroundColor: active ? "var(--sidebar-accent)" : "transparent",
                      borderLeft: active ? "2px solid var(--sidebar-primary)" : "2px solid transparent",
                      cursor: locked ? "not-allowed" : "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    <span style={{ fontSize: "0.875rem", width: "1.25rem", textAlign: "center" }}>{locked ? "🔒" : item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {locked && (
                      <span className="font-mono" style={{ fontSize: "0.5rem", color: "var(--muted-foreground)", backgroundColor: "rgba(255,255,255,0.05)", padding: "0.125rem 0.375rem", borderRadius: "2px" }}>
                        LV{item.requiredLevel}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
          {user?.role !== "player" && (
            <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", marginBottom: "0.5rem", borderRadius: "0.375rem", color: "var(--muted-foreground)", fontSize: "0.875rem", transition: "all 0.2s" }}>
              <span>⚙</span><span>管理画面</span>
            </Link>
          )}
          <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", marginBottom: "0.5rem", borderRadius: "0.375rem", color: "var(--muted-foreground)", fontSize: "0.875rem", transition: "all 0.2s" }}>
              <span>◧</span><span>設定</span>
            </Link>
          <button
            onClick={handleLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", borderRadius: "0.375rem", color: "var(--muted-foreground)", backgroundColor: "transparent", fontSize: "0.875rem", transition: "all 0.2s", textAlign: "left" }}
          >
            <span>◀</span><span>ログアウト</span>
          </button>
        </div>
      </aside>
  );
}
