import type { TipTopic } from "@/lib/tips/prompt";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.5
 *
 * 30개 시드 토픽 — 라운드 로빈 + RAG anti-drift + 시즌 필터.
 * cycle #31+ admin 동적 편집(Firestore 마이그레이션) 검토 (OQ1).
 *
 * ⚠️ MIRROR of functions/src/tips/lib/topic-pool.ts — keep in sync.
 *    CI lint: scripts/check-queue-mirror.mjs (TIPS_TOPIC_POOL 양 패키지 동일 export).
 */
export const TIPS_TOPIC_POOL: TipTopic[] = [
  // 욕실 (4)
  {
    id: "bathroom-mold",
    label: "욕실 곰팡이 제거 — 셀프 vs 전문가",
    category: "bathroom",
    season: "summer",
    intent: "comparison",
  },
  {
    id: "bathroom-tile-cleaning",
    label: "욕실 타일 줄눈 청소 노하우",
    category: "bathroom",
    intent: "howto",
  },
  {
    id: "bathroom-drain",
    label: "하수구 막힘 해결 5가지 방법",
    category: "bathroom",
    intent: "howto",
  },
  {
    id: "bathroom-chrome",
    label: "수도꼭지 물때 깨끗이 닦는 법",
    category: "bathroom",
    intent: "howto",
  },
  // 주방 (5)
  {
    id: "kitchen-hood",
    label: "주방 후드 기름때 닦기",
    category: "kitchen",
    intent: "howto",
  },
  {
    id: "kitchen-fridge",
    label: "냉장고 청소 주기와 방법",
    category: "kitchen",
    intent: "guide",
  },
  {
    id: "kitchen-microwave",
    label: "전자레인지 안쪽 깨끗하게",
    category: "kitchen",
    intent: "howto",
  },
  {
    id: "kitchen-sink",
    label: "싱크대 배수구 냄새 잡는 법",
    category: "kitchen",
    intent: "qa",
  },
  {
    id: "kitchen-baking-soda",
    label: "베이킹소다·식초 청소 활용 가이드",
    category: "kitchen",
    intent: "guide",
    photoless: true,
  },
  // 에어컨 (4)
  {
    id: "aircon-disassembly",
    label: "에어컨 분해 청소 — 자주 묻는 질문",
    category: "aircon",
    season: "spring",
    intent: "qa",
  },
  {
    id: "aircon-cost",
    label: "에어컨 청소 비용은 얼마일까?",
    category: "aircon",
    intent: "qa",
  },
  {
    id: "aircon-filter",
    label: "에어컨 필터 셀프 청소 방법",
    category: "aircon",
    intent: "howto",
  },
  {
    id: "aircon-when",
    label: "에어컨 청소 언제 해야 할까?",
    category: "aircon",
    intent: "qa",
  },
  // 거실 (5)
  {
    id: "living-pet-hair",
    label: "반려동물 털 — 빠르게 제거하는 5가지",
    category: "living",
    intent: "howto",
  },
  {
    id: "living-floor",
    label: "마룻바닥 흠집 없이 청소하는 법",
    category: "living",
    intent: "howto",
  },
  {
    id: "living-dust",
    label: "먼지 자주 쌓이는 곳 핵심 관리",
    category: "living",
    intent: "checklist",
    photoless: true,
  },
  {
    id: "living-curtain",
    label: "커튼 세탁 주기와 셀프 관리",
    category: "living",
    intent: "guide",
  },
  {
    id: "living-sofa",
    label: "패브릭 소파 얼룩 제거",
    category: "living",
    intent: "howto",
  },
  // 이사 (4)
  {
    id: "move-checklist",
    label: "이사 청소 체크리스트 — 빠뜨리지 말 것",
    category: "move",
    intent: "checklist",
    photoless: true,
  },
  {
    id: "move-in-out",
    label: "입주 청소 vs 이사 청소 차이",
    category: "move",
    intent: "comparison",
  },
  {
    id: "move-cost",
    label: "이사 청소 평수별 비용 가이드",
    category: "move",
    intent: "guide",
  },
  {
    id: "move-self",
    label: "셀프 이사 청소 — 가능한 부분과 한계",
    category: "move",
    intent: "comparison",
    photoless: true,
  },
  // 일반 (8)
  {
    id: "general-spring-cleaning",
    label: "봄 대청소 — 어디부터 시작할까",
    category: "general",
    season: "spring",
    intent: "guide",
  },
  {
    id: "general-summer",
    label: "여름철 곰팡이·습기 관리",
    category: "general",
    season: "summer",
    intent: "guide",
  },
  {
    id: "general-fall",
    label: "환절기 침구 관리법",
    category: "general",
    season: "fall",
    intent: "howto",
  },
  {
    id: "general-winter",
    label: "겨울 대청소 — 연말 마무리 청소",
    category: "general",
    season: "winter",
    intent: "guide",
  },
  {
    id: "general-frequency",
    label: "공간별 청소 주기 — 주간·월간 추천",
    category: "general",
    intent: "checklist",
    photoless: true,
  },
  {
    id: "general-tools",
    label: "청소 도구 추천 — 가성비 best",
    category: "general",
    intent: "comparison",
  },
  {
    id: "general-eco",
    label: "친환경 청소 가이드 — 화학약품 없이",
    category: "general",
    intent: "guide",
  },
  {
    id: "general-pro",
    label: "전문가 청소 의뢰 vs 셀프 — 언제 어떤 선택?",
    category: "general",
    intent: "comparison",
  },
];

export interface PickNextTopicArgs {
  recentTitles: string[];
  seasonNow?: TipTopic["season"];
}

/**
 * pickNextTopic — 라운드 로빈 + 시즌 필터 + RAG anti-drift.
 *
 *  1) 시즌 필터 (season 미지정 또는 현재 시즌만 통과)
 *  2) recentTitles에 label이 등장하지 않는 후보만 통과
 *  3) 후보 0개면 시즌 필터 해제 후 recent 회피만 적용 (1년 cycle 보장)
 *  4) 남은 pool에서 랜덤 1개 선택
 *  5) pool 완전 소진 시 null 반환 → runner는 console.warn + skip
 */
export function pickNextTopic(args: PickNextTopicArgs): TipTopic | null {
  const { recentTitles, seasonNow } = args;
  const recentSet = new Set(recentTitles);

  const seasonal = TIPS_TOPIC_POOL.filter(
    (t) => !t.season || t.season === seasonNow,
  );

  const candidates = seasonal.filter((t) => !recentSet.has(t.label));

  const pool = candidates.length > 0
    ? candidates
    : TIPS_TOPIC_POOL.filter((t) => !recentSet.has(t.label));

  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
