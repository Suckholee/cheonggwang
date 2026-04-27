import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  SeriesHistoryEvent,
  SeriesHistoryStatus,
} from "@/types/auto-series";
import { isAutoSeriesAngle } from "@/domain/auto-series-angle";
import { isPostFormat } from "@/domain/post-format";

/**
 * v1.13 cycle #26 partner-auto-series · §1.1 #5.
 *
 * Next.js 측 seriesHistory read 전용 repository.
 * (write는 Cloud Functions Admin SDK 또는 server action 경유 — append-only)
 */

function tsToDate(t: Timestamp | undefined | null): Date {
  if (!t) return new Date(0);
  return t.toDate();
}

function toEvent(id: string, d: DocumentData): SeriesHistoryEvent | null {
  if (!isAutoSeriesAngle(d.angle)) return null;
  if (!isPostFormat(d.format)) return null;
  const status = d.status as SeriesHistoryStatus;
  if (
    status !== "published" &&
    status !== "hygiene-fail" &&
    status !== "error" &&
    status !== "photo-missing"
  ) {
    return null;
  }
  return {
    id,
    slotIndex: typeof d.slotIndex === "number" ? d.slotIndex : 0,
    angle: d.angle,
    format: d.format,
    status,
    postId: typeof d.postId === "string" ? d.postId : undefined,
    postSlug: typeof d.postSlug === "string" ? d.postSlug : undefined,
    hygieneScore:
      typeof d.hygieneScore === "number" ? d.hygieneScore : undefined,
    reason: typeof d.reason === "string" ? d.reason : undefined,
    at: tsToDate(d.at as Timestamp),
  };
}

export const autoSeriesRepository = {
  /**
   * 특정 partner의 최근 발행 이력. UI/admin 모두 사용.
   * 단일 인덱스 `(at desc)`로 충분 (sub-collection 단일 partition).
   */
  async listHistory(
    partnerId: string,
    limit = 20,
  ): Promise<SeriesHistoryEvent[]> {
    const snap = await adminDb
      .collection("partners")
      .doc(partnerId)
      .collection("seriesHistory")
      .orderBy("at", "desc")
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => toEvent(d.id, d.data()))
      .filter((e): e is SeriesHistoryEvent => e !== null);
  },

  /**
   * 24h 전체 통계 (모든 active partner의 seriesHistory를 collectionGroup query로).
   * /admin/auto-series 모니터링용.
   */
  async stats24h(): Promise<{
    total: number;
    published: number;
    hygieneFail: number;
    error: number;
    photoMissing: number;
    avgHygieneScore: number;
  }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const snap = await adminDb
      .collectionGroup("seriesHistory")
      .where("at", ">=", Timestamp.fromDate(since))
      .get();

    let total = 0;
    let published = 0;
    let hygieneFail = 0;
    let error = 0;
    let photoMissing = 0;
    const scores: number[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      total++;
      const status = data.status as SeriesHistoryStatus | undefined;
      if (status === "published") published++;
      else if (status === "hygiene-fail") hygieneFail++;
      else if (status === "error") error++;
      else if (status === "photo-missing") photoMissing++;
      if (typeof data.hygieneScore === "number") {
        scores.push(data.hygieneScore);
      }
    }

    const avgHygieneScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    return {
      total,
      published,
      hygieneFail,
      error,
      photoMissing,
      avgHygieneScore,
    };
  },
};
