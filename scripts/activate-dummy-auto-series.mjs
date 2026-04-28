/**
 * cycle #27 partner-series-queue — 시연용 더미 파트너 일괄 활성화.
 *
 * 사진이 등록된 모든 active 더미 파트너에게:
 *   - autoPublish: 매일 06:00–23:00 KST (테스트용 넓은 윈도우)
 *   - autoSeries: enabled, photoCursor=0 추가
 *
 * 사용:
 *   node --env-file=.env.local scripts/activate-dummy-auto-series.mjs
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

async function main() {
  console.log("=== activating dummy auto-series ===");
  const snap = await db.collection("partners").where("status", "==", "active").get();
  let activated = 0;
  let skipped = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const photos = d?.profile?.photoUrls?.length ?? 0;
    if (photos === 0) {
      console.log(`  - skip ${doc.id} (${d.businessName}) — no photos`);
      skipped++;
      continue;
    }

    const existingAutoSeries = d?.autoSeries ?? {};
    await doc.ref.update({
      autoPublish: {
        enabled: true,
        weekdays: [0, 1, 2, 3, 4, 5, 6], // 매일
        startMinute: 6 * 60, // 06:00
        endMinute: 23 * 60, // 23:00
        timezone: "Asia/Seoul",
      },
      autoSeries: {
        enabled: true,
        lastIndex: existingAutoSeries.lastIndex ?? -1,
        lastTickAt: existingAutoSeries.lastTickAt ?? null,
        brandTone: existingAutoSeries.brandTone ?? "friendly",
        totalPublished: existingAutoSeries.totalPublished ?? 0,
        totalFailed: existingAutoSeries.totalFailed ?? 0,
        photoCursor: existingAutoSeries.photoCursor ?? 0, // cycle #27 C1
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(
      `  ✓ ${doc.id} (${d.businessName}) — photos=${photos}, window 06–23 매일 ON`,
    );
    activated++;
  }
  console.log(`\nactivated: ${activated} · skipped (no photos): ${skipped}`);
  console.log("\n다음 cron tick(09:00 KST 또는 manual trigger) 시 모두 발행 시도");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
