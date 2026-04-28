/**
 * cycle #29 시연용 실제 의뢰업체 더미 시드.
 *
 * 4 매장:
 *  1. 카페 몬타나 (cafe-montana)        — 일산 베이커리 카페
 *  2. 아이노스 카페 (ino-cafe)          — 파주 화덕피자 (셰프 유종훈, 나폴리 챔피언 3위)
 *  3. 라플란드 (lapland)                — 파주 심학산 베이커리 (북한 보이는 2층 포토존)
 *  4. 소호고시텔 (soho-goshitel)        — 파주 금촌 고시텔
 *
 * 각 매장:
 *  - users/{uid} (mock, isCheonggwangPartner=true)
 *  - partners/{id} (status=active) + profile (USP + Unsplash photos + analysisSummary)
 *  - autoSeries: enabled, photoCursor=0 (cycle #28)
 *  - autoPublish: 매일 06:00–23:00 KST
 *
 * 사용:
 *   node --env-file=.env.local scripts/seed-cycle29-real-partners.mjs
 *
 * Idempotent: 같은 partnerId 있으면 set merge (덮어쓰기).
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

const SEED_TAG = "dummy-cycle29-real-partners";

/**
 * Unsplash 무료 stock 이미지 (CC0). 각 매장 컨셉에 맞춰 큐레이션.
 * 사용자가 실사 사진 받으면 partner.profile.photoUrls 교체로 즉시 반영.
 */
const UNSPLASH = {
  // 베이커리·카페·정원 (몬타나)
  bakery: [
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80", // croissants
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80",   // cafe interior
    "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&q=80",   // pastries
    "https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&q=80", // garden cafe
  ],
  // 화덕피자·이탈리안 (아이노스)
  pizza: [
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80", // pizza overhead
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80", // pizza closeup
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&q=80",   // pasta plate
    "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=1200&q=80", // wood-fired oven
  ],
  // 노을·핀란드·심학산 (라플란드)
  sunset: [
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&q=80", // sunset cafe
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80", // finland cabin
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1200&q=80",   // bakery cake
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&q=80",   // window view
  ],
  // 깔끔한 소형 주거 (소호고시텔)
  goshitel: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80", // tidy small room
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80", // desk natural light
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80", // bed minimal
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80",   // clean bathroom
  ],
};

const PARTNERS = [
  {
    id: "dummy-cycle29-cafe-montana",
    ownerUid: "dummy-cycle29-uid-cafe-montana",
    businessName: "카페 몬타나",
    category: "regular", // 정기청소
    industry: "bakery",
    regionLabel: "고양시 일산서구",
    notes: "일산 베이커리 카페. 정원이 넓어 가족 나들이 명소.",
    profile: {
      description:
        "고양 일산서구 덕산로의 정원이 아름다운 베이커리 카페입니다. 넓은 야외 정원에서 페스츄리·소금앙버터·페이스리·팥빙수·젤라또를 즐길 수 있어 아이들과 가족 단위 손님에게 사랑받는 공간입니다. 자연친화적인 분위기와 자체 베이커리에서 매일 구워내는 빵이 특징입니다.",
      usps: [
        "넓은 정원 — 가족 나들이 추천",
        "매일 굽는 자체 베이커리",
        "시그니처 소금앙버터·바질크런치·페스츄리",
        "팥빙수·젤라또 등 디저트 라인업",
        "주차 무료 + 반려동물 동반 가능",
      ],
      priceItems: [
        { name: "소금앙버터", price: 4500 },
        { name: "팥빙수", price: 12000 },
        { name: "아메리카노", price: 5000 },
      ],
      photoUrls: UNSPLASH.bakery,
      photoAnalysisSummary:
        "사진들에서 느껴지는 분위기는 따뜻하고 자연 친화적이다. 통창 너머 보이는 푸른 정원, 갓 구워낸 빵의 정갈한 진열, 햇살이 떨어지는 라운지 좌석이 손님의 휴식과 즐거움을 디자인의 중심에 두고 있음을 보여준다.",
    },
  },
  {
    id: "dummy-cycle29-ino-cafe",
    ownerUid: "dummy-cycle29-uid-ino-cafe",
    businessName: "아이노스 카페",
    category: "regular",
    industry: "restaurant",
    regionLabel: "파주시",
    notes: "APN 인증 나폴리 화덕피자. 셰프 유종훈 — 제22회 나폴리 피자 세계 챔피언십 클라시카 부문 3위.",
    profile: {
      description:
        "파주 돌곶이길의 APN(나폴리 피자 협회) 인증 화덕피자 전문점입니다. 셰프 유종훈은 제22회 나폴리 피자 세계 챔피언십 클라시카 부문 3위 수상 — 정통 나폴리 피자에 한 걸음 더 나아간 창의성과 조화를 보여준 결과입니다. 모든 재료와 요리는 매장에서 100% 직접 수제로, 화학첨가물·설탕을 지양하고 엄선된 재료로 정성껏 만듭니다.",
      usps: [
        "APN 나폴리 피자 협회 인증",
        "셰프 유종훈 — 나폴리 피자 챔피언십 클라시카 3위",
        "100% 매장 수제 — 도우·소스·토핑까지",
        "화학첨가물·설탕 지양",
        "줄서서 먹는 화덕피자·홈메이드 파스타",
      ],
      priceItems: [
        { name: "마르게리타 피자", price: 18000 },
        { name: "프로슈토 피자", price: 24000 },
        { name: "라구 파스타", price: 16000 },
      ],
      photoUrls: UNSPLASH.pizza,
      photoAnalysisSummary:
        "사진들에서는 장작이 타오르는 화덕, 정확한 가장자리의 도우, 도자기 그릇의 파스타, 셰프의 손길이 보인다. 정통 나폴리 스타일을 그대로 가져온 분위기와 한국 손님이 줄을 서서 기다릴 만한 정성과 디테일이 느껴진다.",
    },
  },
  {
    id: "dummy-cycle29-lapland",
    ownerUid: "dummy-cycle29-uid-lapland",
    businessName: "라플란드",
    category: "regular",
    industry: "bakery",
    regionLabel: "파주시",
    notes:
      "파주 심학산 핀란드 컨셉 베이커리 카페. 1층 테라스·2층 창가 노을뷰. 핵심 키워드 '북한이 보이는 2층 포토존'.",
    profile: {
      description:
        "파주 심학산 자락, 핀란드 라플란드의 청정 자연을 모티브로 한 북유럽 감성 베이커리 카페입니다. 자체 로스팅 룸을 갖춘 시그니처 원두와 매일 굽는 케이크·페스츄리, 그리고 1층 테라스와 2층 창가에서 펼쳐지는 한강 하구·파주 출판단지·임진각 방향까지 이어지는 파노라마 노을뷰가 자랑입니다. 2층 창가는 날씨가 좋은 날 북한 땅이 보이는 인증 포토존으로 입소문을 타고 있습니다.",
      usps: [
        "심학산 노을뷰 — 1층 테라스 + 2층 창가",
        "북한이 보이는 2층 포토존 (날씨 좋은 날)",
        "자체 로스팅 룸 + 시그니처 원두",
        "매일 굽는 케이크·페스츄리",
        "북유럽 핀란드 감성 인테리어",
      ],
      priceItems: [
        { name: "시그니처 라떼", price: 6500 },
        { name: "수플레 치즈케이크", price: 8500 },
        { name: "브런치 플레이트", price: 18000 },
      ],
      photoUrls: UNSPLASH.sunset,
      photoAnalysisSummary:
        "사진들에서는 황금빛 노을이 잠긴 통창, 북유럽 우드톤 인테리어, 핸드드립 커피의 정밀함이 보인다. 손님이 카메라를 꺼낼 만한 풍경을 일상으로 만든 공간이며 2층 창가는 자연스러운 사진 명소로 자리잡았다.",
    },
  },
  {
    id: "dummy-cycle29-soho-goshitel",
    ownerUid: "dummy-cycle29-uid-soho-goshitel",
    businessName: "금촌 소호고시텔",
    category: "move-in", // 입주청소 + move-out도 가능
    industry: "other",
    regionLabel: "파주시 금촌동",
    notes: "파주 금촌역 인근 고시텔. 청소 전·후 사진 인수받음 — 위생 관리 차별화.",
    profile: {
      description:
        "파주 금촌역 도보권의 깔끔한 1인 주거 고시텔입니다. 입주 직전 객실마다 살균·세탁·정리 청소를 표준으로 진행하여 첫날부터 새것 같은 컨디션을 약속합니다. 풀옵션(책상·침대·냉장고·에어컨), 24시간 출입, 무료 와이파이·세탁기·정수기 등 1인 가구가 필요로 하는 기본 설비를 모두 갖췄습니다.",
      usps: [
        "입주 직전 표준 청소 — 살균·세탁·정리",
        "풀옵션 1인실 (책상·침대·냉장고·에어컨)",
        "금촌역 도보권 — 출퇴근·유학·취준생에게 추천",
        "24시간 출입 + 무료 와이파이·세탁기·정수기",
        "투명한 월세 — 보증금·관리비 명세 사전 공개",
      ],
      priceItems: [
        { name: "기본실 월세", price: 350000 },
        { name: "창문실 월세", price: 420000 },
      ],
      photoUrls: UNSPLASH.goshitel,
      photoAnalysisSummary:
        "사진들에서는 정리정돈된 책상과 침대, 깔끔한 화장실, 자연광이 떨어지는 좁지만 답답하지 않은 1인실이 보인다. 청소 전·후 비교 사진은 위생을 매장 차별화의 첫 번째 약속으로 삼는다는 메시지를 명확히 전달한다.",
    },
  },
];

async function seedOne(p) {
  const now = FieldValue.serverTimestamp();

  // 1. users/{uid} (mock partner user — isCheonggwangPartner badge용)
  await db.collection("users").doc(p.ownerUid).set(
    {
      uid: p.ownerUid,
      email: `${p.id}@dummy.cheonggwang.kr`,
      displayName: p.businessName,
      isCheonggwangPartner: true,
      role: "client",
      seedTag: SEED_TAG,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  // 2. partners/{id} (status=active) + profile + autoSeries
  await db.collection("partners").doc(p.id).set(
    {
      ownerUid: p.ownerUid,
      businessName: p.businessName,
      logoUrl: null,
      category: p.category,
      regionLabel: p.regionLabel,
      status: "active",
      autoPublish: {
        enabled: true,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startMinute: 6 * 60,
        endMinute: 23 * 60,
        timezone: "Asia/Seoul",
      },
      issuedAt: now,
      issuedBy: "seed-cycle29",
      notes: p.notes,
      profile: {
        ...p.profile,
        industry: p.profile.industry ?? p.industry,
        status: "auto-approved",
        suspended: false,
        hygieneScore: 1.0,
        version: 1,
        updatedAt: now,
        reviewedBy: null,
        reviewedAt: null,
        rejectReason: null,
      },
      autoSeries: {
        enabled: true,
        lastIndex: -1,
        lastTickAt: null,
        brandTone: "friendly",
        totalPublished: 0,
        totalFailed: 0,
        photoCursor: 0,
      },
      seedTag: SEED_TAG,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  console.log(
    `  ✓ ${p.id} (${p.businessName}) — photos=${p.profile.photoUrls.length} · industry=${p.industry} · region=${p.regionLabel}`,
  );
}

async function main() {
  console.log("=== seed cycle #29 real partners ===");
  console.log(`Project: ${sa.project_id}\n`);
  for (const p of PARTNERS) {
    await seedOne(p);
  }
  console.log(`\n✅ ${PARTNERS.length} partners seeded.`);
  console.log(
    "\n시연: 매일 06:00–23:00 KST cron tick에서 angle 라운드 로빈으로 자동 발행됨.",
  );
  console.log(
    "사진 교체: partners/{id}.profile.photoUrls 배열을 사용자 실사 URL로 update.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
