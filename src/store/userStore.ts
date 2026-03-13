"use client";

/**
 * src/store/userStore.ts
 * 後方互換ラッパー。useBoundStore から userSlice の型・フックを再エクスポートする。
 * 新規コードは @/store/index の useBoundStore を直接使うこと。
 */

export type { User, UserRole, UserStatus, Division, PersistedUserFields } from "./slices/userSlice";
export { useBoundStore as useUserStore } from "./index";
