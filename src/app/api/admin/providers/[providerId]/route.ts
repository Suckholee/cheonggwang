import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.8 admin-console · §4.6 — provider verified·insured 운영자 토글.
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
  console.error("[/api/admin/providers/[id]]", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

const patchSchema = z
  .object({
    verified: z.boolean().optional(),
    insured: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "변경할 필드 1개 이상",
  });

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ providerId: string }> },
) {
  try {
    await requireAdminApi();
    const { providerId } = await ctx.params;

    const cur = await providerRepository.get(providerId);
    if (!cur) throw new AppError("NOT_FOUND", "provider를 찾을 수 없습니다");

    const json = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const { verified, insured } = parsed.data;

    if (verified !== undefined) {
      await providerRepository.setVerified(providerId, verified);
    }
    if (insured !== undefined) {
      await providerRepository.setInsured(providerId, insured);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
