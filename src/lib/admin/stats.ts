import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { partnerApplicantRepository } from "@/lib/firebase/partner-applicant-repository";

/**
 * v1.8 admin-console · §3.7 — admin 대시보드 통계 집계.
 *
 * H5 결의: KST 자정 계산은 host TZ 무관하게 정확히 변환.
 *  toLocaleString('en-CA', { timeZone:'Asia/Seoul' }) → 'YYYY-MM-DD' part 추출
 *  → ISO `${date}T00:00:00+09:00` → 절대 UTC Date로 변환.
 */

/** KST 자정 (오늘) → 절대 UTC Date. host TZ 무관. */
export function kstMidnightUtc(now: Date = new Date()): Date {
  const kstStr = now.toLocaleString("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA: 'YYYY-MM-DD' (단순 형식) — 일부 환경에서 ', ' 포함 가능
  const dateOnly = kstStr.split(",")[0].trim();
  return new Date(`${dateOnly}T00:00:00+09:00`);
}

export interface AdminStats {
  todayPartnerPromoPublished: number;
  avgHygiene30d: number | null;
  partnersByStatus: { invited: number; active: number; suspended: number };
  draftPartnerPromo: number;
  autoPublishedRatio72h: number | null;
  pendingApplicantsCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 오늘(KST 자정 이후) 발행된 partner-promo 건수. */
export async function countTodayPublishedPartnerPromo(): Promise<number> {
  try {
    const startUtc = kstMidnightUtc();
    const snap = await adminDb
      .collection("posts")
      .where("postType", "==", "partner-promo")
      .where("publishStatus", "==", "published")
      .where("publishedAt", ">=", Timestamp.fromDate(startUtc))
      .count()
      .get();
    return snap.data().count;
  } catch (e) {
    console.warn("[admin/stats.countTodayPublishedPartnerPromo] failed", e);
    return 0;
  }
}

/** 최근 30일 partner-promo 평균 hygiene score (generationMeta.hygieneScore). */
export async function avgHygieneScoreLast30d(): Promise<number | null> {
  try {
    const cutoff = new Date(Date.now() - 30 * DAY_MS);
    const snap = await adminDb
      .collection("posts")
      .where("postType", "==", "partner-promo")
      .where("createdAt", ">=", Timestamp.fromDate(cutoff))
      .limit(500)
      .get();
    let total = 0;
    let n = 0;
    for (const d of snap.docs) {
      const meta = d.data().generationMeta;
      if (meta && typeof meta.hygieneScore === "number") {
        total += meta.hygieneScore;
        n++;
      }
    }
    if (n === 0) return null;
    return total / n;
  } catch (e) {
    console.warn("[admin/stats.avgHygieneScoreLast30d] failed", e);
    return null;
  }
}

/** partners 컬렉션 status별 카운트. */
export async function partnersByStatusCount(): Promise<
  AdminStats["partnersByStatus"]
> {
  try {
    const [invited, active, suspended] = await Promise.all([
      adminDb.collection("partners").where("status", "==", "invited").count().get(),
      adminDb.collection("partners").where("status", "==", "active").count().get(),
      adminDb
        .collection("partners")
        .where("status", "==", "suspended")
        .count()
        .get(),
    ]);
    return {
      invited: invited.data().count,
      active: active.data().count,
      suspended: suspended.data().count,
    };
  } catch (e) {
    console.warn("[admin/stats.partnersByStatusCount] failed", e);
    return { invited: 0, active: 0, suspended: 0 };
  }
}

/** 비공개(draft) partner-promo 건수. */
export async function draftPartnerPromoCount(): Promise<number> {
  try {
    const snap = await adminDb
      .collection("posts")
      .where("postType", "==", "partner-promo")
      .where("publishStatus", "==", "draft")
      .count()
      .get();
    return snap.data().count;
  } catch (e) {
    console.warn("[admin/stats.draftPartnerPromoCount] failed", e);
    return 0;
  }
}

/**
 * 최근 72h 내 partner-promo published 중 auto-published 비율.
 * partners/{id}/events에서 type='auto-published' 카운트 / 전체 발행 카운트.
 */
export async function autoPublishedRatioLast72h(): Promise<number | null> {
  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const cutoffTs = Timestamp.fromDate(cutoff);

    // 전체 partner-promo published 72h
    const totalSnap = await adminDb
      .collection("posts")
      .where("postType", "==", "partner-promo")
      .where("publishStatus", "==", "published")
      .where("publishedAt", ">=", cutoffTs)
      .count()
      .get();
    const total = totalSnap.data().count;
    if (total === 0) return null;

    // auto-published 이벤트 카운트 — collectionGroup query
    const autoSnap = await adminDb
      .collectionGroup("events")
      .where("type", "==", "auto-published")
      .where("decidedAt", ">=", cutoffTs)
      .count()
      .get();
    const auto = autoSnap.data().count;

    return Math.min(1, auto / total);
  } catch (e) {
    console.warn("[admin/stats.autoPublishedRatioLast72h] failed", e);
    return null;
  }
}

/** 모든 위젯 한 번에 — Promise.all 병렬. */
export async function loadAdminStats(): Promise<AdminStats> {
  const [today, avgHygiene, byStatus, draftCount, autoRatio, pendingApplicants] =
    await Promise.all([
      countTodayPublishedPartnerPromo(),
      avgHygieneScoreLast30d(),
      partnersByStatusCount(),
      draftPartnerPromoCount(),
      autoPublishedRatioLast72h(),
      partnerApplicantRepository.pendingCount(),
    ]);
  return {
    todayPartnerPromoPublished: today,
    avgHygiene30d: avgHygiene,
    partnersByStatus: byStatus,
    draftPartnerPromo: draftCount,
    autoPublishedRatio72h: autoRatio,
    pendingApplicantsCount: pendingApplicants,
  };
}
