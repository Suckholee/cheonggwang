import "server-only";
import { cache } from "react";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { toPost } from "./post-repository"; // NEW-C6 — toPost export 추가
import { firstDayOfMonthKst } from "@/lib/tips/today-kst";
import type { Post } from "@/types/post";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.13
 *
 * tip 전용 repository — listRecentTipTitles + listDrafts + getTipMonthlyStats.
 * Option A 코드 복제 패턴 — Next.js admin manual + functions cron 분리 (NEW-L7).
 */

const col = () => adminDb.collection("posts");

export interface TipMonthlyStats {
  generated: number;
  drafted: number;
  published: number;
  failureRate: number;
}

export const tipRepository = {
  async listRecentTipTitles(limit = 20): Promise<string[]> {
    const snap = await col()
      .where("postType", "==", "tip")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => (d.data().title as string) ?? "");
  },

  async listDrafts(limit = 20): Promise<Post[]> {
    const snap = await col()
      .where("postType", "==", "tip")
      .where("publishStatus", "==", "draft")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPost(d.id, d.data()));
  },

  /**
   * 월간 통계 — 이번 달(KST) 기준 generated / drafted (전체) / published.
   * cycle #31+ tipsHistory subcollection 도입 시 failureRate 별도 계산.
   */
  getTipMonthlyStats: cache(async (): Promise<TipMonthlyStats> => {
    const monthStart = Timestamp.fromDate(firstDayOfMonthKst());
    const [generatedSnap, draftedSnap, publishedSnap] = await Promise.all([
      col()
        .where("postType", "==", "tip")
        .where("createdAt", ">=", monthStart)
        .count()
        .get(),
      col()
        .where("postType", "==", "tip")
        .where("publishStatus", "==", "draft")
        .count()
        .get(),
      col()
        .where("postType", "==", "tip")
        .where("publishStatus", "==", "published")
        .where("createdAt", ">=", monthStart)
        .count()
        .get(),
    ]);
    return {
      generated: generatedSnap.data().count,
      drafted: draftedSnap.data().count,
      published: publishedSnap.data().count,
      failureRate: 0, // cycle #31+ tipsHistory subcollection 도입 시 별도 계산
    };
  }),
};
