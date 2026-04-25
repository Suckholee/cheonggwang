import type { QuoteCategory } from "@/domain/quote-category";

export interface QuoteTrendKeywords {
  category: QuoteCategory;
  keywords: string[];
  updatedAt: Date | null;
}
