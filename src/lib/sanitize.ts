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
 *
 * [FIX-M06/H09] エンティティデコード後に < > & " を再エンコードして
 * デコード→タグ再構成バイパスを防止する。
 */
export function stripHtml(input: unknown): string {
  if (typeof input !== "string") return "";

  let s = input;

  // ① 先にHTMLタグを除去（エンティティ展開前に行う）
  s = s.replace(/<[^>]*>/g, "");

  // ② HTMLエンティティを可視文字に変換
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // ③ エンティティ展開後に再度タグ・危険プロトコルを除去
  s = s
    .replace(/<[^>]*>/g, "")
    // [O-012] タブ・改行混入バリアント（java\tscript: 等）にも対応
    .replace(/(?:java[\s\S]*?script|vbscript|data)\s*:/gi, "")
    .replace(/\bon\w+\s*=/gi, "");

  // [FIX-M06] デコード後に HTML 特殊文字を再エンコードする。
  // & は先にエンコードしてから < > " をエンコードする順序が正しい。
  // (&amp; を後でエンコードすると &amp;amp; になってしまうため順序に注意)
  s = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return s.trim();
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
