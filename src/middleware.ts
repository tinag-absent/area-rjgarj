/**
 * middleware.ts — Next.js 16+ 認証ガード（旧 middleware.ts を統合）
 *
 * セキュリティ上の役割:
 * 1. クライアントから送られた x-user-level / x-user-role ヘッダーを削除し、
 *    セッション Cookie の値で上書きする（ヘッダー偽装防止）。
 * 2. X-Requested-With ヘッダーが存在しない API への POST/PUT/DELETE/PATCH を拒否
 *    （CSRF 対策）。
 * 3. 未認証ユーザーを /login にリダイレクトする。
 * 4. 管理者専用パス・API を保護する。
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";

// ── パス定義 ──────────────────────────────────────────────────────
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/health",
  "/_next",
  "/favicon",
  "/images",
  "/icons",
  "/fonts",
  "/manifest.json",
];

const ADMIN_PATHS = ["/admin"];

// CSRF チェックをスキップする Content-Type（multipart 等）
const CSRF_SKIP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── パブリックパスは早期リターン ──────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── CSRF 対策: 状態変更リクエストに X-Requested-With を要求 ──
  if (pathname.startsWith("/api/") && !CSRF_SKIP_METHODS.has(req.method)) {
    const ct = req.headers.get("content-type") ?? "";
    if (
      ct.includes("application/json") &&
      req.headers.get("x-requested-with") !== "XMLHttpRequest"
    ) {
      return NextResponse.json(
        { error: "不正なリクエストです（CSRF トークン不足）" },
        { status: 403 }
      );
    }
  }

  // ── セッション取得 ────────────────────────────────────────────
  const token = req.cookies.get("kai_token")?.value;
  const session = await getSessionFromCookie(token);

  // ── /api/admin は管理者のみ ───────────────────────────────────
  if (pathname.startsWith("/api/admin")) {
    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }
    // ヘッダー注入してそのまま通す
    const h = new Headers(req.headers);
    h.delete("x-user-level");
    h.delete("x-user-role");
    h.set("x-user-id",       session.userId);
    h.set("x-user-agent-id", session.agentId);
    h.set("x-user-role",     session.role);
    h.set("x-user-level",    String(Math.max(0, Math.min(5, Math.floor(session.level ?? 0)))));
    return NextResponse.next({ request: { headers: h } });
  }

  // ── その他の API は個別に認証するのでスキップ ─────────────────
  if (pathname.startsWith("/api/")) {
    // ヘッダー偽装だけ除去して通す
    const h = new Headers(req.headers);
    h.delete("x-user-level");
    h.delete("x-user-role");
    if (session) {
      h.set("x-user-id",       session.userId);
      h.set("x-user-agent-id", session.agentId);
      h.set("x-user-role",     session.role);
      h.set("x-user-level",    String(Math.max(0, Math.min(5, Math.floor(session.level ?? 0)))));
    }
    return NextResponse.next({ request: { headers: h } });
  }

  // ── ページルート: 未認証はログインへ ─────────────────────────
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete("kai_token");
    return res;
  }

  // ── 管理者ページのアクセス制御 ────────────────────────────────
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!["admin", "super_admin"].includes(session.role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/admin/db-editor") && session.role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // ── セッション情報をヘッダーに注入（Server Components で利用） ─
  const requestHeaders = new Headers(req.headers);
  // クライアント送信値を削除してからサーバー値を注入
  requestHeaders.delete("x-user-level");
  requestHeaders.delete("x-user-role");
  requestHeaders.set("x-user-id",       session.userId);
  requestHeaders.set("x-user-level",    String(Math.max(0, Math.min(5, Math.floor(session.level ?? 0)))));
  requestHeaders.set("x-user-role",     session.role);
  requestHeaders.set("x-user-agent-id", session.agentId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|manifest.json).*)",
  ],
};
