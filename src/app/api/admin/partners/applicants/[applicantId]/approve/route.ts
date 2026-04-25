import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { nanoid } from "nanoid";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { DEFAULT_AUTO_PUBLISH } from "@/types/partner";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.9 partner-application · §5.2 — admin 승인 (R11 트랜잭션 wrap).
 *  - applicants 단일 TX로 partners 생성 + applicants.status='approved'
 *  - events 기록은 TX 외부 best-effort (M4)
 */

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401, UNAUTHORIZED: 401, FORBIDDEN: 403,
  VALIDATION_ERROR: 400, INVALID_INPUT: 400, RATE_LIMITED: 429,
  STATUS_CONFLICT: 409, HYGIENE_FAIL: 422, STORAGE_FAIL: 502,
  VISION_FETCH: 502, LLM_FAILURE: 502, TIMEOUT: 504,
  SLUG_CONFLICT: 500, NOT_FOUND: 404, PAGE_NOT_FOUND: 404,
  ALREADY_REGISTERED: 409, ALREADY_QUOTED: 409, ALREADY_ACCEPTED: 409,
  INVALID_STATE: 409, APP_CHECK_FAILED: 403, STORAGE_ERROR: 502,
  INTERNAL_ERROR: 500,
};

function err(e: unknown): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json(
      { code: e.code, message: e.message },
      { status: STATUS_BY_CODE[e.code] ?? 500 },
    );
  }
  console.error("[approve applicant] unexpected", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ applicantId: string }> },
) {
  try {
    await requireAdminApi();
    const { applicantId } = await ctx.params;

    let partnerId = "";

    await adminDb.runTransaction(async (tx) => {
      const applicantRef = adminDb
        .collection("partnerApplicants")
        .doc(applicantId);
      const snap = await tx.get(applicantRef);
      if (!snap.exists) {
        throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다");
      }
      const data = snap.data()!;
      if (data.status !== "pending") {
        throw new AppError(
          "STATUS_CONFLICT",
          `신청 상태가 ${data.status}이므로 승인할 수 없습니다`,
        );
      }

      partnerId = nanoid(12);
      const partnerRef = adminDb.collection("partners").doc(partnerId);
      tx.create(partnerRef, {
        ownerUid: data.ownerUid,
        businessName: data.businessName,
        logoUrl: null,
        category: data.category ?? null,
        regionLabel: data.regionLabel ?? null,
        status: "active",
        autoPublish: { ...DEFAULT_AUTO_PUBLISH },
        issuedAt: FieldValue.serverTimestamp(),
        issuedBy: "admin",
        notes: data.intro ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(applicantRef, {
        status: "approved",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: "admin",
        partnerId,
      });
    });

    // 트랜잭션 외부 best-effort 감사 로그 (M4)
    await partnerRepository.appendEvent(partnerId, {
      type: "status-changed",
      from: "invited",
      to: "active",
      by: "admin",
      decidedAt: new Date(),
    });

    return NextResponse.json(
      {
        partnerId,
        redirectTo: `/admin/partners/${partnerId}`,
      },
      { status: 201 },
    );
  } catch (e) {
    return err(e);
  }
}
