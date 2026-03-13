"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ══════════════════════════════════════════════════════════════════════════════
// 型定義
// ══════════════════════════════════════════════════════════════════════════════

interface ConsoleUser {
  uuid: string;
  agentId: string;
  name: string;
  role: "player" | "admin" | "super_admin";
  status: string;
  level: number;
  xp: number;
  division: string;
  divisionName: string;
  anomalyScore: number;
  observerLoad: number;
  lastLogin: string;
  loginCount: number;
  streak: number;
}

/** 単語単位の表示設定 */
interface Word {
  text: string;
  color?: string;   // 省略時はライン基本色
  bold?: boolean;
  glow?: boolean;   // テキストシャドウを付けるか
}

/** 埋め込みタグの種類 */
type TagType = "info-panel" | "warning-box" | "file-view" | "data-table";

/** 埋め込みパネルタグ */
interface EmbedTag {
  tagType: TagType;
  title?: string;
  rows: string[];   // 表示する行
  accent?: string;  // パネルの色
}

/** 一行の出力データ */
interface OutputLine {
  words: Word[];
  baseColor?: string;
  tag?: EmbedTag;   // この行の後に表示するタグ
}

/** スクリプトの1ターン */
interface ScriptTurn {
  /** 入力欄に最初から入っている文字（読み取り専用） */
  preset: string;
  /** 送信ボタンを押してから出力が始まるまでの遅延(ms) */
  lagMs?: number;
  /** 出力行 */
  output: OutputLine[];
  /** true = このターンが最後 → 送信後にボタンをロック */
  final?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// スクリプト定義
// ここを書き換えてシナリオを組む
// ══════════════════════════════════════════════════════════════════════════════

function buildScript(user: ConsoleUser): ScriptTurn[] {
  return [
    // ── ターン 1: 起動 / 認証 ────────────────────────────────────────────
    {
      preset: `ident --agent ${user.agentId} --init`,
      lagMs: 900,
      output: [
        {
          words: [
            { text: "IDENTITY", color: "#0ff", bold: true, glow: true },
            { text: "VERIFICATION", color: "#0ff", bold: true, glow: true },
            { text: "PROTOCOL", color: "#0a0" },
            { text: "INITIATED", color: "#0a0" },
          ],
        },
        {
          words: [
            { text: "Resolving agent record", color: "#0a0" },
            { text: "…", color: "#0a0" },
            { text: user.agentId, color: "#0f0", bold: true },
          ],
        },
        {
          words: [
            { text: "Display Name :", color: "#0a0" },
            { text: user.name, color: "#ff0", bold: true },
          ],
        },
        {
          words: [
            { text: "Clearance    :", color: "#0a0" },
            { text: `LEVEL ${user.level}`, color: user.level >= 4 ? "#f80" : "#0ff", bold: true, glow: true },
          ],
        },
        {
          words: [
            { text: "Role         :", color: "#0a0" },
            { text: user.role.toUpperCase(), color: user.role === "player" ? "#0f0" : "#f80", bold: true },
          ],
        },
        {
          words: [
            { text: "✓", color: "#0f0", bold: true },
            { text: "Authentication", color: "#0f0" },
            { text: "successful.", color: "#0f0" },
            { text: "Welcome,", color: "#0a0" },
            { text: user.name + ".", color: "#ff0", bold: true },
          ],
          tag: {
            tagType: "info-panel",
            title: "◈ AGENT RECORD",
            accent: "#0ff",
            rows: [
              `UUID          : ${user.uuid}`,
              `Division      : ${user.divisionName || user.division || "UNASSIGNED"}`,
              `XP Total      : ${user.xp.toLocaleString()} pts`,
              `Anomaly Score : ${user.anomalyScore}`,
              `Consecutive   : ${user.streak} days`,
              `Login Count   : ${user.loginCount}`,
              `Last Login    : ${user.lastLogin ? new Date(user.lastLogin).toLocaleString("ja-JP") : "N/A"}`,
            ],
          },
        },
      ],
    },

    // ── ターン 2: システムステータス ─────────────────────────────────────
    {
      preset: "sys --status --verbose",
      lagMs: 1400,
      output: [
        {
          words: [
            { text: "Polling", color: "#0a0" },
            { text: "system nodes", color: "#0a0" },
            { text: "…", color: "#0a0" },
          ],
        },
        {
          words: [
            { text: "Network  :", color: "#0a0" },
            { text: "ONLINE", color: "#0f0", bold: true },
            { text: "·", color: "#0a0" },
            { text: "Core     :", color: "#0a0" },
            { text: "NOMINAL", color: "#0f0", bold: true },
            { text: "·", color: "#0a0" },
            { text: "DB       :", color: "#0a0" },
            { text: "OK", color: "#0f0", bold: true },
          ],
        },
        {
          words: [
            { text: "⚠", color: "#ff0", bold: true, glow: true },
            { text: "Elevated anomaly index detected in", color: "#ff0" },
            { text: "Sector 7-C.", color: "#f80", bold: true, glow: true },
          ],
          tag: {
            tagType: "warning-box",
            title: "⚠  ANOMALY ALERT — SECTOR 7-C",
            accent: "#f80",
            rows: [
              "Erosion acceleration: +3,700% above baseline",
              "Observer Load      : CRITICAL (97 / 100)",
              "Geological pattern : UNCLASSIFIED",
              "",
              "推奨アクション: 即時エージェント派遣 / 調査報告提出",
            ],
          },
        },
        {
          words: [
            { text: "Observer Load :", color: "#0a0" },
            { text: `${user.observerLoad}`, color: user.observerLoad > 70 ? "#f00" : "#0f0", bold: true, glow: user.observerLoad > 70 },
            { text: "/ 100", color: "#0a0" },
          ],
        },
        {
          words: [
            { text: "Timestamp :", color: "#0a0" },
            { text: new Date().toLocaleString("ja-JP"), color: "#0ff" },
          ],
        },
      ],
    },

    // ── ターン 3: 機密ファイル取得 ───────────────────────────────────────
    {
      preset: "fetch --class=TOP_SECRET EROSION_LOG_7C",
      lagMs: 2200,
      output: [
        {
          words: [
            { text: "Connecting", color: "#0a0" },
            { text: "to classified archive", color: "#0a0" },
            { text: "…", color: "#0a0" },
          ],
        },
        {
          words: [
            { text: "ACCESS", color: "#f00", bold: true, glow: true },
            { text: "GRANTED", color: "#0f0", bold: true },
            { text: "—", color: "#0a0" },
            { text: `Level ${user.level}`, color: "#0ff" },
            { text: "clearance accepted.", color: "#0a0" },
          ],
        },
        {
          words: [
            { text: "Decrypting", color: "#0a0" },
            { text: "EROSION_LOG_7C.enc", color: "#ff0", bold: true },
            { text: "…", color: "#0a0" },
          ],
          tag: {
            tagType: "file-view",
            title: "📄 EROSION_LOG_7C.enc — DECRYPTED",
            accent: "#ff0",
            rows: [
              "DATE        : 2047-03-01  03:17:22 UTC+9",
              "ORIGIN      : Sector 7-C  Node #4 Monitoring Unit",
              "CLASSIF.    : TOP SECRET / OBSERVER CLEARANCE",
              "INTEGRITY   : SHA-256 VERIFIED ✓",
              "",
              "海蝕加速現象を観測。速度は通常比+3700%。",
              "既知のいかなる地質モデルとも合致しない。",
              "衛星映像との照合でも現地波形は説明不能。",
              "担当エージェントによる現地調査を強く要請する。",
            ],
          },
        },
        {
          words: [
            { text: "!", color: "#f00", bold: true },
            { text: "File retrieval logged to audit trail.", color: "#ff0" },
          ],
        },
      ],
    },

    // ── ターン 4: ミッション割り当て (最終) ─────────────────────────────
    {
      preset: `mission --assign SECTOR7C_INV --agent ${user.agentId}`,
      lagMs: 1600,
      final: true,
      output: [
        {
          words: [
            { text: "Processing", color: "#0a0" },
            { text: "mission assignment", color: "#0a0" },
            { text: "…", color: "#0a0" },
          ],
        },
        {
          words: [
            { text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", color: "#0ff" },
          ],
        },
        {
          words: [
            { text: "MISSION", color: "#0ff", bold: true, glow: true },
            { text: "ASSIGNED", color: "#0ff", bold: true, glow: true },
            { text: "—", color: "#0a0" },
            { text: "SECTOR 7-C INVESTIGATION", color: "#ff0", bold: true },
          ],
        },
        {
          words: [
            { text: "Agent", color: "#0a0" },
            { text: user.name, color: "#0f0", bold: true },
            { text: "has been dispatched.", color: "#0a0" },
          ],
          tag: {
            tagType: "data-table",
            title: "◈ MISSION PARAMETERS",
            accent: "#0ff",
            rows: [
              "TARGET       │ Sector 7-C — Anomalous Erosion Zone",
              "AGENT        │ " + user.agentId + " / " + user.name,
              "PRIORITY     │ CRITICAL  [S-CLASS]",
              "DEADLINE     │ 72 HOURS from timestamp",
              "EQUIPMENT    │ Standard field kit + Anomaly Sensor Mk.III",
              "INTEL LEVEL  │ " + `Level ${user.level}` + " required",
              "BACKUP       │ On-call — request via comms",
            ],
          },
        },
        {
          words: [
            { text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", color: "#0ff" },
          ],
        },
        {
          words: [
            { text: "Session", color: "#0a0" },
            { text: "locked.", color: "#f00", bold: true, glow: true },
            { text: "Good luck,", color: "#0f0" },
            { text: user.agentId + ".", color: "#ff0", bold: true },
          ],
        },
      ],
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// 埋め込みタグ コンポーネント
// ══════════════════════════════════════════════════════════════════════════════

function TagPanel({ tag }: { tag: EmbedTag }) {
  const c = tag.accent ?? "#0ff";
  return (
    <div
      style={{
        margin: "0.45rem 0 0.45rem 1.4rem",
        padding: "0.55rem 0.85rem",
        border: `1px solid ${c}`,
        boxShadow: `0 0 8px ${c}33, inset 0 0 6px ${c}11`,
        backgroundColor: `${c}0d`,
        fontFamily: "'Courier New', monospace",
        fontSize: "0.78rem",
        lineHeight: 1.75,
        animation: "tagFadeIn 0.25s ease",
      }}
    >
      {tag.title && (
        <div
          style={{
            color: c,
            fontWeight: "bold",
            letterSpacing: "0.06em",
            borderBottom: `1px solid ${c}55`,
            paddingBottom: "0.25rem",
            marginBottom: "0.4rem",
            textShadow: `0 0 7px ${c}`,
          }}
        >
          {tag.title}
        </div>
      )}
      {tag.rows.map((row, i) => (
        <div
          key={i}
          style={{
            color: tag.tagType === "warning-box" ? "#ff0" : c,
            whiteSpace: "pre",
          }}
        >
          {row || "\u00A0"}
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// レンダリング済み出力行
// ══════════════════════════════════════════════════════════════════════════════

interface RenderedLine {
  id: number;
  words: (Word & { visible: boolean })[];
  tag?: EmbedTag;
  tagVisible: boolean;
}

let _id = 0;
const uid = () => ++_id;

// ══════════════════════════════════════════════════════════════════════════════
// メインコンポーネント
// ══════════════════════════════════════════════════════════════════════════════

export default function ConsoleClient({ user }: { user: ConsoleUser }) {
  const router = useRouter();
  const script = buildScript(user);

  const [turnIdx, setTurnIdx]         = useState(0);
  const [rendered, setRendered]       = useState<RenderedLine[]>([]);
  const [processing, setProcessing]   = useState(false);
  const [locked, setLocked]           = useState(false);
  const [cursorOn, setCursorOn]       = useState(true);

  const outputRef = useRef<HTMLDivElement>(null);
  const busy      = useRef(false);

  const currentTurn = script[Math.min(turnIdx, script.length - 1)];

  // ── カーソル点滅 ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCursorOn(v => !v), 540);
    return () => clearInterval(t);
  }, []);

  // ── 自動スクロール ──────────────────────────────────────────────
  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollBottom(); }, [rendered, scrollBottom]);

  // ── 初期ウェルカムテキスト ─────────────────────────────────────
  useEffect(() => {
    const logo =
`    ██╗  ██╗ █████╗ ██╗███████╗██╗  ██╗ ██████╗ ██╗  ██╗██╗   ██╗
    ██║ ██╔╝██╔══██╗██║██╔════╝██║  ██║██╔═══██╗██║ ██╔╝██║   ██║
    █████╔╝ ███████║██║███████╗███████║██║   ██║█████╔╝ ██║   ██║
    ██╔═██╗ ██╔══██║██║╚════██║██╔══██║██║   ██║██╔═██╗ ██║   ██║
    ██║  ██╗██║  ██║██║███████║██║  ██║╚██████╔╝██║  ██╗╚██████╔╝
    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝
                      SCRIPTED SESSION v1.0`;

    const welcome: RenderedLine[] = [
      { id: uid(), words: [{ text: logo,                                            visible: true, color: "#0f0"  }], tagVisible: false },
      { id: uid(), words: [{ text: "═".repeat(72),                                  visible: true, color: "#0a0"  }], tagVisible: false },
      { id: uid(), words: [{ text: "SYSTEM ACCESS GRANTED",                         visible: true, color: "#0f0", bold: true }], tagVisible: false },
      { id: uid(), words: [{ text: `Agent : ${user.name} [${user.agentId}]`,        visible: true, color: "#0ff" }], tagVisible: false },
      { id: uid(), words: [{ text: `Session Start : ${new Date().toLocaleString("ja-JP")}`, visible: true, color: "#0a0" }], tagVisible: false },
      { id: uid(), words: [{ text: "═".repeat(72),                                  visible: true, color: "#0a0"  }], tagVisible: false },
      { id: uid(), words: [{ text: "",                                               visible: true }], tagVisible: false },
      { id: uid(), words: [{ text: "コンソールにコマンドがプリセットされています。",      visible: true, color: "#0a0" }], tagVisible: false },
      { id: uid(), words: [{ text: "「SEND」ボタンを押して実行してください。",           visible: true, color: "#0a0" }], tagVisible: false },
      { id: uid(), words: [{ text: "",                                               visible: true }], tagVisible: false },
    ];
    setRendered(welcome);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ユーティリティ ──────────────────────────────────────────────
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // ── ターン実行 ──────────────────────────────────────────────────
  async function runTurn(turn: ScriptTurn) {
    if (busy.current) return;
    busy.current = true;
    setProcessing(true);

    // コマンドエコー
    const echoLine: RenderedLine = {
      id: uid(),
      words: [
        { text: "root@kaishoku:~#", visible: true, color: "#0a0" },
        { text: " " + turn.preset,  visible: true, color: "#0f0", bold: true },
      ],
      tagVisible: false,
    };
    setRendered(prev => [...prev, echoLine]);

    // 送信ラグ
    await sleep(turn.lagMs ?? 800);

    // 各行を順番に出力
    for (const outLine of turn.output) {
      const lineId = uid();
      const newLine: RenderedLine = {
        id: lineId,
        words: outLine.words.map(w => ({ ...w, visible: false })),
        tag: outLine.tag,
        tagVisible: false,
      };

      // 行を追加（全単語非表示で）
      setRendered(prev => [...prev, newLine]);
      await sleep(40);

      // 単語を1つずつ表示
      for (let wi = 0; wi < outLine.words.length; wi++) {
        await sleep(70);
        setRendered(prev =>
          prev.map(l =>
            l.id === lineId
              ? { ...l, words: l.words.map((w, idx) => idx === wi ? { ...w, visible: true } : w) }
              : l
          )
        );
      }

      // タグが付いている場合は少し待ってから表示
      if (outLine.tag) {
        await sleep(180);
        setRendered(prev =>
          prev.map(l => l.id === lineId ? { ...l, tagVisible: true } : l)
        );
        await sleep(250);
      }

      await sleep(100);
    }

    // 区切り線
    const sep: RenderedLine = {
      id: uid(),
      words: [{ text: "─".repeat(66), visible: true, color: "#0a0" }],
      tagVisible: false,
    };
    const blank: RenderedLine = {
      id: uid(),
      words: [{ text: "", visible: true }],
      tagVisible: false,
    };
    setRendered(prev => [...prev, sep, blank]);

    if (turn.final) {
      setLocked(true);
    } else {
      setTurnIdx(i => i + 1);
    }

    setProcessing(false);
    busy.current = false;
  }

  function handleSend() {
    if (processing || locked) return;
    const turn = script[turnIdx];
    if (turn) runTurn(turn);
  }

  // ══════════════════════════════════════════════════════════════════
  // レンダー
  // ══════════════════════════════════════════════════════════════════

  return (
    <>
      <style>{`
        @keyframes blink    { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes flicker  { 0%,100%{opacity:1} 93%{opacity:.85} 95%{opacity:.65} 97%{opacity:.9} }
        @keyframes tagFadeIn{ from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes wordPop  { from{opacity:0;transform:translateX(-3px)} to{opacity:1;transform:none} }
        #con-out::-webkit-scrollbar       { width:6px }
        #con-out::-webkit-scrollbar-track { background:#000 }
        #con-out::-webkit-scrollbar-thumb { background:#0f0; box-shadow:0 0 4px #0f0 }

        .send-btn {
          background: transparent;
          border: 1px solid #0f0;
          color: #0f0;
          font-family: 'Courier New', monospace;
          font-size: 0.78rem;
          padding: 0.3rem 1rem;
          cursor: pointer;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: background 0.12s, box-shadow 0.12s;
        }
        .send-btn:hover:not(:disabled) {
          background: #0f0;
          color: #000;
          box-shadow: 0 0 14px #0f0;
        }
        .send-btn:disabled {
          border-color: #0a0;
          color: #0a0;
          cursor: not-allowed;
          opacity: 0.45;
        }
        .send-btn.busy {
          border-color: #ff0;
          color: #ff0;
          animation: flicker 0.7s infinite;
          cursor: wait;
        }
        .exit-btn {
          background: transparent;
          border: 1px solid #0a0;
          color: #0a0;
          font-family: 'Courier New', monospace;
          font-size: 0.78rem;
          padding: 0.3rem 0.8rem;
          cursor: pointer;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: background 0.12s;
        }
        .exit-btn:hover {
          background: #0a0;
          color: #000;
        }
        .word-in { animation: wordPop 0.13s ease forwards; }
      `}</style>

      {/* CRT scanline */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9,
        background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.035) 2px,rgba(0,0,0,0.035) 4px)",
      }} />

      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "1rem 1.2rem 2.4rem",
        backgroundColor: "#000",
        color: "#0f0",
        fontFamily: "'Courier New', monospace",
        overflow: "hidden",
        animation: "flicker 9s infinite",
      }}>

        {/* ── ヘッダー ───────────────────────────────────────────── */}
        <div style={{
          borderBottom: "1px solid #0f0",
          paddingBottom: "0.5rem",
          marginBottom: "0.75rem",
          flexShrink: 0,
        }}>
          <div style={{
            color: "#0f0",
            textShadow: "0 0 10px #0f0",
            fontSize: "0.85rem",
            letterSpacing: "0.04em",
            whiteSpace: "pre",
          }}>
{"╔══════════════════════════════════════════════════╗\n"}
{"║   SEA EROSION AGENCY  —  SYSTEM CONSOLE v2.1    ║\n"}
{"╚══════════════════════════════════════════════════╝"}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#0a0", marginTop: "0.25rem" }}>
            {locked
              ? "⚠  SESSION LOCKED — MISSION ASSIGNED"
              : processing
              ? "▌ PROCESSING …"
              : `TURN ${turnIdx + 1} / ${script.length}   ·   下のプリセットコマンドを確認して SEND を押してください`}
          </div>
        </div>

        {/* ── 出力エリア ─────────────────────────────────────────── */}
        <div
          id="con-out"
          ref={outputRef}
          style={{
            flex: 1,
            overflowY: "auto",
            lineHeight: 1.7,
            paddingBottom: "0.5rem",
          }}
        >
          {rendered.map(line => (
            <div key={line.id}>
              {/* 単語行 */}
              <div style={{
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                minHeight: "1.3em",
                marginBottom: "0.05rem",
                fontSize: "0.875rem",
              }}>
                {line.words.map((w, wi) =>
                  w.visible ? (
                    <span
                      key={wi}
                      className="word-in"
                      style={{
                        color: w.color ?? "#0f0",
                        fontWeight: w.bold ? "bold" : "normal",
                        textShadow: w.glow ? `0 0 7px ${w.color ?? "#0f0"}` : undefined,
                        marginRight: "0.32em",
                      }}
                    >
                      {w.text}
                    </span>
                  ) : (
                    // スペース確保用プレースホルダー
                    <span key={wi} style={{ marginRight: "0.32em", opacity: 0 }}>
                      {w.text}
                    </span>
                  )
                )}
              </div>

              {/* 埋め込みタグ */}
              {line.tag && line.tagVisible && <TagPanel tag={line.tag} />}
            </div>
          ))}

          {/* 処理中カーソル */}
          {processing && (
            <div style={{ color: "#0a0", fontSize: "0.8rem", marginTop: "0.3rem" }}>
              <span style={{ animation: "blink 0.75s infinite" }}>▌</span>
            </div>
          )}
        </div>

        {/* ── 入力エリア ─────────────────────────────────────────── */}
        <div style={{
          borderTop: "1px solid #0f0",
          paddingTop: "0.6rem",
          flexShrink: 0,
        }}>
          {/* プロンプト + プリセットコマンド表示 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.55rem",
            fontSize: "0.875rem",
          }}>
            <span style={{
              color: "#0f0",
              textShadow: "0 0 5px #0f0",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}>
              root@kaishoku:~#
            </span>

            {/* 読み取り専用プリセット表示 */}
            <div style={{
              flex: 1,
              color: locked ? "#0a0" : "#0f0",
              userSelect: "none",
              opacity: locked ? 0.5 : 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {locked ? (
                <span style={{ color: "#f00" }}>// SESSION LOCKED — NO FURTHER COMMANDS</span>
              ) : processing ? (
                <span style={{ color: "#ff0" }}>{currentTurn.preset}</span>
              ) : (
                <>
                  <span>{currentTurn.preset}</span>
                  <span style={{
                    display: "inline-block",
                    width: "0.5rem",
                    height: "0.9rem",
                    background: "#0f0",
                    marginLeft: "1px",
                    verticalAlign: "text-bottom",
                    opacity: cursorOn ? 1 : 0,
                    transition: "opacity 0.1s",
                  }} />
                </>
              )}
            </div>
          </div>

          {/* ボタン行 */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              className="exit-btn"
              onClick={() => router.push("/dashboard")}
            >
              EXIT
            </button>
            <button
              className={`send-btn${processing ? " busy" : ""}`}
              onClick={handleSend}
              disabled={locked || processing}
            >
              {processing ? "PROCESSING…" : locked ? "LOCKED" : "SEND  ↵"}
            </button>
          </div>
        </div>
      </div>

      {/* フッター免責 */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        padding: "0.3rem",
        textAlign: "center",
        fontSize: "0.58rem",
        color: "rgba(0,255,0,0.3)",
        borderTop: "1px solid rgba(0,255,0,0.1)",
        pointerEvents: "none",
        zIndex: 10,
        backgroundColor: "#000",
      }}>
        このサイトはフィクションです。現実の人物・施設・事件・場所・海蝕現象とは一切関係ありません。
      </div>
    </>
  );
}
