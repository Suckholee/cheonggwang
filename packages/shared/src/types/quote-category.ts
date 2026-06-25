export type QuoteCategory =
  | "residential"
  | "regular"
  | "construction"
  | "exterior"
  | "sanitation"
  | "specialist"
  | "lodging"
  | "industrial"
  | "special"
  | "etc";

export const QUOTE_CATEGORIES: readonly QuoteCategory[] = [
  "residential",
  "regular",
  "construction",
  "exterior",
  "sanitation",
  "specialist",
  "lodging",
  "industrial",
  "special",
  "etc",
] as const;

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  residential: "주거청소",
  regular: "정기청소",
  construction: "건설청소",
  exterior: "외부청소",
  sanitation: "위생/방역청소",
  specialist: "전문크리닝",
  lodging: "숙박청소",
  industrial: "산업청소",
  special: "특수청소",
  etc: "기타 시설 청소",
};

export const QUOTE_CATEGORY_SUBTITLES: Record<QuoteCategory, string> = {
  residential: "입주·이사·거주·원룸",
  regular: "카페·식당·사무실 정기",
  construction: "준공·공사후·인테리어",
  exterior: "유리창·간판·외벽",
  sanitation: "소독·방역·해충방제",
  specialist: "가전·소파·매트리스",
  lodging: "객실·펜션·고시텔",
  industrial: "공장·설비·창고",
  special: "고독사·화재·쓰레기집",
  etc: "학교·주차장·행사장",
};

export const QUOTE_CATEGORY_EMOJIS: Record<QuoteCategory, string> = {
  residential: "🏠",
  regular: "📆",
  construction: "🔨",
  exterior: "🧱",
  sanitation: "🛡️",
  specialist: "✨",
  lodging: "🏨",
  industrial: "🏭",
  special: "💀",
  etc: "🏢",
};

export function isQuoteCategory(v: string): v is QuoteCategory {
  return (QUOTE_CATEGORIES as readonly string[]).includes(v);
}

export function mapLegacyCategory(cat: string): QuoteCategory {
  if (cat === "move-in" || cat === "move-out") return "residential";
  if (cat === "office") return "regular";
  if (cat === "aircon") return "specialist";
  if (cat === "special") return "special";
  if (cat === "regular") return "regular";
  if (isQuoteCategory(cat)) return cat;
  return "residential";
}
