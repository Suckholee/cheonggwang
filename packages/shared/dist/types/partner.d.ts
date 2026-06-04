import type { QuoteCategory } from "./quote-category";
import type { PartnerProfile } from "./partner-profile";
import type { PartnerAutoSeries, QueueItem } from "./auto-series";
export type PartnerStatus = "invited" | "active" | "suspended";
export interface AutoPublishConfig {
    enabled: boolean;
    weekdays: number[];
    startMinute: number;
    endMinute: number;
    timezone: "Asia/Seoul";
}
export declare const DEFAULT_AUTO_PUBLISH: AutoPublishConfig;
export interface Partner {
    id: string;
    ownerUid: string;
    businessName: string;
    logoUrl: string | null;
    category: QuoteCategory | null;
    regionLabel: string | null;
    status: PartnerStatus;
    autoPublish: AutoPublishConfig;
    issuedAt: Date;
    issuedBy: string;
    notes: string | null;
    profile?: PartnerProfile;
    autoSeries?: PartnerAutoSeries;
    autoSeriesQueue?: QueueItem[];
}
export type PartnerEvent = {
    type: "auto-published";
    postId: string;
    hygieneScore: number;
    decidedAt: Date;
} | {
    type: "draft-saved";
    postId: string;
    hygieneScore: number;
    reason: "auto-disabled" | "out-of-window" | "hygiene-fail" | "manual";
    decidedAt: Date;
} | {
    type: "publish-toggled";
    postId: string;
    from: "draft" | "published" | "withdrawn";
    to: "draft" | "published" | "withdrawn";
    decidedAt: Date;
} | {
    type: "status-changed";
    from: PartnerStatus;
    to: PartnerStatus;
    by: string;
    decidedAt: Date;
} | {
    type: "cleanup-failed";
    postId: string;
    reason: string;
    decidedAt: Date;
};
