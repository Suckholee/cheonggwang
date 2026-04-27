import {
  type Firestore,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";
import { uniqueSlug } from "./slug";
import { inferCategoriesAuto } from "./infer-categories";
import type { Partner, BrandTone, PostFormat } from "./types";
import type { PartnerPromoDraftResult } from "./generator";

/**
 * v1.13 cycle #26 partner-auto-series · §4.3 (C3·C4 결의).
 *
 * Cloud Functions 측 post writer. cycle #19 postRepository.create와 동등한
 * 매핑(Timestamp.fromDate / publishedAt 자동 / inferCategories enrichment)을 명시 처리.
 *
 * ⚠️ MIRROR of src/lib/firebase/post-repository.ts create logic — keep in sync
 */

export interface CreatePostFromDraftInput {
  partner: Partner;
  draft: PartnerPromoDraftResult;
  photoUrls: string[];
  brandTone: BrandTone;
  keywords: string[];
  generatedAt: Date;
  isAutoSeries: boolean;
  templateId?: string;
  templateScenarios?: string[];
  templateTags?: string[];
}

export interface CreatePostFromDraftResult {
  postId: string;
  slug: string;
}

export async function createPostFromDraft(
  db: Firestore,
  postId: string,
  input: CreatePostFromDraftInput,
): Promise<CreatePostFromDraftResult> {
  const {
    partner,
    draft,
    photoUrls,
    brandTone,
    keywords,
    generatedAt,
    isAutoSeries,
    templateId,
    templateScenarios,
    templateTags,
  } = input;

  // C3 — uniqueSlug
  const slug = await uniqueSlug(db, draft.title);

  // C4 — partner.category 1차 + visionTags 2차 enrichment
  const categories = inferCategoriesAuto(draft.visionTags, partner.category);

  // generationMeta
  const generationMeta: Record<string, unknown> = {
    model:
      process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ?? "gemini-2.5-flash",
    generatedAt: Timestamp.fromDate(generatedAt),    // C4 명시 변환
    ragSourceIds: draft.ragSourceIds,
    hygieneScore: draft.hygieneScore,
    visionTags: draft.visionTags,
    keywordsHint: keywords,
    source: isAutoSeries ? "auto-series" : "manual",
  };
  if (draft.cardNewsValidationFailed) {
    generationMeta.cardNewsValidationFailed = true;
  }
  if (templateTags && templateTags.length > 0) {
    generationMeta.templateTags = templateTags;
  }

  const payload: Record<string, unknown> = {
    providerId: `partner:${partner.id}`,         // H7 — route.ts:334와 일치
    providerOwnerUid: partner.ownerUid,
    companyName: partner.businessName,
    categories,
    regionLabel: partner.regionLabel,
    title: draft.title,
    slug,
    coverImageUrl: photoUrls[0] ?? null,
    coverImageAlt: draft.coverImageAlt,
    bodyMarkdown: draft.bodyMarkdown,
    summary80: draft.summary80,
    topicHint: null,
    brandTone,
    postType: "partner-promo",
    publishStatus: "published",
    sourcePhotos: photoUrls,
    generationMeta,
    format: draft.format as PostFormat,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: FieldValue.serverTimestamp(),     // C4 — published 자동 설정
  };

  if (isAutoSeries) payload.isAutoSeries = true;
  if (templateId) payload.templateId = templateId;
  if (templateScenarios && templateScenarios.length > 0) {
    payload.templateScenarios = templateScenarios;
  }

  await db.collection("posts").doc(postId).create(payload);

  return { postId, slug };
}
