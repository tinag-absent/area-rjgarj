"use client";

import { create } from "zustand";
import { calculateLevel } from "@/lib/constants";
import { persist } from "zustand/middleware";

// ── 型定義 ────────────────────────────────────────────────────

export type UserRole   = "player" | "admin" | "observer";
export type UserStatus = "active" | "inactive" | "suspended";
export type Division   = "alpha" | "beta" | "gamma" | "delta" | string;

export interface User {
  id: string;
  agentId: string;          // 例: "KIN-0001"
  name: string;
  role: UserRole;
  status: UserStatus;
  level: number;            // 0〜5
  xp: number;
  division: Division;
  divisionName: string;     // 例: "α分隊"
  loginCount: number;
  lastLogin: string;        // ISO string
  createdAt: string;        // ISO string
  streak: number;           // 連続ログイン日数
  anomalyScore: number;     // 異常スコア (0〜100)
  observerLoad: number;     // 観測者負荷 (0〜100)
}

// ── ストア型 ──────────────────────────────────────────────────

interface UserState {
  user: User | null;

  /** ユーザーをセット（ログイン時など） */
  setUser: (user: User) => void;

  /** ユーザー情報を部分更新 */
  updateUser: (patch: Partial<User>) => void;

  /** XP を加算し、必要なら level を昇格 */
  addXp: (amount: number) => void;

  /** ログイン記録を更新（lastLogin・loginCount・streak） */
  recordLogin: () => void;

  /** ログアウト */
  clearUser: () => void;
}

// ── 定数は @/lib/constants の calculateLevel を使用

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

      recordLogin: () => {
        const { user } = get();
        if (!user) return;

        const now      = new Date();
        const last     = user.lastLogin ? new Date(user.lastLogin) : null;
        const daysDiff = last
          ? Math.floor((now.getTime() - last.getTime()) / 86_400_000)
          : null;

        // 前回ログインが昨日なら streak を継続、それ以外はリセット
        const streak =
          daysDiff === 1
            ? user.streak + 1
            : daysDiff === 0
            ? user.streak          // 同日再ログインは変えない
            : 1;

        set({
          user: {
            ...user,
            loginCount: user.loginCount + 1,
            lastLogin:  now.toISOString(),
            streak,
          },
        });
      },

      clearUser: () => set({ user: null }),
    }),
    {
      name: "sea-user",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
