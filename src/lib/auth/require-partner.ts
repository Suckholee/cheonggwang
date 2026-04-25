import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { AppError } from "@/lib/errors";
import type { Partner } from "@/types/partner";

/**
 * v1.7 partner-promo — 인증된 active 파트너 가드.
 *  - Page (Server Component / layout): `requirePartnerPage()` — 미충족 시 redirect
 *  - API Route Handler:                `requirePartnerApi()` — 미충족 시 AppError throw
 *
 * 두 헬퍼는 공통 `loadActivePartner(uid)`를 사용. uid 누락은 UNAUTHENTICATED, partner 미존재
 * 또는 status !== 'active'는 FORBIDDEN.
 */

async function readUid(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE_NAME)?.value;
  return tryVerifySessionCookie(cookie);
}

/** uid 검증 + active partner 조회. 실패 사유를 enum으로 반환. */
export async function loadActivePartner(): Promise<
  | { ok: true; uid: string; partner: Partner }
  | { ok: false; reason: "no-session" | "no-partner" | "not-active" }
> {
  const uid = await readUid();
  if (!uid) return { ok: false, reason: "no-session" };
  const partner = await partnerRepository.getByOwnerUid(uid);
  if (!partner) return { ok: false, reason: "no-partner" };
  if (partner.status !== "active")
    return { ok: false, reason: "not-active" };
  return { ok: true, uid, partner };
}

/**
 * Server Component / layout 전용. 미충족 시 redirect.
 *  - no-session  → /login?next=/partner
 *  - no-partner  → /
 *  - not-active  → / (suspended·invited 상태)
 */
export async function requirePartnerPage(
  nextPath = "/partner/posts",
): Promise<{ uid: string; partner: Partner }> {
  const r = await loadActivePartner();
  if (r.ok) return { uid: r.uid, partner: r.partner };
  if (r.reason === "no-session") {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  redirect("/");
}

/**
 * Route Handler 전용. 미충족 시 AppError throw.
 *  - no-session  → UNAUTHENTICATED 401
 *  - no-partner  → FORBIDDEN 403
 *  - not-active  → FORBIDDEN 403
 */
export async function requirePartnerApi(): Promise<{
  uid: string;
  partner: Partner;
}> {
  const r = await loadActivePartner();
  if (r.ok) return { uid: r.uid, partner: r.partner };
  if (r.reason === "no-session") {
    throw new AppError("UNAUTHENTICATED", "로그인이 필요합니다");
  }
  throw new AppError(
    "FORBIDDEN",
    r.reason === "no-partner"
      ? "인증된 파트너만 접근할 수 있습니다"
      : "파트너 상태가 active가 아닙니다",
  );
}
