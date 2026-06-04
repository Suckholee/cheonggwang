import type { PartnerIndustry } from "./partner-industry";
export type ContentTemplateType = "blog" | "card-news";
export declare const CONTENT_TEMPLATE_TYPES: ContentTemplateType[];
export declare const CONTENT_TEMPLATE_TYPE_LABELS: Record<ContentTemplateType, string>;
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
