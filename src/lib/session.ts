/**
 * lib/session.ts — Edge Runtime対応セッション検証
 *
 * jsonwebtokenはNode.jsのみ動作するため、Middleware（Edge Runtime）では
 * Web Crypto API（HMAC-SHA256）でJWT署名を検証する。
 */

export interface SessionPayload {
  userId: string;
  agentId: string;
  role: string;
  level: number;
  exp?: number;
}

/** Base64URLをUint8Arrayに変換 */
function base64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Middleware (Edge Runtime) でJWT署名を検証してセッションを返す。
 * 署名が不正・期限切れの場合は null を返す。
 */
export async function getSessionFromCookie(
  cookieValue: string | undefined
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;

  try {
    // ペイロードデコード
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(parts[1]))
    ) as SessionPayload & { exp?: number };

    // 有効期限チェック（暗号演算より先に実行）
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // 署名検証（HMAC-SHA256）
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // JWT_SECRET 未設定は致命的エラー（本番・開発ともにフォールバック不可）
      console.error("[session] JWT_SECRET 環境変数が設定されていません");
      return null;
    }
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      base64urlDecode(parts[2]),
      signedData
    );

    if (!isValid) return null;

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
