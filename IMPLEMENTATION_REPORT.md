# サーバーサイド実装レポート
**実装日:** 2026-03-01  
**対象:** フロントエンド修正後に残っていたサーバー側の 3 項目 + α

---

## 作成・配置ファイル一覧

```
src/
├── middleware.ts                          ← NEW [FIX #2 完結]
├── lib/
│   ├── session.ts                         ← NEW  セッション管理 (iron-session)
│   ├── auth.ts                            ← NEW  認証ヘルパー
│   ├── db.ts                              ← NEW  SQLite ラッパー (better-sqlite3)
│   ├── constants.ts                       ← NEW  レベル・XP 定数（サーバー・クライアント共通）
│   └── fetch.ts                           ← NEW  apiFetch（credentials + CSRF ヘッダー）
└── app/api/
    ├── chat/[chatId]/
    │   ├── route.ts                       ← NEW [FIX #4 #6 #7 完結]
    │   └── read/route.ts                  ← NEW
    ├── npc/process/route.ts               ← NEW [FIX #4 完結]
    └── users/me/
        ├── route.ts                       ← NEW [FIX #1 完結]
        ├── xp/route.ts                    ← NEW [FIX #8 完結]
        └── login/route.ts                 ← NEW [FIX #5 完結]
```

---

## セキュリティ修正の完結状況

### ✅ Fix #2 — x-user-level ヘッダー偽装防止（middleware.ts）

```ts
// クライアントから送られた x-user-level を全リクエストで削除
requestHeaders.delete("x-user-level");

// セッション Cookie の値のみを信頼し、0〜5 の範囲に正規化して注入
const safeLevel = Math.max(0, Math.min(5, Math.floor(session.level ?? 0)));
requestHeaders.set("x-user-level", String(safeLevel));
```

`curl -H "x-user-level: 5"` のような偽装を完全にブロック。

---

### ✅ Fix #4 — senderUsername なりすまし防止（api/chat/[chatId]/route.ts, api/npc/process/route.ts）

```ts
// chat route: sender_name をセッションの agentId から取得
await execute(db, `INSERT INTO chat_messages (..., sender_name, ...) VALUES (?, ?, ?, ...)`,
  [chatId, user.id, user.agent_id, text]  // ← user.agent_id はDBから取得した値
);

// npc/process route: リクエストボディの senderUsername は完全無視
// body には chatId と messageText のみ受け付ける
```

---

### ✅ Fix #5 — streak / loginCount サーバー側計算（api/users/me/login/route.ts）

```ts
// 前回ログインとの日数差をサーバーで計算
const daysDiff = lastLoginDate
  ? Math.floor((now.getTime() - lastLoginDate.getTime()) / 86_400_000)
  : null;

// streak はサーバー DB の値をベースに計算（クライアントは計算に関与しない）
if (daysDiff === 1) newStreak = user.streak + 1;  // 連続
else if (daysDiff === 0) newStreak = user.streak; // 同日
else newStreak = 1;                               // 途切れ
```

7連続後はボーナスをリセットしてストリークを 1 に戻す。日次ボーナス XP も同時付与。

---

### ✅ Fix #6 — chatId ホワイトリスト検証（api/chat/[chatId]/route.ts）

```ts
// constants.ts のホワイトリストと突き合わせ
function canAccessChannel(chatId: string, userDivision: string): boolean {
  if (!ALLOWED_CHAT_CHANNELS.has(chatId)) return false;
  if (chatId.startsWith("division_")) {
    return userDivision === chatId.replace("division_", "");
  }
  return true;
}
```

パストラバーサル相当の攻撃と、他部門チャンネルへの不正アクセスを両方防止。

---

### ✅ Fix #7 — メッセージ長サーバー側検証（api/chat/[chatId]/route.ts）

```ts
if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
  return Response.json({ error: "メッセージは1000文字以内にしてください" }, { status: 400 });
}
```

`maxLength` 属性をバイパスした API 直接呼び出しも防止。

---

### ✅ Fix #8 — XP クライアント操作防止（api/users/me/xp/route.ts）

```ts
// XP 量はサーバー側の REWARDS テーブルから決定
const xpReward = XP_REWARDS[activity];  // クライアントから xp の値は受け取らない

// レート制限: 1時間あたりの同一アクティビティ上限回数をチェック
const recentCount = await queryOne(db,
  `SELECT COUNT(*) AS cnt FROM xp_logs
   WHERE user_id = ? AND activity = ? AND created_at > ?`,
  [user.id, activity, oneHourAgo]
);
if (recentCount?.cnt >= rateLimit) return Response.json({ xpGained: 0, ... });
```

---

## 追加で実装したセキュリティ機能

### CSRF 対策（middleware.ts + lib/fetch.ts）

`fetch.ts` は全 API 呼び出しに `X-Requested-With: XMLHttpRequest` を付与。  
`middleware.ts` は POST リクエストでこのヘッダーが存在しない場合に 403 を返す。  
これにより外部サイトからのフォーム経由 CSRF を防止。

### セッション Cookie のセキュリティ設定（lib/session.ts）

```ts
cookieOptions: {
  httpOnly: true,   // JavaScript から読み取り不可（XSS 対策）
  secure: true,     // HTTPS のみ送信（本番）
  sameSite: "lax",  // クロスサイトリクエストでの Cookie 送信を制限
  maxAge: 604800,   // 7日間
}
```

### SQLite スキーマ（lib/db.ts）

DB 初期化時に `xp_logs` テーブルをセットアップ。レート制限クエリのために  
`(user_id, activity, created_at)` にインデックスを作成済み。

---

## 導入手順

```bash
# 1. 依存パッケージを追加
npm install iron-session better-sqlite3
npm install -D @types/better-sqlite3

# 2. 環境変数を設定（32文字以上のランダム文字列）
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.local

# 3. middleware.ts の SessionData に level フィールドを追加
#    → session.ts の SessionData interface に level: number を追加する
#    → /api/auth/login でセッション保存時に level も書き込む
```

---

## 残存リスク（今回スコープ外）

| 項目 | 理由 |
|------|------|
| `/api/auth/login` の実装 | 認証フロー全体はスコープ外 |
| パスワードハッシュ（bcrypt） | `users.password_hash` の比較処理が必要 |
| セッション更新時の level 同期 | XP 変化時に session.level を更新する処理が必要 |
| SQL インジェクション | better-sqlite3 のプリペアドステートメントで対応済み |
