/**
 * /api/cron/email-reminder
 * メール認証廃止に伴い無効化。
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "メール認証は廃止されました。", sent: 0 });
}
