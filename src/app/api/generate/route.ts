import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookie } from "@/lib/firebase/auth-admin";
import { SESSION_COOKIE_NAME } from "@/domain/constants";
import { adminAppCheck } from "@/lib/firebase/admin";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { generateService } from "@/services/generate-service";
import { generateRequestSchema } from "@/domain/schemas";
import { AppError, type AppErrorCode } from "@/lib/errors";

const APP_CHECK_ENFORCE = process.env.APP_CHECK_ENFORCE === "true";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId } = generateRequestSchema.parse(body);

    const jar = await cookies();
    const uid = await verifySessionCookie(
      jar.get(SESSION_COOKIE_NAME)?.value
    );

    // App Check (§7.2): 기본 permissive, APP_CHECK_ENFORCE=true 일 때만 강제
    if (APP_CHECK_ENFORCE) {
      const token = request.headers.get("x-firebase-appcheck");
      if (!token) return jsonError(503, "APP_CHECK_FAILED", "App Check 토큰 필요");
      try {
        await adminAppCheck.verifyToken(token);
      } catch {
        return jsonError(503, "APP_CHECK_FAILED", "App Check 검증 실패");
      }
    }

    await checkAndIncrement(uid);

    const { sections, tags, region } = await generateService.run(pageId, uid);
    return NextResponse.json({ sections, tags, region });
  } catch (e) {
    return handleError(e);
  }
}

function jsonError(status: number, code: AppErrorCode, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function handleError(e: unknown) {
  if (e instanceof AppError) {
    const status = mapStatus(e.code);
    return jsonError(status, e.code, e.message);
  }
  if (e instanceof Error && e.message === "UNAUTHORIZED") {
    return jsonError(401, "UNAUTHORIZED", "로그인이 필요합니다");
  }
  if (e instanceof SyntaxError) {
    return jsonError(400, "INVALID_INPUT", "요청 본문이 JSON이 아닙니다");
  }
  // zod
  if (typeof e === "object" && e !== null && "issues" in e) {
    return jsonError(400, "INVALID_INPUT", "요청 파라미터가 올바르지 않습니다");
  }
  const message = e instanceof Error ? e.message : "일시적 오류가 발생했습니다";
  return jsonError(500, "INTERNAL_ERROR", message);
}

function mapStatus(code: AppErrorCode): number {
  switch (code) {
    case "INVALID_INPUT":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "PAGE_NOT_FOUND":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "APP_CHECK_FAILED":
      return 503;
    default:
      return 500;
  }
}
