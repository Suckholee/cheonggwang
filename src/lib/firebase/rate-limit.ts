import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import {
  RATE_LIMIT_BUCKET_MS,
  RATE_LIMIT_PER_MIN,
  RATE_LIMIT_TTL_MS,
} from "@/domain/constants";
import { AppError } from "@/lib/errors";

const COLLECTION = "rateLimits";

/**
 * Firestore 트랜잭션 기반 rate limiter.
 * 버킷 도큐먼트는 `ttlExpiresAt` + Firestore TTL 정책으로 자동 삭제.
 *
 * ## Overloads
 * - 1-arg (legacy): `checkAndIncrement(uid, limit?)` — `RATE_LIMIT_BUCKET_MS` / `RATE_LIMIT_TTL_MS` 기본값.
 *   기존 `/api/generate`가 `uid` 단일 인자로 호출 (v0.1 promo-page 시절).
 * - 3-arg (v1 marketplace): `checkAndIncrement(key, limit, windowMs)` — 임의 key prefix + 커스텀 윈도우.
 *   e.g. `'quote:<uid>'`, 1시간 5건.
 *
 * TTL 정책: Firestore 콘솔 > TTL > `rateLimits.ttlExpiresAt` 활성화.
 */
export async function checkAndIncrement(
  key: string,
  limit?: number,
  windowMs?: number,
): Promise<void> {
  const effectiveLimit = limit ?? RATE_LIMIT_PER_MIN;
  const effectiveWindow = windowMs ?? RATE_LIMIT_BUCKET_MS;
  const ttlMs = windowMs ? windowMs * 2 : RATE_LIMIT_TTL_MS;

  const bucket = Math.floor(Date.now() / effectiveWindow);
  const docRef = adminDb.collection(COLLECTION).doc(`${key}_${bucket}`);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    const current = snap.exists ? ((snap.data()!.count as number) ?? 0) : 0;
    if (current >= effectiveLimit) {
      throw new AppError(
        "RATE_LIMITED",
        "요청이 많습니다. 잠시 후 다시 시도해주세요",
      );
    }
    if (snap.exists) {
      tx.update(docRef, { count: FieldValue.increment(1) });
    } else {
      tx.set(docRef, {
        key,
        bucket,
        count: 1,
        firstAt: FieldValue.serverTimestamp(),
        ttlExpiresAt: Timestamp.fromMillis(Date.now() + ttlMs),
      });
    }
  });
}
