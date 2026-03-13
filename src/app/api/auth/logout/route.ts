import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  // [FIX #2] cookie削除時は設定時と同じ path/secure/sameSite を指定しないと削除されないブラウザがある
  res.cookies.set("kai_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
