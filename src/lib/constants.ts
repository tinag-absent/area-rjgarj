/**
 * lib/constants.ts — ゲーム定数
 */

export const LEVEL_THRESHOLDS: Record<number, number> = {
  0: 0,
  1: 100,
  2: 300,
  3: 600,
  4: 1200,
  5: 2500,
};

export const XP_REWARDS: Record<string, number> = {
  first_login: 50,
  profile_view: 10,
  chat_message: 5,
  division_view: 20,
  codex_view: 30,
  mission_complete: 100,
  daily_login: 25,
  location_view: 15,
  entity_view: 15,
  module_view: 15,
  search_use: 8,
  bookmark_add: 5,
};

export const DAILY_LOGIN_REWARDS: Record<number, number> = {
  1: 25,
  2: 30,
  3: 35,
  4: 40,
  5: 45,
  6: 50,
  7: 100,
};

export const AGENT_ID_REGEX = /^[A-Z]-\d{3}-\d{3}$/;

export function calculateLevel(xp: number): number {
  let level = 0;
  for (let l = 5; l >= 0; l--) {
    if (xp >= (LEVEL_THRESHOLDS[l] || 0)) {
      level = l;
      break;
    }
  }
  return level;
}

// seed.mjs / divisions テーブルと完全一致（工作部門=engineering, 外事部門=foreign, 支援部門=support）
export const DIVISIONS = [
  { slug: "convergence", name: "収束部門", nameEn: "Convergence Division" },
  { slug: "engineering", name: "工作部門", nameEn: "Engineering Division" },
  { slug: "foreign",     name: "外事部門", nameEn: "Foreign Affairs Division" },
  { slug: "port",        name: "港湾部門", nameEn: "Port Division" },
  { slug: "support",     name: "支援部門", nameEn: "Support Division" },
] as const;

export type DivisionSlug = typeof DIVISIONS[number]["slug"];

export const LEVEL_REQUIRED: Record<string, number> = {
  dashboard: 0,
  divisions: 1,
  chat: 1,
  map: 1,
  history: 1,
  codex: 1,
  reports: 1,
  "agency-history": 1,
  novel: 1,
  "skill-tree": 1,
  entities: 2,
  modules: 2,
  statistics: 2,
  "entity-detail": 2,
  "location-detail": 1,
  "module-detail": 2,
  missions: 4,
  search: 4,
  "mission-detail": 4,
  classified: 5,
  "personnel-detail": 5,
};
