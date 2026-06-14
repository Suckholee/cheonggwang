import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.3 #1 booking — 일정 확정 · 작업 관리.
 * v1 status 단일 'confirmed' · v1.3b에서 'in_progress/completed/cancelled' 전이 추가.
 */

export type BookingStatus = "confirmed" | "completed" | "cancelled";

export interface Booking {
  id: string;
  quoteId: string;
  requestId: string;
  threadId: string;
  providerId: string;
  providerOwnerUid: string;
  clientUid: string;
  companyName: string;
  clientDisplayName: string;
  category: QuoteCategory;
  regionLabel: string;
  scheduledAt: Date;
  totalAmount: number;
  memo: string | null;
  status: BookingStatus;
  createdBy: string;
  createdAt: Date;
  report?: {
    completionStatus: string;
    checklist: string[];
    note: string | null;
    photos: string[];
    submittedAt: Date;
  } | null;
}

export type DayBucket = "today" | "tomorrow" | "thisWeek" | "later" | "past";

/** Server → Client primitive · chat thread 상단 banner */
export interface BookingBannerDTO {
  scheduledAtMs: number;
  scheduledLabel: string;
  memo: string | null;
}

/** Server → Client primitive · /provider/works list */
export interface BookingListItemDTO {
  id: string;
  threadId: string;
  counterpartName: string; // provider view → clientDisplayName
  category: QuoteCategory;
  regionLabel: string;
  scheduledAtMs: number;
  scheduledLabel: string;
  totalAmount: number;
  memo: string | null;
  bucket: DayBucket;
  status: BookingStatus;
  report?: {
    completionStatus: string;
    checklist: string[];
    note: string | null;
    photos: string[];
    submittedAtMs: number;
  } | null;
}

export interface QuoteRequestCalendarDTO {
  id: string;
  category: QuoteCategory;
  regionLabel: string;
  sizeLabel: string;
  preferredDateMs: number | null;
  preferredDateLabel: string;
  distanceLabel: string;
  competitorsCount: number;
  priceRange: string | null;
  note: string | null;
  photos: Array<{ url: string }>;
}
