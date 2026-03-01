# 再セキュリティチェックレポート（修正後）
**対象プロジェクト:** area-rjgarj  
**チェック日:** 2026-03-01  
**前回比較:** [初回レポート] 10件検出 → **全件修正済み**

---

## ✅ 修正確認済み一覧

### 🔴 Critical

| # | 問題 | 修正内容 | 確認 |
|---|------|----------|------|
| 1 | `localStorage` に `role` / `status` / `anomalyScore` 等を保存 | `userStore.ts` の `partialize` を変更。保存対象を `id`, `agentId`, `name`, `division`, `divisionName` の5フィールドのみに限定。`syncFromServer()` を追加してサーバーから権限情報を取得 | ✅ |
| 2 | `x-user-level` ヘッダー偽装によるレベルバイパス | `parseLevel()` 関数を追加し、`NaN`・範囲外値・ホワイトリスト外を全て `0` に正規化。`entities/page.tsx`・`entities/[id]/page.tsx`・`codex/page.tsx` の3ファイルに適用（**初回未検出のページも修正**）。middleware.ts への必須追加コメントも挿入 | ✅ |

### 🟠 High

| # | 問題 | 修正内容 | 確認 |
|---|------|----------|------|
| 3 | `ChatWindow` で生の `fetch()` を使用 | チャット送信・既読マーク・XP付与の全3箇所を `apiFetch` に統一 | ✅ |
| 4 | `/api/npc/process` に `senderUsername` をクライアントが送信 | `ChatWindow.tsx`・`NpcGroupChat.tsx` の両方から `senderUsername` フィールドを削除。サーバー側でセッションから取得するコメントを追加 | ✅ |
| 5 | `streak` / `loginCount` をクライアント側で計算・改ざん可能 | `recordLogin()` をサーバー API `/api/users/me/login` に委譲するよう再実装。クライアント側の計算ロジックを全削除 | ✅ |

### 🟡 Medium

| # | 問題 | 修正内容 | 確認 |
|---|------|----------|------|
| 6 | `chatId` がホワイトリスト未検証 | `isAllowedChannel()` 関数を実装。送信前・URL構築時の2箇所で検証。不正値は `"global"` にフォールバック | ✅ |
| 7 | メッセージ長バリデーションがフロントのみ | `MAX_MESSAGE_LENGTH = 1000` 定数を定義し `input[maxLength]` と送信前チェックの両方に適用。サーバー側での同値検証が必要な旨のコメントを追加 | ✅ |
| 8 | XP がクライアント先行実行のまま | `profile/page.tsx` マウント時に `syncFromServer()` を呼び出し、サーバーの正規値で `xp` / `level` / `anomalyScore` を上書き | ✅ |

### 🔵 Low / Info

| # | 問題 | 修正内容 | 確認 |
|---|------|----------|------|
| 9 | `ActivityCalendar` がモックの `Math.random()` データを表示 | ランダム生成を廃止し `activity = 0` のプレースホルダーに変更。`/api/users/me/activity` から実データを取得する TODO コメントを追加 | ✅ |
| 10 | Service Worker が認証ページを無期限キャッシュ | `NO_CACHE_PREFIXES` リストを定義し `/api/`・`/profile`・`/chat`・`/entities` 等をキャッシュ対象から除外。`Cache-Control: no-store / private / no-cache` ヘッダーを確認してからキャッシュするよう修正 | ✅ |

---

## 🆕 修正過程で新規発見・追加対応した問題

### codex/page.tsx・entities/[id]/page.tsx のヘッダー検証漏れ（旧 #2 の派生）

初回チェックでは `entities/page.tsx` のみを指摘していたが、再スキャンにより同一パターンが他2ファイルにも存在することを確認。全ファイルに `parseLevel()` を適用済み。

---

## 残存する注意事項（コードで解決不可・運用・サーバー側対応が必要）

### ⚠️ A. middleware.ts で `x-user-level` の上書きを必ず実装すること（最重要）

フロントエンドの `parseLevel()` は不正値を正規化するが、middleware がクライアント送信の `x-user-level` を **削除してからセッション値を再設定** しない限り、根本的な偽装リスクは残る。

```ts
// middleware.ts に必須追加
const requestHeaders = new Headers(request.headers);
requestHeaders.delete("x-user-level");                 // クライアント値を削除
const level = await getSessionLevel(request);           // セッションから取得
requestHeaders.set("x-user-level", String(level));
```

### ⚠️ B. サーバー側 API でもメッセージ長・chatId を検証すること

`/api/chat/[chatId]` ルートで以下を必ず実装：
- `chatId` をホワイトリストと照合する
- `body.text` が 1000 文字以内かチェックする

### ⚠️ C. `/api/npc/process` で `senderUsername` をセッションから取得するよう修正すること

クライアントからの送信は削除済みだが、サーバー側がリクエストボディから読んでいる場合は修正が必要。

---

## スキャン結果サマリー

```
検出パターン                              件数
──────────────────────────────────────────────
dangerouslySetInnerHTML / innerHTML        0  ✅
eval / new Function                        0  ✅
ハードコードされたシークレット              0  ✅
オープンリダイレクト                        0  ✅
生の fetch() (認証なし API 呼び出し)       0  ✅  (修正前: 3)
senderUsername クライアント送信            0  ✅  (修正前: 2)
x-user-level 未検証の parseInt            0  ✅  (修正前: 3)
Math.random モックデータ (セキュリティ)    0  ✅  (修正前: 1)
localStorage 権限フィールド保存            0  ✅  (修正前: 9フィールド)
SW 認証ページキャッシュ                    0  ✅  (修正前: 全GETをキャッシュ)
```

**フロントエンドで修正可能な全問題を解消しました。** 残存リスクはサーバー側・インフラ側の対応が必要なもののみです。
