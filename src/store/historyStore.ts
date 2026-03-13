"use client";

/**
 * src/store/historyStore.ts
 * 後方互換ラッパー。
 */

export type { BrowseEntry, SearchEntry, HistorySlice } from "./slices/historySlice";
export { useBoundStore as useHistoryStore } from "./index";
