import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";
import SearchClient from "@/components/search/SearchClient";

export const metadata: Metadata = { title: "ID検索 - 海蝕機関" };

export default async function SearchPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 4) return <LockedContent requiredLevel={4} currentLevel={lvl} pageName="ID検索" />;

  return <SearchClient />;
}
