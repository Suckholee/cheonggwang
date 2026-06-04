export declare const PARTNER_INDUSTRIES: readonly ["cafe", "restaurant", "hair-salon", "academy", "office", "pet-clinic", "optical", "bakery", "other"];
export type PartnerIndustry = (typeof PARTNER_INDUSTRIES)[number];
export declare const PARTNER_INDUSTRY_LABELS: Record<PartnerIndustry, string>;
export declare function isPartnerIndustry(v: string): v is PartnerIndustry;
