import "server-only";
import {
  FieldValue,
  type DocumentData,
  type Timestamp,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  Provider,
  ProviderPriceBookEntry,
  ProviderRegion,
} from "@/types/provider";
import type { QuoteCategory } from "@/domain/quote-category";
import type { SearchFilters } from "@/types/search";

const COLLECTION = "providers";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate?.() ?? new Date();
}

function toRegions(d: DocumentData): ProviderRegion[] {
  const raw = d.regions;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (
      r &&
      typeof r.city === "string" &&
      typeof r.district === "string"
    ) {
      return [{ city: r.city, district: r.district }];
    }
    return [];
  });
}

function toPriceBook(d: DocumentData): ProviderPriceBookEntry[] | undefined {
  const raw = d.priceBook;
  if (!Array.isArray(raw)) return undefined;
  return raw.flatMap((e) => {
    if (
      e &&
      typeof e.category === "string" &&
      typeof e.unit === "string" &&
      typeof e.unitLabel === "string" &&
      typeof e.basePrice === "number"
    ) {
      return [
        {
          category: e.category as QuoteCategory,
          unit: e.unit as ProviderPriceBookEntry["unit"],
          unitLabel: e.unitLabel,
          basePrice: e.basePrice,
          options: Array.isArray(e.options)
            ? e.options.flatMap((o: unknown) => {
                if (
                  o &&
                  typeof o === "object" &&
                  typeof (o as { label?: unknown }).label === "string" &&
                  typeof (o as { price?: unknown }).price === "number"
                ) {
                  return [
                    {
                      label: (o as { label: string }).label,
                      price: (o as { price: number }).price,
                    },
                  ];
                }
                return [];
              })
            : undefined,
        },
      ];
    }
    return [];
  });
}

function toProvider(id: string, d: DocumentData): Provider {
  return {
    id,
    ownerUid: (d.ownerUid as string) ?? "",
    companyName: (d.companyName as string) ?? "",
    categories: Array.isArray(d.categories)
      ? (d.categories as QuoteCategory[])
      : [],
    regions: toRegions(d),
    contactEmail: (d.contactEmail as string) ?? "",
    contactPhone: d.contactPhone as string | undefined,
    description: d.description as string | undefined,
    isCheonggwangOwned: d.isCheonggwangOwned === true,
    insured: d.insured === true,
    insuranceAmount:
      typeof d.insuranceAmount === "number"
        ? (d.insuranceAmount as number)
        : undefined,
    pageId: (d.pageId as string | null) ?? null,
    rating: typeof d.rating === "number" ? (d.rating as number) : null,
    reviewCount:
      typeof d.reviewCount === "number" ? (d.reviewCount as number) : null,
    responseTimeHours:
      typeof d.responseTimeHours === "number"
        ? (d.responseTimeHours as number)
        : null,
    responseTimeMinutes:
      typeof d.responseTimeMinutes === "number"
        ? (d.responseTimeMinutes as number)
        : null,
    completedWorkCount:
      typeof d.completedWorkCount === "number"
        ? (d.completedWorkCount as number)
        : null,
    repeatRate:
      typeof d.repeatRate === "number" ? (d.repeatRate as number) : null,
    verified: d.verified === true,
    yearsOfExperience:
      typeof d.yearsOfExperience === "number"
        ? (d.yearsOfExperience as number)
        : undefined,
    isAvailable: d.isAvailable === true,
    priceBook: toPriceBook(d),
    profileImage:
      typeof d.profileImage === "string"
        ? (d.profileImage as string)
        : undefined,
    profileImagePath:
      typeof d.profileImagePath === "string"
        ? (d.profileImagePath as string)
        : undefined,
    brandTone:
      d.brandTone === "friendly" ||
      d.brandTone === "professional" ||
      d.brandTone === "playful"
        ? (d.brandTone as "friendly" | "professional" | "playful")
        : null,
    slogan: typeof d.slogan === "string" ? (d.slogan as string) : null,
    lastPromoPostAt:
      (d.lastPromoPostAt as Timestamp | undefined)?.toDate?.() ?? null,
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
    updatedAt: tsToDate(d.updatedAt as Timestamp | undefined),
  };
}

export const providerRepository = {
  async get(id: string): Promise<Provider | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toProvider(snap.id, snap.data()!);
  },

  async listByCategory(category: QuoteCategory): Promise<Provider[]> {
    const snap = await col()
      .where("categories", "array-contains", category)
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d) => toProvider(d.id, d.data()));
  },

  /**
   * v1.1b #5 client-dashboard — Top rated providers.
   * Composite index: isAvailable + repeatRate + rating + completedWorkCount.
   * Firestore orderBy는 null 값을 자동으로 NULLS LAST 처리하므로
   * 신규 청명(rating/repeatRate null)은 자연 후순위.
   */
  async listTopRated(limit = 5): Promise<Provider[]> {
    const snap = await col()
      .where("isAvailable", "==", true)
      .orderBy("repeatRate", "desc")
      .orderBy("rating", "desc")
      .orderBy("completedWorkCount", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toProvider(d.id, d.data()));
  },

  /**
   * v1.2 #2 provider-search — 필터 + 정렬 기반 탐색.
   * Firestore: isAvailable + [categories array-contains] + orderBy(sort, desc) + limit(100).
   * Client-side 보정: insuredOnly · region · minRating (composite index 폭발 회피).
   */
  async search(filters: SearchFilters): Promise<Provider[]> {
    const CAP = 100;
    let q: FirebaseFirestore.Query = col().where("isAvailable", "==", true);
    if (filters.category) {
      q = q.where("categories", "array-contains", filters.category);
    }
    q = q.orderBy(filters.sort, "desc").limit(CAP);

    const snap = await q.get();
    if (snap.size >= CAP) {
      console.warn(
        `[provider-search] result cap reached (${CAP}). v1.2+ paginate 필요`,
      );
    }

    let providers = snap.docs.map((d) => toProvider(d.id, d.data()));

    // client-side 보정
    if (filters.insuredOnly) {
      providers = providers.filter((p) => p.insured);
    }
    if (filters.region) {
      const { city, district } = filters.region;
      providers = providers.filter((p) =>
        p.regions.some((r) => r.city === city && r.district === district),
      );
    }
    if (filters.minRating !== null) {
      const threshold = filters.minRating;
      providers = providers.filter(
        (p) => p.rating != null && p.rating >= threshold,
      );
    }

    return providers;
  },

  /**
   * v1.1b #5 client-dashboard — 활동중 청명 priceBook 전체.
   * 카테고리별 평균가 집계용 · 100개 cap.
   * 100개 도달 시 warn log · v1.2+ paginate 검토.
   */
  async listPriceBookAll(): Promise<Provider[]> {
    const CAP = 100;
    const snap = await col()
      .where("isAvailable", "==", true)
      .limit(CAP)
      .get();
    if (snap.size >= CAP) {
      console.warn(
        `[client-dashboard] listPriceBookAll cap reached (${CAP}). v1.2+ paginate 필요`,
      );
    }
    return snap.docs.map((d) => toProvider(d.id, d.data()));
  },

  async update(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    await col()
      .doc(id)
      .update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  },

  async create(
    data: Omit<Provider, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const ref = col().doc();
    const now = FieldValue.serverTimestamp();
    await ref.create({
      ownerUid: data.ownerUid,
      companyName: data.companyName,
      categories: data.categories,
      regions: data.regions,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ?? null,
      description: data.description ?? null,
      isCheonggwangOwned: data.isCheonggwangOwned,
      insured: data.insured,
      pageId: data.pageId,
      rating: data.rating,
      responseTimeHours: data.responseTimeHours,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  },
};
