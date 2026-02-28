"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";

/**
 * ミッションページ初回訪問 / 完了案件確認時に XP を付与する。
 * 重複付与防止は /api/users/me/xp の activity 単位で行う。
 */
export default function MissionXpTrigger({ completedCount }: { completedCount: number }) {
  const updateXp    = useUserStore(s => s.updateXp);
  const addToast    = useNotificationStore(s => s.addToast);

  useEffect(() => {
    if (completedCount <= 0) return;
    const key = `missions_xp_awarded_${completedCount}`;
    if (sessionStorage.getItem(key)) return; // セッション内重複防止

    (async () => {
      try {
        const res = await fetch("/api/users/me/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activity: "mission_complete", amount: completedCount * 10 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.xpGained > 0) {
            sessionStorage.setItem(key, "1");
            addToast({ type: "xp" as never, title: "収束案件閲覧", body: `${completedCount}件の収束済み案件を確認`, xpAmount: data.xpGained });
            if (data.leveledUp) {
              addToast({ type: "levelup" as never, title: `LEVEL UP → LEVEL ${data.newLevel}` });
            }
            updateXp(data.totalXp, data.newLevel);
          }
        }
      } catch { /* silent */ }
    })();
  }, [completedCount, updateXp, addToast]);

  return null;
}
