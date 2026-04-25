/**
 * posts 컬렉션 `postType` 백필 스크립트 (v1.6 community-feed-3panel).
 *
 * 목적:
 *   기존 posts 문서는 `postType` 필드 없음 → v1.6 이후 3패널 피드는 postType 필터 필수.
 *   이 스크립트는 누락된 문서에 `postType: 'provider'` 를 일괄 셋팅 (기존 문서는 모두 공급자 작성).
 *
 * 안전 장치:
 *   - 기본 dry-run (실제 쓰기 없음). 확인 후 --apply 로 실행.
 *   - 배치 500건 · set merge:true (기존 필드 보존).
 *   - postType 이미 있는 문서는 skip.
 *
 * 사용:
 *   # 1) dry-run (기본)
 *   node --env-file=.env.local scripts/backfill-posts-post-type.mjs
 *
 *   # 2) 실행
 *   node --env-file=.env.local scripts/backfill-posts-post-type.mjs --apply
 *
 * 롤백:
 *   postType 필드가 존재하더라도 toPost()는 'tip'/'partner-promo' 외의 값은 'provider'로 매핑.
 *   단순 필드 추가이므로 런타임 롤백 불필요.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const BATCH_SIZE = 500;

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });

const db = getFirestore();

async function main() {
  console.log(`[backfill-posts-post-type] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);

  const snap = await db.collection("posts").get();
  console.log(`[backfill-posts-post-type] total posts: ${snap.size}`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let pending = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.postType === "string") {
      skipped++;
      continue;
    }
    if (APPLY) {
      batch.set(doc.ref, { postType: "provider" }, { merge: true });
      pending++;
      if (pending >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    updated++;
  }

  if (APPLY && pending > 0) {
    await batch.commit();
  }

  console.log(
    `[backfill-posts-post-type] updated=${updated} skipped=${skipped} total=${snap.size} mode=${APPLY ? "APPLY" : "DRY-RUN"}`,
  );
  if (!APPLY && updated > 0) {
    console.log(
      `[backfill-posts-post-type] run with --apply to commit ${updated} write(s)`,
    );
  }
}

main().catch((err) => {
  console.error("[backfill-posts-post-type] FAILED", err);
  process.exit(1);
});
