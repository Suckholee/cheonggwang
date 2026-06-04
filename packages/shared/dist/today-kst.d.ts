export type TipSeason = "spring" | "summer" | "fall" | "winter";
export declare function getTodayKstStart(now?: Date): Date;
export declare function currentKstSeason(now?: Date): TipSeason;
export declare function firstDayOfMonthKst(now?: Date): Date;
