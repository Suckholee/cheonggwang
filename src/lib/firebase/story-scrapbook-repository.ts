import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import type {
  StoryScrapbookItem,
  StoryScrapbookStatus,
} from "@/types/story-scrapbook";

const COLLECTION = "storyScrapbook";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date | null {
  return ts?.toDate?.() ?? null;
}

function toItem(id: string, d: DocumentData): StoryScrapbookItem {
  return {
    id,
    ownerUid: String(d.ownerUid ?? ""),
    photoUrls: Array.isArray(d.photoUrls) ? (d.photoUrls as string[]) : [],
    storyId: String(d.storyId ?? ""),
    memo: (d.memo as string | null | undefined) ?? null,
    uploadedAt: tsToDate(d.uploadedAt as Timestamp | undefined) ?? new Date(),
    status: (d.status as StoryScrapbookStatus) ?? "pending",
    batchId: (d.batchId as string | null | undefined) ?? null,
    processedAt: tsToDate(d.processedAt as Timestamp | undefined),
    publishedPostId: (d.publishedPostId as string | null | undefined) ?? null,
    publishedSlug: (d.publishedSlug as string | null | undefined) ?? null,
    failureReason: (d.failureReason as string | null | undefined) ?? null,
  };
}

export interface CreateScrapbookInput {
  ownerUid: string;
  photoUrls: string[];
  storyId: string;
  memo: string | null;
}

export const storyScrapbookRepository = {
  /** 업로드 직후 pending 상태로 저장. */
  async create(id: string, input: CreateScrapbookInput): Promise<void> {
    await col()
      .doc(id)
      .create({
        ownerUid: input.ownerUid,
        photoUrls: input.photoUrls,
        storyId: input.storyId,
        memo: input.memo,
        uploadedAt: FieldValue.serverTimestamp(),
        status: "pending" as StoryScrapbookStatus,
        batchId: null,
        processedAt: null,
        publishedPostId: null,
        publishedSlug: null,
        failureReason: null,
      });
  },

  /** 고객 스크랩북 리스트 (최근순). */
  async listByOwner(
    ownerUid: string,
    limit = 50,
  ): Promise<StoryScrapbookItem[]> {
    const snap = await col()
      .where("ownerUid", "==", ownerUid)
      .orderBy("uploadedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toItem(d.id, d.data()));
  },

  /** 크론 배치: 가장 오래된 pending N개 가져오기. */
  async listPending(limit = 20): Promise<StoryScrapbookItem[]> {
    const snap = await col()
      .where("status", "==", "pending")
      .orderBy("uploadedAt", "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toItem(d.id, d.data()));
  },

  /**
   * pending → processing 원자적 전환. 동시 배치 충돌 방지용 트랜잭션.
   * true 반환 시 이 배치가 처리 권리를 획득.
   */
  async claimForProcessing(
    id: string,
    batchId: string,
  ): Promise<boolean> {
    return adminDb.runTransaction(async (tx) => {
      const ref = col().doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) return false;
      const data = snap.data();
      if ((data?.status as string) !== "pending") return false;
      tx.update(ref, {
        status: "processing" as StoryScrapbookStatus,
        batchId,
      });
      return true;
    });
  },

  async markPublished(
    id: string,
    published: { postId: string; slug: string },
  ): Promise<void> {
    await col().doc(id).update({
      status: "published" as StoryScrapbookStatus,
      processedAt: FieldValue.serverTimestamp(),
      publishedPostId: published.postId,
      publishedSlug: published.slug,
      failureReason: null,
    });
  },

  async markFailed(id: string, reason: string): Promise<void> {
    await col()
      .doc(id)
      .update({
        status: "failed" as StoryScrapbookStatus,
        processedAt: FieldValue.serverTimestamp(),
        failureReason: reason.slice(0, 500),
      });
  },
};
