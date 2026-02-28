/**
 * lib/auth.ts — JWT認証ユーティリティ
 * Node.js Runtime専用（Edge Runtimeではsession.tsを使用）
 */

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET 環境変数が設定されていません");
  } else {
    throw new Error("JWT_SECRET 環境変数が設定されていません。.env.localに設定してください。");
  }
}
const _SECRET = SECRET;
const TOKEN_EXPIRES = "7d";

export interface JwtPayload {
  userId: string;
  agentId: string;
  role: string;
  level: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, _SECRET, { expiresIn: TOKEN_EXPIRES });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, _SECRET) as JwtPayload as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}
