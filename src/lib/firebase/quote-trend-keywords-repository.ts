import "server-only";
import { cache } from "react";
import { z } from "zod";
import { adminDb } from "./admin";
import type { QuoteCategory } from "@/domain/quote-category";
import { DEFAULT_QUOTE_TREND_KEYWORDS } from "@/domain/quote-trend-keywords-defaults";
import type { QuoteTrendKeywords } from "@/types/quote-trend-keywords";

const COLLECTION = "quoteTrendKeywords";

const docSchema = z.object({
  keywords: z.array(z.string().min(1).max(30)).min(1).max(30),
  updatedAt: z.unknown().optional(),
});

export const quoteTrendKeywordsRepository = {
  getOrDefault: cache(
    async (category: QuoteCategory): Promise<string[]> => {
      try {
        const snap = await adminDb.collection(COLLECTION).doc(category).get();
        if (!snap.exists) return DEFAULT_QUOTE_TREND_KEYWORDS[category];

        const parsed = docSchema.parse(snap.data());
        return parsed.keywords;
      } catch (e) {
        console.warn(
          `[quoteTrendKeywords] fallback triggered for category="${category}":`,
          e,
        );
        return DEFAULT_QUOTE_TREND_KEYWORDS[category];
      }
    },
  ),

  async get(category: QuoteCategory): Promise<QuoteTrendKeywords | null> {
    const snap = await adminDb.collection(COLLECTION).doc(category).get();
    if (!snap.exists) return null;
    try {
      const raw = snap.data();
      const parsed = docSchema.parse(raw);
      const ts = raw?.updatedAt as { toDate?: () => Date } | undefined;
      const updatedAt = ts && typeof ts.toDate === "function" ? ts.toDate() : null;
      return {
        category,
        keywords: parsed.keywords,
        updatedAt,
      };
    } catch (e) {
      console.warn(`[quoteTrendKeywords] get() schema fail:`, e);
      return null;
    }
  },
};
