import "server-only";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { Booking, BookingStatus } from "@/types/booking";
import type { QuoteCategory } from "@/domain/quote-category";

const COLLECTION = "bookings";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toBooking(id: string, d: DocumentData): Booking {
  return {
    id,
    quoteId: String(d.quoteId ?? ""),
    requestId: String(d.requestId ?? ""),
    threadId: String(d.threadId ?? ""),
    providerId: String(d.providerId ?? ""),
    providerOwnerUid: String(d.providerOwnerUid ?? ""),
    clientUid: String(d.clientUid ?? ""),
    companyName: String(d.companyName ?? ""),
    clientDisplayName: String(d.clientDisplayName ?? ""),
    category: d.category as QuoteCategory,
    regionLabel: String(d.regionLabel ?? ""),
    scheduledAt: tsToDate(d.scheduledAt as Timestamp | undefined),
    totalAmount:
      typeof d.totalAmount === "number" ? (d.totalAmount as number) : 0,
    memo: (d.memo as string | null | undefined) ?? null,
    status: ((d.status as string) ?? "confirmed") as BookingStatus,
    createdBy: String(d.createdBy ?? ""),
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
    report: d.report ? {
      completionStatus: String(d.report.completionStatus ?? "완료"),
      checklist: Array.isArray(d.report.checklist) ? d.report.checklist.map(String) : [],
      note: (d.report.note as string | null | undefined) ?? null,
      photos: Array.isArray(d.report.photos) ? d.report.photos.map(String) : [],
      submittedAt: tsToDate(d.report.submittedAt as Timestamp | undefined),
    } : null,
  };
}

export const bookingRepository = {
  /** v1.3 #1 — provider 작업 탭 목록 (scheduledAt DESC · 100 cap) */
  async listForProvider(
    providerId: string,
    limit = 100,
  ): Promise<Booking[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("scheduledAt", "desc")
      .limit(limit)
      .get();
    if (snap.size >= limit) {
      console.warn(
        `[booking] listForProvider cap reached (${limit}). v1.3b paginate 필요`,
      );
    }
    return snap.docs.map((d) => toBooking(d.id, d.data()));
  },

  /** v1.3 #1 — quote 1건당 booking 1건 보장 (singleton · .limit(1) 방어) */
  async findByQuoteId(quoteId: string): Promise<Booking | null> {
    const snap = await col()
      .where("quoteId", "==", quoteId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toBooking(doc.id, doc.data());
  },

  /** v1.3 #1 — participant 검증 포함 조회 (v1 직접 URL 접근 없으나 helper 제공) */
  async getWithParticipantCheck(
    bookingId: string,
    uid: string,
  ): Promise<Booking | null> {
    const snap = await col().doc(bookingId).get();
    if (!snap.exists) return null;
    const b = toBooking(snap.id, snap.data()!);
    if (b.clientUid !== uid && b.providerOwnerUid !== uid) return null;
    return b;
  },
};
