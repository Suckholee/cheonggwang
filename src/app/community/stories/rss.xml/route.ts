import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/seo/base-url";

/**
 * v1.7 P8 — `/community/stories/rss.xml` 구독자 호환을 위한 308 redirect.
 * 신규 RSS 엔드포인트: `/community/partners/rss.xml`
 */
export async function GET(): Promise<Response> {
  const base = await getBaseUrl();
  return NextResponse.redirect(
    new URL("/community/partners/rss.xml", base),
    308,
  );
}
