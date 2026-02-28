/**
 * lib/rate-limit.ts — ログイン試行レート制限ユーティリティ
 *
 * Turso DB の rate_limit_attempts テーブルを使い、
 * IPアドレスとアカウントIDごとにログイン失敗回数を記録する。
 * 外部依存なし・Edge Runtime非対応（Node.js Route Handlerで使用）。
 *
 * 制限値:
 *   IP単位:      10分以内に20回失敗でロック（分散攻撃対策）
 *   アカウント単位: 10分以内に10回失敗でロック（標的型攻撃対策）
 */

import { getDb, execute, query } from "./db";

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS_PER_IP = 20;
const MAX_ATTEMPTS_PER_ACCOUNT = 10;
const LOCKOUT_MINUTES = 15;

export interface RateLimitResult {
  allowed: boolean;
  /** ロック解除までの残り秒数（allowed=false の場合のみ） */
  retryAfterSeconds?: number;
  /** 残り試行可能回数 */
  remainingAttempts?: number;
}

/**
 * ログイン試行を記録し、制限を超えていないか確認する。
 * DBテーブルが存在しない場合は通過させる（後方互換）。
 */
export async function checkLoginRateLimit(
  ip: string | null,
  agentId: string
): Promise<RateLimitResult> {
  const db = getDb();

  try {
    // テーブルが存在しない場合は作成
    await execute(db, `
      CREATE TABLE IF NOT EXISTS rate_limit_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_type TEXT NOT NULL,
        key_value TEXT NOT NULL,
        attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
        success INTEGER NOT NULL DEFAULT 0
      )
    `);
    await execute(db, `
      CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time
      ON rate_limit_attempts(key_type, key_value, attempted_at)
    `);

    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    // IP単位のチェック
    if (ip) {
      const ipRows = await query<{ count: number }>(db, `
        SELECT COUNT(*) AS count FROM rate_limit_attempts
        WHERE key_type = 'ip' AND key_value = ?
          AND attempted_at >= ? AND success = 0
      `, [ip, windowStart]);

      const ipCount = ipRows[0]?.count ?? 0;
      if (ipCount >= MAX_ATTEMPTS_PER_IP) {
        // ロック解除時刻を計算
        const oldestRow = await query<{ attempted_at: string }>(db, `
          SELECT attempted_at FROM rate_limit_attempts
          WHERE key_type = 'ip' AND key_value = ? AND success = 0
          ORDER BY attempted_at ASC LIMIT 1
        `, [ip]);
        const oldestAt = oldestRow[0]?.attempted_at
          ? new Date(oldestRow[0].attempted_at).getTime()
          : Date.now();
        const unlockAt = oldestAt + LOCKOUT_MINUTES * 60 * 1000;
        const retryAfterSeconds = Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000));

        return { allowed: false, retryAfterSeconds };
      }
    }

    // アカウント単位のチェック
    const accountRows = await query<{ count: number }>(db, `
      SELECT COUNT(*) AS count FROM rate_limit_attempts
      WHERE key_type = 'account' AND key_value = ?
        AND attempted_at >= ? AND success = 0
    `, [agentId.toLowerCase(), windowStart]);

    const accountCount = accountRows[0]?.count ?? 0;
    if (accountCount >= MAX_ATTEMPTS_PER_ACCOUNT) {
      const oldestRow = await query<{ attempted_at: string }>(db, `
        SELECT attempted_at FROM rate_limit_attempts
        WHERE key_type = 'account' AND key_value = ? AND success = 0
        ORDER BY attempted_at ASC LIMIT 1
      `, [agentId.toLowerCase()]);
      const oldestAt = oldestRow[0]?.attempted_at
        ? new Date(oldestRow[0].attempted_at).getTime()
        : Date.now();
      const unlockAt = oldestAt + LOCKOUT_MINUTES * 60 * 1000;
      const retryAfterSeconds = Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000));

      return { allowed: false, retryAfterSeconds };
    }

    const remainingIp = ip ? MAX_ATTEMPTS_PER_IP - (await query<{ count: number }>(db, `
      SELECT COUNT(*) AS count FROM rate_limit_attempts
      WHERE key_type = 'ip' AND key_value = ? AND attempted_at >= ? AND success = 0
    `, [ip, windowStart]).then(r => r[0]?.count ?? 0)) : MAX_ATTEMPTS_PER_IP;

    const remainingAccount = MAX_ATTEMPTS_PER_ACCOUNT - accountCount;

    return {
      allowed: true,
      remainingAttempts: Math.min(remainingIp, remainingAccount),
    };
  } catch (err) {
    // DBエラーはログのみ、通過させる（可用性優先）
    console.error("[rate-limit] チェック失敗、通過します:", err);
    return { allowed: true };
  }
}

/**
 * ログイン試行結果を記録する。
 * success=true の場合、そのアカウントの失敗レコードをリセット。
 */
export async function recordLoginAttempt(
  ip: string | null,
  agentId: string,
  success: boolean
): Promise<void> {
  const db = getDb();

  try {
    if (success) {
      // 成功時：そのアカウントとIPの失敗記録をクリア
      await execute(db, `
        DELETE FROM rate_limit_attempts
        WHERE key_type = 'account' AND key_value = ? AND success = 0
      `, [agentId.toLowerCase()]);
      if (ip) {
        await execute(db, `
          DELETE FROM rate_limit_attempts
          WHERE key_type = 'ip' AND key_value = ? AND success = 0
        `, [ip]);
      }
      return;
    }

    // 失敗を記録
    if (ip) {
      await execute(db, `
        INSERT INTO rate_limit_attempts (key_type, key_value, success)
        VALUES ('ip', ?, 0)
      `, [ip]);
    }
    await execute(db, `
      INSERT INTO rate_limit_attempts (key_type, key_value, success)
      VALUES ('account', ?, 0)
    `, [agentId.toLowerCase()]);

    // 古いレコードを定期削除（1時間以上前）
    await execute(db, `
      DELETE FROM rate_limit_attempts
      WHERE attempted_at < datetime('now', '-1 hour')
    `);
  } catch (err) {
    console.error("[rate-limit] 記録失敗:", err);
  }
}
