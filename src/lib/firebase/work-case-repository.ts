import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { WorkCase } from "@/types/work-case";
import type { QuoteCategory } from "@/domain/quote-category";
import type { Photo } from "@/types/page";

const COLLECTION = "workCases";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toWorkCase(id: string, d: DocumentData): WorkCase {
  return {
    id,
    providerId: String(d.providerId ?? ""),
    category: d.category as QuoteCategory,
    sizeLabel: String(d.sizeLabel ?? ""),
    beforePhoto: d.beforePhoto as Photo,
    afterPhoto: d.afterPhoto as Photo,
    memo: (d.memo as string | null | undefined) ?? null,
    completedAt: tsToDate(d.completedAt as Timestamp | undefined),
    bookingId: (d.bookingId as string | null | undefined) ?? null,
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
  };
}

export interface CreateWorkCaseData {
  providerId: string;
  category: QuoteCategory;
  sizeLabel: string;
  beforePhoto: Photo;
  afterPhoto: Photo;
  memo: string | null;
}

export const workCaseRepository = {
  async listByProvider(providerId: string, limit = 8): Promise<WorkCase[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toWorkCase(d.id, d.data()));
  },

  async create(id: string, data: CreateWorkCaseData): Promise<void> {
    await col()
      .doc(id)
      .create({
        providerId: data.providerId,
        category: data.category,
        sizeLabel: data.sizeLabel,
        beforePhoto: data.beforePhoto,
        afterPhoto: data.afterPhoto,
        memo: data.memo,
        bookingId: null,
        completedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
  },

  async get(id: string): Promise<WorkCase | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toWorkCase(snap.id, snap.data()!);
  },

  async delete(id: string): Promise<void> {
    await col().doc(id).delete();
  },
};
