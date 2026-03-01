"use client";

import { create } from "zustand";
import { calculateLevel } from "@/lib/constants";
import { persist } from "zustand/middleware";
import { apiFetch } from "@/lib/fetch";

// ── 型定義 ────────────────────────────────────────────────────

export type UserRole   = "player" | "admin" | "observer" | "super_admin";
export type UserStatus = "active" | "inactive" | "suspended";
export type Division   = "alpha" | "beta" | "gamma" | "delta" | string;

export interface User {
  id: string;
  agentId: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  level: number;
  xp: number;
  division: Division;
  divisionName: string;
  loginCount: number;
  lastLogin: string;
  createdAt: string;
  streak: number;
  anomalyScore: number;
  observerLoad: number;
}

// [SECURITY FIX #1] localStorage に保存してよい非機密フィールドのみ定義
type PersistedUserFields = Pick<User, "id" | "agentId" | "name" | "division" | "divisionName">;

// ── ストア型 ──────────────────────────────────────────────────

interface UserState {
  user: User | null;

  /** ユーザーをセット（必ずサーバー応答から呼ぶこと） */
  setUser: (user: User) => void;

  /** ユーザー情報を部分更新 */
  updateUser: (patch: Partial<User>) => void;

  /** XP を加算し、必要なら level を昇格（表示用のみ。正規値はサーバーと定期同期すること） */
  addXp: (amount: number) => void;

  /**
   * [SECURITY FIX #5] ログイン記録をサーバー API に委譲。
   * クライアント側では streak/loginCount を計算・改ざんできないようにする。
   */
  recordLogin: () => Promise<void>;

  /**
   * [SECURITY FIX #1] サーバーから最新のユーザー情報を取得して状態を同期する。
   * role / status / anomalyScore 等の権限情報はここで上書きする。
   * ページ読み込み時やセッション確認後に呼ぶこと。
   */
  syncFromServer: () => Promise<void>;

  /** ログアウト */
  clearUser: () => void;
}

// ── ストア ───────────────────────────────────────────────────

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,

      setUser: (user) => set({ user }),

      updateUser: (patch) => {
        const { user } = get();
        if (!user) return;
        set({ user: { ...user, ...patch } });
      },

      addXp: (amount) => {
        const { user } = get();
        if (!user) return;
        const newXp    = user.xp + amount;
        const newLevel = calculateLevel(newXp);
        set({ user: { ...user, xp: newXp, level: newLevel } });
      },

      recordLogin: async () => {
        try {
          const res = await apiFetch("/api/users/me/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) return;
          const updated: User = await res.json();
          // streak / loginCount / lastLogin はサーバーの値で上書き
          set({ user: updated });
        } catch {
          // 失敗してもログイン自体は続行
        }
      },

      syncFromServer: async () => {
        try {
          const res = await apiFetch("/api/users/me");
          if (!res.ok) return;
          const updated: User = await res.json();
          // role / status / anomalyScore 等をサーバー値で上書き
          set({ user: updated });
        } catch {
          // ネットワーク障害時は既存の表示用キャッシュを保持
        }
      },

      clearUser: () => set({ user: null }),
    }),
    {
      name: "sea-user",
      // [SECURITY FIX #1] 権限・ゲーム状態に影響するフィールドは localStorage に保存しない。
      // role / status / level / xp / anomalyScore / observerLoad /
      // loginCount / streak / lastLogin / createdAt はサーバーから都度取得。
      partialize: (state): { user: PersistedUserFields | null } => {
        if (!state.user) return { user: null };
        return {
          user: {
            id:           state.user.id,
            agentId:      state.user.agentId,
            name:         state.user.name,
            division:     state.user.division,
            divisionName: state.user.divisionName,
          },
        };
      },
    }
  )
);
