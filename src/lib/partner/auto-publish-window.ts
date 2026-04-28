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
 * v1.15 cycle #28 partner-aeo-boost · §3.7 (C1+H7 결의).
 *
 * KST wall clock 컴포넌트 — host TZ 무관 산술용.
 * Asia/Seoul = UTC+9 고정 (DST 없음).
 */
export interface KstWallClock {
  /** 4-digit year, e.g. 2026 */
  year: number;
  /** 0-based month (Date.UTC 호환) */
  month: number;
  /** 1-based date */
  date: number;
  /** 0=Sun..6=Sat */
  day: number;
  /** 0..23 */
  hours: number;
  /** 0..59 */
  minutes: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * host TZ 무관: Intl.DateTimeFormat으로 KST wall clock 컴포넌트 추출 (R10).
 * Node 22 UTC 환경 + macOS KST 환경 모두 동일 결과.
 */
export function toKstWallClock(d: Date): KstWallClock {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10) - 1,
    date: parseInt(get("day"), 10),
    day: WEEKDAY_MAP[get("weekday")] ?? 0,
    hours: parseInt(get("hour"), 10) % 24, // hour12:false에서 24:00 → 0 정규화
    minutes: parseInt(get("minute"), 10),
  };
}

/**
 * KST wall clock(year, month, date)에서 `minute` 분 시각의 real UTC Date.
 * KST = UTC+9 → real UTC = (year, month, date) at (h-9):m.
 * h-9가 음수면 Date.UTC가 자동으로 전날로 정규화.
 */
function setKstClock(wall: KstWallClock, minute: number): Date {
  const h = Math.floor(minute / 60);
  const mi = minute % 60;
  return new Date(Date.UTC(wall.year, wall.month, wall.date, h - 9, mi, 0, 0));
}

/**
 * KST date 산술 (host TZ 무관). 윤년/월 경계는 Date.UTC로 정규화.
 */
function addDaysToWall(wall: KstWallClock, days: number): KstWallClock {
  const tmp = new Date(Date.UTC(wall.year, wall.month, wall.date + days));
  return {
    ...wall,
    year: tmp.getUTCFullYear(),
    month: tmp.getUTCMonth(),
    date: tmp.getUTCDate(),
    day: tmp.getUTCDay(),
  };
}

/**
 * 주어진 시각이 윈도우 안에 있는지 판정 (host TZ 무관, R10).
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
  const wall = toKstWallClock(now);
  if (!cfg.weekdays.includes(wall.day)) return false;
  const minute = wall.hours * 60 + wall.minutes;
  return minute >= cfg.startMinute && minute < cfg.endMinute;
}

/**
 * @deprecated v1.15 cycle #28 — 보존 (기존 호출자 호환). 신규 코드는 toKstWallClock 사용.
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

  const wall = toKstWallClock(now);
  const todayMin = wall.hours * 60 + wall.minutes;

  // 오늘이 활성 요일 + 윈도우 종료 전 (현재 윈도우 내 또는 시작 전 모두 포함)
  if (cfg.weekdays.includes(wall.day) && todayMin < cfg.endMinute) {
    return {
      startsAt: setKstClock(wall, cfg.startMinute),
      endsAt: setKstClock(wall, cfg.endMinute),
    };
  }

  // 다음 7일 내 가장 가까운 활성 요일
  for (let i = 1; i <= 7; i++) {
    const targetDow = (wall.day + i) % 7;
    if (!cfg.weekdays.includes(targetDow)) continue;
    const targetWall = addDaysToWall(wall, i);
    return {
      startsAt: setKstClock(targetWall, cfg.startMinute),
      endsAt: setKstClock(targetWall, cfg.endMinute),
    };
  }
  return { startsAt: null, endsAt: null };
}


/**
 * v1.14 cycle #27 partner-series-queue · §3.6 (S4).
 *
 * 다음 N개의 활성 윈도우 시작·종료 시각 — Queue Preview용.
 *  - cfg 비활성/빈 weekdays/n<=0 → []
 *  - 오늘이 활성 요일이고 아직 윈도우 종료 전 → 첫 항목으로 포함
 *  - 오늘이 활성 요일이지만 endMinute 이후 → 다음 활성 요일부터
 *  - 검색 범위 30일 (안전장치). 그 안에 N개 못 찾으면 그만큼만 반환.
 *
 * 호출자: nextNSlots(queue-preview.ts) — 사장님이 보는 다음 5회 발행 예정.
 */
export function nextNAutoPublishWindows(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
  n: number = 5,
): Array<{ startsAt: Date; endsAt: Date }> {
  if (!cfg.enabled) return [];
  if (cfg.weekdays.length === 0) return [];
  if (n <= 0) return [];

  const wall = toKstWallClock(now);
  const todayMin = wall.hours * 60 + wall.minutes;

  const result: Array<{ startsAt: Date; endsAt: Date }> = [];
  for (let i = 0; i < 30 && result.length < n; i++) {
    const targetDow = (wall.day + i) % 7;
    if (!cfg.weekdays.includes(targetDow)) continue;
    // 오늘인데 이미 윈도우 종료 → skip
    if (i === 0 && todayMin >= cfg.endMinute) continue;

    const targetWall = i === 0 ? wall : addDaysToWall(wall, i);
    result.push({
      startsAt: setKstClock(targetWall, cfg.startMinute),
      endsAt: setKstClock(targetWall, cfg.endMinute),
    });
  }
  return result;
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
  const wall = toKstWallClock(now);
  if (!cfg.weekdays.includes(wall.day)) return null;
  const minute = wall.hours * 60 + wall.minutes;
  if (minute < cfg.startMinute || minute >= cfg.endMinute) return null;
  return setKstClock(wall, cfg.startMinute);
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
