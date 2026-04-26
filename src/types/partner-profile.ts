import type { PartnerIndustry } from "@/domain/partner-industry";

/**
 * v1.11 partner-rag-system · §2.1 — Partner profile RAG 데이터.
 * partners/{partnerId} doc 안 nested field로 저장.
 */

export interface PriceItem {
  name: string; // max 50
  price: number; // 원, 0 이상
}

export type ProfileStatus =
  | "auto-approved" // 자동 hygiene-guard 통과 (즉시 RAG 가용)
  | "approved" // admin 명시 승인
  | "pending-review" // 자동 hygiene 실패 → admin 큐
  | "rejected"; // admin 거절

export interface PartnerProfile {
  description: string; // max 2000
  usps: string[]; // max 10개, 각 50자
  priceItems: PriceItem[]; // max 30
  photoUrls: string[]; // max 10장, /partners/{uid}/profile/* 경로
  /**
   * H2·H3: profile photoUrls Vision 분석 결과 캐시 (max 1500자).
   * 매 글 발행마다 사진 재분석 회피. photoUrls 변경 detect 시만 재분석.
   */
  photoAnalysisSummary: string;
  industry: PartnerIndustry;
  status: ProfileStatus;
  suspended: boolean; // admin 매장 단위 정지
  hygieneScore: number; // 0~1
  version: number; // 변경 시 increment (snapshot용 R5)
  updatedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectReason: string | null;
}

export type RagHistoryEventType =
  | "profile-updated"
  | "reviewed"
  | "suspended"
  | "reported";

export interface RagHistoryEvent {
  type: RagHistoryEventType;
  actor: "partner" | "admin" | "reporter";
  /** partner: ownerUid, admin: 'admin', reporter: hashed (M4) */
  actorUid: string | null;
  payload: Record<string, unknown>;
  at: Date;
}

/** 신고 원본 (admin only collection, M4). */
export interface PartnerReport {
  id: string;
  reporterUid: string; // 원본 uid (admin only read)
  partnerId: string;
  reason: string;
  link?: string;
  at: Date;
}
