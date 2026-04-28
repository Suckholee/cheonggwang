import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { composeTipDraft } from "./lib/tips-generator";
import { pickNextTopic } from "./lib/topic-pool";
import { pickStockImage } from "./lib/stock-images";
import { getTodayKstStart, currentKstSeason } from "./lib/today-kst";
import { inferCategoriesFromTopic } from "./lib/infer-categories";
import { uniqueSlug } from "../auto-series/lib/slug";

/**
 * v1.17 cycle #30 cleaning-tips-content · §3.3
 *
 * tipsTick 핵심 흐름 (host TZ 무관, R10 패턴):
 *   1) R16 — 일일 1건 제한 (KST 자정 기준)
 *   2) RAG anti-drift — 최근 20 tip title 회피
 *   3) 시즌 필터 + 라운드 로빈 topic 선정
 *   4) AI compose (tips-generator)
 *   5) hygiene check
 *   6) post create — 항상 'draft' (R16), isAutoSeries=false (R17 명시)
 *
 * R15: cycle #19 partner-promo-generator 0줄 변경 10번째.
 * R1: auto-series/runner.ts 0줄 변경 (nanoid16 로컬 복제 — NEW-C5).
 * NEW-R19: cron offset (autoSeriesTick :00 ↔ tipsTick :30, NEW-H6).
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

export async function runTipsTick(now: Date): Promise<void> {
  const db = getFirestore();

  // R16 — 일일 1건 제한
  const todayKstStart = getTodayKstStart(now);
  const todaySnap = await db
    .collection("posts")
    .where("postType", "==", "tip")
    .where("createdAt", ">=", Timestamp.fromDate(todayKstStart))
    .limit(1)
    .get();
  if (!todaySnap.empty) {
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

  // 시즌 필터 + 라운드 로빈
  const seasonNow = currentKstSeason(now);
  const topic = pickNextTopic({ recentTitles, seasonNow });
  if (!topic) {
    console.warn("[tips] no available topic — pool exhausted in current season");
    return;
  }

  // AI compose
  let draft;
  try {
    draft = await composeTipDraft({ topic, recentTitles });
  } catch (e) {
    console.error("[tips] compose failed", e);
    return;
  }

  if (!draft.passed) {
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

  console.log(`[tips] saved draft ${postId} topic=${topic.id}`);
}
