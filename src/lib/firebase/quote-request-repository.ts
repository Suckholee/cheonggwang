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

  const bookingPaymentRaw = d.bookingPayment;
  const bookingPayment = bookingPaymentRaw ? {
    bookingNumber: (bookingPaymentRaw.bookingNumber as string) ?? "",
    receivedAt: tsToDate(bookingPaymentRaw.receivedAt as Timestamp | undefined),
    hasDeposit: !!bookingPaymentRaw.hasDeposit,
    depositAmount: typeof bookingPaymentRaw.depositAmount === "number" ? bookingPaymentRaw.depositAmount : 0,
    balanceAmount: typeof bookingPaymentRaw.balanceAmount === "number" ? bookingPaymentRaw.balanceAmount : 0,
    paymentMethod: (bookingPaymentRaw.paymentMethod as string) ?? "카드",
  } : undefined;

  return {
    id,
    clientUid: (d.clientUid as string) ?? "",
    clientName: (d.clientName as string) ?? "",
    category: d.category as QuoteCategory,
    subService: (d.subService as string) ?? "",
    region: toRegion(d),
    size: typeof d.size === "number" ? (d.size as number) : null,
    roomType,
    preferredDate: preferred ? preferred.toDate() : null,
    preferredTime: (d.preferredTime as string) ?? "",
    hasElevator: (d.hasElevator as "yes" | "no") ?? "no",
    parkingAvailable: (d.parkingAvailable as "yes" | "no" | "discuss") ?? "discuss",
    contactPhone: (d.contactPhone as string) ?? "",
    photos: Array.isArray(d.photos) ? (d.photos as Photo[]) : [],
    note: (d.note as string | null) ?? null,
    address: typeof d.address === "string" ? d.address : undefined,
    notifiedProviderIds: Array.isArray(d.notifiedProviderIds)
      ? (d.notifiedProviderIds as string[])
      : [],
    status: normalizeQuoteStatus((d.status as string) ?? "submitted"),
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
    baseAmount: typeof d.baseAmount === "number" ? d.baseAmount : undefined,
    optionsAmount: typeof d.optionsAmount === "number" ? d.optionsAmount : undefined,
    totalAmount: typeof d.totalAmount === "number" ? d.totalAmount : undefined,
    optionsList: Array.isArray(d.optionsList)
      ? (d.optionsList as Array<{ label: string; qty: number; price: number }>)
      : undefined,
    quoteType: typeof d.quoteType === "string" ? (d.quoteType as "premium" | "regular" | "budget") : undefined,
    frequency: typeof d.frequency === "string" ? d.frequency : undefined,
    frequencyCount: typeof d.frequencyCount === "number" ? d.frequencyCount : undefined,

    // 공통 필드 매핑
    workerAssignment: d.workerAssignment ? {
      assignedTeam: (d.workerAssignment.assignedTeam as string) ?? "",
      teamLeaderName: (d.workerAssignment.teamLeaderName as string) ?? "",
      teamLeaderPhone: (d.workerAssignment.teamLeaderPhone as string) ?? "",
      workerCount: typeof d.workerAssignment.workerCount === "number" ? d.workerAssignment.workerCount : 1,
      estimatedHours: typeof d.workerAssignment.estimatedHours === "number" ? d.workerAssignment.estimatedHours : 2,
    } : undefined,
    photosBefore: Array.isArray(d.photosBefore) ? (d.photosBefore as Photo[]) : [],
    photosAfter: Array.isArray(d.photosAfter) ? (d.photosAfter as Photo[]) : [],
    customerReview: d.customerReview ? {
      rating: typeof d.customerReview.rating === "number" ? d.customerReview.rating : 5,
      comment: (d.customerReview.comment as string) ?? "",
      wouldReuse: (d.customerReview.wouldReuse as string) ?? "yes",
    } : undefined,
    bookingPayment,
    providerPayment: typeof d.providerPayment === "number" ? d.providerPayment : undefined,
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
        clientName: data.clientName,
        category: data.category,
        subService: data.subService,
        region: data.region,
        size: data.size,
        preferredDate: data.preferredDate
          ? Timestamp.fromDate(data.preferredDate)
          : null,
        preferredTime: data.preferredTime,
        hasElevator: data.hasElevator,
        parkingAvailable: data.parkingAvailable,
        contactPhone: data.contactPhone,
        photos: data.photos,
        note: data.note,
        address: data.address ?? null,
        notifiedProviderIds: data.notifiedProviderIds,
        status: data.status,
        createdAt: FieldValue.serverTimestamp(),
        baseAmount: data.baseAmount ?? null,
        optionsAmount: data.optionsAmount ?? null,
        totalAmount: data.totalAmount ?? null,
        optionsList: data.optionsList ?? null,
        quoteType: data.quoteType ?? null,
        frequency: data.frequency ?? null,
        frequencyCount: data.frequencyCount ?? null,
        workerAssignment: data.workerAssignment ?? null,
        photosBefore: data.photosBefore ?? [],
        photosAfter: data.photosAfter ?? [],
        customerReview: data.customerReview ?? null,
        bookingPayment: data.bookingPayment ? {
          bookingNumber: data.bookingPayment.bookingNumber,
          receivedAt: Timestamp.fromDate(data.bookingPayment.receivedAt),
          hasDeposit: data.bookingPayment.hasDeposit,
          depositAmount: data.bookingPayment.depositAmount,
          balanceAmount: data.bookingPayment.balanceAmount,
          paymentMethod: data.bookingPayment.paymentMethod,
        } : null,
        providerPayment: data.providerPayment ?? null,
      });
  },

  async update(
    id: string,
    patch: Partial<QuoteRequest>,
  ): Promise<void> {
    const updateData: DocumentData = {};
    
    if (patch.notifiedProviderIds !== undefined) updateData.notifiedProviderIds = patch.notifiedProviderIds;
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.workerAssignment !== undefined) updateData.workerAssignment = patch.workerAssignment;
    if (patch.photosBefore !== undefined) updateData.photosBefore = patch.photosBefore;
    if (patch.photosAfter !== undefined) updateData.photosAfter = patch.photosAfter;
    if (patch.customerReview !== undefined) updateData.customerReview = patch.customerReview;
    if (patch.providerPayment !== undefined) updateData.providerPayment = patch.providerPayment;
    if (patch.totalAmount !== undefined) updateData.totalAmount = patch.totalAmount;
    
    if (patch.bookingPayment !== undefined) {
      updateData.bookingPayment = patch.bookingPayment ? {
        bookingNumber: patch.bookingPayment.bookingNumber,
        receivedAt: Timestamp.fromDate(patch.bookingPayment.receivedAt),
        hasDeposit: patch.bookingPayment.hasDeposit,
        depositAmount: patch.bookingPayment.depositAmount,
        balanceAmount: patch.bookingPayment.balanceAmount,
        paymentMethod: patch.bookingPayment.paymentMethod,
      } : null;
    }

    await col().doc(id).update(updateData);
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

  async listAll(options?: { limit?: number }): Promise<QuoteRequest[]> {
    const limit = options?.limit ?? 100;
    const snap = await col()
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toQuoteRequest(d.id, d.data()));
  },
};
