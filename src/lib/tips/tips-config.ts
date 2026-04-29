import { z } from "zod";

/**
 * v1.18 cycle #31 tips-admin-config · §3.1
 *
 * Pure types + zod schema. NOT server-only (C5 결의) — tsx test 가능 위해 외부 의존성 0.
 * Firestore Timestamp는 repo (`tips-config-repository.ts`)에서 Date로 변환 (C4 결의).
 *
 * ⚠️ MIRROR with functions/src/tips/lib/tips-config.ts — TipsTickStatus literal은
 *    `tips-history.ts` mirror도 동일하게 보존 (C3 결의 — CI lint 검증).
 */

// ───────────────── Auto Config (S2) ─────────────────

export interface TipsAutoConfig {
  enabled: boolean;
  /** Firestore Timestamp → Date 변환 (R12 fallback 시 new Date(0)) */
  updatedAt: Date;
  /** C1·M2 결의 — 단일 admin session, uid 추적 X */
  updatedBy: "admin";
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
 * C3 결의 — 6개 status literal 모두 양 패키지 (Next.js + functions) 보존 강제.
 * scripts/check-queue-mirror.mjs 마지막 check가 양쪽 모두에서 매칭 검증.
 */
export type TipsTickStatus =
  | "published-draft"
  | "skip-disabled"
  | "skip-already-today"
  | "skip-no-topic"
  | "compose-fail"
  | "hygiene-fail";

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

// ───────────────── Defaults (R12 fallback) ─────────────────

export const DEFAULT_TIPS_AUTO_CONFIG: TipsAutoConfig = {
  enabled: true,
  updatedAt: new Date(0),
  updatedBy: "admin",
};
