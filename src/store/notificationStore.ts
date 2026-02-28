"use client";

import { create } from "zustand";

export interface Toast {
  id: string;
  type: "xp" | "levelup" | "login" | "unlock" | "chat" | "mission" | "info" | "warn" | "error";
  title: string;
  body?: string;
  xpAmount?: number;
}

interface NotificationState {
  toasts: Toast[];
  unreadCount: number;
  unreadChatCounts: Record<string, number>; // チャンネルごとの未読数
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  setUnreadCount: (n: number) => void;
  setUnreadChatCounts: (counts: Record<string, number>) => void;
  totalUnreadChat: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  unreadCount: 0,
  unreadChatCounts: {},
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setUnreadCount: (n) => set({ unreadCount: n }),
  setUnreadChatCounts: (counts) => set({ unreadChatCounts: counts }),
  totalUnreadChat: () => Object.values(get().unreadChatCounts).reduce((s, n) => s + n, 0),
}));
