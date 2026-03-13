"use client";

import type { StateCreator } from "zustand";
import type { BoundStore } from "@/store/index";

export interface BrowseEntry {
  id: string;
  path: string;
  title: string;
  category: "page" | "mission" | "codex" | "map" | "novel" | "chat" | "other";
  visitedAt: string;
}

export interface SearchEntry {
  id: string;
  query: string;
  resultCount: number;
  searchedAt: string;
  context?: string;
}

const MAX_BROWSE = 200;
const MAX_SEARCH = 100;

export interface HistorySlice {
  browseHistory: BrowseEntry[];
  searchHistory: SearchEntry[];
  addBrowse: (entry: Omit<BrowseEntry, "id" | "visitedAt">) => void;
  addSearch: (entry: Omit<SearchEntry, "id" | "searchedAt">) => void;
  removeBrowse: (id: string) => void;
  removeSearch: (id: string) => void;
  clearBrowse: () => void;
  clearSearch: () => void;
}

export const createHistorySlice: StateCreator<BoundStore, [], [], HistorySlice> = (set, get) => ({
  browseHistory: [],
  searchHistory: [],

  addBrowse: (entry) => {
    const id = crypto.randomUUID();
    const newEntry: BrowseEntry = { ...entry, id, visitedAt: new Date().toISOString() };
    set((state) => {
      const filtered = state.browseHistory.filter((e) => e.path !== entry.path);
      return { browseHistory: [newEntry, ...filtered].slice(0, MAX_BROWSE) };
    });
  },

  addSearch: (entry) => {
    const id = crypto.randomUUID();
    const newEntry: SearchEntry = { ...entry, id, searchedAt: new Date().toISOString() };
    set((state) => {
      const filtered = state.searchHistory.filter(
        (e) => e.query.toLowerCase() !== entry.query.toLowerCase()
      );
      return { searchHistory: [newEntry, ...filtered].slice(0, MAX_SEARCH) };
    });
  },

  removeBrowse: (id) =>
    set((state) => ({ browseHistory: state.browseHistory.filter((e) => e.id !== id) })),

  removeSearch: (id) =>
    set((state) => ({ searchHistory: state.searchHistory.filter((e) => e.id !== id) })),

  clearBrowse: () => set({ browseHistory: [] }),
  clearSearch: () => set({ searchHistory: [] }),
});
