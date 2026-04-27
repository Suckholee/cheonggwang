import "server-only";
import { cache } from "react";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  Post,
  BrandTone,
  PostType,
  ProviderStoryCategory,
  StoryGenerationMeta,
  PublishStatus,
} from "@/types/post";
import type { PostFormat } from "@/domain/post-format";
import type { QuoteCategory } from "@/domain/quote-category";

const COLLECTION = "posts";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toPost(id: string, d: DocumentData): Post {
  const rawCategories = Array.isArray(d.categories)
    ? (d.categories as QuoteCategory[])
    : [];
  // v1.6 C1+R5: 레거시 문서(postType 없음)는 'provider' 기본값 — 하위호환.
  // v1.7 P8: customer-story 제거. partner-promo 추가.
  // 잔존하는 customer-story 문서는 'provider'로 폴백 (안전 매핑).
  const rawType = d.postType as string | undefined;
  const postType: PostType =
    rawType === "tip" || rawType === "partner-promo"
      ? rawType
      : "provider";
  // v1.7 R5: 레거시 문서(publishStatus 없음)는 'published'로 매핑 — 기존 글 호환.
  const rawStatus = d.publishStatus as string | undefined;
  const publishStatus: PublishStatus =
    rawStatus === "draft" || rawStatus === "withdrawn"
      ? rawStatus
      : "published";
  const rawStoryCat = d.storyCategory as string | undefined;
  const storyCategory: ProviderStoryCategory | undefined =
    rawStoryCat === "field" ||
    rawStoryCat === "howto" ||
    rawStoryCat === "gear" ||
    rawStoryCat === "life"
      ? rawStoryCat
      : undefined;
  const sourcePhotos = Array.isArray(d.sourcePhotos)
    ? (d.sourcePhotos as string[])
    : undefined;
  const genMetaRaw = d.generationMeta as DocumentData | undefined;
  const generationMeta: StoryGenerationMeta | undefined = genMetaRaw
    ? {
        model: String(genMetaRaw.model ?? ""),
        generatedAt: tsToDate(genMetaRaw.generatedAt as Timestamp | undefined),
        ragSourceIds: Array.isArray(genMetaRaw.ragSourceIds)
          ? (genMetaRaw.ragSourceIds as string[])
          : [],
        hygieneScore: Number(genMetaRaw.hygieneScore ?? 0),
        visionTags: Array.isArray(genMetaRaw.visionTags)
          ? (genMetaRaw.visionTags as string[])
          : [],
        keywordsHint: Array.isArray(genMetaRaw.keywordsHint)
          ? (genMetaRaw.keywordsHint as string[])
          : undefined,
        // v1.12 cycle #25
        templateTags: Array.isArray(genMetaRaw.templateTags)
          ? (genMetaRaw.templateTags as string[])
          : undefined,
        cardNewsValidationFailed:
          genMetaRaw.cardNewsValidationFailed === true ? true : undefined,
      }
    : undefined;
  const createdAt = tsToDate(d.createdAt as Timestamp | undefined);
  // v1.7: updatedAt 누락 시 createdAt으로 폴백.
  const updatedAt = d.updatedAt
    ? tsToDate(d.updatedAt as Timestamp | undefined)
    : createdAt;
  // v1.7: publishedAt — published면 createdAt으로 폴백, draft면 null.
  const publishedAt = d.publishedAt
    ? tsToDate(d.publishedAt as Timestamp | undefined)
    : publishStatus === "published"
      ? createdAt
      : null;
  return {
    id,
    providerId: String(d.providerId ?? ""),
    providerOwnerUid: String(d.providerOwnerUid ?? ""),
    companyName: String(d.companyName ?? ""),
    categories: rawCategories,
    regionLabel: (d.regionLabel as string | null | undefined) ?? null,
    title: String(d.title ?? ""),
    slug: String(d.slug ?? ""),
    coverImageUrl: (d.coverImageUrl as string | null | undefined) ?? null,
    coverImageAlt: (d.coverImageAlt as string | null | undefined) ?? null,
    bodyMarkdown: String(d.bodyMarkdown ?? ""),
    summary80: String(d.summary80 ?? ""),
    topicHint: (d.topicHint as string | null | undefined) ?? null,
    brandTone: ((d.brandTone as string) ?? "friendly") as BrandTone,
    createdAt,
    updatedAt,
    publishedAt,
    postType,
    publishStatus,
    storyCategory,
    sourcePhotos,
    generationMeta,
    isSample: d.isSample === true,
    // v1.12 cycle #25
    format: ((): PostFormat | undefined => {
      const f = d.format;
      return f === "blog" || f === "card-news" ? f : undefined;
    })(),
    templateId:
      typeof d.templateId === "string" ? (d.templateId as string) : undefined,
    templateScenarios: Array.isArray(d.templateScenarios)
      ? (d.templateScenarios as string[])
      : undefined,
  };
}

export interface CreatePostInput {
  providerId: string;
  providerOwnerUid: string;
  companyName: string;
  categories: QuoteCategory[];
  regionLabel: string | null;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  bodyMarkdown: string;
  summary80: string;
  topicHint: string | null;
  brandTone: BrandTone;
  postType: PostType;
  storyCategory?: ProviderStoryCategory;
  sourcePhotos?: string[];
  generationMeta?: StoryGenerationMeta;
  /** v1.7: 누락 시 'published' 기본값 (기존 호출자 호환). partner-promo는 항상 명시. */
  publishStatus?: PublishStatus;
  /** v1.12 cycle #25 — partner-promo 콘텐츠 형식. 누락 시 read 시점에 'blog' fallback. */
  format?: PostFormat;
  /** v1.12 cycle #25 — 사용된 admin contentTemplate ID. */
  templateId?: string;
  /** v1.12 cycle #25 — 사용된 템플릿 scenarios 스냅샷 (한국어 카드 배지). */
  templateScenarios?: string[];
}

export interface UpdateDraftInput {
  title?: string;
  summary80?: string;
  bodyMarkdown?: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  brandTone?: BrandTone;
}

export interface PostListOptions {
  limit?: number;
  cursor?: string;
}

export interface PostFilterOptions extends PostListOptions {
  regionLabel?: string;
  category?: QuoteCategory;
}

export interface PostPage {
  posts: Post[];
  nextCursor: string | null;
}

export const postRepository = {
  async create(id: string, data: CreatePostInput): Promise<void> {
    // v1.7: publishStatus 누락 시 'published' (기존 호출자 호환).
    const publishStatus: PublishStatus = data.publishStatus ?? "published";
    const payload: DocumentData = {
      providerId: data.providerId,
      providerOwnerUid: data.providerOwnerUid,
      companyName: data.companyName,
      categories: data.categories,
      regionLabel: data.regionLabel,
      title: data.title,
      slug: data.slug,
      coverImageUrl: data.coverImageUrl,
      coverImageAlt: data.coverImageAlt,
      bodyMarkdown: data.bodyMarkdown,
      summary80: data.summary80,
      topicHint: data.topicHint,
      brandTone: data.brandTone,
      postType: data.postType,
      publishStatus,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    // v1.7: published로 생성되면 publishedAt도 같이 set (자동발행 케이스).
    if (publishStatus === "published") {
      payload.publishedAt = FieldValue.serverTimestamp();
    }
    if (data.storyCategory) payload.storyCategory = data.storyCategory;
    if (data.sourcePhotos) payload.sourcePhotos = data.sourcePhotos;
    if (data.generationMeta) {
      payload.generationMeta = {
        ...data.generationMeta,
        generatedAt: Timestamp.fromDate(data.generationMeta.generatedAt),
      };
    }
    // v1.12 cycle #25 — partner-content-formats
    if (data.format) payload.format = data.format;
    if (data.templateId) payload.templateId = data.templateId;
    if (data.templateScenarios && data.templateScenarios.length > 0) {
      payload.templateScenarios = data.templateScenarios;
    }
    await col().doc(id).create(payload);
  },

  /**
   * React cache() 래핑 · `/community/{postId}` 페이지에서 generateMetadata + body가
   * 동일 request 내에 호출 시 1회 fetch.
   */
  get: cache(async (id: string): Promise<Post | null> => {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toPost(snap.id, snap.data()!);
  }),

  /**
   * v1.6: `/community/p/[slug]` 상세 페이지용 — 슬러그 기반 canonical 조회.
   *
   * Next 16 `cacheComponents: true` 호환:
   *   - `'use cache'` 디렉티브로 Next Cache에 저장 → Suspense 밖(generateMetadata, page root)에서 호출 가능
   *   - `cacheLife('minutes')`: 기본 5분 TTL · 배치 발행 이후 `revalidatePath` 호출이 무효화
   *   - 인자(slug)는 자동으로 캐시 키에 포함.
   */
  /** React cache() — 요청 내 중복 호출 dedup. */
  findBySlug: cache(async (slug: string): Promise<Post | null> => {
    const snap = await col().where("slug", "==", slug).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toPost(doc.id, doc.data());
  }),

  async listRecent(limit = 50): Promise<Post[]> {
    const snap = await col()
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },

  async listByProvider(providerId: string, limit = 3): Promise<Post[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },

  /**
   * v1.6: 패널별 기본 리스트 — 인덱스 `(postType, createdAt DESC)` 사용.
   * Admin SDK의 `DocumentSnapshot.exists`는 property (method 아님).
   */
  listByType: cache(
    async (
      type: PostType,
      opts: PostListOptions = {},
    ): Promise<PostPage> => {
      const { limit = 20, cursor } = opts;
      let q: FirebaseFirestore.Query = col()
        .where("postType", "==", type)
        .orderBy("createdAt", "desc")
        .limit(limit + 1);
      if (cursor) {
        const cursorSnap = await col().doc(cursor).get();
        if (cursorSnap.exists) q = q.startAfter(cursorSnap);
      }
      const snap = await q.get();
      const docs = snap.docs.slice(0, limit);
      const next =
        snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return {
        posts: docs.map((d) => toPost(d.id, d.data())),
        nextCursor: next,
      };
    },
  ),

  /**
   * v1.6: region OR category 서브필터. 둘 다 동시 적용은 v2 (3-way 복합 인덱스 필요).
   * region 우선 — 둘 다 지정 시 category는 무시.
   */
  listByTypeFiltered: cache(
    async (
      type: PostType,
      opts: PostFilterOptions,
    ): Promise<PostPage> => {
      const { limit = 20, cursor, regionLabel, category } = opts;
      let q: FirebaseFirestore.Query = col().where(
        "postType",
        "==",
        type,
      );
      if (regionLabel) {
        q = q.where("regionLabel", "==", regionLabel);
      } else if (category) {
        q = q.where("categories", "array-contains", category);
      }
      q = q.orderBy("createdAt", "desc").limit(limit + 1);
      if (cursor) {
        const cursorSnap = await col().doc(cursor).get();
        if (cursorSnap.exists) q = q.startAfter(cursorSnap);
      }
      const snap = await q.get();
      const docs = snap.docs.slice(0, limit);
      const next =
        snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return {
        posts: docs.map((d) => toPost(d.id, d.data())),
        nextCursor: next,
      };
    },
  ),

  /**
   * v1.6: 패널 내 키워드 검색. v1은 최근 200건 인메모리 contains (ko-KR 정규화 단순 lowercase).
   * v2에서 외부 검색(Algolia/Elastic)으로 대체 여지.
   */
  async searchInType(
    type: PostType,
    query: string,
    limit = 30,
  ): Promise<Post[]> {
    const q = query.trim();
    if (!q) return [];
    const snap = await col()
      .where("postType", "==", type)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const needle = q.toLowerCase();
    return snap.docs
      .map((d) => toPost(d.id, d.data()))
      .filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.summary80.toLowerCase().includes(needle) ||
          p.bodyMarkdown.toLowerCase().includes(needle),
      )
      .slice(0, limit);
  },

  /**
   * v1.6 (post-merge): providers 패널 서브 카테고리 필터.
   *  - 인덱스: (postType, storyCategory, createdAt DESC)
   *  - storyCategory 없는 레거시 문서는 누락됨(의도적) — 재생성 후 포함.
   */
  listByTypeAndStoryCategory: cache(
    async (
      type: PostType,
      storyCategory: ProviderStoryCategory,
      opts: PostListOptions = {},
    ): Promise<PostPage> => {
      const { limit = 20, cursor } = opts;
      let q: FirebaseFirestore.Query = col()
        .where("postType", "==", type)
        .where("storyCategory", "==", storyCategory)
        .orderBy("createdAt", "desc")
        .limit(limit + 1);
      if (cursor) {
        const cursorSnap = await col().doc(cursor).get();
        if (cursorSnap.exists) q = q.startAfter(cursorSnap);
      }
      const snap = await q.get();
      const docs = snap.docs.slice(0, limit);
      const next =
        snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return {
        posts: docs.map((d) => toPost(d.id, d.data())),
        nextCursor: next,
      };
    },
  ),

  /** v1.6: 사이트맵 생성용 — 모든 타입 전수 (5000건 상한). */
  async listAllForSitemap(limit = 5000): Promise<Post[]> {
    const snap = await col()
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },

  /**
   * v1.7 partner-promo: 패널·검색·RSS는 publishStatus='published' 필터를 강제.
   * 인덱스: (postType ASC, publishStatus ASC, createdAt DESC).
   */
  listByTypeAndStatus: cache(
    async (
      type: PostType,
      status: PublishStatus,
      opts: PostListOptions = {},
    ): Promise<PostPage> => {
      const { limit = 20, cursor } = opts;
      let q: FirebaseFirestore.Query = col()
        .where("postType", "==", type)
        .where("publishStatus", "==", status)
        .orderBy("createdAt", "desc")
        .limit(limit + 1);
      if (cursor) {
        const cursorSnap = await col().doc(cursor).get();
        if (cursorSnap.exists) q = q.startAfter(cursorSnap);
      }
      const snap = await q.get();
      const docs = snap.docs.slice(0, limit);
      const next =
        snap.docs.length > limit ? docs[docs.length - 1].id : null;
      return {
        posts: docs.map((d) => toPost(d.id, d.data())),
        nextCursor: next,
      };
    },
  ),

  /**
   * v1.7: 파트너 본인 글 목록. status별 필터링은 호출자가 수행.
   * 인덱스: (providerOwnerUid ASC, createdAt DESC).
   */
  async listMyPosts(
    ownerUid: string,
    limit = 50,
  ): Promise<Post[]> {
    const snap = await col()
      .where("providerOwnerUid", "==", ownerUid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },

  /**
   * v1.7: draft/published 본문 수정. updatedAt 자동 set.
   * publishStatus·publishedAt은 변경하지 않음 (전이는 setPublishStatus 사용).
   */
  async updateDraft(
    id: string,
    patch: UpdateDraftInput,
  ): Promise<void> {
    const update: DocumentData = { updatedAt: FieldValue.serverTimestamp() };
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.summary80 !== undefined) update.summary80 = patch.summary80;
    if (patch.bodyMarkdown !== undefined)
      update.bodyMarkdown = patch.bodyMarkdown;
    if (patch.coverImageUrl !== undefined)
      update.coverImageUrl = patch.coverImageUrl;
    if (patch.coverImageAlt !== undefined)
      update.coverImageAlt = patch.coverImageAlt;
    if (patch.brandTone !== undefined) update.brandTone = patch.brandTone;
    await col().doc(id).update(update);
  },

  /**
   * v1.7: publishStatus 전이 (트랜잭션 read-then-CAS).
   * H1: withdrawn → published 시 publishedAt 재발급. published → withdrawn 시 publishedAt 보존.
   * 잘못된 전이는 STATUS_CONFLICT throw.
   */
  async setPublishStatus(
    id: string,
    next: PublishStatus,
  ): Promise<{ from: PublishStatus; to: PublishStatus; publishedAt: Date | null }> {
    return await adminDb.runTransaction(async (tx) => {
      const ref = col().doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) {
        const { AppError } = await import("@/lib/errors");
        throw new AppError("NOT_FOUND", "포스트를 찾을 수 없습니다");
      }
      const data = snap.data()!;
      const from: PublishStatus =
        (data.publishStatus as PublishStatus | undefined) ?? "published";
      // 전이 검증 (§6.4 표 기준)
      const allowed = isAllowedTransition(from, next);
      if (!allowed) {
        const { AppError } = await import("@/lib/errors");
        throw new AppError(
          "STATUS_CONFLICT",
          `${from} → ${next} 전이는 허용되지 않습니다`,
        );
      }
      const update: DocumentData = {
        publishStatus: next,
        updatedAt: FieldValue.serverTimestamp(),
      };
      // H1: published로 진입할 때마다 publishedAt 재발급 (draft→pub, withdrawn→pub).
      let publishedAt: Date | null =
        data.publishedAt
          ? tsToDate(data.publishedAt as Timestamp)
          : null;
      if (next === "published" && from !== "published") {
        update.publishedAt = FieldValue.serverTimestamp();
        publishedAt = new Date(); // 응답용 근사치 (실제 값은 Firestore에서)
      }
      tx.update(ref, update);
      return { from, to: next, publishedAt };
    });
  },

  /**
   * v1.7 P3 helper: 운영진 / DELETE 흐름. publishStatus=='draft'만 허용.
   * 호출자가 본인 검증을 선행한다.
   */
  async deleteDraft(id: string): Promise<void> {
    const ref = col().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return; // 멱등 처리
    const data = snap.data()!;
    const status: PublishStatus =
      (data.publishStatus as PublishStatus | undefined) ?? "published";
    if (status !== "draft") {
      const { AppError } = await import("@/lib/errors");
      throw new AppError("STATUS_CONFLICT", "초고만 삭제할 수 있습니다");
    }
    await ref.delete();
  },
};

/**
 * v1.7: publishStatus 전이 룰 (Design §6.4).
 *  draft     → published    ✓
 *  draft     → withdrawn    ✗ (draft는 published 거치고 철회)
 *  published → withdrawn    ✓
 *  published → published    ✓ (no-op)
 *  withdrawn → published    ✓ (재공개)
 *  그 외                     ✗
 */
function isAllowedTransition(
  from: PublishStatus,
  to: PublishStatus,
): boolean {
  if (from === to) return to !== "draft"; // draft → draft no-op은 update에서 처리
  if (from === "draft" && to === "published") return true;
  if (from === "published" && to === "withdrawn") return true;
  if (from === "withdrawn" && to === "published") return true;
  return false;
}
