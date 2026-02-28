/**
 * scripts/seed.mjs
 * 初期データ投入（部門マスタ + 管理者アカウント）
 *
 * 実行: node --env-file=.env.local scripts/seed.mjs
 */

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const DIVISIONS = [
  { id: crypto.randomUUID(), slug: 'convergence', name: '収束部門', is_active: 1 },
  { id: crypto.randomUUID(), slug: 'engineering', name: '工作部門', is_active: 1 },
  { id: crypto.randomUUID(), slug: 'foreign',     name: '外事部門', is_active: 1 },
  { id: crypto.randomUUID(), slug: 'port',        name: '港湾部門', is_active: 1 },
  { id: crypto.randomUUID(), slug: 'support',     name: '支援部門', is_active: 1 },
];

async function seed() {
  console.log('シード開始...');

  // 部門
  for (const d of DIVISIONS) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO divisions (id, slug, name, is_active) VALUES (?, ?, ?, ?)`,
      args: [d.id, d.slug, d.name, d.is_active],
    });
    console.log(`  ✓ division: ${d.slug}`);
  }

  // super_admin アカウント
  const adminId   = crypto.randomUUID();
  const adminHash = await bcrypt.hash('admin_2026', 12);
  await db.execute({
    sql: `INSERT OR IGNORE INTO users
            (id, username, email, password_hash, display_name, role, status, clearance_level, email_verified, created_at)
          VALUES (?, 'K-000-ADMIN', 'admin@kaishoku.local', ?, 'SUPER ADMIN', 'super_admin', 'active', 5, 1, datetime('now'))`,
    args: [adminId, adminHash],
  });
  console.log('  ✓ super_admin account: K-000-ADMIN');
  console.log('  　username : K-000-ADMIN');
  console.log('  　password : admin_2026');
  console.log('  ⚠️ ログイン後すぐにパスワードを変更してください！');

  console.log('シード完了！');
}

seed().catch(err => {
  console.error('シード失敗:', err.message);
  process.exit(1);
});
