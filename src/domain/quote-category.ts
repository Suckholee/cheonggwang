export type QuoteCategory =
  | "move-in"
  | "office"
  | "aircon"
  | "move-out"
  | "special"
  | "regular";

export const QUOTE_CATEGORIES: readonly QuoteCategory[] = [
  "move-in",
  "office",
  "aircon",
  "move-out",
  "special",
  "regular",
] as const;

export const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string> = {
  "move-in": "입주청소",
  office: "사무실청소",
  aircon: "에어컨청소",
  "move-out": "이사청소",
  special: "특수청소",
  regular: "정기청소",
};

export const QUOTE_CATEGORY_SUBTITLES: Record<QuoteCategory, string> = {
  "move-in": "이사 전·후",
  office: "주1·격주·월1",
  aircon: "분해 청소",
  "move-out": "쓰레기 정리",
  special: "곰팡이·해충",
  regular: "월 구독",
};

export const QUOTE_CATEGORY_EMOJIS: Record<QuoteCategory, string> = {
  "move-in": "🏠",
  office: "🏢",
  aircon: "❄️",
  "move-out": "🚚",
  special: "✨",
  regular: "📆",
};

export function isQuoteCategory(v: string): v is QuoteCategory {
  return (QUOTE_CATEGORIES as readonly string[]).includes(v);
}
