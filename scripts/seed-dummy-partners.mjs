/**
 * cycle #22 partner-issue-from-users 시연용 더미 데이터 시드.
 *
 * 18 doc 추가:
 *   - users 10명 (client roles only)
 *       · users[0..4] (5명): 활성 카드 (partner·applicant 매칭 없음)
 *       · users[5..6] (2명): partners 매칭 → ✅ 배지
 *       · users[7..9] (3명): applicants pending 매칭 → ⏳ 배지
 *   - partnerApplicants pending 5명
 *       · [0..2] users[7..9]와 ownerUid 매칭
 *       · [3..4] 별도 fake ownerUid (신청자 명단 패널만)
 *   - partners active 3명
 *       · [0..1] users[5..6]와 ownerUid 매칭
 *       · [2]    별도 fake ownerUid (/admin/partners 발급 섹션만)
 *
 * 모든 doc에 `seedTag: 'dummy-cycle22-partners'` 추가 — 향후 cleanup 가능.
 *
 * 사용:
 *   node --env-file=.env.local scripts/seed-dummy-partners.mjs
 *   또는 FIREBASE_ADMIN_SA_BASE64=... node scripts/seed-dummy-partners.mjs
 *
 * Idempotent: 같은 ID가 이미 있으면 덮어씀 (set with merge:false).
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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
const auth = getAuth();

const SEED_TAG = "dummy-cycle22-partners";
const DUMMY_PASSWORD = "cheonggwang2026!";

// --- helper ---
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}

// --- users (10명) ---
const USERS = [
  { i: 0, displayName: "김민수", email: "minsu.kim@example.com", phone: "010-1111-2222", days: 5 },
  { i: 1, displayName: "이지영", email: "jiyoung.lee@example.com", phone: null, days: 3 },
  { i: 2, displayName: "박철수", email: "chulsu.park@example.com", phone: "010-2222-3333", days: 7 },
  { i: 3, displayName: "정수아", email: "sua.jung@example.com", phone: "010-3333-4444", days: 10 },
  { i: 4, displayName: "최민준", email: "minjun.choi@example.com", phone: null, days: 12 },
  // [5..6] partners 매칭 → ✅
  { i: 5, displayName: "강지원", email: "jiwon.kang@example.com", phone: "010-4444-5555", days: 15 },
  { i: 6, displayName: "윤서연", email: "seoyeon.yoon@example.com", phone: null, days: 1 },
  // [7..9] applicants pending 매칭 → ⏳
  { i: 7, displayName: "임도현", email: "dohyun.lim@example.com", phone: "010-5555-6666", days: 20 },
  { i: 8, displayName: "한예진", email: "yejin.han@example.com", phone: "010-6666-7777", days: 25 },
  { i: 9, displayName: "송지훈", email: "jihoon.song@example.com", phone: null, days: 30 },
];

// --- partnerApplicants (5명, pending) ---
// 파트너 = 청소를 맡기는 매장 운영자 (카페·음식점·헤어샵·학원 등)
// [0..2] users[7..9]와 매칭 (ownerUid 동일)
// [3..4] 별도 fake ownerUid (users doc 없음 — 신청자 명단 패널만)
const APPLICANTS = [
  {
    i: 0,
    ownerUidOverride: null, // users[7]
    matchedUserIndex: 7,
    businessName: "스타일헤어 강남점",
    email: "dohyun.lim@example.com",
    phone: "010-5555-6666",
    category: "aircon",
    regionLabel: "서울특별시 강남구",
    intro: "프리미엄 헤어샵. 여름 시즌 에어컨 분해청소 + 매장 홍보 신청합니다.",
    days: 4,
  },
  {
    i: 1,
    ownerUidOverride: null,
    matchedUserIndex: 8,
    businessName: "행복베이커리",
    email: "yejin.han@example.com",
    phone: "010-6666-7777",
    category: "regular",
    regionLabel: "경기도 고양시 덕양구",
    intro: "동네 빵집 6년차. 주 2회 정기 청소와 SNS 홍보가 필요해요.",
    days: 6,
  },
  {
    i: 2,
    ownerUidOverride: null,
    matchedUserIndex: 9,
    businessName: "탑수학학원",
    email: "jihoon.song@example.com",
    phone: null,
    category: "regular",
    regionLabel: "서울특별시 동작구",
    intro: "고등 수학 전문 학원. 학생 안전 위해 매주 청소 + 학부모 대상 홍보 원합니다.",
    days: 8,
  },
  {
    i: 3,
    ownerUidOverride: "dummy-cycle22-applicant-only-3",
    matchedUserIndex: null,
    businessName: "달빛카페",
    email: "moonlight.cafe@example.com",
    phone: "010-7000-9012",
    category: "regular",
    regionLabel: "서울특별시 영등포구",
    intro: "오피스 인근 동네 카페. 매일 아침 오픈 전 청소 필요.",
    days: 2,
  },
  {
    i: 4,
    ownerUidOverride: "dummy-cycle22-applicant-only-4",
    matchedUserIndex: null,
    businessName: "맛있는집 한식당",
    email: "tasty.house@example.com",
    phone: "010-7000-3456",
    category: "move-in",
    regionLabel: "서울특별시 송파구",
    intro: "신규 오픈 한식당. 입주청소 + 그랜드오픈 홍보글 부탁드려요.",
    days: 1,
  },
];

// --- partners (3명, active) ---
// 이미 발급된 파트너 매장 (코워킹·안경원·펫샵 등)
// [0..1] users[5..6]와 매칭, [2] 별도 fake
const PARTNERS = [
  {
    i: 0,
    matchedUserIndex: 5,
    ownerUidOverride: null,
    businessName: "강남 코워킹스페이스",
    category: "office",
    regionLabel: "서울특별시 서초구",
    notes: "강남 코워킹스페이스 운영자. 주 3회 정기 청소 + 입주사 대상 매장 홍보.",
    days: 18,
  },
  {
    i: 1,
    matchedUserIndex: 6,
    ownerUidOverride: null,
    businessName: "맑은 안경원",
    category: "regular",
    regionLabel: "서울특별시 강서구",
    notes: "동네 안경원. 주 1회 정기 청소 + 신규 고객 유입 홍보 콘텐츠 운영.",
    days: 12,
  },
  {
    i: 2,
    matchedUserIndex: null,
    ownerUidOverride: "dummy-cycle22-partner-only-2",
    businessName: "해피펫 동물병원",
    category: "special",
    regionLabel: "서울특별시 동작구",
    notes: "동물병원. 위생 특수청소 + 보호자 대상 정기 콘텐츠 발행.",
    days: 35,
  },
];

const DEFAULT_AUTO_PUBLISH = {
  enabled: false,
  weekdays: [],
  startMinute: 540,
  endMinute: 1080,
  timezone: "Asia/Seoul",
};

function userDocId(i) {
  return `dummy-cycle22-user-${i}`;
}

/**
 * Firebase Auth 더미 계정 시드 (cycle #23 시연용).
 * users[0..9] 10명만 — applicant-only / partner-only는 firestore doc 없으므로 Auth도 없음.
 * Idempotent: 이미 있으면 password·email·displayName update.
 */
async function seedAuth() {
  console.log(`[seed] Firebase Auth — 10명 (password=${DUMMY_PASSWORD})`);
  for (const u of USERS) {
    const uid = userDocId(u.i);
    try {
      await auth.createUser({
        uid,
        email: u.email,
        password: DUMMY_PASSWORD,
        displayName: u.displayName,
        emailVerified: true,
      });
      console.log(`  ✓ created ${uid} (${u.email})`);
    } catch (e) {
      if (
        e.code === "auth/uid-already-exists" ||
        e.code === "auth/email-already-exists"
      ) {
        await auth.updateUser(uid, {
          email: u.email,
          password: DUMMY_PASSWORD,
          displayName: u.displayName,
          emailVerified: true,
        });
        console.log(`  ↻ updated ${uid}`);
      } else {
        throw e;
      }
    }
  }
}

async function seedUsers() {
  console.log("[seed] users — 10명");
  for (const u of USERS) {
    const ref = db.collection("users").doc(userDocId(u.i));
    await ref.set({
      email: u.email,
      displayName: u.displayName,
      isCheonggwangPartner: false,
      roles: ["client"],
      contactPhone: u.phone,
      createdAt: daysAgo(u.days),
      seedTag: SEED_TAG,
    });
    console.log(`  ✓ users/${userDocId(u.i)} (${u.displayName})`);
  }
}

async function seedApplicants() {
  console.log("[seed] partnerApplicants — 5명 pending");
  for (const a of APPLICANTS) {
    const ownerUid =
      a.ownerUidOverride ??
      (a.matchedUserIndex !== null ? userDocId(a.matchedUserIndex) : null);
    if (!ownerUid) throw new Error("ownerUid 결정 불가");
    const id = `dummy-cycle22-applicant-${a.i}`;
    const ref = db.collection("partnerApplicants").doc(id);
    await ref.set({
      ownerUid,
      businessName: a.businessName,
      email: a.email,
      phone: a.phone,
      category: a.category,
      regionLabel: a.regionLabel,
      intro: a.intro,
      status: "pending",
      appliedAt: daysAgo(a.days),
      reviewedAt: null,
      reviewedBy: null,
      rejectReason: null,
      partnerId: null,
      seedTag: SEED_TAG,
    });
    console.log(`  ✓ partnerApplicants/${id} (${a.businessName} → ownerUid=${ownerUid})`);
  }
}

async function seedPartners() {
  console.log("[seed] partners — 3명 active");
  for (const p of PARTNERS) {
    const ownerUid =
      p.ownerUidOverride ??
      (p.matchedUserIndex !== null ? userDocId(p.matchedUserIndex) : null);
    if (!ownerUid) throw new Error("ownerUid 결정 불가");
    const id = `dummy-cycle22-partner-${p.i}`;
    const ref = db.collection("partners").doc(id);
    await ref.set({
      ownerUid,
      businessName: p.businessName,
      logoUrl: null,
      category: p.category,
      regionLabel: p.regionLabel,
      status: "active",
      autoPublish: { ...DEFAULT_AUTO_PUBLISH },
      issuedAt: daysAgo(p.days),
      issuedBy: "seed-dummy",
      notes: p.notes,
      updatedAt: FieldValue.serverTimestamp(),
      seedTag: SEED_TAG,
    });
    console.log(`  ✓ partners/${id} (${p.businessName} → ownerUid=${ownerUid})`);
  }
}

async function main() {
  console.log("=== cycle #22 dummy seed start ===");
  console.log(`Project: ${sa.project_id}`);
  console.log(`Tag: ${SEED_TAG}\n`);

  await seedAuth();
  console.log("");
  await seedUsers();
  console.log("");
  await seedApplicants();
  console.log("");
  await seedPartners();

  console.log("\n=== ✅ done ===");
  console.log("Total: 18 docs (users 10 + applicants 5 + partners 3)");
  console.log("\n시각 확인:");
  console.log("  /admin/partners/new [전체 명단] — 10 카드 (5 활성, 2 ✅, 3 ⏳)");
  console.log("  /admin/partners/new [신청자 명단] — 5 카드");
  console.log("  /admin/partners — '발급된 파트너' 섹션 3건 추가");
  console.log("  /admin (대시보드) — '대기 신청' 카운트 5 + 활성 의뢰업체 카운트 3");
  console.log("\n cleanup: scripts/cleanup-dummy-partners.mjs (필요 시 작성)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
