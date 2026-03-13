"use client";

/**
 * src/store/notificationStore.ts
 * 後方互換ラッパー。
 */

export type { Toast, NotificationSlice } from "./slices/notificationSlice";
export { useBoundStore as useNotificationStore } from "./index";
