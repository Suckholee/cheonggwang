/**
 * 첫 청명(cleaning service provider) 시드 스크립트.
 * 청광 자체 운영 업체를 첫 청명으로 Firestore `providers` 컬렉션에 등록.
 *
 * v1.1b #2 provider-profile 확장: priceBook · workCases · reviews · demo users 도 함께 시드.
 *
 * 실행:
 *   node --env-file=.env.local scripts/seed-first-provider.mjs
 *   또는 FIREBASE_ADMIN_SA_BASE64=... node scripts/seed-first-provider.mjs
 *
 * Idempotent: 이미 시드된 provider면 추가 seed (priceBook·workCases·reviews)만 업데이트.
 */
import { initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });

const db = getFirestore();

const ownerUid = process.env.OWNER_UID || "cheonggwang-owner";
const contactEmail =
  process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || "contact@example.com";

const now = Date.now();
const daysAgo = (d) => Timestamp.fromMillis(now - d * 24 * 60 * 60 * 1000);

// ─── Provider base data ─────────────────────────────────
const baseProviderData = {
  ownerUid,
  companyName: "청광 직영 청소팀",
  categories: ["move-in", "office", "aircon", "move-out", "special", "regular"],
  regions: [
    { city: "서울특별시", district: "강남구" },
    { city: "서울특별시", district: "서초구" },
    { city: "서울특별시", district: "마포구" },
  ],
  contactEmail,
  contactPhone: "02-1234-5678",
  description:
    "친환경 약품·꼼꼼한 마무리로 4년간 서울 강남·서초·마포 지역 고객분들께 신뢰받고 있습니다.",
  isCheonggwangOwned: true,
  insured: true,
  insuranceAmount: 300_000_000, // 3억
  verified: true,
  yearsOfExperience: 4,
  rating: 4.9,
  reviewCount: 127,
  responseTimeMinutes: 23,
  repeatRate: 0.78,
  completedWorkCount: 412,
  isAvailable: true,
  pageId: null,
  priceBook: [
    {
      category: "move-in",
      unit: "per_visit",
      unitLabel: "25평 · 회당",
      basePrice: 200_000,
    },
    {
      category: "office",
      unit: "per_month",
      unitLabel: "50평 · 주 1회",
      basePrice: 420_000,
    },
    {
      category: "aircon",
      unit: "per_unit",
      unitLabel: "1대 기준",
      basePrice: 90_000,
    },
  ],
  profileImage: null,
  profileImagePath: null,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
};

// ─── Work cases (Before/After · v1.1b #2) ────────────────
const workCasesSeed = [
  {
    category: "move-in",
    sizeLabel: "32평",
    completedDaysAgo: 7,
    memo: "이사 전 입주청소 · 엘리베이터 있음",
  },
  {
    category: "aircon",
    sizeLabel: "벽걸이 2",
    completedDaysAgo: 10,
    memo: "분해 세척 · 설치 완료",
  },
  {
    category: "office",
    sizeLabel: "50평",
    completedDaysAgo: 14,
    memo: "주 1회 정기청소",
  },
];

// 청소 Before/After 더미 사진 (Unsplash 무료)
const placeholderBefore = {
  url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&auto=format&fit=crop",
  path: "demo/before.png",
  order: 0,
};
const placeholderAfter = {
  url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80&auto=format&fit=crop",
  path: "demo/after.png",
  order: 1,
};

// ─── Reviews (v1.1b #2) ───────────────────────────────────
// ─── Additional demo providers (v1.1b #5 client-dashboard) ─────
const additionalProvidersSeed = [
  {
    ownerUid: "demo-provider-2",
    companyName: "스마트클린",
    categories: ["move-in", "office", "regular"],
    regions: [
      { city: "서울특별시", district: "강남구" },
      { city: "서울특별시", district: "송파구" },
    ],
    contactEmail: "smartclean@demo.local",
    contactPhone: "02-2345-6789",
    description: "프리미엄 입주청소 전문. AI 견적으로 15분 안에 답변드립니다.",
    isCheonggwangOwned: false,
    insured: true,
    insuranceAmount: 200_000_000,
    verified: true,
    yearsOfExperience: 3,
    rating: 4.7,
    reviewCount: 48,
    responseTimeMinutes: 15,
    repeatRate: 0.62,
    completedWorkCount: 156,
    isAvailable: true,
    priceBook: [
      { category: "move-in", unit: "per_visit", unitLabel: "30평 · 회당", basePrice: 250_000 },
      { category: "office", unit: "per_month", unitLabel: "40평 · 주 2회", basePrice: 580_000 },
      { category: "regular", unit: "per_month", unitLabel: "가정 · 월 4회", basePrice: 320_000 },
    ],
  },
  {
    ownerUid: "demo-provider-3",
    companyName: "마포 홈케어",
    categories: ["aircon", "special", "regular"],
    regions: [{ city: "서울특별시", district: "마포구" }],
    contactEmail: "mapohc@demo.local",
    contactPhone: "02-3456-7890",
    description: "에어컨 분해청소 · 곰팡이 제거 전문. 마포 지역 단골이 많습니다.",
    isCheonggwangOwned: false,
    insured: true,
    insuranceAmount: 100_000_000,
    verified: true,
    yearsOfExperience: 5,
    rating: 4.8,
    reviewCount: 89,
    responseTimeMinutes: 30,
    repeatRate: 0.85,
    completedWorkCount: 234,
    isAvailable: true,
    priceBook: [
      { category: "aircon", unit: "per_unit", unitLabel: "벽걸이 1대", basePrice: 85_000 },
      { category: "special", unit: "per_visit", unitLabel: "곰팡이 제거 회당", basePrice: 180_000 },
      { category: "regular", unit: "per_month", unitLabel: "가정 · 월 2회", basePrice: 240_000 },
    ],
  },
  {
    ownerUid: "demo-provider-4",
    companyName: "깔끔이 청소",
    categories: ["move-in", "move-out"],
    regions: [
      { city: "서울특별시", district: "서초구" },
      { city: "서울특별시", district: "강남구" },
    ],
    contactEmail: "kkalkkum@demo.local",
    contactPhone: "02-4567-8901",
    description: "이사·입주 청소 전문 · 당일 예약 가능",
    isCheonggwangOwned: false,
    insured: true,
    insuranceAmount: 150_000_000,
    verified: true,
    yearsOfExperience: 2,
    rating: 4.5,
    reviewCount: 23,
    responseTimeMinutes: 40,
    repeatRate: 0.45,
    completedWorkCount: 67,
    isAvailable: true,
    priceBook: [
      { category: "move-in", unit: "per_visit", unitLabel: "20평 · 회당", basePrice: 170_000 },
      { category: "move-out", unit: "per_visit", unitLabel: "30평 · 회당", basePrice: 280_000 },
    ],
  },
  {
    ownerUid: "demo-provider-5",
    companyName: "친환경 클리너",
    categories: ["regular", "office", "aircon"],
    regions: [{ city: "서울특별시", district: "종로구" }],
    contactEmail: "ecoclean@demo.local",
    contactPhone: "02-5678-9012",
    description: "신규 가입 · 친환경 약품 사용 · 합리적 가격",
    isCheonggwangOwned: false,
    insured: false,
    verified: false,
    yearsOfExperience: 1,
    rating: 4.2,
    reviewCount: 5,
    responseTimeMinutes: 60,
    repeatRate: 0.3,
    completedWorkCount: 12,
    isAvailable: true,
    priceBook: [
      { category: "regular", unit: "per_month", unitLabel: "가정 · 월 4회", basePrice: 280_000 },
      { category: "office", unit: "per_month", unitLabel: "30평 · 주 1회", basePrice: 380_000 },
      { category: "aircon", unit: "per_unit", unitLabel: "벽걸이 1대", basePrice: 75_000 },
    ],
  },
];

const reviewsSeed = [
  {
    clientUid: "demo-client-1",
    clientDisplayName: "이희",
    rating: 5,
    text: "약속 시간 정확, 마무리 꼼꼼. 베란다 물때까지 다 없어져서 깜짝 놀랐어요.",
    daysAgo: 3,
  },
  {
    clientUid: "demo-client-2",
    clientDisplayName: "박수",
    rating: 5,
    text: "에어컨 분해청소 2대 맡겼는데 물이 시커멓게 나오더라고요 😅 설치도 깔끔히 해주셨습니다.",
    daysAgo: 10,
  },
];

// ─── 시드 실행 ──────────────────────────────────────────
async function seedProviderDoc() {
  const existing = await db
    .collection("providers")
    .where("companyName", "==", baseProviderData.companyName)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    console.log(`✓ provider 이미 시드됨: ${doc.id}`);
    // 확장 필드 업데이트 (priceBook/stats 등 이번 cycle 신규)
    const { createdAt: _ca, ...updateFields } = baseProviderData;
    void _ca;
    await doc.ref.set(
      {
        ...updateFields,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`  ↳ 확장 필드 업데이트 (priceBook·stats·rating 등)`);
    return doc.id;
  }

  const ref = db.collection("providers").doc();
  await ref.create(baseProviderData);
  console.log(`✓ provider 신규 시드: ${ref.id}`);
  return ref.id;
}

async function seedWorkCases(providerId) {
  // 이미 시드된 workCases 있으면 중복 방지
  const existing = await db
    .collection("workCases")
    .where("providerId", "==", providerId)
    .limit(1)
    .get();
  if (!existing.empty) {
    console.log(`✓ workCases 이미 시드됨 (skip)`);
    return;
  }

  for (const wc of workCasesSeed) {
    await db.collection("workCases").add({
      providerId,
      category: wc.category,
      sizeLabel: wc.sizeLabel,
      beforePhoto: placeholderBefore,
      afterPhoto: placeholderAfter,
      memo: wc.memo,
      completedAt: daysAgo(wc.completedDaysAgo),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`✓ workCases ${workCasesSeed.length}건 시드`);
}

async function seedReviews(providerId) {
  const existing = await db
    .collection("reviews")
    .where("providerId", "==", providerId)
    .limit(1)
    .get();
  if (!existing.empty) {
    console.log(`✓ reviews 이미 시드됨 (skip)`);
    return;
  }

  for (const r of reviewsSeed) {
    // demo user doc upsert (displayName mask 용)
    await db
      .collection("users")
      .doc(r.clientUid)
      .set(
        {
          displayName: r.clientDisplayName,
          email: `${r.clientUid}@demo.local`,
          isCheonggwangPartner: false,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await db.collection("reviews").add({
      providerId,
      clientUid: r.clientUid,
      rating: r.rating,
      text: r.text,
      createdAt: daysAgo(r.daysAgo),
    });
  }
  console.log(`✓ reviews ${reviewsSeed.length}건 + demo users ${reviewsSeed.length}명 시드`);
}

async function seedAdditionalProviders() {
  let created = 0;
  let updated = 0;
  for (const p of additionalProvidersSeed) {
    const existing = await db
      .collection("providers")
      .where("ownerUid", "==", p.ownerUid)
      .limit(1)
      .get();
    if (!existing.empty) {
      await existing.docs[0].ref.set(
        { ...p, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      updated += 1;
    } else {
      const ref = db.collection("providers").doc();
      await ref.create({
        ...p,
        pageId: null,
        profileImage: null,
        profileImagePath: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      created += 1;
    }
  }
  console.log(
    `✓ additional providers: ${created}건 신규 · ${updated}건 업데이트`,
  );
}

// ─── Promo Posts (v1.4 #1 provider-promo-content) ──────────
const promoPostsSeed = [
  {
    title: "입주청소 전 꼭 챙겨야 할 5가지 체크리스트",
    summary80:
      "이사 전 입주청소를 알차게 마무리하려면? 청광 직영팀이 4년 노하우로 정리한 필수 체크리스트.",
    bodyMarkdown: `## 입주청소 전 꼭 확인해야 할 것들

새 집으로 이사하기 전, **입주청소**는 가장 중요한 단계 중 하나입니다. 청소 업체에 맡기기 전 미리 확인하면 좋은 5가지를 정리해 드릴게요.

## 체크리스트

- 전기 점검: 콘센트, 조명 모두 정상인지 확인
- 수도 상태: 누수 여부와 수압 체크
- 환기 시스템: 환풍기, 에어컨 작동 확인
- 곰팡이 흔적: 욕실, 베란다 코너 살피기
- 줄눈 상태: 타일 사이 변색 여부

## 청광 배상보험 5억으로 안심하세요

청광은 모든 청소 작업에 배상보험을 적용합니다. 청명이 작업 중 발생한 손상은 청광이 책임지므로, 안심하고 맡기실 수 있어요.

## 마무리

이사 전 미리 체크하면 청소 업체와 더 정확한 견적 협의가 가능합니다. 청광에서 맞춤 견적을 받아보세요.`,
    coverImageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&auto=format&fit=crop",
    coverImageAlt: "입주청소 가이드 썸네일",
    daysAgo: 10,
  },
  {
    title: "에어컨 청소, 꼭 분해 청소가 필요한 이유",
    summary80:
      "에어컨에서 쿰쿰한 냄새가 난다면? 분해 청소가 답입니다. 청광 직영팀이 알려드리는 분해 청소의 중요성.",
    bodyMarkdown: `## 에어컨 분해 청소가 필요한 순간

에어컨을 켰을 때 쿰쿰한 냄새가 난다면, **분해 청소**를 고민할 시점입니다. 표면 세척만으로는 내부 곰팡이와 먼지를 완전히 제거할 수 없어요.

## 왜 분해 청소가 중요한가

- 표면 세척: 외관 먼지만 제거 (효과 30%)
- 분해 청소: 송풍팬·열교환기까지 완벽 세척 (효과 100%)

## 청광 직영팀의 분해 청소 공정

1. 에어컨 전원 차단 및 보양 작업
2. 외관 분해 (커버, 필터)
3. 송풍팬·열교환기 약품 세척
4. 고압 세척 및 헹굼
5. 재조립 및 정상 작동 확인

## 정기 관리로 수명을 늘리세요

연 1회 분해 청소를 받으시면 에어컨 수명이 평균 2-3년 늘어납니다. 청광에서 견적을 받아보세요.`,
    coverImageUrl:
      "https://images.unsplash.com/photo-1631545806609-f4dec9d9e60e?w=800&q=80&auto=format&fit=crop",
    coverImageAlt: "에어컨 청소 썸네일",
    daysAgo: 20,
  },
  {
    title: "단골 고객들이 청광을 선택하는 3가지 이유",
    summary80:
      "재계약률 78%를 자랑하는 청광 직영팀. 단골 고객들이 꾸준히 선택하는 이유를 정리했어요.",
    bodyMarkdown: `## 청광 직영팀의 단골 후기

지난 4년간 함께해 주신 고객분들의 이야기를 정리했어요. **재계약률 78%**의 비결은 무엇일까요?

## 첫째, 약속된 시간에 정확히 도착

> "매번 약속한 시간에 정확히 도착하셔서 일정이 꼬이지 않아 좋아요."

청광 직영팀은 평균 응답시간 23분, 약속 시간 준수율 100%입니다.

## 둘째, 꼼꼼한 마무리

베란다 물때, 욕실 줄눈, 주방 후드까지 - 보이지 않는 곳도 빠짐없이 청소합니다.

- 표준 체크리스트 47개 항목
- 작업 후 사진 보고서 제공
- Before/After 비교 가능

## 셋째, 청광 배상보험 5억

만에 하나 발생할 수 있는 손상도 청광이 책임집니다. 안심하고 맡기실 수 있는 이유예요.

## 마무리

청광에서 입주·이사·정기 청소 견적을 받아보세요. 첫 만남부터 단골이 되어드릴게요.`,
    coverImageUrl:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format&fit=crop",
    coverImageAlt: "단골 고객 후기 썸네일",
    daysAgo: 30,
  },
];

async function seedPromoPosts(providerId) {
  // 이미 시드된 promo posts 있으면 중복 방지
  const existing = await db
    .collection("posts")
    .where("providerId", "==", providerId)
    .limit(1)
    .get();
  if (!existing.empty) {
    console.log(`✓ promo posts 이미 시드됨 (skip)`);
    return;
  }

  for (const p of promoPostsSeed) {
    const ref = db.collection("posts").doc();
    const slug =
      p.title
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .slice(0, 30) +
      "-" +
      ref.id.slice(0, 6);
    await ref.create({
      providerId,
      providerOwnerUid: ownerUid,
      companyName: baseProviderData.companyName,
      categories: baseProviderData.categories.slice(0, 3),
      regionLabel: "서울특별시 강남구",
      title: p.title,
      slug,
      coverImageUrl: p.coverImageUrl,
      coverImageAlt: p.coverImageAlt,
      bodyMarkdown: p.bodyMarkdown,
      summary80: p.summary80,
      topicHint: null,
      brandTone: "professional",
      createdAt: daysAgo(p.daysAgo),
    });
  }
  console.log(`✓ promo posts ${promoPostsSeed.length}건 시드`);
}

// --- quoteTrendKeywords seed (v1.5a) ---
// NOTE(R8): KEYWORDS는 src/domain/quote-trend-keywords-defaults.ts 와 동기화 유지.
//           .mjs 스크립트라 .ts import 불가 → 수동 복제. Admin CLI(§9.2)가 primary.
async function seedQuoteTrendKeywords() {
  const KEYWORDS = {
    "move-in": [
      "입주청소",
      "새집증후군",
      "베이크아웃",
      "유해물질 제거",
      "입주 전 청소",
      "새집 공기질",
      "창호 틈 먼지",
      "주방 후드 탈지",
      "욕실 물때",
      "바닥 왁스 코팅",
      "환기 · 공기 순환",
      "마감재 보호",
    ],
    office: [
      "사무실 청소",
      "카펫 스팀 청소",
      "파티션 먼지 제거",
      "공용공간 위생",
      "회의실 관리",
      "탕비실 청소",
      "책상 유해균 제거",
      "야간 청소",
      "주말 청소",
      "정기 구독",
      "에어컨 필터 교체",
      "냉난방기 관리",
    ],
    aircon: [
      "에어컨 분해청소",
      "냉방 효율 개선",
      "필터 교체",
      "송풍구 곰팡이 제거",
      "실외기 점검",
      "에어컨 냄새 제거",
      "위생 살균",
      "가정용 분리형",
      "시스템 에어컨",
      "천장형 에어컨",
      "벽걸이형",
      "정기 관리 구독",
    ],
    "move-out": [
      "이사청소",
      "퇴거 전 청소",
      "잔여물 정리",
      "베란다 청소",
      "욕실 물때 제거",
      "주방 기름때",
      "가스레인지 탈지",
      "장판 · 바닥 청소",
      "붙박이장 내부",
      "창문 청소",
      "입주자 대비",
      "임대차 점검",
    ],
    special: [
      "곰팡이 제거",
      "해충 방역",
      "유품정리",
      "고독사 청소",
      "화재잔해 청소",
      "쓰레기 집 청소",
      "악취 제거",
      "오염물 소독",
      "의료폐기물",
      "비위생 공간",
      "특수 약품 처리",
      "감염 관리",
    ],
    regular: [
      "주 1회 청소",
      "월 구독 관리",
      "정기 관리",
      "단골 계약",
      "장기 계약",
      "격주 청소",
      "월 2회 청소",
      "유지보수",
      "일상 청소 대행",
      "가사 도우미",
      "카페 · 매장 청소",
      "아파트 공용부",
    ],
  };

  for (const [cat, keywords] of Object.entries(KEYWORDS)) {
    await db.collection("quoteTrendKeywords").doc(cat).set(
      {
        keywords,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: false },
    );
  }
  console.log(`✓ quoteTrendKeywords ${Object.keys(KEYWORDS).length}건 시드`);
}

const providerId = await seedProviderDoc();
await seedWorkCases(providerId);
await seedReviews(providerId);
await seedAdditionalProviders();
await seedPromoPosts(providerId);
await seedQuoteTrendKeywords();

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✓ 첫 청명 seed 완료`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  providerId: ${providerId}`);
console.log(`  업체명: ${baseProviderData.companyName}`);
console.log(`  접속: http://localhost:3000/providers/${providerId}`);
console.log(`  OG:   http://localhost:3000/providers/${providerId}/opengraph-image.png`);
console.log(``);
process.exit(0);
