import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

const TABLE = `CREATE TABLE IF NOT EXISTS skill_tree_tracks (
  id         TEXT PRIMARY KEY,
  active     INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json  TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const SEEDS = [{"id": "convergence", "label": "収束", "icon": "⚡", "color": "#ef4444", "skills": [{"id": "sk_c1", "icon": "🎯", "name": "基礎収束術", "level": 0, "req": [], "xp": 0, "desc": "海蝕現象への基本的な対処法を習得。", "effects": ["XP獲得量 +10%", "インシデント報告の閲覧解放"]}, {"id": "sk_c2", "icon": "🛡", "name": "防護フォーム", "level": 1, "req": ["sk_c1"], "xp": 50, "desc": "実体との接触時に自己防衛を行う姿勢と判断力。", "effects": ["チャットでの情報共有 XP +15", "収束作戦関連コンテンツの解放"]}, {"id": "sk_c3", "icon": "⚔", "name": "近接収束", "level": 2, "req": ["sk_c2"], "xp": 150, "desc": "モジュールを使った近距離での収束技術。", "effects": ["ミッション詳細 XP +20%", "限定ミッションへのアクセス"]}, {"id": "sk_c4", "icon": "💥", "name": "収束マスタリー", "level": 3, "req": ["sk_c3"], "xp": 350, "desc": "複数の実体を同時に収束させる高度な技術。", "effects": ["全ミッション XP +25%", "上級ミッションのアンロック"]}, {"id": "sk_c5", "icon": "🌀", "name": "次元固定", "level": 4, "req": ["sk_c4"], "xp": 700, "desc": "次元境界そのものを一時的に固定する最高技術。", "effects": ["M-019使用資格 AAA付与", "LEVEL5専用コンテンツ一部解放"]}]}, {"id": "analysis", "label": "解析", "icon": "🔬", "color": "#3b82f6", "skills": [{"id": "sk_a1", "icon": "📡", "name": "異常感知", "level": 0, "req": [], "xp": 0, "desc": "海蝕現象の初期兆候を感知する訓練。", "effects": ["マップ情報 詳細表示", "実体カタログ解放"]}, {"id": "sk_a2", "icon": "🧬", "name": "実体分類", "level": 1, "req": ["sk_a1"], "xp": 50, "desc": "実体の種類と危険度を正確に評価する能力。", "effects": ["実体詳細ページ XP +15", "分類フィルター機能解放"]}, {"id": "sk_a3", "icon": "📊", "name": "GSI測定", "level": 2, "req": ["sk_a2"], "xp": 150, "desc": "GSI値を現場で測定・解釈する技術。", "effects": ["統計ページ解放", "高精度インシデント報告が可能に"]}, {"id": "sk_a4", "icon": "🔭", "name": "次元観測", "level": 3, "req": ["sk_a3"], "xp": 350, "desc": "次元境界の薄化を事前に予測する高度な分析。", "effects": ["DEAN監視網アクセス", "予測警報の閲覧権限"]}, {"id": "sk_a5", "icon": "🌐", "name": "境界理論", "level": 4, "req": ["sk_a4"], "xp": 700, "desc": "次元間の境界理論を完全に理解した研究者レベル。", "effects": ["世界設定辞典 全エントリ解放", "研究ルート開放"]}]}, {"id": "intelligence", "label": "情報", "icon": "🕵", "color": "#8b5cf6", "skills": [{"id": "sk_i1", "icon": "👁", "name": "観察眼", "level": 0, "req": [], "xp": 0, "desc": "現場の状況を正確に観察・記録する基本能力。", "effects": ["閲覧履歴 詳細統計", "検索機能解放"]}, {"id": "sk_i2", "icon": "🗂", "name": "情報整理", "level": 1, "req": ["sk_i1"], "xp": 50, "desc": "収集した情報を体系的に整理・分析する。", "effects": ["コデックスへのアクセス", "ブックマーク機能強化"]}, {"id": "sk_i3", "icon": "🔐", "name": "機密取扱", "level": 2, "req": ["sk_i2"], "xp": 150, "desc": "機密情報を適切に取り扱う能力と資格。", "effects": ["機密開示申請が可能に", "一部CLASSIFIED情報にアクセス"]}, {"id": "sk_i4", "icon": "📜", "name": "歴史分析", "level": 3, "req": ["sk_i3"], "xp": 350, "desc": "機関の歴史的事案を深く理解し、パターンを読む。", "effects": ["機関史 機密エントリ解放", "過去事案との照合機能"]}, {"id": "sk_i5", "icon": "🔮", "name": "真実の目", "level": 4, "req": ["sk_i4"], "xp": 700, "desc": "全情報を統合し、隠された真実に迫る洞察力。", "effects": ["ARG真エンドルート解放", "全機密文書アクセス"]}]}, {"id": "field", "label": "現場", "icon": "🏃", "color": "#10b981", "skills": [{"id": "sk_f1", "icon": "🧭", "name": "現場判断", "level": 0, "req": [], "xp": 0, "desc": "予期しない状況での迅速な判断力を鍛える。", "effects": ["インシデントレポート解放", "現場報告 XP +10%"]}, {"id": "sk_f2", "icon": "🤝", "name": "連携作戦", "level": 1, "req": ["sk_f1"], "xp": 50, "desc": "他の機関員とチームで動く際の連携スキル。", "effects": ["チャット機能 XP +20%", "グループ作戦ログ閲覧"]}, {"id": "sk_f3", "icon": "🚁", "name": "緊急対応", "level": 2, "req": ["sk_f2"], "xp": 150, "desc": "緊急事態における迅速かつ適切な初動対応。", "effects": ["緊急通報システムアクセス", "緊急モジュール申請権限"]}, {"id": "sk_f4", "icon": "🗺", "name": "広域展開", "level": 3, "req": ["sk_f3"], "xp": 350, "desc": "広いエリアにわたる複数事案の同時対応能力。", "effects": ["全国マップ詳細アクセス", "複数インシデント管理"]}, {"id": "sk_f5", "icon": "🌟", "name": "伝説の機関員", "level": 4, "req": ["sk_f4"], "xp": 700, "desc": "あらゆる状況を乗り越えた、機関最高峰の現場力。", "effects": ["全部門ページへのアクセス", "機関員殿堂入り記録"]}]}];

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(db, TABLE);
}

async function seedIfEmpty(db: ReturnType<typeof getDb>) {
  const rows = await query<{ cnt: number }>(db, "SELECT COUNT(*) as cnt FROM skill_tree_tracks");
  if (Number(rows[0]?.cnt) > 0) return;
  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    await execute(db,
      `INSERT INTO skill_tree_tracks (id, active, sort_order, data_json) VALUES (?,1,?,?)`,
      [s.id, i, JSON.stringify(s)]
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  await ensureTable(db);
  await seedIfEmpty(db);
  const rows = await query<{ id:string; active:number; sort_order:number; data_json:string }>(db,
    "SELECT id, active, sort_order, data_json FROM skill_tree_tracks ORDER BY sort_order ASC"
  );
  return NextResponse.json(rows.map(r => ({ ...JSON.parse(r.data_json), id:r.id, active:r.active===1, sort_order:r.sort_order })));
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const db = getDb();
  await ensureTable(db);
  const { id, active, sort_order, ...rest } = body;
  await execute(db,
    `INSERT INTO skill_tree_tracks (id, active, sort_order, data_json, updated_at)
     VALUES (?,?,?,?,datetime('now'))
     ON CONFLICT(id) DO UPDATE SET active=excluded.active, sort_order=excluded.sort_order,
       data_json=excluded.data_json, updated_at=excluded.updated_at`,
    [id, active?1:0, sort_order||0, JSON.stringify({ id, active, sort_order, ...rest })]
  );
  return NextResponse.json({ ok:true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error:"id required" }, { status:400 });
  await execute(getDb(), "DELETE FROM skill_tree_tracks WHERE id=?", [id]);
  return NextResponse.json({ ok:true });
}
