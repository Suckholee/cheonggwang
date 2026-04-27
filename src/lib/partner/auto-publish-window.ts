import { z } from "zod";
import type { AutoPublishConfig, Partner } from "@/types/partner";

/**
 * v1.7 partner-promo — 자동 발행 윈도우 판정·검증·다음 윈도우 계산.
 *
 * - timezone: 'Asia/Seoul' 고정 (v1).
 * - 자정 넘김 윈도우(예: 22:00–02:00)는 **v1 미지원** — startMinute < endMinute 강제.
 * - 분 단위: [0..1439] / [1..1440].
 * - weekdays: 0=Sun..6=Sat.
 */

/**
 * 주어진 시각이 윈도우 안에 있는지 판정.
 *
 *  - cfg.enabled = false           → false
 *  - cfg.weekdays.length === 0     → false
 *  - 현재 KST 요일이 weekdays에 없음 → false
 *  - minute ∈ [startMinute, endMinute) → true
 */
export function isInAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
): boolean {
  if (!cfg.enabled) return false;
  if (cfg.weekdays.length === 0) return false;
  const kst = toKST(now);
  if (!cfg.weekdays.includes(kst.getDay())) return false;
  const minute = kst.getHours() * 60 + kst.getMinutes();
  return minute >= cfg.startMinute && minute < cfg.endMinute;
}

/**
 * KST 변환.
 * `Date#toLocaleString('en-US', { timeZone: 'Asia/Seoul' })`로 변환된 문자열을 다시 Date로 파싱하면
 * 호스트 로컬 타임존을 가진 "벽시계 KST" Date를 얻을 수 있다.
 *  - getDay/getHours/getMinutes는 호스트 타임존 기준이지만, 위 변환으로 KST 벽시계 값이 들어가 있으므로
 *    그대로 KST로 해석해도 안전.
 */
export function toKST(d: Date): Date {
  const kstStr = d.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  return new Date(kstStr);
}

/**
 * Zod 스키마 — settings PATCH 검증.
 *  - startMinute ∈ [0,1439]
 *  - endMinute   ∈ [1,1440]
 *  - startMinute < endMinute (자정 넘김 미지원)
 *  - enabled=true 인데 weekdays 빈 배열 → 거부 (의도가 없으면 enabled=false 권장)
 */
export const autoPublishConfigSchema = z
  .object({
    enabled: z.boolean(),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .max(7),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    timezone: z.literal("Asia/Seoul"),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.startMinute >= cfg.endMinute) {
      ctx.addIssue({
        code: "custom",
        message: "시작 시간은 종료 시간보다 빨라야 합니다",
        path: ["endMinute"],
      });
    }
    if (cfg.enabled && cfg.weekdays.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "활성화하려면 최소 1일은 선택해 주세요",
        path: ["weekdays"],
      });
    }
    // 중복 weekday 체크
    if (new Set(cfg.weekdays).size !== cfg.weekdays.length) {
      ctx.addIssue({
        code: "custom",
        message: "요일이 중복되었습니다",
        path: ["weekdays"],
      });
    }
  });

export function validateAutoPublishConfig(
  input: unknown,
):
  | { ok: true; data: AutoPublishConfig }
  | { ok: false; message: string } {
  const r = autoPublishConfigSchema.safeParse(input);
  if (!r.success) {
    return {
      ok: false,
      message: r.error.issues.map((i) => i.message).join(", "),
    };
  }
  // weekdays 정렬·dedupe (안정성)
  const weekdays = Array.from(new Set(r.data.weekdays)).sort(
    (a, b) => a - b,
  );
  return { ok: true, data: { ...r.data, weekdays } };
}

/**
 * 다음 자동발행 윈도우의 시작·종료 시각을 계산 (UI 안내용 — L3).
 *  - cfg가 비활성/빈 weekdays → { startsAt: null, endsAt: null }
 *  - 현재 윈도우 안 → 현재 윈도우의 endsAt 반환 (startsAt = now 또는 윈도우 시작)
 *  - 현재 윈도우 밖 → 다음 활성 요일의 윈도우 startsAt·endsAt
 *  - 검색 범위 7일 (1주) — 그 안에 활성 요일이 없으면 null
 *
 * KST 기준 벽시계 시각으로 계산 후 호스트 Date 객체로 반환 (UI는 toLocaleString으로 표시).
 */
export function nextAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
): { startsAt: Date | null; endsAt: Date | null } {
  if (!cfg.enabled) return { startsAt: null, endsAt: null };
  if (cfg.weekdays.length === 0) return { startsAt: null, endsAt: null };

  const kst = toKST(now);
  const todayDow = kst.getDay();
  const todayMin = kst.getHours() * 60 + kst.getMinutes();

  // 현재 윈도우 내?
  if (
    cfg.weekdays.includes(todayDow) &&
    todayMin >= cfg.startMinute &&
    todayMin < cfg.endMinute
  ) {
    return {
      startsAt: setKstClock(kst, cfg.startMinute),
      endsAt: setKstClock(kst, cfg.endMinute),
    };
  }

  // 오늘이 활성 요일이고 아직 시작 전?
  if (cfg.weekdays.includes(todayDow) && todayMin < cfg.startMinute) {
    return {
      startsAt: setKstClock(kst, cfg.startMinute),
      endsAt: setKstClock(kst, cfg.endMinute),
    };
  }

  // 다음 7일 내 가장 가까운 활성 요일
  for (let i = 1; i <= 7; i++) {
    const targetDow = (todayDow + i) % 7;
    if (!cfg.weekdays.includes(targetDow)) continue;
    const target = new Date(kst);
    target.setDate(kst.getDate() + i);
    return {
      startsAt: setKstClock(target, cfg.startMinute),
      endsAt: setKstClock(target, cfg.endMinute),
    };
  }
  return { startsAt: null, endsAt: null };
}

function setKstClock(base: Date, minute: number): Date {
  const d = new Date(base);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}

/**
 * v1.13 cycle #26 partner-auto-series · §4.4.
 *
 * 현재 KST 윈도우의 시작 시각.
 *  - 윈도우 밖 또는 비활성 요일이면 null
 *  - 윈도우 안이면 today + startMinute (KST 벽시계 Date)
 */
export function currentWindowStart(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
): Date | null {
  if (!cfg.enabled) return null;
  if (cfg.weekdays.length === 0) return null;
  const kst = toKST(now);
  if (!cfg.weekdays.includes(kst.getDay())) return null;
  const minute = kst.getHours() * 60 + kst.getMinutes();
  if (minute < cfg.startMinute || minute >= cfg.endMinute) return null;
  return setKstClock(kst, cfg.startMinute);
}

/**
 * 같은 윈도우 안에서 이미 자동 시리즈 발행이 처리됐는지.
 *
 * 호출 invariant (M3): 반드시 `isInAutoPublishWindow`가 true일 때만 호출 — 윈도우 밖이면 false-positive skip.
 *
 *  - partner.autoSeries.lastTickAt이 currentWindowStart 이후면 이미 처리됨 → true
 *  - lastTickAt 없거나 윈도우 시작 이전이면 false (다음 처리 가능)
 */
export function recentlyPublishedInWindow(
  partner: Partner,
  now: Date = new Date(),
): boolean {
  const lastTick = partner.autoSeries?.lastTickAt;
  if (!lastTick) return false;
  const winStart = currentWindowStart(partner.autoPublish, now);
  if (!winStart) return false;
  return lastTick.getTime() >= winStart.getTime();
}
