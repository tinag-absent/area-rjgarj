/**
 * scripts/migrate.mjs
 * Turso/libSQL 用テーブル作成マイグレーション
 *
 * 実行: node --env-file=.env.local scripts/migrate.mjs
 */

import { createClient } from '@libsql/client';

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const TABLES = [
  // ── ユーザー ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id                     TEXT    PRIMARY KEY,
    username               TEXT    NOT NULL UNIQUE,
    email                  TEXT    NOT NULL UNIQUE,
    password_hash          TEXT    NOT NULL,
    display_name           TEXT,
    avatar_url             TEXT,
    role                   TEXT    NOT NULL DEFAULT 'player',
    status                 TEXT    NOT NULL DEFAULT 'active',
    clearance_level        INTEGER NOT NULL DEFAULT 0,
    division_id            TEXT    REFERENCES divisions(id),
    anomaly_score          REAL    NOT NULL DEFAULT 0,
    observer_load          REAL    NOT NULL DEFAULT 0,
    xp_total               INTEGER NOT NULL DEFAULT 0,
    login_count            INTEGER NOT NULL DEFAULT 0,
    consecutive_login_days INTEGER NOT NULL DEFAULT 0,
    last_login_at          TEXT,
    last_daily_bonus_at    TEXT,
    email_verified         INTEGER NOT NULL DEFAULT 1,
    secret_question        TEXT,
    secret_answer_hash     TEXT,
    created_at             TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at             TEXT
  )`,

  // ── 部門 ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS divisions (
    id          TEXT    PRIMARY KEY,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 進捗フラグ ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS progress_flags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_key   TEXT    NOT NULL,
    flag_value TEXT    NOT NULL DEFAULT 'true',
    set_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    UNIQUE (user_id, flag_key)
  )`,

  // ── ストーリー変数 ─────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS story_variables (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    var_key   TEXT    NOT NULL,
    var_value REAL    NOT NULL DEFAULT 0,
    UNIQUE (user_id, var_key)
  )`,

  // ── 発火済みイベント ───────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS fired_events (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT    NOT NULL,
    fired_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, event_id)
  )`,

  // ── 通知 ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT    NOT NULL DEFAULT 'info',
    title      TEXT,
    body       TEXT,
    is_read    INTEGER NOT NULL DEFAULT 0,
    read_at    TEXT,
    expires_at TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── ブックマーク ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_path  TEXT    NOT NULL,
    label      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, page_path)
  )`,

  // ── 投稿 ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS posts (
    id                  TEXT    PRIMARY KEY,
    user_id             TEXT    NOT NULL REFERENCES users(id),
    division_id         TEXT    REFERENCES divisions(id),
    title               TEXT,
    body                TEXT    NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'published',
    classification      TEXT    NOT NULL DEFAULT 'UNCLASSIFIED',
    required_clearance  INTEGER NOT NULL DEFAULT 0,
    is_lore             INTEGER NOT NULL DEFAULT 0,
    slug                TEXT,
    like_count          INTEGER NOT NULL DEFAULT 0,
    comment_count       INTEGER NOT NULL DEFAULT 0,
    view_count          INTEGER NOT NULL DEFAULT 0,
    metadata            TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at          TEXT
  )`,

  // ── いいね ────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS likes (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE (user_id, post_id)
  )`,

  // ── アクセスログ ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS access_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT,
    method      TEXT    NOT NULL DEFAULT 'GET',
    path        TEXT    NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    ip_address  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── チャットメッセージ（コード側で使用するテーブル）─────────────
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id          TEXT    PRIMARY KEY,
    chat_id     TEXT    NOT NULL,
    sender_id   TEXT    NOT NULL,
    sender_name TEXT    NOT NULL,
    text        TEXT    NOT NULL,
    type        TEXT    NOT NULL DEFAULT 'user',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── チャット既読管理 ───────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS chat_read_markers (
    user_id             TEXT    NOT NULL,
    chat_id             TEXT    NOT NULL,
    last_read_message_id INTEGER,
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, chat_id)
  )`,

  // ── プレイヤー行動ログ ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS player_action_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       TEXT,
    action_type   TEXT    NOT NULL,
    action_target TEXT,
    metadata      TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── 部門移動申請 ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS division_transfer_requests (
    id               TEXT    PRIMARY KEY,
    user_id          TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_division_id TEXT    REFERENCES divisions(id),
    to_division_id   TEXT    NOT NULL REFERENCES divisions(id),
    reason           TEXT    NOT NULL DEFAULT '',
    status           TEXT    NOT NULL DEFAULT 'pending',
    reviewed_by      TEXT    REFERENCES users(id),
    reviewed_at      TEXT,
    reject_reason    TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_division_transfer_status ON division_transfer_requests (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_division_transfer_user   ON division_transfer_requests (user_id)`,

  // ── インデックス ──────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_progress_flags_user    ON progress_flags (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_story_variables_user   ON story_variables (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_fired_events_user      ON fired_events (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user         ON bookmarks (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status           ON posts (status, required_clearance)`,
  `CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs (created_at)`,

  // ── XPログ（R-001）────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS xp_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity   TEXT    NOT NULL,
    xp_gained  INTEGER NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_xp_logs_user_created ON xp_logs (user_id, created_at)`,

  // ── ミッション参加者（R-002）──────────────────────────────────
  `CREATE TABLE IF NOT EXISTS mission_participants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id  TEXT    NOT NULL,
    user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT    NOT NULL DEFAULT 'pending',
    applied_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by TEXT    REFERENCES users(id),
    UNIQUE (mission_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mission_participants_user ON mission_participants (user_id)`,

  // ── バランス設定（R-003）──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS balance_config (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key  TEXT    NOT NULL UNIQUE,
    config_value TEXT   NOT NULL,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── NPCエンジンルール（R-004）─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS npc_engine_rules (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_type    TEXT    NOT NULL,
    npc_key      TEXT    NOT NULL,
    rule_data    TEXT    NOT NULL DEFAULT '{}',
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_npc_engine_rules_type ON npc_engine_rules (rule_type, npc_key)`,

  // ── ルールエンジンエントリ（R-005）───────────────────────────
  `CREATE TABLE IF NOT EXISTS rule_engine_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_key    TEXT    NOT NULL UNIQUE,
    rule_value  TEXT    NOT NULL,
    description TEXT,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── スキルツリートラック（R-006）──────────────────────────────
  `CREATE TABLE IF NOT EXISTS skill_tree_tracks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    track_key   TEXT    NOT NULL UNIQUE,
    track_data  TEXT    NOT NULL DEFAULT '{}',
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  // ── NPC会話状態（R-007）──────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS npc_conv_states (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     TEXT    NOT NULL,
    user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    script_id   TEXT    NOT NULL,
    step_id     TEXT,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (chat_id, user_id, script_id)
  )`,

  // ── 異常ログ（R-008）─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS anomaly_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id    TEXT    NOT NULL,
    delta      REAL    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_anomaly_logs_user ON anomaly_logs (user_id, created_at)`,

  // ── chat_messagesインデックス（R-009）────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON chat_messages (chat_id, created_at)`,

  // ── メール認証トークン（廃止済み・後方互換のため保持） ──────────────────
  `CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id         TEXT    PRIMARY KEY,
    user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT    NOT NULL UNIQUE,
    expires_at TEXT    NOT NULL,
    used_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_email_verify_token   ON email_verification_tokens (token)`,
  `CREATE INDEX IF NOT EXISTS idx_email_verify_user_id ON email_verification_tokens (user_id)`,
];

// 既存DBへの追加カラム（ALTER TABLE）
const ALTER_STATEMENTS = [
  `ALTER TABLE users ADD COLUMN secret_question TEXT`,
  `ALTER TABLE users ADD COLUMN secret_answer_hash TEXT`,
];

async function migrate() {
  console.log('マイグレーション開始...');
  for (const sql of TABLES) {
    await db.execute(sql);
    const name = sql.match(/TABLE IF NOT EXISTS (\w+)/)?.[1]
               || sql.match(/INDEX IF NOT EXISTS (\w+)/)?.[1]
               || '(statement)';
    console.log(`  ✓ ${name}`);
  }

  // ALTER TABLE（カラムが既に存在する場合はエラーを無視）
  console.log('追加カラムのマイグレーション...');
  for (const sql of ALTER_STATEMENTS) {
    try {
      await db.execute(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1] || sql;
      console.log(`  ✓ ALTER TABLE users ADD ${col}`);
    } catch (err) {
      if (err.message?.includes('duplicate column')) {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1] || '?';
        console.log(`  — ${col} は既に存在します（スキップ）`);
      } else {
        throw err;
      }
    }
  }

  console.log('マイグレーション完了！');
}

migrate().catch(err => {
  console.error('マイグレーション失敗:', err.message);
  process.exit(1);
});
