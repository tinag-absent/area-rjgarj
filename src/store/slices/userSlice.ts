"use client";

import type { StateCreator } from "zustand";
import { calculateLevel } from "@/lib/constants";
import { apiFetch } from "@/lib/fetch";
import type { BoundStore } from "@/store/index";

// ── 型定義 ────────────────────────────────────────────────────

export type UserRole   = "player" | "admin" | "observer" | "super_admin";
export type UserStatus = "active" | "inactive" | "suspended" | "banned" | "pending";
export type Division   = "convergence" | "port" | "engineering" | "foreign" | "support" | string;

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
  lastLogin: string | null;
  createdAt: string;
  streak: number;
  anomalyScore: number;
  observerLoad: number;
}

// localStorage に保存する非機密フィールドのみ
export type PersistedUserFields = Pick<User, "id" | "agentId" | "name" | "division" | "divisionName">;

// ── スライス型 ────────────────────────────────────────────────

export interface UserSlice {
  user: User | null;
  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  /** 表示用のみ。正規値はサーバーと定期同期すること */
  addXp: (amount: number) => void;
  recordLogin: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  clearUser: () => void;
}

// ── スライス実装 ──────────────────────────────────────────────

export const createUserSlice: StateCreator<BoundStore, [], [], UserSlice> = (set, get) => ({
  user: null,

  setUser: (user) => set({ user }),

  updateUser: (patch) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, ...patch } });
  },

  addXp: (amount) => {
    if (amount <= 0) return;
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
      const loginData = await res.json().catch(() => null);
      if (loginData && typeof loginData === "object") {
        const { loginBonus: _bonus, ...updatedUser } = loginData as Record<string, unknown>;
        const { user } = get();
        if (user) set({ user: { ...user, ...(updatedUser as Partial<User>) } });
      }
    } catch {
      // 失敗してもログイン自体は続行
    }
  },

  syncFromServer: async () => {
    try {
      const res = await apiFetch("/api/users/me");
      if (!res.ok) return;
      const updated: User = await res.json();
      set({ user: updated });
    } catch {
      // ネットワーク障害時は既存キャッシュを保持
    }
  },

  clearUser: () => {
    // 連鎖リセット: discovered / history も同時にクリア
    set({
      user: null,
      // discoveredSlice
      items: [],
      // historySlice
      browseHistory: [],
      searchHistory: [],
    });
  },
});
