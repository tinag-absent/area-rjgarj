"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import { MAX_LEVEL } from "@/lib/constants";
import {
  IconDiamond,
  IconTarget,
  IconHexagon,
  IconGrid,
  IconBulletin,
  IconLayers,
  IconClock,
  IconBook,
  IconDatabase,
  IconSkillTree,
  IconTriangle,
  IconSearch,
  IconClassified,
  IconSettings,
  IconLogout,
  IconLogo,
} from "@/components/ui/Icons";

// 隠しコンソールへのシークレットキーワード
const SECRET_SEQUENCE = "kaishoku";

function useSecretConsole() {
  const router = useRouter();
  const bufferRef = useRef("");
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      bufferRef.current = (bufferRef.current + e.key).slice(-SECRET_SEQUENCE.length);
      if (bufferRef.current === SECRET_SEQUENCE) {
        bufferRef.current = "";
        router.push("/console");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}

function IconLock({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  requiredLevel: number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  label: "ダッシュボード",    icon: <IconDiamond />,    requiredLevel: 0, section: "基本" },
  { href: "/chat",       label: "通信ログ",           icon: <IconTarget />,     requiredLevel: 1, section: "基本" },
  { href: "/map",        label: "インシデントマップ", icon: <IconHexagon />,    requiredLevel: 1, section: "基本" },
  { href: "/reports",    label: "レポート",           icon: <IconGrid />,       requiredLevel: 1, section: "基本" },
  { href: "/bulletin",   label: "掲示板",             icon: <IconBulletin />,   requiredLevel: 1, section: "基本" },
  { href: "/divisions",  label: "部門一覧",           icon: <IconLayers />,     requiredLevel: 1, section: "機関情報" },
  { href: "/history",    label: "活動履歴",           icon: <IconClock />,      requiredLevel: 1, section: "機関情報" },
  { href: "/novel",      label: "記録文庫",           icon: <IconBook />,       requiredLevel: 1, section: "機関情報" },
  { href: "/database",   label: "データベース",       icon: <IconDatabase />,   requiredLevel: 1, section: "データベース" },
  { href: "/skill-tree", label: "スキルツリー",       icon: <IconSkillTree />,  requiredLevel: 1, section: "成長" },
  { href: "/missions",   label: "収束案件",           icon: <IconTriangle />,   requiredLevel: 4, section: "機密" },
  { href: "/search",     label: "全文検索",           icon: <IconSearch />,     requiredLevel: 4, section: "機密" },
  { href: "/classified", label: "機密情報",           icon: <IconClassified />, requiredLevel: 5, section: "機密" },
];

export default function Sidebar() {
  useSecretConsole();
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const level = user?.level ?? 0;
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const unreadChatCounts = useNotificationStore((s) => s.unreadChatCounts);
  const totalChatUnread = useMemo(
    () => Object.values(unreadChatCounts).reduce((s, n) => s + n, 0),
    [unreadChatCounts]
  );

  const xp = user?.xp ?? 0;
  const nextLevelXp = [0, 100, 300, 600, 1200, 2500];
  const currentLevelXp = nextLevelXp[level] ?? 0;
  const nextXp = nextLevelXp[Math.min(level + 1, 5)] ?? 2500;
  const xpPercent = level >= MAX_LEVEL
    ? 100
    : (() => {
        const range = nextXp - currentLevelXp;
        if (range <= 0) return 100;
        return Math.min(100, Math.max(0, Math.round(((xp - currentLevelXp) / range) * 100)));
      })();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearUser();
    router.replace("/login");
  }

  const badgeMap: Record<string, number> = {
    "/chat": totalChatUnread,
    "/bulletin": unreadCount,
  };

  const sections = useMemo(
    () =>
      NAV_ITEMS.reduce<Record<string, NavItem[]>>((acc, item) => {
        const s = item.section ?? "その他";
        if (!acc[s]) acc[s] = [];
        acc[s].push(item);
        return acc;
      }, {}),
    []
  );

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
          <div style={{ width: "2.5rem", height: "2.5rem", backgroundColor: "rgba(0,255,255,0.1)", borderRadius: "0.375rem", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,255,255,0.2)" }}>
            <IconLogo size={20} color="rgba(0,255,255,0.9)" />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.1em", color: "white" }}>海蝕機関</div>
            <div className="font-mono" style={{ fontSize: "0.625rem", color: "var(--sidebar-primary)", opacity: 0.8, letterSpacing: "0.2em" }}>KAISHOKU AGENCY</div>
          </div>
        </div>
        {user && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: "0.375rem", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--sidebar-primary)", fontWeight: 600 }}>{user.agentId ?? user.id}</div>
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
              const badge = badgeMap[item.href] ?? 0;
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
                  <span style={{ width: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {locked ? <IconLock /> : item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {locked ? (
                    <span className="font-mono" style={{ fontSize: "0.5rem", color: "var(--muted-foreground)", backgroundColor: "rgba(255,255,255,0.05)", padding: "0.125rem 0.375rem", borderRadius: "2px" }}>
                      LV{item.requiredLevel}
                    </span>
                  ) : badge > 0 ? (
                    <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--sidebar)", backgroundColor: "var(--sidebar-primary)", padding: "0.125rem 0.375rem", borderRadius: "9999px", minWidth: "1.25rem", textAlign: "center" }}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
        {user?.role !== "player" && (
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", marginBottom: "0.5rem", borderRadius: "0.375rem", color: ["admin","super_admin"].includes(user?.role ?? "") ? "var(--sidebar-primary)" : "var(--muted-foreground)", fontSize: "0.875rem", transition: "all 0.2s" }}>
            <span style={{ width: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span>管理画面</span>
            {user?.role === "super_admin" && (
              <span style={{ fontSize: "0.5rem", fontFamily: "monospace", backgroundColor: "rgba(255,200,0,0.1)", border: "1px solid rgba(255,200,0,0.3)", color: "hsl(38,90%,55%)", padding: "0.1rem 0.3rem", borderRadius: "2px", letterSpacing: "0.05em" }}>SA</span>
            )}
          </Link>
        )}
        <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", marginBottom: "0.5rem", borderRadius: "0.375rem", color: "var(--muted-foreground)", fontSize: "0.875rem", transition: "all 0.2s" }}>
          <span style={{ width: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconSettings size={14} color="currentColor" />
          </span>
          <span>設定</span>
        </Link>
        <button
          onClick={handleLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.75rem", borderRadius: "0.375rem", color: "var(--muted-foreground)", backgroundColor: "transparent", border: "none", fontSize: "0.875rem", transition: "all 0.2s", textAlign: "left", cursor: "pointer" }}
        >
          <span style={{ width: "1.25rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IconLogout size={14} color="currentColor" />
          </span>
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  );
}
