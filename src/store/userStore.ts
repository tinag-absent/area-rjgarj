"use client";

import { create } from "zustand";
import type { User } from "@/types/user";

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  updateXp: (xp: number, level: number) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateXp: (xp, level) =>
    set((state) =>
      state.user ? { user: { ...state.user, xp, level } } : {}
    ),
  clear: () => set({ user: null }),
}));
