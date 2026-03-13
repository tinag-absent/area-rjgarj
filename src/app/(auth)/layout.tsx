import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/session";
import ToastContainer from "@/components/ui/ToastContainer";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kai_token")?.value;
  const session = await getSessionFromCookie(token);

  // Already authenticated — redirect to dashboard
  if (session) redirect("/dashboard");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "5rem 1rem 2rem", // top padding accounts for fixed header bar
    }}>
      {children}
      <ToastContainer />
    </div>
  );
}
