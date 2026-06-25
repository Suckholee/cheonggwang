export type QuoteCategory = "residential" | "regular" | "construction" | "exterior" | "sanitation" | "specialist" | "lodging" | "industrial" | "special" | "etc";
export declare const QUOTE_CATEGORIES: readonly QuoteCategory[];
export declare const QUOTE_CATEGORY_LABELS: Record<QuoteCategory, string>;
export declare const QUOTE_CATEGORY_SUBTITLES: Record<QuoteCategory, string>;
export declare const QUOTE_CATEGORY_EMOJIS: Record<QuoteCategory, string>;
export declare function isQuoteCategory(v: string): v is QuoteCategory;
export declare function mapLegacyCategory(cat: string): QuoteCategory;
