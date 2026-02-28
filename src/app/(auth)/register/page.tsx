import { redirect } from "next/navigation";

// Registration is handled in the login page's tab system
export default function RegisterPage() {
  redirect("/login?tab=register");
}
