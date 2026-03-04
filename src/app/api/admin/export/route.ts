import { NextRequest, NextResponse } from "next/server";
import { getDb, query } from "@/lib/db";
import { requireAdmin } from "@/lib/server-auth";

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => {
      const v = row[h];
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
  ];
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const type = new URL(req.url).searchParams.get("type");
  const db = getDb();

  try {
    let rows: Record<string, unknown>[] = [];
    let filename = "export.csv";

    switch (type) {
      case "users":
        rows = await query<Record<string, unknown>>(db,
          `SELECT id, username, display_name, role, status, clearance_level, anomaly_score,
                  observer_load, login_count, consecutive_login_days, created_at, last_login_at
           FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC`
        );
        filename = "users.csv";
        break;

      case "xp_logs":
        rows = await query<Record<string, unknown>>(db,
          `SELECT xl.user_id, u.username, xl.activity, xl.xp_gained, xl.created_at
           FROM xp_logs xl JOIN users u ON u.id = xl.user_id
           ORDER BY xl.created_at DESC LIMIT 10000`
        );
        filename = "xp_logs.csv";
        break;

      case "flags":
        rows = await query<Record<string, unknown>>(db,
          `SELECT pf.user_id, u.username, pf.flag_key, pf.flag_value, pf.set_at
           FROM progress_flags pf JOIN users u ON u.id = pf.user_id
           ORDER BY pf.set_at DESC LIMIT 10000`
        );
        filename = "flags.csv";
        break;

      case "anomaly":
        rows = await query<Record<string, unknown>>(db,
          `SELECT u.id, u.username, u.anomaly_score, u.status,
                  COUNT(al.id) as trigger_count
           FROM users u
           LEFT JOIN anomaly_logs al ON al.user_id = u.id
           WHERE u.deleted_at IS NULL
           GROUP BY u.id ORDER BY u.anomaly_score DESC`
        ).catch(async () =>
          // anomaly_logs が未作成の場合のフォールバック
          query<Record<string, unknown>>(db,
            `SELECT id, username, anomaly_score, status FROM users
             WHERE deleted_at IS NULL ORDER BY anomaly_score DESC`
          )
        );
        filename = "anomaly_scores.csv";
        break;

      default:
        return NextResponse.json({ error: "type が不正" }, { status: 400 });
    }

    const csv = toCSV(rows as Record<string, unknown>[]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[admin/export]", err);
    return NextResponse.json({ error: "エクスポート失敗" }, { status: 500 });
  }
}
