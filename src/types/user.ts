/**
 * types/user.ts — ユーザー関連型定義
 * User は userStore.ts から再エクスポート（単一の型定義を維持）
 */

export type { User } from "@/store/userStore";

export interface StoryState {
  flags: Record<string, unknown>;
  variables: Record<string, number>;
  history: Array<{ eventId: string; time: number }>;
  firedSet: Record<string, boolean>;
}
