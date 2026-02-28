/**
 * lib/fetch.ts — 共通 fetch ラッパー
 * 401 が返ったらクライアントサイドで /login へリダイレクトする
 */

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== "undefined") {
    // セッション切れ → ログインページへ
    window.location.href = "/login?expired=1";
  }
  return res;
}
