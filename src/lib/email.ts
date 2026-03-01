/**
 * src/lib/email.ts
 * Resend を使ったメール送信ユーティリティ。
 * RESEND_API_KEY が未設定の場合は送信をスキップしてログのみ出力する。
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// 送信元アドレス（Resendで認証済みドメインを使うこと）
const FROM = process.env.EMAIL_FROM ?? "noreply@kaishoku.local";

export interface SendResult {
  ok: boolean;
  error?: string;
}

// ── メールアドレス認証 ────────────────────────────────────────────
export async function sendVerificationEmail(
  to: string,
  agentId: string,
  verifyUrl: string
): Promise<SendResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY 未設定 — 認証メール送信スキップ:", to);
    console.warn("[email] 認証URL:", verifyUrl);
    return { ok: true };
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "【海蝕機関】メールアドレスの認証",
      html: `
        <div style="font-family:monospace;background:#0a0a0f;color:#e2e8f0;padding:2rem;max-width:480px;margin:0 auto;border:1px solid rgba(0,255,255,0.2);">
          <h2 style="color:cyan;letter-spacing:0.1em;font-size:1rem;">■ KAISHOKU IDENTITY VERIFICATION</h2>
          <p style="color:#94a3b8;font-size:0.875rem;margin:1rem 0;">
            機関員ID <strong style="color:white;">${agentId}</strong> の登録申請を受理しました。<br>
            下記のボタンからメールアドレスの認証を完了してください。
          </p>
          <div style="text-align:center;margin:2rem 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:0.75rem 2rem;background:rgba(0,255,255,0.15);border:1px solid rgba(0,255,255,0.4);color:cyan;text-decoration:none;font-size:0.875rem;letter-spacing:0.1em;border-radius:4px;">
              ▶ メールアドレスを認証する
            </a>
          </div>
          <p style="color:#64748b;font-size:0.75rem;">このリンクは24時間有効です。</p>
          <p style="color:#64748b;font-size:0.75rem;">心当たりがない場合はこのメールを無視してください。</p>
          <hr style="border-color:rgba(255,255,255,0.1);margin:1.5rem 0;">
          <p style="color:#334155;font-size:0.65rem;word-break:break-all;">認証URL: ${verifyUrl}</p>
        </div>
      `,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    console.error("[email] 認証メール送信失敗:", msg);
    return { ok: false, error: msg };
  }
}

// ── パスワードリセット通知 ────────────────────────────────────────
export async function sendPasswordResetNotification(
  to: string,
  agentId: string,
  newPassword: string
): Promise<SendResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY 未設定 — メール送信スキップ:", to);
    return { ok: true };
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "【海蝕機関】パスキーがリセットされました",
      html: `
        <div style="font-family:monospace;background:#0a0a0f;color:#e2e8f0;padding:2rem;max-width:480px;margin:0 auto;border:1px solid rgba(0,255,255,0.2);">
          <h2 style="color:cyan;letter-spacing:0.1em;font-size:1rem;">■ KAISHOKU SECURITY NOTICE</h2>
          <p style="color:#94a3b8;font-size:0.875rem;margin:1rem 0;">機関員 <strong style="color:white;">${agentId}</strong> のパスキーが管理者によってリセットされました。</p>
          <div style="background:#1e293b;border:1px solid rgba(0,255,255,0.1);padding:1rem;margin:1rem 0;">
            <p style="margin:0;font-size:0.75rem;color:#94a3b8;">新しい仮パスキー</p>
            <p style="margin:0.5rem 0 0;font-size:1.25rem;color:cyan;letter-spacing:0.2em;">${newPassword}</p>
          </div>
          <p style="color:#f59e0b;font-size:0.75rem;">⚠ ログイン後すぐに設定画面でパスキーを変更してください。</p>
          <hr style="border-color:rgba(255,255,255,0.1);margin:1.5rem 0;">
          <p style="color:#475569;font-size:0.7rem;">このメールに心当たりがない場合は管理者に連絡してください。</p>
        </div>
      `,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    console.error("[email] 送信失敗:", msg);
    return { ok: false, error: msg };
  }
}

// ── 新規登録完了通知 ─────────────────────────────────────────────
export async function sendWelcomeEmail(
  to: string,
  agentId: string,
  displayName: string
): Promise<SendResult> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY 未設定 — メール送信スキップ:", to);
    return { ok: true };
  }

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "【海蝕機関】機関員登録完了",
      html: `
        <div style="font-family:monospace;background:#0a0a0f;color:#e2e8f0;padding:2rem;max-width:480px;margin:0 auto;border:1px solid rgba(0,255,255,0.2);">
          <h2 style="color:cyan;letter-spacing:0.1em;font-size:1rem;">■ KAISHOKU WELCOME NOTICE</h2>
          <p style="color:#94a3b8;font-size:0.875rem;margin:1rem 0;">
            <strong style="color:white;">${displayName}</strong> 様、機関員登録が完了しました。
          </p>
          <div style="background:#1e293b;border:1px solid rgba(0,255,255,0.1);padding:1rem;margin:1rem 0;">
            <p style="margin:0;font-size:0.75rem;color:#94a3b8;">機関員ID</p>
            <p style="margin:0.5rem 0 0;font-size:1.25rem;color:cyan;letter-spacing:0.2em;">${agentId}</p>
          </div>
          <p style="color:#94a3b8;font-size:0.8rem;">上記IDとご登録のパスキーでログインしてください。</p>
          <hr style="border-color:rgba(255,255,255,0.1);margin:1.5rem 0;">
          <p style="color:#475569;font-size:0.7rem;">海蝕機関システム — 自動送信メール</p>
        </div>
      `,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "不明なエラー";
    console.error("[email] 送信失敗:", msg);
    return { ok: false, error: msg };
  }
}
