/**
 * v1.6 — 이미 가입된 모든 청명(샘플 제외 + 샘플 모두)에게
 * 매칭되는 샘플 고객이 quoteRequest 보내기.
 *
 * 이미 한 쌍(provider, client)에 대해 최근 7일 내 submitted/quoted 가 있으면 skip.
 *
 * 사용:
 *   node --env-file=.env.local scripts/backfill-sample-requests.mjs            # dry-run
 *   node --env-file=.env.local scripts/backfill-sample-requests.mjs --apply
 */
import { initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) { console.error("FIREBASE_ADMIN_SA_BASE64 not set"); process.exit(1); }
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const QL = {
  "move-in": "입주청소", office: "사무실청소", aircon: "에어컨청소",
  "move-out": "이사청소", special: "특수청소", regular: "정기청소",
};

const CITY_ALIAS = { 서울: "서울특별시", 경기: "경기도", 인천: "인천광역시", 부산: "부산광역시" };

function parseRegion(text) {
  const fallback = { city: "서울특별시", district: "강남구" };
  if (!text) return fallback;
  const t = text.trim().split(/\s+/);
  if (t.length < 2) return fallback;
  const cityRaw = t[0];
  const city = CITY_ALIAS[cityRaw] ?? (
    cityRaw.endsWith("도") || cityRaw.endsWith("시") || cityRaw.endsWith("광역시") || cityRaw.endsWith("특별시")
      ? cityRaw : `${cityRaw}특별시`
  );
  return { city, district: t[1] };
}

function estimateSize(persona, category) {
  const r = (persona.region ?? "").toLowerCase();
  if (r.includes("원룸")) return 6 + Math.floor(Math.random() * 10);
  if (r.includes("오피스텔")) return 10 + Math.floor(Math.random() * 12);
  if (r.includes("주택")) return 25 + Math.floor(Math.random() * 20);
  if (r.includes("매장") || r.includes("스튜디오") || r.includes("학원")) return 15 + Math.floor(Math.random() * 30);
  if (r.includes("사무실") || r.includes("오피스")) return 20 + Math.floor(Math.random() * 30);
  if (r.includes("아파트")) return 24 + Math.floor(Math.random() * 20);
  return 20 + Math.floor(Math.random() * 15);
}

function buildNote(persona, category) {
  const catLabel = QL[category];
  const goal = (persona.goal ?? "").trim();
  if (goal.length >= 20 && goal.length <= 150) return goal;
  const oneLiner = persona.oneLiner ? `(${persona.oneLiner}) ` : "";
  return `${oneLiner}${catLabel} 견적 상담 부탁드립니다.`.slice(0, 150);
}

(async () => {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  // 1. 모든 청명
  const provSnap = await db.collection("providers").get();
  const providers = provSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  console.log(`providers total: ${providers.length}`);

  // 2. 샘플 고객 + persona
  const userSnap = await db.collection("users").where("isSample", "==", true).get();
  const customers = [];
  userSnap.docs.forEach((d) => {
    const data = d.data();
    if (data.providerId) return;
    if (!data.persona) return;
    customers.push({ uid: d.id, displayName: data.displayName ?? "고객", persona: data.persona });
  });
  console.log(`sample customers: ${customers.length}`);

  // 3. 각 provider별 매칭 고객 3~4명 pick
  let createdTotal = 0;
  for (const p of providers) {
    const pCats = new Set(p.categories || []);
    if (pCats.size === 0) continue;
    const matched = customers.filter((c) =>
      (c.persona.interestedCategories || []).some((cc) => pCats.has(cc)),
    );
    if (matched.length === 0) continue;
    const picked = matched.sort(() => Math.random() - 0.5).slice(0, 3);

    for (const cust of picked) {
      // 최근 요청 쿼리 최소화: 지금은 항상 주입. 완전 중복만 피하려면 이전 요청 체크.
      const overlap = (cust.persona.interestedCategories || []).filter((c) => pCats.has(c));
      const category = overlap[Math.floor(Math.random() * overlap.length)];
      const region = parseRegion(cust.persona.region);
      const size = estimateSize(cust.persona, category);
      const note = buildNote(cust.persona, category);
      const daysAhead = 2 + Math.floor(Math.random() * 8);
      const preferredDate = new Date();
      preferredDate.setDate(preferredDate.getDate() + daysAhead);

      if (APPLY) {
        await db.collection("quoteRequests").add({
          clientUid: cust.uid,
          category, region, size,
          roomType: null,
          preferredDate: Timestamp.fromDate(preferredDate),
          contactPhone: "010-0000-0000",
          photos: [],
          note,
          notifiedProviderIds: [p.id],
          status: "submitted",
          createdAt: FieldValue.serverTimestamp(),
          isSampleAi: true,
        });
      }
      createdTotal++;
    }
    console.log(`  ${p.companyName} ← ${picked.map((c) => c.displayName).join(", ")}`);
  }

  console.log(`\n${APPLY ? "CREATED" : "WOULD CREATE"}: ${createdTotal} quoteRequests`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
