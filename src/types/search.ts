import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.2 #2 provider-search — Search filter & card DTO.
 * URL query param → SearchFilters → Firestore query + client-side 보정.
 */

export interface SearchFilters {
  category: QuoteCategory | null;
  region: { city: string; district: string } | null;
  insuredOnly: boolean;
  minRating: number | null; // v1: 4.0 or null (toggle only)
  sort: "repeatRate" | "rating";
}

export interface ProviderSearchCardDTO {
  providerId: string;
  companyName: string;
  profileImage: string | null;
  rating: number | null;
  reviewCount: number | null;
  repeatRate: number | null;
  categories: QuoteCategory[]; // max 3
  categoriesOverflow: number; // total - 3 (0 if none)
  regionLabel: string;
  insured: boolean;
  insuranceAmount: number | null;
  responseTimeMinutes: number | null;
}

export function hasAnyFilter(f: SearchFilters): boolean {
  return (
    f.category !== null ||
    f.region !== null ||
    f.insuredOnly ||
    f.minRating !== null
  );
}
