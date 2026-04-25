/**
 * 일회성 — 방금 backfill-sample-threads 로 잘못 만든 thread 정리.
 * 기준:
 *   - isSampleAi === true (샘플로 생성된 것만)
 *   - quoteId === null (견적 없이 먼저 만들어진 잘못된 thread)
 *   - senderRole=client 인 초기 메시지만 있음
 *
 * 안전장치: 메시지 서브컬렉션도 전부 삭제.
 *
 * 사용:  node --env-file=.env.local scripts/cleanup-sample-threads.mjs --apply
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) { console.error("FIREBASE_ADMIN_SA_BASE64 not set"); process.exit(1); }
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

(async () => {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  const snap = await db.collection("threads").where("isSampleAi", "==", true).get();
  let toDelete = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.quoteId == null) {
      toDelete.push(d);
    }
  }
  console.log(`threads to delete: ${toDelete.length}`);

  if (APPLY) {
    let deletedThreads = 0;
    let deletedMessages = 0;
    for (const t of toDelete) {
      const msgs = await t.ref.collection("messages").get();
      const batch = db.batch();
      msgs.docs.forEach(m => { batch.delete(m.ref); });
      batch.delete(t.ref);
      await batch.commit();
      deletedThreads++;
      deletedMessages += msgs.size;
    }
    console.log(`deleted threads=${deletedThreads} messages=${deletedMessages}`);
  } else {
    toDelete.slice(0, 5).forEach(t => {
      const d = t.data();
      console.log(`  - ${t.id} · client=${(d.clientUid||'').slice(-8)} · provider=${d.companyName || d.providerId}`);
    });
    if (toDelete.length > 5) console.log(`  ... +${toDelete.length - 5} more`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
