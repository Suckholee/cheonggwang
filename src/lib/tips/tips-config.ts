import { z } from "zod";

/**
 * v1.18 cycle #31 tips-admin-config · §3.1
 * v1.19 cycle #32 tips-schedule-editor · §3.1 — schedule 필드 + DEFAULT_SCHEDULE
 *   + skip-out-of-schedule status + TipsScheduleAuditEvent (R-M4: 별도 파일 X)
 *
 * Pure types + zod schema. NOT server-only (C5 결의) — tsx test 가능 위해 외부 의존성 0.
 * Firestore Timestamp는 repo (`tips-config-repository.ts`)에서 Date로 변환 (C4 결의).
 *
 * ⚠️ MIRROR with functions/src/tips/lib/tips-config.ts — TipsTickStatus literal은
 *    `tips-history.ts` mirror도 동일하게 보존 (C3 결의 — CI lint 검증).
 *    TipsScheduleAuditEvent는 Next.js 단독 (R-M4 — functions 미사용).
 */

// ───────────────── Schedule (cycle #32 §3.1) ─────────────────

export interface TipsScheduleConfig {
  /** 0..23 (KST) */
  hour: number;
  /** ⊂ {0,1,2,3,4,5,6} (Date.getDay), sorted, unique. 최소 1개. */
  daysOfWeek: number[];
}

export const DEFAULT_SCHEDULE: TipsScheduleConfig = {
  hour: 9,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 매일 09:30 KST (R12 fallback)
};

/**
 * daysOfWeek dedupe + ascending sort — 단일 진실 함수.
 * `setSchedule` 저장 시 + `parseScheduleOrDefault` 읽기 시 + functions mirror에서
 *   동일하게 적용되어 audit before/after 비교 stable 보장.
 */
export function normalizeDaysOfWeek(dows: number[]): number[] {
  return [...new Set(dows)].sort((a, b) => a - b);
}

export const tipsScheduleSchema = z.object({
  hour: z.number().int().min(0).max(23),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "최소 1개 요일 선택")
    .max(7),
});

export type TipsScheduleInput = z.infer<typeof tipsScheduleSchema>;

// ───────────────── Auto Config (S2) ─────────────────

export interface TipsAutoConfig {
  enabled: boolean;
  /** Firestore Timestamp → Date 변환 (R12 fallback 시 new Date(0)) */
  updatedAt: Date;
  /** C1·M2 결의 — 단일 admin session, uid 추적 X */
  updatedBy: "admin";
  /** cycle #32 — schedule R12 sub-fallback (parseScheduleOrDefault) */
  schedule: TipsScheduleConfig;
}

// ───────────────── Topic Pool (S4 + S5) ─────────────────

export const TIPS_TOPIC_CATEGORIES = [
  "bathroom",
  "kitchen",
  "aircon",
  "living",
  "move",
  "general",
] as const;
export type TipsTopicCategory = (typeof TIPS_TOPIC_CATEGORIES)[number];

export const TIPS_TOPIC_SEASONS = [
  "spring",
  "summer",
  "fall",
  "winter",
] as const;
export type TipsTopicSeason = (typeof TIPS_TOPIC_SEASONS)[number];

export const TIPS_TOPIC_INTENTS = [
  "howto",
  "guide",
  "checklist",
  "comparison",
  "qa",
] as const;
export type TipsTopicIntent = (typeof TIPS_TOPIC_INTENTS)[number];

export interface TipsTopicDoc {
  /** L1 결의 — Firestore doc id (snap.id) — derived, not stored */
  id: string;
  label: string;
  category: TipsTopicCategory;
  season: TipsTopicSeason | null;
  intent: TipsTopicIntent | null;
  photoless: boolean;
  isActive: boolean;
  /** L3 결의 — Date.now() + Math.random() jitter */
  order: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: "admin";
}

export const tipsTopicSchema = z.object({
  label: z.string().min(5).max(120),
  category: z.enum(TIPS_TOPIC_CATEGORIES),
  season: z.enum(TIPS_TOPIC_SEASONS).nullable().optional(),
  intent: z.enum(TIPS_TOPIC_INTENTS).nullable().optional(),
  photoless: z.boolean().default(false),
});

export type TipsTopicInput = z.infer<typeof tipsTopicSchema>;

// ───────────────── History (S8) ─────────────────

/**
 * C3 결의 — 7개 status literal 모두 양 패키지 (Next.js + functions) 보존 강제.
 *   cycle #31: 6 literal. cycle #32 추가: skip-out-of-schedule (wide cron 24/일 발화 중
 *   gate 미통과 tick).
 * scripts/check-queue-mirror.mjs check #16이 양쪽 모두에서 7 literal 매칭 검증.
 */
export type TipsTickStatus =
  | "published-draft"
  | "skip-disabled"
  | "skip-already-today"
  | "skip-no-topic"
  | "compose-fail"
  | "hygiene-fail"
  | "skip-out-of-schedule";

export interface TipsTickEvent {
  id: string;
  at: Date;
  status: TipsTickStatus;
  topicId?: string;
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  reason?: string;
}

// ───────────────── Schedule Audit (cycle #32 §3.1.2) ─────────────────

/**
 * R-M4 — schedule audit Event는 본 파일에 정의 (별도 audit 모듈 X).
 *   Next.js 단독 — functions runner는 audit collection 미사용.
 */
export interface TipsScheduleAuditEvent {
  id: string;
  at: Date;
  kind: "schedule-update";
  /** 첫 변경 시 null (M6 cycle #31 결의 — fallback 검출 시) */
  before: TipsScheduleConfig | null;
  after: TipsScheduleConfig;
  by: "admin";
}

// ───────────────── Defaults (R12 fallback) ─────────────────

export const DEFAULT_TIPS_AUTO_CONFIG: TipsAutoConfig = {
  enabled: true,
  updatedAt: new Date(0),
  updatedBy: "admin",
  schedule: DEFAULT_SCHEDULE,
};
