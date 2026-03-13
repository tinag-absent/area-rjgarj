"use client";

/**
 * src/store/index.ts
 * 4つのスライスを1つのZustandストアに結合する。
 *
 * ベストプラクティス:
 * - スライスパターン (StateCreator) で関心を分離しつつ単一ストアを維持
 * - persist ミドルウェアは combined store にのみ適用（スライス内では使わない）
 * - partialize で localStorage に保存するフィールドを最小限に制限
 * - アクションの取得はセレクターで行い、不要な re-render を防ぐ
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createUserSlice,        type UserSlice        } from "./slices/userSlice";
import { createNotificationSlice, type NotificationSlice } from "./slices/notificationSlice";
import { createDiscoveredSlice,  type DiscoveredSlice  } from "./slices/discoveredSlice";
import { createHistorySlice,     type HistorySlice     } from "./slices/historySlice";

// ── 結合型 ───────────────────────────────────────────────────

export type BoundStore =
  & UserSlice
  & NotificationSlice
  & DiscoveredSlice
  & HistorySlice;

// ── 結合ストア ───────────────────────────────────────────────

export const useBoundStore = create<BoundStore>()(
  persist(
    (...a) => ({
      ...createUserSlice(...a),
      ...createNotificationSlice(...a),
      ...createDiscoveredSlice(...a),
      ...createHistorySlice(...a),
    }),
    {
      name: "sea-store",
      // 権限・ゲーム状態に影響するフィールドは localStorage に保存しない
      // role / status / level / xp / anomalyScore / observerLoad はサーバーから取得
      partialize: (state): Partial<BoundStore> => ({
        // user: 非機密フィールドのみ
        user: state.user
          ? {
              id:           state.user.id,
              agentId:      state.user.agentId,
              name:         state.user.name,
              role:         state.user.role,
              status:       state.user.status,
              level:        0,   // サーバーで上書きするため保存しない
              xp:           0,
              division:     state.user.division,
              divisionName: state.user.divisionName,
              loginCount:   0,
              lastLogin:    null,
              createdAt:    state.user.createdAt,
              streak:       0,
              anomalyScore: 0,
              observerLoad: 0,
            }
          : null,
        // discovered / history はローカル保存
        items:          state.items,
        browseHistory:  state.browseHistory,
        searchHistory:  state.searchHistory,
        // toasts / unread counts は揮発性 — 保存しない
      }),
    }
  )
);

// ── マルチタブ同期（BroadcastChannel） ───────────────────────

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  const channel = new BroadcastChannel("sea-auth");

  channel.addEventListener("message", (ev: MessageEvent<{ type: string }>) => {
    if (ev.data?.type === "logout") {
      useBoundStore.getState().clearUser();
      window.location.href = "/login";
    } else if (ev.data?.type === "login") {
      useBoundStore.getState().syncFromServer();
    }
  });

  useBoundStore.subscribe((state, prev) => {
    if (prev.user && !state.user) channel.postMessage({ type: "logout" });
    if (!prev.user && state.user)  channel.postMessage({ type: "login" });
  });
}
