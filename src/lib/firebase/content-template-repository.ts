import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  ContentTemplate,
  ContentTemplateType,
} from "@/types/content-template";
import type { PartnerIndustry } from "@/domain/partner-industry";

/**
 * v1.11 partner-rag-system · §1·§5 — admin curated 컨텐츠 템플릿.
 * R7·C5: Admin SDK only write. read는 server action 경유 (rules는 read=true).
 */

const COLLECTION = "contentTemplates";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toContentTemplate(id: string, d: DocumentData): ContentTemplate {
  return {
    id,
    type: (d.type as ContentTemplateType) ?? "blog",
    industry: (d.industry as PartnerIndustry) ?? "other",
    title: String(d.title ?? ""),
    body: String(d.body ?? ""),
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    scenarios: Array.isArray(d.scenarios) ? (d.scenarios as string[]) : [],
    createdBy: String(d.createdBy ?? "admin"),
    createdAt: tsToDate(d.createdAt as Timestamp | undefined),
    updatedAt: tsToDate(d.updatedAt as Timestamp | undefined),
  };
}

interface UpsertInput {
  type: ContentTemplateType;
  industry: PartnerIndustry;
  title: string;
  body: string;
  tags: string[];
  scenarios: string[];
}

export const contentTemplateRepository = {
  /** 단건 조회. */
  async getById(id: string): Promise<ContentTemplate | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toContentTemplate(snap.id, snap.data()!);
  },

  /**
   * H4 결의: type별 limit ≤2 union — 결과 [blog ≤2, card-news ≤2] 합쳐 max 4건.
   */
  async queryByIndustry(
    industry: PartnerIndustry,
    opts: { maxPerType: number },
  ): Promise<ContentTemplate[]> {
    const types: ContentTemplateType[] = ["blog", "card-news"];
    const results = await Promise.all(
      types.map(async (type) => {
        const snap = await col()
          .where("industry", "==", industry)
          .where("type", "==", type)
          .limit(opts.maxPerType)
          .get();
        return snap.docs.map((d) => toContentTemplate(d.id, d.data()));
      }),
    );
    return results.flat();
  },

  /**
   * M1 결의: industry='other' fallback — type만 매칭, industry 무시.
   */
  async queryByType(opts: {
    maxPerType: number;
  }): Promise<ContentTemplate[]> {
    const types: ContentTemplateType[] = ["blog", "card-news"];
    const results = await Promise.all(
      types.map(async (type) => {
        const snap = await col()
          .where("type", "==", type)
          .limit(opts.maxPerType)
          .get();
        return snap.docs.map((d) => toContentTemplate(d.id, d.data()));
      }),
    );
    return results.flat();
  },

  /** admin 라이브러리 목록 (필터 옵션). */
  async listAll(filter?: {
    industry?: PartnerIndustry;
    type?: ContentTemplateType;
  }): Promise<ContentTemplate[]> {
    let q: FirebaseFirestore.Query<DocumentData> = col();
    if (filter?.industry) q = q.where("industry", "==", filter.industry);
    if (filter?.type) q = q.where("type", "==", filter.type);
    const snap = await q.orderBy("updatedAt", "desc").limit(200).get();
    return snap.docs.map((d) => toContentTemplate(d.id, d.data()));
  },

  /** create or update (idempotent). */
  async upsert(
    id: string,
    input: UpsertInput,
    createdBy: string,
  ): Promise<void> {
    const ref = col().doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      await ref.update({
        ...input,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await ref.create({
        ...input,
        createdBy,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  },

  async delete(id: string): Promise<void> {
    await col().doc(id).delete();
  },
};
