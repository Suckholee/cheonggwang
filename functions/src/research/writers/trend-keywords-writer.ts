import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Category } from "../types/shared";
import type { CategoryInsight } from "../types/insight";

/**
 * §9.4 write-isolation: 파이프라인 전용 쓰기. promo-page는 read-only.
 * 기존 문서를 완전 덮어쓰기 (merge: false) — 매주 새 TOP30으로 교체.
 */
export async function writeTrendKeywords(
  db: Firestore,
  category: Category,
  insight: CategoryInsight,
  weekKey: string
): Promise<void> {
  const keywords = insight.topKeywords.slice(0, 30).map((k) => k.term);
  await db
    .collection("trendKeywords")
    .doc(category)
    .set(
      {
        keywords,
        updatedAt: FieldValue.serverTimestamp(),
        sourceWeek: weekKey,
      },
      { merge: false }
    );
}
