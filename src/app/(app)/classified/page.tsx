import { headers } from "next/headers";
import LockedContent from "@/components/ui/LockedContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "機密情報 - 海蝕機関" };

const DOCUMENTS = [
  {
    id: "doc-alpha",
    clearance: "ALPHA",
    color: "#ef4444",
    title: "設立令第零条 — 公開されなかった条文",
    date: "1987-03-07",
    body: `第零条（非公開）

海蝕機関の真の設立目的は、海蝕現象の「収束」ではない。

正式名称を「次元存続局」とする本機関の本来任務は、
すでに不可逆的に進行している次元崩壊を、
一般市民に知覚させることなく延命させることにある。

「収束」は比喩である。
私たちがモジュールで行っているのは、
穴をふさぐことではなく、穴を見えなくすることだ。

次元境界の完全崩壊まで、現行ペースで残り——
　　本文書作成時点での試算：62年から91年

本条文は最高幹部機関員のみが知る。
知った者は、引き返せない。`,
  },
  {
    id: "doc-beta",
    clearance: "BETA",
    color: "#f59e0b",
    title: "失踪機関員リスト — 非公式記録",
    date: "継続更新中",
    body: `以下は「任務中の事故」として処理されたが、
実際には次元境界に「取り込まれた」機関員の記録である。

K-001-077　西堂　隆矢　— 2019年11月消失。最後の通信：
  「境界の向こうに誰かいる。彼らは待っている。」

K-002-034　橘　茜　— 2021年03月消失。
  消失直前に提出したレポートは機密指定済み。
  本文は最高幹部のみ閲覧可。

K-003-159　名前不明　— 2022年08月消失。
  ID登録のみで個人情報が一切存在しない。
  採用担当者も採用した記憶がないと証言。

K-004-???　未登録　— 消失日不明。
  あなたは気づいているはずだ。
  機関員データベースにあなたのIDで重複登録が存在する。
  もう一人のあなたは、どこへ行ったのか。`,
  },
  {
    id: "doc-gamma",
    clearance: "GAMMA",
    color: "#8b5cf6",
    title: "観測者プロトコル — 存在の証明",
    date: "作成日：不明",
    body: `観測者は存在しない。

これはプロトコルの名称ではなく、事実の記述である。

「海蝕現象」と我々が呼んでいるものは、
次元境界の外側から「観測」しようとする存在が、
その観測行為によって生じる干渉パターンである。

観測者が次元を観測することで、次元が崩壊する。
そしてその観測者とは——

本段落以降は、当文書を閲覧した機関員の
異常スコアおよびオブザーバー負荷の数値によって
表示内容が変動します。

あなたの異常スコアが一定値を超えた時、
残りの文章が開示されます。

それまでは、知らないほうが安全です。`,
  },
  {
    id: "doc-delta",
    clearance: "DELTA",
    color: "#00d4ff",
    title: "収束完了後報告書 No.0001 — 再分類",
    date: "1991-07-14",
    body: `対象　　 : 次元インシデント　第一号
場所　　 : 長崎県　五島列島沖
GSI値　 : 最大測定値 9.2（計器限界）
担当部門 : 収束部門（当時：調査第一課）

収束の結果：「成功」と記録された。

ただし、現場に派遣された機関員17名のうち
帰還したのは3名である。

帰還した3名の証言（抜粋）：

「境界を閉じた瞬間、消えた14名は
 こちらを見て、笑っていました」

「彼らは助けを求めていたのではない。
 彼らは私たちを招いていたのです」

「私だけが気づいています。
 あの時帰還したのは私ではありません。
 本物の私は、あちら側に残っています」

本報告書は「収束の代償」という概念の
最初期記録として保存する。`,
  },
];

export default async function ClassifiedPage() {
  const h = await headers();
  const level = parseInt(h.get("x-user-level") ?? "0");
  if (level < 5) return <LockedContent requiredLevel={5} currentLevel={level} pageName="機密情報" />;

  return (
    <div className="animate-fadeIn" style={{ padding: "3rem 1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.75rem", color: "#ef4444", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>
          ⚠ LEVEL 5 CLEARANCE — EYES ONLY
        </div>
        <h1 style={{ fontSize: "2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#ef4444", marginBottom: "0.5rem" }}>
          機密情報
        </h1>
        <p className="font-mono" style={{ fontSize: "0.875rem", color: "rgba(255,82,82,0.6)" }}>
          本ページの閲覧はシステムに記録されます。
          本内容の無断複製・漏洩は処分対象です。
        </p>
      </div>

      {/* Warning banner */}
      <div style={{ padding: "1rem 1.25rem", backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", borderLeft: "4px solid #ef4444", marginBottom: "2rem" }}>
        <div className="font-mono" style={{ fontSize: "0.72rem", color: "#ef4444", lineHeight: 1.8 }}>
          あなたは今、機関が公式に存在を否定している情報にアクセスしようとしています。<br />
          この先を読んだ者は、「知らなかった」という弁明を失います。<br />
          それでも続けるならば、それがあなたの選択です。
        </div>
      </div>

      {/* Documents */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {DOCUMENTS.map(doc => (
          <div key={doc.id} className="card" style={{ borderLeft: `3px solid ${doc.color}80`, backgroundColor: `${doc.color}06` }}>
            <div style={{ padding: "1.5rem" }}>
              {/* Doc header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
                    <span className="font-mono" style={{ fontSize: "0.62rem", padding: "2px 8px", backgroundColor: `${doc.color}20`, color: doc.color, border: `1px solid ${doc.color}40` }}>
                      CLASSIFIED — {doc.clearance}
                    </span>
                    <span className="font-mono" style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)" }}>
                      {doc.date}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "1rem", color: "white" }}>
                    {doc.title}
                  </div>
                </div>
              </div>
              {/* Doc body */}
              <div style={{ backgroundColor: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem" }}>
                <pre className="font-mono" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.9, whiteSpace: "pre-wrap", margin: 0, fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
                  {doc.body}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="font-mono" style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "0.65rem", color: "rgba(239,68,68,0.5)", lineHeight: 1.8 }}>
        本ページへのアクセス日時：{new Date().toLocaleString("ja-JP")} | セッションID: CLASSIFIED | 閲覧記録：保存済
        <br />
        これ以上の情報は、異常スコアが基準値を超えた時に開示されます。
      </div>
    </div>
  );
}
