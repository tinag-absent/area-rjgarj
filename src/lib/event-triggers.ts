/**
 * lib/event-triggers.ts — ストーリーイベント自動発火システム
 * 
 * TRIGGERS定義: 条件を満たしたユーザーに対してフラグ・XP・通知を自動付与する
 */

export interface TriggerUser {
  userId: string;
  level: number;
  xp: number;
  anomalyScore: number;
  observerLoad: number;
  loginCount: number;
  streak: number;
  flags: Record<string, unknown>;
  firedEvents: string[];
}

export interface TriggerEffect {
  flag?: string;
  flagValue?: string;
  xp?: number;
  notification?: { type: string; title: string; body: string };
}

export interface Trigger {
  id: string;
  conditions: (user: TriggerUser) => boolean;
  effects: TriggerEffect;
}

export const TRIGGERS: Trigger[] = [
  {
    id: "first_login_complete",
    conditions: (u) => u.loginCount >= 1 && !u.flags["first_login_done"],
    effects: {
      flag: "first_login_done",
      xp: 50,
      notification: { type: "info", title: "初回ログイン記録", body: "あなたの初回ログインが機関システムに記録されました。+50XP" },
    },
  },
  {
    id: "streak_3days",
    conditions: (u) => u.streak >= 3 && !u.flags["streak_3days_done"],
    effects: {
      flag: "streak_3days_done",
      xp: 30,
      notification: { type: "info", title: "3日連続ログイン達成", body: "継続的な活動記録。機関はあなたの献身を評価します。+30XP" },
    },
  },
  {
    id: "streak_7days",
    conditions: (u) => u.streak >= 7 && !u.flags["streak_7days_done"],
    effects: {
      flag: "streak_7days_done",
      xp: 100,
      notification: { type: "info", title: "7日連続ログイン達成", body: "一週間の継続活動。機関内での評判が高まっています。+100XP" },
    },
  },
  {
    id: "level2_reached",
    conditions: (u) => u.level >= 2 && !u.flags["level2_unlocked"],
    effects: {
      flag: "level2_unlocked",
      notification: { type: "info", title: "クリアランスLV2取得", body: "実体カタログ・統計情報へのアクセスが解放されました。" },
    },
  },
  {
    id: "level3_reached",
    conditions: (u) => u.level >= 3 && !u.flags["level3_unlocked"],
    effects: {
      flag: "level3_unlocked",
      notification: { type: "warning", title: "クリアランスLV3取得", body: "上級要員認定。機関の核心情報に近づきつつあります。" },
    },
  },
  {
    id: "level4_reached",
    conditions: (u) => u.level >= 4 && !u.flags["level4_unlocked"],
    effects: {
      flag: "level4_unlocked",
      notification: { type: "warning", title: "クリアランスLV4取得", body: "機密取扱者認定。収束案件へのアクセスが解放されました。" },
    },
  },
  {
    id: "level5_reached",
    conditions: (u) => u.level >= 5 && !u.flags["level5_unlocked"],
    effects: {
      flag: "level5_unlocked",
      xp: 200,
      notification: { type: "critical", title: "クリアランスLV5取得 — 最高幹部認定", body: "機密情報ページへのアクセスが解放されました。あなたは引き返せない場所に来ました。" },
    },
  },
  {
    id: "anomaly_detected",
    conditions: (u) => u.anomalyScore > 30 && !u.flags["anomaly_detected"],
    effects: {
      flag: "anomaly_detected",
      notification: { type: "warning", title: "異常スコア警告", body: "あなたの行動パターンに異常が検出されました。スコア: " + "—" },
    },
  },
  {
    id: "observer_warned",
    conditions: (u) => u.observerLoad > 70 && !u.flags["observer_warned"],
    effects: {
      flag: "observer_warned",
      notification: { type: "critical", title: "オブザーバー負荷警告", body: "観測者の干渉が臨界値に近づいています。" },
    },
  },
  {
    id: "first_access_classified",
    conditions: (u) => u.level >= 5 && !u.flags["classified_accessed"],
    effects: {
      flag: "classified_accessed",
      xp: 200,
      notification: { type: "critical", title: "機密情報アクセス記録", body: "本ページへのアクセスがシステムに永久記録されました。" },
    },
  },
];
