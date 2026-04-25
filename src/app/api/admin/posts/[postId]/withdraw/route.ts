import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { postRepository } from "@/lib/firebase/post-repository";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.8 admin-console · §4.7 — 운영자 강제 철회.
 *  - postRepository.setPublishStatus(id, 'withdrawn') 트랜잭션 CAS 그대로 사용 (R10).
 *  - partner-promo 글이면 partners/{id}/events에 publish-toggled by:'admin' 기록.
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
  console.error("[/api/admin/posts/[id]/withdraw]", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류" },
    { status: 500 },
  );
}

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  try {
    await requireAdminApi();
    const { postId } = await ctx.params;

    const post = await postRepository.get(postId);
    if (!post) throw new AppError("NOT_FOUND", "post를 찾을 수 없습니다");
    if (post.publishStatus !== "published") {
      throw new AppError(
        "STATUS_CONFLICT",
        `published 상태만 강제 철회 가능 (현재: ${post.publishStatus})`,
      );
    }

    await postRepository.setPublishStatus(postId, "withdrawn");

    // partner-promo면 events 감사 로그 추가 (M3 결의 — providerId가 'partner:'로 시작할 때만)
    if (
      post.postType === "partner-promo" &&
      post.providerId.startsWith("partner:")
    ) {
      const partnerId = post.providerId.slice("partner:".length);
      await partnerRepository.appendEvent(partnerId, {
        type: "publish-toggled",
        postId,
        from: "published",
        to: "withdrawn",
        decidedAt: new Date(),
      });
    }

    if (post.slug) revalidatePath(`/community/p/${post.slug}`);
    revalidatePath("/community/partners");
    revalidatePath("/community/providers");
    revalidatePath("/community/tips");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({ publishStatus: "withdrawn" });
  } catch (e) {
    return err(e);
  }
}
