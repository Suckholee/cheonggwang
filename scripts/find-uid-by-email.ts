/**
 * Firebase Auth email → uid 조회 (운영진 CLI 헬퍼).
 *
 *   pnpm dlx dotenv-cli -e .env.local -- pnpm dlx tsx scripts/find-uid-by-email.ts <email>
 */

import {
  initializeApp,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("usage: tsx scripts/find-uid-by-email.ts <email>");
  process.exit(1);
}

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
initializeApp({
  credential: b64
    ? cert(JSON.parse(Buffer.from(b64, "base64").toString("utf8")))
    : applicationDefault(),
  projectId:
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

getAuth()
  .getUserByEmail(email)
  .then((u) => {
    console.log(`uid:         ${u.uid}`);
    console.log(`displayName: ${u.displayName ?? "(none)"}`);
    console.log(`email:       ${u.email}`);
    console.log(`provider:    ${u.providerData[0]?.providerId ?? "(none)"}`);
    console.log(`created:     ${u.metadata.creationTime}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("Auth 조회 실패:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
