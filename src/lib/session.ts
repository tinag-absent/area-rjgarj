/**
 * src/lib/session.ts
 * JWT ベースのセッション管理。
 * proxy.ts (middleware) と (auth)/layout.tsx から利用する。
 */
import { verifyToken } from "./auth";

// ── セッションに保存するデータ ────────────────────────────────────
export interface SessionData {
  userId:  string;
  agentId: string;
  role:    string;
  level?:  number;
}

/**
 * JWT Cookie トークンを検証してセッションデータを返す。
 * middleware / Server Component 内で利用する。
 * @param token  "kai_token" Cookie の値（undefined / null 可）
 * @returns SessionData | null
 */
export async function getSessionFromCookie(
  token: string | undefined | null
): Promise<SessionData | null> {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    userId:  payload.userId,
    agentId: payload.agentId,
    role:    payload.role,
    level:   payload.level,
  };
}

// SESSION_OPTIONS は iron-session が不要になったため削除。
// 旧インポート互換用にダミーエクスポートは残さない（型エラーを防ぐため）。
