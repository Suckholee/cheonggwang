import type { CategoryTemplate } from "./types";

export const cafeTemplate: CategoryTemplate = {
  category: "cafe",
  displayName: "카페",
  toneGuidelines: [
    "원두·시그니처 음료·공간 분위기를 중심으로 섬세하게 묘사",
    "머무는 시간(책 읽기·작업·대화)의 가치를 암시",
    "인스타그래머블한 비주얼 요소가 있으면 자연스럽게 언급",
  ],
  renderOrder: ["hero", "intro", "highlights", "hygiene", "location", "cta"],
  sections: {
    hero: {
      type: "hero",
      label: "대표",
      promptHint:
        "카페의 정체성·공간감을 담은 30자 이내 타이틀 + 60자 이내 서브타이틀.",
    },
    intro: {
      type: "intro",
      label: "소개",
      promptHint:
        "원두 철학, 대표 음료, 공간 컨셉을 180자 이내 한 문단으로 담담하게 소개하세요.",
    },
    highlights: {
      type: "highlights",
      label: "시그니처",
      promptHint:
        "시그니처 메뉴·공간 특징 3가지를 각 40자 이내로 제시.",
    },
    hygiene: {
      type: "hygiene",
      label: "위생 안심",
      promptHint:
        "매장·주방 청결 관리 140자 이내. '청광 파트너' 표현 1회 포함.",
    },
    location: {
      type: "location",
      label: "위치",
      promptHint: "LLM 생성 대상 아님.",
    },
    cta: {
      type: "cta",
      label: "방문",
      promptHint: "방문·예약 유도 10자 이내 버튼 라벨(예: '지금 방문하기').",
    },
  },
};
