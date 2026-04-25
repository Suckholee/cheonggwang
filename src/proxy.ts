import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/domain/constants";

/**
 * Next.js 16: middleware → proxy (Node.js runtime, edge 미지원)
 * 세션 쿠키의 "존재"만 확인한다. 실제 유효성 검증은 layout에서 수행.
 * 이는 proxy에서 firebase-admin 초기화 비용(콜드 스타트)을 피하기 위함.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/quote") ||
    pathname.startsWith("/provider") ||
    pathname.startsWith("/received") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/stories");

  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set(
    "next",
    pathname + (request.nextUrl.search ?? ""),
  );
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/quote/:path*",
    "/provider/:path*",
    "/received/:path*",
    "/chat/:path*",
    "/stories/:path*",
  ],
};
