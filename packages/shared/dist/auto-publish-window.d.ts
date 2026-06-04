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
export declare function toKstWallClock(d: Date): KstWallClock;
export declare function isInAutoPublishWindow(cfg: AutoPublishConfig, now?: Date): boolean;
/**
 * @deprecated
 */
export declare function toKST(d: Date): Date;
export declare const autoPublishConfigSchema: z.ZodEffects<z.ZodObject<{
    enabled: z.ZodBoolean;
    weekdays: z.ZodArray<z.ZodNumber, "many">;
    startMinute: z.ZodNumber;
    endMinute: z.ZodNumber;
    timezone: z.ZodLiteral<"Asia/Seoul">;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    weekdays: number[];
    startMinute: number;
    endMinute: number;
    timezone: "Asia/Seoul";
}, {
    enabled: boolean;
    weekdays: number[];
    startMinute: number;
    endMinute: number;
    timezone: "Asia/Seoul";
}>, {
    enabled: boolean;
    weekdays: number[];
    startMinute: number;
    endMinute: number;
    timezone: "Asia/Seoul";
}, {
    enabled: boolean;
    weekdays: number[];
    startMinute: number;
    endMinute: number;
    timezone: "Asia/Seoul";
}>;
export declare function validateAutoPublishConfig(input: unknown): {
    ok: true;
    data: AutoPublishConfig;
} | {
    ok: false;
    message: string;
};
export declare function nextAutoPublishWindow(cfg: AutoPublishConfig, now?: Date): {
    startsAt: Date | null;
    endsAt: Date | null;
};
export declare function nextNAutoPublishWindows(cfg: AutoPublishConfig, now?: Date, n?: number): Array<{
    startsAt: Date;
    endsAt: Date;
}>;
export declare function currentWindowStart(cfg: AutoPublishConfig, now?: Date): Date | null;
export declare function recentlyPublishedInWindow(partner: Partner, now?: Date): boolean;
