import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = { title: "ログイン - 海蝕機関" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginClient />;
}
