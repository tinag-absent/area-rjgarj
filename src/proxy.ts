/**
 * proxy.ts — Edge Runtime 認証ガード（Next.js 16+）
 *
 * Next.js 16 では middleware.ts の代わりに proxy.ts + export function proxy を使用する。
 * middleware.ts は削除済み。
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth",
  "/api/health",
  "/_next",
  "/favicon",
  "/images",
  "/icons",
];

const ADMIN_PATHS = ["/admin"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // パブリックパスはスキップ
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // /api/admin は管理者のみ（セッションなし → 401、権限なし → 403）
  if (pathname.startsWith("/api/admin")) {
    const token = req.cookies.get("kai_token")?.value;
    const session = await getSessionFromCookie(token);
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // その他の API ルートは Route Handler 側で個別に認証
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("kai_token")?.value;
  const session = await getSessionFromCookie(token);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("kai_token");
    return res;
  }

  // 管理者チェック
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // DBエディタは super_admin のみ
    if (pathname.startsWith("/admin/db-editor") && session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    // PLAYER WATCH は super_admin のみ
    if (pathname.startsWith("/admin/player-watch") && session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    // PASSWORD REQUESTS は super_admin のみ
    if (pathname.startsWith("/admin/password-requests") && session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // ユーザー情報をヘッダーに注入（Server Components で利用）
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", session.userId);
  requestHeaders.set("x-user-level", String(session.level ?? 0));
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-agent-id", session.agentId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|fonts|icons).*)",
  ],
};
