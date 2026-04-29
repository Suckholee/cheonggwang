import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { TIPS_TOPIC_POOL, type PickNextTopicArgs } from "./topic-pool";
import type { TipTopic } from "./prompt";

/**
 * v1.18 cycle #31 tips-admin-config · §3.3 (C2·NEW-R24 결의)
 *
 * Firestore tipsTopicPool 우선 + 빈 collection 시 static fallback.
 * cycle #30 topic-pool.ts:pickNextTopic 시그니처 미변경 보존 — 신규 함수 별도 작성 (C2 결의).
 *
 * R12 cycle #29 back-compat fallback 패턴 재사용.
 *
 * ⚠️ MIRROR with functions/src/tips/lib/dynamic-topic-pool.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (fetchActiveTopicPool + pickNextTopicFromPool 양 패키지).
 */

export async function fetchActiveTopicPool(): Promise<TipTopic[]> {
  const snap = await adminDb
    .collection("tipsTopicPool")
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .limit(50)
    .get();

  if (snap.empty) {
    // R12·NEW-R24 — fallback to cycle #30 static 30개
    return TIPS_TOPIC_POOL;
  }

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      label: data.label as string,
      category: data.category as TipTopic["category"],
      season: (data.season ?? undefined) as TipTopic["season"] | undefined,
      intent: (data.intent ?? undefined) as TipTopic["intent"] | undefined,
      photoless: data.photoless === true,
    };
  });
}

/**
 * cycle #30 pickNextTopic 동일 4-step 알고리즘 + pool 인자 (C2 결의 — cycle #30 함수 미변경).
 *  1) 시즌 필터
 *  2) recent 회피
 *  3) 후보 0이면 시즌 해제
 *  4) 빈 pool null
 */
export function pickNextTopicFromPool(
  pool: TipTopic[],
  args: PickNextTopicArgs,
): TipTopic | null {
  const { recentTitles, seasonNow } = args;
  const recentSet = new Set(recentTitles);

  const seasonal = pool.filter((t) => !t.season || t.season === seasonNow);
  const candidates = seasonal.filter((t) => !recentSet.has(t.label));

  const final =
    candidates.length > 0
      ? candidates
      : pool.filter((t) => !recentSet.has(t.label));

  if (final.length === 0) return null;
  return final[Math.floor(Math.random() * final.length)];
}
