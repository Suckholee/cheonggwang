import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.1b #4 provider-dashboard — Server→Client boundary DTOs.
 * Firestore Timestamp 등 non-primitive 필드가 Client 컴포넌트에 새지 않도록 변환.
 */

export interface QuoteRequestPreviewDTO {
  id: string;
  category: QuoteCategory;
  regionLabel: string;
  sizeLabel: string | null;
  createdAtMs: number;
  note: string | null;
}

export interface DashboardStats {
  completedWorkCount: number | null;
  rating: number | null;
  reviewCount: number | null;
  responseTimeMinutes: number | null;
}
