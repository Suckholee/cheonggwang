import type { CategoryTemplate } from "./types";

export const salonTemplate: CategoryTemplate = {
  category: "salon",
  displayName: "미용실",
  toneGuidelines: [
    "시술 전문성·디자이너 감각·맞춤 스타일링을 중심으로 묘사",
    "고객이 얻게 될 변화·자신감을 암시하는 문장을 선호",
    "구체적 할인율·이벤트 가격은 언급하지 말 것(업체가 직접 입력하는 CTA와 혼동 방지)",
  ],
  renderOrder: ["hero", "intro", "highlights", "hygiene", "location", "cta"],
  sections: {
    hero: {
      type: "hero",
      label: "대표",
      promptHint:
        "상호와 디자인 컨셉을 결합해 30자 이내 타이틀 + 60자 이내 서브타이틀. 스타일에 대한 자신감을 담으세요.",
    },
    intro: {
      type: "intro",
      label: "소개",
      promptHint:
        "디자이너의 철학·주력 스타일링·매장 분위기를 180자 이내 한 문단으로 소개하세요.",
    },
    highlights: {
      type: "highlights",
      label: "전문 시술",
      promptHint:
        "대표 시술 또는 차별점 3가지를 각 40자 이내로 제시(예: '맞춤 컬러 컨설팅').",
    },
    hygiene: {
      type: "hygiene",
      label: "위생 안심",
      promptHint:
        "기구 소독·매장 청결을 강조하는 140자 이내 문단. '청광 파트너' 표현 1회 포함.",
    },
    location: {
      type: "location",
      label: "위치",
      promptHint: "LLM 생성 대상 아님.",
    },
    cta: {
      type: "cta",
      label: "예약",
      promptHint: "예약 유도 10자 이내 버튼 라벨(예: '예약 문의', '시술 예약').",
    },
  },
};
