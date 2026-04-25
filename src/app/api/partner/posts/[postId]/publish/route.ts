import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { postRepository } from "@/lib/firebase/post-repository";
import { AppError, type AppErrorCode } from "@/lib/errors";

/**
 * v1.7 partner-promo · §6.4 — publishStatus 전이 (publish/withdraw).
 * 트랜잭션 read-then-CAS는 postRepository.setPublishStatus 안에서 수행.
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
  console.error(
    "[/api/partner/posts/[postId]/publish] unexpected",
    e,
  );
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류가 발생했습니다" },
    { status: 500 },
  );
}

const publishSchema = z.object({
  action: z.enum(["publish", "withdraw"]),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  try {
    const { uid, partner } = await requirePartnerApi();
    const { postId } = await ctx.params;

    const json = await request.json();
    const parsed = publishSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        parsed.error.issues.map((i) => i.message).join(", "),
      );
    }
    const { action } = parsed.data;

    const post = await postRepository.get(postId);
    if (!post) throw new AppError("NOT_FOUND", "포스트를 찾을 수 없습니다");
    if (post.providerOwnerUid !== uid) {
      throw new AppError("FORBIDDEN", "본인 글만 변경할 수 있습니다");
    }
    if (post.postType !== "partner-promo") {
      throw new AppError(
        "VALIDATION_ERROR",
        "partner-promo 타입만 이 엔드포인트로 변경 가능합니다",
      );
    }

    const next = action === "publish" ? "published" : "withdrawn";
    const result = await postRepository.setPublishStatus(postId, next);

    await partnerRepository.appendEvent(partner.id, {
      type: "publish-toggled",
      postId,
      from: result.from,
      to: result.to,
      decidedAt: new Date(),
    });

    revalidatePath(`/community/p/${post.slug}`);
    revalidatePath("/community/partners");
    revalidatePath("/sitemap.xml");

    return NextResponse.json({
      publishStatus: result.to,
      url:
        result.to === "published"
          ? `/community/p/${post.slug}`
          : `/partner/posts/${postId}/edit`,
      publishedAt: result.publishedAt?.toISOString() ?? null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
