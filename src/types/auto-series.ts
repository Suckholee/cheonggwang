import type { BrandTone } from "@/types/post";
import type { AutoSeriesAngle } from "@/domain/auto-series-angle";
import type { PostFormat } from "@/domain/post-format";

/**
 * v1.13 cycle #26 partner-auto-series · §2.2.
 *
 * partner.autoSeries config + seriesHistory 이벤트 모델.
 *
 * R7 결의 — 모든 partner write는 server action(Admin SDK) 경유.
 *  - self-write 화이트리스트(zod): enabled, brandTone
 *  - server-only: lastIndex, lastTickAt, totalPublished, totalFailed
 */

export interface PartnerAutoSeries {
  enabled: boolean;
  /**
   * v1.14 cycle #27 R8 (Path X): effectiveQueue 안 인덱스.
   * -1: 첫 tick. server-only write.
   */
  lastIndex: number;
  /**
   * 마지막 cron tick 처리 시각.
   * - 성공/hygiene-fail/photo-missing 시에만 갱신 (window 소비)
   * - transient error(LLM/Storage 등) 시 미갱신 (다음 hourly tick 재시도 — H2)
   * server-only write
   */
  lastTickAt: Date | null;
  /** self-write 허용 (server action zod 화이트리스트로) */
  brandTone: BrandTone;
  /** server-only write */
  totalPublished: number;
  /** server-only write */
  totalFailed: number;
  /**
   * v1.14 cycle #27 (C1 결의): photo offset 전용 cursor.
   * lastIndex와 분리 — queue length 변경에 영향 받지 않고 매 tick +1.
   * undefined/누락 시 0 fallback.
   */
  photoCursor: number;
}

export const DEFAULT_AUTO_SERIES: PartnerAutoSeries = {
  enabled: false,
  lastIndex: -1,
  lastTickAt: null,
  brandTone: "friendly",
  totalPublished: 0,
  totalFailed: 0,
  photoCursor: 0,
};

/**
 * v1.14 cycle #27 partner-series-queue · §2.1.
 *
 * 사장님이 편집하는 자동 시리즈 큐 항목.
 * partner.autoSeriesQueue가 undefined 또는 빈 효과 큐 → cycle #26 ROTATION_POOL fallback.
 */
export interface QueueItem {
  /** nanoid(8) — reorder/remove 보정용 안정 식별자 */
  id: string;
  angle: AutoSeriesAngle;
  format: PostFormat;
  /** false = 일시정지 (cron skip, 큐에는 남음) */
  enabled: boolean;
}

export type SeriesHistoryStatus =
  | "published"
  | "hygiene-fail"
  | "error"
  | "photo-missing";

export interface SeriesHistoryEvent {
  id: string;
  /** ROTATION_POOL 슬롯 인덱스 (0..9) */
  slotIndex: number;
  angle: AutoSeriesAngle;
  format: PostFormat;
  status: SeriesHistoryStatus;
  /** status='published'일 때만 */
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  /** status !== 'published'일 때만 — error reason 또는 hygiene reasons join */
  reason?: string;
  at: Date;
}
