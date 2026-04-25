import { QUOTE_CATEGORY_LABELS } from "./quote-category";
import type { Provider } from "@/types/provider";
import type { WorkCase } from "@/types/work-case";
import type { ReviewView } from "@/types/review";
import type { BrandToneEnum } from "./promo-schemas";
import type { ProviderStoryCategory } from "@/types/post";

export interface PromoPromptContext {
  provider: Provider;
  workCases: WorkCase[]; // 최대 3
  latestReview: ReviewView | null;
  topicHint: string | null;
  trendKeywords: string[]; // QuoteCategory별 트렌드 키워드 (최대 30)
  storyCategory: ProviderStoryCategory;
}

const TONE_GUIDE: Record<BrandToneEnum, string> = {
  friendly: "친근한 반말체 · '함께 알아볼까요?' · '편하게 말씀해 주세요'",
  professional: "정중한 존댓말 · '말씀드리겠습니다' · 신뢰감 강조",
  playful: "유머 섞인 친근 · 가벼운 이모지 간헐 · '깜짝 놀랄' 표현 허용",
};

/**
 * v1.6 (post-merge): providers 패널 서브 카테고리별 시스템 지시.
 * 각 카테고리는 독자가 기대하는 글의 성격이 다르므로 톤·구조·길이 가이드를 분리.
 */
const CATEGORY_GUIDE: Record<
  ProviderStoryCategory,
  {
    label: string;
    audienceExpectation: string;
    structureHint: string;
    titleFormat: string;
    bannedAngles: string;
  }
> = {
  field: {
    label: "현장 이야기",
    audienceExpectation:
      "독자는 '진짜 현장이 어떤지' 궁금해한다. 박제된 정보가 아닌, 청명 1인칭 시점의 현장 체험기를 기대.",
    structureHint:
      "1. 구체적 현장 소개 (지역·평수·구성) — workCases 에 있는 것 중 1건을 골라 그대로 사용. 없으면 'provider.regions'의 한 동네를 가상 현장으로 사용하되 지어낸 상호/이름은 금지.\n" +
      "2. 작업 전 상태 묘사 (눈에 보이는 것만)\n" +
      "3. 실제 수행한 공정 3-5단계 (약품/도구명은 해당 업체가 실제 사용한다고 알려진 경우만)\n" +
      "4. 작업 후 눈에 띄게 달라진 점\n" +
      "5. 소회 1-2문장 (과장 없이)",
    titleFormat:
      "'[지역/평수/대상] ... 현장 일지' · '[상황] 를 만났습니다' · 숫자/수치 남발 금지",
    bannedAngles: "체크리스트/팁 형식 금지 — 이건 howto 카테고리 영역",
  },
  howto: {
    label: "청소 노하우",
    audienceExpectation:
      "독자는 '내가 따라할 수 있는 실전 팁'을 기대. 단, 추상적 일반론 말고 청명이 현장에서 겪으며 배운 구체 방법을 원함.",
    structureHint:
      "1. 문제 정의 1-2문장 (예: '욕실 타일 사이 곰팡이가 아무리 닦아도 다시 올라옵니다')\n" +
      "2. 많은 사람이 오해하는 점 (실패 사례 형식이면 좋음)\n" +
      "3. 실전 팁 3-5개 — 각 팁은 **어떻게 하는지** + **왜 그렇게 하는지** 2-3줄\n" +
      "4. 전문가에 맡겨야 할 때 (선을 명확히)",
    titleFormat:
      "'[문제/대상] ... 방법' · '[실패 사례] 에서 배운 N가지' · 과장된 숫자(한 번에 100% 등) 금지",
    bannedAngles: "현장 1인칭 서사 금지 — field 영역",
  },
  gear: {
    label: "도구·약품 리뷰",
    audienceExpectation:
      "독자는 '청명이 진짜로 써본 후기'를 기대. 카탈로그 요약이 아닌 사용 경험의 결.",
    structureHint:
      "1. 리뷰 대상 1-2개 (일반명사 OK · 상표명은 provider 데이터에 있으면 그 범위에서만)\n" +
      "2. 써본 기간/횟수 ('약 N회 · 최근 N개월')\n" +
      "3. 좋았던 점 (구체 시나리오 1개)\n" +
      "4. 아쉬운 점 (꾸미지 않고)\n" +
      "5. 어떤 현장에 맞고 어떤 데에 안 맞는지",
    titleFormat: "'[대상] ... N개월 쓴 솔직 후기' · 평점/별점 안 씀",
    bannedAngles: "판매 연결/제휴링크 · 상표명 남발",
  },
  life: {
    label: "청명 일상",
    audienceExpectation:
      "독자는 '사람 이야기'를 기대. 가볍게 읽히고 공감될 만한 짧은 에피소드.",
    structureHint:
      "1. 최근 있었던 작은 사건/대화 1개\n" +
      "2. 거기서 느낀 점 2-3문장\n" +
      "3. 청명이라는 직업에 대한 작은 애정 표현 (과하지 않게)",
    titleFormat:
      "'오늘 ...' · '[사람] 이야기' · 짧고 담백하게 · 회사 홍보성 제목 금지",
    bannedAngles: "업체 소개/서비스 나열 · 전문 지식 자랑",
  },
};

export function buildPromoPrompt(ctx: PromoPromptContext): {
  system: string;
  user: string;
} {
  const tone =
    (ctx.provider.brandTone as BrandToneEnum | undefined) ?? "friendly";
  const slogan = ctx.provider.slogan ?? "";
  const cat = CATEGORY_GUIDE[ctx.storyCategory];

  const system = `당신은 한국 로컬 청소 마켓플레이스 '청광'의 청명(청소 업체) 커뮤니티 작가입니다.
목표는 청명이 자기 현장의 이야기를 나누는 커뮤니티 포스트를 쓰는 것이지 영업/홍보가 아닙니다.

[이번 글의 카테고리 · ${cat.label}]
${cat.audienceExpectation}

[구조 가이드]
${cat.structureHint}

[제목 스타일]
${cat.titleFormat}

[이 카테고리에서 금지하는 앵글]
${cat.bannedAngles}

[사실성 원칙 · 반드시 준수]
1. **지어낸 수치·통계·연수 금지**. 예시: "효과 30%→100%", "수명 평균 2-3년 늘어남", "N년 노하우" — 이런 표현 쓰지 마세요.
2. **일반 상식 수치(끓는점·온도·pH 등 공인된 과학 사실)는 허용**. 단, 자신 없으면 아예 쓰지 마세요.
3. **특정 업체 정책(배상보험 N억, 공식 인증 등)은 \`provider.description\`이나 \`provider.slogan\`에 명시된 범위에서만** 언급. 없으면 언급 금지.
4. **workCases 에 없는 현장**을 "우리가 작업한 현장"처럼 서술하지 마세요.
5. **이름·상호는 새로 지어내지 마세요**. 고객은 "한 고객분"/"A 고객" 수준으로 익명화, 동료는 "옆 청명" 등 일반명사.
6. **타사 비방·비교·최저가·파격할인 같은 과장** 금지.
7. **결과 100% 보장** 금지. "대부분", "많은 경우" 등으로 완화.

[톤]
${tone}: ${TONE_GUIDE[tone]}

[Markdown 제한]
- 허용 태그: h2, h3, p, ul, ol, li, strong, em, a, br
- 이미지 태그 금지 (cover 이미지는 별도 처리)
- 외부 링크는 https:// 만

[길이 요구]
bodyMarkdown 은 한국어 **800-1200자** 사이. h2 섹션 2-3개 + 본문 단락. 불릿은 필요할 때만.

[출력 형식 (JSON)]
응답은 JSON 객체 하나만:
{
  "title": "제목 (20-50자, 위 스타일 가이드 준수)",
  "bodyMarkdown": "markdown 본문 (800-1200자)",
  "summary80": "피드 카드용 80자 내외 요약 (영업 멘트 금지)"
}`;

  const categoryLabels = ctx.provider.categories
    .map((c) => QUOTE_CATEGORY_LABELS[c])
    .join(", ");

  const regions = ctx.provider.regions
    .slice(0, 3)
    .map((r) => `${r.city} ${r.district}`)
    .join(", ");

  const priceBookText =
    ctx.provider.priceBook && ctx.provider.priceBook.length > 0
      ? ctx.provider.priceBook
          .slice(0, 3)
          .map(
            (p) =>
              `- ${QUOTE_CATEGORY_LABELS[p.category]} ${p.unitLabel} · ${Math.round(p.basePrice / 10000)}만원`,
          )
          .join("\n")
      : "등록된 단가 없음 (언급하지 마세요)";

  const workCasesText =
    ctx.workCases.length > 0
      ? ctx.workCases
          .map(
            (w, i) =>
              `[#${i + 1}] ${QUOTE_CATEGORY_LABELS[w.category]} · ${w.sizeLabel}${w.memo ? ` · 메모: "${w.memo}"` : ""}`,
          )
          .join("\n")
      : "등록된 작업 사례 없음 (field 카테고리인 경우 provider.regions 중 한 동네를 가상 배경으로 쓰되, 구체 현장을 지어내지 마세요)";

  const reviewText = ctx.latestReview?.text
    ? `인용 가능: "${ctx.latestReview.text.slice(0, 120)}" (${ctx.latestReview.rating}/5점)`
    : "리뷰 없음 (인용·각색 금지)";

  const trendKeywordsText =
    ctx.trendKeywords.length > 0
      ? ctx.trendKeywords.slice(0, 30).join(", ")
      : "없음";

  const user = `[청명 정보]
- 업체명: ${ctx.provider.companyName}
- 활동 지역: ${regions || "미지정"}
- 서비스 카테고리: ${categoryLabels}
- 소개 (이 범위에서만 업체 특징 인용 가능): ${ctx.provider.description ?? "없음"}
- 슬로건: ${slogan}

[대표 단가]
${priceBookText}

[작업 사례 · ${ctx.storyCategory === "field" ? "이 중 1건을 글의 배경으로 선택" : "참고만"}]
${workCasesText}

[최신 리뷰]
${reviewText}

[참고 트렌드 키워드 · 자연스럽게 1-2개만 녹여도 됨 · 억지 삽입 금지]
${trendKeywordsText}

[이번 글의 카테고리]
${cat.label} — ${cat.audienceExpectation}

[주제 힌트 (선택)]
${ctx.topicHint ?? "없음 (카테고리 특성에 맞게 자유롭게)"}

위 정보만을 근거로 블로그 포스트 1개를 작성하세요. 근거 없는 사실/수치/이름을 지어내지 마세요. JSON 으로만 응답하세요.`;

  return { system, user };
}
