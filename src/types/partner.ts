import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.7 partner-promo — 청광 운영진이 인증한 B2B 파트너(의뢰업체) 마스터.
 *
 * 컬렉션: `partners/{partnerId}`
 *   - read: 본인(ownerUid) + admin
 *   - write: Admin SDK only (CLI `scripts/issue-partner.ts` 또는 Route Handler 경유)
 *
 * 서브컬렉션: `partners/{partnerId}/events/{eventId}` — 감사 로그 (S4 모니터링).
 *   `auto-published`, `draft-saved`, `publish-toggled`, `status-changed`, `cleanup-failed` 등.
 */

export type PartnerStatus = "invited" | "active" | "suspended";

/**
 * 자동 발행 윈도우 설정. KST(Asia/Seoul) 고정 (v1).
 *  - enabled = false 또는 weekdays 빈 배열 → 항상 false
 *  - startMinute < endMinute 강제 (자정 넘김 v1 미지원)
 *  - 분 단위 정수 [0..1439 / 1..1440]
 */
export interface AutoPublishConfig {
  enabled: boolean;
  /** 0=일요일, 1=월요일, ..., 6=토요일 */
  weekdays: number[];
  /** [0..1439] inclusive */
  startMinute: number;
  /** [1..1440] inclusive, exclusive end (judging is `< endMinute`) */
  endMinute: number;
  timezone: "Asia/Seoul";
}

export const DEFAULT_AUTO_PUBLISH: AutoPublishConfig = {
  enabled: false,
  weekdays: [],
  startMinute: 0,
  endMinute: 0,
  timezone: "Asia/Seoul",
};

export interface Partner {
  id: string;
  ownerUid: string;
  /** JSON-LD author.name으로도 사용. partner-promo 글의 companyName은 발행 시점 스냅샷. */
  businessName: string;
  logoUrl: string | null;
  category: QuoteCategory | null;
  regionLabel: string | null;
  status: PartnerStatus;
  autoPublish: AutoPublishConfig;
  /** 운영진이 발급한 시각 */
  issuedAt: Date;
  /** 운영진 식별자 (CLI `--by` 인자 또는 OPERATOR_NAME env) */
  issuedBy: string;
  notes: string | null;
}

/**
 * partners/{id}/events 서브컬렉션 이벤트.
 * 외부 직접 쓰기 없음 — Route Handler / CLI에서만 append.
 */
export type PartnerEvent =
  | {
      type: "auto-published";
      postId: string;
      hygieneScore: number;
      decidedAt: Date;
    }
  | {
      type: "draft-saved";
      postId: string;
      hygieneScore: number;
      reason:
        | "auto-disabled"
        | "out-of-window"
        | "hygiene-fail"
        | "manual";
      decidedAt: Date;
    }
  | {
      type: "publish-toggled";
      postId: string;
      from: "draft" | "published" | "withdrawn";
      to: "draft" | "published" | "withdrawn";
      decidedAt: Date;
    }
  | {
      type: "status-changed";
      from: PartnerStatus;
      to: PartnerStatus;
      by: string;
      decidedAt: Date;
    }
  | {
      type: "cleanup-failed";
      postId: string;
      reason: string;
      decidedAt: Date;
    };
