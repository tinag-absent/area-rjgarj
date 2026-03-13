import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function RootPage() {
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
