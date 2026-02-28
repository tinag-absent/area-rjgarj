"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// SearchClient と同じ SearchResult 型
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
  discoveredAt: string; // ISO string
  discoveredQuery: string; // 発見時の検索クエリ
}

interface DiscoveredState {
  items: DiscoveredItem[];
  addItem: (item: Omit<DiscoveredItem, "discoveredAt">) => void;
  removeItem: (id: string, category: DiscoveredItem["category"]) => void;
  clearAll: () => void;
  clearByCategory: (category: DiscoveredItem["category"]) => void;
  hasItem: (id: string, category: DiscoveredItem["category"]) => boolean;
  getByCategory: (category: DiscoveredItem["category"]) => DiscoveredItem[];
}

export const useDiscoveredStore = create<DiscoveredState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        // 同じ id + category がすでにある場合は discoveredAt だけ更新しない（最初の発見日を保持）
        const exists = get().items.some(
          (i) => i.id === item.id && i.category === item.category
        );
        if (exists) return;

        const newItem: DiscoveredItem = {
          ...item,
          discoveredAt: new Date().toISOString(),
        };

        set((state) => ({
          items: [newItem, ...state.items],
        }));
      },

      removeItem: (id, category) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.id === id && i.category === category)
          ),
        })),

      clearAll: () => set({ items: [] }),

      clearByCategory: (category) =>
        set((state) => ({
          items: state.items.filter((i) => i.category !== category),
        })),

      hasItem: (id, category) =>
        get().items.some((i) => i.id === id && i.category === category),

      getByCategory: (category) =>
        get().items.filter((i) => i.category === category),
    }),
    {
      name: "sea-discovered",
    }
  )
);
