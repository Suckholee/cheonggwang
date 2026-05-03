import type { Firestore, Timestamp } from "firebase-admin/firestore";

/**
 * v1.18 cycle #31 tips-admin-config · §3.5 functions side mirror.
 * v1.19 cycle #32 tips-schedule-editor · §3.1 — schedule 필드 + DEFAULT_SCHEDULE
 *   + parseScheduleOrDefault 가드 (R-H5 — Next.js 측과 동일 가드).
 *
 * Cloud Functions runtime config read — runner.ts에서 매 tick fetch (OQ4 결의 — 변경 즉시 반영).
 *
 * ⚠️ MIRROR with src/lib/tips/tips-config.ts. R-M4 — TipsScheduleAuditEvent는 Next.js 단독.
 *    CI lint: scripts/check-queue-mirror.mjs (TipsAutoConfig + TipsScheduleConfig 양 패키지).
 */

// ───────────────── Schedule (cycle #32) ─────────────────

export interface TipsScheduleConfig {
  /** 0..23 (KST) */
  hour: number;
  /** ⊂ {0..6}, sorted, unique. 최소 1개. */
  daysOfWeek: number[];
}

export const DEFAULT_SCHEDULE: TipsScheduleConfig = {
  hour: 9,
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 매일 09:30 KST (R12 fallback)
};

/**
 * daysOfWeek dedupe + ascending sort — 단일 진실 함수.
 * `parseScheduleOrDefault` 읽기 시 적용되어 runner gate 비교 stable 보장.
 *
 * ⚠️ Next.js side `src/lib/tips/tips-config.ts`의 동일 helper와 mirror.
 */
export function normalizeDaysOfWeek(dows: number[]): number[] {
  return [...new Set(dows)].sort((a, b) => a - b);
}

// ───────────────── Auto Config ─────────────────

export interface TipsAutoConfig {
  enabled: boolean;
  updatedAt: Date;
  updatedBy: "admin";
  /** cycle #32 — schedule R12 sub-fallback */
  schedule: TipsScheduleConfig;
}

export const DEFAULT_TIPS_AUTO_CONFIG: TipsAutoConfig = {
  enabled: true,
  updatedAt: new Date(0),
  updatedBy: "admin",
  schedule: DEFAULT_SCHEDULE,
};

/**
 * Firestore `system/tipsAutoConfig` doc read.
 * doc 미존재 → R12 fallback (cycle #30 동작 유지).
 * schedule 필드 corrupt 시 parseScheduleOrDefault 가드 (R-H5).
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
    schedule: parseScheduleOrDefault(d.schedule),
  };
}

/**
 * Corrupt 값(예: hour=25, daysOfWeek=[7,99])이라도 graceful fallback.
 * Next.js 측 tips-config-repository.ts의 parseScheduleOrDefault와 동일 로직.
 */
function parseScheduleOrDefault(raw: unknown): TipsScheduleConfig {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (
      typeof r.hour === "number" &&
      Number.isInteger(r.hour) &&
      r.hour >= 0 &&
      r.hour <= 23 &&
      Array.isArray(r.daysOfWeek) &&
      r.daysOfWeek.every(
        (n: unknown) =>
          typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 6,
      ) &&
      r.daysOfWeek.length > 0
    ) {
      return {
        hour: r.hour,
        daysOfWeek: normalizeDaysOfWeek(r.daysOfWeek as number[]),
      };
    }
  }
  return { ...DEFAULT_SCHEDULE };
}
