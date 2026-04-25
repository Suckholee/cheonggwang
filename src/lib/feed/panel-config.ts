import type { PostType, ProviderStoryCategory } from "@/types/post";

/**
 * v1.6 community-feed-3panel — 3패널 메타데이터.
 * v1.7 partner-promo — 'stories' 제거, 'partners' 추가. 3패널: tips / providers / partners.
 */
export type PanelSlug = "tips" | "providers" | "partners";

export interface PanelConfig {
  slug: PanelSlug;
  postType: PostType;
  label: string;
  tagline: string;
  seoTitle: string;
  seoDescription: string;
  /** OG 이미지 에셋 준비 전까지 undefined (sitemap/robots는 영향 없음). */
  ogImage?: string;
  emptyCopy: { heading: string; body: string; cta?: { label: string; href: string } };
}

export const PANELS: Record<PanelSlug, PanelConfig> = {
  tips: {
    slug: "tips",
    postType: "tip",
    label: "청소 노하우",
    tagline: "전문가들이 정리한 공간별 청소 팁",
    seoTitle: "청소 노하우 · 청광",
    seoDescription:
      "욕실·주방·거실·에어컨 등 공간별 청소 팁 모음. 청명 전문가들이 직접 작성했습니다.",
    emptyCopy: {
      heading: "아직 공개된 노하우가 없어요",
      body: "곧 전문가들이 작성한 청소 팁이 올라올 예정입니다.",
    },
  },
  providers: {
    slug: "providers",
    postType: "provider",
    label: "청소업체 홍보",
    tagline: "검증된 청명들의 서비스 소개",
    seoTitle: "청소업체 소개 · 청광",
    seoDescription: "인증된 청명 업체들의 서비스 소개와 홍보 글 모음",
    emptyCopy: {
      heading: "등록된 업체 홍보가 없어요",
      body: "곧 청명 파트너들의 소개글이 올라올 예정입니다.",
    },
  },
  partners: {
    slug: "partners",
    postType: "partner-promo",
    label: "의뢰업체 홍보",
    tagline:
      "청광이 함께한 매장과 서비스, 파트너가 직접 전하는 이야기",
    seoTitle: "의뢰업체 홍보 · 청광",
    seoDescription:
      "청광이 함께한 매장·식당·사무실의 직접 작성한 홍보글. 실제 공간을 사진과 함께 만나보세요.",
    emptyCopy: {
      heading: "아직 공개된 파트너 글이 없어요",
      body: "곧 청광 파트너들이 직접 쓴 매장 이야기가 올라옵니다.",
    },
  },
};

// v1.7 P8: stories 제거 → 3패널 구성.
export const PANEL_ORDER: readonly PanelSlug[] = [
  "tips",
  "providers",
  "partners",
] as const;

/**
 * v1.6 (post-merge): providers 패널 내 서브 카테고리.
 * UI는 /community/providers 페이지 상단에 chip 필터로 노출.
 * URL 쿼리 파라미터 `?cat={slug}` 로 선택 상태 보존.
 */
export interface ProviderSubcategoryConfig {
  slug: ProviderStoryCategory;
  label: string;
  description: string;
  emoji: string;
}

export const PROVIDERS_SUBCATEGORIES: readonly ProviderSubcategoryConfig[] = [
  {
    slug: "field",
    label: "현장 이야기",
    description: "오늘 이런 집 청소했다 · before/after 에피소드",
    emoji: "🏠",
  },
  {
    slug: "howto",
    label: "청소 노하우",
    description: "청명이 직접 쓰는 실전 팁",
    emoji: "💡",
  },
  {
    slug: "gear",
    label: "도구·약품",
    description: "써본 장비·세제 리뷰 & 추천",
    emoji: "🧽",
  },
  {
    slug: "life",
    label: "청명 일상",
    description: "동료·고객과의 에피소드, 업계 잡담",
    emoji: "☕",
  },
] as const;

export function getProviderSubcategoryConfig(
  slug: ProviderStoryCategory,
): ProviderSubcategoryConfig {
  const cfg = PROVIDERS_SUBCATEGORIES.find((s) => s.slug === slug);
  if (!cfg) throw new Error(`unknown provider subcategory: ${slug}`);
  return cfg;
}

export function isProviderStoryCategory(v: string): v is ProviderStoryCategory {
  return PROVIDERS_SUBCATEGORIES.some((s) => s.slug === v);
}
