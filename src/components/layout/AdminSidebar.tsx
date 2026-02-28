"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  superAdmin?: boolean;
}

interface AdminSidebarProps {
  adminNav: NavItem[];
}

export default function AdminSidebar({ adminNav }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ページ遷移時にモバイルサイドバーを閉じる
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // モバイルでサイドバーが開いているときにスクロールを禁止
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      {/* モバイルオーバーレイ */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 999,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`admin-sidebar-aside${mobileOpen ? " mobile-open" : ""}`}
        style={{
          width: "14rem",
          backgroundColor: "hsl(220,35%,5%)",
          borderRight: "1px solid rgba(239,68,68,0.2)",
          position: "fixed",
          height: "100vh",
          overflowY: "auto",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          top: 0,
          left: 0,
          transition: "transform 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid rgba(239,68,68,0.2)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div
                className="font-mono"
                style={{
                  fontSize: "0.75rem",
                  color: "var(--destructive)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                ⚠ ADMIN MODE
              </div>
              <Link
                href="/dashboard"
                style={{
                  display: "block",
                  marginTop: "0.5rem",
                  fontSize: "0.75rem",
                  color: "var(--muted-foreground)",
                }}
              >
                ← メインに戻る
              </Link>
            </div>
            {/* 閉じるボタン（モバイルのみ） */}
            <button
              onClick={() => setMobileOpen(false)}
              className="admin-sidebar-close-btn"
              aria-label="サイドバーを閉じる"
              style={{
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "rgba(239,68,68,0.7)",
                cursor: "pointer",
                padding: "0.375rem 0.5rem",
                borderRadius: "0.25rem",
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}>
          {adminNav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isSuperAdmin = item.superAdmin;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.75rem",
                  marginBottom: isSuperAdmin ? "0" : "0.25rem",
                  marginTop: isSuperAdmin ? "0.5rem" : "0",
                  borderRadius: "0.375rem",
                  color: active
                    ? (isSuperAdmin ? "#ce93d8" : "var(--destructive)")
                    : isSuperAdmin ? "#9c6aaf" : "var(--foreground)",
                  backgroundColor: active
                    ? (isSuperAdmin ? "rgba(206,147,216,0.1)" : "rgba(239,68,68,0.08)")
                    : isSuperAdmin ? "rgba(206,147,216,0.04)" : "transparent",
                  borderLeft: active
                    ? `2px solid ${isSuperAdmin ? "#ce93d8" : "var(--destructive)"}`
                    : isSuperAdmin
                    ? "2px solid rgba(206,147,216,0.2)"
                    : "2px solid transparent",
                  fontSize: "0.875rem",
                  transition: "all 0.2s",
                  textDecoration: "none",
                  opacity: active ? 1 : 0.85,
                  boxShadow: isSuperAdmin && active ? "0 0 8px rgba(206,147,216,0.15)" : "none",
                }}
              >
                <span>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isSuperAdmin && (
                  <span style={{
                    fontSize: "0.5rem", padding: "1px 4px",
                    border: "1px solid rgba(206,147,216,0.4)",
                    color: "rgba(206,147,216,0.6)",
                    borderRadius: "2px", letterSpacing: "0.05em",
                  }}>SA</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* モバイル用ハンバーガーボタン */}
      <button
        onClick={() => setMobileOpen(true)}
        className="admin-sidebar-hamburger"
        aria-label="管理メニューを開く"
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 998,
          background: "rgba(10,5,5,0.9)",
          border: "1px solid rgba(239,68,68,0.4)",
          color: "var(--destructive)",
          cursor: "pointer",
          padding: "0.5rem 0.625rem",
          borderRadius: "0.375rem",
          display: "none",
          flexDirection: "column",
          gap: "4px",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          style={{
            display: "block",
            width: "18px",
            height: "2px",
            backgroundColor: "currentColor",
            borderRadius: "1px",
          }}
        />
        <span
          style={{
            display: "block",
            width: "18px",
            height: "2px",
            backgroundColor: "currentColor",
            borderRadius: "1px",
          }}
        />
        <span
          style={{
            display: "block",
            width: "18px",
            height: "2px",
            backgroundColor: "currentColor",
            borderRadius: "1px",
          }}
        />
      </button>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-aside {
            transform: translateX(-100%);
          }
          .admin-sidebar-aside.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-sidebar-close-btn {
            display: flex !important;
          }
          .admin-sidebar-hamburger {
            display: flex !important;
          }
          #admin-main-content {
            margin-left: 0 !important;
            padding: 1rem !important;
            padding-top: 4rem !important;
          }
        }
      `}</style>
    </>
  );
}
