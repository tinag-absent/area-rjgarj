/**
 * lib/server-auth.ts — Route Handler用認証ヘルパー
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type JwtPayload } from "./auth";

export function getAuthUser(req: NextRequest): JwtPayload | null {
  // HttpOnly Cookie優先
  const cookieToken = req.cookies.get("kai_token")?.value;
  // Authorizationヘッダーも受け付ける（APIクライアント後方互換）
  const headerToken = req.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  const token = cookieToken || headerToken;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(
  req: NextRequest
): { user: JwtPayload } | NextResponse {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "認証トークンがありません" },
      { status: 401 }
    );
  }
  return { user };
}

export function requireAdmin(
  req: NextRequest
): { user: JwtPayload } | NextResponse {
  const result = requireAuth(req);
  if (result instanceof NextResponse) return result;
  if (!["admin", "super_admin"].includes(result.user.role)) {
    return NextResponse.json(
      { error: "管理者権限が必要です" },
      { status: 403 }
    );
  }
  return result;
}

export function setAuthCookie(
  res: NextResponse,
  token: string
): NextResponse {
  res.cookies.set("kai_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7日
    path: "/",
  });
  return res;
}

export function requireSuperAdmin(
  req: NextRequest
): { user: JwtPayload } | NextResponse {
  const result = requireAuth(req);
  if (result instanceof NextResponse) return result;
  if (result.user.role !== "super_admin") {
    return NextResponse.json(
      { error: "super_admin権限が必要です" },
      { status: 403 }
    );
  }
  return result;
}
