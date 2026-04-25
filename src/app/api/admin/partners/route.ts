import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { QUOTE_CATEGORIES, type QuoteCategory } from "@/domain/quote-category";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.8 admin-console · §4.4 — partner 발급.
 * H3 결의: id·issuedBy 명시, autoPublish 입력 X (R10에 의해 항상 DEFAULT 강제).
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
  console.error("[/api/admin/partners]", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

const issueSchema = z.object({
  uid: z.string().min(1),
  businessName: z.string().min(1).max(40),
  regionLabel: z.string().max(60).optional(),
  category: z
    .enum(QUOTE_CATEGORIES as readonly [string, ...string[]])
    .optional(),
  logoUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminApi();
    const body = await request.json().catch(() => ({}));
    const parsed = issueSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const data = parsed.data;
    const partnerId = nanoid(12);

    await partnerRepository.create({
      id: partnerId,
      ownerUid: data.uid,
      businessName: data.businessName,
      logoUrl: data.logoUrl ?? null,
      category: (data.category as QuoteCategory | undefined) ?? null,
      regionLabel: data.regionLabel ?? null,
      status: "active",
      issuedBy: "admin",
      notes: data.notes ?? null,
    });

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
