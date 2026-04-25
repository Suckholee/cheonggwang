import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/auth-admin";

/**
 * GET /logout → session cookie 삭제 + 홈 `/` 리다이렉트.
 * URL 직접 입력하거나 <a href="/logout"> 로 사용.
 * (이전: /login · 비로그인 홈이 탐색 가능한 마켓플레이스로 진화 후 홈으로 변경)
 */
export async function GET(request: Request) {
  const url = new URL("/", request.url);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
