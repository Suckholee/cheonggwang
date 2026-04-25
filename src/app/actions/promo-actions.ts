"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
} from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";
import { providerRepository } from "@/lib/firebase/provider-repository";
import { workCaseRepository } from "@/lib/firebase/work-case-repository";
import { reviewRepository } from "@/lib/firebase/review-repository";
import { quoteTrendKeywordsRepository } from "@/lib/firebase/quote-trend-keywords-repository";
import {
  QUOTE_CATEGORIES,
  type QuoteCategory,
} from "@/domain/quote-category";
import { DEFAULT_QUOTE_TREND_KEYWORDS } from "@/domain/quote-trend-keywords-defaults";
import {
  updatePromoSettingsInputSchema,
  createPromoPostInputSchema,
  geminiPostOutputSchema,
  geminiPostResponseSchema,
  type UpdatePromoSettingsInput,
  type CreatePromoPostInput,
  type GeminiPostOutput,
} from "@/domain/promo-schemas";
import { buildPromoPrompt } from "@/domain/promo-prompt";
import { createGeminiClient } from "@/lib/gemini";
import { titleToSlug } from "@/lib/slug";
import {
  AppError,
  actionError,
  toActionError,
  type ActionResult,
} from "@/lib/errors";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** categories 미설정 엣지: 6 카테고리 × 상위 2개 혼합 = 12 일반 용어 */
function buildFallbackKeywords(): string[] {
  return Object.values(DEFAULT_QUOTE_TREND_KEYWORDS).flatMap((arr) =>
    arr.slice(0, 2),
  );
}

async function resolveProviderId(): Promise<string> {
  const jar = await cookies();
  const uid = await verifySessionCookie(
    jar.get(SESSION_COOKIE_NAME)?.value,
  );
  const user = await userRepository.get(uid);
  if (!user?.providerId) {
    throw new AppError("FORBIDDEN", "청명 권한이 없습니다");
  }
  return user.providerId;
}

/** 사전 정보 (brandTone + slogan) 저장 */
export async function updatePromoSettings(
  rawInput: UpdatePromoSettingsInput,
): Promise<ActionResult<{ providerId: string }>> {
  try {
    const input = updatePromoSettingsInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    await providerRepository.update(providerId, {
      brandTone: input.brandTone,
      slogan: input.slogan,
    });

    revalidatePath("/provider/profile");
    return { ok: true, data: { providerId } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}

/**
 * 새 홍보 포스트 생성. Gemini 호출 (10-30s) + posts.create + cooldown 업데이트.
 * Gemini 실패 시 lastPromoPostAt 미변경 (cooldown 보존).
 */
export async function createPromoPost(
  rawInput: CreatePromoPostInput,
): Promise<ActionResult<{ postId: string; slug: string }>> {
  try {
    const input = createPromoPostInputSchema.parse(rawInput);
    const providerId = await resolveProviderId();

    // 사전 정보 + cooldown check (Gemini 호출 전)
    const provider = await providerRepository.get(providerId);
    if (!provider) {
      throw new AppError("FORBIDDEN", "청명 정보를 찾을 수 없어요");
    }
    if (!provider.brandTone || !provider.slogan) {
      throw new AppError(
        "INVALID_STATE",
        "먼저 사전 정보(브랜드 톤·슬로건)를 저장해 주세요",
      );
    }
    if (provider.lastPromoPostAt) {
      const elapsed = Date.now() - provider.lastPromoPostAt.getTime();
      if (elapsed < COOLDOWN_MS) {
        throw new AppError(
          "INVALID_STATE",
          "주 1회만 생성할 수 있어요 · 다음 가능 시점까지 기다려주세요",
        );
      }
    }

    // 보강 fetch (H2 guard: categories[0]이 QuoteCategory 외 값이면 fallback)
    const primaryCategory = provider.categories[0];
    const isValidCategory =
      !!primaryCategory &&
      (QUOTE_CATEGORIES as readonly string[]).includes(primaryCategory);

    const [workCases, reviews, trendKeywords] = await Promise.all([
      workCaseRepository.listByProvider(providerId, 3),
      reviewRepository.listByProvider(providerId, 1),
      isValidCategory
        ? quoteTrendKeywordsRepository.getOrDefault(
            primaryCategory as QuoteCategory,
          )
        : Promise.resolve(buildFallbackKeywords()),
    ]);
    const latestReview = reviews[0] ?? null;

    // Gemini 호출 (실패 시 throw → cooldown 미소모)
    const prompt = buildPromoPrompt({
      provider,
      workCases,
      latestReview,
      topicHint: input.topicHint,
      trendKeywords,
      storyCategory: input.storyCategory,
    });
    const client = createGeminiClient();
    let raw: GeminiPostOutput;
    try {
      raw = await client.call<GeminiPostOutput>({
        systemInstruction: prompt.system,
        prompt: prompt.user,
        schema: geminiPostResponseSchema,
        temperature: 0.7,
      });
    } catch (e) {
      console.warn("[promo] Gemini 호출 실패:", e);
      throw new AppError(
        "LLM_FAILURE",
        "AI 생성에 실패했어요. 잠시 후 다시 시도해 주세요",
      );
    }

    let parsed: GeminiPostOutput;
    try {
      parsed = geminiPostOutputSchema.parse(raw);
    } catch (e) {
      console.warn("[promo] Gemini 출력 schema 위반:", e);
      throw new AppError(
        "INVALID_INPUT",
        "AI 응답을 해석할 수 없어요. 잠시 후 다시 시도해 주세요",
      );
    }

    // Cover image 결정
    const coverImageUrl =
      workCases[0]?.afterPhoto?.url ?? provider.profileImage ?? null;
    const coverImageAlt = parsed.title;

    // Doc id + slug
    const postsCol = adminDb.collection("posts");
    const postRef = postsCol.doc();
    const postId = postRef.id;
    const slug = `${titleToSlug(parsed.title)}-${postId.slice(0, 6)}`;

    // Region label snapshot
    const firstRegion = provider.regions[0];
    const regionLabel = firstRegion
      ? `${firstRegion.city} ${firstRegion.district}`
      : null;

    // TX
    await adminDb.runTransaction(async (tx) => {
      tx.create(postRef, {
        providerId,
        providerOwnerUid: provider.ownerUid,
        companyName: provider.companyName,
        categories: provider.categories,
        regionLabel,
        title: parsed.title,
        slug,
        coverImageUrl,
        coverImageAlt,
        bodyMarkdown: parsed.bodyMarkdown,
        summary80: parsed.summary80,
        topicHint: input.topicHint,
        brandTone: provider.brandTone,
        postType: "provider",
        storyCategory: input.storyCategory,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(adminDb.collection("providers").doc(providerId), {
        lastPromoPostAt: FieldValue.serverTimestamp(),
      });
    });

    revalidatePath("/community");
    revalidatePath(`/providers/${providerId}`);
    revalidatePath("/provider/profile");

    return { ok: true, data: { postId, slug } };
  } catch (e) {
    if (typeof e === "object" && e !== null && "issues" in e) {
      return actionError("INVALID_INPUT", "입력 정보가 올바르지 않습니다");
    }
    return toActionError(e);
  }
}
