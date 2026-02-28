import { NextRequest, NextResponse } from "next/server";
import { getDb, query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";
import { calculateLevel, XP_REWARDS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user: authUser } = auth;

  const { activity, amount } = await req.json().catch(() => ({}));
  const xpGain = amount || XP_REWARDS[activity] || 0;
  if (xpGain === 0) return NextResponse.json({ xpGained: 0 });

  const db = getDb();
  try {
    await execute(db, `
      INSERT INTO story_variables (user_id, var_key, var_value) VALUES (?, 'total_xp', ?)
      ON CONFLICT (user_id, var_key) DO UPDATE SET var_value = var_value + ?
    `, [authUser.userId, xpGain, xpGain]);

    const xpRow = await query<{ xp: number }>(db,
      `SELECT var_value AS xp FROM story_variables WHERE user_id = ? AND var_key = 'total_xp'`,
      [authUser.userId]
    );
    const totalXP = parseInt(String(xpRow[0]?.xp || 0));
    const newLevel = calculateLevel(totalXP);

    await execute(db,
      `UPDATE users SET clearance_level = ? WHERE id = ? AND clearance_level < ?`,
      [newLevel, authUser.userId, newLevel]
    );

    const userRow = await query<{ clearance_level: number }>(db,
      `SELECT clearance_level FROM users WHERE id = ?`, [authUser.userId]
    );
    const leveledUp = (userRow[0]?.clearance_level ?? 0) > authUser.level;

    return NextResponse.json({
      xpGained: xpGain,
      totalXp: totalXP,
      newLevel,
      leveledUp,
    });
  } catch (err) {
    console.error("[users/me/xp]", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
