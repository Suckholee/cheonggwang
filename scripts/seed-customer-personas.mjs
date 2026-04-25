/**
 * v1.6 — 샘플 고객 20명에 페르소나 부여.
 *
 * 각 고객의 직업 · 거주 상황 · 청소 서비스 이용 동기 · 관심 카테고리 · 월예산 등을
 * users/{uid}.persona 에 저장. /sample-accounts 페이지에서 렌더.
 *
 * 사용:  node --env-file=.env.local scripts/seed-customer-personas.mjs
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) { console.error("FIREBASE_ADMIN_SA_BASE64 not set"); process.exit(1); }
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

// 20 personas — 다양한 직업·가구 구성·예산으로 현실적 믹스.
const PERSONAS = {
  minsu_kim: {
    age: 28,
    occupation: "IT 개발자 (스타트업)",
    household: "1인가구",
    region: "서울 강남구 오피스텔",
    goal: "야근 잦아 주말 청소할 여유가 없음. 한 달에 한 번 깊은 정기 청소로 삶의 질 유지",
    interestedCategories: ["regular"],
    monthlyBudget: 150_000,
    oneLiner: "주말은 쉬고 싶은 개발자",
  },
  jh_lee: {
    age: 42,
    occupation: "워킹맘 · 대기업 과장",
    household: "4인 가족 (부부 + 자녀 2)",
    region: "경기 성남시 분당 84㎡ 아파트",
    goal: "일·육아 병행으로 2주 1회 정기 청소 + 아이방 청결 관리",
    interestedCategories: ["regular", "move-in"],
    monthlyBudget: 400_000,
    oneLiner: "일과 가족, 둘 다 놓치기 싫은 엄마",
  },
  sy_park: {
    age: 33,
    occupation: "프리랜서 일러스트레이터",
    household: "1인가구",
    region: "서울 마포구 홍대 인근 원룸",
    goal: "재택근무로 공간 청결에 민감. 분기별 곰팡이·집먼지 특수청소 필요",
    interestedCategories: ["special", "regular"],
    monthlyBudget: 250_000,
    oneLiner: "집이 곧 스튜디오인 작가",
  },
  jh_choi: {
    age: 37,
    occupation: "스타트업 창업자",
    household: "신혼 부부",
    region: "서울 강남구 오피스 + 성동구 아파트",
    goal: "공유 사무실 매주 청소 + 신혼집 입주청소",
    interestedCategories: ["office", "move-in"],
    monthlyBudget: 700_000,
    oneLiner: "회사와 집 둘 다 살림해야 하는 대표",
  },
  yj_jung: {
    age: 29,
    occupation: "요가 스튜디오 운영",
    household: "1인가구",
    region: "서울 마포구 연남동 스튜디오",
    goal: "수강생 매트·공용 공간 매주 위생 관리, 항균 특수청소 병행",
    interestedCategories: ["office", "special"],
    monthlyBudget: 300_000,
    oneLiner: "수강생 안전이 1순위인 강사",
  },
  sw_han: {
    age: 45,
    occupation: "치과의사",
    household: "3인 가족 (부부 + 장모)",
    region: "서울 송파구 40평 아파트",
    goal: "고령 가족 동거로 살균 철저. 월 정기 + 분기별 에어컨 관리",
    interestedCategories: ["regular", "aircon"],
    monthlyBudget: 350_000,
    oneLiner: "가족 건강이 최우선인 의사",
  },
  ja_yoon: {
    age: 31,
    occupation: "브랜드 마케터",
    household: "신혼 부부",
    region: "서울 성동구 신축 오피스텔",
    goal: "이사 후 입주청소 검토 중. 새집 분진·유해물질 제거 우선",
    interestedCategories: ["move-in"],
    monthlyBudget: 400_000,
    oneLiner: "새집증후군이 걱정인 새댁",
  },
  hw_cho: {
    age: 26,
    occupation: "대학원생 (공학계열)",
    household: "1인가구",
    region: "서울 관악구 원룸 자취 4년차",
    goal: "여름 전 에어컨 분해청소 + 졸업 이사청소",
    interestedCategories: ["aircon", "move-out"],
    monthlyBudget: 150_000,
    oneLiner: "연구실과 원룸을 오가는 대학원생",
  },
  ye_jang: {
    age: 34,
    occupation: "초등학교 교사 (육아휴직)",
    household: "4인 가족 (부부 + 자녀 2, 유아기)",
    region: "경기 고양시 일산 아파트",
    goal: "유아 2명 위생 민감 · 정기 청소 + 장난감 소독 특수청소",
    interestedCategories: ["regular", "special"],
    monthlyBudget: 250_000,
    oneLiner: "아이들이 바닥에 뒹굴어도 안심인 집을 원하는 교사",
  },
  dh_seo: {
    age: 40,
    occupation: "건설사 과장",
    household: "3인 가족",
    region: "경기 성남시 판교 신축 입주 예정",
    goal: "분양 신축 입주청소 후 월 정기로 전환",
    interestedCategories: ["move-in", "regular"],
    monthlyBudget: 200_000,
    oneLiner: "첫 신축 입주를 준비 중인 직장인",
  },
  mj_kang: {
    age: 38,
    occupation: "자영업 (치킨집 사장)",
    household: "2인가구 (부부)",
    region: "서울 성북구 매장 + 자택",
    goal: "매장 주방 기름때 특수청소 주 1회 + 집 정기청소",
    interestedCategories: ["special", "office"],
    monthlyBudget: 400_000,
    oneLiner: "매일 기름과 씨름하는 사장님",
  },
  hn_im: {
    age: 25,
    occupation: "간호사 (3교대)",
    household: "부모님과 동거",
    region: "서울 양천구 목동 아파트",
    goal: "야근 후 청소할 체력 없음. 주 1회 도움",
    interestedCategories: ["regular"],
    monthlyBudget: 200_000,
    oneLiner: "교대근무로 매일이 피곤한 간호사",
  },
  js_oh: {
    age: 36,
    occupation: "요리 유튜버",
    household: "1인가구",
    region: "서울 마포구 상수 스튜디오형 주방",
    goal: "촬영 후 기름·양념때 집중 청소 + 채널 이미지 관리용 공간 유지",
    interestedCategories: ["special", "regular"],
    monthlyBudget: 450_000,
    oneLiner: "매주 촬영 끝나면 주방 전쟁터 되는 크리에이터",
  },
  yb_no: {
    age: 30,
    occupation: "UX 디자이너",
    household: "1인가구 + 반려견 2마리",
    region: "서울 서초구 오피스텔",
    goal: "반려견 털·냄새 관리 월 2회 + 에어컨 필터 분기별",
    interestedCategories: ["regular", "aircon"],
    monthlyBudget: 300_000,
    oneLiner: "강아지 둘과 함께 사는 디자이너",
  },
  jh_moon: {
    age: 53,
    occupation: "자영업 (중소 인쇄소 대표)",
    household: "부부",
    region: "서울 서대문구 홍은동 오래된 주택",
    goal: "이사 준비 중 이사 청소 + 장기 거주 특수청소",
    interestedCategories: ["move-out", "special"],
    monthlyBudget: 800_000,
    oneLiner: "30년 산 집 정리하고 이사 준비 중",
  },
  hn_koo: {
    age: 27,
    occupation: "네일아트 숍 원장",
    household: "1인가구",
    region: "서울 강남구 15평 매장",
    goal: "주말 영업 종료 후 주방·화장실 청결 관리",
    interestedCategories: ["office"],
    monthlyBudget: 250_000,
    oneLiner: "손님 다음 예약 들어오기 전까지가 타임어택",
  },
  sh_baek: {
    age: 44,
    occupation: "공무원 (지방직)",
    household: "4인 가족 (아내 출산 예정)",
    region: "서울 노원구 아파트",
    goal: "출산 전 항균 대청소 + 이후 정기청소",
    interestedCategories: ["special", "regular"],
    monthlyBudget: 300_000,
    oneLiner: "둘째 맞이 준비 중인 아빠",
  },
  yr_shin: {
    age: 22,
    occupation: "대학생 2학년",
    household: "1인가구",
    region: "서울 서대문구 신촌 원룸 (월세)",
    goal: "저렴한 공간 곰팡이·환기 문제 · 학기 시작 전 특수청소",
    interestedCategories: ["special", "regular"],
    monthlyBudget: 100_000,
    oneLiner: "곰팡이 핀 자취방에서 학업 중인 학생",
  },
  ty_hwang: {
    age: 50,
    occupation: "국악 학원 원장",
    household: "3인 가족",
    region: "서울 강남구 대치동 40평 학원",
    goal: "주말 수강생 많아 주 1회 대청소 필수",
    interestedCategories: ["office", "regular"],
    monthlyBudget: 450_000,
    oneLiner: "학부모 눈에 비치는 학원 공간이 핵심인 원장",
  },
  de_jin: {
    age: 32,
    occupation: "변호사",
    household: "신혼 부부",
    region: "서울 서초구 고층 아파트",
    goal: "야근·법정 일정으로 시간 부족 · 월 정기 + 에어컨",
    interestedCategories: ["regular", "aircon"],
    monthlyBudget: 300_000,
    oneLiner: "서류 산더미 속에서도 집은 정갈하길 원하는 변호사",
  },
};

(async () => {
  let updated = 0;
  let notFound = 0;

  // 고객(sample 사용자 중 providerId 없는 것)만 대상
  const snap = await db.collection("users").where("isSample", "==", true).get();
  for (const d of snap.docs) {
    const data = d.data();
    if (data.providerId) continue; // 청명 제외
    const username = data.username;
    if (!username) continue;
    const persona = PERSONAS[username];
    if (!persona) {
      console.log(`  [skip] ${username}: 페르소나 정의 없음`);
      notFound++;
      continue;
    }
    await d.ref.update({
      persona,
      personaUpdatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ ${data.displayName} (@${username}) · ${persona.occupation}`);
    updated++;
  }

  console.log(`\ndone · updated=${updated} notFound=${notFound} total=${Object.keys(PERSONAS).length}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
