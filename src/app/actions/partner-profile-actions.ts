"use server";

import { cookies } from "next/headers";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  SESSION_COOKIE_NAME,
  tryVerifySessionCookie,
} from "@/lib/firebase/auth-admin";
import {
  partnerProfileFormSchema,
  adminEditPartnerProfileSchema,
  reviewPartnerRagSchema,
  reportPartnerRagSchema,
  type PartnerProfileFormInput,
  type AdminEditPartnerProfileInput,
  type ReviewPartnerRagInput,
  type ReportPartnerRagInput,
} from "@/domain/partner-profile-schema";
import {
  partnerProfileRepository,
  reportsRepository,
} from "@/lib/firebase/partner-profile-repository";
import {
  analyzePartnerProfilePhotos,
} from "@/lib/llm/partner-rag-context";
import { checkMarkdownHygiene } from "@/lib/llm/hygiene-guard";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { hashUid } from "@/lib/auth/hash";
import { AppError } from "@/lib/errors";
import type { ProfileStatus } from "@/types/partner-profile";

/**
 * v1.11 partner-rag-system · §5 — 사장님·admin server actions.
 *
 * 5종 actions:
 *   - savePartnerProfile (사장님)
 *   - reviewPartnerRag (admin)
 *   - togglePartnerRagSuspended (admin)
 *   - adminEditPartnerProfile (admin 강제 편집, H7)
 *   - reportPartnerRag (사후 신고, H8·M4)
 */

interface ActionResult<T = void> {
  ok: boolean;
  message?: string;
  data?: T;
}

/**
 * 자동 hygiene-guard 1차 — score 산출 (cycle #19 checkMarkdownHygiene 재사용).
 * 텍스트 통합 후 markdown으로 위장 처리해 동일 helper 사용.
 */
function autoHygieneCheck(text: string): { score: number; passed: boolean } {
  const result = checkMarkdownHygiene(text, "프로필", text.slice(0, 80), {
    postType: "partner-promo",
  });
  return { score: result.score, passed: result.passed };
}

/** 사장님: 매장 RAG 자료 저장. */
export async function savePartnerProfile(
  input: PartnerProfileFormInput,
): Promise<ActionResult<{ status: ProfileStatus; hygieneScore: number }>> {
  try {
    const { uid, partner } = await requirePartnerApi();
    const parsed = partnerProfileFormSchema.parse(input);

    // 자동 hygiene-guard 1차
    const text = [
      parsed.description,
      ...parsed.usps,
      ...parsed.priceItems.map((p) => `${p.name} ${p.price}원`),
    ].join("\n");
    const { score } = autoHygieneCheck(text);

    const status: ProfileStatus =
      score >= 0.7 ? "auto-approved" : "pending-review";

    // H2·H3: photoUrls 변경 detect 시만 Vision 분석 (캐시)
    const oldPhotos = JSON.stringify(partner.profile?.photoUrls ?? []);
    const newPhotos = JSON.stringify(parsed.photoUrls);
    const photoAnalysisSummary =
      oldPhotos !== newPhotos
        ? await analyzePartnerProfilePhotos(parsed.photoUrls)
        : (partner.profile?.photoAnalysisSummary ?? "");

    // C4: version increment
    const nextVersion = (partner.profile?.version ?? 0) + 1;

    await partnerProfileRepository.savePartnerProfile(partner.id, {
      ...parsed,
      photoAnalysisSummary,
      status,
      hygieneScore: score,
      suspended: partner.profile?.suspended ?? false,
      version: nextVersion,
      updatedAt: new Date(),
    });

    await partnerProfileRepository.appendRagHistory(partner.id, {
      type: "profile-updated",
      actor: "partner",
      actorUid: uid,
      payload: { status, hygieneScore: score, version: nextVersion },
    });

    return { ok: true, data: { status, hygieneScore: score } };
  } catch (e) {
    return toActionError(e);
  }
}

/** admin: 검토 결과 반영. */
export async function reviewPartnerRag(
  input: ReviewPartnerRagInput,
): Promise<ActionResult> {
  try {
    await requireAdminApi();
    const parsed = reviewPartnerRagSchema.parse(input);
    await partnerProfileRepository.reviewProfile(parsed.partnerId, {
      status: parsed.decision,
      reason: parsed.reason ?? null,
      reviewedBy: "admin",
      reviewedAt: new Date(),
    });
    await partnerProfileRepository.appendRagHistory(parsed.partnerId, {
      type: "reviewed",
      actor: "admin",
      actorUid: "admin",
      payload: { decision: parsed.decision, reason: parsed.reason ?? null },
    });
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

/** admin: 매장 단위 RAG 정지 토글. */
export async function togglePartnerRagSuspended(input: {
  partnerId: string;
  suspended: boolean;
}): Promise<ActionResult> {
  try {
    await requireAdminApi();
    if (!input.partnerId) throw new AppError("INVALID_INPUT", "partnerId 필요");
    await partnerProfileRepository.setSuspended(
      input.partnerId,
      input.suspended,
    );
    await partnerProfileRepository.appendRagHistory(input.partnerId, {
      type: "suspended",
      actor: "admin",
      actorUid: "admin",
      payload: { suspended: input.suspended },
    });
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

/** admin: 강제 편집 (H7). */
export async function adminEditPartnerProfile(
  input: AdminEditPartnerProfileInput,
): Promise<ActionResult> {
  try {
    await requireAdminApi();
    const parsed = adminEditPartnerProfileSchema.parse(input);
    const { partnerId, ...patch } = parsed;
    await partnerProfileRepository.adminUpdateProfile(partnerId, patch);
    await partnerProfileRepository.appendRagHistory(partnerId, {
      type: "profile-updated",
      actor: "admin",
      actorUid: "admin",
      payload: { adminEdit: true, fieldsChanged: Object.keys(patch) },
    });
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

/** admin: profile 강제 삭제 (H7). */
export async function adminDeletePartnerProfile(
  partnerId: string,
): Promise<ActionResult> {
  try {
    await requireAdminApi();
    await partnerProfileRepository.deleteProfile(partnerId);
    await partnerProfileRepository.appendRagHistory(partnerId, {
      type: "profile-updated",
      actor: "admin",
      actorUid: "admin",
      payload: { deleted: true },
    });
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

/** 사후 신고 (H8·M4). */
export async function reportPartnerRag(
  input: ReportPartnerRagInput,
): Promise<ActionResult> {
  try {
    // 인증된 사용자 (cycle #18 client session)
    const reporterUid = await readSessionUid();
    if (!reporterUid)
      throw new AppError("UNAUTHENTICATED", "로그인이 필요합니다");

    // H8: 동일 reporter가 동일 partner에 대해 24h 1회 cap
    await checkAndIncrement(
      `report-rag:${reporterUid}:${input.partnerId}`,
      1,
      86400 * 1000,
    );

    const parsed = reportPartnerRagSchema.parse(input);

    // M4: reporter 신원 anonymize
    await partnerProfileRepository.appendRagHistory(parsed.partnerId, {
      type: "reported",
      actor: "reporter",
      actorUid: hashUid(reporterUid),
      payload: { reason: parsed.reason, link: parsed.link ?? null },
    });
    await reportsRepository.create({
      reporterUid, // admin only collection
      partnerId: parsed.partnerId,
      reason: parsed.reason,
      link: parsed.link,
      at: new Date(),
    });
    return { ok: true };
  } catch (e) {
    return toActionError(e);
  }
}

/** admin: pending-review 목록 (RagReviewList용). */
export async function listPendingRagReviews() {
  await requireAdminApi();
  return partnerProfileRepository.listPendingReviews(100);
}

// ─── helpers ─────────────────────────────────────────────

async function readSessionUid(): Promise<string | null> {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE_NAME)?.value;
  return tryVerifySessionCookie(cookie);
}

function toActionError<T = void>(e: unknown): ActionResult<T> {
  if (e instanceof AppError) {
    return { ok: false, message: e.message };
  }
  console.error("[partner-profile-actions]", e);
  return { ok: false, message: "일시적 오류" };
}
