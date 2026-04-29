import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { composeTipDraft } from "./lib/tips-generator";
import { pickNextTopic } from "./lib/topic-pool";
import { pickStockImage } from "./lib/stock-images";
import { getTodayKstStart, currentKstSeason } from "./lib/today-kst";
import { inferCategoriesFromTopic } from "./lib/infer-categories";
import { uniqueSlug } from "../auto-series/lib/slug";
// v1.18 cycle #31 tips-admin-config — 신규 imports (S2/S4+S5/S8 + NEW-R23/R24)
import { readTipsAutoConfig } from "./lib/tips-config";
import {
  fetchActiveTopicPool,
  pickNextTopicFromPool,
} from "./lib/dynamic-topic-pool";
import { appendTipsHistory } from "./lib/tips-history";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.3
 * v1.18 cycle #31 tips-admin-config · §3.2 — 5 surgical patches (config gate +
 *   dynamic pool + history append). pickNextTopic 시그니처 미변경 (C2 결의 —
 *   신규 함수 pickNextTopicFromPool 별도 사용).
 *
 * tipsTick 핵심 흐름 (host TZ 무관, R10 패턴):
 *   0) [cycle #31 PATCH 1] config read — enabled=false면 즉시 skip + history (S2)
 *   1) R16 — 일일 1건 제한 (KST 자정 기준) [+ PATCH 2 history]
 *   2) RAG anti-drift — 최근 20 tip title 회피
 *   3) 시즌 필터 + 라운드 로빈 topic 선정 (Firestore 우선 + static fallback,
 *      NEW-R24, [+ PATCH 3 history skip-no-topic])
 *   4) AI compose (tips-generator) [+ PATCH 4 history compose-fail]
 *   5) hygiene check [+ PATCH 4b history hygiene-fail]
 *   6) post create — 항상 'draft' (R16), isAutoSeries=false (R17 명시)
 *      [+ PATCH 5 history published-draft]
 *
 * R15: cycle #19 partner-promo-generator 0줄 변경 11번째 (cycle #31).
 * R1: auto-series/runner.ts 0줄 변경 (nanoid16 로컬 복제 — NEW-C5).
 * NEW-R19: cron offset (autoSeriesTick :00 ↔ tipsTick :30, NEW-H6).
 * NEW-R23: 모든 종료 path가 tipsHistory append (cycle #31).
 * NEW-R24: dynamic topic pool Firestore 우선 + static fallback (cycle #31).
 */

// NEW-C5 — nanoid16 로컬 복제 (auto-series runner.ts 0줄 변경 보존, R1 streak 기여).
function nanoid16(): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

// `pickNextTopic` import는 cycle #30 보존용 — V1에서는 사용 X (cycle #31에서
// dynamic pool 우선이므로). cycle #30 immutability 시각적 표시 위해 유지.
void pickNextTopic;

export async function runTipsTick(now: Date): Promise<void> {
  const db = getFirestore();

  // [cycle #31 PATCH 1] config gate — S2 enabled 체크
  const config = await readTipsAutoConfig(db);
  if (!config.enabled) {
    await appendTipsHistory(db, { status: "skip-disabled" });
    console.log("[tips] disabled by admin — skip");
    return;
  }

  // R16 — 일일 1건 제한
  const todayKstStart = getTodayKstStart(now);
  const todaySnap = await db
    .collection("posts")
    .where("postType", "==", "tip")
    .where("createdAt", ">=", Timestamp.fromDate(todayKstStart))
    .limit(1)
    .get();
  if (!todaySnap.empty) {
    // [cycle #31 PATCH 2] history append
    await appendTipsHistory(db, { status: "skip-already-today" });
    console.log("[tips] already generated today — skip");
    return;
  }

  // RAG anti-drift — 최근 20 tip title (자체 query, Option A 코드 복제 패턴)
  const recentSnap = await db
    .collection("posts")
    .where("postType", "==", "tip")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();
  const recentTitles = recentSnap.docs.map(
    (d) => (d.data().title as string) ?? "",
  );

  // [cycle #31 PATCH 3] dynamic topic pool — Firestore 우선 + static fallback (NEW-R24)
  // C2 결의 — cycle #30 pickNextTopic 시그니처 미변경. 신규 pickNextTopicFromPool 사용.
  const seasonNow = currentKstSeason(now);
  const pool = await fetchActiveTopicPool(db);
  const topic = pickNextTopicFromPool(pool, { recentTitles, seasonNow });
  if (!topic) {
    await appendTipsHistory(db, { status: "skip-no-topic" });
    console.warn("[tips] no available topic — pool exhausted in current season");
    return;
  }

  // AI compose
  let draft;
  try {
    draft = await composeTipDraft({ topic, recentTitles });
  } catch (e) {
    // [cycle #31 PATCH 4] history append
    await appendTipsHistory(db, {
      status: "compose-fail",
      topicId: topic.id,
      reason: e instanceof Error ? e.message.slice(0, 200) : String(e),
    });
    console.error("[tips] compose failed", e);
    return;
  }

  if (!draft.passed) {
    // [cycle #31 PATCH 4b] history append
    await appendTipsHistory(db, {
      status: "hygiene-fail",
      topicId: topic.id,
      hygieneScore: draft.hygieneScore,
      reason: draft.reasons.slice(0, 3).join(", "),
    });
    console.warn(`[tips] hygiene failed: ${draft.reasons.join(", ")}`);
    return;
  }

  // post create — 항상 'draft' (R16), isAutoSeries=false (R17 명시 — undefined X)
  const postId = nanoid16();
  const slug = await uniqueSlug(db, draft.title);
  await db
    .collection("posts")
    .doc(postId)
    .create({
      providerId: "cheonggwang-staff",
      providerOwnerUid: "admin",
      companyName: "청광",
      categories: inferCategoriesFromTopic(topic),
      regionLabel: null,
      title: draft.title,
      slug,
      coverImageUrl: topic.photoless ? null : pickStockImage(topic.category),
      coverImageAlt: draft.coverImageAlt ?? null,
      bodyMarkdown: draft.bodyMarkdown,
      summary80: draft.summary80,
      topicHint: topic.id,
      brandTone: "friendly",
      postType: "tip",
      publishStatus: "draft", // R16
      isAutoSeries: false, // R17 — 명시적 false
      format: "blog", // R18
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // publishedAt: omit (cycle #19 + cycle #29 C1 convention — null/undefined 모두 X)
    });

  // [cycle #31 PATCH 5] history append — 성공
  await appendTipsHistory(db, {
    status: "published-draft",
    topicId: topic.id,
    postId,
    postSlug: slug,
    hygieneScore: draft.hygieneScore,
  });

  console.log(`[tips] saved draft ${postId} topic=${topic.id}`);
}
