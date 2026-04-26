import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  PartnerProfile,
  PriceItem,
  ProfileStatus,
  RagHistoryEvent,
  PartnerReport,
} from "@/types/partner-profile";
import type { PartnerIndustry } from "@/domain/partner-industry";

/**
 * v1.11 partner-rag-system · §1·§5 — partners.profile + ragHistory + reports.
 * C5 결의: 모든 write는 Admin SDK only.
 */

const partnersCol = () => adminDb.collection("partners");
const reportsCol = () => adminDb.collection("reports");

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function profileFromData(d: DocumentData | undefined): PartnerProfile | null {
  if (!d) return null;
  return {
    description: String(d.description ?? ""),
    usps: Array.isArray(d.usps) ? (d.usps as string[]) : [],
    priceItems: Array.isArray(d.priceItems)
      ? (d.priceItems as PriceItem[])
      : [],
    photoUrls: Array.isArray(d.photoUrls) ? (d.photoUrls as string[]) : [],
    photoAnalysisSummary: String(d.photoAnalysisSummary ?? ""),
    industry: (d.industry as PartnerIndustry) ?? "other",
    status: (d.status as ProfileStatus) ?? "pending-review",
    suspended: d.suspended === true,
    hygieneScore: Number(d.hygieneScore ?? 0),
    version: Number(d.version ?? 0),
    updatedAt: tsToDate(d.updatedAt as Timestamp | undefined),
    reviewedBy: (d.reviewedBy as string | null | undefined) ?? null,
    reviewedAt: d.reviewedAt
      ? tsToDate(d.reviewedAt as Timestamp)
      : null,
    rejectReason: (d.rejectReason as string | null | undefined) ?? null,
  };
}

interface SaveProfileInput {
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
}

export const partnerProfileRepository = {
  /** 단건 조회 (partner doc 안 nested). */
  async getProfile(partnerId: string): Promise<PartnerProfile | null> {
    const snap = await partnersCol().doc(partnerId).get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    return profileFromData(d.profile as DocumentData | undefined);
  },

  /**
   * profile 전체 저장 (사장님 또는 admin).
   * C5: Admin SDK 직접 update.
   */
  async savePartnerProfile(
    partnerId: string,
    input: SaveProfileInput,
  ): Promise<void> {
    await partnersCol().doc(partnerId).update({
      profile: {
        description: input.description,
        usps: input.usps,
        priceItems: input.priceItems,
        photoUrls: input.photoUrls,
        photoAnalysisSummary: input.photoAnalysisSummary,
        industry: input.industry,
        status: input.status,
        suspended: input.suspended,
        hygieneScore: input.hygieneScore,
        version: input.version,
        updatedAt: Timestamp.fromDate(input.updatedAt),
        reviewedBy: null,
        reviewedAt: null,
        rejectReason: null,
      },
    });
  },

  /** admin 검토 결과 반영 (status 변경 + reviewedBy/At). */
  async reviewProfile(
    partnerId: string,
    args: {
      status: "approved" | "rejected";
      reason: string | null;
      reviewedBy: string;
      reviewedAt: Date;
    },
  ): Promise<void> {
    await partnersCol().doc(partnerId).update({
      "profile.status": args.status,
      "profile.rejectReason": args.reason,
      "profile.reviewedBy": args.reviewedBy,
      "profile.reviewedAt": Timestamp.fromDate(args.reviewedAt),
    });
  },

  /** admin 매장 단위 RAG 정지/해제. */
  async setSuspended(partnerId: string, suspended: boolean): Promise<void> {
    await partnersCol().doc(partnerId).update({
      "profile.suspended": suspended,
    });
  },

  /** admin 강제 편집 (H7). 부분 update. */
  async adminUpdateProfile(
    partnerId: string,
    patch: Partial<SaveProfileInput> & {
      partnerId?: string;
    },
  ): Promise<void> {
    const update: DocumentData = {};
    const fields: Array<keyof SaveProfileInput> = [
      "description",
      "usps",
      "priceItems",
      "photoUrls",
      "photoAnalysisSummary",
      "industry",
      "status",
      "suspended",
      "hygieneScore",
    ];
    for (const f of fields) {
      const v = (patch as DocumentData)[f];
      if (v !== undefined) update[`profile.${f}`] = v;
    }
    if (Object.keys(update).length === 0) return;
    await partnersCol().doc(partnerId).update(update);
  },

  /** profile 전체 삭제 (admin 강제 회수). */
  async deleteProfile(partnerId: string): Promise<void> {
    await partnersCol().doc(partnerId).update({
      profile: FieldValue.delete(),
    });
  },

  /** pending-review 큐 (admin/rag-review). */
  async listPendingReviews(limit = 100): Promise<
    Array<{ id: string; ownerUid: string; businessName: string; profile: PartnerProfile }>
  > {
    const snap = await partnersCol()
      .where("profile.status", "==", "pending-review")
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => {
        const data = d.data();
        const profile = profileFromData(data.profile as DocumentData);
        if (!profile) return null;
        return {
          id: d.id,
          ownerUid: String(data.ownerUid ?? ""),
          businessName: String(data.businessName ?? ""),
          profile,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  },

  /** pending-review 카운트 (StatsWidgets 8번째 카드용). */
  async pendingReviewCount(): Promise<number> {
    try {
      const snap = await partnersCol()
        .where("profile.status", "==", "pending-review")
        .count()
        .get();
      return snap.data().count;
    } catch (e) {
      console.warn("[partner-profile-repository.pendingReviewCount] failed", e);
      return 0;
    }
  },

  /** ragHistory append (audit, append-only R6). */
  async appendRagHistory(
    partnerId: string,
    event: Omit<RagHistoryEvent, "at">,
  ): Promise<void> {
    await partnersCol()
      .doc(partnerId)
      .collection("ragHistory")
      .add({
        ...event,
        at: FieldValue.serverTimestamp(),
      });
  },

  /** 최근 ragHistory 조회 (admin 뷰어용). */
  async listRagHistory(
    partnerId: string,
    limit = 5,
  ): Promise<RagHistoryEvent[]> {
    const snap = await partnersCol()
      .doc(partnerId)
      .collection("ragHistory")
      .orderBy("at", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        type: data.type,
        actor: data.actor,
        actorUid: data.actorUid ?? null,
        payload: (data.payload as Record<string, unknown>) ?? {},
        at: tsToDate(data.at as Timestamp),
      };
    });
  },
};

/**
 * M4: 신고 원본 (admin only collection).
 */
export const reportsRepository = {
  async create(input: Omit<PartnerReport, "id">): Promise<string> {
    const ref = await reportsCol().add({
      ...input,
      at: Timestamp.fromDate(input.at),
    });
    return ref.id;
  },
};
