/**
 * v1.6 (post-merge) — provider 포스트 전수 재생성.
 *
 * 기존 4개 포스트를 새 promo-prompt (카테고리별 + anti-hallucination) 로 재생성.
 * slug 는 유지 (SEO 보존). postType=provider + storyCategory 부여.
 *
 * 사용:
 *   # dry-run (프롬프트만 출력, Gemini 호출 안 함)
 *   node --env-file=.env.local scripts/regenerate-provider-posts.mjs
 *   # 실제 실행
 *   node --env-file=.env.local scripts/regenerate-provider-posts.mjs --apply
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const APPLY = process.argv.includes("--apply");

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY not set");
  process.exit(1);
}
const MODEL = process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-2.5-flash";

const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();
const genAI = new GoogleGenerativeAI(apiKey);

// ─── 카테고리 매핑 (운영 판단) ────────────────────────────
// field:  현장 에피소드  | howto: 실전 노하우 | gear: 도구/약품 리뷰 | life: 청명 일상
const REGENERATION_MAP = {
  "5wZLUo1WyCYi5fnc7W6b": {
    // 에어컨 분해 청소 노하우
    storyCategory: "howto",
    topicHint: "에어컨 분해 청소가 필요한 신호와 주의할 점",
  },
  gMfBbQzDqm0MSJbYz9rT: {
    // 입주청소 체크리스트
    storyCategory: "howto",
    topicHint: "입주청소 전 청명이 실제로 점검하는 포인트",
  },
  gphqAZWTrGkenWcucKSI: {
    // 단골 고객 이야기
    storyCategory: "life",
    topicHint: "단골이 되는 고객과 청명 사이의 소소한 순간",
  },
  tK7uVZ8qzzIFKYrGNVXo: {
    // 용산성동연수 입주청소 (새봄홈 현장)
    storyCategory: "field",
    topicHint: "최근 현장 중 기억에 남는 입주청소 한 건",
  },
};

const QUOTE_CATEGORY_LABELS = {
  "move-in": "입주청소",
  office: "사무실청소",
  aircon: "에어컨청소",
  "move-out": "이사청소",
  special: "특수청소",
  regular: "정기청소",
};

const TONE_GUIDE = {
  friendly: "친근한 반말체 · '함께 알아볼까요?' · '편하게 말씀해 주세요'",
  professional: "정중한 존댓말 · '말씀드리겠습니다' · 신뢰감 강조",
  playful: "유머 섞인 친근 · 가벼운 이모지 간헐 · '깜짝 놀랄' 표현 허용",
};

const CATEGORY_GUIDE = {
  field: {
    label: "현장 이야기",
    audienceExpectation:
      "독자는 '진짜 현장이 어떤지' 궁금해한다. 박제된 정보가 아닌, 청명 1인칭 시점의 현장 체험기를 기대.",
    structureHint:
      "1. 구체적 현장 소개 (지역·평수·구성) — workCases 에 있는 것 중 1건을 골라 그대로 사용.\n2. 작업 전 상태 묘사\n3. 실제 수행한 공정 3-5단계\n4. 작업 후 눈에 띄게 달라진 점\n5. 소회 1-2문장",
    titleFormat: "'[지역/평수/대상] 현장 일지' · '[상황] 를 만났습니다'",
    bannedAngles: "체크리스트/팁 형식 금지",
  },
  howto: {
    label: "청소 노하우",
    audienceExpectation:
      "독자는 '내가 따라할 수 있는 실전 팁'을 기대. 단, 추상적 일반론 말고 청명이 현장에서 겪으며 배운 구체 방법을 원함.",
    structureHint:
      "1. 문제 정의 1-2문장\n2. 많은 사람이 오해하는 점 (실패 사례)\n3. 실전 팁 3-5개 — 각 팁은 어떻게+왜 2-3줄\n4. 전문가에 맡겨야 할 때",
    titleFormat: "'[문제/대상] 방법' · '[실패 사례] 에서 배운 N가지'",
    bannedAngles: "현장 1인칭 서사 금지",
  },
  gear: {
    label: "도구·약품 리뷰",
    audienceExpectation:
      "독자는 '청명이 진짜로 써본 후기'를 기대. 카탈로그 요약이 아닌 사용 경험의 결.",
    structureHint:
      "1. 리뷰 대상 1-2개\n2. 써본 기간/횟수\n3. 좋았던 점 (구체 시나리오 1개)\n4. 아쉬운 점\n5. 어떤 현장에 맞고 어떤 데에 안 맞는지",
    titleFormat: "'[대상] N개월 쓴 솔직 후기'",
    bannedAngles: "판매 연결/제휴링크 · 상표명 남발",
  },
  life: {
    label: "청명 일상",
    audienceExpectation:
      "독자는 '사람 이야기'를 기대. 가볍게 읽히고 공감될 만한 짧은 에피소드.",
    structureHint:
      "1. 최근 있었던 작은 사건/대화 1개\n2. 거기서 느낀 점 2-3문장\n3. 청명이라는 직업에 대한 작은 애정 표현",
    titleFormat: "'오늘 ...' · '[사람] 이야기'",
    bannedAngles: "업체 소개/서비스 나열 · 전문 지식 자랑",
  },
};

function buildSystemPrompt(tone, storyCategory) {
  const cat = CATEGORY_GUIDE[storyCategory];
  return `당신은 한국 로컬 청소 마켓플레이스 '청광'의 청명(청소 업체) 커뮤니티 작가입니다.
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
1. 지어낸 수치·통계·연수 금지. "효과 30%→100%", "수명 2-3년", "N년 노하우" 같은 표현 쓰지 마세요.
2. 일반 상식 수치(끓는점·pH 등)는 허용. 자신 없으면 아예 쓰지 마세요.
3. 특정 업체 정책(배상보험 N억, 공식 인증 등)은 provider.description이나 slogan에 명시된 범위에서만 언급.
4. workCases에 없는 현장을 "우리가 작업한 현장"처럼 서술하지 마세요.
5. 이름·상호는 새로 지어내지 마세요. 고객은 "한 고객분", 동료는 "옆 청명" 등 일반명사.
6. 타사 비방·비교·최저가·파격할인 같은 과장 금지.
7. 결과 100% 보장 금지. "대부분", "많은 경우" 등으로 완화.

[톤]
${tone}: ${TONE_GUIDE[tone]}

[Markdown 제한]
- 허용 태그: h2, h3, p, ul, ol, li, strong, em, a, br
- 이미지 태그 금지
- 외부 링크는 https:// 만

[길이 요구]
bodyMarkdown은 한국어 **800-1200자** 사이. h2 섹션 2-3개 + 본문 단락.

[출력 형식 (JSON)]
{
  "title": "제목 (20-50자)",
  "bodyMarkdown": "markdown 본문 (800-1200자)",
  "summary80": "피드 카드용 80자 내외 요약 (영업 멘트 금지)"
}`;
}

function buildUserPrompt(ctx) {
  const { provider, workCases, latestReview, topicHint, trendKeywords, storyCategory } = ctx;
  const cat = CATEGORY_GUIDE[storyCategory];

  const categoryLabels = provider.categories
    .map((c) => QUOTE_CATEGORY_LABELS[c])
    .join(", ");
  const regions = provider.regions
    .slice(0, 3)
    .map((r) => `${r.city} ${r.district}`)
    .join(", ");

  const priceBookText =
    provider.priceBook && provider.priceBook.length > 0
      ? provider.priceBook
          .slice(0, 3)
          .map(
            (p) =>
              `- ${QUOTE_CATEGORY_LABELS[p.category]} ${p.unitLabel} · ${Math.round(p.basePrice / 10000)}만원`,
          )
          .join("\n")
      : "등록된 단가 없음 (언급하지 마세요)";

  const workCasesText =
    workCases.length > 0
      ? workCases
          .map(
            (w, i) =>
              `[#${i + 1}] ${QUOTE_CATEGORY_LABELS[w.category]} · ${w.sizeLabel}${w.memo ? ` · 메모: "${w.memo}"` : ""}`,
          )
          .join("\n")
      : "등록된 작업 사례 없음";

  const reviewText = latestReview?.text
    ? `인용 가능: "${latestReview.text.slice(0, 120)}" (${latestReview.rating}/5점)`
    : "리뷰 없음 (인용·각색 금지)";

  const trendKeywordsText =
    trendKeywords.length > 0 ? trendKeywords.slice(0, 30).join(", ") : "없음";

  return `[청명 정보]
- 업체명: ${provider.companyName}
- 활동 지역: ${regions || "미지정"}
- 서비스 카테고리: ${categoryLabels}
- 소개: ${provider.description ?? "없음"}
- 슬로건: ${provider.slogan ?? ""}

[대표 단가]
${priceBookText}

[작업 사례 · ${storyCategory === "field" ? "이 중 1건을 글의 배경으로 선택" : "참고만"}]
${workCasesText}

[최신 리뷰]
${reviewText}

[참고 트렌드 키워드 · 자연스럽게 1-2개만]
${trendKeywordsText}

[이번 글의 카테고리]
${cat.label} — ${cat.audienceExpectation}

[주제 힌트]
${topicHint ?? "없음 (카테고리 특성에 맞게 자유롭게)"}

위 정보만을 근거로 블로그 포스트 1개를 작성하세요. JSON으로만 응답하세요.`;
}

const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "블로그 제목 (20-50자)" },
    bodyMarkdown: {
      type: "string",
      description: "Markdown 본문 (800-1200자)",
    },
    summary80: {
      type: "string",
      description: "피드 카드용 80자 내외 요약",
    },
  },
  required: ["title", "bodyMarkdown", "summary80"],
};

async function callGemini(systemInstruction, prompt) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

async function fetchContext(providerId) {
  const providerSnap = await db.collection("providers").doc(providerId).get();
  if (!providerSnap.exists) throw new Error(`provider not found: ${providerId}`);
  const provider = providerSnap.data();

  const [wcSnap, rvSnap, tkSnap] = await Promise.all([
    db.collection("workCases")
      .where("providerId", "==", providerId)
      .orderBy("completedAt", "desc")
      .limit(3)
      .get()
      .catch(() => ({ docs: [] })),
    db.collection("reviews")
      .where("providerId", "==", providerId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get()
      .catch(() => ({ docs: [] })),
    provider.categories?.[0]
      ? db.collection("quoteTrendKeywords").doc(provider.categories[0]).get()
      : Promise.resolve({ exists: false }),
  ]);

  const workCases = wcSnap.docs.map((d) => d.data());
  const latestReview = rvSnap.docs[0]?.data() ?? null;
  const trendKeywords = tkSnap.exists ? tkSnap.data()?.keywords ?? [] : [];

  return { provider, workCases, latestReview, trendKeywords };
}

async function regeneratePost(postId, { storyCategory, topicHint }) {
  const postRef = db.collection("posts").doc(postId);
  const snap = await postRef.get();
  if (!snap.exists) {
    console.log(`[${postId}] SKIP: not found`);
    return;
  }
  const post = snap.data();
  console.log(`\n[${postId}] "${post.title.slice(0, 40)}..." → ${storyCategory}`);

  const ctx = await fetchContext(post.providerId);
  const tone = ctx.provider.brandTone || "professional";

  const sys = buildSystemPrompt(tone, storyCategory);
  const usr = buildUserPrompt({
    ...ctx,
    topicHint,
    storyCategory,
  });

  if (!APPLY) {
    console.log("  [DRY-RUN] prompt built OK · length(sys)=" + sys.length + " · length(usr)=" + usr.length);
    console.log("  topicHint:", topicHint);
    return;
  }

  const started = Date.now();
  const gen = await callGemini(sys, usr);
  console.log(`  generated in ${Date.now() - started}ms`);
  console.log(`  new title: ${gen.title.slice(0, 60)}`);
  console.log(`  body length: ${gen.bodyMarkdown.length}자`);

  if (gen.bodyMarkdown.length < 700) {
    console.warn(`  WARN: body < 700자 (${gen.bodyMarkdown.length}) · 결과 재확인 권장`);
  }

  await postRef.update({
    title: gen.title,
    bodyMarkdown: gen.bodyMarkdown,
    summary80: gen.summary80,
    postType: "provider",
    storyCategory,
    regeneratedAt: FieldValue.serverTimestamp(),
  });
  console.log("  UPDATED");
}

(async () => {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"} · model: ${MODEL}`);
  for (const [postId, cfg] of Object.entries(REGENERATION_MAP)) {
    try {
      await regeneratePost(postId, cfg);
    } catch (err) {
      console.error(`[${postId}] FAILED:`, err?.message || err);
    }
  }
  console.log("\ndone");
  process.exit(0);
})();
