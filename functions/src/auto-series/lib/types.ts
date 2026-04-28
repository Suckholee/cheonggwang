/**
 * v1.13 cycle #26 partner-auto-series · §1.5 Option A 복제.
 * cheonggwang Next.js Partner/Post types의 functions 측 minimal mirror.
 *
 * ⚠️ MIRROR — keep in sync with src/types/{partner,post,auto-series,partner-profile}.ts
 * Source last synced: cycle #26 commit (this PR)
 */

export type BrandTone = "friendly" | "professional" | "playful";
export type PartnerStatus = "invited" | "active" | "suspended";
export type PostFormat = "blog" | "card-news";
export type AutoSeriesAngle =
  | "usp"
  | "menu"
  | "review"
  | "event"
  | "story";

export interface AutoPublishConfig {
  enabled: boolean;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  timezone: "Asia/Seoul";
}

/**
 * v1.16 cycle #29 — publishMode (G1, R12 back-compat).
 * ⚠️ MIRROR of src/types/auto-series.ts — keep in sync.
 */
export type PublishMode = "auto" | "draft-only";

export interface PartnerAutoSeries {
  enabled: boolean;
  lastIndex: number;
  lastTickAt: Date | null;
  brandTone: BrandTone;
  totalPublished: number;
  totalFailed: number;
  /** v1.14 cycle #27 (C1) — photo round-robin cursor decoupled from lastIndex */
  photoCursor: number;
  /** v1.16 cycle #29 — 'auto' (cycle #28까지) | 'draft-only' (사장님 검토) */
  publishMode: PublishMode;
  /** v1.16 cycle #29 X2 확장 포인트 — cycle #30 audience targeting */
  targetAudience: string | null;
}

/**
 * v1.14 cycle #27 partner-series-queue — 사장님이 편집한 발행 큐.
 * undefined 또는 효과 큐 비어 있으면 ROTATION_POOL fallback (R2).
 */
export interface QueueItem {
  id: string;
  angle: AutoSeriesAngle;
  format: PostFormat;
  enabled: boolean;
}

export interface PriceItem {
  name: string;
  price: number;
}

export interface PartnerProfile {
  description?: string;
  usps?: string[];
  priceItems?: PriceItem[];
  photoUrls?: string[];
  photoAnalysisSummary?: string;
  industry?: string;
  status?: "auto-approved" | "approved" | "pending-review" | "rejected";
  suspended?: boolean;
}

export interface Partner {
  id: string;
  ownerUid: string;
  businessName: string;
  logoUrl: string | null;
  category: string | null;
  regionLabel: string | null;
  status: PartnerStatus;
  autoPublish: AutoPublishConfig;
  profile?: PartnerProfile;
  autoSeries?: PartnerAutoSeries;
  /** v1.14 cycle #27 partner-series-queue */
  autoSeriesQueue?: QueueItem[];
}

export interface ContentTemplate {
  id: string;
  type: PostFormat;
  industry: string;
  title: string;
  body: string;
  tags: string[];
  scenarios: string[];
}
