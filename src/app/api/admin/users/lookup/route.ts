import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase/admin";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.8 admin-console · §4.3 — Firebase Auth email → uid 조회.
 *  - admin 전용
 *  - 이메일로 사용자 조회 후 발급 폼에 미리 채움용
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
  console.error("[/api/admin/users/lookup]", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

const querySchema = z.object({
  email: z.string().email(),
});

export async function GET(request: NextRequest) {
  try {
    await connection();
    await requireAdminApi();
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ email: url.searchParams.get("email") });
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "올바른 이메일을 입력하세요");
    }
    try {
      const u = await adminAuth.getUserByEmail(parsed.data.email);
      return NextResponse.json({
        uid: u.uid,
        displayName: u.displayName ?? "",
        email: u.email ?? "",
      });
    } catch {
      throw new AppError("NOT_FOUND", "Firebase Auth에 가입된 사용자가 아닙니다");
    }
  } catch (e) {
    return err(e);
  }
}
