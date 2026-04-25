import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { autoPublishConfigSchema } from "@/lib/partner/auto-publish-window";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.8 admin-console · §4.5 — partner status·autoPublish 운영자 편집.
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
  console.error("[/api/admin/partners/[id]]", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

const patchSchema = z
  .object({
    status: z.enum(["active", "suspended"]).optional(),
    autoPublish: autoPublishConfigSchema.optional(),
  })
  .refine((d) => d.status !== undefined || d.autoPublish !== undefined, {
    message: "변경할 필드 1개 이상 (status 또는 autoPublish)",
  });

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ partnerId: string }> },
) {
  try {
    await requireAdminApi();
    const { partnerId } = await ctx.params;

    const cur = await partnerRepository.getById(partnerId);
    if (!cur) throw new AppError("NOT_FOUND", "partner를 찾을 수 없습니다");

    const json = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const { status, autoPublish } = parsed.data;

    if (status !== undefined && status !== cur.status) {
      await partnerRepository.setStatus(partnerId, status);
      await partnerRepository.appendEvent(partnerId, {
        type: "status-changed",
        from: cur.status,
        to: status,
        by: "admin",
        decidedAt: new Date(),
      });
    }

    if (autoPublish !== undefined) {
      await partnerRepository.updateAutoPublish(partnerId, autoPublish);
      // autoPublish 변경은 빈번 이벤트라 events 미기록 (Design R9)
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
