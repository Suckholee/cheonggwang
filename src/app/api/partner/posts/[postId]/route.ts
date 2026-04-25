import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { postRepository } from "@/lib/firebase/post-repository";
import { cleanupPartnerPostPhotos } from "@/lib/llm/partner-promo-generator";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.7 partner-promo · §6.2/§6.3
 *  - PATCH: draft/published 본문 수정 (본인만)
 *  - DELETE: draft 삭제 (본인만, Firestore 우선 → Storage best-effort, H6)
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
  console.error("[/api/partner/posts/[postId]] unexpected", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류가 발생했습니다" },
    { status: 500 },
  );
}

const patchSchema = z
  .object({
    title: z.string().min(1).max(80).optional(),
    summary80: z.string().min(10).max(120).optional(),
    bodyMarkdown: z.string().min(100).max(6000).optional(),
    coverImageUrl: z.string().url().optional(),
    coverImageAlt: z.string().max(80).optional(),
    brandTone: z
      .enum(["friendly", "professional", "playful"])
      .optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "변경할 필드를 1개 이상 보내야 합니다",
  });

/**
 * coverImageUrl은 본인이 업로드한 partners/{uid}/{postId}/ 경로의 signed URL만 허용 (L4).
 * 외부 URL 거부.
 */
function assertOwnCoverImage(
  url: string,
  uid: string,
  postId: string,
): void {
  // signed URL이라 host는 storage.googleapis.com 또는 firebasestorage 등 다양.
  // 핵심은 path에 partners/{uid}/{postId}/ prefix 포함 여부.
  if (!url.includes(`partners/${uid}/${postId}/`)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "본인이 업로드한 사진만 커버로 지정할 수 있습니다",
    );
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  try {
    const { uid } = await requirePartnerApi();
    const { postId } = await ctx.params;

    const post = await postRepository.get(postId);
    if (!post) throw new AppError("NOT_FOUND", "포스트를 찾을 수 없습니다");
    if (post.providerOwnerUid !== uid) {
      throw new AppError("FORBIDDEN", "본인 글만 수정할 수 있습니다");
    }
    if (post.postType !== "partner-promo") {
      throw new AppError(
        "VALIDATION_ERROR",
        "partner-promo 타입만 이 엔드포인트로 수정 가능합니다",
      );
    }

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const patch = parsed.data;

    if (patch.coverImageUrl !== undefined) {
      assertOwnCoverImage(patch.coverImageUrl, uid, postId);
    }

    await postRepository.updateDraft(postId, patch);

    if (post.publishStatus === "published") {
      revalidatePath(`/community/p/${post.slug}`);
      revalidatePath("/community/partners");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  try {
    const { uid } = await requirePartnerApi();
    const { postId } = await ctx.params;

    const post = await postRepository.get(postId);
    if (!post) {
      // 멱등 — 이미 없으면 204
      return new NextResponse(null, { status: 204 });
    }
    if (post.providerOwnerUid !== uid) {
      throw new AppError("FORBIDDEN", "본인 글만 삭제할 수 있습니다");
    }
    if (post.publishStatus !== "draft") {
      throw new AppError("STATUS_CONFLICT", "초고만 삭제할 수 있습니다");
    }

    // H6: Firestore 먼저 → Storage best-effort
    await postRepository.deleteDraft(postId);
    await cleanupPartnerPostPhotos(uid, postId);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
