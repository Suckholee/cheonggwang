import type { PartnerIndustry } from "@/domain/partner-industry";

/**
 * v1.11 partner-rag-system · §2.3 — admin curated 컨텐츠 템플릿.
 * 글 발행 시 partner.profile.industry 매칭으로 retrieval.
 */

export type ContentTemplateType = "blog" | "card-news";

export const CONTENT_TEMPLATE_TYPES: ContentTemplateType[] = [
  "blog",
  "card-news",
];

export const CONTENT_TEMPLATE_TYPE_LABELS: Record<
  ContentTemplateType,
  string
> = {
  blog: "블로그글",
  "card-news": "카드뉴스",
};

export interface ContentTemplate {
  id: string;
  type: ContentTemplateType;
  industry: PartnerIndustry;
  title: string; // max 100, admin 식별용
  body: string; // max 10000, RAG context로 사용
  tags: string[]; // ['opening','seasonal','review-event']
  scenarios: string[]; // ['신규 오픈','시즌 한정 메뉴']
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
