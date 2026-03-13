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
/** SQLite datetime('now') と比較できる形式 YYYY-MM-DD HH:MM:SS */
function toSqliteDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}


// [I-003] サーバーレス環境ではプロセス再起動時にリセットされるが、
// CREATE TABLE IF NOT EXISTS は冪等なため実害は軽微。
// global に保持することで同一プロセス内での重複実行を抑制する。
declare global {
  // eslint-disable-next-line no-var
  var _rateLimitTableEnsured: boolean | undefined;
}
/** @internal */
function isTableEnsured() { return !!globalThis._rateLimitTableEnsured; }
/** @internal */
function setTableEnsured() { globalThis._rateLimitTableEnsured = true; }

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
    // テーブルが存在しない場合は作成（初回のみ）
    if (!isTableEnsured()) {
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
      setTableEnsured();
    }

    const windowStart = toSqliteDateTime(new Date(Date.now() - WINDOW_MINUTES * 60 * 1000));

    // IP単位のチェック
    let ipRows: { count: number }[] = [];
    if (ip) {
      ipRows = await query<{ count: number }>(db, `
        SELECT COUNT(*) AS count FROM rate_limit_attempts
        WHERE key_type = 'ip' AND key_value = ?
          AND attempted_at >= ? AND success = 0
      `, [ip, windowStart]);

      const ipCount = ipRows[0]?.count ?? 0;
      if (ipCount >= MAX_ATTEMPTS_PER_IP) {
        // [FIX BUG#22] 最古ではなく最新レコード基準でロック解除時刻を計算
        // 最古基準だとレコード削除時に即ロック解除される問題を修正
        const latestRow = await query<{ attempted_at: string }>(db, `
          SELECT attempted_at FROM rate_limit_attempts
          WHERE key_type = 'ip' AND key_value = ? AND success = 0
          ORDER BY attempted_at DESC LIMIT 1
        `, [ip]);
        const latestAt = latestRow[0]?.attempted_at
          ? new Date(latestRow[0].attempted_at.replace(' ', 'T') + 'Z').getTime()
          : Date.now();
        const unlockAt = latestAt + LOCKOUT_MINUTES * 60 * 1000;
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
      // [FIX BUG#22] 最新レコード基準でロック解除時刻を計算
      const latestRow = await query<{ attempted_at: string }>(db, `
        SELECT attempted_at FROM rate_limit_attempts
        WHERE key_type = 'account' AND key_value = ? AND success = 0
        ORDER BY attempted_at DESC LIMIT 1
      `, [agentId.toLowerCase()]);
      const latestAt = latestRow[0]?.attempted_at
        ? new Date(latestRow[0].attempted_at.replace(' ', 'T') + 'Z').getTime()
        : Date.now();
      const unlockAt = latestAt + LOCKOUT_MINUTES * 60 * 1000;
      const retryAfterSeconds = Math.max(0, Math.ceil((unlockAt - Date.now()) / 1000));

      return { allowed: false, retryAfterSeconds };
    }

    // すでに取得済みの ipCount を再利用（二重クエリを排除）
    const ipCountFinal = ip ? (ipRows[0]?.count ?? 0) : 0;
    const remainingIp = ip ? MAX_ATTEMPTS_PER_IP - ipCountFinal : MAX_ATTEMPTS_PER_IP;
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
 * 登録試行レート制限（ログイン用カウンターと分離）。
 * IP 単位: 10分以内に5回まで。
 */
export async function checkRegisterRateLimit(
  ip: string | null,
): Promise<RateLimitResult> {
  const db = getDb();
  try {
    if (!isTableEnsured()) {
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
      setTableEnsured();
    }

    if (!ip) return { allowed: true };

    const windowStart = toSqliteDateTime(new Date(Date.now() - WINDOW_MINUTES * 60 * 1000));
    const rows = await query<{ count: number }>(db, `
      SELECT COUNT(*) AS count FROM rate_limit_attempts
      WHERE key_type = 'register_ip' AND key_value = ?
        AND attempted_at >= ? AND success = 0
    `, [ip, windowStart]);

    const count = rows[0]?.count ?? 0;
    const MAX_REGISTER_PER_IP = 5;
    if (count >= MAX_REGISTER_PER_IP) {
      // [BUG-H FIX] OLDEST → LATEST に変更してスライディングウィンドウに統一。
      // ログインレート制限（[FIX BUG#22]）と同じ方式にすることで
      // 攻撃者がウィンドウ切れを待つだけでブロックを回避できる問題を修正。
      const latestRow = await query<{ attempted_at: string }>(db, `
        SELECT attempted_at FROM rate_limit_attempts
        WHERE key_type = 'register_ip' AND key_value = ? AND success = 0
        ORDER BY attempted_at DESC LIMIT 1
      `, [ip]);
      const latestAt = latestRow[0]?.attempted_at
        ? new Date(latestRow[0].attempted_at.replace(' ', 'T') + 'Z').getTime()
        : Date.now();
      const retryAfterSeconds = Math.max(0, Math.ceil((latestAt + LOCKOUT_MINUTES * 60 * 1000 - Date.now()) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, remainingAttempts: MAX_REGISTER_PER_IP - count };
  } catch (err) {
    console.error("[rate-limit] 登録チェック失敗、通過します:", err);
    return { allowed: true };
  }
}

export async function recordRegisterAttempt(
  ip: string | null,
  success: boolean,
): Promise<void> {
  const db = getDb();
  try {
    if (success) {
      if (ip) {
        await execute(db, `
          DELETE FROM rate_limit_attempts
          WHERE key_type = 'register_ip' AND key_value = ? AND success = 0
        `, [ip]);
      }
      return;
    }
    if (ip) {
      await execute(db, `
        INSERT INTO rate_limit_attempts (key_type, key_value, success)
        VALUES ('register_ip', ?, 0)
      `, [ip]);
    }
  } catch (err) {
    console.error("[rate-limit] 登録記録失敗:", err);
  }
}
/**
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
      // [FIX-H08] 成功時はそのアカウントの失敗記録のみクリアする。
      // IP ベースのカウンタは独立して管理し、1回の成功でリセットしない。
      // これにより攻撃者が1アカウントで成功しても残りの IP カウンタが残る。
      await execute(db, `
        DELETE FROM rate_limit_attempts
        WHERE key_type = 'account' AND key_value = ? AND success = 0
      `, [agentId.toLowerCase()]);
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

    // [FIX-M14] 古いレコードを定期削除（1日以上前）
    await execute(db, `
      DELETE FROM rate_limit_attempts
      WHERE attempted_at < datetime('now', '-1 day')
    `);
  } catch (err) {
    console.error("[rate-limit] 記録失敗:", err);
  }
}
