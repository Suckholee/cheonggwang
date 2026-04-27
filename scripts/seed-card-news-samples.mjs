/**
 * cycle #25 partner-content-formats — 더미 파트너 3명에게 카드뉴스 글 1건씩 시드.
 *
 * 사용:
 *   node --env-file=.env.local scripts/seed-card-news-samples.mjs
 *
 * Idempotent: postId 결정적 (`dummy-cycle25-cardnews-{0,1,2}`), 이미 존재 시 skip.
 * 슬라이드 sentinel: `\n@@SLIDE@@\n` (M2 결의).
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
if (getApps().length === 0) {
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();

const SAMPLES = [
  {
    postId: "dummy-cycle25-cardnews-0",
    partnerDocId: "dummy-cycle22-partner-0",
    slug: "gangnam-coworking-cardnews-1",
    title: "강남역 5분 코워킹, 협업 공간 추천",
    summary80: "스타트업·프리랜서 친화 코워킹스페이스, 24시간 보안과 무제한 카페 음료 제공",
    coverAlt: "강남 코워킹스페이스 라운지 전경",
    bodyMarkdown: [
      "**강남 5분, 진짜 일터** 출퇴근하기 편한 위치에서 *진짜 일*에 집중할 수 있는 협업 공간을 찾고 있다면 주목하세요.",
      "@@SLIDE@@",
      "**좌석은 5가지** 1인 전용석부터 8인 미팅룸까지. 다양한 인원과 업무 스타일에 맞는 좌석으로 *월 25만원*부터 시작합니다.",
      "@@SLIDE@@",
      "**24시간 보안 출입** 야근도 새벽 출근도 자유롭게. 지문 인증으로 *입주사 50곳* 이상이 안전하게 활동 중입니다.",
      "@@SLIDE@@",
      "**무제한 카페 음료** 커피·차·간식이 라운지에 항상 준비되어 있어요. 카페 결제 없이 *집중*할 수 있는 환경입니다.",
      "@@SLIDE@@",
      "**매주 화요일 네트워킹** 입주사 상호 행사로 *새로운 협업* 기회를 만나세요. 단순 사무실이 아닌 비즈니스 커뮤니티입니다.",
      "@@SLIDE@@",
      "**첫 달 30% 할인** 지금 투어 신청하면 첫 달 *30% 할인*. 강남 코워킹스페이스에서 새로운 일터를 시작하세요.",
    ].join("\n"),
    scenarios: ["네트워킹 행사", "신규 오픈"],
    tags: ["coworking", "gangnam", "networking"],
    coverImageUrlGetter: (data) => data.profile?.photoUrls?.[0] ?? data.logoUrl ?? null,
  },
  {
    postId: "dummy-cycle25-cardnews-1",
    partnerDocId: "dummy-cycle22-partner-1",
    slug: "malgun-glasses-cardnews-1",
    title: "30년 경력 안경원, 정밀 시력 검사 안내",
    summary80: "강서구 화곡동 가족 2대 안경원 — 명품 프레임 800종, 당일 제작, 보청기 상담",
    coverAlt: "맑은 안경원 매장 내부",
    bodyMarkdown: [
      "**눈 건강은 30년 경력에** 강서구 화곡동에서 *2대째* 운영 중인 가족 안경원입니다. 단골 손님이 가장 많이 추천하는 곳.",
      "@@SLIDE@@",
      "**사장님이 직접 검안** 정밀 시력 검사부터 *얼굴형 맞춤 프레임* 추천까지, 모든 과정을 사장님이 직접 진행합니다.",
      "@@SLIDE@@",
      "**명품·국산 800종 이상** 합리적 가격대 국산부터 명품 브랜드까지 *800종 이상*. 나에게 꼭 맞는 안경을 찾을 수 있어요.",
      "@@SLIDE@@",
      "**전문 렌즈 보유** *블루라이트 차단*·다초점·도수 선글라스 등 전문 영역. 자동 굴절 측정기로 정밀 검사를 제공합니다.",
      "@@SLIDE@@",
      "**당일 제작 가능** 급하게 안경이 필요한 *출장 중* 손님도 안심하고 방문하세요. 소요 시간 1~2시간.",
      "@@SLIDE@@",
      "**보청기도 함께** 어르신 *단골 손님*이 많은 이유. 가족 모두의 눈·귀 건강을 한 번에 챙기세요.",
    ].join("\n"),
    scenarios: ["전문 검안 안내", "단골 후기"],
    tags: ["optical", "checkup", "family"],
    coverImageUrlGetter: (data) => data.profile?.photoUrls?.[0] ?? data.logoUrl ?? null,
  },
  {
    postId: "dummy-cycle25-cardnews-2",
    partnerDocId: "dummy-cycle22-partner-2",
    slug: "happypet-clinic-cardnews-1",
    title: "사당역 24시 동물병원, 외과 수술 전문",
    summary80: "강아지·고양이 종합 진료, 외과 수술·심장 초음파·24시간 응급실 운영",
    coverAlt: "해피펫 동물병원 진료실",
    bodyMarkdown: [
      "**새벽에도 응급 안심** 사당역 도보 3분, *24시간 응급실*을 운영하는 종합 동물병원입니다. 반려동물의 건강은 시간을 가리지 않으니까요.",
      "@@SLIDE@@",
      "**풀 진료 시스템** 일반 진료부터 *외과 수술*·치과·피부과·심장 초음파까지. 한 곳에서 모두 가능합니다.",
      "@@SLIDE@@",
      "**5년 누적 1.2만 건** 풍부한 임상 경험으로 정확한 진단. *조기 발견*이 가장 좋은 치료입니다.",
      "@@SLIDE@@",
      "**아이도 편안한 공간** 따뜻한 대기실과 *반려동물 친화적* 진료실. 보호자도 아이도 긴장 없이 진료받습니다.",
      "@@SLIDE@@",
      "**정기 검진 패키지** 강아지 5종 *종합 백신 12만원*, 심장 초음파 검사 18만원. 예방이 곧 절약입니다.",
      "@@SLIDE@@",
      "**24시간 운영** 사당역 3번 출구 도보 3분. *해피펫 동물병원*에서 우리 아이 건강 지키세요.",
    ].join("\n"),
    scenarios: ["응급 안내", "정기 검진 패키지"],
    tags: ["pet-clinic", "emergency", "surgery"],
    coverImageUrlGetter: (data) => data.profile?.photoUrls?.[0] ?? data.logoUrl ?? null,
  },
];

async function getPartner(docId) {
  const ref = db.collection("partners").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

const FORCE = process.env.FORCE === "1" || process.argv.includes("--force");

async function seedOne(s) {
  const postsCol = db.collection("posts");
  const ref = postsCol.doc(s.postId);
  const existing = await ref.get();
  if (existing.exists && !FORCE) {
    console.log(`  ⊙ posts/${s.postId} already exists, skip (FORCE=1로 덮어쓰기)`);
    return;
  }
  if (existing.exists && FORCE) {
    await ref.delete();
    console.log(`  ↻ posts/${s.postId} deleted (FORCE)`);
  }

  const partner = await getPartner(s.partnerDocId);
  if (!partner) {
    console.warn(`  ✗ partners/${s.partnerDocId} not found, skip ${s.postId}`);
    return;
  }

  const cover = s.coverImageUrlGetter(partner);
  const photoUrls = partner.profile?.photoUrls ?? (cover ? [cover] : []);

  const now = Timestamp.now();
  const generationMeta = {
    model: "seed-dummy",
    generatedAt: now,
    ragSourceIds: [`profile/${partner.id}@v1`],
    hygieneScore: 0.95,
    visionTags: [],
    keywordsHint: [],
    templateTags: s.tags,
  };

  await ref.create({
    providerId: `partner:${partner.id}`,
    providerOwnerUid: partner.ownerUid,
    companyName: partner.businessName,
    categories: partner.category ? [partner.category] : [],
    regionLabel: partner.regionLabel ?? null,
    title: s.title,
    slug: s.slug,
    coverImageUrl: cover,
    coverImageAlt: s.coverAlt,
    bodyMarkdown: s.bodyMarkdown,
    summary80: s.summary80,
    topicHint: null,
    brandTone: "friendly",
    postType: "partner-promo",
    publishStatus: "published",
    sourcePhotos: photoUrls,
    generationMeta,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    // v1.12 cycle #25
    format: "card-news",
    templateScenarios: s.scenarios,
    isSample: true,
    seedTag: "dummy-cycle25-card-news",
  });

  console.log(`  ✓ posts/${s.postId} (${partner.businessName} · card-news)`);
}

async function main() {
  console.log("=== seed cycle #25 card-news samples ===");
  console.log(`Project: ${sa.project_id}`);
  for (const s of SAMPLES) {
    await seedOne(s);
  }
  console.log("✅ done");
  console.log(`\n방문 URL:`);
  for (const s of SAMPLES) {
    console.log(`  /community/p/${s.slug}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
