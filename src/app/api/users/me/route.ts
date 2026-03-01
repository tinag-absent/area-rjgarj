/**
 * src/app/api/users/me/route.ts
 *
 * GET /api/users/me — 認証済みユーザーの最新情報をサーバーから返す。
 *
 * [SECURITY FIX #1] クライアント側の localStorage に保存されたキャッシュに依存せず、
 * 常にサーバーの正規値（role / level / xp / anomalyScore 等）を返す。
 */
import { NextRequest } from "next/server";
import { getAuthUser, unauthorized, formatUserResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  return Response.json(
    formatUserResponse(user),
    {
      headers: {
        // 個人情報はキャッシュしない
        "Cache-Control": "no-store, no-cache",
        "Pragma":        "no-cache",
      },
    }
  );
}
