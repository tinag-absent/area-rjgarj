/**
 * lib/email.ts — メール送信ユーティリティ（外部パッケージ不要）
 *
 * 優先順位:
 *   1. RESEND_API_KEY が設定されていれば Resend API を使用
 *   2. 未設定の場合はコンソールにコードを出力（開発用フォールバック）
 *
 * 環境変数:
 *   RESEND_API_KEY        — Resend API キー (https://resend.com 無料プランあり)
 *   EMAIL_FROM            — 送信元アドレス (例: noreply@your-domain.com)
 *   NEXT_PUBLIC_SITE_NAME — サイト名 (省略時: SEA)
 */

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? "SEA";
const FROM = process.env.EMAIL_FROM ?? `noreply@${SITE_NAME.toLowerCase()}.local`;

function buildHtml(code: string, purposeText: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Courier New',monospace;">
  <div style="max-width:480px;margin:40px auto;background:#111;border:1px solid #1a1a1a;border-radius:12px;overflow:hidden;">
    <div style="background:#0d0d0d;border-bottom:1px solid #1a1a1a;padding:24px;text-align:center;">
      <div style="font-size:11px;letter-spacing:0.3em;color:#00ffff;text-transform:uppercase;margin-bottom:4px;">${SITE_NAME}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;">${purposeText}</div>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 24px;letter-spacing:0.05em;line-height:1.8;">
        以下の認証コードを入力してください。<br>
        このコードは <strong style="color:#00ffff;">10分間</strong> 有効です。
      </p>
      <div style="background:#0a0a0a;border:1px solid rgba(0,255,255,0.25);border-radius:8px;padding:20px 32px;display:inline-block;">
        <div style="font-size:36px;font-weight:bold;letter-spacing:0.4em;color:#00ffff;font-family:'Courier New',monospace;">${code}</div>
      </div>
      <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:24px 0 0;letter-spacing:0.05em;line-height:1.8;">
        このメールに心当たりがない場合は無視してください。<br>
        コードを他人と共有しないでください。
      </p>
    </div>
    <div style="border-top:1px solid #1a1a1a;padding:16px;text-align:center;">
      <div style="font-size:10px;color:rgba(255,255,255,0.15);letter-spacing:0.1em;">${SITE_NAME} SYSTEM — AUTOMATED MESSAGE</div>
    </div>
  </div>
</body>
</html>`;
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend APIエラー (${res.status}): ${err}`);
  }
}

export async function sendEmailVerificationCode(
  to: string,
  code: string,
  purpose: "register" | "password-reset"
): Promise<void> {
  const purposeText = purpose === "register" ? "新規登録" : "パスキー再設定申請";
  const subject = `【${SITE_NAME}】${purposeText} — 認証コード`;
  const html = buildHtml(code, purposeText);
  const text = `【${SITE_NAME}】${purposeText}の認証コード: ${code}\n\nこのコードは10分間有効です。心当たりがない場合は無視してください。`;

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html, text);
    return;
  }

  // 開発用フォールバック：コンソール出力
  console.log("\n" + "=".repeat(60));
  console.log(`[EMAIL DEV] 送信先: ${to}`);
  console.log(`[EMAIL DEV] 件名: ${subject}`);
  console.log(`[EMAIL DEV] 認証コード: \x1b[36m${code}\x1b[0m`);
  console.log("[EMAIL DEV] RESEND_API_KEY を設定すると実際に送信されます");
  console.log("=".repeat(60) + "\n");
}
