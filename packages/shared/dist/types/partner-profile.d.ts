import type { PartnerIndustry } from "./partner-industry";
export interface PriceItem {
    name: string;
    price: number;
}
export type ProfileStatus = "auto-approved" | "approved" | "pending-review" | "rejected";
export interface PartnerProfile {
    description: string;
    usps: string[];
    priceItems: PriceItem[];
    photoUrls: string[];
    photoAnalysisSummary: string;
    industry: PartnerIndustry;
    status: ProfileStatus;
    suspended: boolean;
    hygieneScore: number;
    version: number;
    updatedAt: Date;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    rejectReason: string | null;
}
export type RagHistoryEventType = "profile-updated" | "reviewed" | "suspended" | "reported";
export interface RagHistoryEvent {
    type: RagHistoryEventType;
    actor: "partner" | "admin" | "reporter";
    actorUid: string | null;
    payload: Record<string, unknown>;
    at: Date;
}
export interface PartnerReport {
    id: string;
    reporterUid: string;
    partnerId: string;
    reason: string;
    link?: string;
    at: Date;
}
