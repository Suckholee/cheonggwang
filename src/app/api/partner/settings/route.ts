import { NextResponse, type NextRequest } from "next/server";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { validateAutoPublishConfig } from "@/lib/partner/auto-publish-window";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.7 partner-promo · §6.5 — autoPublish 설정 갱신.
 */

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  INVALID_INPUT: 400,
  RATE_LIMITED: 429,
  STATUS_CONFLICT: 409,
  HYGIENE_FAIL: 422,
  STORAGE_FAIL: 502,
  VISION_FETCH: 502,
  LLM_FAILURE: 502,
  TIMEOUT: 504,
  SLUG_CONFLICT: 500,
  NOT_FOUND: 404,
  PAGE_NOT_FOUND: 404,
  ALREADY_REGISTERED: 409,
  ALREADY_QUOTED: 409,
  ALREADY_ACCEPTED: 409,
  INVALID_STATE: 409,
  APP_CHECK_FAILED: 403,
  STORAGE_ERROR: 502,
  INTERNAL_ERROR: 500,
};

function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json(
      { code: e.code, message: e.message, details: e.details },
      { status: STATUS_BY_CODE[e.code] ?? 500 },
    );
  }
  console.error("[/api/partner/settings] unexpected", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류가 발생했습니다" },
    { status: 500 },
  );
}

export async function PATCH(request: NextRequest) {
  try {
    const { partner } = await requirePartnerApi();

    const json = await request.json();
    const v = validateAutoPublishConfig(json);
    if (!v.ok) {
      throw new AppError("VALIDATION_ERROR", v.message);
    }

    await partnerRepository.updateAutoPublish(partner.id, v.data);

    return NextResponse.json({
      ok: true,
      autoPublish: v.data,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
