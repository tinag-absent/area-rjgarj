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
 *
 * [FIX-H01] role は DB の最新値を使う。
 * JWT の role は最大7日間古い可能性があるため、DB から毎回取得して上書きする。
 * middleware は Edge Runtime 非対応のため Node.js ランタイムで動作させること。
 *
 * @param token  "kai_token" Cookie の値（undefined / null 可）
 * @returns SessionData | null
 */
export async function getSessionFromCookie(
  token: string | undefined | null
): Promise<SessionData | null> {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const { getDb } = await import("./db");
    const db = getDb();
    const rows = await db.execute({
      sql: `SELECT role, clearance_level, status, password_changed_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      args: [payload.userId],
    });
    const row = rows.rows[0] as unknown as {
      role: string;
      clearance_level: number | bigint;
      status: string;
      password_changed_at: string | null;
    } | undefined;
    if (!row) return null;

    if (["banned", "suspended", "inactive", "pending"].includes(row.status)) return null;

    // パスワード変更後に発行された古いトークンを無効化する
    if (row.password_changed_at) {
      const pwChangedAt = new Date(row.password_changed_at).getTime();
      const tokenIat = (payload as typeof payload & { iat?: number }).iat;
      if (tokenIat && tokenIat * 1000 < pwChangedAt) {
        return null;
      }
    }

    return {
      userId:  payload.userId,
      agentId: payload.agentId,
      role:    row.role,
      // clearance_level は libsql から bigint で返る場合があるため Number() で変換する
      level:   Number(row.clearance_level),
    };
  } catch {
    // DB 接続失敗時は JWT の値にフォールバック（可用性優先）
    return {
      userId:  payload.userId,
      agentId: payload.agentId,
      role:    payload.role,
      level:   payload.level,
    };
  }
}

// SESSION_OPTIONS は iron-session が不要になったため削除。
// 旧インポート互換用にダミーエクスポートは残さない（型エラーを防ぐため）。
