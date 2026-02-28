/**
 * lib/sanitize.ts — サーバーサイド XSS サニタイズユーティリティ
 *
 * HTMLタグ・属性・危険なプロトコルを除去してプレーンテキストを返す。
 * フロントエンドでの innerHTML 使用を禁止した上で、
 * 多層防御としてサーバー側でも入力値を浄化する。
 */

/**
 * HTML タグをすべて除去し、エンティティをデコードしてプレーンテキストを返す。
 * XSS攻撃に使われる <script>, onerror=, javascript: 等を無効化する。
 */
export function stripHtml(input: unknown): string {
  if (typeof input !== "string") return "";

  return input
    // HTMLタグを除去（属性ごと）
    .replace(/<[^>]*>/g, "")
    // javascript: / vbscript: / data: プロトコルを除去
    .replace(/(?:javascript|vbscript|data):/gi, "")
    // イベントハンドラー属性を除去（on* パターン）
    .replace(/\bon\w+\s*=/gi, "")
    // HTMLエンティティを無害な形に変換
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    // 再度タグ除去（エンティティデコード後に残るケースを防ぐ）
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * 表示名などの短いテキストフィールド用。
 * stripHtml に加えて改行・タブを除去する。
 */
export function sanitizeDisplayText(input: unknown): string {
  return stripHtml(input)
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 複数行テキスト（投稿本文・チャット等）用。
 * 改行は保持するが、HTMLタグ・危険プロトコルを除去する。
 */
export function sanitizeMultilineText(input: unknown): string {
  return stripHtml(input);
}
