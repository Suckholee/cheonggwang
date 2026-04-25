import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/admin-session";

/**
 * v1.8 admin-console · §3.x H7 — admin 로그아웃.
 *
 * 비인증자도 호출 가능 (멱등). cookie를 maxAge=0으로 명시 set.
 * `cookies().delete()` 대신 `set('', {maxAge:0})` 사용 — 모든 브라우저에서 일관 (H7 결의).
 */
export async function POST() {
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return new NextResponse(null, { status: 204 });
}
