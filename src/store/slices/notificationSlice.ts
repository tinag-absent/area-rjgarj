"use client";

import type { StateCreator } from "zustand";
import type { BoundStore } from "@/store/index";

export interface Toast {
  id: string;
  type: "xp" | "levelup" | "login" | "unlock" | "chat" | "mission" | "info" | "warn" | "error";
  title: string;
  body?: string;
  xpAmount?: number;
  duration?: number;
}

const DEFAULT_DURATIONS: Record<Toast["type"], number> = {
  xp:      4500,
  levelup: 7000,
  login:   4000,
  unlock:  5500,
  chat:    3500,
  mission: 5000,
  info:    4000,
  warn:    5000,
  error:   6000,
};

// タイマーはZustandの外に保持（シリアライズ不可・再レンダー不要）
const _toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface NotificationSlice {
  toasts: Toast[];
  unreadCount: number;
  unreadChatCounts: Record<string, number>;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setUnreadCount: (n: number) => void;
  setUnreadChatCounts: (counts: Record<string, number>) => void;
  totalUnreadChat: () => number;
}

export const createNotificationSlice: StateCreator<BoundStore, [], [], NotificationSlice> = (set, get) => ({
  toasts: [],
  unreadCount: 0,
  unreadChatCounts: {},

  addToast: (toast) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type] ?? 5000;

    set((state) => ({
      toasts: [...state.toasts.slice(-4), { ...toast, id, duration }],
    }));

    const timer = setTimeout(() => {
      _toastTimers.delete(id);
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
    _toastTimers.set(id, timer);
  },

  removeToast: (id) => {
    const timer = _toastTimers.get(id);
    if (timer) { clearTimeout(timer); _toastTimers.delete(id); }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => {
    _toastTimers.forEach((t) => clearTimeout(t));
    _toastTimers.clear();
    set({ toasts: [] });
  },

  setUnreadCount: (n) => set({ unreadCount: n }),
  setUnreadChatCounts: (counts) => set({ unreadChatCounts: counts }),
  totalUnreadChat: () =>
    Object.values(get().unreadChatCounts).reduce((s, n) => s + n, 0),
});
