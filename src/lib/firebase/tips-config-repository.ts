import "server-only";
import {
  Timestamp,
  FieldValue,
  type DocumentSnapshot,
  type Query,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import {
  DEFAULT_TIPS_AUTO_CONFIG,
  type TipsAutoConfig,
  type TipsTopicDoc,
  type TipsTopicInput,
  type TipsTickEvent,
  type TipsTickStatus,
} from "@/lib/tips/tips-config";

/**
 * v1.18 cycle #31 tips-admin-config · §3.5
 *
 * Next.js 측 Firestore access — config + topic CRUD + history read.
 * appendTipsHistory는 functions side 전용 (Next.js은 read만).
 *
 * C1·M2 결의 — 단일 admin literal "admin" 사용. uid 추적 X.
 * C4 결의 — Firestore Timestamp → Date 변환 (interface는 Date).
 * R12 fallback — config doc 미존재 시 DEFAULT_TIPS_AUTO_CONFIG 반환.
 */

const SYS_DOC = () => adminDb.collection("system").doc("tipsAutoConfig");
const TOPICS = () => adminDb.collection("tipsTopicPool");
const HISTORY = () => adminDb.collection("tipsHistory");

export const tipsConfigRepository = {
  // ───────────────── Config (S2) ─────────────────

  async getConfig(): Promise<TipsAutoConfig> {
    const snap = await SYS_DOC().get();
    if (!snap.exists) {
      // R12 fallback — M6 결의 (UI에서 new Date(0) 검출)
      return { ...DEFAULT_TIPS_AUTO_CONFIG };
    }
    const d = snap.data()!;
    return {
      enabled: d.enabled !== false,
      updatedAt: (d.updatedAt as Timestamp)?.toDate?.() ?? new Date(0),
      updatedBy: "admin",
    };
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await SYS_DOC().set(
      {
        enabled,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "admin",
      },
      { merge: true },
    );
  },

  // ───────────────── Topics (S4 + S5) ─────────────────

  async listTopics(opts: { onlyActive?: boolean } = {}): Promise<TipsTopicDoc[]> {
    let q: Query = TOPICS();
    if (opts.onlyActive) q = q.where("isActive", "==", true);
    const snap = await q.orderBy("order", "asc").get();
    return snap.docs.map(toTipsTopicDoc);
  },

  async getTopic(id: string): Promise<TipsTopicDoc | null> {
    const snap = await TOPICS().doc(id).get();
    return snap.exists ? toTipsTopicDoc(snap) : null;
  },

  async addTopic(input: TipsTopicInput): Promise<string> {
    // L3 결의 — millisecond collision 방지 jitter
    const order = Date.now() + Math.random();
    const ref = await TOPICS().add({
      label: input.label,
      category: input.category,
      season: input.season ?? null,
      intent: input.intent ?? null,
      photoless: input.photoless === true,
      isActive: true,
      order,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: "admin",
    });
    return ref.id;
  },

  async updateTopic(id: string, patch: TipsTopicInput): Promise<void> {
    await TOPICS()
      .doc(id)
      .update({
        label: patch.label,
        category: patch.category,
        season: patch.season ?? null,
        intent: patch.intent ?? null,
        photoless: patch.photoless === true,
        updatedAt: FieldValue.serverTimestamp(),
      });
  },

  async setTopicActive(id: string, isActive: boolean): Promise<void> {
    await TOPICS().doc(id).update({
      isActive,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  // ───────────────── History (S8) ─────────────────

  async listHistory(limit = 10): Promise<TipsTickEvent[]> {
    const snap = await HISTORY().orderBy("at", "desc").limit(limit).get();
    return snap.docs.map(toTipsTickEvent);
  },
};

function toTipsTopicDoc(snap: DocumentSnapshot): TipsTopicDoc {
  const d = snap.data()!;
  return {
    id: snap.id,
    label: String(d.label ?? ""),
    category: d.category,
    season: d.season ?? null,
    intent: d.intent ?? null,
    photoless: d.photoless === true,
    isActive: d.isActive !== false,
    order: typeof d.order === "number" ? d.order : 0,
    createdAt: (d.createdAt as Timestamp)?.toDate?.() ?? new Date(0),
    updatedAt: (d.updatedAt as Timestamp)?.toDate?.() ?? new Date(0),
    createdBy: "admin",
  };
}

function toTipsTickEvent(snap: DocumentSnapshot): TipsTickEvent {
  const d = snap.data()!;
  return {
    id: snap.id,
    at: (d.at as Timestamp)?.toDate?.() ?? new Date(0),
    status: d.status as TipsTickStatus,
    topicId: typeof d.topicId === "string" ? d.topicId : undefined,
    postId: typeof d.postId === "string" ? d.postId : undefined,
    postSlug: typeof d.postSlug === "string" ? d.postSlug : undefined,
    hygieneScore: typeof d.hygieneScore === "number" ? d.hygieneScore : undefined,
    reason: typeof d.reason === "string" ? d.reason : undefined,
  };
}
