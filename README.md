# 海蝕機関 — kaishoku-next

ARG（代替現実ゲーム）向けWebアプリケーション。機関員として参加するプレイヤーが、チャット・ミッション・ノベルを通じてストーリーを進めていく没入型プラットフォームです。

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript 5 |
| データベース | Turso (libSQL / SQLite互換) |
| 認証 | JWT (Cookie) + メール認証 |
| メール送信 | Resend |
| 状態管理 | Zustand |
| データフェッチ | SWR |
| スタイリング | Tailwind CSS + インラインスタイル |
| デプロイ | Vercel 推奨 |

---

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

```env
# Turso データベース (必須)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# JWT署名鍵 (必須 / 本番では64文字以上のランダム文字列)
JWT_SECRET=change-this-to-a-random-64-char-string

# メール送信 (任意 / 未設定時はコンソールにログ出力)
RESEND_API_KEY=re_xxxxxxxxxxxx

# 公開URL (任意 / リダイレクト用)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. データベースマイグレーション

```bash
node --env-file=.env.local scripts/migrate.mjs
```

### 4. 初期データ投入（任意）

```bash
node --env-file=.env.local scripts/seed.mjs
```

### 5. 開発サーバー起動

```bash
npm run dev
```

---

## ディレクトリ構造

```
src/
├── app/
│   ├── (app)/              # 認証済みユーザー向けページ
│   │   ├── dashboard/      # ダッシュボード
│   │   ├── chat/           # グループチャット・NPC会話
│   │   ├── missions/       # ミッション一覧・参加
│   │   ├── novel/          # 記録文庫（ストーリーノベル）
│   │   ├── map/            # インシデントマップ
│   │   ├── divisions/      # 部署一覧・詳細
│   │   ├── entities/       # 実体カタログ
│   │   ├── locations/      # 地点情報
│   │   ├── database/       # データベース閲覧
│   │   ├── codex/          # コーデックス
│   │   ├── skill-tree/     # スキルツリー
│   │   ├── profile/        # プロフィール
│   │   └── ...
│   ├── (auth)/             # 非認証ページ（ログイン・登録）
│   ├── admin/              # 管理コンソール
│   │   ├── page.tsx        # 管理ハブ
│   │   ├── players/        # 機関員管理
│   │   ├── analytics/      # プレイヤー分析
│   │   ├── story-engine/   # フラグ・変数・イベント
│   │   ├── npc-scripts/    # NPCエンジン管理（7種）
│   │   ├── rule-engine/    # ルールエンジン管理（6種）
│   │   ├── map-admin/      # インシデントマップ編集
│   │   ├── novel-editor/   # ノベル編集
│   │   ├── balance-editor/ # XP・レベル調整
│   │   ├── chat-viewer/    # チャット閲覧
│   │   ├── announcements/  # お知らせ管理
│   │   ├── division-transfer/ # 部署異動承認
│   │   ├── dm/             # DMツール
│   │   └── db-editor/      # SQLクエリエディタ
│   └── api/                # APIルート
│       ├── admin/          # 管理者専用API
│       ├── auth/           # 認証API
│       ├── chat/           # チャットAPI
│       ├── npc/            # NPC処理API
│       ├── rule-engine/    # ルールエンジン公開API
│       └── users/me/       # ユーザー自身API
├── components/             # 共通UIコンポーネント
├── lib/                    # サーバーサイドユーティリティ
│   ├── auth.ts             # JWT認証
│   ├── db.ts               # Turso DBクライアント
│   ├── constants.ts        # レベル閾値・XP定数
│   ├── npc-engine.ts       # NPCトリガー・返答エンジン
│   ├── event-triggers.ts   # ストーリーイベント自動発火
│   ├── rule-engine.ts      # ルールエンジン共有ローダー
│   └── ...
├── store/                  # Zustandストア
└── middleware.ts           # 認証ガード・CSRF対策
```

---

## データベーススキーマ

マイグレーション（`scripts/migrate.mjs`）で作成される主要テーブル。

| テーブル | 用途 |
|---|---|
| `users` | プレイヤーアカウント（クリアランスレベル・異常スコア含む）|
| `divisions` | 部署マスタ |
| `progress_flags` | ユーザーごとのフラグ（ストーリー進捗）|
| `story_variables` | ユーザーごとの数値変数（XP等）|
| `fired_events` | 発火済みイベントの記録 |
| `notifications` | ユーザー通知 |
| `chat_messages` | チャットメッセージ |
| `xp_logs` | XP付与履歴（レート制限用）|
| `posts` | 掲示板投稿 |
| `bookmarks` | ブックマーク |
| `missions` | ミッション定義 |
| `division_transfer_requests` | 部署異動申請 |
| `access_logs` | アクセスログ |
| `revoked_tokens` | 無効化JWTトークン |

管理機能で追加される動的テーブル（初回アクセス時に自動作成）。

| テーブル | 用途 |
|---|---|
| `npc_scripts` | NPC会話スクリプト（分岐ツリー）|
| `npc_engine_rules` | NPCエンジンルール（トリガー・アイドル・反応等）|
| `rule_engine_entries` | ルールエンジン定義（ARGキーワード〜異常スコアルール）|
| `balance_config` | XP・レベル設定 |
| `map_incidents` | インシデントマップデータ |
| `novels_content` | ノベルコンテンツ |
| `anomaly_logs` | 異常スコア変動ログ |
| `achievement_defs` | 実績・バッジ定義（初回アクセス時シード）|
| `skill_tree_tracks` | スキルツリートラック・スキル定義 |

---

## 管理コンソール

`/admin` 以下は `admin` または `super_admin` ロールのユーザーのみアクセス可能。

### NPCエンジン管理 `/admin/npc-scripts`

7種類のNPC動作エンジンをDB管理。

| タブ | 説明 |
|---|---|
| 会話スクリプト | 分岐ツリー型の会話フロー。ノードにキーワード・返答・条件・エフェクトを設定 |
| トリガールール | キーワードにマッチしたときNPCがランダム返答を選択 |
| アイドル発言 | 自発的なNPCの独り言プール（重み付き選択）|
| NPC連鎖反応 | あるNPCの発言に別NPCが確率で相槌を打つ |
| スケジュール発言 | 時刻・曜日・確率で自動投稿 |
| 多段放送 | 複数NPCが時間差でシーケンシャルに発言するイベント |
| 条件放送 | フラグ取得・XP達成・レベル到達時の個別メッセージ送信 |

### ルールエンジン管理 `/admin/rule-engine`

ゲームロジックの根幹6種をDB管理。初回アクセス時にハードコードのデフォルト値が自動シードされます。

| タブ | 説明 | 影響するファイル |
|---|---|---|
| ARGキーワード | チャットハイライト・統計カウント用キーワード | `admin/players`, `admin/chat-viewer` が動的取得 |
| KNOWNフラグ | フラグキーの定義・フェーズ・カテゴリ管理 | `admin/players` のフラグ表示に反映 |
| インシデントライフサイクル | 経過日数・GSI閾値によるステータス自動遷移 | マップ取得時（GET）に自動評価・保存 |
| ノベル公開ルール | フラグ/レベル/日時/部署のAND・OR複合条件 | 記録文庫（`/novel`）のフィルタリングに統合 |
| XPイベントルール | イベント別XP・1日上限・倍率・付与条件 | `/api/users/me/xp` がDB優先で参照 |
| 異常スコア変動ルール | キーワード発言・フラグ取得によるスコア増減、閾値超過でステータス自動変更 | チャット送信時・NPC会話フラグ取得時に非同期評価 |

---

## NPC キャラクター

| ID | 部署 | 性格 |
|---|---|---|
| K-ECHO | 収束部門 | 冷静・分析的 |
| N-VEIL | 外事部門 | 謎めいた・哲学的 |
| L-RIFT | 工作部門 | 技術者・簡潔 |
| A-PHOS | 支援部門 | 温かい・気遣い |
| G-MIST | 港湾部門 | 不穏・不確か |

---

## 認証フロー

1. 登録 → メール認証トークン発行 → メール内リンクで認証
2. ログイン → JWT発行 → HttpOnly Cookie に保存
3. ミドルウェアがすべてのリクエストでトークンを検証
4. 管理者パスは `role: admin | super_admin` を確認

```
/login → POST /api/auth/login → JWT Cookie
/register → POST /api/auth/register → 認証メール送信
/api/auth/verify-email → Cookie更新
```

---

## XP・レベルシステム

クリアランスレベル 0〜5。

| レベル | 名称 | 必要XP（デフォルト）|
|---|---|---|
| 0 | 見習い | 0 |
| 1 | 補助要員 | 100 |
| 2 | 正規要員 | 300 |
| 3 | 上級要員 | 600 |
| 4 | 機密取扱者 | 1200 |
| 5 | 最高幹部 | 2500 |

閾値・XP報酬は `/admin/balance-editor` または `/admin/rule-engine`（XPイベントルール）で変更可能。

---

## セキュリティ対策

- **CSRF**: ミドルウェアで `X-Requested-With` ヘッダーを検証
- **ヘッダー偽装防止**: `x-user-level` / `x-user-role` をサーバー側で上書き
- **XSS**: チャットメッセージをサーバー側でサニタイズ
- **XP改ざん防止**: XP量はサーバー側の定義から決定（クライアント値は無視）
- **レート制限**: 同一アクティビティのXP付与に上限
- **権限分離**: `admin` / `super_admin` ロールで管理APIを保護

---

## 静的コンテンツ

`public/data/` 以下のJSONファイルはDBが空の場合のフォールバックとして使用されます。

| ファイル | 内容 |
|---|---|
| `novels-data.json` | 記録文庫コンテンツ |
| `entities-data.json` | 実体カタログ |
| `locations-data.json` | 地点情報 |
| `mission-data.json` | ミッション定義 |
| `modules-data.json` | モジュール |
| `personnel-data.json` | 人員データ |
| `divisions-data.json` | 部署データ |
| `map-incidents.json` | インシデントマップ初期データ |
| `progress-config.json` | XP・レベル設定（初期値）|

---

## Vercel Cron ジョブ

`vercel.json` に定義されています。Vercel Pro 以上のプランで有効になります。

| パス | スケジュール | 内容 |
|---|---|---|
| `/api/cron/email-reminder` | 毎日 02:00 UTC | 登録後48時間以上経過した未認証ユーザーにリマインドメールを送信 |

本番環境では `CRON_SECRET` 環境変数を設定し、Vercel ダッシュボードの Cron Jobs 設定で同値を使用してください。

---

## 開発コマンド

```bash
npm run dev         # 開発サーバー起動 (localhost:3000)
npm run build       # 本番ビルド
npm run start       # 本番サーバー起動
npm run typecheck   # TypeScript型チェック
npm run lint        # ESLint
npm run migrate     # DBマイグレーション
npm run seed        # 初期データ投入
```
