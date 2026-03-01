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

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-jwt-secret-change-in-production";

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
  display_name: string;
  role: "player" | "admin" | "observer";
  status: "active" | "inactive" | "suspended";
  level: number;
  xp: number;
  division: string;
  division_name: string;
  login_count: number;
  last_login: string | null;
  created_at: string;
  streak: number;
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
    const user = await queryOne<DbUser>(
      db,
      `SELECT id, agent_id, display_name, role, status, level, xp,
              division, division_name, login_count, last_login,
              created_at, streak, anomaly_score, observer_load
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [payload.userId]
    );

    if (!user || user.status === "suspended") return null;

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
    id:           u.id,
    agentId:      u.agent_id,
    name:         u.display_name,
    role:         u.role,
    status:       u.status,
    level:        u.level,
    xp:           u.xp,
    division:     u.division,
    divisionName: u.division_name,
    loginCount:   u.login_count,
    lastLogin:    u.last_login,
    createdAt:    u.created_at,
    streak:       u.streak,
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

