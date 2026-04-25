import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { AppError } from "@/lib/errors";
import type {
  PartnerApplicant,
  PartnerApplicantStatus,
} from "@/types/partner-applicant";
import type { QuoteCategory } from "@/domain/quote-category";

/**
 * v1.9 partner-application — partnerApplicants 컬렉션 액세스.
 * 모든 쓰기는 Admin SDK (server action 또는 Route Handler).
 */

const COLLECTION = "partnerApplicants";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toApplicant(id: string, d: DocumentData): PartnerApplicant {
  return {
    id,
    ownerUid: String(d.ownerUid ?? ""),
    businessName: String(d.businessName ?? ""),
    email: String(d.email ?? ""),
    phone: (d.phone as string | null | undefined) ?? null,
    category: (d.category as QuoteCategory | null | undefined) ?? null,
    regionLabel: (d.regionLabel as string | null | undefined) ?? null,
    intro: (d.intro as string | null | undefined) ?? null,
    status:
      d.status === "pending" ||
      d.status === "approved" ||
      d.status === "rejected"
        ? (d.status as PartnerApplicantStatus)
        : "pending",
    appliedAt: tsToDate(d.appliedAt as Timestamp | undefined),
    reviewedAt: d.reviewedAt
      ? tsToDate(d.reviewedAt as Timestamp)
      : null,
    reviewedBy: (d.reviewedBy as string | null | undefined) ?? null,
    rejectReason: (d.rejectReason as string | null | undefined) ?? null,
    partnerId: (d.partnerId as string | null | undefined) ?? null,
  };
}

export const partnerApplicantRepository = {
  /** 단건 조회. */
  async getById(id: string): Promise<PartnerApplicant | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toApplicant(snap.id, snap.data()!);
  },

  /** ownerUid로 조회 (1:1 가정). */
  async getByOwnerUid(uid: string): Promise<PartnerApplicant | null> {
    const snap = await col()
      .where("ownerUid", "==", uid)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return toApplicant(snap.docs[0].id, snap.docs[0].data());
  },

  /**
   * pending 신청자 목록. 운영자 대시보드용.
   * 인덱스 (status ASC, appliedAt DESC).
   */
  async listPending(limit = 100): Promise<PartnerApplicant[]> {
    const snap = await col()
      .where("status", "==", "pending")
      .orderBy("appliedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toApplicant(d.id, d.data()));
  },

  /** pending 카운트 (admin stats 위젯용). */
  async pendingCount(): Promise<number> {
    try {
      const snap = await col()
        .where("status", "==", "pending")
        .count()
        .get();
      return snap.data().count;
    } catch (e) {
      console.warn(
        "[partner-applicant-repository.pendingCount] failed",
        e,
      );
      return 0;
    }
  },

  /**
   * status 전이 (admin reject 라우트용 — 단순 update).
   * approve는 트랜잭션 내부에서 직접 tx.update 사용 (race-safe, partners doc과 동시 변경).
   */
  async setStatus(
    id: string,
    next: PartnerApplicantStatus,
    extra: { reviewedBy: string; rejectReason?: string | null; partnerId?: string | null } = {
      reviewedBy: "admin",
    },
  ): Promise<void> {
    const update: DocumentData = {
      status: next,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: extra.reviewedBy,
    };
    if (extra.rejectReason !== undefined) update.rejectReason = extra.rejectReason;
    if (extra.partnerId !== undefined) update.partnerId = extra.partnerId;
    await col().doc(id).update(update);
  },
};
