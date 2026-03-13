/**
 * scripts/seed.mjs
 * 初期データ投入スクリプト
 *
 * 実行: node --env-file=.env.local scripts/seed.mjs
 *
 * 投入内容:
 *   1. 部門マスタ（5部門）
 *   2. super_admin アカウント
 *   3. balance_config（XP・レベル設定）
 *   4. rate_limit_attempts テーブル保証（migrate 漏れ対策）
 *   5. password_changed_at カラム保証（migrate 漏れ対策）
 *
 * ※ すべて INSERT OR IGNORE / ON CONFLICT DO NOTHING のため
 *    2回目以降の実行は安全にスキップされます。
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ── DB 接続 ────────────────────────────────────────────────────
const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── 部門マスタ ─────────────────────────────────────────────────
// constants.ts の DIVISIONS と同期すること
const DIVISIONS = [
  { slug: 'convergence', name: '収束部門' },
  { slug: 'engineering', name: '工作部門' },
  { slug: 'foreign',     name: '対外部門' },
  { slug: 'port',        name: '港湾部門' },
  { slug: 'support',     name: '支援部門' },
];

// ── バランス設定デフォルト値 ───────────────────────────────────
// src/app/api/admin/balance/route.ts の DEFAULTS と同期すること
const BALANCE_DEFAULTS = {
  levelThresholds:  { '0': 0, '1': 100, '2': 300, '3': 600, '4': 1200, '5': 2500 },
  xpRewards: {
    first_login: 50, profile_view: 10, chat_message: 5,
    division_view: 20, codex_view: 30, mission_complete: 100,
    daily_login: 25, location_view: 15, entity_view: 15,
    module_view: 15, search_use: 8, bookmark_add: 5,
  },
  dailyLoginRewards: { '1': 25, '2': 30, '3': 35, '4': 40, '5': 45, '6': 50, '7': 100 },
};

// ── ヘルパー ───────────────────────────────────────────────────
function genPassword(len = 16) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ── メイン ─────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 シード開始...');

  // ── 0. migrate 漏れカラムを保証 ──────────────────────────────
  section('STEP 0: カラム補完');
  const extraColumns = [
    `ALTER TABLE users ADD COLUMN password_changed_at TEXT`,
  ];
  for (const sql of extraColumns) {
    try {
      await db.execute(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
      console.log(`  ✓ users.${col} を追加`);
    } catch (err) {
      if (err.message?.includes('duplicate column')) {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1];
        console.log(`  — users.${col} は既に存在（スキップ）`);
      } else {
        throw err;
      }
    }
  }

  // rate_limit_attempts テーブルが migrate.mjs にない場合の保証
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address   TEXT,
      identifier   TEXT,
      attempt_type TEXT    NOT NULL DEFAULT 'login',
      success      INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_type
      ON rate_limit_attempts (ip_address, attempt_type, created_at)
  `);
  console.log('  ✓ rate_limit_attempts テーブル保証');

  // ── 1. 部門マスタ ─────────────────────────────────────────────
  section('STEP 1: 部門マスタ');
  for (const d of DIVISIONS) {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT OR IGNORE INTO divisions (id, slug, name, is_active, created_at)
            VALUES (?, ?, ?, 1, datetime('now'))`,
      args: [id, d.slug, d.name],
    });
    // 既存レコードがあれば name だけ更新（名称変更対応）
    await db.execute({
      sql: `UPDATE divisions SET name = ? WHERE slug = ?`,
      args: [d.name, d.slug],
    });
    console.log(`  ✓ ${d.slug}（${d.name}）`);
  }

  // ── 2. super_admin アカウント ─────────────────────────────────
  section('STEP 2: super_admin アカウント');

  // convergence 部門のIDを取得（admin の所属部門）
  const divRow = await db.execute({
    sql: `SELECT id FROM divisions WHERE slug = 'convergence' LIMIT 1`,
    args: [],
  });
  const adminDivisionId = divRow.rows[0]?.[0] ?? null;

  // パスワード決定（環境変数 > ランダム生成）
  const initialPassword = (process.env.SEED_ADMIN_PASSWORD?.length >= 8)
    ? process.env.SEED_ADMIN_PASSWORD
    : genPassword(16);
  const passwordHash = await bcrypt.hash(initialPassword, 12);

  const adminId = crypto.randomUUID();
  const { rowsAffected } = await db.execute({
    sql: `INSERT OR IGNORE INTO users (
            id, username, email, password_hash,
            display_name, role, status,
            clearance_level, xp_total, division_id,
            email_verified, login_count, consecutive_login_days,
            created_at
          ) VALUES (
            ?, 'K-000-ADMIN', 'admin@kaishoku.local', ?,
            'SUPER ADMIN', 'super_admin', 'active',
            5, 2500, ?,
            1, 0, 0,
            datetime('now')
          )`,
    args: [adminId, passwordHash, adminDivisionId],
  });

  if (rowsAffected === 0) {
    console.log('  — K-000-ADMIN は既に存在します（スキップ）');
    console.log('    ※ パスワードを変更したい場合は管理画面か _reset_admin.mjs を使用してください');
  } else {
    console.log('  ✓ K-000-ADMIN を作成しました');
    console.log('');
    console.log('  ┌──────────────────────────────────────────┐');
    console.log('  │  機関員ID : K-000-ADMIN                  │');
    console.log(`  │  パスキー : ${initialPassword.padEnd(28)}  │`);
    console.log('  │                                          │');
    console.log('  │  ⚠ この画面以降は表示されません。       │');
    console.log('  │    今すぐメモしてください！              │');
    console.log('  └──────────────────────────────────────────┘');
    console.log('');
  }

  // ── 3. balance_config ─────────────────────────────────────────
  section('STEP 3: balance_config（XP・レベル設定）');
  for (const [key, value] of Object.entries(BALANCE_DEFAULTS)) {
    await db.execute({
      sql: `INSERT INTO balance_config (config_key, config_value, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(config_key) DO NOTHING`,
      args: [key, JSON.stringify(value)],
    });
    console.log(`  ✓ ${key}`);
  }

  // ── 完了 ──────────────────────────────────────────────────────
  section('完了');
  console.log('  🎉 シード完了！');
  console.log('');
  console.log('  次のステップ:');
  console.log('    1. Vercel に TURSO_DATABASE_URL / TURSO_AUTH_TOKEN / JWT_SECRET を設定');
  console.log('    2. デプロイ後に https://your-domain.vercel.app/login でログイン');
  console.log('    3. ログイン後すぐにパスワードを変更してください');
  console.log('');
}

seed().catch(err => {
  console.error('\n❌ シード失敗:', err.message);
  console.error(err.stack);
  process.exit(1);
});
