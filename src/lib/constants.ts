/**
 * src/lib/constants.ts
 * progress-config.json と同期したレベル・XP 定数。
 * サーバー側とクライアント側の両方で利用する。
 */

// XP 閾値（progress-config.json の levelThresholds と同一）
export const LEVEL_THRESHOLDS: Record<number, number> = {
  0:    0,
  1:  100,
  2:  300,
  3:  600,
  4: 1200,
  5: 2500,
};

export const MAX_LEVEL = 5;

/** XP 量からレベルを計算する */
export function calculateLevel(xp: number): number {
  let level = 0;
  for (let lv = MAX_LEVEL; lv >= 0; lv--) {
    if (xp >= LEVEL_THRESHOLDS[lv]) { level = lv; break; }
  }
  return level;
}

// XP 報酬（progress-config.json の xpRewards と同一）
export const XP_REWARDS: Record<string, number> = {
  first_login:      50,
  profile_view:     10,
  chat_message:      5,
  division_view:    20,
  phenomenon_view:  30,
  mission_complete: 100,
  daily_login:      25,
  location_view:    15,
  entity_view:      15,
  module_view:      15,
  search_use:        8,
  bookmark_add:      5,
};

// 連続ログイン日数ボーナス
export const DAILY_LOGIN_REWARDS: Record<number, number> = {
  1: 25, 2: 30, 3: 35, 4: 40, 5: 45, 6: 50, 7: 100,
};

// 1時間あたりの同一アクティビティ XP 付与上限回数
export const XP_RATE_LIMITS: Record<string, number> = {
  chat_message:   20,  // 1時間に20回まで
  profile_view:    5,
  entity_view:    10,
  location_view:  10,
  module_view:    10,
  search_use:     15,
  bookmark_add:   10,
};

// 許可されたチャットチャンネル（サーバー・クライアント共通のホワイトリスト）
export const ALLOWED_CHAT_CHANNELS = new Set([
  "global",
  "npc_group",
  "division_convergence",
  "division_engineering",
  "division_foreign",
  "division_port",
  "division_support",
]);

export const MAX_CHAT_MESSAGE_LENGTH = 1000;

// 機関員 ID のフォーマット（例: K-ABC-123）
export const AGENT_ID_REGEX = /^[A-Z]-[A-Z]{3}-[0-9]{3}$/;

// 部門一覧（登録・転属フォームで使用）
export const DIVISIONS: { slug: string; name: string }[] = [
  { slug: "convergence",  name: "収束部門" },
  { slug: "port",         name: "港湾部門" },
  { slug: "engineering",  name: "工作部門" },
  { slug: "foreign",      name: "対外部門" },
  { slug: "support",      name: "支援部門" },
];
