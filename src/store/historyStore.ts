"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BrowseEntry {
  id: string;
  path: string;
  title: string;
  category: "page" | "mission" | "codex" | "map" | "novel" | "chat" | "other";
  visitedAt: string; // ISO string
}

export interface SearchEntry {
  id: string;
  query: string;
  resultCount: number;
  searchedAt: string; // ISO string
  context?: string; // どの画面で検索したか
}

interface HistoryState {
  browseHistory: BrowseEntry[];
  searchHistory: SearchEntry[];
  maxBrowse: number;
  maxSearch: number;
  addBrowse: (entry: Omit<BrowseEntry, "id" | "visitedAt">) => void;
  addSearch: (entry: Omit<SearchEntry, "id" | "searchedAt">) => void;
  removeBrowse: (id: string) => void;
  removeSearch: (id: string) => void;
  clearBrowse: () => void;
  clearSearch: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      browseHistory: [],
      searchHistory: [],
      maxBrowse: 200,
      maxSearch: 100,

      addBrowse: (entry) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const newEntry: BrowseEntry = { ...entry, id, visitedAt: new Date().toISOString() };
        set((state) => {
          // 重複を排除（同じpathの直前エントリは除く）
          const filtered = state.browseHistory.filter((e) => e.path !== entry.path);
          const next = [newEntry, ...filtered].slice(0, state.maxBrowse);
          return { browseHistory: next };
        });
      },

      addSearch: (entry) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const newEntry: SearchEntry = { ...entry, id, searchedAt: new Date().toISOString() };
        set((state) => {
          // 同じクエリを重複させない
          const filtered = state.searchHistory.filter(
            (e) => e.query.toLowerCase() !== entry.query.toLowerCase()
          );
          const next = [newEntry, ...filtered].slice(0, state.maxSearch);
          return { searchHistory: next };
        });
      },

      removeBrowse: (id) =>
        set((state) => ({ browseHistory: state.browseHistory.filter((e) => e.id !== id) })),

      removeSearch: (id) =>
        set((state) => ({ searchHistory: state.searchHistory.filter((e) => e.id !== id) })),

      clearBrowse: () => set({ browseHistory: [] }),
      clearSearch: () => set({ searchHistory: [] }),
    }),
    {
      name: "sea-history",
      partialize: (state) => ({
        browseHistory: state.browseHistory,
        searchHistory: state.searchHistory,
      }),
    }
  )
);
