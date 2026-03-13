"use client";

import type { StateCreator } from "zustand";
import type { BoundStore } from "@/store/index";

export interface DiscoveredItem {
  id: string;
  category: "mission" | "entity" | "module" | "location" | "personnel" | "novel" | "post";
  title: string;
  subtitle?: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  matchedId: string;
  discoveredAt: string;
  discoveredQuery: string;
}

export interface DiscoveredSlice {
  items: DiscoveredItem[];
  addItem: (item: Omit<DiscoveredItem, "discoveredAt">) => void;
  removeItem: (id: string, category: DiscoveredItem["category"]) => void;
  clearDiscovered: () => void;
  clearDiscoveredByCategory: (category: DiscoveredItem["category"]) => void;
  hasItem: (id: string, category: DiscoveredItem["category"]) => boolean;
  getByCategory: (category: DiscoveredItem["category"]) => DiscoveredItem[];
}

export const createDiscoveredSlice: StateCreator<BoundStore, [], [], DiscoveredSlice> = (set, get) => ({
  items: [],

  addItem: (item) => {
    // 同じ id + category は最初の発見日を保持
    const exists = get().items.some(
      (i) => i.id === item.id && i.category === item.category
    );
    if (exists) return;
    const newItem: DiscoveredItem = { ...item, discoveredAt: new Date().toISOString() };
    set((state) => ({ items: [newItem, ...state.items] }));
  },

  removeItem: (id, category) =>
    set((state) => ({
      items: state.items.filter((i) => !(i.id === id && i.category === category)),
    })),

  clearDiscovered: () => set({ items: [] }),

  clearDiscoveredByCategory: (category) =>
    set((state) => ({ items: state.items.filter((i) => i.category !== category) })),

  hasItem: (id, category) =>
    get().items.some((i) => i.id === id && i.category === category),

  getByCategory: (category) =>
    get().items.filter((i) => i.category === category),
});
