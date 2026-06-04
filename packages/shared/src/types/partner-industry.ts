export const PARTNER_INDUSTRIES = [
  "cafe",
  "restaurant",
  "hair-salon",
  "academy",
  "office",
  "pet-clinic",
  "optical",
  "bakery",
  "other",
] as const;

export type PartnerIndustry = (typeof PARTNER_INDUSTRIES)[number];

export const PARTNER_INDUSTRY_LABELS: Record<PartnerIndustry, string> = {
  cafe: "카페",
  restaurant: "음식점",
  "hair-salon": "헤어샵",
  academy: "학원",
  office: "사무실·코워킹",
  "pet-clinic": "동물병원·펫샵",
  optical: "안경원",
  bakery: "베이커리",
  other: "기타",
};

export function isPartnerIndustry(v: string): v is PartnerIndustry {
  return (PARTNER_INDUSTRIES as readonly string[]).includes(v);
}
