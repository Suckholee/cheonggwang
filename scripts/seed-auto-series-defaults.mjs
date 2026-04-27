/**
 * cycle #26 partner-auto-series — 더미 파트너 시연용 시드.
 *
 * 강남 코워킹스페이스(dummy-cycle22-partner-0)에 autoSeries.enabled=true 설정.
 *  - autoPublish: 화·목 09:00–18:00 KST
 *  - autoSeries: enabled, lastIndex=-1, brandTone='friendly'
 *
 * 시연: 화/목 09–18시 사이에 cron tick → 자동 발행.
 *
 * 사용:
 *   node --env-file=.env.local scripts/seed-auto-series-defaults.mjs
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

const TARGETS = [
  {
    partnerId: "dummy-cycle22-partner-0", // 강남 코워킹스페이스
    brandTone: "friendly",
  },
];

async function seedOne(target) {
  const ref = db.collection("partners").doc(target.partnerId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn(`  ✗ partners/${target.partnerId} not found, skip`);
    return;
  }

  const data = snap.data();
  const photoCount = data?.profile?.photoUrls?.length ?? 0;
  if (photoCount === 0) {
    console.warn(
      `  ✗ partners/${target.partnerId} has no profile.photoUrls, skip`,
    );
    return;
  }

  await ref.update({
    // autoPublish — 화(2)·목(4) 09:00–18:00 KST
    autoPublish: {
      enabled: true,
      weekdays: [2, 4],
      startMinute: 9 * 60,
      endMinute: 18 * 60,
      timezone: "Asia/Seoul",
    },
    autoSeries: {
      enabled: true,
      lastIndex: -1,
      lastTickAt: null,
      brandTone: target.brandTone,
      totalPublished: 0,
      totalFailed: 0,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(
    `  ✓ partners/${target.partnerId} (${data.businessName}) autoSeries=ON · 화·목 09–18시 KST`,
  );
}

async function main() {
  console.log("=== seed cycle #26 auto-series defaults ===");
  console.log(`Project: ${sa.project_id}`);
  for (const t of TARGETS) {
    await seedOne(t);
  }
  console.log("\n✅ done");
  console.log("\n시연: 화·목 09–18시 KST에 Cloud Functions cron tick 실행 시");
  console.log("       angle/format 라운드 로빈으로 자동 발행됨.");
  console.log("       /partner/series · /admin/auto-series 에서 확인 가능.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
