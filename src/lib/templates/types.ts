import type { Category, SectionType } from "@/types/page";

export interface SectionHint {
  /** 섹션 식별자 */
  type: SectionType;
  /** 섹션 헤더에 표시될 라벨 (편집기/공개 페이지 공통) */
  label: string;
  /** LLM 프롬프트에 주입되는 업종 맞춤 지침 */
  promptHint: string;
}

export interface CategoryTemplate {
  category: Category;
  displayName: string;
  /** 업종 전반 톤/브랜딩 지침 — 공통 system instruction에 주입 */
  toneGuidelines: string[];
  /**
   * 렌더 순서. hygiene은 UserProfile.isCheonggwangPartner === true일 때만 렌더.
   * 배열에 hygiene이 있어도 파트너가 아니면 promo 렌더러가 자동 skip.
   */
  renderOrder: SectionType[];
  sections: Record<Exclude<SectionType, "location" | "hygiene">, SectionHint> & {
    hygiene: SectionHint;
    location: SectionHint;
  };
}
