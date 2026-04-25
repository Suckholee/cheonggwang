import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { adminStorage, getStorageBucketName } from "@/lib/firebase/admin";
import { checkAndIncrement } from "@/lib/firebase/rate-limit";
import { partnerRepository } from "@/lib/firebase/partner-repository";
import { postRepository } from "@/lib/firebase/post-repository";
import { requirePartnerApi } from "@/lib/auth/require-partner";
import {
  generatePartnerPromoDraft,
  cleanupPartnerPostPhotos,
} from "@/lib/llm/partner-promo-generator";
import { isInAutoPublishWindow } from "@/lib/partner/auto-publish-window";
import { titleToSlug } from "@/lib/slug";
import { inferCategories } from "@/domain/infer-categories";
import { AppError, type AppErrorCode } from "@/lib/errors";
import type { BrandTone, PromoGenerationMeta } from "@/types/post";

/**
 * v1.7 partner-promo · §3.1 + §6.1 — 초고 생성.
 *
 * 흐름: requirePartner → rate-limit → validate → upload → AI generate → autoPublish 분기 → posts.create
 * H2: 업로드 이후 모든 실패 경로에 cleanupPartnerPostPhotos 호출.
 */

const MAX_PHOTOS = 5;
const MAX_BYTES_PER_PHOTO = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB (M2)
const ALLOWED_MIME = /^image\/(jpeg|png|webp)$/;
const SIGNED_URL_EXPIRES_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10년

const DAILY_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  console.error("[/api/partner/posts] unexpected", e);
  return NextResponse.json(
    { code: "INTERNAL_ERROR", message: "일시적 오류가 발생했습니다" },
    { status: 500 },
  );
}

interface ValidatedInput {
  buffers: Array<{ buffer: Buffer; mimeType: string; ext: string }>;
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function parseKeywords(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  // JSON-encoded array 또는 콤마 분리 모두 허용
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0)
        .slice(0, 5);
    }
  } catch {
    // fallthrough
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);
}

async function validateForm(form: FormData): Promise<ValidatedInput> {
  const photos = form.getAll("photos");
  if (photos.length === 0) {
    throw new AppError("VALIDATION_ERROR", "사진을 1장 이상 올려주세요");
  }
  if (photos.length > MAX_PHOTOS) {
    throw new AppError(
      "VALIDATION_ERROR",
      `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요`,
    );
  }
  const buffers: ValidatedInput["buffers"] = [];
  let total = 0;
  for (const entry of photos) {
    if (!(entry instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "파일 형식이 올바르지 않습니다");
    }
    if (entry.size > MAX_BYTES_PER_PHOTO) {
      throw new AppError("VALIDATION_ERROR", "사진은 5MB 이하로 올려주세요");
    }
    if (!ALLOWED_MIME.test(entry.type)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "JPG · PNG · WebP 형식만 지원해요",
      );
    }
    total += entry.size;
    if (total > MAX_TOTAL_BYTES) {
      throw new AppError(
        "VALIDATION_ERROR",
        "사진 총 용량은 25MB 이하로 올려주세요",
      );
    }
    const buffer = Buffer.from(await entry.arrayBuffer());
    buffers.push({
      buffer,
      mimeType: entry.type,
      ext: extFromMime(entry.type),
    });
  }

  const keywords = parseKeywords(form.get("keywords")).map((k) =>
    k.slice(0, 30),
  );

  const sloganRaw = form.get("slogan");
  const slogan =
    typeof sloganRaw === "string" && sloganRaw.trim().length > 0
      ? sloganRaw.trim().slice(0, 40)
      : null;

  const toneRaw = form.get("brandTone");
  const brandTone: BrandTone =
    toneRaw === "professional" || toneRaw === "playful"
      ? toneRaw
      : "friendly";

  return { buffers, keywords, slogan, brandTone };
}

async function uploadPhotosToStorage(
  uid: string,
  postId: string,
  buffers: ValidatedInput["buffers"],
): Promise<string[]> {
  const bucket = adminStorage.bucket(getStorageBucketName());
  const urls: string[] = [];
  try {
    for (let i = 0; i < buffers.length; i++) {
      const { buffer, mimeType, ext } = buffers[i];
      const filename = `${i}-${nanoid(6)}.${ext}`;
      const filePath = `partners/${uid}/${postId}/${filename}`;
      const file = bucket.file(filePath);
      await file.save(buffer, {
        contentType: mimeType,
        resumable: false,
        metadata: { cacheControl: "public, max-age=31536000, immutable" },
      });
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + SIGNED_URL_EXPIRES_MS,
      });
      urls.push(signedUrl);
    }
    return urls;
  } catch (e) {
    throw new AppError(
      "STORAGE_FAIL",
      `Storage 업로드 실패: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

async function uniqueSlug(title: string, maxTries = 3): Promise<string> {
  const base = titleToSlug(title);
  for (let i = 0; i < maxTries; i++) {
    const candidate = `${base}-${nanoid(4)}`;
    const existing = await postRepository.findBySlug(candidate);
    if (!existing) return candidate;
  }
  throw new AppError(
    "SLUG_CONFLICT",
    "슬러그 충돌이 반복되어 생성을 중단했습니다",
  );
}

export async function POST(request: NextRequest) {
  let uid = "";
  let postId = "";
  let postUploaded = false;

  try {
    const { uid: u, partner } = await requirePartnerApi();
    uid = u;

    await checkAndIncrement(`partner:${uid}`, DAILY_LIMIT, DAY_MS);

    const form = await request.formData();
    const { buffers, keywords, slogan, brandTone } =
      await validateForm(form);

    postId = nanoid(16);

    // ── 업로드 이후 모든 실패 경로에 cleanup (H2) ──
    let photoUrls: string[];
    try {
      photoUrls = await uploadPhotosToStorage(uid, postId, buffers);
      postUploaded = true;
    } catch (e) {
      throw e; // 업로드 자체 실패 — Storage에 잔여 없음
    }

    const draft = await generatePartnerPromoDraft({
      uid,
      partnerId: partner.id,
      postId,
      photoUrls,
      keywords,
      slogan,
      brandTone,
      businessName: partner.businessName,
    });

    if (!draft.passed) {
      // hygiene-fail 이벤트 기록 + 사진 cleanup
      await partnerRepository.appendEvent(partner.id, {
        type: "draft-saved",
        postId,
        hygieneScore: draft.hygieneScore,
        reason: "hygiene-fail",
        decidedAt: new Date(),
      });
      throw new AppError("HYGIENE_FAIL", "콘텐츠가 적절하지 않습니다", {
        reasons: draft.reasons,
        hygieneScore: draft.hygieneScore,
      });
    }

    const slug = await uniqueSlug(draft.title);

    // autoPublish 분기 (Design §3.1)
    const inWindow = isInAutoPublishWindow(partner.autoPublish);
    const willAutoPublish = inWindow; // hygiene already passed
    const publishStatus = willAutoPublish ? "published" : "draft";
    const draftReason: "auto-disabled" | "out-of-window" | "manual" =
      !partner.autoPublish.enabled
        ? "auto-disabled"
        : !inWindow
          ? "out-of-window"
          : "manual";

    const generationMeta: PromoGenerationMeta = {
      model:
        process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ||
        process.env.GOOGLE_GENERATIVE_AI_MODEL ||
        "gemini-2.5-flash",
      generatedAt: new Date(),
      ragSourceIds: draft.ragSourceIds,
      hygieneScore: draft.hygieneScore,
      visionTags: draft.visionTags,
      keywordsHint: keywords,
    };

    // categories: partners.category 1차 + visionTags 2차 (OQ-5)
    const visionCategories = inferCategories(draft.visionTags);
    const categories = partner.category
      ? [partner.category, ...visionCategories.filter((c) => c !== partner.category)]
      : visionCategories;

    await postRepository.create(postId, {
      providerId: `partner:${partner.id}`,
      providerOwnerUid: uid,
      companyName: partner.businessName,
      categories,
      regionLabel: partner.regionLabel,
      title: draft.title,
      slug,
      coverImageUrl: photoUrls[0] ?? null,
      coverImageAlt: draft.coverImageAlt,
      bodyMarkdown: draft.bodyMarkdown,
      summary80: draft.summary80,
      topicHint: slogan,
      brandTone,
      postType: "partner-promo",
      publishStatus,
      sourcePhotos: photoUrls,
      generationMeta,
    });

    // 이벤트 로깅 + 자동 발행시 revalidate
    if (publishStatus === "published") {
      await partnerRepository.appendEvent(partner.id, {
        type: "auto-published",
        postId,
        hygieneScore: draft.hygieneScore,
        decidedAt: new Date(),
      });
      revalidatePath("/community/partners");
      revalidatePath(`/community/p/${slug}`);
      revalidatePath("/sitemap.xml");
    } else {
      await partnerRepository.appendEvent(partner.id, {
        type: "draft-saved",
        postId,
        hygieneScore: draft.hygieneScore,
        reason: draftReason,
        decidedAt: new Date(),
      });
    }

    return NextResponse.json(
      {
        postId,
        slug,
        status: publishStatus,
        url:
          publishStatus === "published"
            ? `/community/p/${slug}`
            : `/partner/posts/${postId}/edit`,
        hygieneScore: draft.hygieneScore,
      },
      { status: 201 },
    );
  } catch (e) {
    // H2: 업로드 이후 어떤 실패든 Storage cleanup
    if (postUploaded && uid && postId) {
      await cleanupPartnerPostPhotos(uid, postId);
    }
    return errorResponse(e);
  }
}
