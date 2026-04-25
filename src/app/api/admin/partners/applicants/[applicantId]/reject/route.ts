import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.9 partner-application · §5.3 — admin 거절 (C3 트랜잭션 wrap).
 *  - 두 admin 동시 액션 race-safe (status==='pending' 검증 + 즉시 update 동일 TX)
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
  console.error("[reject applicant] unexpected", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

const rejectSchema = z.object({
  reason: z.string().trim().min(1, "사유를 입력해 주세요").max(200),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ applicantId: string }> },
) {
  try {
    await requireAdminApi();
    const { applicantId } = await ctx.params;

    const body = await request.json().catch(() => ({}));
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const { reason } = parsed.data;

    await adminDb.runTransaction(async (tx) => {
      const ref = adminDb.collection("partnerApplicants").doc(applicantId);
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new AppError("NOT_FOUND", "신청을 찾을 수 없습니다");
      }
      const data = snap.data()!;
      if (data.status !== "pending") {
        throw new AppError(
          "STATUS_CONFLICT",
          `신청 상태가 ${data.status}이므로 거절할 수 없습니다`,
        );
      }
      tx.update(ref, {
        status: "rejected",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: "admin",
        rejectReason: reason,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
