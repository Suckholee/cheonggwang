/**
 * cycle #22 더미 파트너 3명의 profile.photoUrls 외부 URL → Firebase Storage 마이그레이션.
 *
 * R8 검증 (zod refine: /\/partners\/[^/]+\/profile\//) 통과를 위해
 * Storage path를 `partners/{ownerUid}/profile/{filename}` 형태로 저장.
 * storage.rules의 `partners/{uid}/{postId}/{fileName}` 패턴이 이미 커버함 (postId='profile').
 *
 * 동작:
 *   1. partners/dummy-cycle22-partner-{0,1,2} 3개 doc 읽기
 *   2. profile.photoUrls 중 firebasestorage.googleapis.com 아닌 외부 URL만 마이그레이션
 *   3. 다운로드 → Storage upload → download URL (token) 발급
 *   4. partner doc의 profile.photoUrls 업데이트
 *
 * Idempotent: 이미 Storage URL인 항목은 스킵. 다시 돌려도 같은 결과.
 *
 * 사용:
 *   node --env-file=.env.local scripts/migrate-seed-photos-to-storage.mjs
 *   또는 FIREBASE_ADMIN_SA_BASE64=... node scripts/migrate-seed-photos-to-storage.mjs
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  `${sa.project_id}.firebasestorage.app`;

if (getApps().length === 0) {
  initializeApp({
    credential: cert(sa),
    projectId: sa.project_id,
    storageBucket: STORAGE_BUCKET,
  });
}
const db = getFirestore();
const bucket = getStorage().bucket();

const PARTNER_IDS = [
  "dummy-cycle22-partner-0",
  "dummy-cycle22-partner-1",
  "dummy-cycle22-partner-2",
];

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${url} (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { buf, contentType };
}

async function uploadToStorage(ownerUid, index, buf, contentType) {
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const filename = `seed-${index}.${ext}`;
  const path = `partners/${ownerUid}/profile/${filename}`;
  const file = bucket.file(path);
  const token = randomUUID();
  await file.save(buf, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
    resumable: false,
  });
  // R8 통과 형식: decoded path에 /partners/{uid}/profile/ 포함
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function migratePartner(partnerId) {
  const ref = db.collection("partners").doc(partnerId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.warn(`  ✗ ${partnerId} not found, skip`);
    return;
  }
  const data = snap.data();
  const ownerUid = data?.ownerUid;
  const photoUrls = data?.profile?.photoUrls;
  if (!ownerUid) {
    console.warn(`  ✗ ${partnerId} has no ownerUid`);
    return;
  }
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) {
    console.warn(`  ✗ ${partnerId} has no profile.photoUrls`);
    return;
  }

  console.log(`  · ${partnerId} (owner=${ownerUid}) - ${photoUrls.length} photos`);
  const newUrls = [];
  for (let i = 0; i < photoUrls.length; i++) {
    const original = photoUrls[i];
    if (original.includes("firebasestorage.googleapis.com")) {
      console.log(`    ${i}: already in Storage, keep`);
      newUrls.push(original);
      continue;
    }
    console.log(`    ${i}: download ${original.slice(0, 60)}...`);
    try {
      const { buf, contentType } = await downloadImage(original);
      const newUrl = await uploadToStorage(ownerUid, i, buf, contentType);
      console.log(`    ${i}: -> partners/${ownerUid}/profile/seed-${i}.${contentType.includes("png") ? "png" : "jpg"}`);
      newUrls.push(newUrl);
    } catch (err) {
      console.warn(`    ${i}: ⚠ skip (${err.message})`);
    }
  }

  await ref.update({
    "profile.photoUrls": newUrls,
    "profile.updatedAt": FieldValue.serverTimestamp(),
  });
  console.log(`  ✓ ${partnerId} updated (${newUrls.length} URLs)\n`);
}

async function main() {
  console.log("=== migrate seed photos → Storage ===");
  console.log(`Project: ${sa.project_id}`);
  console.log(`Bucket:  ${bucket.name}\n`);
  for (const id of PARTNER_IDS) {
    await migratePartner(id);
  }
  console.log("✅ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
