import type { QuoteCategory } from "@/domain/quote-category";
import type { QuoteStatus } from "@/domain/quote-status";
import type { RoomType } from "@/domain/room-type";
import type { Photo, Region } from "@/types/page";

export type { QuoteStatus } from "@/domain/quote-status";

export interface QuoteRequest {
  id: string;
  clientUid: string;
  clientName: string;
  category: QuoteCategory;
  subService: string;
  region: Region;
  size: number | null;
  /** v1.1 quote-response 확장 · Figma "32평·투룸" 표시용 */
  roomType?: RoomType;
  preferredDate: Date | null;
  preferredTime: string;
  hasElevator: "yes" | "no";
  parkingAvailable: "yes" | "no" | "discuss";
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
  
  // v2.0 CleanMatch 피벗 관련 추가 필드 (단가 제거된 상태의 체크리스트)
  extraSpacesList?: Array<{ id: string; label: string; type: "check" | "quantity" | "select"; value: boolean | number | string }>;
  selectedOptionsList?: Array<{ id: string; label: string; type: "check" | "quantity" | "select"; value: boolean | number | string }>;

  // v1.7 견적기 맞춤화 관련 추가 필드
  quoteType?: "premium" | "regular" | "budget";
  frequency?: string;
  frequencyCount?: number;

  // 공통 기획 추가 필드
  workerAssignment?: {
    assignedTeam: string;
    teamLeaderName: string;
    teamLeaderPhone: string;
    workerCount: number;
    estimatedHours: number;
  };
  photosBefore?: Photo[];
  photosAfter?: Photo[];
  customerReview?: {
    rating: number;
    comment: string;
    wouldReuse: string;
  };
  bookingPayment?: {
    bookingNumber: string;
    receivedAt: Date;
    hasDeposit: boolean;
    depositAmount: number;
    balanceAmount: number;
    paymentMethod: string;
  };
  providerPayment?: number;
}
