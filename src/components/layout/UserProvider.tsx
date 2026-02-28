"use client";

import { useEffect, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";
import type { User } from "@/types/user";

const POLL_INTERVAL = 30_000; // 30秒ごとにポーリング

export default function UserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const setUser = useUserStore((s) => s.setUser);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const setUnreadChatCounts = useNotificationStore((s) => s.setUnreadChatCounts);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  // 通知 & チャット未読数のポーリング
  useEffect(() => {
    async function poll() {
      try {
        // 未読通知数
        const notifRes = await fetch("/api/users/me/notifications");
        if (notifRes.status === 401) {
          window.location.href = "/login?expired=1";
          return;
        }
        if (notifRes.ok) {
          const notifs: { is_read: number }[] = await notifRes.json();
          setUnreadCount(notifs.filter((n) => !n.is_read).length);
        }

        // チャット未読数
        const chatRes = await fetch("/api/chat/unread");
        if (chatRes.ok) {
          const counts: Record<string, number> = await chatRes.json();
          setUnreadChatCounts(counts);
        }
      } catch {
        // 無視（オフライン等）
      }
    }

    poll(); // 初回即時実行
    timerRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [setUnreadCount, setUnreadChatCounts]);

  return <>{children}</>;
}
