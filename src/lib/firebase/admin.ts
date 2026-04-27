import "server-only";
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAppCheck, type AppCheck } from "firebase-admin/app-check";
import { getStorage, type Storage } from "firebase-admin/storage";

function buildCredential() {
  const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return cert(json);
  }
  return applicationDefault();
}

type AdminGlobal = { __firebaseAdminApp?: App };
const globalForAdmin = globalThis as unknown as AdminGlobal;

export const adminApp: App =
  globalForAdmin.__firebaseAdminApp ??
  (globalForAdmin.__firebaseAdminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: buildCredential(),
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        // v1.7: partner-promo 업로드/정리에서 Admin SDK가 bucket()으로 접근.
        // NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET 우선, 없으면 {projectId}.firebasestorage.app fallback.
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          (process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            ? `${
                process.env.FIREBASE_PROJECT_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
              }.firebasestorage.app`
            : undefined),
      }));

export const adminDb: Firestore = (() => {
  const db = getFirestore(adminApp);
  // cycle #26 hotfix: undefined 필드를 Firestore가 거부하지 않고 무시하도록.
  // cycle #25 generationMeta.cardNewsValidationFailed 같은 optional flag가 undefined일 때 안전.
  // settings()는 초기화 직후 1회만 호출 가능 — 두 번째 호출 시 throw하므로 try/catch로 보호.
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    /* already configured */
  }
  return db;
})();
export const adminAuth: Auth = getAuth(adminApp);
export const adminAppCheck: AppCheck = getAppCheck(adminApp);
export const adminStorage: Storage = getStorage(adminApp);

/**
 * v1.6: Admin SDK bucket name 명시 해석.
 * `initializeApp({ storageBucket })` 가 누락된 레거시 cold-start를 대비해
 * 호출부에서 bucket name을 직접 전달할 수 있도록 헬퍼 제공.
 */
export function getStorageBucketName(): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      ""
    }.firebasestorage.app`
  );
}
