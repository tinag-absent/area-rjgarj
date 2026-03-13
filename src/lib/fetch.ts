/**
 * src/lib/fetch.ts
 * 認証 Cookie を自動付与する fetch ラッパー。
 * クライアントコンポーネントから API を呼ぶ際に使用する。
 * Cookie は same-origin で自動送信されるため、特別な設定は不要。
 */

/**
 * `fetch` のラッパー。
 * - credentials: "same-origin" を設定し、セッション Cookie を確実に送信
 * - 将来的な認証ヘッダー付与の拡張ポイント
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "same-origin", // セッション Cookie を必ず送信
    headers: {
      ...init?.headers,
      // CSRF 対策: カスタムヘッダーで同一オリジンリクエストであることを明示
      "X-Requested-With": "XMLHttpRequest",
    },
  });
}
