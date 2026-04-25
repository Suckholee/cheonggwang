/**
 * quoteTrendKeywords 갱신 스크립트 (재배포 없이).
 *
 * 사용:
 *   node --env-file=.env.local scripts/update-quote-trend-keywords.mjs
 *
 * 편집 방식:
 *   1. 아래 KEYWORDS 객체에서 카테고리별 키워드 수정
 *   2. 스크립트 실행 → Firestore quoteTrendKeywords 6 문서 덮어쓰기 (merge: false)
 *   3. 다음 createPromoPost 호출부터 신규 키워드 반영
 *
 * 주의:
 *   - 각 카테고리 keywords 배열 min 1 · max 30 (repository Zod 검증)
 *   - 각 항목 min 1 · max 30 chars
 *   - src/domain/quote-trend-keywords-defaults.ts 와 일치 정책은 없음
 *     (이 CLI가 primary · defaults.ts는 Firestore 미운영 시 fallback)
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });

const db = getFirestore();

// --- 편집 대상 (재배포 없이 갱신) ---
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

const VALID_CATEGORIES = new Set([
  "move-in",
  "office",
  "aircon",
  "move-out",
  "special",
  "regular",
]);

for (const [cat, keywords] of Object.entries(KEYWORDS)) {
  if (!VALID_CATEGORIES.has(cat)) {
    console.warn(`⚠ 알 수 없는 카테고리 "${cat}" — 건너뜀`);
    continue;
  }
  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.warn(`⚠ ${cat}: keywords 배열 비어있음 — 건너뜀`);
    continue;
  }
  await db.collection("quoteTrendKeywords").doc(cat).set(
    {
      keywords,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  console.log(`✓ ${cat}: ${keywords.length} 키워드`);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✓ quoteTrendKeywords 갱신 완료`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
process.exit(0);
