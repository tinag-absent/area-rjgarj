import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import SearchClient from "./SearchClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "全文検索 - 海蝕機関" };

export default async function SearchPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 4) return <LockedContent requiredLevel={4} currentLevel={lvl} pageName="全文検索" />;
  return <SearchClient />;
}
