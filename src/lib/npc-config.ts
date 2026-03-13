/**
 * src/lib/npc-config.ts
 * フロントエンド共通の NPC 定義。
 * ChatWindow / NpcGroupChat で import して使用する。
 */

export const NPC_NAMES = ["K-ECHO", "N-VEIL", "L-RIFT", "A-PHOS", "G-MIST"] as const;
export type NpcName = typeof NPC_NAMES[number];
export const NPC_USERNAMES = new Set<string>(NPC_NAMES);

export interface NpcStyle {
  border: string;
  bg: string;
  glow: string;
  name: string;
  dot: string;
}

export const NPC_COLORS: Record<NpcName, NpcStyle> = {
  "K-ECHO": { border: "rgba(0,200,255,0.4)",   bg: "rgba(0,200,255,0.07)",   glow: "rgba(0,200,255,0.2)",   name: "#00c8ff", dot: "#00c8ff" },
  "N-VEIL": { border: "rgba(160,100,255,0.4)",  bg: "rgba(160,100,255,0.07)", glow: "rgba(160,100,255,0.2)", name: "#a064ff", dot: "#a064ff" },
  "L-RIFT": { border: "rgba(80,220,120,0.4)",   bg: "rgba(80,220,120,0.07)",  glow: "rgba(80,220,120,0.2)",  name: "#50dc78", dot: "#50dc78" },
  "A-PHOS": { border: "rgba(255,180,60,0.4)",   bg: "rgba(255,180,60,0.07)",  glow: "rgba(255,180,60,0.2)",  name: "#ffb43c", dot: "#ffb43c" },
  "G-MIST": { border: "rgba(160,160,160,0.35)", bg: "rgba(160,160,160,0.06)", glow: "rgba(160,160,160,0.15)", name: "#a0a0a0", dot: "#a0a0a0" },
};

export const NPC_ICONS: Record<NpcName, string> = {
  "K-ECHO": "◈", "N-VEIL": "◉", "L-RIFT": "⬡", "A-PHOS": "♡", "G-MIST": "〜",
};

export interface NpcMember {
  username: NpcName;
  displayName: string;
  division: string;
  personality: string;
  divColor: string;
}

export const NPC_MEMBERS: NpcMember[] = [
  { username: "K-ECHO", displayName: "K-ECHO", division: "収束部門", personality: "冷静・分析的",   divColor: "#00c8ff" },
  { username: "N-VEIL", displayName: "N-VEIL", division: "外事部門", personality: "謎めいた・哲学的", divColor: "#a064ff" },
  { username: "L-RIFT", displayName: "L-RIFT", division: "工作部門", personality: "技術者・簡潔",   divColor: "#50dc78" },
  { username: "A-PHOS", displayName: "A-PHOS", division: "支援部門", personality: "温かい・気遣い",  divColor: "#ffb43c" },
  { username: "G-MIST", displayName: "G-MIST", division: "港湾部門", personality: "不穏・不確か",   divColor: "#a0a0a0" },
];

/** NPC カラーを安全に取得する（未知の名前はデフォルト値を返す）。 */
export function getNpcColor(name: string): NpcStyle {
  return NPC_COLORS[name as NpcName] ?? NPC_COLORS["K-ECHO"];
}

/** NPC アイコンを安全に取得する。 */
export function getNpcIcon(name: string): string {
  return NPC_ICONS[name as NpcName] ?? "◈";
}
