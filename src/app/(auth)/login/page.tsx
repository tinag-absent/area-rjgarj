import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "機関員認証 - 海蝕機関",
};

export default function LoginPage() {
  return <LoginForm />;
}
