import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { partnerApplicantRepository } from "@/lib/firebase/partner-applicant-repository";
import { AppError } from "@/lib/errors";
import type { Partner } from "@/types/partner";

/**
 * v1.7 partner-promo — 인증된 active 파트너 가드.
 * v1.9 partner-application — A4·R3: applicant 상태 분기 추가.
 *
 *  - Page (Server Component / layout): `requirePartnerPage()` — 미충족 시 redirect
 *  - API Route Handler:                `requirePartnerApi()` — 미충족 시 AppError throw
 */

async function readUid(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE_NAME)?.value;
  return tryVerifySessionCookie(cookie);
}

/** uid 검증 + active partner 조회 + applicant 분기 (R3). */
export async function loadActivePartner(): Promise<
  | { ok: true; uid: string; partner: Partner }
  | {
      ok: false;
      reason:
        | "no-session"
        | "no-partner"
        | "not-active"
        | "applicant-pending"
        | "applicant-rejected";
    }
> {
  const uid = await readUid();
  if (!uid) return { ok: false, reason: "no-session" };
  const partner = await partnerRepository.getByOwnerUid(uid);
  if (partner) {
    if (partner.status !== "active") return { ok: false, reason: "not-active" };
    return { ok: true, uid, partner };
  }
  // partner 없음 → applicant 분기 (v1.9)
  const applicant = await partnerApplicantRepository.getByOwnerUid(uid);
  if (applicant?.status === "pending") {
    return { ok: false, reason: "applicant-pending" };
  }
  if (applicant?.status === "rejected") {
    return { ok: false, reason: "applicant-rejected" };
  }
  return { ok: false, reason: "no-partner" };
}

/**
 * Server Component / layout 전용. 미충족 시 redirect.
 *  - no-session            → /login?next=
 *  - applicant-pending     → /signup-partner/submitted
 *  - applicant-rejected    → /signup-partner/submitted
 *  - no-partner / not-active → /
 */
export async function requirePartnerPage(
  nextPath = "/partner/posts",
): Promise<{ uid: string; partner: Partner }> {
  const r = await loadActivePartner();
  if (r.ok) return { uid: r.uid, partner: r.partner };
  switch (r.reason) {
    case "no-session":
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    case "applicant-pending":
    case "applicant-rejected":
      redirect("/signup-partner/submitted");
    case "no-partner":
    case "not-active":
    default:
      redirect("/");
  }
}

/**
 * Route Handler 전용. 미충족 시 AppError throw.
 *  - no-session → UNAUTHENTICATED 401
 *  - 그 외      → FORBIDDEN 403
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
    r.reason === "applicant-pending"
      ? "신청 검토 중입니다"
      : r.reason === "applicant-rejected"
        ? "신청이 거절되었습니다"
        : r.reason === "not-active"
          ? "파트너 상태가 active가 아닙니다"
          : "인증된 파트너만 접근할 수 있습니다",
  );
}
