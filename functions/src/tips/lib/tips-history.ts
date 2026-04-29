import { FieldValue, type Firestore } from "firebase-admin/firestore";

/**
 * v1.18 cycle #31 tips-admin-config · §3.5 + §4.3 (NEW-R23 결의).
 *
 * tipsHistory append helper (functions side 전용 — Next.js은 read만).
 * NEW-R23 — 모든 runTipsTick 종료 path가 1건 append (skip/error/success 모두).
 *
 * ⚠️ C3 결의 — TipsTickStatus 6 literal은 양 패키지 (Next.js src/lib/tips/tips-config.ts +
 *              functions/src/tips/lib/tips-history.ts) 모두 보존 강제.
 *              CI lint: scripts/check-queue-mirror.mjs (마지막 check 6 literal 양쪽 검증).
 */

export type TipsTickStatus =
  | "published-draft"
  | "skip-disabled"
  | "skip-already-today"
  | "skip-no-topic"
  | "compose-fail"
  | "hygiene-fail";

export interface TipsTickEventInput {
  status: TipsTickStatus;
  topicId?: string;
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  reason?: string;
}

/**
 * tipsHistory collection에 단일 이벤트 append.
 * `at`은 serverTimestamp 자동 — read 측에서 Date 변환 (C4 결의).
 */
export async function appendTipsHistory(
  db: Firestore,
  event: TipsTickEventInput,
): Promise<void> {
  // undefined 필드 제거 — Firestore가 undefined를 거부
  const cleaned: Record<string, unknown> = {
    at: FieldValue.serverTimestamp(),
    status: event.status,
  };
  if (event.topicId !== undefined) cleaned.topicId = event.topicId;
  if (event.postId !== undefined) cleaned.postId = event.postId;
  if (event.postSlug !== undefined) cleaned.postSlug = event.postSlug;
  if (event.hygieneScore !== undefined) cleaned.hygieneScore = event.hygieneScore;
  if (event.reason !== undefined) cleaned.reason = event.reason;

  await db.collection("tipsHistory").add(cleaned);
}
