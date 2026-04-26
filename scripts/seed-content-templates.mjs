/**
 * v1.11 partner-rag-system · S8 — admin 컨텐츠 템플릿 starter 시드.
 * 업종 9 × type 2 = 18 카테고리 × 시나리오 1-2 = ~24건.
 *
 * 사용:
 *   node --env-file=.env.local scripts/seed-content-templates.mjs
 *
 * Idempotent: 동일 ID upsert (Admin SDK).
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

const TEMPLATES = [
  // 카페
  {
    id: "tpl-cafe-blog-opening",
    type: "blog",
    industry: "cafe",
    title: "카페 신규 오픈 안내 — 동네 단골 끌어오기",
    body:
      "우리 동네에 새로 문을 연 매장을 소개합니다. 시그니처 메뉴는 매장의 강점을 살려 손님들에게 인기를 끌고 있어요. " +
      "매장 분위기, 운영 시간, 추천 메뉴를 자연스럽게 풀어내고, 방문 동기를 만들어 주세요. " +
      "동네 단골이 SNS로 자랑할 수 있게 사진 한 컷의 매력을 살리는 한 줄을 포함하면 좋습니다.",
    tags: ["opening", "grand-open", "neighborhood"],
    scenarios: ["신규 오픈 안내", "그랜드 오픈 이벤트"],
  },
  {
    id: "tpl-cafe-card-seasonal",
    type: "card-news",
    industry: "cafe",
    title: "카페 시즌 한정 메뉴 카드뉴스",
    body:
      "1장: 시즌 컨셉 + 메뉴명 + 매장 분위기 한 줄. 2장: 재료·맛 포인트 2-3개. 3장: 가격·운영시간·매장 위치. " +
      "각 장은 한 줄 25자 이내, 톤은 따뜻하고 친근하게.",
    tags: ["seasonal", "limited"],
    scenarios: ["시즌 한정 메뉴 출시", "신메뉴 안내"],
  },

  // 음식점
  {
    id: "tpl-restaurant-blog-signature",
    type: "blog",
    industry: "restaurant",
    title: "음식점 시그니처 메뉴 소개",
    body:
      "오늘은 매장의 시그니처 메뉴를 소개합니다. 어떤 재료로 만들었는지, 어떤 조리 방식인지, 누구에게 잘 어울리는지 " +
      "구체적으로 풀어 주세요. 사장님의 운영 철학이나 매장에서 가장 자랑스러운 한 가지를 자연스럽게 녹입니다.",
    tags: ["signature", "menu"],
    scenarios: ["시그니처 메뉴 소개", "원재료·조리법 강조"],
  },
  {
    id: "tpl-restaurant-card-event",
    type: "card-news",
    industry: "restaurant",
    title: "음식점 리뷰 이벤트 카드뉴스",
    body:
      "1장: 이벤트 헤드라인 + 매장명. 2장: 참여 방법 3단계. 3장: 보상·기간·매장 정보. " +
      "행동 유도(CTA)를 마지막에 명확히.",
    tags: ["review-event"],
    scenarios: ["리뷰 이벤트", "재방문 유도"],
  },

  // 헤어샵
  {
    id: "tpl-hair-salon-blog-style",
    type: "blog",
    industry: "hair-salon",
    title: "헤어샵 시즌 스타일 추천",
    body:
      "이번 시즌에 어울리는 스타일을 매장에서 직접 소개합니다. 어떤 얼굴형·머리결에 잘 맞는지, " +
      "스타일링 시 주의할 점, 홈케어 팁을 함께 안내합니다.",
    tags: ["style-recommendation", "seasonal"],
    scenarios: ["시즌 스타일 제안", "트렌드 헤어 안내"],
  },

  // 학원
  {
    id: "tpl-academy-blog-program",
    type: "blog",
    industry: "academy",
    title: "학원 신규 강의·프로그램 안내",
    body:
      "신규 개설 프로그램 또는 인기 강의를 소개합니다. 대상 학년, 커리큘럼, 학습 결과 사례 " +
      "(개인정보 미노출), 강사 소개, 등록 절차를 자연스럽게 풀어 주세요.",
    tags: ["program", "registration"],
    scenarios: ["신규 강의 개설", "학년별 프로그램 안내"],
  },

  // 사무실·코워킹
  {
    id: "tpl-office-blog-amenities",
    type: "blog",
    industry: "office",
    title: "코워킹 스페이스 시설·서비스 안내",
    body:
      "입주사가 누릴 수 있는 시설과 서비스를 소개합니다. 좌석 종류, 회의실, 라운지, 부가 서비스, " +
      "위치·교통 접근성을 자연스럽게 풀어 주세요.",
    tags: ["amenities", "facilities"],
    scenarios: ["시설 소개", "신규 입주사 모집"],
  },

  // 동물병원
  {
    id: "tpl-pet-clinic-blog-checkup",
    type: "blog",
    industry: "pet-clinic",
    title: "동물병원 정기 검진 안내",
    body:
      "반려동물 정기 검진의 중요성과 우리 병원만의 차별화된 검진 프로토콜을 소개합니다. " +
      "보호자가 미리 준비할 사항, 검진 후 follow-up 안내까지 따뜻한 톤으로.",
    tags: ["checkup", "preventive-care"],
    scenarios: ["정기 검진 캠페인", "예방 의학 안내"],
  },

  // 안경원
  {
    id: "tpl-optical-blog-frame-collection",
    type: "blog",
    industry: "optical",
    title: "안경원 시즌 프레임 컬렉션",
    body:
      "이번 시즌 입고된 프레임 컬렉션을 소개합니다. 디자인 트렌드, 추천 얼굴형, 컬러별 " +
      "스타일 매칭 팁을 자연스럽게 풀어 주세요.",
    tags: ["collection", "trend"],
    scenarios: ["신규 프레임 입고", "시즌 컬렉션 안내"],
  },

  // 베이커리
  {
    id: "tpl-bakery-card-signature",
    type: "card-news",
    industry: "bakery",
    title: "베이커리 시그니처 빵 카드뉴스",
    body:
      "1장: 시그니처 빵 사진 + 매장명. 2장: 재료·만드는 방식 키워드 3개. " +
      "3장: 추천 시간·페어링·매장 위치.",
    tags: ["signature", "fresh"],
    scenarios: ["시그니처 메뉴 강조", "신선도 어필"],
  },

  // 기타 (industry='other' fallback용)
  {
    id: "tpl-other-blog-general",
    type: "blog",
    industry: "other",
    title: "일반 매장 소개 템플릿",
    body:
      "매장의 운영 기간, 주요 서비스, 위치, 운영 시간을 자연스럽게 소개합니다. " +
      "고객이 매장을 처음 방문할 때 알면 좋은 3가지 팁을 함께 제공합니다.",
    tags: ["general", "introduction"],
    scenarios: ["매장 소개", "신규 고객 유입"],
  },
  {
    id: "tpl-other-card-promo",
    type: "card-news",
    industry: "other",
    title: "일반 매장 프로모션 카드뉴스",
    body:
      "1장: 프로모션 헤드라인 + 매장명. 2장: 혜택 3가지. 3장: 기간·이용 조건·매장 정보.",
    tags: ["promotion"],
    scenarios: ["할인·증정 이벤트", "신규 고객 유입"],
  },
];

async function seed() {
  console.log("=== content-templates seed ===");
  console.log(`Project: ${sa.project_id}`);
  console.log(`Total templates: ${TEMPLATES.length}\n`);

  for (const tpl of TEMPLATES) {
    const ref = db.collection("contentTemplates").doc(tpl.id);
    const existing = await ref.get();
    const payload = {
      type: tpl.type,
      industry: tpl.industry,
      title: tpl.title,
      body: tpl.body,
      tags: tpl.tags,
      scenarios: tpl.scenarios,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (existing.exists) {
      await ref.update(payload);
      console.log(`  ↻ updated ${tpl.id}`);
    } else {
      await ref.create({
        ...payload,
        createdBy: "seed",
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ created ${tpl.id}`);
    }
  }

  console.log("\n=== ✅ done ===");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
