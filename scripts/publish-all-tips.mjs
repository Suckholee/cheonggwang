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

async function main() {
  const snap = await db.collection("posts")
    .where("postType", "==", "tip")
    .where("publishStatus", "==", "draft")
    .get();

  console.log(`Found ${snap.size} draft tips to publish.`);

  if (snap.empty) {
    return;
  }

  const batch = db.batch();
  for (const doc of snap.docs) {
    const data = doc.data();
    batch.update(doc.ref, {
      publishStatus: "published",
      publishedAt: data.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  console.log("Successfully published all draft tips!");
}

main().catch(console.error);
