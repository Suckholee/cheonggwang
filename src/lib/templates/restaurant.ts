import type { CategoryTemplate } from "./types";

export const restaurantTemplate: CategoryTemplate = {
  category: "restaurant",
  displayName: "음식점",
  toneGuidelines: [
    "맛과 분위기, 대표 메뉴를 중심으로 식욕을 자극하는 묘사",
    "방문 동기(데이트·가족모임·회식·혼밥 등)를 1~2개 자연스럽게 암시",
    "가격·원산지 등 사실 확인이 필요한 수치는 단정하지 말 것",
  ],
  renderOrder: ["hero", "intro", "highlights", "hygiene", "location", "cta"],
  sections: {
    hero: {
      type: "hero",
      label: "대표",
      promptHint:
        "상호와 업종 정체성을 결합해 30자 이내의 강렬한 타이틀과 60자 이내의 방문 유혹 서브타이틀을 작성하세요.",
    },
    intro: {
      type: "intro",
      label: "소개",
      promptHint:
        "매장의 컨셉·추구하는 맛·분위기를 한 문단(180자 이내)으로 담백하게 소개하세요.",
    },
    highlights: {
      type: "highlights",
      label: "특징",
      promptHint:
        "대표 메뉴 또는 차별점 3가지를 각 40자 이내 짧은 문장(명사 마침 허용)으로 제시하세요.",
    },
    hygiene: {
      type: "hygiene",
      label: "위생 안심",
      promptHint:
        "주방·홀 청결 관리를 강조하는 140자 이내 문단. '청광 파트너' 표현 1회 포함, 과장 금지.",
    },
    location: {
      type: "location",
      label: "위치",
      promptHint: "LLM 생성 대상 아님 (주소로부터 자동 조립).",
    },
    cta: {
      type: "cta",
      label: "방문·예약",
      promptHint:
        "방문 또는 예약을 유도하는 10자 이내 버튼 라벨(예: '예약하기', '지금 방문하기').",
    },
  },
};
