import type { QuoteCategory } from "@/domain/quote-category";

export interface ProviderRegion {
  city: string;
  district: string;
}

export interface ProviderPriceBookEntry {
  category: QuoteCategory;
  unit: "per_visit" | "per_month" | "per_unit";
  unitLabel: string;
  basePrice: number;
  options?: Array<{ label: string; price: number }>;
}

export interface Provider {
  id: string;
  ownerUid: string;
  companyName: string;
  categories: QuoteCategory[];
  regions: ProviderRegion[];
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  isCheonggwangOwned: boolean;
  insured: boolean;
  /** v1.1 신규 optional — 배상보험 금액 (원) */
  insuranceAmount?: number;
  pageId: string | null;
  rating: number | null;
  /** v1.1 신규 optional — 리뷰 개수 (v2 reviews 집계) */
  reviewCount?: number | null;
  responseTimeHours: number | null;
  /** v1.1b #2 provider-profile — 평균 응답 시간 (분) · responseTimeHours 대체 권장. Stats 카드용. */
  responseTimeMinutes?: number | null;
  /** v1.1b #2 provider-profile — 완료 작업 수 (집계 placeholder · v2+ analytics-batch에서 실 계산) */
  completedWorkCount?: number | null;
  /** v1.1b #2 provider-profile — 재계약률 0~1 비율 (예: 0.78 → 78%) */
  repeatRate?: number | null;
  /** v1.1 provider-signup — self-signup은 false, admin 승인 시 true */
  verified?: boolean;
  /** v1.1 신규 optional — 경력 연차 */
  yearsOfExperience?: number;
  /** v1.1b provider-dashboard — 활동중 토글 */
  isAvailable?: boolean;
  /** v1.1 provider-profile-editor — 서비스 단가표 */
  priceBook?: ProviderPriceBookEntry[];
  /** v1.1 provider-profile-editor — 프로필 사진 URL */
  profileImage?: string;
  /** v1.1 provider-profile-editor — Storage 경로 */
  profileImagePath?: string;
  /** v1.4 provider-promo-content — 홍보 블로그 톤 */
  brandTone?: "friendly" | "professional" | "playful" | null;
  /** v1.4 provider-promo-content — 슬로건 max 40자 */
  slogan?: string | null;
  /** v1.4 provider-promo-content — 마지막 홍보 포스트 생성 시각 (주 1회 쿨다운) */
  lastPromoPostAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
