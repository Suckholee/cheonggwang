import { z } from "zod";
import type { AutoPublishConfig, Partner } from "./types/partner";

export interface KstWallClock {
  year: number;
  month: number;
  date: number;
  day: number;
  hours: number;
  minutes: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

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
    hours: parseInt(get("hour"), 10) % 24,
    minutes: parseInt(get("minute"), 10),
  };
}

function setKstClock(wall: KstWallClock, minute: number): Date {
  const h = Math.floor(minute / 60);
  const mi = minute % 60;
  return new Date(Date.UTC(wall.year, wall.month, wall.date, h - 9, mi, 0, 0));
}

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
 * @deprecated
 */
export function toKST(d: Date): Date {
  const kstStr = d.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  return new Date(kstStr);
}

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
  const weekdays = Array.from(new Set(r.data.weekdays)).sort(
    (a, b) => a - b,
  );
  return { ok: true, data: { ...r.data, weekdays } };
}

export function nextAutoPublishWindow(
  cfg: AutoPublishConfig,
  now: Date = new Date(),
): { startsAt: Date | null; endsAt: Date | null } {
  if (!cfg.enabled) return { startsAt: null, endsAt: null };
  if (cfg.weekdays.length === 0) return { startsAt: null, endsAt: null };

  const wall = toKstWallClock(now);
  const todayMin = wall.hours * 60 + wall.minutes;

  if (cfg.weekdays.includes(wall.day) && todayMin < cfg.endMinute) {
    return {
      startsAt: setKstClock(wall, cfg.startMinute),
      endsAt: setKstClock(wall, cfg.endMinute),
    };
  }

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
    if (i === 0 && todayMin >= cfg.endMinute) continue;

    const targetWall = i === 0 ? wall : addDaysToWall(wall, i);
    result.push({
      startsAt: setKstClock(targetWall, cfg.startMinute),
      endsAt: setKstClock(targetWall, cfg.endMinute),
    });
  }
  return result;
}

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
