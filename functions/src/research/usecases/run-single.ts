import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import type { Category } from "../types/shared";
import type {
  AdapterResult,
  NormalizedSource,
  RawSource,
  SourceType,
} from "../types/source";
import type { CategoryInsight } from "../types/insight";
import type { TemplateProposal } from "../types/proposal";
import type { GeminiClient } from "../lib/gemini";
import type { NaverCredentials } from "../adapters/naver-search";

import { fetchNaverSources } from "../adapters/naver-search";
import { fetchTistorySources } from "../adapters/tistory-rss";
import { fetchWordPressSources } from "../adapters/wordpress-rss";

import {
  classifyByRule,
  toNormalizedSource,
  passesCategoryFilter,
} from "../normalize/category-classifier";
import { dedupByUrlHash } from "../normalize/dedup";

import { analyzeSectionStructure } from "../analyzer/section-structure";
import { analyzeToneProfile } from "../analyzer/tone-profile";
import { analyzeCtaPatterns } from "../analyzer/cta-patterns";
import { analyzeKeywords } from "../analyzer/keyword-tfidf";

import { writeTrendKeywords } from "../writers/trend-keywords-writer";
import { writeTemplateProposal } from "../writers/template-proposal-writer";
import type { CategoryRunSummary } from "../writers/email-notifier";

const RAW_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SAMPLE_LIMIT = 200;

export interface SingleRunConfig {
  naverCreds: NaverCredentials;
}

interface CollectedBatch {
  sources: RawSource[];
  errors: Array<{ adapter: string; message: string }>;
  bySourceType: Partial<Record<SourceType, number>>;
}

async function collectAll(
  category: Category,
  creds: NaverCredentials
): Promise<CollectedBatch> {
  const settled = await Promise.allSettled([
    fetchNaverSources(category, creds),
    fetchTistorySources(category),
    fetchWordPressSources(category),
  ]);

  const sources: RawSource[] = [];
  const errors: Array<{ adapter: string; message: string }> = [];
  const bySourceType: Partial<Record<SourceType, number>> = {};
  const labels: SourceType[] = ["naver", "tistory", "wordpress"];

  settled.forEach((res, idx) => {
    const label = labels[idx];
    if (res.status === "fulfilled") {
      const r: AdapterResult = res.value;
      sources.push(...r.sources);
      bySourceType[label] = (bySourceType[label] ?? 0) + r.sources.length;
      for (const e of r.errors) errors.push({ adapter: label, message: e });
    } else {
      errors.push({
        adapter: label,
        message: res.reason instanceof Error ? res.reason.message : String(res.reason),
      });
    }
  });

  return { sources, errors, bySourceType };
}

function normalize(
  raw: RawSource[],
  targetCategory: Category
): NormalizedSource[] {
  const out: NormalizedSource[] = [];
  for (const src of raw) {
    const result = classifyByRule(src);
    if (!passesCategoryFilter(result, targetCategory, 0.5)) continue;
    const normalized = toNormalizedSource(src, result);
    if (normalized) out.push(normalized);
  }
  return out;
}

async function readExistingHashes(
  db: Firestore,
  category: Category
): Promise<Set<string>> {
  const refs = await db
    .collection("researchSources")
    .doc(category)
    .collection("raw")
    .listDocuments();
  return new Set(refs.map((r) => r.id));
}

async function writeRawBatch(
  db: Firestore,
  category: Category,
  sources: NormalizedSource[]
): Promise<void> {
  if (sources.length === 0) return;
  const ttl = Timestamp.fromMillis(Date.now() + RAW_TTL_MS);
  const batch = db.batch();
  for (const src of sources) {
    const ref = db
      .collection("researchSources")
      .doc(category)
      .collection("raw")
      .doc(src.urlHash);
    batch.set(ref, { ...src, ttlExpiresAt: ttl });
  }
  await batch.commit();
}

async function sampleForAnalysis(
  db: Firestore,
  category: Category
): Promise<NormalizedSource[]> {
  const snap = await db
    .collection("researchSources")
    .doc(category)
    .collection("raw")
    .orderBy("collectedAt", "desc")
    .limit(SAMPLE_LIMIT)
    .get();
  return snap.docs.map((d) => {
    const data = d.data() as RawSource;
    return {
      ...data,
      detectedCategory: category,
      confidence: 1,
    };
  });
}

async function runAnalysis(
  samples: NormalizedSource[],
  category: Category,
  gemini: GeminiClient
): Promise<CategoryInsight> {
  const [sectionStructure, toneProfile, ctaPatterns, topKeywords] =
    await Promise.all([
      analyzeSectionStructure(samples, gemini),
      analyzeToneProfile(samples, gemini),
      analyzeCtaPatterns(samples, gemini),
      analyzeKeywords(samples, category, gemini),
    ]);
  return { sectionStructure, toneProfile, ctaPatterns, topKeywords };
}

export async function runSingleCategory(
  category: Category,
  weekKey: string,
  config: SingleRunConfig,
  db: Firestore,
  gemini: GeminiClient
): Promise<CategoryRunSummary> {
  const jobRef = db.collection("researchJobs").doc();
  await jobRef.set({
    category,
    weekKey,
    status: "running",
    sourceCount: 0,
    errors: [],
    startedAt: FieldValue.serverTimestamp(),
  });

  const collected = await collectAll(category, config.naverCreds);
  const normalized = normalize(collected.sources, category);
  const existing = await readExistingHashes(db, category);
  const newOnly = dedupByUrlHash(normalized, existing);
  await writeRawBatch(db, category, newOnly);

  const samples = await sampleForAnalysis(db, category);
  const insight = await runAnalysis(samples, category, gemini);

  await db
    .doc(`researchInsights/${category}/weekly/${weekKey}`)
    .set({
      ...insight,
      updatedAt: FieldValue.serverTimestamp(),
    });

  await writeTrendKeywords(db, category, insight, weekKey);
  const proposal: TemplateProposal = await writeTemplateProposal(
    db,
    category,
    weekKey,
    insight
  );

  await jobRef.update({
    status: "completed",
    sourceCount: newOnly.length,
    errors: collected.errors,
    finishedAt: FieldValue.serverTimestamp(),
  });

  return {
    category,
    sourceCount: newOnly.length,
    sourcesBySourceType: collected.bySourceType,
    insight,
    proposalDiff: proposal.diff,
    errors: collected.errors.map((e) => `${e.adapter}: ${e.message}`),
  };
}
