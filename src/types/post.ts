import type { QuoteCategory } from "@/domain/quote-category";
import type { PostFormat } from "@/domain/post-format";

/**
 * v1.4 #1 provider-promo-content — AI 블로그 홍보 포스트.
 * v1.6 community-feed-3panel — `postType` 판별자로 3패널 분기.
 * v1.7 partner-promo — `customer-story` 제거 + `partner-promo` 도입 + `publishStatus` 필드.
 *   - 3패널: tip / provider / partner-promo
 *   - 레거시 문서: `postType` 누락 → 'provider', `publishStatus` 누락 → 'published'.
 * `posts/{postId}` 컬렉션 · public read (publishStatus='published'만) · Admin SDK only write.
 */

export type BrandTone = "friendly" | "professional" | "playful";

/**
 * v1.7: 커뮤니티 패널 판별자.
 *  - tip          : 청광 운영진이 작성한 청소 노하우
 *  - provider     : 인증된 청명(공급자) 자가 홍보
 *  - partner-promo: 인증된 의뢰업체(B2B 파트너)의 AI 보조 홍보 (v1.6 customer-story 대체)
 */
export type PostType = "tip" | "provider" | "partner-promo";

/**
 * v1.7: 발행 상태. partner-promo가 도입한 새 필드.
 *  - draft     : 작성자 본인만 접근 가능 (편집 중)
 *  - published : 공개 피드·검색·sitemap 노출 대상
 *  - withdrawn : 작성자가 철회 — 본인 미리보기만 가능, 재공개 시 publishedAt 재발급
 *
 * 레거시 문서(필드 없음)는 `published` 기본값으로 매핑 (R5).
 */
export type PublishStatus = "draft" | "published" | "withdrawn";

/**
 * v1.6 (post-merge): providers 패널 내 서브 카테고리.
 * (기존 그대로)
 */
export type ProviderStoryCategory = "field" | "howto" | "gear" | "life";

/**
 * AI 생성 메타.
 * v1.6: customer-story 전용으로 도입 (StoryGenerationMeta).
 * v1.7: partner-promo가 같은 shape를 사용하면서 `keywordsHint`(파트너 입력 키워드 보존) 추가.
 */
export interface StoryGenerationMeta {
  model: string;
  generatedAt: Date;
  ragSourceIds: string[];
  hygieneScore: number;
  visionTags: string[];
  /** v1.7: partner-promo 입력 키워드(0..5). customer-story에서는 미사용. */
  keywordsHint?: string[];
  /** v1.12 cycle #25: 사용된 admin contentTemplate.tags 스냅샷 (analytics·디버그용, UI 미노출). */
  templateTags?: string[];
  /** v1.12 cycle #25: card-news 검증 실패 후 blog로 fallback 재compose된 경우 true. */
  cardNewsValidationFailed?: boolean;
}

/** v1.7: partner-promo 의도를 명시하는 별칭. shape는 StoryGenerationMeta와 동일. */
export type PromoGenerationMeta = StoryGenerationMeta;

export interface Post {
  id: string;
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
  createdAt: Date;
  /** v1.7: 마지막 수정 시각. 누락 문서는 createdAt으로 폴백. */
  updatedAt: Date;
  /**
   * v1.7: 발행 시각. published로 전이된 마지막 시각 (withdrawn → published 시 재발급, H1).
   * draft 단계에서는 null. 레거시 published 문서는 createdAt으로 폴백.
   */
  publishedAt: Date | null;

  postType: PostType;
  /** v1.7: publishStatus. 레거시 문서는 'published'로 매핑(R5). */
  publishStatus: PublishStatus;
  /** provider postType 전용 — providers 패널 내 서브 필터링용. */
  storyCategory?: ProviderStoryCategory;
  sourcePhotos?: string[];
  generationMeta?: StoryGenerationMeta;
  /** v1.6 — 데모/샘플 계정이 작성한 포스트. UI에 배지 노출. */
  isSample?: boolean;

  /**
   * v1.12 cycle #25: partner-promo 콘텐츠 형식. 'blog' | 'card-news'.
   * 누락 시 `postFormatFallback`이 'blog'로 매핑 (R1 안전망).
   */
  format?: PostFormat;
  /** v1.12 cycle #25: 사용된 admin contentTemplate ID (추적용, optional). */
  templateId?: string;
  /** v1.12 cycle #25: 사용된 템플릿 scenarios 스냅샷 (한국어 사용자 친화 라벨, 카드 배지). */
  templateScenarios?: string[];
}

/** Server → Client boundary · feed card primitive */
export interface PostFeedCardDTO {
  id: string;
  slug: string; // v1.6: empty string 허용 (레거시 문서) — 카드 컴포넌트가 폴백 처리
  title: string;
  summary80: string;
  coverImageUrl: string | null;
  companyName: string;
  category: QuoteCategory;
  createdAtMs: number;
  isSample: boolean;
}
