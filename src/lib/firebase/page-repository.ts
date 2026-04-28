import "server-only";
import {
  FieldValue,
  type DocumentData,
  type Timestamp,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import {
  emptySections,
  type Page,
  type Category,
  type Photo,
  type Region,
} from "@/types/page";
import type { SavePageInput } from "@/domain/schemas";

const COLLECTION = "pages";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined): Date {
  return ts?.toDate?.() ?? new Date();
}

function toRegion(d: DocumentData): Region | null {
  const r = d.region as { city?: unknown; district?: unknown } | undefined;
  if (!r || typeof r.city !== "string" || typeof r.district !== "string") {
    return null;
  }
  return { city: r.city, district: r.district };
}

function toPage(id: string, d: DocumentData): Page {
  return {
    id,
    ownerUid: d.ownerUid,
    category: d.category as Category,
    businessName: d.businessName ?? "",
    address: d.address ?? "",
    phone: d.phone ?? "",
    keyPoints: Array.isArray(d.keyPoints) ? (d.keyPoints as string[]) : [],
    photos: Array.isArray(d.photos) ? (d.photos as Photo[]) : [],
    sections: d.sections ?? emptySections(),
    slug: d.slug ?? null,
    published: d.published === true,
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    region: toRegion(d),
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
    updatedAt: tsToDate(d.updatedAt as Timestamp | undefined),
  };
}

export type UpdatablePageFields = Partial<
  Pick<
    Page,
    | "category"
    | "businessName"
    | "address"
    | "phone"
    | "keyPoints"
    | "photos"
    | "sections"
    | "slug"
    | "published"
    | "tags"
    | "region"
  >
>;

export const pageRepository = {
  async get(id: string): Promise<Page | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toPage(snap.id, snap.data()!);
  },

  async listByOwner(uid: string): Promise<Page[]> {
    const snap = await col()
      .where("ownerUid", "==", uid)
      .orderBy("updatedAt", "desc")
      .get();
    return snap.docs.map((d) => toPage(d.id, d.data()));
  },

  async listPublished(options: {
    category?: Category;
    limit?: number;
  }): Promise<Page[]> {
    let q: FirebaseFirestore.Query = col().where("published", "==", true);
    if (options.category) q = q.where("category", "==", options.category);
    const snap = await q
      .orderBy("updatedAt", "desc")
      .limit(options.limit ?? 500)
      .get();
    return snap.docs.map((d) => toPage(d.id, d.data()));
  },

  /**
   * v1.15 cycle #28 partner-aeo-boost · §3.5 (H4 결의) — sitemap 용 경량 메서드.
   * published === true && slug !== null인 매장 페이지 slug + updatedAt만 반환.
   */
  async listPublishedSlugsForSitemap(
    limit = 5000,
  ): Promise<Array<{ slug: string; updatedAt: Date }>> {
    const snap = await col()
      .where("published", "==", true)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    const result: Array<{ slug: string; updatedAt: Date }> = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const slug = (d.slug as string | null | undefined) ?? null;
      if (!slug) continue;
      const updatedAt = (d.updatedAt as Timestamp | undefined)?.toDate() ?? new Date();
      result.push({ slug, updatedAt });
    }
    return result;
  },

  async create(uid: string, input: SavePageInput): Promise<string> {
    const ref = col().doc();
    const now = FieldValue.serverTimestamp();
    await ref.create({
      ownerUid: uid,
      category: input.category,
      businessName: input.businessName,
      address: input.address,
      phone: input.phone,
      keyPoints: input.keyPoints,
      photos: input.photos,
      sections: emptySections(),
      slug: null,
      published: false,
      tags: [],
      region: null,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  },

  async update(id: string, patch: UpdatablePageFields): Promise<void> {
    const payload: Record<string, unknown> = {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await col().doc(id).update(payload);
  },

  async delete(id: string): Promise<void> {
    await col().doc(id).delete();
  },
};
