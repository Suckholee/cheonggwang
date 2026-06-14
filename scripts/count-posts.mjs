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

async function main() {
  const snap = await db.collection("posts").get();
  const counts = {};
  for (const doc of snap.docs) {
    const data = doc.data();
    const type = data.postType || "undefined";
    const status = data.publishStatus || "undefined";
    const key = `${type} / ${status}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  console.log("Post counts by type/status:");
  console.log(JSON.stringify(counts, null, 2));
}

main().catch(console.error);
