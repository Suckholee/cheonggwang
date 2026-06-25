/**
 * QuoteStatus 6-state 전이도 (Master Plan §4):
 *   submitted → quoted → negotiating → booked → completed
 *               ↓           ↓            ↓
 *             cancelled (any stage)
 *
 * - submitted:  v1.0 quote-request 의뢰인 제출 직후
 * - quoted:     v1.1 quote-response 청명이 견적서 전송 (최초 1명)
 * - negotiating: v1.2 chat 협의 진행중
 * - booked:     v1.3 booking 일정 확정
 * - completed:  v2 payment 결제 완료
 * - cancelled:  언제든 의뢰인 또는 청명 취소
 *
 * Migration: v1.1 이전 'responded' 값은 repository read 시 'quoted'로 alias.
 */
export type QuoteStatus =
  | "submitted"        // 고객접수
  | "estimating"       // 견적중
  | "consulted"        // 상담완료
  | "booked"           // 예약확정
  | "assigned"         // 작업배정
  | "working"          // 작업중
  | "completed"        // 작업완료
  | "settled"          // 정산완료
  | "cancelled"        // 취소됨
  | "quoted"           // 하위 호환
  | "negotiating";     // 하위 호환

export const QUOTE_STATUSES: readonly QuoteStatus[] = [
  "submitted",
  "estimating",
  "consulted",
  "booked",
  "assigned",
  "working",
  "completed",
  "settled",
  "cancelled",
  "quoted",
  "negotiating",
] as const;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  submitted: "고객접수",
  estimating: "견적중",
  consulted: "상담완료",
  booked: "예약확정",
  assigned: "작업배정",
  working: "작업중",
  completed: "작업완료",
  settled: "정산완료",
  cancelled: "취소됨",
  quoted: "견적중",
  negotiating: "상담완료",
};

/** v1.0 legacy 'responded' → 'quoted' normalize */
export function normalizeQuoteStatus(raw: string): QuoteStatus {
  if (raw === "responded") return "quoted";
  if ((QUOTE_STATUSES as readonly string[]).includes(raw)) {
    return raw as QuoteStatus;
  }
  return "submitted";
}

/** 청명이 응답(pass or quote) 가능한 상태 */
export const RESPONDABLE_STATUSES: readonly QuoteStatus[] = [
  "submitted",
  "estimating",
  "quoted",
] as const;

export function isRespondable(status: QuoteStatus): boolean {
  return (RESPONDABLE_STATUSES as readonly string[]).includes(status);
}

/** QuoteStepper 8단계 시각화용 */
export const STEPPER_LABELS: readonly string[] = [
  "고객접수",
  "견적중",
  "상담완료",
  "예약확정",
  "작업배정",
  "작업중",
  "작업완료",
  "정산완료",
] as const;

/** status → 현재 step index. cancelled = -1 (특수: "취소됨" 표시) */
export function statusToStepIndex(status: QuoteStatus): number {
  switch (status) {
    case "submitted":
      return 0;
    case "estimating":
    case "quoted":
      return 1;
    case "consulted":
    case "negotiating":
      return 2;
    case "booked":
      return 3;
    case "assigned":
      return 4;
    case "working":
      return 5;
    case "completed":
      return 6;
    case "settled":
      return 7;
    case "cancelled":
      return -1;
  }
}

/** 진행중 탭에 표시될 status */
export const ACTIVE_STATUSES: readonly QuoteStatus[] = [
  "submitted",
  "estimating",
  "quoted",
  "consulted",
  "negotiating",
  "booked",
  "assigned",
  "working",
] as const;

/** 완료 탭에 표시될 status */
export const COMPLETED_STATUSES: readonly QuoteStatus[] = [
  "completed",
  "settled",
] as const;

export function isActive(status: QuoteStatus): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isCompleted(status: QuoteStatus): boolean {
  return (COMPLETED_STATUSES as readonly string[]).includes(status);
}

/** acceptQuote 가능한 quoteRequest status (submitted or quoted or estimating) */
export function canAcceptQuote(status: QuoteStatus): boolean {
  return status === "submitted" || status === "quoted" || status === "estimating";
}
