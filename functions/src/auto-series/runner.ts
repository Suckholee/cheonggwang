import {
  type Firestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";
import {
  generatePartnerPromoDraft,
  type PartnerPromoDraftResult,
} from "./lib/generator";
import {
  effectiveQueue,
  pickSlotFromEffective,
} from "./lib/effective-queue";
import { deriveAutoInputs } from "./lib/derive-inputs";
import {
  isInAutoPublishWindow,
  recentlyPublishedInWindow,
} from "./lib/window";
import { createPostFromDraft } from "./lib/post-writer";
import {
  isAutoSeriesAngle,
  isPostFormat,
} from "./lib/guards";
import type { Partner, QueueItem } from "./lib/types";

/**
 * v1.13 cycle #26 partner-auto-series · §4.2 — Cloud Functions runner.
 *
 * 매시간(09:00–18:00 KST) cron 호출 → autoSeries.enabled=true partner 순회 →
 * window check + atomic lastIndex update + AI 생성·발행.
 */

function partnerFromSnap(id: string, d: FirebaseFirestore.DocumentData): Partner {
  // functions 측 minimal mapper — autoSeries.lastTickAt도 toDate
  const autoSeries = d.autoSeries
    ? {
        enabled: d.autoSeries.enabled === true,
        lastIndex:
          typeof d.autoSeries.lastIndex === "number"
            ? d.autoSeries.lastIndex
            : -1,
        lastTickAt: d.autoSeries.lastTickAt
          ? (d.autoSeries.lastTickAt as Timestamp).toDate()
          : null,
        brandTone:
          d.autoSeries.brandTone === "professional" ||
          d.autoSeries.brandTone === "playful"
            ? d.autoSeries.brandTone
            : "friendly",
        totalPublished:
          typeof d.autoSeries.totalPublished === "number"
            ? d.autoSeries.totalPublished
            : 0,
        totalFailed:
          typeof d.autoSeries.totalFailed === "number"
            ? d.autoSeries.totalFailed
            : 0,
        // v1.14 cycle #27 (C1)
        photoCursor:
          typeof d.autoSeries.photoCursor === "number"
            ? d.autoSeries.photoCursor
            : 0,
        // v1.16 cycle #29 (R12 back-compat): 미설정 시 'auto' fallback
        publishMode:
          d.autoSeries.publishMode === "draft-only"
            ? ("draft-only" as const)
            : ("auto" as const),
        targetAudience:
          typeof d.autoSeries.targetAudience === "string"
            ? d.autoSeries.targetAudience
            : null,
      }
    : undefined;

  return {
    id,
    ownerUid: String(d.ownerUid ?? ""),
    businessName: String(d.businessName ?? ""),
    logoUrl: d.logoUrl ?? null,
    category: d.category ?? null,
    regionLabel: d.regionLabel ?? null,
    status: d.status ?? "active",
    autoPublish: d.autoPublish ?? {
      enabled: false,
      weekdays: [],
      startMinute: 0,
      endMinute: 0,
      timezone: "Asia/Seoul",
    },
    profile: d.profile ?? undefined,
    autoSeries,
    // v1.14 cycle #27 partner-series-queue
    autoSeriesQueue: toQueueItems(d.autoSeriesQueue),
  };
}

function toQueueItems(raw: unknown): QueueItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid: QueueItem[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (
      typeof obj.id !== "string" ||
      typeof obj.enabled !== "boolean" ||
      !isAutoSeriesAngle(obj.angle) ||
      !isPostFormat(obj.format)
    ) {
      continue;
    }
    valid.push({
      id: obj.id,
      angle: obj.angle,
      format: obj.format,
      enabled: obj.enabled,
    });
  }
  return valid;
}

export async function runAutoSeriesTick(now: Date): Promise<void> {
  const db = getFirestore();

  const snap = await db
    .collection("partners")
    .where("autoSeries.enabled", "==", true)
    .where("status", "==", "active")
    .get();

  if (snap.empty) return;

  const results = await Promise.allSettled(
    snap.docs.map((doc) =>
      processOnePartner(db, partnerFromSnap(doc.id, doc.data()), now),
    ),
  );

  const rejected = results.filter((r) => r.status === "rejected");
  if (rejected.length > 0) {
    console.warn(
      `[auto-series] tick rejections=${rejected.length}/${snap.size}`,
      {
        samples: rejected.slice(0, 3).map((r) => {
          const reason = (r as PromiseRejectedResult).reason;
          if (reason instanceof Error) return reason.message;
          return String(reason);
        }),
      },
    );
  } else {
    console.log(`[auto-series] tick ok — ${snap.size} partners checked`);
  }
}

async function processOnePartner(
  db: Firestore,
  partner: Partner,
  now: Date,
): Promise<void> {
  // R3 window double-check
  if (!isInAutoPublishWindow(partner.autoPublish, now)) return;
  if (recentlyPublishedInWindow(partner, now)) return;

  // R2 atomic transaction — lastIndex 진행 (lastTickAt은 결과 반영 후 — H2)
  // v1.14 cycle #27 — effectiveQueue 기준. partner는 tx 내 fresh 데이터로 재구성.
  const slotResult = await db.runTransaction(async (tx) => {
    const ref = db.collection("partners").doc(partner.id);
    const fresh = await tx.get(ref);
    const data = fresh.data();
    const freshPartner = partnerFromSnap(partner.id, data ?? {});
    const effective = effectiveQueue(freshPartner);

    const lastIndex =
      typeof data?.autoSeries?.lastIndex === "number"
        ? (data.autoSeries.lastIndex as number)
        : -1;
    // R8 — lastIndex가 effective 길이를 벗어나면 -1로 reset (큐 편집 사이 race 안전장치)
    const safeLastIndex =
      lastIndex >= 0 && lastIndex < effective.length ? lastIndex : -1;

    const { nextIndex, slot } = pickSlotFromEffective(
      effective,
      safeLastIndex,
    );
    tx.update(ref, { "autoSeries.lastIndex": nextIndex });
    return { nextIndex, slot };
  });

  const { nextIndex, slot } = slotResult;
  const { angle, format } = slot;

  const derived = deriveAutoInputs(partner, angle);
  if ("error" in derived) {
    await markWindowConsumed(db, partner.id, now);
    await appendSeriesHistory(db, partner.id, {
      slotIndex: nextIndex,
      angle,
      format,
      status: "photo-missing",
      reason: "partner.profile.photoUrls 비어있음",
      at: now,
    });
    await db
      .collection("partners")
      .doc(partner.id)
      .update({ "autoSeries.totalFailed": FieldValue.increment(1) });
    return;
  }

  const postId = nanoid16();
  let draft: PartnerPromoDraftResult;
  try {
    draft = await generatePartnerPromoDraft({
      uid: partner.ownerUid,
      partnerId: partner.id,
      postId,
      photoUrls: derived.photoUrls,
      keywords: derived.keywords,
      slogan: null,
      brandTone: partner.autoSeries?.brandTone ?? "friendly",
      businessName: partner.businessName,
      format,
      profile: partner.profile
        ? {
            description: partner.profile.description,
            usps: partner.profile.usps,
            photoAnalysisSummary: partner.profile.photoAnalysisSummary,
          }
        : undefined,
    });
  } catch (e) {
    // R5/H2 — transient error는 lastTickAt 미갱신 → 다음 tick 재시도
    await appendSeriesHistory(db, partner.id, {
      slotIndex: nextIndex,
      angle,
      format,
      status: "error",
      reason: extractErrorMessage(e),
      at: now,
    });
    await db
      .collection("partners")
      .doc(partner.id)
      .update({ "autoSeries.totalFailed": FieldValue.increment(1) });
    return;
  }

  if (!draft.passed) {
    // R5 hygiene-fail — window 소비
    await markWindowConsumed(db, partner.id, now);
    await appendSeriesHistory(db, partner.id, {
      slotIndex: nextIndex,
      angle,
      format,
      status: "hygiene-fail",
      reason: draft.reasons.join(", "),
      hygieneScore: draft.hygieneScore,
      at: now,
    });
    await db
      .collection("partners")
      .doc(partner.id)
      .update({ "autoSeries.totalFailed": FieldValue.increment(1) });
    return;
  }

  try {
    // v1.16 cycle #29 (G1 결의): publishMode 분기 — 'draft-only'면 draft로 저장.
    // R13: 사장님이 cycle #19 publish 토글로 draft → published 전환.
    const desiredStatus =
      partner.autoSeries?.publishMode === "draft-only"
        ? ("draft" as const)
        : ("published" as const);
    const historyStatus =
      desiredStatus === "draft"
        ? ("auto-draft-saved" as const)
        : ("published" as const);

    const { slug } = await createPostFromDraft(db, postId, {
      partner,
      draft,
      photoUrls: derived.photoUrls,
      brandTone: partner.autoSeries?.brandTone ?? "friendly",
      keywords: derived.keywords,
      generatedAt: now,
      isAutoSeries: true,
      publishStatus: desiredStatus,
    });

    await markWindowConsumed(db, partner.id, now);
    await appendSeriesHistory(db, partner.id, {
      slotIndex: nextIndex,
      angle,
      format,
      status: historyStatus,
      postId,
      postSlug: slug,
      hygieneScore: draft.hygieneScore,
      at: now,
    });
    // v1.14 cycle #27 (C1) — 성공 발행시에만 photoCursor 증분.
    // hygiene-fail/error/photo-missing엔 사진 사용 안했으니 cursor 보존.
    await db
      .collection("partners")
      .doc(partner.id)
      .update({
        "autoSeries.totalPublished": FieldValue.increment(1),
        "autoSeries.photoCursor": FieldValue.increment(1),
      });
  } catch (e) {
    // post.create 실패 — transient 가정, lastTickAt 미갱신
    await appendSeriesHistory(db, partner.id, {
      slotIndex: nextIndex,
      angle,
      format,
      status: "error",
      reason: `post.create: ${extractErrorMessage(e)}`,
      at: now,
    });
    await db
      .collection("partners")
      .doc(partner.id)
      .update({ "autoSeries.totalFailed": FieldValue.increment(1) });
  }
}

async function markWindowConsumed(
  db: Firestore,
  partnerId: string,
  _now: Date,
): Promise<void> {
  await db.collection("partners").doc(partnerId).update({
    "autoSeries.lastTickAt": FieldValue.serverTimestamp(),
  });
}

interface SeriesHistoryAppend {
  slotIndex: number;
  angle: string;
  format: string;
  /** v1.16 cycle #29 (N2): 'auto-draft-saved' 추가 */
  status:
    | "published"
    | "auto-draft-saved"
    | "hygiene-fail"
    | "error"
    | "photo-missing";
  postId?: string;
  postSlug?: string;
  hygieneScore?: number;
  reason?: string;
  at: Date;
}

async function appendSeriesHistory(
  db: Firestore,
  partnerId: string,
  evt: SeriesHistoryAppend,
): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      slotIndex: evt.slotIndex,
      angle: evt.angle,
      format: evt.format,
      status: evt.status,
      at: Timestamp.fromDate(evt.at),
    };
    if (evt.postId) payload.postId = evt.postId;
    if (evt.postSlug) payload.postSlug = evt.postSlug;
    if (typeof evt.hygieneScore === "number")
      payload.hygieneScore = evt.hygieneScore;
    if (evt.reason) payload.reason = evt.reason;

    await db
      .collection("partners")
      .doc(partnerId)
      .collection("seriesHistory")
      .add(payload);
  } catch (e) {
    console.warn("[auto-series] seriesHistory append failed", e);
  }
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message.slice(0, 500);
  if (typeof e === "object" && e !== null) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg.slice(0, 500);
  }
  try {
    return JSON.stringify(e).slice(0, 500);
  } catch {
    return String(e).slice(0, 500);
  }
}

function nanoid16(): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
