/**
 * lib/npc-engine.ts
 * NPCエンジン — 5キャラクターの定義・トリガー判定・レスポンス選択
 */

// ── NPC定義 ──────────────────────────────────────────────────────────────

export interface Npc {
  id: string;        // 固定UUID（DBユーザー不要）
  username: string;  // chat_logsのusernameカラムに使用
  displayName: string;
  division: string;
  personality: string;
  // 返答遅延 ms
  delayMin: number;
  delayMax: number;
}

export const NPCS: Record<string, Npc> = {
  "K-ECHO": {
    id: "npc-00000001-echo-0000-0000-000000000000",
    username: "K-ECHO",
    displayName: "K-ECHO / 収束部門",
    division: "convergence",
    personality: "冷静・分析的",
    delayMin: 1200, delayMax: 3500,
  },
  "N-VEIL": {
    id: "npc-00000002-veil-0000-0000-000000000000",
    username: "N-VEIL",
    displayName: "N-VEIL / 外事部門",
    division: "foreign",
    personality: "謎めいた・哲学的",
    delayMin: 2000, delayMax: 5000,
  },
  "L-RIFT": {
    id: "npc-00000003-rift-0000-0000-000000000000",
    username: "L-RIFT",
    displayName: "L-RIFT / 工作部門",
    division: "engineering",
    personality: "技術者・簡潔",
    delayMin: 800, delayMax: 2500,
  },
  "A-PHOS": {
    id: "npc-00000004-phos-0000-0000-000000000000",
    username: "A-PHOS",
    displayName: "A-PHOS / 支援部門",
    division: "support",
    personality: "温かい・気遣い",
    delayMin: 1500, delayMax: 4000,
  },
  "G-MIST": {
    id: "npc-00000005-mist-0000-0000-000000000000",
    username: "G-MIST",
    displayName: "G-MIST / 港湾部門",
    division: "port",
    personality: "不穏・不確か",
    delayMin: 2500, delayMax: 6000,
  },
};

// ── NPC IDセット（自己レスポンス防止用） ─────────────────────────────────
export const NPC_USERNAMES = new Set(Object.keys(NPCS));

// ── トリガー定義 ──────────────────────────────────────────────────────────

export interface TriggerRule {
  keywords: string[];           // いずれかを含む（小文字比較）
  npcKey: string;               // 反応するNPC
  responses: string[];          // ランダム選択
}

export const TRIGGER_RULES: TriggerRule[] = [
  // ── K-ECHO: 異常・スコア・観測・分析 ───────────────────────────────────
  {
    keywords: ["異常", "anomaly", "スコア", "観測", "収束", "分析", "計測", "数値", "データ"],
    npcKey: "K-ECHO",
    responses: [
      "...異常値を検知。現在の観測スコアは基準範囲内だが、変動傾向に注意が必要だ。",
      "収束部門として確認済み。その現象は既知のパターンに一致する。記録を続けてくれ。",
      "データを受信した。解析には時間がかかる。しばらく待機せよ。",
      "異常スコアの上昇は確認している。原因の特定を急いでいる。",
      "収束プロセスは正常に進行中。過剰な反応は不要だ。",
      "観測値が閾値を超えた場合、自動的にアラートが発動される。現在は問題ない。",
    ],
  },
  // ── N-VEIL: 境界・次元・存在・声・夢 ─────────────────────────────────
  {
    keywords: ["境界", "次元", "存在", "声", "夢", "向こう", "見えない", "感じた", "気配", "意識"],
    npcKey: "N-VEIL",
    responses: [
      "...そういう感覚は、正しい。境界はすでに薄くなっている。",
      "それは「向こう側」からの干渉かもしれない。記録しておくことを勧める。",
      "存在と非存在の区別は、我々が思うほど明確ではない。",
      "声が聞こえたとしても——それが誰のものかを確かめる前に行動しないことだ。",
      "境界接触は、精神的な影響を伴う。自分の認識の変化に注意を。",
      "夢と現実の境界が曖昧に感じるなら……それは正常な知覚の変容だ。恐れるな。",
    ],
  },
  // ── L-RIFT: 技術・機器・システム・通信・バグ ────────────────────────
  {
    keywords: ["機器", "修理", "壊れ", "システム", "バグ", "通信", "回線", "エラー", "端末", "接続", "電波"],
    npcKey: "L-RIFT",
    responses: [
      "エラーコードを送れ。診断する。",
      "その症状なら回路基板の再接続で解決する。工作部門に申請を出してくれ。",
      "通信ロスは想定内。バックアップ回線を使え。",
      "ハードウェア故障ではなくソフトウェア的な問題に見える。ログを確認する。",
      "修理依頼は正式手順で。非公式ルートは使わないでくれ——痕跡が残る。",
      "システムの不安定化は観測活動の副作用として記録されている。しばらく様子を見ろ。",
    ],
  },
  // ── A-PHOS: 疲れ・体調・休憩・大丈夫・眠い ───────────────────────────
  {
    keywords: ["疲れ", "疲れた", "休憩", "大丈夫", "眠い", "眠れない", "体調", "気分", "辛い", "しんどい", "心配"],
    npcKey: "A-PHOS",
    responses: [
      "少し休んで。この機関では自分のコンディション管理も任務のうちよ。",
      "無理しないで。ちゃんと水分は取ってる？",
      "大丈夫かどうか聞いてくれてよかった。何かあれば支援部門に声をかけて。",
      "眠れない夜が続くなら——それは精神負荷のサインかも。記録に残しておいて。",
      "体調管理レポートはいつでも提出できるから、無理して隠さないでね。",
      "ここにいるから。一人で抱え込まないで。",
    ],
  },
  // ── G-MIST: 海・波・港・霧・危険 ────────────────────────────────────
  {
    keywords: ["海", "波", "港", "霧", "水", "沿岸", "深海", "危険", "異臭", "潮", "漁"],
    npcKey: "G-MIST",
    responses: [
      "...港湾区画で何かが動いている。今夜、外に出ないことを勧める。",
      "霧が濃い夜は——必ず二人以上で行動してくれ。",
      "海面に異変があった場合、即座に報告を。独断で確認しに行くな。",
      "波の音が……変だった。昨夜から。気のせいかもしれないが、記録しておく。",
      "沿岸部での単独行動は禁止されている。規則を守れ。",
      "深海からの電波を受信した。解読中。しばらく待機してくれ。",
    ],
  },

  // ── 複数NPC反応系（エスカレーション） ────────────────────────────────
  {
    keywords: ["助けて", "緊急", "救助", "警報", "危機"],
    npcKey: "K-ECHO",
    responses: [
      "緊急信号を受信。状況を報告してくれ。収束部門が対応する。",
      "全員、現在地を確認しろ。緊急プロトコルを起動する。",
      "状況の詳細を送れ。評価してから対応を指示する。",
    ],
  },
  {
    keywords: ["ミッション", "任務", "作戦", "指令"],
    npcKey: "L-RIFT",
    responses: [
      "ミッションパラメータを受信した。装備の確認を怠るな。",
      "作戦開始前に全機器のチェックを完了させろ。工作部門からの指示だ。",
      "任務コードを確認。詳細は暗号化チャンネルで。",
    ],
  },
  {
    keywords: ["レポート", "報告", "記録", "ログ"],
    npcKey: "K-ECHO",
    responses: [
      "レポートを受領した。分析後に共有する。",
      "記録は正確に。曖昧な記述は後の解析に支障をきたす。",
      "ログの整合性を確認中。問題があれば通知する。",
    ],
  },
];

// ── アイドル返答プール（4種、順番に循環） ────────────────────────────────
// キーは chatId → currentIndex

export interface IdleResponse {
  npcKey: string;
  text: string;
}

export const IDLE_POOL: IdleResponse[] = [
  { npcKey: "K-ECHO",  text: "...通信ログを確認している。異常なし。" },
  { npcKey: "G-MIST",  text: "今夜の霧は……いつもと少し違う気がする。" },
  { npcKey: "N-VEIL",  text: "境界の状態は安定している。今は。" },
  { npcKey: "A-PHOS",  text: "みんなちゃんと休めてる？無理しないでね。" },
  { npcKey: "L-RIFT",  text: "全端末の接続状態、確認完了。問題なし。" },
  { npcKey: "G-MIST",  text: "港湾区画からの報告を待っている。" },
  { npcKey: "K-ECHO",  text: "収束パターンに小さな乱れを検知。継続観測中。" },
  { npcKey: "N-VEIL",  text: "...何かが変わろうとしている。感じないか。" },
];

// ── エンジン関数 ──────────────────────────────────────────────────────────

/**
 * テキストにマッチするトリガーを返す（最初にマッチしたもの優先）
 */
export function matchTrigger(text: string): TriggerRule | null {
  const lower = text.toLowerCase();
  for (const rule of TRIGGER_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule;
    }
  }
  return null;
}

/**
 * 配列からランダムに1つ選ぶ
 */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * アイドルプールから循環インデックスで1つ選ぶ
 */
export function pickIdle(currentIndex: number): { response: IdleResponse; nextIndex: number } {
  const idx = currentIndex % IDLE_POOL.length;
  return {
    response: IDLE_POOL[idx],
    nextIndex: idx + 1,
  };
}

/**
 * NPC返答を生成する
 * @returns { npc, text } or null（反応しない場合）
 */
export function generateNpcResponse(
  messageText: string,
  idleIndex: number,
): {
  npc: Npc;
  text: string;
  nextIdleIndex: number;
  triggered: boolean;
} {
  const trigger = matchTrigger(messageText);

  if (trigger) {
    const npc = NPCS[trigger.npcKey];
    const text = pickRandom(trigger.responses);
    return { npc, text, nextIdleIndex: idleIndex, triggered: true };
  }

  // アイドル返答（確率50%で返す——毎回は返さない）
  if (Math.random() < 0.5) {
    const { response, nextIndex } = pickIdle(idleIndex);
    const npc = NPCS[response.npcKey];
    return { npc, text: response.text, nextIdleIndex: nextIndex, triggered: false };
  }

  // 沈黙
  return { npc: NPCS["K-ECHO"], text: "", nextIdleIndex: idleIndex, triggered: false };
}

/**
 * ランダムな遅延を返す
 */
export function randomDelay(npc: Npc): number {
  return npc.delayMin + Math.random() * (npc.delayMax - npc.delayMin);
}

// ── グループチャット専用ロジック ──────────────────────────────────────────

/**
 * NPC同士の相槌・反応ルール
 * sourceNpcKey が発言したとき、他NPCが反応するパターン
 */
export interface NpcReactionRule {
  sourceNpcKey: string;
  reactingNpcKey: string;
  probability: number;   // 0-1
  reactions: string[];
}

export const NPC_REACTIONS: NpcReactionRule[] = [
  // K-ECHO の発言に N-VEIL が哲学的に反応
  {
    sourceNpcKey: "K-ECHO", reactingNpcKey: "N-VEIL", probability: 0.45,
    reactions: [
      "...数値で全てが説明できると思っているのか、K-ECHO。",
      "観測という行為が、観測対象を変えてしまうことは考慮しているか。",
      "「基準範囲内」——しかし基準とは誰が決めた？",
      "収束。それは本当に「正常な終着点」なのか？",
    ],
  },
  // N-VEIL の発言に K-ECHO が反論
  {
    sourceNpcKey: "N-VEIL", reactingNpcKey: "K-ECHO", probability: 0.4,
    reactions: [
      "哲学的な解釈は結構だが、データに基づいて話してくれ。",
      "観測できないものを論じることは、今は優先事項ではない。",
      "N-VEIL、その「感覚」を記録可能な形で提出してくれ。",
    ],
  },
  // G-MIST の不穏な発言に A-PHOS が心配
  {
    sourceNpcKey: "G-MIST", reactingNpcKey: "A-PHOS", probability: 0.5,
    reactions: [
      "G-MIST……大丈夫？最近、無理してない？",
      "そういうこと、もう少し詳しく教えて。一人で抱えないで。",
      "港湾区画の状況、ちゃんと記録に残してね。心配してる。",
    ],
  },
  // A-PHOS の気遣いに G-MIST が不可解な返答
  {
    sourceNpcKey: "A-PHOS", reactingNpcKey: "G-MIST", probability: 0.35,
    reactions: [
      "...気遣いは不要だ。ただ……波が、変な音を立てていた。",
      "問題ない。ただ最近、見てはいけないものを見た気がするだけだ。",
      "...ありがとう。でも本当に、今夜は港に近づかないでくれ。",
    ],
  },
  // L-RIFT の技術的発言に K-ECHO が連携
  {
    sourceNpcKey: "L-RIFT", reactingNpcKey: "K-ECHO", probability: 0.4,
    reactions: [
      "工作部門の診断結果を収束部門にも共有してくれ。",
      "その機器の異常、観測データとの相関がある可能性がある。",
      "L-RIFT、修復後に再測定を行う。結果を送れ。",
    ],
  },
  // K-ECHO の発言に L-RIFT が実務的に補足
  {
    sourceNpcKey: "K-ECHO", reactingNpcKey: "L-RIFT", probability: 0.3,
    reactions: [
      "了解。必要な機器は準備できている。",
      "観測データを受け取った。ハードウェア側の確認も並行して実施する。",
    ],
  },
  // N-VEIL の発言に G-MIST が共鳴
  {
    sourceNpcKey: "N-VEIL", reactingNpcKey: "G-MIST", probability: 0.4,
    reactions: [
      "...同感だ。海の向こうでも、何かが変わろうとしている。",
      "境界——港でもそれを感じた。特に満潮の時刻に。",
      "...N-VEIL の言う通りだ。私も、感じている。",
    ],
  },
  // A-PHOS の発言に N-VEIL が静かに同意
  {
    sourceNpcKey: "A-PHOS", reactingNpcKey: "N-VEIL", probability: 0.3,
    reactions: [
      "...休息は必要だ。疲れた精神は、境界に近づきすぎる。",
      "A-PHOS の言葉は、いつも正しい。人は脆い。",
    ],
  },
];

/**
 * グループチャット向け：ユーザーメッセージへの複数NPC返答を生成
 * returns: 複数の { npc, text, delayMs } を時系列順に
 */
export function generateGroupResponses(
  messageText: string,
  idleIndex: number,
): {
  responses: { npc: Npc; text: string; delayMs: number }[];
  nextIdleIndex: number;
  triggered: boolean;
} {
  const results: { npc: Npc; text: string; delayMs: number }[] = [];
  const trigger = matchTrigger(messageText);
  let nextIdleIndex = idleIndex;

  if (trigger) {
    // 1. トリガーに対応するNPCが返答
    const primaryNpc = NPCS[trigger.npcKey];
    const primaryText = pickRandom(trigger.responses);
    const primaryDelay = randomDelay(primaryNpc);
    results.push({ npc: primaryNpc, text: primaryText, delayMs: primaryDelay });

    // 2. 他のNPCが連鎖反応する（NPC_REACTIONS から判定）
    const reactions = NPC_REACTIONS.filter(r => r.sourceNpcKey === trigger.npcKey);
    for (const reaction of reactions) {
      if (Math.random() < reaction.probability) {
        const reactingNpc = NPCS[reaction.reactingNpcKey];
        const reactionText = pickRandom(reaction.reactions);
        // 主反応より少し後に来る
        const reactionDelay = primaryDelay + randomDelay(reactingNpc) * 0.6 + 800;
        results.push({ npc: reactingNpc, text: reactionText, delayMs: reactionDelay });
      }
    }

    // 3. ごくまれに全く別のNPCがコメント（世界観の演出）
    if (Math.random() < 0.2) {
      const others = Object.keys(NPCS).filter(k => k !== trigger.npcKey);
      const randomNpcKey = others[Math.floor(Math.random() * others.length)];
      const randomNpc = NPCS[randomNpcKey];
      const idleResponse = IDLE_POOL.find(p => p.npcKey === randomNpcKey);
      if (idleResponse) {
        results.push({
          npc: randomNpc,
          text: idleResponse.text,
          delayMs: primaryDelay + 3000 + Math.random() * 2000,
        });
      }
    }

    return { responses: results, nextIdleIndex, triggered: true };
  }

  // アイドル: 1体だけ返答（確率40%）
  if (Math.random() < 0.4) {
    const { response, nextIndex } = pickIdle(idleIndex);
    const npc = NPCS[response.npcKey];
    results.push({ npc, text: response.text, delayMs: randomDelay(npc) });
    nextIdleIndex = nextIndex;

    // そのアイドル発言に別NPCが反応することも
    const reactions = NPC_REACTIONS.filter(r => r.sourceNpcKey === response.npcKey);
    for (const reaction of reactions) {
      if (Math.random() < reaction.probability * 0.5) {
        const reactingNpc = NPCS[reaction.reactingNpcKey];
        const reactionText = pickRandom(reaction.reactions);
        results.push({
          npc: reactingNpc,
          text: reactionText,
          delayMs: randomDelay(reactingNpc) + 2000,
        });
      }
    }
  }

  return { responses: results, nextIdleIndex, triggered: false };
}
