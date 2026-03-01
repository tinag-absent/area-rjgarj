import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import ChatWindow from "./ChatWindow";

export const metadata = { title: "通信ログ - 海蝕機関" };

export default async function ChatPage() {
  const h = await headers();
  const level = parseInt(h.get("x-user-level") ?? "0");
  if (level < 1) return <LockedContent requiredLevel={1} currentLevel={level} pageName="通信ログ" />;
  const agentId = h.get("x-user-agent-id") ?? "";
  const division = h.get("x-user-division") ?? "";
  return <ChatWindow agentId={agentId} />;
}
