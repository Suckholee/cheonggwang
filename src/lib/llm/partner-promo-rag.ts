import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Post, BrandTone } from "@/types/post";
import { inferCategories } from "@/domain/infer-categories";

/**
 * v1.7 partner-promo · §4.4 — partner-promo Compose 단계의 스타일 참조 retrieval.
 *
 * 전략 (Design §4.4):
 *   - postType IN ['partner-promo', 'provider'] AND publishStatus = 'published'
 *   - H7 결의: IN-쿼리 회피 — 두 개의 평행 쿼리 후 in-memory 합집합·정렬
 *   - H3 RAG starvation 방지:
 *       * provider 가중치 +0.1 (자동 발행으로 채워진 partner-promo 풀의 self-reference drift 방지)
 *       * 자기 자신(ownerUid 일치)의 글은 제외
 *   - visionTags 기반 카테고리 매칭 → 매칭 시 해당 카테고리 우선
 *   - 빈 결과는 generator가 RAG 없이 fallback compose
 */

const COLLECTION = "posts";

interface ScoredPost {
  post: Post;
  score: number;
}

function toStylePost(
  id: string,
  d: FirebaseFirestore.DocumentData,
): Post {
  const createdAt = d.createdAt?.toDate?.() ?? new Date();
  return {
    id,
    providerId: String(d.providerId ?? ""),
    providerOwnerUid: String(d.providerOwnerUid ?? ""),
    companyName: String(d.companyName ?? ""),
    categories: Array.isArray(d.categories) ? d.categories : [],
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
    updatedAt: d.updatedAt?.toDate?.() ?? createdAt,
    publishedAt: d.publishedAt?.toDate?.() ?? createdAt,
    postType:
      d.postType === "partner-promo" ? "partner-promo" : "provider",
    publishStatus: "published",
  };
}

async function listPublished(
  postType: "provider" | "partner-promo",
  limit: number,
  category?: string,
): Promise<Post[]> {
  let q: FirebaseFirestore.Query = adminDb
    .collection(COLLECTION)
    .where("postType", "==", postType)
    .where("publishStatus", "==", "published");
  if (category) {
    q = q.where("categories", "array-contains", category);
  }
  q = q.orderBy("createdAt", "desc").limit(limit);
  const snap = await q.get();
  return snap.docs.map((d) => toStylePost(d.id, d.data()));
}

/**
 * 태그 overlap (단순 lowercase 부분 매칭) + provider 우선 가중치.
 * post의 title/summary/categories를 시드로 점수 산정.
 */
function scoreByTagOverlap(
  posts: Post[],
  visionTags: readonly string[],
): ScoredPost[] {
  const tagSet = new Set(
    visionTags.map((t) => t.toLowerCase().trim()).filter(Boolean),
  );
  return posts.map((post) => {
    const haystack =
      `${post.title} ${post.summary80} ${post.categories.join(" ")}`.toLowerCase();
    let overlap = 0;
    for (const t of tagSet) {
      if (haystack.includes(t)) overlap++;
    }
    // H3: provider 가중치 +0.1
    const bonus = post.postType === "provider" ? 0.1 : 0;
    return { post, score: overlap + bonus };
  });
}

/**
 * partner-promo Compose 단계의 스타일 참조 검색.
 *  - excludeOwnerUid: 자기 자신의 글 제외 (self-reference drift 방지)
 *  - limit: 최종 반환 개수 (default 5)
 */
export async function retrievePartnerStyleReferences(
  visionTags: readonly string[],
  opts: {
    excludeOwnerUid?: string;
    limit?: number;
  } = {},
): Promise<Post[]> {
  const limit = opts.limit ?? 5;
  try {
    const categories = inferCategories(visionTags);
    const primaryCategory =
      categories.length > 0 ? categories[0] : undefined;

    // 두 개의 평행 쿼리 (H7) — IN-query 회피
    const fetchSize = 30;
    const [providerPool, partnerPool] = await Promise.all([
      listPublished("provider", fetchSize, primaryCategory),
      listPublished("partner-promo", fetchSize, primaryCategory),
    ]);

    let pool = [...providerPool, ...partnerPool];
    if (opts.excludeOwnerUid) {
      pool = pool.filter(
        (p) => p.providerOwnerUid !== opts.excludeOwnerUid,
      );
    }

    if (pool.length === 0 && primaryCategory) {
      // 카테고리 fallback: 카테고리 필터 없이 재시도
      const [provFallback, partnerFallback] = await Promise.all([
        listPublished("provider", fetchSize),
        listPublished("partner-promo", fetchSize),
      ]);
      pool = [...provFallback, ...partnerFallback];
      if (opts.excludeOwnerUid) {
        pool = pool.filter(
          (p) => p.providerOwnerUid !== opts.excludeOwnerUid,
        );
      }
    }

    const scored = scoreByTagOverlap(pool, visionTags);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.post);
  } catch (err) {
    console.warn(
      "[partner-promo-rag] retrieval failed, returning empty",
      err,
    );
    return [];
  }
}
