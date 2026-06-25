import type { QuoteCategory } from "@/domain/quote-category";
import type { QuoteStatus } from "@/domain/quote-status";
import type { RoomType } from "@/domain/room-type";
import type { Photo, Region } from "@/types/page";

export type { QuoteStatus } from "@/domain/quote-status";

export interface QuoteRequest {
  id: string;
  clientUid: string;
  category: QuoteCategory;
  region: Region;
  size: number | null;
  /** v1.1 quote-response 확장 · Figma "32평·투룸" 표시용 */
  roomType?: RoomType;
  preferredDate: Date | null;
  contactPhone: string;
  photos: Photo[];
  note: string | null;
  address?: string;
  notifiedProviderIds: string[];
  status: QuoteStatus;
  createdAt: Date;
  
  // 2단계 견적을 위한 1차 기본 견적 계산 결과 필드
  baseAmount?: number;
  optionsAmount?: number;
  totalAmount?: number;
  optionsList?: Array<{ label: string; qty: number; price: number }>;
  
  // v1.7 견적기 맞춤화 관련 추가 필드
  quoteType?: "premium" | "regular" | "budget";
  frequency?: string;
  frequencyCount?: number;
}
