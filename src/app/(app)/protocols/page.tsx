import { headers } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "収束プロトコル - 海蝕機関" };

const TYPE_META: Record<string, { label: string; color: string }> = {
  convergence: { label: "収束作戦プロトコル", color: "#10b981" },
  containment:  { label: "実体収容プロトコル", color: "#ef4444" },
  evacuation:   { label: "区域避難プロトコル", color: "#3b82f6" },
  maintenance:  { label: "DEAN保守プロトコル", color: "#8b5cf6" },
  emergency:    { label: "緊急対応プロトコル", color: "#f59e0b" },
};

const THREAT_META: Record<string, { label: string; color: string; lv: number }> = {
  safe:     { label: "SAFE",     color: "#10b981", lv: 1 },
  caution:  { label: "CAUTION",  color: "#f59e0b", lv: 2 },
  danger:   { label: "DANGER",   color: "#ef4444", lv: 3 },
  critical: { label: "CRITICAL", color: "#ef4444", lv: 4 },
};

const DEPT_META: Record<string, string> = {
  convergence: "収束部門", support: "支援部門", engineering: "工作部門",
  foreign: "外事部門", port: "港湾部門", all: "全部門合同",
};

const STEP_TEMPLATES: Record<string, Record<string, string[]>> = {
  convergence: {
    safe:     ["現場に到着次第、GSI値を計測し本部へ報告する", "M-001空間安定化フィールドを展開する", "周辺50m以内の一般人を誘導退避させる", "実体の位置を特定し収束プロトコルを開始する", "GSI値が安全域（4.9以下）に低下したことを確認する", "残滓を回収して現場を撤収する", "収束完了報告を48時間以内に提出する"],
    caution:  ["現場半径100mを即時封鎖し、民間への進入禁止措置を取る", "GSI計測を30秒間隔で継続し本部へリアルタイム報告する", "M-001・M-008を同時展開する", "複数の実体が確認された場合は増援を要請する", "M-006認識阻害フィールドを展開し、目撃者の認識管理を行う", "実体の行動パターンを記録しつつ収束を実施する", "安全確認後、残滓の採取・分析を行う", "詳細な事案報告を提出する"],
    danger:   ["即時本部へ「DANGER級インシデント」として報告し、増援を要請する", "区域を半径300mで封鎖する", "M-013実体拘束網を展開して実体の移動を制限する", "M-003実体無力化パルスの使用許可を本部から取得する", "収束作業は最低3名のチームで実施する", "近隣住民に対し「ガス漏れ」を口実とした避難勧告を発令する", "収束後、汚染域の除染作業を行う", "全行動ログを保全し上位機関員に引き継ぐ"],
    critical: ["最高警戒態勢（CRITICAL ALERT）を発令し、全部門を招集する", "半径1km以内を完全封鎖する", "M-002次元境界封鎖を展開して実体の逃走を防ぐ", "LEVEL 4以上の機関員の指揮のもと収束チームを編成する", "M-019概念固定アンカーの使用許可を申請する", "メディア・SNS監視チームを設置し情報漏洩を防止する", "自衛隊・警察との連携プロトコルを発動する", "収束完了後、30日間の継続監視を行う"],
  },
  containment: {
    safe:     ["対象実体のIDと危険度分類を確認する", "一時収容ユニットを設置する", "M-013実体拘束網を展開する", "対象を収容ユニットへ誘導する", "収容完了を本部へ報告する", "輸送チームへ引き渡す"],
    caution:  ["対象実体の行動予測を行い、収容計画を策定する", "M-013・M-006を組み合わせた複合収容シーケンスを実施する", "収容中は30秒ごとに状態をモニタリングする", "輸送時は最低2名の護送機関員を配置する"],
    danger:   ["DANGER級実体の収容にはLEVEL 3以上の機関員が必要", "収容施設の事前準備と空間強化を実施する", "M-004時空間歪曲装置で実体の行動を遅延させる", "収容完了まで全行動を映像記録する"],
    critical: ["CLASSIFIED実体の収容手順は別途機密文書を参照すること", "本部直轄チームによる実施が原則", "作戦詳細はこのプロトコルに記載されない"],
  },
  evacuation: {
    safe:     ["対象区域の境界を設定し、立入禁止標識を設置する", "区域内の人員を確認し、誘導路を確保する", "口実説明文を配布する（ガス漏れ・耐震工事等）", "誘導完了後、人員確認を実施する", "避難完了を本部へ報告する"],
    caution:  ["行政機関との連携により交通規制を発令する", "報道機関には「取材自粛要請」を送付する", "避難誘導は制服着用の機関員ではなく私服で行う", "区域内に取り残された人員がいないか最終確認する"],
    danger:   ["自衛隊・警察と連携した強制避難を実施する", "ドローンによる区域内人員の最終確認を行う", "避難民の記憶管理プロトコルを発動する"],
    critical: ["国家緊急事態として内閣府と連携する", "対象区域の情報は最高機密として管理する"],
  },
  maintenance: {
    safe:     ["対象DEANステーションの稼働状態を確認する", "センサーキャリブレーションを実施する", "ログデータのバックアップを取得する", "異常がなければ正常稼働を本部へ報告する"],
    caution:  ["対象ステーションのファームウェアをアップデートする", "量子通信モジュールの接続テストを行う", "センサーの精度検証（GSI模擬値テスト）を実施する"],
    danger:   ["ハードウェア交換が必要な場合は工作部門へ要請する", "交換作業中はバックアップセンサーを一時稼働させる"],
    critical: ["DEAN中枢システムの保守は工作部門承認必須", "作業ログは全て保全し、監査証跡を残す"],
  },
  emergency: {
    safe:     ["インシデントの規模と種別を即座に確認する", "本部緊急回線へ報告する", "現場の安全確保を最優先に行動する", "支援要請を発令する"],
    caution:  ["全現場機関員に緊急避難シグナルを送信する", "M-014緊急退避装置の使用条件を確認する", "負傷者がいる場合は支援部門の医療チームを要請する"],
    danger:   ["DANGER以上のインシデントでは現場指揮官が全権を持つ", "メディアへの情報漏洩防止チームを即時展開する", "収束不可能と判断した場合の「消去域」指定プロトコルを発動する"],
    critical: ["CRITICAL緊急事態では機関長直轄の権限が発動する", "全機関員は上位命令に無条件に従う", "このプロトコルの詳細は口頭伝達のみとする"],
  },
};

const CATALOG = [
  { id: "PRO-STD-001", name: "標準収束プロトコル α型",      type: "convergence", threat: "safe",     dept: "収束部門",          lv: 1, desc: "SAFE級インシデントへの基本対応手順。全機関員が習得すべき標準プロトコル。" },
  { id: "PRO-STD-002", name: "標準収束プロトコル β型",      type: "convergence", threat: "caution",  dept: "収束部門・支援部門", lv: 2, desc: "CAUTION級インシデント向け。M-001・M-008の複合運用を含む。" },
  { id: "PRO-STD-003", name: "高脅威度収束プロトコル",       type: "convergence", threat: "danger",   dept: "全部門合同",         lv: 3, desc: "DANGER級実体への対応。LEVEL 3以上の機関員が指揮を執る。" },
  { id: "PRO-STD-004", name: "SAFE級実体収容手順",          type: "containment", threat: "safe",     dept: "収束部門",           lv: 1, desc: "低脅威度実体の一時収容・輸送の標準手順。" },
  { id: "PRO-STD-005", name: "区域避難 — 市民誘導手順",     type: "evacuation",  threat: "caution",  dept: "外事部門・支援部門", lv: 2, desc: "海蝕現象発生時の民間人避難誘導プロトコル。口実管理を含む。" },
  { id: "PRO-STD-006", name: "DEAN定期保守手順書",          type: "maintenance", threat: "safe",     dept: "工作部門",           lv: 1, desc: "各観測ステーションの月次点検・キャリブレーション手順。" },
  { id: "PRO-STD-007", name: "緊急事態対応フレームワーク",   type: "emergency",   threat: "danger",   dept: "全部門合同",         lv: 3, desc: "DANGER以上のインシデントにおける部門間連携と指揮系統の確立手順。" },
  { id: "PRO-STD-008", name: "臨界域対応プロトコル",        type: "emergency",   threat: "critical", dept: "全部門合同",          lv: 4, desc: "CRITICAL級事態への最終対応。機関長直轄権限のもとで発動される。" },
  { id: "PRO-STD-009", name: "次元境界封鎖手順",           type: "convergence", threat: "danger",   dept: "港湾部門・工作部門", lv: 3, desc: "M-002の使用を含む高度な次元封鎖プロトコル。港湾部門との連携が必須。" },
  { id: "PRO-STD-010", name: "認識阻害展開手順",           type: "evacuation",  threat: "caution",  dept: "外事部門",            lv: 2, desc: "M-006を使用した目撃者・住民への認識管理作業の手順書。" },
];

export default async function ProtocolsPage() {
  const h = await headers();
  const lvl = parseInt(h.get("x-user-level") ?? "0");

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "var(--primary)", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          OPERATIONAL DOCUMENTS // OPEN ACCESS
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "white", marginBottom: "0.5rem", textTransform: "uppercase" as const }}>
          収束プロトコル
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          CONVERGENCE PROTOCOLS — 標準作戦手順書
        </p>
      </div>

      {/* Type overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "2rem" }}>
        {Object.entries(TYPE_META).map(([key, tm]) => (
          <div key={key} className="card" style={{ padding: "0.75rem", borderColor: `${tm.color}22` }}>
            <div className="font-mono" style={{ fontSize: "0.62rem", color: tm.color, marginBottom: "0.25rem" }}>
              {key.toUpperCase()}
            </div>
            <div className="font-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
              {tm.label}
            </div>
          </div>
        ))}
      </div>

      {/* Protocol catalog */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="font-mono" style={{ fontSize: "0.7rem", color: "var(--primary)", letterSpacing: "0.12em", marginBottom: "1rem" }}>
          ▸ 標準プロトコル集 ({CATALOG.length}件)
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {CATALOG.map((proto) => {
            const tm = TYPE_META[proto.type];
            const th = THREAT_META[proto.threat];
            const locked = proto.lv > lvl;

            return (
              <div
                key={proto.id}
                className="card"
                style={{
                  borderColor: locked ? "rgba(255,255,255,0.05)" : `${tm?.color ?? "var(--primary)"}25`,
                  opacity: locked ? 0.55 : 1,
                }}
              >
                <div style={{ padding: "0.875rem 1.125rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                        <span className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)" }}>{proto.id}</span>
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "0.9rem", color: locked ? "rgba(255,255,255,0.4)" : "white" }}>
                          {proto.name}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0 0 0.5rem" }}>
                        {proto.desc}
                      </p>
                      <div className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>
                        担当: {proto.dept}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexShrink: 0, alignItems: "flex-end" }}>
                      <span className="font-mono" style={{
                        fontSize: "0.62rem", padding: "0.15rem 0.5rem",
                        backgroundColor: `${th?.color ?? "#6b7280"}15`,
                        border: `1px solid ${th?.color ?? "#6b7280"}40`,
                        color: th?.color ?? "#6b7280",
                      }}>
                        {th?.label}
                      </span>
                      <span className="font-mono" style={{
                        fontSize: "0.62rem", padding: "0.15rem 0.5rem",
                        backgroundColor: `${tm?.color ?? "var(--primary)"}12`,
                        border: `1px solid ${tm?.color ?? "var(--primary)"}35`,
                        color: tm?.color ?? "var(--primary)",
                      }}>
                        {tm?.label}
                      </span>
                      {locked && (
                        <span className="font-mono" style={{ fontSize: "0.58rem", color: "rgba(239,68,68,0.6)" }}>
                          🔒 LV{proto.lv}必要
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Steps — show only if unlocked */}
                  {!locked && (
                    <div style={{ marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                      <div className="font-mono" style={{ fontSize: "0.6rem", color: "var(--muted-foreground)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                        手順書
                      </div>
                      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {(STEP_TEMPLATES[proto.type]?.[proto.threat] ?? []).map((step, i) => (
                          <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "baseline" }}>
                            <span className="font-mono" style={{
                              fontSize: "0.6rem", color: tm?.color ?? "var(--primary)",
                              minWidth: "1.25rem", flexShrink: 0,
                            }}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.55 }}>
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                {/* Color bar */}
                <div style={{ height: "2px", background: locked ? "transparent" : `linear-gradient(90deg, ${tm?.color ?? "var(--primary)"}60, transparent)` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Threat level legend */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="font-mono" style={{ fontSize: "0.65rem", color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "0.875rem" }}>
          ▸ 脅威レベル定義
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.625rem" }}>
          {Object.entries(THREAT_META).map(([key, th]) => (
            <div key={key} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span className="font-mono" style={{
                fontSize: "0.62rem", padding: "0.15rem 0.5rem", flexShrink: 0,
                backgroundColor: `${th.color}15`, border: `1px solid ${th.color}40`, color: th.color,
              }}>
                {th.label}
              </span>
              <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                {{
                  safe:     "人員・装備ともに標準配備で対応可能。LEVEL 1以上の機関員が担当。",
                  caution:  "複数モジュールの併用と認識管理が必要。LEVEL 2以上推奨。",
                  danger:   "増援必須。LEVEL 3以上の指揮官の統率のもとでのみ実施可能。",
                  critical: "機関長直轄権限を発動。詳細手順は口頭伝達のみ。",
                }[key]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
