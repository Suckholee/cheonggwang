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
