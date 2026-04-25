import "server-only";
import { adminDb } from "./admin";
import type { Category, TrendKeywords } from "@/types/page";

const COLLECTION = "trendKeywords";

/**
 * READ-ONLY. §9.4 쓰기 격리 원칙 — promo-page는 이 컬렉션에 쓰기 금지.
 * 쓰기는 content-research-pipeline만 수행.
 */
export const trendKeywordsRepository = {
  async get(category: Category): Promise<TrendKeywords | null> {
    const snap = await adminDb.collection(COLLECTION).doc(category).get();
    if (!snap.exists) return null;
    const d = snap.data()!;
    return {
      keywords: Array.isArray(d.keywords) ? (d.keywords as string[]) : [],
      updatedAt: d.updatedAt?.toDate?.() ?? new Date(0),
      sourceWeek: (d.sourceWeek as string) ?? "",
    };
  },

  /**
   * 파이프라인이 미운영 상태에서도 promo-page가 동작하도록 fallback 키워드 제공.
   */
  async getOrDefault(category: Category): Promise<string[]> {
    const record = await this.get(category);
    if (record && record.keywords.length > 0) return record.keywords;
    return DEFAULT_KEYWORDS[category];
  },
};

const DEFAULT_KEYWORDS: Record<Category, string[]> = {
  restaurant: [
    "맛집",
    "분위기 좋은",
    "단골",
    "가성비",
    "데이트",
    "회식",
    "혼밥",
    "모임",
    "주차 가능",
    "포장",
  ],
  salon: [
    "맞춤 스타일",
    "디자이너",
    "모발 케어",
    "트렌드 컷",
    "프라이빗",
    "1:1 상담",
    "염색",
    "펌",
    "가성비",
    "예약 전용",
  ],
  cafe: [
    "스페셜티",
    "원두",
    "시그니처 음료",
    "디저트",
    "공간",
    "작업하기 좋은",
    "조용한",
    "인스타",
    "브런치",
    "테라스",
  ],
};
