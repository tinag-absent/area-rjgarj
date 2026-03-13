"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useNotificationStore } from "@/store/notificationStore";

/**
 * ミッションページ初回訪問 / 完了案件確認時に XP を付与する。
 * 重複付与防止は /api/users/me/xp の activity 単位で行う。
 */
export default function MissionXpTrigger({ completedCount }: { completedCount: number }) {
  const addXp    = useUserStore(s => s.addXp);
  const addToast    = useNotificationStore(s => s.addToast);

  useEffect(() => {
    if (completedCount <= 0) return;
    // [K-005] キーを completedCount 依存にすると増加のたびに再付与される。
    // セッション単位で1回のみチェックする固定キーを使う。
    const key = `missions_xp_awarded_session`;
    if (sessionStorage.getItem(key)) return;

    (async () => {
      try {
        // amount フィールドはサーバーが無視するため送らない（サーバー定数 mission_complete を使用）
        const res = await fetch("/api/users/me/xp", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ activity: "mission_complete" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.xpGained > 0) {
            sessionStorage.setItem(key, "1");
            addToast({ type: "xp" as never, title: "収束案件閲覧", body: `収束済み案件を確認`, xpAmount: data.xpGained });
            if (data.leveledUp) {
              addToast({ type: "levelup" as never, title: `LEVEL UP → LEVEL ${data.newLevel}` });
            }
            addXp(data.xpGained);
          }
        }
      } catch { /* silent */ }
    })();
  }, [completedCount, addXp, addToast]);

  return null;
}
