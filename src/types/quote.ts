export interface QuoteItem {
  label: string;
  price: number;
  note?: string | null;
}

/** 견적서(quotes) 상태 · 청명이 보낸 견적의 의뢰인 응답 */
export type QuoteResponseStatus = "sent" | "accepted" | "rejected" | "completed" | "booked";

export interface Quote {
  id: string;
  requestId: string;
  providerId: string;
  clientUid: string;
  items: QuoteItem[];
  scheduledAt: Date | null;
  estimatedWorkHours: number | null;
  totalAmount: number;
  insured: boolean;
  insuranceAmount?: number | null;
  status: QuoteResponseStatus;
  sentAt: Date;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;

  // 2차 현장 추가 견적 정보
  additionalAmount?: number;
  additionalReason?: string;
  finalAmount?: number;
  finalConfirmed?: boolean;
  finalConfirmedAt?: Date | null;
}

