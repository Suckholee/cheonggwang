import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type { QuoteRequest } from "@/types/quote-request";
import {
  normalizeQuoteStatus,
  type QuoteStatus,
} from "@/domain/quote-status";
import type { QuoteCategory } from "@/domain/quote-category";
import { isRoomType, type RoomType } from "@/domain/room-type";
import type { Photo, Region } from "@/types/page";

const COLLECTION = "quoteRequests";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate?.() ?? new Date();
}

function toRegion(d: DocumentData): Region {
  const r = d.region as { city?: unknown; district?: unknown } | undefined;
  return {
    city: typeof r?.city === "string" ? r.city : "",
    district: typeof r?.district === "string" ? r.district : "",
  };
}

function toQuoteRequest(id: string, d: DocumentData): QuoteRequest {
  const preferred = d.preferredDate as Timestamp | null | undefined;
  const rawRoomType = typeof d.roomType === "string" ? d.roomType : null;
  const roomType: RoomType | undefined =
    rawRoomType && isRoomType(rawRoomType) ? rawRoomType : undefined;
  return {
    id,
    clientUid: (d.clientUid as string) ?? "",
    category: d.category as QuoteCategory,
    region: toRegion(d),
    size: typeof d.size === "number" ? (d.size as number) : null,
    roomType,
    preferredDate: preferred ? preferred.toDate() : null,
    contactPhone: (d.contactPhone as string) ?? "",
    photos: Array.isArray(d.photos) ? (d.photos as Photo[]) : [],
    note: (d.note as string | null) ?? null,
    notifiedProviderIds: Array.isArray(d.notifiedProviderIds)
      ? (d.notifiedProviderIds as string[])
      : [],
    status: normalizeQuoteStatus((d.status as string) ?? "submitted"),
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
  };
}

export type QuoteRequestCreateInput = Omit<
  QuoteRequest,
  "id" | "createdAt"
>;

export const quoteRequestRepository = {
  async create(id: string, data: QuoteRequestCreateInput): Promise<void> {
    await col()
      .doc(id)
      .create({
        clientUid: data.clientUid,
        category: data.category,
        region: data.region,
        size: data.size,
        preferredDate: data.preferredDate
          ? Timestamp.fromDate(data.preferredDate)
          : null,
        contactPhone: data.contactPhone,
        photos: data.photos,
        note: data.note,
        notifiedProviderIds: data.notifiedProviderIds,
        status: data.status,
        createdAt: FieldValue.serverTimestamp(),
      });
  },

  async update(
    id: string,
    patch: Partial<Pick<QuoteRequest, "notifiedProviderIds" | "status">>,
  ): Promise<void> {
    await col().doc(id).update(patch);
  },

  async get(id: string): Promise<QuoteRequest | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toQuoteRequest(snap.id, snap.data()!);
  },

  async listForClient(clientUid: string): Promise<QuoteRequest[]> {
    const snap = await col()
      .where("clientUid", "==", clientUid)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => toQuoteRequest(d.id, d.data()));
  },

  /**
   * v1.1 quote-response triage 큐.
   * provider.categories ∈ QuoteCategory (최대 6개, Firestore `in` 10개 제한 안전)
   * status in ['submitted', 'quoted'] (응답 가능)
   * excludeRequestIds 적용 후 최신순 정렬.
   */
  async listForTriage(options: {
    providerCategories: QuoteCategory[];
    excludeRequestIds: Set<string>;
    limit?: number;
  }): Promise<QuoteRequest[]> {
    if (options.providerCategories.length === 0) return [];
    const limit = options.limit ?? 50;
    const snap = await col()
      .where("category", "in", options.providerCategories)
      .where("status", "in", ["submitted", "quoted"])
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs
      .map((d) => toQuoteRequest(d.id, d.data()))
      .filter((r) => !options.excludeRequestIds.has(r.id));
  },

  /**
   * v1.1b #4 provider-dashboard — 수신 요청 상위 N건.
   * category+status+createdAt 기존 composite index 재사용.
   */
  async listForProvider(params: {
    categories: QuoteCategory[];
    status?: QuoteStatus;
    limit?: number;
  }): Promise<QuoteRequest[]> {
    if (params.categories.length === 0) return [];
    const categoriesForQuery = params.categories.slice(0, 10);
    const snap = await col()
      .where("category", "in", categoriesForQuery)
      .where("status", "==", params.status ?? "submitted")
      .orderBy("createdAt", "desc")
      .limit(params.limit ?? 3)
      .get();
    return snap.docs.map((d) => toQuoteRequest(d.id, d.data()));
  },

  /**
   * v1.1b #4 provider-dashboard — 수신 요청 총개수 (정확).
   * Admin SDK count aggregation 사용 (리드 1건 비용).
   */
  async countForProvider(params: {
    categories: QuoteCategory[];
    status?: QuoteStatus;
  }): Promise<number> {
    if (params.categories.length === 0) return 0;
    const categoriesForQuery = params.categories.slice(0, 10);
    const agg = await col()
      .where("category", "in", categoriesForQuery)
      .where("status", "==", params.status ?? "submitted")
      .count()
      .get();
    return agg.data().count;
  },
};
