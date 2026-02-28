/**
 * types/user.ts — ユーザー関連型定義
 */

export interface User {
  id: string;          // agentId (K-XXX-XXX)
  _uuid: string;       // internal DB uuid
  name: string;
  role: "player" | "admin" | "super_admin";
  status: "active" | "suspended" | "banned" | "pending_verification";
  level: number;       // clearance_level 0-5
  xp: number;
  division: string;    // slug
  divisionName: string;
  anomalyScore: number;
  observerLoad: number;
  lastLogin: string | null;
  loginCount: number;
  streak: number;
}

export interface StoryState {
  flags: Record<string, unknown>;
  variables: Record<string, number>;
  history: Array<{ eventId: string; time: number }>;
  firedSet: Record<string, boolean>;
}
