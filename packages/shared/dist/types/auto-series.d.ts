export type BrandTone = "friendly" | "professional" | "playful";
export type PublishMode = "auto" | "draft-only";
export type AutoSeriesAngle = "usp" | "menu" | "review" | "event" | "story";
export type PostFormat = "blog" | "card-news";
export interface PartnerAutoSeries {
    enabled: boolean;
    lastIndex: number;
    lastTickAt: Date | null;
    brandTone: BrandTone;
    totalPublished: number;
    totalFailed: number;
    photoCursor: number;
    publishMode: PublishMode;
    targetAudience: string | null;
}
export declare const DEFAULT_AUTO_SERIES: PartnerAutoSeries;
export interface QueueItem {
    id: string;
    angle: AutoSeriesAngle;
    format: PostFormat;
    enabled: boolean;
}
export type SeriesHistoryStatus = "published" | "auto-draft-saved" | "hygiene-fail" | "error" | "photo-missing";
export interface SeriesHistoryEvent {
    id: string;
    slotIndex: number;
    angle: AutoSeriesAngle;
    format: PostFormat;
    status: SeriesHistoryStatus;
    postId?: string;
    postSlug?: string;
    hygieneScore?: number;
    reason?: string;
    at: Date;
}
