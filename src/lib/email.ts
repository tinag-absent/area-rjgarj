/**
 * src/lib/email.ts
 * メール送信は廃止。秘密の質問による認証に移行。
 * 管理者パスワードリセット通知はコンソールログのみ出力する。
 */

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** @deprecated メール認証は廃止。使用しないこと。 */
export async function sendVerificationEmail(
  _to: string,
  _agentId: string,
  _verifyUrl: string
): Promise<SendResult> {
  return { ok: true };
}

/**
 * 管理者によるパスワードリセット通知（メール送信なし）
 * ログにのみ記録する。必要であれば別途通知手段を追加してください。
 */
export async function sendPasswordResetNotification(
  _to: string,
  agentId: string,
  newPassword: string
): Promise<SendResult> {
  console.info(
    `[admin] パスワードリセット — 機関員ID: ${agentId} / 新パスキー: ${newPassword} （メール送信なし）`
  );
  return { ok: true };
}

/** @deprecated 使用しないこと。 */
export async function sendWelcomeEmail(
  _to: string,
  _agentId: string,
  _displayName: string
): Promise<SendResult> {
  return { ok: true };
}

/** @deprecated 使用しないこと。 */
export async function sendEmail(_opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  return { ok: true };
}
