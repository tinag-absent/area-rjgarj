/**
 * GET /api/auth/verify-email
 * メール認証は廃止済み。ログインページへリダイレクト。
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.redirect(
    new URL("/login", req.url)
  );
}
