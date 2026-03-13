import { redirect } from "next/navigation";

/** /register は /login?tab=register にリダイレクト（タブはクライアント側で制御）。 */
export default function RegisterPage() {
  redirect("/login");
}
