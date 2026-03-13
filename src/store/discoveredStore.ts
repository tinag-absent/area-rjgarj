"use client";

/**
 * src/store/discoveredStore.ts
 * 後方互換ラッパー。
 */

export type { DiscoveredItem, DiscoveredSlice } from "./slices/discoveredSlice";
export { useBoundStore as useDiscoveredStore } from "./index";
