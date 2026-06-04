import type { PartnerIndustry } from "./partner-industry";

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
  title: string;
  body: string;
  tags: string[];
  scenarios: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
