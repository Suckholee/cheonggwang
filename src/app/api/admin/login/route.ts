import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import {
  signAdminToken,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SEC,
} from "@/lib/auth/admin-session";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.8 admin-console · §3.1 — admin 로그인.
 *
 * Flow:
 *   1. rate-limit by ip (5/15min)
 *   2. zod validate
 *   3. timing-safe username compare (R5)
 *   4. bcrypt password compare
 *   5. JWT sign (jose) + httpOnly·secure·sameSite=strict cookie set
 *   6. next 검증 (H1: isSafeNext)
 */

const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  next: z.string().max(200).optional(),
});

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
      { code: e.code, message: e.message },
      { status: STATUS_BY_CODE[e.code] ?? 500 },
    );
  }
  console.error("[/api/admin/login] unexpected", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류가 발생했습니다" },
    { status: 500 },
  );
}

/**
 * H1 결의 — open-redirect 방어.
 * `next === '/admin' || next.startsWith('/admin/')` + `//`·`\\` 차단 + login 회귀 차단.
 */
function isSafeNext(s: string | undefined): s is string {
  if (!s) return false;
  if (s !== "/admin" && !s.startsWith("/admin/")) return false;
  if (s.includes("//") || s.includes("\\")) return false;
  if (s.startsWith("/admin/login")) return false;
  return true;
}

/**
 * Timing-safe username 비교. (R5)
 * 동일 길이 buffer 요구 — 충분히 큰 padding (64 bytes).
 */
function timingSafeUsernameEqual(a: string, b: string): boolean {
  const PAD = 64;
  if (a.length > PAD || b.length > PAD) return false;
  const bufA = Buffer.alloc(PAD, 0);
  const bufB = Buffer.alloc(PAD, 0);
  bufA.write(a, 0, PAD, "utf8");
  bufB.write(b, 0, PAD, "utf8");
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    await checkAndIncrement(`admin-login:${ip}`, 5, 15 * 60 * 1000);

    const json = await request.json().catch(() => ({}));
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const { username, password, next } = parsed.data;

    const expectedUsername = process.env.ADMIN_USERNAME;
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!expectedUsername || !passwordHash) {
      console.error(
        "[/api/admin/login] ADMIN_USERNAME 또는 ADMIN_PASSWORD_HASH 미설정",
      );
      throw new AppError(
        "INTERNAL_ERROR",
        "운영자 계정 설정이 누락되었습니다",
      );
    }

    // bcrypt를 username 결과와 무관하게 항상 실행 (timing 정보 누출 방지)
    const usernameOk = timingSafeUsernameEqual(username, expectedUsername);
    const passwordOk = await bcrypt.compare(password, passwordHash);

    if (!usernameOk || !passwordOk) {
      throw new AppError(
        "UNAUTHENTICATED",
        "아이디 또는 비밀번호가 올바르지 않습니다",
      );
    }

    const token = await signAdminToken();
    const jar = await cookies();
    jar.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ADMIN_SESSION_MAX_AGE_SEC,
      path: "/",
    });

    const redirectTo = isSafeNext(next) ? next : "/admin";

    return NextResponse.json({ ok: true, redirectTo });
  } catch (e) {
    return errorResponse(e);
  }
}
