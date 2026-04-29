import type { Firestore } from "firebase-admin/firestore";
import { TIPS_TOPIC_POOL, type PickNextTopicArgs } from "./topic-pool";
import type { TipTopic } from "./tips-generator";

/**
 * v1.18 cycle #31 tips-admin-config · §3.3 functions side mirror (C2·NEW-R24·H3 결의).
 *
 * H3 결의 — functions package는 @/ alias 없음 → relative imports만.
 *
 * ⚠️ MIRROR with src/lib/tips/dynamic-topic-pool.ts.
 *    CI lint: scripts/check-queue-mirror.mjs (fetchActiveTopicPool + pickNextTopicFromPool 양 패키지).
 */

export async function fetchActiveTopicPool(db: Firestore): Promise<TipTopic[]> {
  const snap = await db
    .collection("tipsTopicPool")
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .limit(50)
    .get();

  if (snap.empty) {
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
 * cycle #30 pickNextTopic 동일 알고리즘 + pool 인자 (C2 결의).
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
