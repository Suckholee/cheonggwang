import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });

const db = getFirestore();
const snap = await db.collection("pages").get();
console.log("\n=== 발행된 페이지 ===");
for (const doc of snap.docs) {
  const d = doc.data();
  if (d.published) {
    console.log(`\n• pageId: ${doc.id}`);
    console.log(`  businessName: ${d.businessName}`);
    console.log(`  slug: ${d.slug}`);
    console.log(`  → http://localhost:3000/p/${d.slug}`);
  }
}
const drafts = snap.docs.filter((d) => !d.data().published);
if (drafts.length > 0) {
  console.log(`\n=== 초안(미발행) ${drafts.length}개 ===`);
  for (const doc of drafts) {
    console.log(`  ${doc.id}: ${doc.data().businessName}`);
  }
}
process.exit(0);
