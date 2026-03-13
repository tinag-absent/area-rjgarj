/**
 * src/lib/auth.ts
 * 認証ユーティリティ。
 * - JWT トークンの署名・検証
 * - パスワードのハッシュ化・検証
 * - API Route 用セッション取得ヘルパー
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb, queryOne } from "./db";

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[auth] JWT_SECRET が設定されていません。本番環境では必須です。");
    }
    return "dev-only-jwt-secret-change-in-production";
  }
  return secret;
})();

// ── JWT ──────────────────────────────────────────────────────────

export interface JwtPayload {
  userId:  string;
  agentId: string;
  role:    string;
  level:   number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ── パスワード ────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** x-user-level ヘッダーを安全に整数へ変換する（不正値は 0 に丸める）。 */
export function parseUserLevel(raw: string | null): number {
  const n = parseInt(raw ?? "0", 10);
  return Number.isInteger(n) && n >= 0 && n <= 5 ? n : 0;
}

// DB から取得するユーザー行の型
export interface DbUser {
  id: string;
  agent_id: string;
  /** agent_id の別名。username カラムを直接参照するコードとの互換性のために定義。値は agent_id と同一。 */
  username?: string;
  display_name: string;
  role: "player" | "admin" | "observer" | "super_admin";
  status: "active" | "inactive" | "suspended" | "banned" | "pending";
  clearance_level: number;
  xp_total: number;
  division: string;
  division_name: string;
  login_count: number;
  last_login_at: string | null;
  created_at: string;
  consecutive_login_days: number;
  anomaly_score: number;
  observer_load: number;
}

/**
 * API Route Handler 内で認証済みユーザーを取得する（JWT Cookie 使用）。
 * @returns DbUser | null  — セッション無効・ユーザー不在・アカウント停止なら null
 */
export async function getAuthUser(req: NextRequest): Promise<DbUser | null> {
  try {
    const token = req.cookies.get("kai_token")?.value
      ?? req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const db = getDb();
    const user = await queryOne<DbUser & { password_changed_at: string | null }>(
      db,
      `SELECT u.id, u.username AS agent_id, u.display_name, u.role, u.status,
              u.clearance_level, u.anomaly_score, u.observer_load,
              u.last_login_at, u.login_count, u.consecutive_login_days,
              u.created_at, u.password_changed_at,
              COALESCE(d.slug, '') AS division, COALESCE(d.name, '') AS division_name,
              COALESCE(u.xp_total, 0) AS xp_total
       FROM users u
       LEFT JOIN divisions d ON d.id = u.division_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [payload.userId]
    );

    // [FIX-M15] パスワード変更後に発行された古いトークンを無効化する。
    // JWT の iat（発行時刻）が password_changed_at より前ならセッション無効。
    if (user?.password_changed_at) {
      const pwChangedAt = new Date(user.password_changed_at).getTime();
      const tokenIat = (payload as typeof payload & { iat?: number }).iat;
      if (tokenIat && tokenIat * 1000 < pwChangedAt) {
        return null;
      }
    }

    // [J-002/Q-010] suspended・banned・inactive は認証拒否。
    // [BUG-07 FIX] ARGゲーム用のステータス（要観察/要緊急対応）はゲームプレイを継続させる。
    // これらをブロックすると異常スコアルールが作動した瞬間にサイレントロックアウトされる。
    // [BUG-G FIX] "pending" も認証拒否対象に追加（session.ts と統一）
    const BLOCKED_STATUSES = ["suspended", "banned", "inactive", "pending"];
    if (!user || BLOCKED_STATUSES.includes(user.status)) return null;

    return user;
  } catch {
    return null;
  }
}

/**
 * DbUser を API レスポンス用の公開フォーマットに変換する。
 */
export function formatUserResponse(u: DbUser) {
  return {
    id:           u.agent_id,
    agentId:      u.agent_id,
    name:         u.display_name,
    role:         u.role,
    status:       u.status,
    level:        u.clearance_level,
    xp:           Number(u.xp_total) || 0,
    division:     u.division,
    divisionName: u.division_name,
    loginCount:   u.login_count,
    lastLogin:    u.last_login_at,
    createdAt:    u.created_at,
    streak:       u.consecutive_login_days,
    anomalyScore: u.anomaly_score,
    observerLoad: u.observer_load,
  };
}

/** 401 Unauthorized レスポンスを生成する */
export function unauthorized(message = "認証が必要です") {
  return Response.json({ error: message }, { status: 401 });
}

/** 403 Forbidden レスポンスを生成する */
export function forbidden(message = "アクセス権限がありません") {
  return Response.json({ error: message }, { status: 403 });
}

