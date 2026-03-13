import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import SkillTreeClient from "./SkillTreeClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "スキルツリー - 海蝕機関" };

export default async function SkillTreePage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");
  if (lvl < 1) return <LockedContent requiredLevel={1} currentLevel={lvl} pageName="スキルツリー" />;
  return <SkillTreeClient />;
}
