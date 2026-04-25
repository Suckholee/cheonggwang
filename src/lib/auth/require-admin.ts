import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminToken,
} from "./admin-session";

/**
 * v1.8 admin-console — admin 가드.
 *
 *  - requireAdminPage(nextPath?) : Server Component / layout 전용. 미충족 시 redirect.
 *  - requireAdminApi()           : Route Handler 전용. 미충족 시 throw AppError.
 *
 *  layout 단에서 차단 책임 (deep-link 보존은 v2 trade-off). H2 결의.
 */

async function readToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value;
}

export async function requireAdminApi(): Promise<void> {
  const ok = await verifyAdminToken(await readToken());
  if (!ok) {
    throw new AppError("UNAUTHENTICATED", "admin 로그인이 필요합니다");
  }
}

export async function requireAdminPage(
  nextPath = "/admin",
): Promise<void> {
  const ok = await verifyAdminToken(await readToken());
  if (!ok) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}

/** API/Page 외 컴포넌트에서 인증 여부만 확인하고 싶을 때. */
export async function isAdminAuthenticated(): Promise<boolean> {
  return verifyAdminToken(await readToken());
}
