import "server-only";
import {
  FieldValue,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";
import { adminDb } from "./admin";
import {
  DEFAULT_AUTO_PUBLISH,
  type AutoPublishConfig,
  type Partner,
  type PartnerEvent,
  type PartnerStatus,
} from "@/types/partner";
import type { PartnerAutoSeries, QueueItem } from "@/types/auto-series";
import { isAutoSeriesAngle } from "@/domain/auto-series-angle";
import { isPostFormat } from "@/domain/post-format";
import type { PartnerProfile } from "@/types/partner-profile";
import type { QuoteCategory } from "@/domain/quote-category";
import { AppError } from "@/lib/errors";

/**
 * v1.7 partner-promo — partners 컬렉션 액세스.
 * 모든 쓰기는 Admin SDK (Route Handler 또는 CLI 경유). 클라이언트 직접 쓰기 차단.
 */

const COLLECTION = "partners";
const col = () => adminDb.collection(COLLECTION);

function tsToDate(ts: Timestamp | undefined | null): Date {
  return ts?.toDate?.() ?? new Date();
}

function toAutoPublish(d: DocumentData | undefined): AutoPublishConfig {
  if (!d || typeof d !== "object") return { ...DEFAULT_AUTO_PUBLISH };
  return {
    enabled: d.enabled === true,
    weekdays: Array.isArray(d.weekdays)
      ? (d.weekdays as number[]).filter(
          (n) => Number.isInteger(n) && n >= 0 && n <= 6,
        )
      : [],
    startMinute: Number.isInteger(d.startMinute)
      ? Math.max(0, Math.min(1439, d.startMinute as number))
      : 0,
    endMinute: Number.isInteger(d.endMinute)
      ? Math.max(1, Math.min(1440, d.endMinute as number))
      : 0,
    timezone: "Asia/Seoul",
  };
}

function toPartner(id: string, d: DocumentData): Partner {
  return {
    id,
    ownerUid: String(d.ownerUid ?? ""),
    businessName: String(d.businessName ?? ""),
    logoUrl: (d.logoUrl as string | null | undefined) ?? null,
    category: (d.category as QuoteCategory | null | undefined) ?? null,
    regionLabel: (d.regionLabel as string | null | undefined) ?? null,
    status:
      d.status === "active" ||
      d.status === "invited" ||
      d.status === "suspended"
        ? (d.status as PartnerStatus)
        : "invited",
    autoPublish: toAutoPublish(d.autoPublish as DocumentData | undefined),
    issuedAt: tsToDate(d.issuedAt as Timestamp | undefined),
    issuedBy: String(d.issuedBy ?? ""),
    notes: (d.notes as string | null | undefined) ?? null,
    // cycle #24 partner-rag-system — profile nested 매핑 (cycle #26 hotfix: 이전엔 누락)
    profile: d.profile as PartnerProfile | undefined,
    // v1.13 cycle #26 — autoSeries optional 매핑
    autoSeries: toAutoSeries(d.autoSeries as DocumentData | undefined),
    // v1.14 cycle #27 — autoSeriesQueue optional 매핑 (validation 포함)
    autoSeriesQueue: toAutoSeriesQueue(
      d.autoSeriesQueue as unknown[] | undefined,
    ),
  };
}

function toAutoSeriesQueue(raw: unknown): QueueItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw.filter((q): q is QueueItem => {
    if (q === null || typeof q !== "object") return false;
    const obj = q as Record<string, unknown>;
    return (
      typeof obj.id === "string" &&
      typeof obj.enabled === "boolean" &&
      isAutoSeriesAngle(obj.angle) &&
      isPostFormat(obj.format)
    );
  });
  return valid.length === 0 && raw.length === 0 ? [] : valid;
}

function toAutoSeries(
  raw: DocumentData | undefined,
): PartnerAutoSeries | undefined {
  if (!raw) return undefined;
  const tone = raw.brandTone;
  return {
    enabled: raw.enabled === true,
    lastIndex: typeof raw.lastIndex === "number" ? raw.lastIndex : -1,
    lastTickAt: raw.lastTickAt
      ? tsToDate(raw.lastTickAt as Timestamp)
      : null,
    brandTone:
      tone === "professional" || tone === "playful" || tone === "friendly"
        ? tone
        : "friendly",
    totalPublished:
      typeof raw.totalPublished === "number" ? raw.totalPublished : 0,
    totalFailed: typeof raw.totalFailed === "number" ? raw.totalFailed : 0,
    // v1.14 cycle #27 (C1)
    photoCursor:
      typeof raw.photoCursor === "number" ? raw.photoCursor : 0,
    // v1.16 cycle #29 (R12 back-compat) — 미설정 시 'auto'로 fallback
    publishMode: raw.publishMode === "draft-only" ? "draft-only" : "auto",
    targetAudience:
      typeof raw.targetAudience === "string" ? raw.targetAudience : null,
  };
}

export interface CreatePartnerInput {
  id: string;
  ownerUid: string;
  businessName: string;
  logoUrl?: string | null;
  category?: QuoteCategory | null;
  regionLabel?: string | null;
  status?: PartnerStatus; // default 'active'
  issuedBy: string;
  notes?: string | null;
}

export const partnerRepository = {
  /** 파트너 마스터 단건 조회. */
  async getById(id: string): Promise<Partner | null> {
    const snap = await col().doc(id).get();
    if (!snap.exists) return null;
    return toPartner(snap.id, snap.data()!);
  },

  /**
   * Auth uid로 파트너 조회. 한 uid에 partner 1건 가정 (CLI 검증).
   * 누락 시 null.
   */
  async getByOwnerUid(uid: string): Promise<Partner | null> {
    const snap = await col()
      .where("ownerUid", "==", uid)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toPartner(doc.id, doc.data());
  },

  /**
   * v1.8 admin-console — 전체 partners 목록 (관리 화면용).
   * status 필터는 호출자가 in-memory에서 수행 (작은 카운트 가정, partners ≤ 수백 건).
   */
  async listAll(limit = 200): Promise<Partner[]> {
    const snap = await col()
      .orderBy("issuedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toPartner(d.id, d.data()));
  },

  /** 운영진 발급 — CLI에서 호출. */
  async create(input: CreatePartnerInput): Promise<void> {
    const exists = await this.getByOwnerUid(input.ownerUid);
    if (exists) {
      throw new AppError(
        "ALREADY_REGISTERED",
        `이미 partner가 발급된 uid: ${input.ownerUid} (partnerId=${exists.id})`,
      );
    }
    const payload: DocumentData = {
      ownerUid: input.ownerUid,
      businessName: input.businessName,
      logoUrl: input.logoUrl ?? null,
      category: input.category ?? null,
      regionLabel: input.regionLabel ?? null,
      status: input.status ?? "active",
      autoPublish: { ...DEFAULT_AUTO_PUBLISH },
      issuedAt: FieldValue.serverTimestamp(),
      issuedBy: input.issuedBy,
      notes: input.notes ?? null,
    };
    await col().doc(input.id).create(payload);
  },

  /** 운영진 status 변경. */
  async setStatus(id: string, next: PartnerStatus): Promise<void> {
    await col().doc(id).update({
      status: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  /** 자동발행 설정 갱신. 검증은 호출자가 수행 (auto-publish-window.ts). */
  async updateAutoPublish(
    id: string,
    cfg: AutoPublishConfig,
  ): Promise<void> {
    await col().doc(id).update({
      autoPublish: { ...cfg },
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  /**
   * v1.13 cycle #26 — autoSeries 부분 갱신 (dot-path).
   *
   * 화이트리스트는 호출자(server action)가 검증.
   *  - server action: enabled, brandTone만
   *  - admin/runner: 모든 필드 가능
   *
   * null 값은 FieldValue.delete()로 변환.
   */
  async updateAutoSeries(
    id: string,
    patch: Partial<PartnerAutoSeries>,
  ): Promise<void> {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      fields[`autoSeries.${k}`] = v === null ? FieldValue.delete() : v;
    }
    fields.updatedAt = FieldValue.serverTimestamp();
    await col().doc(id).update(fields);
  },

  /**
   * v1.13 cycle #26 — autoSeries.enabled=true + status='active' 파트너 목록.
   * Cloud Functions runner가 매시간 호출. 인덱스: (autoSeries.enabled, status).
   */
  async listAutoSeriesEnabled(): Promise<Partner[]> {
    const snap = await col()
      .where("autoSeries.enabled", "==", true)
      .where("status", "==", "active")
      .get();
    return snap.docs.map((d) => toPartner(d.id, d.data()));
  },

  /**
   * v1.14 cycle #27 — autoSeriesQueue 갱신 (queue만, lastIndex 미변경).
   * addQueueItem · toggleQueueItem (lastIndex 변경 없는 경우)에서 사용.
   */
  async updateAutoSeriesQueue(
    id: string,
    queue: QueueItem[],
  ): Promise<void> {
    await col().doc(id).update({
      autoSeriesQueue: queue,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  /**
   * v1.14 cycle #27 (H7 결의) — autoSeriesQueue + lastIndex atomic update.
   * 사장님 편집 ↔ cron tick race 방지. removeQueueItem · toggleQueueItem ·
   * reorderQueue에서 사용.
   */
  async updateAutoSeriesQueueAndIndexAtomic(
    id: string,
    queue: QueueItem[],
    lastIndex: number,
  ): Promise<void> {
    await adminDb.runTransaction(async (tx) => {
      const ref = col().doc(id);
      tx.update(ref, {
        autoSeriesQueue: queue,
        "autoSeries.lastIndex": lastIndex,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  },

  /**
   * 감사 이벤트 추가. partners/{id}/events 서브컬렉션에 append.
   * 실패는 경고 로그만 (호출자 메인 흐름을 막지 않음).
   */
  async appendEvent(
    partnerId: string,
    event: PartnerEvent,
  ): Promise<void> {
    try {
      await col()
        .doc(partnerId)
        .collection("events")
        .add({
          ...event,
          decidedAt: FieldValue.serverTimestamp(),
        });
    } catch (e) {
      console.warn("[partner-repository.appendEvent] 실패", e);
    }
  },
};
