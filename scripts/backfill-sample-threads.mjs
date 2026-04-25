/**
 * v1.6 — 기존 isSampleAi quoteRequest 중 thread 가 아직 없는 건에 대해
 * thread + 고객의 초기 문의 메시지를 주입.
 *
 * 사용:
 *   node --env-file=.env.local scripts/backfill-sample-threads.mjs          # dry-run
 *   node --env-file=.env.local scripts/backfill-sample-threads.mjs --apply
 */
import { initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
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

function threadId(requestId, providerId) {
  return `${requestId}__${providerId}`;
}

function maskName(name) {
  if (!name) return "고객";
  if (name.length <= 2) return name[0] + "*";
  return name[0] + "*" + name.slice(-1);
}

function buildOpener(persona, category) {
  const catLabel = QL[category];
  const occupation = persona.occupation ?? "회사원";
  const r = persona.region ?? "";
  const housing = r.includes("원룸") ? "원룸"
    : r.includes("오피스텔") ? "오피스텔"
    : r.includes("아파트") ? "아파트"
    : r.includes("주택") ? "주택"
    : r.includes("사무실") || r.includes("오피스") ? "사무실"
    : r.includes("매장") ? "매장"
    : r.includes("스튜디오") ? "스튜디오"
    : r.includes("학원") ? "학원" : "집";
  const openers = [
    `안녕하세요! ${occupation}이고 ${housing}에 살고 있어요. ${catLabel} 견적 상담 가능할까요?`,
    `안녕하세요~ ${catLabel} 관련 문의 드려요. 제가 ${occupation}이라 일정이 타이트해서 편한 시간에 상담 가능하면 좋겠어요 🙏`,
    `안녕하세요. ${housing} ${catLabel} 필요해서 연락드립니다. 대략 비용하고 일정 어떻게 되는지 궁금합니다.`,
    `안녕하세요! 청광에서 보고 연락드려요. ${catLabel} 견적 받고 싶은데 방문 없이도 대략 가능할까요?`,
    `안녕하세요, ${occupation} 입니다. ${catLabel} 예약 가능한 날짜 먼저 여쭤봐도 될까요?`,
  ];
  return openers[Math.floor(Math.random() * openers.length)];
}

(async () => {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  // 1. 모든 샘플 요청
  const reqSnap = await db.collection("quoteRequests").where("isSampleAi", "==", true).get();
  console.log(`sample requests: ${reqSnap.size}`);

  // 2. provider + customer user 딕셔너리 미리 로드
  const personaByUid = new Map();
  const nameByUid = new Map();
  const userSnap = await db.collection("users").where("isSample", "==", true).get();
  userSnap.docs.forEach(d => {
    const data = d.data();
    if (data.persona) personaByUid.set(d.id, data.persona);
    if (data.displayName) nameByUid.set(d.id, data.displayName);
  });

  const providerSnap = await db.collection("providers").get();
  const providerById = new Map();
  providerSnap.docs.forEach(d => {
    providerById.set(d.id, d.data());
  });

  let createdThreads = 0;
  let skippedExists = 0;
  let skippedMissing = 0;

  for (const r of reqSnap.docs) {
    const reqId = r.id;
    const data = r.data();
    const providerIds = data.notifiedProviderIds || [];
    if (providerIds.length === 0) { skippedMissing++; continue; }
    const providerId = providerIds[0];
    const prov = providerById.get(providerId);
    if (!prov) { console.log(`  skip: provider ${providerId} not found (req ${reqId})`); skippedMissing++; continue; }
    const tid = threadId(reqId, providerId);
    const threadRef = db.collection("threads").doc(tid);
    const existing = await threadRef.get();
    if (existing.exists) { skippedExists++; continue; }

    const persona = personaByUid.get(data.clientUid) || {};
    const displayName = nameByUid.get(data.clientUid) || "고객";
    const opener = buildOpener(persona, data.category);

    if (APPLY) {
      const msgRef = threadRef.collection("messages").doc();
      await db.runTransaction(async (tx) => {
        tx.create(threadRef, {
          clientUid: data.clientUid,
          providerId,
          providerOwnerUid: prov.ownerUid || "",
          requestId: reqId,
          quoteId: null,
          companyName: prov.companyName || "청광 청명",
          clientDisplayName: maskName(displayName),
          lastMessageAt: FieldValue.serverTimestamp(),
          lastMessagePreview: opener.slice(0, 80),
          lastMessageSenderUid: data.clientUid,
          unreadByClient: 0,
          unreadByProvider: 1,
          createdAt: FieldValue.serverTimestamp(),
          isSampleAi: true,
        });
        tx.create(msgRef, {
          threadId: tid,
          senderUid: data.clientUid,
          senderRole: "client",
          type: "text",
          text: opener,
          createdAt: FieldValue.serverTimestamp(),
          isSampleAi: true,
        });
      });
    }
    console.log(`  + ${displayName} → ${prov.companyName || providerId} : "${opener.slice(0, 30)}..."`);
    createdThreads++;
  }

  console.log(`\ndone · createdThreads=${createdThreads} existed=${skippedExists} missing=${skippedMissing}`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
