import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.1b #5 client-dashboard — Server→Client boundary DTOs + aggregation shapes.
 * v2+ analytics-batch로 교체 시 동일 shape으로 `dashboardSnapshots/{weekKey}` 문서 구성.
 */

export interface TopProviderCardDTO {
  providerId: string;
  companyName: string;
  profileImage: string | null;
  rating: number | null;
  completedWorkCount: number | null;
  repeatRate: number | null;
}

export interface PriceSummary {
  category: QuoteCategory;
  sampleCount: number;
  min: number | null;
  avg: number | null;
  max: number | null;
}
