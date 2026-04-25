import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  Quote,
  QuoteItem,
  QuoteResponseStatus,
} from "@/types/quote";

const COLLECTION = "quotes";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function tsToNullableDate(
  ts: Timestamp | undefined | null,
): Date | null {
  return ts ? ts.toDate() : null;
}

function toQuote(id: string, d: DocumentData): Quote {
  return {
    id,
    requestId: (d.requestId as string) ?? "",
    providerId: (d.providerId as string) ?? "",
    clientUid: (d.clientUid as string) ?? "",
    items: Array.isArray(d.items) ? (d.items as QuoteItem[]) : [],
    scheduledAt: tsToNullableDate(d.scheduledAt as Timestamp | null),
    estimatedWorkHours:
      typeof d.estimatedWorkHours === "number"
        ? (d.estimatedWorkHours as number)
        : null,
    totalAmount: typeof d.totalAmount === "number" ? (d.totalAmount as number) : 0,
    insured: d.insured === true,
    insuranceAmount:
      typeof d.insuranceAmount === "number"
        ? (d.insuranceAmount as number)
        : null,
    status: (d.status as QuoteResponseStatus) ?? "sent",
    sentAt: tsToDate(d.sentAt as Timestamp | undefined),
    acceptedAt: tsToNullableDate(d.acceptedAt as Timestamp | null),
    rejectedAt: tsToNullableDate(d.rejectedAt as Timestamp | null),
  };
}

export const quoteRepository = {
  async get(id: string): Promise<Quote | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toQuote(snap.id, snap.data()!);
  },

  async listByRequest(
    requestId: string,
    options?: { order?: "asc" | "desc" },
  ): Promise<Quote[]> {
    const order = options?.order ?? "desc";
    const snap = await col()
      .where("requestId", "==", requestId)
      .orderBy("sentAt", order)
      .get();
    return snap.docs.map((d) => toQuote(d.id, d.data()));
  },

  async listByProvider(providerId: string, limit = 50): Promise<Quote[]> {
    const snap = await col()
      .where("providerId", "==", providerId)
      .orderBy("sentAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toQuote(d.id, d.data()));
  },
};

/** TX 내부에서 사용할 create 페이로드 빌더 */
export function buildQuoteCreatePayload(input: {
  requestId: string;
  providerId: string;
  clientUid: string;
  items: QuoteItem[];
  scheduledAt: Date | null;
  estimatedWorkHours: number | null;
  totalAmount: number;
  insured: boolean;
  insuranceAmount: number | null;
}): Record<string, unknown> {
  return {
    requestId: input.requestId,
    providerId: input.providerId,
    clientUid: input.clientUid,
    items: input.items,
    scheduledAt: input.scheduledAt
      ? Timestamp.fromDate(input.scheduledAt)
      : null,
    estimatedWorkHours: input.estimatedWorkHours,
    totalAmount: input.totalAmount,
    insured: input.insured,
    insuranceAmount: input.insuranceAmount,
    status: "sent" as QuoteResponseStatus,
    sentAt: FieldValue.serverTimestamp(),
    acceptedAt: null,
    rejectedAt: null,
  };
}
