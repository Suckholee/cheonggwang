import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/domain/constants";

/**
 * Next.js 16: middleware → proxy (Node.js runtime, edge 미지원)
 * 세션 쿠키의 "존재"만 확인한다. 실제 유효성 검증은 layout에서 수행.
 * 이는 proxy에서 firebase-admin 초기화 비용(콜드 스타트)을 피하기 위함.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 모든 요청에 x-pathname 헤더 주입 — RootLayout이 admin 분기 시 사용 (모바일 480px wrap 우회).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/quote") ||
    pathname.startsWith("/provider") ||
    pathname.startsWith("/received") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/stories");

  if (!isProtected) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set(
    "next",
    pathname + (request.nextUrl.search ?? ""),
  );
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 자산 제외한 전체 path — x-pathname 헤더 주입 위해
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
