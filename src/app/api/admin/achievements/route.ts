import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

const TABLE = `CREATE TABLE IF NOT EXISTS achievement_defs (
  id          TEXT PRIMARY KEY,
  active      INTEGER NOT NULL DEFAULT 1,
  secret      INTEGER NOT NULL DEFAULT 0,
  icon        TEXT NOT NULL DEFAULT '🏆',
  color       TEXT NOT NULL DEFAULT '#ffd740',
  name        TEXT NOT NULL DEFAULT '',
  desc        TEXT NOT NULL DEFAULT '',
  conditionType TEXT NOT NULL DEFAULT 'flag',
  conditionKey  TEXT NOT NULL DEFAULT '',
  conditionValue TEXT NOT NULL DEFAULT '',
  conditionMin  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const SEEDS = [
  { id:"first_step",   icon:"🚀",color:"#10b981",name:"初陣",          desc:"初めてログインした",              conditionType:"loginCount", conditionKey:"",             conditionValue:"", conditionMin:1,  secret:0 },
  { id:"week_streak",  icon:"🔥",color:"#f97316",name:"7日連続",        desc:"7日間連続でログインした",          conditionType:"streak",     conditionKey:"",             conditionValue:"", conditionMin:7,  secret:0 },
  { id:"veteran",      icon:"⭐",color:"#ffd740",name:"ベテラン機関員",  desc:"50回以上ログインした",            conditionType:"loginCount", conditionKey:"",             conditionValue:"", conditionMin:50, secret:0 },
  { id:"division_join",icon:"🏛",color:"#3b82f6",name:"配属完了",       desc:"部門に配属された",                conditionType:"flag",       conditionKey:"division_joined",conditionValue:"true",conditionMin:0,secret:0 },
  { id:"level2",       icon:"📈",color:"#a855f7",name:"正規要員",       desc:"LEVEL 2 に到達した",              conditionType:"level",      conditionKey:"",             conditionValue:"", conditionMin:2,  secret:0 },
  { id:"level3",       icon:"🌟",color:"#f59e0b",name:"上級要員",       desc:"LEVEL 3 に到達した",              conditionType:"level",      conditionKey:"",             conditionValue:"", conditionMin:3,  secret:0 },
  { id:"level4",       icon:"💎",color:"#06b6d4",name:"機密取扱者",     desc:"LEVEL 4 に到達した",              conditionType:"level",      conditionKey:"",             conditionValue:"", conditionMin:4,  secret:0 },
  { id:"level5",       icon:"👑",color:"#ef4444",name:"最高幹部",       desc:"LEVEL 5 に到達した",              conditionType:"level",      conditionKey:"",             conditionValue:"", conditionMin:5,  secret:0 },
  { id:"xp500",        icon:"⚡",color:"#10b981",name:"XP 500",        desc:"累計500 XPを獲得した",            conditionType:"xp",         conditionKey:"",             conditionValue:"", conditionMin:500,secret:0 },
  { id:"xp1000",       icon:"⚡",color:"#ffd740",name:"XP 1000",       desc:"累計1000 XPを獲得した",           conditionType:"xp",         conditionKey:"",             conditionValue:"", conditionMin:1000,secret:0 },
  { id:"tutorial",     icon:"📖",color:"#8b5cf6",name:"訓練修了",       desc:"チュートリアルを完了した",        conditionType:"flag",       conditionKey:"tutorial_complete",conditionValue:"true",conditionMin:0,secret:0 },
  { id:"phase1",       icon:"🔓",color:"#ef4444",name:"フェーズ1解放",  desc:"フェーズ1のコンテンツを解放した",conditionType:"flag",       conditionKey:"phase1_unlocked",conditionValue:"true",conditionMin:0,secret:1 },
  { id:"phase2",       icon:"🔴",color:"#dc2626",name:"フェーズ2解放",  desc:"フェーズ2のコンテンツを解放した",conditionType:"flag",       conditionKey:"phase2_unlocked",conditionValue:"true",conditionMin:0,secret:1 },
  { id:"anomaly_high", icon:"☢",color:"#ef4444",name:"異常体",         desc:"異常スコアが高い状態に達した",    conditionType:"flag",       conditionKey:"anomaly_detected",conditionValue:"true",conditionMin:0,secret:1 },
  { id:"observer",     icon:"👁",color:"#8b5cf6",name:"観測された者",   desc:"観測者に認識された",              conditionType:"flag",       conditionKey:"observer_warned",conditionValue:"true",conditionMin:0,secret:1 },
];

async function ensureTable(db: ReturnType<typeof getDb>) {
  await execute(db, TABLE);
}

async function seedIfEmpty(db: ReturnType<typeof getDb>) {
  const rows = await query<{ cnt: number }>(db, "SELECT COUNT(*) as cnt FROM achievement_defs");
  if (Number(rows[0]?.cnt) > 0) return;
  for (const s of SEEDS) {
    await execute(db,
      `INSERT INTO achievement_defs (id,active,secret,icon,color,name,desc,conditionType,conditionKey,conditionValue,conditionMin)
       VALUES (?,1,?,?,?,?,?,?,?,?,?)`,
      [s.id, s.secret, s.icon, s.color, s.name, s.desc, s.conditionType, s.conditionKey, s.conditionValue, s.conditionMin]
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  await ensureTable(db);
  await seedIfEmpty(db);
  const rows = await query<Record<string, unknown>>(db, "SELECT * FROM achievement_defs ORDER BY rowid ASC");
  return NextResponse.json(rows.map(r => ({ ...r, active: r.active === 1, secret: r.secret === 1 })));
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const db = getDb();
  await ensureTable(db);
  const { id, active, secret, icon, color, name, desc, conditionType, conditionKey, conditionValue, conditionMin } = body;
  await execute(db,
    `INSERT INTO achievement_defs (id,active,secret,icon,color,name,desc,conditionType,conditionKey,conditionValue,conditionMin)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET active=excluded.active, secret=excluded.secret,
       icon=excluded.icon, color=excluded.color, name=excluded.name, desc=excluded.desc,
       conditionType=excluded.conditionType, conditionKey=excluded.conditionKey,
       conditionValue=excluded.conditionValue, conditionMin=excluded.conditionMin`,
    [id, active?1:0, secret?1:0, icon||'🏆', color||'#ffd740', name||'', desc||'', conditionType||'flag', conditionKey||'', conditionValue||'', conditionMin||0]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await execute(db, "DELETE FROM achievement_defs WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
