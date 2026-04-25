import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.9 partner-application — 의뢰업체 등록 신청자.
 *
 * 컬렉션: `partnerApplicants/{applicantId}`
 *   - read: 본인 ownerUid + admin claim
 *   - write: Admin SDK only (server action / Route Handler)
 *
 * Lifecycle:
 *   pending  → approved : admin 승인 시 partners doc 생성 + partnerId back-link
 *   pending  → rejected : admin 거절 + rejectReason
 *   rejected → pending  : 신청자 재신청 (R14 reopen) — 새 doc 만들지 않고 기존 doc reset
 */

export type PartnerApplicantStatus = "pending" | "approved" | "rejected";

export interface PartnerApplicant {
  id: string;
  ownerUid: string;
  businessName: string;
  email: string;                 // Auth email 사본 (검색·표시용)
  phone: string | null;
  category: QuoteCategory | null;
  regionLabel: string | null;
  intro: string | null;          // ≤500자
  status: PartnerApplicantStatus;
  appliedAt: Date;
  reviewedAt: Date | null;
  reviewedBy: string | null;     // 'admin'
  rejectReason: string | null;   // ≤200자
  /** 승인 시 발급된 partnerId back-link (H5 결의) — pending/rejected에는 null */
  partnerId: string | null;
}
