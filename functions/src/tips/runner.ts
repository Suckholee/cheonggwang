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
// v1.19 cycle #32 tips-schedule-editor — 신규 imports (S12 — gate + KST wall clock)
//   R-H3 — functions 측 toKstWallClock는 ../auto-series/lib/window (Next.js의
//   auto-publish-window.ts와 다른 파일명).
import { shouldTickNow } from "./lib/schedule-gate";
import { toKstWallClock } from "../auto-series/lib/window";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.3
 * v1.18 cycle #31 tips-admin-config · §3.2 — 6 surgical patches (config gate +
 *   dynamic pool + history append: PATCH 1·2·3·4·4b·5). pickNextTopic 시그니처
 *   미변경 (C2 결의 — 신규 함수 pickNextTopicFromPool 별도 사용).
 * v1.19 cycle #32 tips-schedule-editor · §3.2 — PATCH 0a (schedule gate) 삽입
 *   + PATCH 1 1a/1b split [R-M5]. fetch는 line 그대로, enabled 체크는 PATCH 0a 뒤로.
 *   결과: 7 patch 구조 (PATCH 0a + 6 보존).
 *
 * tipsTick 핵심 흐름 (host TZ 무관, R10 패턴):
 *   0) [cycle #31 PATCH 1a] config read (fetch — 위치 변경 X)
 *  0a) [cycle #32 PATCH 0a] schedule gate — daysOfWeek/hour/:30 미통과시 skip-out-of-schedule (S4)
 *   0b) [cycle #31 PATCH 1b] enabled gate — false면 skip-disabled (위치 이동, 의미 보존)
 *   1) R16 — 일일 1건 제한 (KST 자정 기준) [+ PATCH 2 history]
 *   2) RAG anti-drift — 최근 20 tip title 회피
 *   3) 시즌 필터 + 라운드 로빈 topic 선정 (Firestore 우선 + static fallback,
 *      NEW-R24, [+ PATCH 3 history skip-no-topic])
 *   4) AI compose (tips-generator) [+ PATCH 4 history compose-fail]
 *   5) hygiene check [+ PATCH 4b history hygiene-fail]
 *   6) post create — 항상 'draft' (R16), isAutoSeries=false (R17 명시)
 *      [+ PATCH 5 history published-draft]
 *
 * R15: cycle #19 partner-promo-generator 0줄 변경 12번째 (cycle #32).
 * R1: auto-series/runner.ts 0줄 변경 14번째 (nanoid16 로컬 복제 — NEW-C5 보존).
 * NEW-R19: cron offset (autoSeriesTick :00 ↔ tipsTick :30, NEW-H6).
 *   cycle #32: cron `30 9-17` → `30 * * * *` wide cron으로 변경됐지만 :30 invariant는
 *   런타임 gate (`shouldTickNow`가 minutes !== 30이면 false)에서 영구 강제.
 * NEW-R23: 모든 종료 path가 tipsHistory append (cycle #31). cycle #32에서 7번째 status
 *   skip-out-of-schedule 추가.
 * NEW-R24: dynamic topic pool Firestore 우선 + static fallback (cycle #31, 0줄 변경).
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

  // [cycle #31 PATCH 1a — config fetch] 위치 보존 (R-M5)
  const config = await readTipsAutoConfig(db);

  // [cycle #32 PATCH 0a] schedule gate — NEW (G1·G6, OQ11·C-G1: schedule이 enabled보다 먼저)
  // wide cron `30 * * * *`이 24/일 발화하므로 hour/dow/:30 미통과 시 skip-out-of-schedule.
  // dayOfWeek는 KST wall date를 UTC 재구성 → getUTCDay (host TZ 무관, cycle #28 패턴).
  const wall = toKstWallClock(now);
  const kstNow = {
    hours: wall.hours,
    minutes: wall.minutes,
    dayOfWeek: new Date(
      Date.UTC(wall.year, wall.month, wall.date),
    ).getUTCDay(),
  };
  if (!shouldTickNow(config, kstNow)) {
    // wide cron 24/일 발화 중 ~23/일이 schedule out — console.log noise 회피.
    // 추적은 tipsHistory에 기록 (NEW-R23 — admin이 /admin/tips에서 확인 가능).
    await appendTipsHistory(db, { status: "skip-out-of-schedule" });
    return;
  }

  // [cycle #31 PATCH 1b — enabled gate] 위치 이동 (의미 보존, R-M5 split)
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
