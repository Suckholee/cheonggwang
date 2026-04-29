import type { Firestore, Timestamp } from "firebase-admin/firestore";

/**
 * v1.18 cycle #31 tips-admin-config · §3.5 functions side mirror.
 *
 * Cloud Functions runtime config read — runner.ts에서 매 tick fetch (OQ4 결의 — 변경 즉시 반영).
 *
 * ⚠️ MIRROR with src/lib/tips/tips-config.ts.
 *    CI lint: scripts/check-queue-mirror.mjs (TipsAutoConfig 양 패키지).
 */

export interface TipsAutoConfig {
  enabled: boolean;
  updatedAt: Date;
  updatedBy: "admin";
}

export const DEFAULT_TIPS_AUTO_CONFIG: TipsAutoConfig = {
  enabled: true,
  updatedAt: new Date(0),
  updatedBy: "admin",
};

/**
 * Firestore `system/tipsAutoConfig` doc read.
 * doc 미존재 → R12 fallback (cycle #30 동작 유지).
 */
export async function readTipsAutoConfig(
  db: Firestore,
): Promise<TipsAutoConfig> {
  const snap = await db.collection("system").doc("tipsAutoConfig").get();
  if (!snap.exists) {
    return { ...DEFAULT_TIPS_AUTO_CONFIG };
  }
  const d = snap.data()!;
  return {
    enabled: d.enabled !== false,
    updatedAt: (d.updatedAt as Timestamp)?.toDate?.() ?? new Date(0),
    updatedBy: "admin",
  };
}
