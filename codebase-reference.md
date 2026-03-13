# コードベース詳細リファレンス

> **プロジェクト**: area-rjgarj  
> **フレームワーク**: Next.js 15 (App Router) / TypeScript  
> **DB**: Turso (libSQL / SQLite互換)  
> **認証**: JWT (HttpOnly Cookie)  
> **状態管理**: Zustand  
> **バグ修正**: 30件 (2025年修正済み)

---

## 目次

1. [ディレクトリ構成](#1-ディレクトリ構成)
2. [ライブラリ層 (`src/lib/`)](#2-ライブラリ層-srclib)
3. [ストア層 (`src/store/`)](#3-ストア層-srcstore)
4. [型定義 (`src/types/`)](#4-型定義-srctypes)
5. [ミドルウェア (`src/middleware.ts`)](#5-ミドルウェア-srcmiddlewarets)
6. [APIルート — 認証系 (`/api/auth/`)](#6-apiルート--認証系-apiauth)
7. [APIルート — ユーザー自身 (`/api/users/me/`)](#7-apiルート--ユーザー自身-apiusersme)
8. [APIルート — 汎用公開系](#8-apiルート--汎用公開系)
9. [APIルート — 管理者系 (`/api/admin/`)](#9-apiルート--管理者系-apiadmin)
10. [APIルート — NPC系 (`/api/npc/`)](#10-apiルート--npc系-apinpc)
11. [APIルート — チャット系 (`/api/chat/`)](#11-apiルート--チャット系-apichat)
12. [APIルート — Cronジョブ (`/api/cron/`)](#12-apiルート--cronジョブ-apicron)
13. [フロントエンド — 認証画面 (`(auth)/`)](#13-フロントエンド--認証画面-auth)
14. [フロントエンド — アプリ画面 (`(app)/`)](#14-フロントエンド--アプリ画面-app)
15. [フロントエンド — 管理画面 (`admin/`)](#15-フロントエンド--管理画面-admin)
16. [共通UIコンポーネント (`src/components/`)](#16-共通uiコンポーネント-srccomponents)
17. [バグ修正一覧](#17-バグ修正一覧)
18. [DBテーブル一覧](#18-dbテーブル一覧)
19. [環境変数](#19-環境変数)

---

## 1. ディレクトリ構成

```
src/
├── app/
│   ├── (app)/          # ログイン必須の一般ユーザー画面
│   ├── (auth)/         # 認証画面（ログイン・登録）
│   ├── admin/          # 管理者専用画面
│   └── api/            # APIルートハンドラ
│       ├── auth/       # 認証API
│       ├── users/me/   # ログインユーザー自身のAPI
│       ├── admin/      # 管理者専用API
│       ├── npc/        # NPCエンジンAPI
│       ├── chat/       # チャットAPI
│       └── cron/       # Cronジョブ
├── components/         # 共通UIコンポーネント
├── lib/                # サーバー/クライアント共通ユーティリティ
├── store/              # Zustandクライアントストア
├── types/              # 型定義
└── middleware.ts       # 認証ガード・CSRF対策
```

---

## 2. ライブラリ層 (`src/lib/`)

### `db.ts` (89行)
**Turso (libSQL) データベースクライアントラッパー。**

| 関数 | 説明 |
|------|------|
| `getDb()` | シングルトンDBクライアントを返す。`globalThis.__db` でホットリロード時の多重生成を防止 |
| `query<T>(db, sql, args)` | SELECTクエリ実行、結果を`T[]`で返す |
| `queryOne<T>(db, sql, args)` | 1件だけ取得する`query`のショートカット |
| `execute(db, sql, args)` | INSERT/UPDATE/DELETE実行 |
| `transaction(db, fn)` | `fn(tx)`内の複数操作をアトミックに実行するトランザクションラッパー |

**注意点**: 接続時に `PRAGMA foreign_keys = ON` を自動実行し、外部キー制約を有効化している。環境変数 `TURSO_DATABASE_URL` が未設定の場合は即座にエラーを投げる。

---

### `auth.ts` (152行)
**JWT・パスワードハッシュ・認証ユーティリティ。**

| 関数/型 | 説明 |
|---------|------|
| `JwtPayload` | `{ userId, agentId, role, level }` — JWTに格納する最小限のペイロード型 |
| `signToken(payload)` | JWTを署名して返す。有効期限7日 |
| `verifyToken(token)` | JWTを検証し`JwtPayload`を返す。失敗時は`null` |
| `hashPassword(plain)` | bcryptでパスワードをハッシュ化（コスト係数12） |
| `verifyPassword(plain, hash)` | bcryptで照合 |
| `getAuthUser(req)` | CookieからJWTを取得しDBでユーザーを検索、`DbUser`を返す。`requireAuth`の重いDB版 |
| `formatUserResponse(dbUser)` | `DbUser`をフロントエンド用オブジェクトに変換 |
| `setAuthCookie(res, token)` | `kai_token` HttpOnly CookieにJWTをセット |

**JWT_SECRET**: 環境変数 `JWT_SECRET` を使用。本番環境で未設定の場合は起動時エラー。

---

### `server-auth.ts` (88行)
**Route Handler専用の同期認証ヘルパー（DBアクセスなし）。**

| 関数 | 説明 |
|------|------|
| `getJwtUser(req)` | CookieまたはAuthorizationヘッダーからJWTを同期検証し`JwtPayload`を返す |
| `requireAuth(req)` | 未認証なら`NextResponse(401)`を返す。認証済みなら`{ user: JwtPayload }`を返す |
| `requireAdmin(req)` | `requireAuth`に加え、roleが`admin`または`super_admin`でなければ`403`を返す |
| `requireSuperAdmin(req)` | roleが`super_admin`でなければ`403`を返す |
| `setAuthCookie(res, token)` | `kai_token` Cookieをセット（`auth.ts`のものと同一実装） |

**使い分け**: `getJwtUser`はDBアクセス不要な軽量チェックに、`getAuthUser`（`auth.ts`）はDB上の最新情報が必要な場合に使用する。

---

### `constants.ts` (84行)
**XP・レベル・レート制限の定数定義。サーバー・クライアント両方で使用。**

| エクスポート | 内容 |
|-------------|------|
| `LEVEL_THRESHOLDS` | レベル0〜5のXP閾値: `{ 0:0, 1:100, 2:300, 3:600, 4:1200, 5:2500 }` |
| `MAX_LEVEL` | `5` |
| `calculateLevel(xp)` | XP量からレベル（0〜5）を計算する関数 |
| `XP_REWARDS` | 各アクティビティのXP報酬量 (`first_login:50`, `daily_login:25`など) |
| `XP_RATE_LIMITS` | 各アクティビティの1日あたり上限回数（**バグ#26修正**: 1時間→1日基準に統一） |
| `DAILY_LOGIN_REWARDS` | 連続ログイン日数（7日周期）ごとの報酬XP |
| `ALLOWED_CHAT_CHANNELS` | 利用可能なチャンネルIDのSet: `global`, `npc_group`, `division_*` |
| `MAX_CHAT_MESSAGE_LENGTH` | チャットメッセージの最大長: `1000` |
| `AGENT_ID_REGEX` | 機関員IDのフォーマット正規表現: `/^[A-Z]-[A-Z0-9]{3}-[A-Z0-9]{3,5}$/` |

---

### `rate-limit.ts` (267行)
**ログイン試行レート制限ユーティリティ。`rate_limit_attempts`テーブルを使用。**

| 関数 | 説明 |
|------|------|
| `checkLoginRateLimit(ip, agentId)` | IP単位（10分20回）・アカウント単位（10分10回）でレート制限チェック |
| `recordLoginAttempt(ip, agentId, success)` | 試行を記録。成功時は失敗レコードをクリア |
| `checkRegisterRateLimit(ip)` | 登録試行をIP単位でチェック（10分5回） |
| `recordRegisterAttempt(ip, success)` | 登録試行を記録 |

**修正済みバグ**:
- **#2**: 孤立していたJSDocコメントを修正（コンパイルエラー解消）
- **#22**: ロックアウト残り時間の計算を最古レコード基準→**最新レコード基準**に変更（レコード削除による即時ロック解除を防止）

**テーブル自動作成**: 初回呼び出し時に`rate_limit_attempts`テーブルとインデックスを作成（冪等）。`global._rateLimitTableEnsured`フラグで重複実行を抑制。

---

### `event-triggers.ts` (121行)
**ストーリーイベント自動発火システムの定義とトリガー一覧。**

| 型/定数 | 説明 |
|---------|------|
| `TriggerUser` | トリガー評価に使うユーザー情報: `{ userId, level, xp, anomalyScore, observerLoad, loginCount, streak, flags, firedEvents }` |
| `TriggerEffect` | 発火時の効果: `{ flag?, flagValue?, xp?, notification? }` |
| `Trigger` | トリガー定義: `{ id, conditions(user), effects, getEffects?(user) }` |
| `TRIGGERS` | 全トリガー定義の配列。`check-triggers` APIがこれを評価する |

各トリガーは `conditions` 関数で発火条件を判定し、`effects`（または動的生成の`getEffects`）でフラグ・XP・通知を付与する。`fired_events`テーブルで発火済みを管理し、一度発火したトリガーは再発火しない。

---

### `npc-engine.ts` (424行)
**NPCキャラクター定義・トリガールール評価・レスポンス生成エンジン。**

| エクスポート | 説明 |
|-------------|------|
| `Npc` | NPCの型: `{ id, username, displayName, division, personality, delayMin, delayMax }` |
| `NPCS` | 5キャラクター（K-ECHO, N-VEIL, L-RIFT, A-PHOS, G-MIST）の定義 |
| `evalTriggerRules(db, text)` | キーワードトリガールールを評価してNPCレスポンスを生成 |
| `evalReactionRules(db, npcKey)` | 特定NPCへの連鎖反応ルールを評価 |
| `evalIdleRules(db)` | トリガーなし時のアイドル発言ルールを評価 |
| `evalBroadcastRules(db, text, userId)` | 多段放送ルールを評価 |
| `evalConditionRules(db, userId, level)` | ユーザー状態ベースの条件発言ルールを評価 |
| `checkConditions(db, userId, conditions)` | 分岐スクリプトの条件チェック |
| `applyEffects(db, userId, effects)` | 分岐スクリプトのエフェクト適用 |
| `loadScripts(db)` | DBからNPCスクリプト（`npc_scripts`テーブル）を読み込み |

**5つのNPCキャラクター**:
- `K-ECHO`: 収束部門、冷静・分析的
- `N-VEIL`: 外務部門、謎めいた・外交的
- `L-RIFT`: 技術部門、技術的・論理的
- `A-PHOS`: 支援部門、温かみ・共感的
- `G-MIST`: 不明部門、曖昧・不気味

---

### `rule-engine.ts` (41行)
**`rule_engine_entries`テーブルからルールを読み込むキャッシュ付きローダー。**

| 関数 | 説明 |
|------|------|
| `loadRules<T>(type)` | 指定タイプのルールを取得。60秒TTLのメモリキャッシュ付き |

ルールタイプ: `xp_rule`, `anomaly_rule`, `incident_lifecycle`, `npc_trigger`など。不正JSONは個別スキップしてパース失敗でも他ルールは動作継続する。

---

### `sanitize.ts` (59行)
**サーバーサイドXSSサニタイズユーティリティ。**

| 関数 | 説明 |
|------|------|
| `stripHtml(input)` | HTMLタグを除去し、エンティティをデコードしてプレーンテキストを返す |
| `sanitizeDisplayText(input)` | 単行テキスト用: `stripHtml` + 改行・タブを空白に変換 + 64文字切り捨て |
| `sanitizeMultilineText(input)` | 複数行テキスト用: `stripHtml` + 危険なURLプロトコルを除去 + 2000文字切り捨て |

投稿・チャット・プロフィール編集など、ユーザー入力をDBに保存する全APIで使用される。

---

### `session.ts` (37行)
**JWTベースのセッション管理（middleware・Server Component用）。**

| 型/関数 | 説明 |
|---------|------|
| `SessionData` | `{ userId, agentId, role, level? }` |
| `getSessionFromCookie(token)` | `kai_token` CookieのJWTを検証し`SessionData`を返す。asyncだが内部は同期 |

---

### `email.ts` (52行)
**メール送信ユーティリティ（現在は無効化済み）。**

メール認証は廃止され、秘密の質問による認証に移行。`sendVerificationEmail`は常に`{ ok: true }`を返すスタブ。`sendPasswordResetNotification`はコンソールログのみ出力する。平文パスワードの送信は行わない。

---

### `fetch.ts` (26行)
**認証Cookie自動付与のfetchラッパー（クライアントサイド用）。**

`apiFetch(url, init)` は標準`fetch`に以下を追加する:
- `credentials: "same-origin"` — セッションCookieを確実に送信
- `X-Requested-With: XMLHttpRequest` ヘッダー — CSRF対策（middlewareが検証）

---

### `user-format.ts` (53行)
**DBユーザーレコードをフロントエンド用フォーマットに変換するユーティリティ。**

| 関数 | 説明 |
|------|------|
| `fetchAndFormatUser(db, userId)` | DBからユーザー情報をJOINで取得し`FormattedUser`（= `User`型）に変換して返す |

---

### `npc-config.ts` (フロントエンド共通)
**クライアント側NPC定義（スタイル・色・アイコン）。**

| エクスポート | 説明 |
|-------------|------|
| `NPC_NAMES` | NPCキー配列: `["K-ECHO", "N-VEIL", "L-RIFT", "A-PHOS", "G-MIST"]` |
| `NPC_USERNAMES` | NPCキーのSet（チャットでNPCメッセージを識別するのに使用） |
| `NPC_COLORS` | 各NPCの境界線・背景・グロー・名前・ドットのCSS色定義 |
| `NPC_ICONS` | 各NPCのアイコン文字: `◈ ◉ ⬡ ♡ 〜` |

---

## 3. ストア層 (`src/store/`)

### `userStore.ts` (175行)
**ログインユーザーの状態管理（Zustand + persist）。**

`User`型フィールド: `id, agentId, name, role, status, level, xp, division, divisionName, loginCount, lastLogin, createdAt, streak, anomalyScore, observerLoad`

| アクション | 説明 |
|-----------|------|
| `setUser(user)` | ユーザーを設定しlocalStorageに非機密フィールドのみ永続化 |
| `clearUser()` | ユーザー情報・履歴・発見済みデータを全クリア（ログアウト時） |
| `addXp(amount)` | XPを加算し`calculateLevel`でレベルを再計算 |
| `recordLogin()` | `/api/users/me/login` を呼び出してstreak・login_countを更新（**バグ#25修正**: LoginFormから呼び出し接続済み） |
| `fetchUser()` | `/api/users/me` からユーザー情報を再取得 |

**セキュリティ**: localStorageには`id, agentId, name, division, divisionName`のみ保存。`role, xp, level`等はメモリのみ（`partialize`で制御）。

---

### `notificationStore.ts` (41行)
**トースト通知と未読バッジの管理。**

| アクション | 説明 |
|-----------|------|
| `addToast(toast)` | トースト追加（`crypto.randomUUID()`でID生成、6秒後自動削除） |
| `removeToast(id)` | トースト削除 |
| `setUnreadCount(n)` | システム通知未読数の設定 |
| `setUnreadChatCounts(counts)` | チャンネル別未読数の設定 |
| `totalUnreadChat()` | 全チャンネル未読数の合計 |

トーストタイプ: `xp | levelup | login | unlock | chat | mission | info | warn | error`

---

### `discoveredStore.ts` (77行)
**検索で発見したアイテムの永続管理（Zustand + persist）。**

ユーザーが検索で発見したミッション・エンティティ・モジュール等を記録し、「発見済みリスト」画面に表示する。最初の発見日時を保持（再発見でも`discoveredAt`は更新しない）。

---

### `historyStore.ts` (86行)
**閲覧・検索履歴の永続管理（Zustand + persist）。**

| ストア | 説明 |
|--------|------|
| `browseHistory` | ページ閲覧履歴（最大50件） |
| `searchHistory` | 検索履歴（最大100件） |
| `clearAll()` | ログアウト時に全履歴クリア |

---

## 4. 型定義 (`src/types/`)

### `user.ts` (13行)
`User`型は`userStore.ts`から再エクスポート（単一の型定義を維持するため）。

| 型 | 説明 |
|----|------|
| `User` | `userStore.ts`の`User`インターフェースへのre-export |
| `StoryState` | `{ flags, variables, history, firedSet }` — ストーリー進行状態の型 |

---

## 5. ミドルウェア (`src/middleware.ts`) (156行)

Next.js App Routerのすべてのリクエストに適用される認証・セキュリティガード。

**4つの役割**:

1. **ヘッダー偽装防止**: クライアント送信の`x-user-level`・`x-user-role`ヘッダーを削除し、JWT Cookieの値で上書きする
2. **CSRF対策**: `X-Requested-With`ヘッダーなしのPOST/PUT/DELETE/PATCHをブロック
3. **認証ガード**: 未認証ユーザーを`/login`にリダイレクト
4. **管理者保護**: `/admin`・`/api/admin`へのアクセスをadmin/super_adminに限定

**パブリックパス** (`PUBLIC_PATHS`): `/login`, `/register`, `/api/auth/*`, `/api/health`, `/_next`, 静的ファイルパス

---

## 6. APIルート — 認証系 (`/api/auth/`)

### `POST /api/auth/login` (139行)
**ユーザーログイン処理。**

1. IPアドレス・アカウントIDでレート制限チェック（`checkLoginRateLimit`）
2. DBからユーザーを取得（banned/suspended/pending/inactiveはブロック）
3. bcryptでパスワード検証
4. `last_login_at`・`status`・`login_count`をDB更新（**バグ#3修正**: `login_count`のインクリメントをここで実施）
5. 初回ログイン（`login_count === 0`だった場合）に+50 XP付与
6. JWTを生成し`kai_token` HttpOnly Cookieにセット
7. ユーザー情報をレスポンスに含める

**修正済みバグ**:
- **#3**: `login_count`がDBでインクリメントされず`isFirstLogin`が常に`true`になっていた問題を修正（無限XP搾取の防止）
- **#21**: レスポンスの`loginCount`がDBの実際値と乖離していた問題を修正

---

### `POST /api/auth/register` (115行)
**新規ユーザー登録。**

バリデーション: agentID形式（`AGENT_ID_REGEX`）、パスワード8文字以上、部門の有効性、秘密の質問と回答の必須チェック。IPアドレスのレート制限あり（10分5回）。パスワードはbcryptでハッシュ化後DBに保存。登録成功後は自動ログインしJWTをセット。

---

### `POST /api/auth/logout` (14行)
**ログアウト処理。**

`kai_token` Cookieを削除（maxAge=0で即時失効）して`/login`にリダイレクト。

---

### `GET /api/auth/check-id`
**エージェントIDの重複チェック（登録フォームリアルタイム確認用）。**

クエリパラメータ`id`のフォーマット検証とDB照合を行い`{ available: boolean }`を返す。

---

### `POST /api/auth/secret-question`
**秘密の質問によるパスワードリセット。**

1. agentIdとsecretQuestionでユーザーを特定
2. 秘密の回答をbcryptで照合
3. 一致すれば新しいパスワードをハッシュ化して更新

---

### `POST /api/auth/tutorial-complete`
**チュートリアル完了マーク。**

ユーザーの`tutorial_completed`フラグをDBに記録する。

---

## 7. APIルート — ユーザー自身 (`/api/users/me/`)

### `GET /api/users/me` (26行)
**ログインユーザーの基本情報取得。**

`getAuthUser`（DBクエリ版）でユーザーを取得し`formatUserResponse`でフロント用に整形して返す。JWTのみの軽量版と異なりDBの最新情報を返す。

---

### `POST /api/users/me/login` (124行)
**ログイン後のstreak・login_count・XP更新処理。**

`/api/auth/login`成功後にフロントエンド（LoginForm）から呼び出される（**バグ#4/#20/#30修正**: 以前はどこからも呼ばれていなかった）。

処理内容:
- 前回ログインからの経過日数で `isNewDay` を判定
- 連続ログイン日数（streak）を更新
- デイリーXP（初回ボーナス + 連続ログイン報酬）を付与
- `login_count`・`last_login_at`・`consecutive_login_days`・`xp_total`・`clearance_level`をDB更新
- `xp_logs`に記録
- レベルアップ時はJWTを再発行してCookieを更新

---

### `POST /api/users/me/xp` (101行)
**アクティビティに応じたXP付与。**

`activity`パラメータを受け取り、`rule_engine_entries`（`xp_rule`タイプ）またはフォールバックの`XP_REWARDS`定数からXP量を決定。1日の上限回数（`maxPerDay`）をチェック後にXPを付与・ログ記録。

**修正済みバグ**:
- **#26**: `XP_RATE_LIMITS`（1時間基準）と`maxPerDay`（1日基準）が混在していた矛盾を解消。クエリの基準時刻（`oneDayAgo`）に統一。

---

### `POST /api/users/me/daily-login` (75行)
**デイリーログインボーナス受取。**

当日分の受取済みチェック（`last_daily_bonus_at`で判定）後、7日周期の連続ログイン報酬XPを付与。

**修正済みバグ**:
- **#6**: `xp_logs`への書き込みが存在しなかった問題を修正（活動カレンダーに反映されなかった）
- **#23**: `new Date().toISOString()`→UTCの`setUTCDate`に変更（深夜帯のタイムゾーン差異によるstreak誤リセットを防止）

---

### `POST /api/users/me/check-triggers` (153行)
**ストーリートリガーの評価と発火処理。**

ユーザーの現在状態（レベル・XP・フラグ・streak等）を取得し、`TRIGGERS`配列の全トリガーを評価。条件を満たしかつ未発火のトリガーを実行しフラグ・XP・通知を付与する。

**修正済みバグ**:
- **#5**: 並列リクエスト時に同一トリガーが二重発火するレース条件を修正。`firedEvents`を`Set`で追跡し、発火直後にSetへ追加することで後続の同一ループでもスキップするよう変更。
- **#19**: レート制限なしでDB負荷が毎回発生していた問題を修正。ユーザーごとに最短60秒の`triggerRateMap`メモリキャッシュを追加。

---

### `GET/PUT /api/users/me/story-state` (104行)
**ストーリー進行状態（フラグ・変数・発火済みイベント）の読み書き。**

**GETレスポンス**: `{ flags, variables, history, firedSet }`

**PUTリクエスト**: `{ flags?, variables?, firedSet? }`
- `flags`: `progress_flags`テーブルに`UPSERT`
- `variables`: `story_variables`テーブルに書き込み（保護キー・特殊キーはスキップ）
- `firedSet`: `TRIGGERS`のホワイトリストに含まれるIDのみ`fired_events`に記録

**修正済みバグ**:
- **#8**: `observer_load`に`Math.max(0, ...)`がなく負値がDBに書き込まれていた問題を修正
- **#12**: `flags`・`variables`のキー数上限（200）追加（巨大オブジェクト送信によるDB肥大化DoS防止）
- **#28**: `story_variables.var_value`は数値カラムのため、数値以外の値を`Number.isFinite`でフィルタ（サイレントエラー防止）

---

### `GET/POST /api/users/me/bookmarks` (58行)
**ブックマークの取得・追加・削除。**

POSTで同一パスが存在すれば削除（トグル）、なければ追加。

**修正済みバグ**:
- **#11**: `type`と`itemId`のバリデーションなしで任意パスが保存可能だった問題を修正。`type`をホワイトリスト（8種）に限定し、`itemId`を`/^[\w-]+$/`・100文字以内に制限。

---

### `GET /api/users/me/achievements` (短)
**自分の取得済み実績一覧。**

`user_achievements`テーブルから取得済みIDを返す。

---

### `GET /api/users/me/activity` (短)
**アクティビティデータ取得（活動カレンダー用）。**

過去364日間のXPログを日別集計して返す。フラグ・変数・ログイン統計も含む。

---

### `PUT /api/users/me/profile` (短)
**プロフィール（表示名）更新。**

XSSサニタイズ後、32文字以内で`display_name`をDB更新。

---

### `PUT /api/users/me/password` (短)
**パスワード変更。**

現在のパスワードをbcryptで照合後、新パスワードをハッシュ化して更新。

---

### その他の`/api/users/me/`エンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/users/me/notifications` | GET | 通知一覧取得 |
| `/api/users/me/notifications/read` | POST | 通知を既読にする |
| `/api/users/me/events` | GET | 発火済みイベント一覧 |
| `/api/users/me/flags` | GET | 進行フラグ一覧 |
| `/api/users/me/variables` | GET | ストーリー変数一覧 |
| `/api/users/me/division-transfer` | POST | 部門移籍申請 |
| `/api/users/me/secret-question` | GET/PUT | 秘密の質問の確認・更新 |

---

## 8. APIルート — 汎用公開系

### `GET/POST /api/posts` (126行)
**掲示板投稿の一覧取得・新規投稿。**

**GET**: ユーザーのクリアランスレベル以下の公開済み投稿を返す。`division`クエリパラメータで部門フィルタ可能。

**POST**: 認証ユーザーが投稿を作成。`title`・`body`はXSSサニタイズ済み。投稿後にARGキーワード異常スコアルールを非同期適用。

**修正済みバグ**:
- **#10**: `getJwtUser`（DBアクセスなし）を使用していたため、BANされたユーザーがDBの最新statusに関わらず投稿できていた問題を修正。POSTでDBの最新`status`を確認するよう変更。

---

### `POST /api/posts/[id]/like` (34行)
**投稿へのいいねトグル。**

**修正済みバグ**:
- **#16**: 確認→DELETE/INSERTが非アトミックで並列リクエスト時に二重いいね・カウント不整合が発生していた問題を修正。`transaction`内でアトミックに処理。

---

### `GET /api/achievements` (34行)
**実績一覧取得（ユーザー解除状況付き）。**

**修正済みバグ**:
- **#17**: シークレット実績が全ユーザーに「???」として表示され、解除後も変化しなかった問題を修正。`user_achievements`テーブルで解除済みIDを取得し、解除済みのシークレット実績は正しくタイトルを表示。

---

### `GET /api/search` (191行)
**全カテゴリ横断検索（ミッション・エンティティ・モジュール・場所・人員・ノベル）。**

JSONファイル（`public/data/`）を検索対象として使用。ミッションはクリアランスレベルでフィルタリング。

**修正済みバグ**:
- **#18**: `fs.readFileSync`をリクエストごとに8回実行してNode.jsイベントループをブロックしていた問題を修正。モジュールレベルの`_jsonCache`（`Map`）でサーバー起動後の初回のみ読み込み、以降はキャッシュを返す。

---

### `GET/POST /api/missions/[id]/apply` (85行)
**ミッション参加申請の確認・作成。**

申請にはクリアランスレベル4以上が必要（DBの最新値を確認）。

**修正済みバグ**:
- **#13**: `missionId`を`missions`テーブルで実在確認せず、架空のIDで申請レコードが作成できていた問題を修正。

---

### その他の汎用エンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/announcements` | GET | お知らせ一覧 |
| `/api/skill-tree` | GET | スキルツリー定義取得 |
| `/api/rule-engine` | GET | ルールエンジン定義取得（クライアント用） |
| `/api/novels/[id]` | GET | ノベル詳細取得 |
| `/api/logs/[type]` | GET | XPログ・アクセスログ取得 |
| `/api/health` | GET | ヘルスチェック（認証不要） |

---

## 9. APIルート — 管理者系 (`/api/admin/`)

すべてのエンドポイントは`requireAdmin`（role: admin or super_admin）で保護されている。

### `GET/PUT/DELETE /api/admin/users/[id]` (180行)
**ユーザー個別の参照・編集・論理削除。**

**GET**: ユーザー詳細、フラグ、変数、発火済みイベントを一括取得。

**PUT**: `role, status, clearanceLevel, anomalyScore, displayName, clearSecretQuestion, xpTotal`を更新可能。
- `xpTotal`指定時: `calculateLevel`でレベルを自動計算しDB更新
- `clearanceLevel`単独指定時: DBの`xp_total`と照合し乖離が2以上なら400エラー（**バグ#24修正**）
- audit logに全操作を記録

**DELETE**: 論理削除（`deleted_at`のみセット）。admin/super_adminユーザーおよび自分自身は削除不可。

**修正済みバグ**:
- **#24**: `xpTotal`と`clearanceLevel`を同時送信した場合に第2のUPDATEが`clearance_level`を上書きしていた問題を修正。`clearanceLevel`単独指定時もXPとの整合性チェックを実施。

---

### `POST /api/admin/users/[id]/reset-password` (67行)
**管理者によるパスワード強制リセット。**

**修正済みバグ**:
- **#9**: `requireAdmin`のみでroleチェックしておらず、一般adminがsuper_adminのパスワードをリセットできていた問題を修正。呼び出し元adminが`super_admin`でない場合、対象ユーザーが`super_admin`であれば`403`を返す。

---

### `GET /api/admin/chats` (39行)
**チャット一覧の取得（管理者用チャット監視）。**

**修正済みバグ**:
- **#15**: `MAX(text)`で最新メッセージを取得していたため、辞書順最大値（文字列の大小比較）が返っていた問題を修正。サブクエリで`ORDER BY created_at DESC LIMIT 1`の`text`を取得するよう変更。

---

### `GET/DELETE /api/admin/chats/[chatId]` (38行)
**特定チャットのメッセージ一覧取得・全削除。**

**修正済みバグ**:
- **#1**: レスポンスのmap内に `\\n` リテラルが混入してTypeScriptコンパイルに失敗していた問題を修正。

---

### `GET/POST /api/admin/novels` (92行)
**ノベル（記録文庫）データの管理。**

**修正済みバグ**:
- **#14**: DELETE→INSERTループがトランザクションなしで実行されており、INSERT途中でエラーが発生すると全ノベルデータが消失するリスクがあった問題を修正。`transaction`ヘルパーを使用してアトミックに実行。

---

### `GET/POST /api/admin/map-incidents` (169行)
**マップインシデントデータの管理。**

**GET**: インシデント一覧取得後にライフサイクルルール（`incident_lifecycle`タイプ）を自動評価。変更があった場合は自動保存。

**POST**: 全インシデントを置き換え保存（トランザクション使用）。最大500件の上限あり。

**修正済みバグ**:
- **#29**: ライフサイクル適用後の自動保存がインシデント数に比例したN+1クエリになっていた問題を修正。変更があったインシデントをフィルタして`transaction`で一括UPDATEするよう変更。

---

### その他の管理者エンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/admin/users` | GET | ユーザー一覧 |
| `/api/admin/users/[id]/history` | GET | ユーザーのアクセスログ履歴 |
| `/api/admin/achievements` | GET/POST | 実績定義の管理 |
| `/api/admin/analytics` | GET | アクティビティ統計 |
| `/api/admin/balance` | GET/POST | ゲームバランス設定（XPルール等）の管理 |
| `/api/admin/db-query` | POST | 任意SQLクエリ実行（super_adminのみ） |
| `/api/admin/division-transfer` | GET/POST | 部門移籍申請の管理 |
| `/api/admin/dm/[agentId]` | GET/POST | 管理者→ユーザーへのDMチャット |
| `/api/admin/export` | GET | DBデータのCSVエクスポート |
| `/api/admin/fire-event` | POST | イベントの手動発火 |
| `/api/admin/mission-participants` | GET/PUT | ミッション参加者の管理 |
| `/api/admin/notifications` | POST | 全体通知の送信 |
| `/api/admin/npc-engine-rules` | GET/POST | NPCエンジンルールの管理 |
| `/api/admin/npc-script` | GET/POST | NPCスクリプトの管理 |
| `/api/admin/rule-engine` | GET/POST | ルールエンジンエントリの管理 |
| `/api/admin/skill-tree` | GET/POST | スキルツリー定義の管理 |
| `/api/admin/story-states` | GET | 全ユーザーのストーリー状態一覧 |

---

## 10. APIルート — NPC系 (`/api/npc/`)

### `POST /api/npc/process` (465行)
**ユーザー発言に対するNPCの応答処理。**

チャットウィンドウからユーザーが発言するたびにフロントエンドから呼び出される。

処理フロー:
1. `ALLOWED_CHAT_CHANNELS`チェック（**バグ#27修正**: `dm_admin_*`への明示的ブロックを追加）
2. ① 分岐スクリプトエンジン: DBのNPCスクリプトを評価
3. ② トリガールール: キーワードマッチでNPCレスポンス生成
4. ③ NPC連鎖反応: 最初に反応したNPCに対する他NPCの反応
5. ④ アイドル: トリガーなし時のランダム発言
6. ⑤ 多段放送: 追加キーワードトリガー
7. ⑥ 条件放送: ユーザー状態ベース（チャット時25%の確率で評価）

レスポンスは`{ responses: [{ npcKey, text, delaySeconds? }] }`の形式。NPC発言の実際のDB書き込みはフロントエンド側から`/api/npc/post`を呼ぶ（または`npc_group`チャットに直接投稿）。

**修正済みバグ**:
- **#27**: `ALLOWED_CHAT_CHANNELS`に`dm_admin_*`が含まれていないため現状は通らないが、将来の変更で漏れる可能性があった。`chatId.startsWith("dm_admin")`の明示的ガードを追加して二重防衛。

---

### `POST /api/npc/post` (40行)
**NPCメッセージをチャットDBに書き込む。**

`{ chatId, npcKey, text }`を受け取り`chat_messages`テーブルに`type: 'npc'`で挿入。`ALLOWED_CHAT_CHANNELS`チェック済み。

**修正済みバグ**:
- **#27**: `chatId.startsWith("dm_admin")`の明示的ブロックを追加。

---

## 11. APIルート — チャット系 (`/api/chat/`)

### `GET/POST /api/chat/[chatId]` (249行)
**チャットメッセージの取得・送信。**

**GET**: 指定チャンネルの最新50件を取得（`ALLOWED_CHAT_CHANNELS`・部門チャンネルの所属チェックあり）。

**POST**: メッセージを送信（サニタイズ・長さ制限・チャンネルアクセス権チェック後に`chat_messages`に挿入）。送信後にXPを付与（`chat_message`アクティビティ）。テキストにARGキーワードが含まれる場合、異常スコアルールを非同期適用。

### `POST /api/chat/[chatId]/read`
指定チャンネルの既読状態を更新。

### `GET /api/chat/unread`
全チャンネルの未読数を取得。

---

## 12. APIルート — Cronジョブ (`/api/cron/`)

### `GET /api/cron/npc-schedule`
**NPCスケジュール発言の自動実行（Vercel Cron等から定期呼び出し）。**

`CRON_SECRET`環境変数による認証後、`npc_engine_rules`テーブルの`schedule`タイプルールを評価。曜日・時間フィルタと確率チェックを通過したルールのNPCメッセージを`npc_group`チャンネルに投稿。

### `GET /api/cron/email-reminder`
**定期メールリマインダー（現在はスタブ）。**

---

## 13. フロントエンド — 認証画面 (`(auth)/`)

### `(auth)/login/LoginForm.tsx`
**ログイン・登録フォームの統合コンポーネント。**

ログイン成功後の処理（**バグ#4/#20/#30修正**後）:
1. `setUser(data.user)` でストアを更新
2. `/api/users/me/login` を非同期呼び出してstreak・login_countを正規更新
3. ログインボーナスがあればトーストで通知
4. `/dashboard`にリダイレクト

---

## 14. フロントエンド — アプリ画面 (`(app)/`)

| ページ | パス | 説明 |
|--------|------|------|
| ダッシュボード | `/dashboard` | ユーザーステータス、通知、部門情報の総合表示 |
| チャット | `/chat` | リアルタイムチャット（グローバル・NPC・部門チャンネル） |
| 掲示板 | `/bulletin` | 異常現象報告の投稿・閲覧 |
| ミッション | `/missions` | ミッション一覧と参加申請 |
| エンティティ | `/entities` | 異常エンティティのデータベース |
| モジュール | `/modules` | 技術モジュール一覧 |
| 場所 | `/locations` | 管理区域・施設一覧 |
| 人員 | `/personnel` | 機関員プロフィール |
| ノベル | `/novel` | 記録文庫（ARGストーリー） |
| マップ | `/map` | インタラクティブマップ |
| 検索 | `/search` | 全カテゴリ横断検索 |
| スキルツリー | `/skill-tree` | スキル習得ツリー |
| 実績 | `/achievements` | 実績一覧と解除状況 |
| プロフィール | `/profile` | ユーザープロフィール・設定 |
| 通知 | `/notifications` | システム通知一覧 |
| 履歴 | `/history` | 閲覧・検索履歴 |
| 発見済み | `/discovered` | 検索で発見したアイテム一覧 |
| 統計 | `/statistics` | XP・ログイン統計グラフ |
| コンソール | `/console` | コマンドラインインターフェース（ARGギミック） |
| 分類済み | `/classified` | 機密文書（クリアランスレベル制限） |
| Codex | `/codex` | 用語・設定集 |
| データベース | `/database` | 内部データベース閲覧 |
| プロトコル | `/protocols` | 機関内規程 |

---

## 15. フロントエンド — 管理画面 (`admin/`)

| ページ | パス | 説明 |
|--------|------|------|
| 管理トップ | `/admin` | 管理ダッシュボード |
| プレイヤー管理 | `/admin/players` | ユーザー一覧・編集・削除 |
| チャット監視 | `/admin/chat-viewer` | 全チャンネルのメッセージ監視・削除 |
| ノベルエディタ | `/admin/novel-editor` | ノベルデータの編集・保存 |
| マップ管理 | `/admin/map-admin` | マップインシデントの管理 |
| NPCスクリプト | `/admin/npc-scripts` | NPCの会話スクリプト編集 |
| ルールエンジン | `/admin/rule-engine` | XP・異常スコア・その他ルールの管理 |
| ストーリーエンジン | `/admin/story-engine` | ストーリーイベントのトリガー管理 |
| アナリティクス | `/admin/analytics` | アクティビティ統計グラフ |
| バランスエディタ | `/admin/balance-editor` | ゲームバランスパラメータの調整 |
| スキルツリー管理 | `/admin/skill-tree` | スキルツリー定義の編集 |
| 実績管理 | `/admin/achievements` | 実績定義の追加・編集 |
| アナウンス管理 | `/admin/announcements` | お知らせの作成・管理 |
| DBエディタ | `/admin/db-editor` | 直接SQLクエリ実行（super_adminのみ） |
| DM | `/admin/dm` | 管理者→ユーザーへのダイレクトメッセージ |
| 部門移籍管理 | `/admin/division-transfer` | 部門移籍申請の承認・拒否 |

---

## 16. 共通UIコンポーネント (`src/components/`)

### `layout/Sidebar.tsx`
**サイドバーナビゲーション。**

ユーザーのクリアランスレベルに応じてナビゲーション項目を動的表示。未読通知バッジ・チャット未読数を表示。ログアウトボタンは`/api/auth/logout`を呼び出し後に`clearUser()`でストアをクリア。

### `layout/UserProvider.tsx`
**サーバーコンポーネントからクライアントのuserStoreへのブリッジ。**

ページのサーバーサイドで取得したユーザー情報をZustandストアに反映する。

### `map/InteractiveMap.tsx`
**インタラクティブマップコンポーネント。**

Canvas/SVGベースのマップ表示。マップインシデントのオーバーレイ表示に対応。

### `search/SearchClient.tsx`
**検索フォームと結果表示コンポーネント。**

`/api/search`を呼び出し、結果をカテゴリ別に表示。ヒット結果は`discoveredStore`に自動追加。

### `ui/LockedContent.tsx`
クリアランスレベル不足時のロックコンテンツ表示。

### `ui/OnboardingModal.tsx`
初回ログイン時のチュートリアルモーダル。

### `ui/ToastContainer.tsx`
`notificationStore`のトーストキューを画面右下に表示するコンテナ。

### `ServiceWorkerRegistration.tsx`
PWA対応のService Worker登録コンポーネント。

---

## 17. バグ修正一覧

### 🔴 コンパイルエラー（ビルド不可）

| # | ファイル | 問題 | 修正内容 |
|---|---------|------|---------|
| 1 | `api/admin/chats/[chatId]/route.ts:18` | `\\n`リテラルが文字列外に混入。TypeScriptコンパイル失敗 | `\\n`リテラルを正しい改行コードに修正 |
| 2 | `lib/rate-limit.ts:219` | `/**`なしで`*/`が出現（孤立JSDoc）。コンパイル失敗、`recordLoginAttempt`関数が破損 | `*`を`/**`に修正してJSDocブロックを正しく開始 |

### 🔴 XP・ゲーム進行の致命的ロジックバグ

| # | ファイル | 問題 | 修正内容 |
|---|---------|------|---------|
| 3 | `api/auth/login/route.ts:87-90` | `login_count`がDBで一切インクリメントされず`isFirstLogin`が常に`true`。毎ログインで+50 XP | `UPDATE users SET login_count = login_count + 1`を追加 |
| 4 | `api/users/me/login/route.ts` + UI | `/api/users/me/login`がどのUIからも呼ばれていない。streak・login_countの正規更新経路がない | `LoginForm.tsx`のログイン成功後に`/api/users/me/login`を呼び出し |
| 5 | `api/users/me/check-triggers/route.ts` | レース条件：並列リクエスト時に`firedEvents`の読み取り→発火→書き込みが非アトミック。同一トリガーのXPが二重付与 | `firedEvents`を`Set`で管理し発火直後にSetへ追加。DB側は`ON CONFLICT DO NOTHING`で重複挿入を無視 |
| 6 | `api/users/me/daily-login/route.ts` | `xp_logs`への書き込みが存在しない。デイリーボーナスが活動カレンダーに一切反映されない | `xp_logs`への`INSERT`を追加 |
| 7 | `api/admin/users/[id]/route.ts:99-118` | `xpTotal`と`clearanceLevel`が同時送信されると第2のUPDATEが`clearance_level`を上書き | L118で`typeof xpTotal === "number" ? null : clearanceLevel`として競合を防止（既修正を確認） |
| 8 | `api/users/me/story-state/route.ts:76` | `observer_load`に`Math.max(0, ...)`がない。負の値がDBに書き込まれる | `Math.max(0, Math.min(100, ...))`でクランプ |

### 🔴 セキュリティ・認可バグ

| # | ファイル | 問題 | 修正内容 |
|---|---------|------|---------|
| 9 | `api/admin/users/[id]/reset-password/route.ts:12` | `requireAdmin`のみ。一般adminがsuper_adminのパスワードを強制リセットできる（権限昇格） | 呼び出し元が`super_admin`でない場合、対象が`super_admin`なら403を返す |
| 10 | `api/posts/route.ts:48` | `getJwtUser`（DBアクセスなし）を使用。BANされたユーザーがDBの最新statusに関わらず投稿できる | POST時にDBの最新`status`を確認してbanned/suspendedをブロック |
| 11 | `api/users/me/bookmarks/route.ts:26` | `pagePath = type + "/" + itemId`がノーバリデーション。任意パスが保存可能（パス注入） | `type`をホワイトリスト化、`itemId`を正規表現・長さ制限でバリデーション |
| 12 | `api/users/me/story-state/route.ts` PUT | フラグ・変数オブジェクトのサイズ上限なし。巨大なオブジェクトを送り続けてDB肥大化DoS可能 | `flags`・`variables`のキー数上限を200に制限 |
| 13 | `api/missions/[id]/apply/route.ts` | `missionId`をミッションテーブルで実在確認しない。架空のmissionIDで申請レコードが作成される | `missions`テーブルで`id`の実在を確認、なければ404を返す |

### 🔴 データ整合性バグ

| # | ファイル | 問題 | 修正内容 |
|---|---------|------|---------|
| 14 | `api/admin/novels/route.ts:76-82` | DELETE→INSERTループがトランザクションなし。INSERT途中でエラーが発生すると全ノベルデータが消失する | `transaction`ヘルパーでアトミックに実行 |
| 15 | `api/admin/chats/route.ts:17` | `MAX(text)`で最新メッセージを取得。文字列の辞書順最大値が返り最新チャットが正しく表示されない | サブクエリで`ORDER BY created_at DESC LIMIT 1`の`text`を取得 |
| 16 | `api/posts/[id]/like/route.ts` | いいね確認→DELETE/INSERTがトランザクションなし。並列リクエストで二重いいねやカウント不整合 | `transaction`内でアトミックに処理 |

### 🟠 機能不全バグ

| # | ファイル | 問題 | 修正内容 |
|---|---------|------|---------|
| 17 | `api/achievements/route.ts` | ユーザーの解除済みチェックなし。全シークレット実績が全ユーザーに「???」と表示され、解除後も変化なし | `user_achievements`テーブルで解除済みIDを取得し、解除済みシークレット実績は正しくタイトルを表示 |
| 18 | `api/search/route.ts:26-28` | `fs.readFileSync`を8回asyncルートハンドラ内で同期実行。検索のたびにNode.jsイベントループをブロック | モジュールレベルの`_jsonCache`（Map）でサーバー起動後の初回のみ読み込み |
| 19 | `api/users/me/check-triggers/route.ts` | レート制限なし。ダッシュボードロードのたびに全トリガーをフルスキャンするDB負荷 | ユーザーごとに60秒のメモリレート制限（`triggerRateMap`）を追加 |
| 20 | `api/users/me/login/route.ts` | `/api/users/me/login`はどのページからも呼ばれていない。streakの連続ログイン管理が機能していない | `LoginForm.tsx`から呼び出し（#4と同一修正） |

### 🟠 その他の深刻なバグ

| # | ファイル | 問題 | 修正内容 |
|---|---------|------|---------|
| 21 | `api/auth/login/route.ts:121` | レスポンスの`loginCount: dbUser.login_count + 1`はDBに書かれないフェイク値。フロントに表示される数値が常に実際値+1ずれる | #3の修正でDBへの書き込みが実施されるため値が一致 |
| 22 | `lib/rate-limit.ts` | ロックアウト残り時間計算が最古レコード基準。レコードが削除されると即ロック解除になる可能性 | 最新レコード基準に変更（IP・アカウント両方） |
| 23 | `api/users/me/daily-login/route.ts:26-29` | `new Date()`でローカルタイム日付を生成して`toISOString()`でUTCに変換。タイムゾーン差異により深夜帯にstreakが誤リセット | 全日付計算をUTCの`setUTCDate`に統一 |
| 24 | `api/admin/users/[id]/route.ts` | `clearanceLevel`を直接書ける管理者API。`xp_total`との整合性チェックなしにレベルのみ更新可能 | `clearanceLevel`単独指定時、DBの`xp_total`と照合して乖離±2超なら400エラー |
| 25 | `store/userStore.ts` | `recordLogin()`が定義されているがどこからも呼ばれていない。実装したが接続されなかったdead code | `LoginForm.tsx`での`/api/users/me/login`呼び出しにより実質接続（#4/#20と同一） |
| 26 | `api/users/me/xp/route.ts` | XPレート制限が「1時間」基準の定数`XP_RATE_LIMITS`と「1日」基準の`maxPerDay`が混在。実際のレート計算が矛盾 | `XP_RATE_LIMITS`のコメントを1日基準に統一。クエリは`oneDayAgo`で統一済み |
| 27 | `api/npc/process/route.ts` + `api/npc/post/route.ts` | NPCが`dm_admin_*`チャンネルに書き込める可能性（`ALLOWED_CHAT_CHANNELS`は含まないが検証箇所が分散） | 両ファイルに`chatId.startsWith("dm_admin")`の明示的ブロックを追加（二重防衛） |
| 28 | `api/users/me/story-state/route.ts` PUT | `variables`の各キーに型チェックなし。数値以外の値を`story_variables.var_value`（数値カラム）に書き込もうとしてサイレントエラー | `Number.isFinite(numValue)`チェックを追加し、非数値はスキップ |
| 29 | `api/admin/map-incidents/route.ts` | ライフサイクルルール適用後の自動保存がインシデント数に比例してN+1クエリ | 変更インシデントをフィルタして`transaction`で一括UPDATE |
| 30 | `api/auth/login/route.ts` + `api/users/me/login/route.ts` | 両APIが独立してstreak更新フローを持つが、実際には`auth/login`は更新せず`me/login`は呼ばれない。ログイン時にstreakが更新されない | `LoginForm.tsx`から`me/login`を呼び出し（#4/#20/#25と同一） |

---

## 18. DBテーブル一覧

| テーブル名 | 主な用途 |
|-----------|---------|
| `users` | ユーザーアカウント（login_count, xp_total, clearance_level, consecutive_login_days等） |
| `divisions` | 部門マスタ（id, slug, name） |
| `posts` | 掲示板投稿（like_count, required_clearance等） |
| `likes` | 投稿へのいいね（user_id, post_id） |
| `chat_messages` | チャットメッセージ（chat_id, sender_id, type） |
| `progress_flags` | ユーザーのストーリー進行フラグ（user_id, flag_key, flag_value） |
| `story_variables` | ユーザーのストーリー変数（user_id, var_key, var_value: 数値） |
| `fired_events` | 発火済みイベント記録（user_id, event_id） |
| `xp_logs` | XP付与ログ（user_id, activity, xp_gained, created_at） |
| `achievement_defs` | 実績定義マスタ（title, description, secret） |
| `user_achievements` | ユーザーの解除済み実績（user_id, achievement_id） |
| `notifications` | システム通知（user_id, type, title, body） |
| `bookmarks` | ブックマーク（user_id, page_path, label） |
| `missions` | ミッション定義（securityLevel等） |
| `mission_participants` | ミッション参加申請（mission_id, user_id, status） |
| `novels_content` | ノベルデータ（id, data: JSON） |
| `map_incidents` | マップインシデント（id, data: JSON） |
| `rule_engine_entries` | ルールエンジン定義（type, data_json, active, priority） |
| `npc_engine_rules` | NPCエンジンルール（type, npc_key, data_json, active） |
| `npc_scripts` | NPC分岐スクリプト（npc_key, steps: JSON） |
| `rate_limit_attempts` | レート制限試行記録（key_type, key_value, attempted_at, success） |
| `access_logs` | アクセス・操作ログ（user_id, method, path, status_code） |
| `npc_states` | NPCスクリプト進行状態（user_id, chat_id, script_id, step_id） |
| `skill_tree` | スキルツリー定義（data: JSON） |
| `announcements` | お知らせ（title, body, published_at） |

---

## 19. 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `TURSO_DATABASE_URL` | ✅ | Turso DBの接続URL |
| `TURSO_AUTH_TOKEN` | ✅ (本番) | TursoのJWT認証トークン |
| `JWT_SECRET` | ✅ (本番) | JWTの署名・検証に使用するシークレット。本番環境で必須（未設定時はエラー） |
| `CRON_SECRET` | 推奨 | `/api/cron/*`への不正アクセスを防ぐBearerトークン |
| `NODE_ENV` | — | `production`の場合、JWT_SECRET未設定で起動エラー。Cookieの`secure`フラグに使用 |
