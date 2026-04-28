import "server-only";
import { headers } from "next/headers";

/**
 * v1.6 Phase 5 · H5 — base URL 헬퍼.
 *
 * 우선순위:
 *   1. `NEXT_PUBLIC_BASE_URL` (프로덕션 권장, 예: https://www.cheonggwang.kr)
 *   2. `VERCEL_URL` (Vercel 자동 · 프리뷰 배포 포함)
 *   3. 요청 헤더 (`x-forwarded-proto` + `x-forwarded-host` 또는 `host`)
 *   4. localhost fallback
 *
 * 트레일링 슬래시 제거.
 */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    /* headers() can throw outside request scope */
  }
  return "http://localhost:3000";
}
