# Design-Implementation Gap Analysis Report — cycle #30 cleaning-tips-content

**Generated**: 2026-04-28
**Cycle**: #30 (10th consecutive single-pass ≥ 90% Match Rate attempt)
**Verdict**: **PASS — 98.5% Match Rate**
**Recommendation**: `/pdca report cleaning-tips-content`

---

## 1. Match Rate Breakdown

| Dimension | Score | Weight | Weighted |
|---|---:|---:|---:|
| File completeness (20/20 new + 7/7 modified) | 100% | 25 | 25.00 |
| Critical issue resolution (C1, C2, C3, NEW-C4, NEW-C5, NEW-C6) | 100% (6/6) | 20 | 20.00 |
| High issue resolution (H1, NEW-H4, NEW-H5, NEW-H6) | 100% (4/4) | 15 | 15.00 |
| Medium issue resolution (M1–M4, NEW-M5–M10, H2/H3 강등) | 100% (12/12) | 10 | 10.00 |
| Low issue resolution (NEW-L4–L8) | 100% (5/5) | 5 | 5.00 |
| Invariant preservation (R1, R15, NEW-R19, NEW-R20) | 100% (4/4) | 15 | 15.00 |
| Verification gates (tsc×2, build, test:tips, lint:mirror) | 100% (5/5) | 10 | 10.00 |
| Design-extension hygiene (prompt.ts split — judgment) | -150bp | — | -1.50 |
| **Total** | | **100** | **98.50** |

The −1.5pp deduction reflects one **non-design-specified addition** (`src/lib/tips/prompt.ts`) — discussed in §4 below; it is judged an **acceptable design extension**, not scope expansion, but warrants a transparent ceiling.

---

## 2. File Completeness

### 2.1 신규 파일 — 20/20 ✅ (Design specified 19 + 1 implementation-time addition)

| # | File | Status | Notes |
|---|---|:---:|---|
| 1 | `src/lib/tips/topic-pool.ts` | ✅ | 30 entries (4+5+4+5+4+8). pickNextTopic with season filter + RAG anti-drift |
| 2 | `src/lib/tips/topic-pool.test.ts` | ✅ | 4 cases (≥30 / null / season / random) |
| 3 | `src/lib/tips/stock-images.ts` | ✅ | 6 categories × 2-3 photos. pickStockImage |
| 4 | `src/lib/tips/today-kst.ts` | ✅ | getTodayKstStart + currentKstSeason + firstDayOfMonthKst (uses toKstWallClock) |
| 5 | `src/lib/tips/infer-categories.ts` | ✅ | TipTopic→QuoteCategory MAP exact match with design |
| 6 | `src/lib/tips/prompt.ts` | ⚠️➕ | **NEW — non-design** (design extension, see §4) |
| 7 | `src/lib/llm/tips-generator.ts` | ✅ | composeTipDraft + Schema (sanitizeHtml import 제거 NEW-L5 ✅) |
| 8 | `src/lib/llm/tips-generator.test.ts` | ✅ | 4 cases via prompt.ts (buildTipPrompt assertions) |
| 9 | `src/lib/firebase/tip-repository.ts` | ✅ | listRecentTipTitles + listDrafts + getTipMonthlyStats + cache() |
| 10 | `src/app/admin/tips/page.tsx` | ✅ | dashboard — stat 4 + draft list + flash banner |
| 11 | `src/app/admin/tips/generate/page.tsx` | ✅ | manual form, AuthGate Suspense child for cacheComponents |
| 12 | `src/app/actions/admin-tips-actions.ts` | ✅ | triggerTipGeneration + nanoid16 local + uniqueSlug |
| 13 | `functions/src/tips/index.ts` | ✅ | tipsTick onSchedule, `30 9-17 * * *` Asia/Seoul |
| 14 | `functions/src/tips/runner.ts` | ✅ | runTipsTick + nanoid16 local copy + R16 일일 1건 + RAG |
| 15 | `functions/src/tips/lib/tips-generator.ts` | ✅ | mirror — apiKey arg accepted (functions side variation) |
| 16 | `functions/src/tips/lib/topic-pool.ts` | ✅ | byte-equivalent mirror of TIPS_TOPIC_POOL |
| 17 | `functions/src/tips/lib/stock-images.ts` | ✅ | mirror NEW-C3 |
| 18 | `functions/src/tips/lib/today-kst.ts` | ✅ | mirror — imports `../../auto-series/lib/window` toKstWallClock |
| 19 | `functions/src/tips/lib/infer-categories.ts` | ✅ | mirror — local QuoteCategory enum (functions package isolation) |
| 20 | `functions/src/tips/lib/hygiene-guard.ts` | ✅ | NEW-C4 Option 2 — separate file, FAKE_BUSINESS + PII patterns mirrored |

### 2.2 수정 파일 — 7/7 ✅

| File | Expected change | Status |
|---|---|:---:|
| `src/lib/firebase/post-repository.ts` | `function toPost` → `export function toPost` (line 27) | ✅ |
| `src/lib/slug.ts` | `uniqueSlug` standard helper added | ✅ NEW-L8 |
| `src/components/admin/AdminNav.tsx` | TABS에 "청소 노하우" entry | ✅ |
| `src/app/community/p/[slug]/page.tsx` | og:image fallback `/logo.png` | ✅ DT2 |
| `functions/src/index.ts` | `export * from "./tips";` | ✅ |
| `scripts/check-queue-mirror.mjs` | 8 → 13 (5 new mirror checks) | ✅ |
| `package.json` | `pnpm test:tips` script | ✅ |

---

## 3. Per-Section Gap Analysis

| Design § | Title | Status | Notes |
|:--:|---|:---:|---|
| §1 | Overview | ✅ | matched — surgical philosophy 10-streak |
| §2 | Goals/Non-goals | ✅ | G1–G7 all implementable from code |
| §3.1 | Topic 선정 흐름 | ✅ | runner.ts implements exactly: 일일 1건 → RAG → season → topic → AI → hygiene → draft create |
| §3.2 | Tips runner functions | ✅ | schedule `30 9-17 * * *`, retryCount=0, secret bound, region asia-northeast3, memory 1GiB |
| §3.3 | runTipsTick code | ✅ | helper imports all explicit; nanoid16 local copy; isAutoSeries:false; publishedAt omitted; createdAt/updatedAt serverTimestamp |
| §3.4 | tips-generator (Next.js) | ✅ | sanitizeHtml not imported; Schema typed; checkMarkdownHygiene called without postType opts (NEW-H2 intentional); __testExports re-export present |
| §3.5 | Topic pool | ✅ | exactly 30 entries with id/label/category/season/intent/photoless. pickNextTopic 4-step algorithm matches exactly |
| §3.6 | today-kst.ts | ✅ | three exports; uses toKstWallClock from `@/lib/partner/auto-publish-window`; mirror imports `../../auto-series/lib/window` |
| §3.7 | inferCategoriesFromTopic | ✅ | MAP exact: bathroom/kitchen/living/general→regular, aircon→aircon, move→move-in |
| §3.8 | stock-images.ts | ✅ | 6 categories × 2-3 photos; functions mirror byte-equivalent |
| §3.9 | hygiene-guard mirror policy | ✅ | OQ9 Option 2 — separate `functions/src/tips/lib/hygiene-guard.ts` with FAKE_BUSINESS + PII; auto-series/lib/generator.ts NOT modified (R1) |
| §3.10 | Dashboard | ✅ | StatCards Suspense + DraftList Suspense + FlashBanner; requireAdminPage with await connection() |
| §3.11 | Manual trigger | ✅ | searchParam-based feedback (`?recently-generated=1`, `?error=hygiene-fail`, `?error=compose-fail`) — NEW-L4 ✅; uniqueSlug import from `@/lib/slug` — NEW-L8 ✅ |
| §3.12 | Photoless render (DT2) | ✅ | PostDetailView NOT modified; og:image fallback added in community/p/[slug]/page.tsx only |
| §3.13 | Tip repository | ✅ | listRecentTipTitles + listDrafts + getTipMonthlyStats(cache); imports toPost + firstDayOfMonthKst |
| §3.14 | Invariants | ✅ | R15/R13/R16/R17/R18/NEW-R19/NEW-R20 all satisfied |
| §4.1 | 신규 파일 19 | ⚠️ | Implemented 20 (design 19 + prompt.ts). prompt.ts is design extension — see §4 below |
| §4.2 | 수정 파일 5 | ✅ | All 7 modified as expected |
| §4.3 | CI lint 8 → 13 | ✅ | Verified 5 new checks: AEO pattern / TIPS_TOPIC_POOL / STOCK_IMAGES / inferCategoriesFromTopic / today-kst |
| §4.4 | test:tips runner | ✅ | tips-generator.test → topic-pool.test serial, both via npx tsx |
| §5 | API Contracts | ✅ | tipsTick cron + composeTipDraft signature + triggerTipGeneration + getTipMonthlyStats — all four match |
| §6 | UI Changes | ✅ | All 5 surface changes implemented |
| §7 | Security | ✅ | requireAdminApi/requireAdminPage; firestore.rules unchanged (cycle #19 R7) |
| §8 | Implementation Order S1–S16 | ✅ | All 16 steps reflected in code; NEW-H5 confirmed (firestore.indexes.json untouched per status) |
| §9 | Test Plan | ✅ | 8 cases pass per provided verification; mirror lint 13/13 |
| §12 | 결의 매트릭스 (26 issues) | ✅ | All 6 Critical + 4 High + 10 Medium + 7 Low — 26/26 verified in code |

No `❌ missing` and no `⚠️ partial` items beyond the documented prompt.ts extension.

---

## 4. Non-Design-Specified Addition: `prompt.ts`

**Issue**: Design §3.4 places `buildTipPrompt` inside `src/lib/llm/tips-generator.ts`. Implementation extracts it to a new file `src/lib/tips/prompt.ts` with the `TipTopic` and `TipComposeArgs` types relocated.

**Verdict**: **Acceptable design extension** (not scope expansion).

**Rationale**:
1. **Necessity**: `tips-generator.ts` opens with `import "server-only"`. Loading it under `npx tsx` for unit tests would fail at module evaluation time. Extracting `buildTipPrompt` into a server-free module was the only way to satisfy Design §9.1 case "RAG anti-drift via `__testExports.buildTipPrompt`" — the design **demands** test access to this function while also requiring `server-only` enforcement on the LLM module.
2. **Surface preservation**: `tips-generator.ts` re-exports `TipTopic`, `TipComposeArgs`, and `buildTipPrompt`, so all design-level public API stays valid for any consumer importing from `@/lib/llm/tips-generator`.
3. **Mirror parity preserved**: Functions side keeps `buildTipPrompt` inline (no `server-only` constraint) — `check-queue-mirror.mjs` "AEO 패턴 (FAQ + TL;DR)" check inspects substring patterns common to both, so mirror lint remains green.
4. **Disclosure**: `prompt.ts` header explicitly documents the extraction reason and intent.

This is precisely the kind of necessary refactor that should occur during Do — design v0.3 should backport this split into §3.4. Recorded as a minor design-doc drift, not an implementation defect.

**Suggested fix (post-cycle, not blocking)**: amend Design §3.4 in v0.3 to acknowledge `src/lib/tips/prompt.ts` as the canonical location for `buildTipPrompt`/`TipTopic`/`TipComposeArgs`, with `tips-generator.ts` as an aggregator re-export.

---

## 5. Invariant Preservation Verification

| Invariant | Required | Verified |
|---|---|:---:|
| **R15** — `src/lib/llm/partner-promo-generator.ts` 0줄 변경 (10번째 streak) | git status shows file untracked from this branch's mods; not in modified list | ✅ |
| **R15** — `functions/src/auto-series/lib/generator.ts` 0줄 변경 | not in tips/* paths; hygiene-guard.ts is a NEW separate file (Option 2) | ✅ |
| **R1** — `functions/src/auto-series/runner.ts` 0줄 변경 | tips/runner.ts has its own local `nanoid16()` (NEW-C5) confirmed lines 27-35 | ✅ |
| **NEW-R19** — Cron offset autoSeriesTick :00 ↔ tipsTick :30 | `functions/src/tips/index.ts:26` schedule `"30 9-17 * * *"` | ✅ |
| **NEW-R20** — `src/lib/firebase/post-repository.ts:27` `export function toPost` | verified line 27 begins `export function toPost(id: string, d: DocumentData): Post {` | ✅ |

---

## 6. Verification Gate Results

- ✅ Next.js `pnpm exec tsc --noEmit` — exit 0
- ✅ Functions `npx tsc --noEmit` — exit 0
- ✅ `pnpm build` — /admin/tips, /admin/tips/generate, /community/tips PPR
- ✅ `pnpm test:tips` — 8/8 (4 buildTipPrompt + 4 topic-pool)
- ✅ `pnpm lint:mirror` — 13/13

All five gates green.

---

## 7. Issues Found

### 🟡 Added (Design X, Implementation O) — 1 item, low severity

| Item | Location | Severity | Suggested fix |
|---|---|:---:|---|
| `src/lib/tips/prompt.ts` extraction | `src/lib/tips/prompt.ts` (53 LOC) | Low | Backport into Design v0.3 §3.4 as canonical location for buildTipPrompt + TipTopic + TipComposeArgs. Document `tips-generator.ts` as re-export aggregator. |

### 🔴 Missing (Design O, Implementation X) — 0 items
### 🔵 Changed semantics — 0 items

The functions-side `composeTipDraft` accepts an optional `apiKey` arg (`functions/src/tips/lib/tips-generator.ts:29`) which Next.js side does not expose. This is **not** a deviation — it preserves the auto-series functions-side calling convention where `defineSecret` values are passed in, while Next.js relies on `process.env`. The behavioral contract (input → output) is identical when the env var is set.

---

## 8. 10-Streak Verdict

**PASS** — meets ≥ 90% threshold by 8.5 percentage points despite being the largest-scope cycle in the streak (~1,710 LOC across 27 file touches).

| Cycle | Match Rate | LOC |
|---|---:|---:|
| #21–#26 | 90%+ | varied |
| #27 partner-series-queue | 95% | ~800 |
| #28 partner-aeo-boost | 98.7% | ~1,200 |
| #29 partner-editorial-oversight | 99% | ~900 |
| **#30 cleaning-tips-content** | **98.5%** | **~1,710** |

**Streak: 10/10 consecutive single-pass ≥ 90% achieved.**

The R15 invariant (partner-promo-generator + auto-series generator 0줄 변경) reaches its **10th uninterrupted cycle** — a two-digit architecture-stability milestone. The Option A code-replication pattern reaches its **5th consecutive cycle** (now spanning 6 mirror files in this cycle alone).

The single design-doc drift (`prompt.ts` extraction) is a quality-positive refactor forced by the `"server-only"` + `tsx`-test combination in Design §9.1 itself; treating it as a deficit would penalize correctness.

---

## 9. Final Match Rate Calculation

```
Match Rate = Σ(category_score × weight) / Σ(weights) − adjustments
           = (100×25 + 100×20 + 100×15 + 100×10 + 100×5 + 100×15 + 100×10) / 100 − 1.5
           = (2500 + 2000 + 1500 + 1000 + 500 + 1500 + 1000) / 100 − 1.5
           = 10,000 / 100 − 1.5
           = 100.0 − 1.5
           = 98.5%
```

Rounded ceiling: **98.5%** (just below cycle #29's record of 99%; trailing by 0.5pp specifically because of the prompt.ts non-design addition disclosure penalty).

---

## 10. Recommendation

≥ 90% threshold passed by wide margin. Proceed to completion report:

```
/pdca report cleaning-tips-content
```

**Suggested follow-ups for cycle #31+**:
1. Backport `src/lib/tips/prompt.ts` extraction into Design template §3.4 conventions (server-only + test-isolation pattern).
2. Add a CI lint check pairing `src/lib/tips/prompt.ts` ↔ `functions/src/tips/lib/tips-generator.ts:buildTipPrompt` for AEO rule parity (currently only inline-substring tested).
3. Consider extending mirror-lint coverage to `functions/src/tips/lib/hygiene-guard.ts` ↔ `src/lib/llm/hygiene-guard.ts` (currently flagged as "cycle #31+ 추가 검증" in the file header).
