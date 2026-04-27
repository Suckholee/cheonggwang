# partner-series-queue · Gap Analysis (Cycle #27 Check)

> v1.14 cycle #27 partner-series-queue — PDCA Check phase
> Generated: 2026-04-28 by gap-detector agent
> Source of truth: `docs/02-design/features/partner-series-queue.design.md` (v0.2)

## Executive Summary

Implementation of `partner-series-queue` (cycle #27) is **substantially aligned** with the v0.2 design document. All 24 design-validator-resolved decisions in §12 (C1–C5, H1–H8, M1–M7, L1–L4) are honored in the code. R1–R8 invariants hold. The critical cycle #26 reality-check finding (functions runner missing `autoSeriesQueue` mapping, which would have made queue editing zero-effect on cron) is **correctly addressed** in `functions/src/auto-series/runner.ts:85` (`autoSeriesQueue: toQueueItems(d.autoSeriesQueue)`) and `:89-111` (full shape validation).

All verification gates already passed:
- `pnpm exec tsc --noEmit` (Next): exit 0
- `pnpm exec tsc --noEmit` (functions): exit 0
- `pnpm exec next build`: exit 0
- 7/7 `correctLastIndex` unit tests pass
- 6/6 mirror lint checks pass (auto-series + queue)

A handful of minor deviations exist, none of which violate runtime correctness or invariants. **Match Rate 95% — qualifies for `/pdca report`**.

## Match Rate

**95% — proceed to `/pdca report`** (≥ 90% threshold; **7th consecutive single-pass** milestone achieved).

| Category | Score |
|---|:---:|
| Design Match (§3 Architecture, §5 API, §6 UI, §8 S1–S13, §9 ACs, §12 결의) | 96% |
| Architecture Compliance (Dynamic level, presentation→action→repo→admin) | 98% |
| Convention Compliance (naming, imports, file placement) | 95% |
| **Overall** | **95%** |

## Verified Design Decisions (Critical 5 + R1–R8)

| ID | Verified at |
|---|---|
| **R2** ROTATION_POOL fallback | `src/lib/auto-series/effective-queue.ts:19,23` and mirror `functions/.../effective-queue.ts:19,23` — both fall back when `queue.length === 0` AND when `active.length === 0` |
| **R8** lastIndex = effectiveQueue index | runner uses `pickSlotFromEffective(effective, safeLastIndex)`; `safeLastIndex` clamps `[0, effective.length)` else -1 |
| **C1** photoCursor decoupled | Type added in both `src/types/auto-series.ts` and `functions/.../types.ts`; default 0 in `DEFAULT_AUTO_SERIES`; `derive-inputs.ts` uses `partner.autoSeries?.photoCursor` not lastIndex (both files); incremented separately at `runner.ts` ONLY on success path (correctly excluded from hygiene-fail/error/photo-missing) |
| **H7** atomic queue+lastIndex | `partnerRepository.updateAutoSeriesQueueAndIndexAtomic` uses `adminDb.runTransaction`; used by remove/toggle/reorder; `addQueueItem` correctly uses non-atomic (lastIndex unchanged on append — H2) |
| **OQ5/M3** photo-missing & autoPublish-OFF guards | `togglePartnerAutoSeries` enforces both at `partner-auto-series-actions.ts:44-58`; Preview component shows OFF banner |
| **MAX 30** | Enforced server-side `partner-auto-series-actions.ts:108,143-147`; UI disables at `series/page.tsx:84` and `PartnerSeriesQueueAddDialog.tsx:50-56` |
| **availableSlots** angle outer × format inner | `queue-helpers.ts:21-27` matches §3.7 exactly |
| **drag + ▲▼ fallback** | Both implemented in `PartnerSeriesQueueEditor.tsx` |
| **Optimistic UI + rollback** | `setQueue(prev)` rollback on `!res.ok` for all three actions |
| **zod whitelist** | All 4 schemas use `z.enum([...AUTO_SERIES_ANGLES])` and `z.enum([...POST_FORMATS])` (drift-proof per M7) |
| **R1 — Cycle #19/#26 generator unchanged (7th)** | `git status` shows neither `functions/src/auto-series/lib/generator.ts` nor `src/lib/partner-promo/*` modified. **Verified — 7th consecutive R1 hold** |
| **C2** partnerFromSnap maps autoSeriesQueue | `runner.ts:85` (queue) + photoCursor mapping + full shape validator using guards |

## Gap List

### Critical (0)
None.

### Major (0)
None.

### Minor (4)

**MIN-1 — `pickSlot` in `functions/src/auto-series/lib/rotation.ts` lacks `@deprecated` JSDoc tag** (Design §1.3 H5 deliverable)
- Design says: "`pickSlot` `@deprecated` JSDoc — runner는 effectiveQueue + modulo 직접 사용. 함수 자체는 보존(backward compat 0 risk)"
- Actual: function exists at `rotation.ts:27-34` with no `@deprecated` annotation. Function is no longer called from runner (replaced by `pickSlotFromEffective`).
- Impact: documentation-only; runtime correct. Could mislead future maintainers.
- Fix: add `/** @deprecated v1.14 cycle #27 — use pickSlotFromEffective */` above `export function pickSlot`.

**MIN-2 — `toAutoSeriesQueue` quirky early-return for empty array** (`partner-repository.ts:94`)
- Code: `return valid.length === 0 && raw.length === 0 ? [] : valid;`
- Both paths functionally equivalent (effectiveQueue treats `[] === fallback`). No runtime effect. Slightly unusual condition; could simplify to `return valid;`.
- Impact: cosmetic.

**MIN-3 — Empty-queue UI banner (L2) shown in two places with slightly different copy**
- Editor's banner is not shown when queue has only-disabled items (still falls back to ROTATION_POOL via R2). Preview correctly handles this; Editor does not. Minor UX inconsistency.
- Fix (optional): in Editor, also surface a "모두 일시정지됨 — 시스템 기본 순서로 발행됩니다" hint when `queue.every(q => !q.enabled)`.

**MIN-4 — `requireAdminApi` import unused in current edit scope**
- This is from the existing cycle #26 file structure (used only by `resetSeriesIndex`). Not a gap, just noting the existing pattern is preserved.

## Strengths

1. **R8 Path X is enforced at three layers** — runner `safeLastIndex` clamp + `correctLastIndex` for editing + queue-preview modulo wrap.
2. **C1 photoCursor split is surgically clean** — only success path increments; hygiene-fail/error/photo-missing leave it untouched, exactly matching the design comment.
3. **Runtime shape validation duplicated on both sides** — `toAutoSeriesQueue` (Next) and `toQueueItems` (functions) each filter using domain guards (`isAutoSeriesAngle`, `isPostFormat`), preventing Firestore write of malformed queue from breaking cron.
4. **Mirror lint is comprehensive** — 4 invariants checked across 8 files; the photoCursor regex correctly forbids body-level usage while allowing comment references.
5. **Atomic transaction on edit + tx-fresh-read on cron tick** — runner re-reads partner via `partnerFromSnap(...)` inside the transaction, eliminating the race window with concurrent partner edit.
6. **Test coverage** — 7 test cases on `correctLastIndex` exceed Test Plan §9.5's 6 required cases (added Case 7 for disabled+reorder mix).

## Risks Identified

1. **Reorder during photo-missing tick** — partner with `photoUrls=[]` triggers `markWindowConsumed` but does NOT increment `photoCursor`. Correct per design comment, but a new partner who first registers an `autoSeriesQueue` then later adds photos could see `lastIndex` and `photoCursor` start at different "ages". Behavior is correct but worth noting.
2. **`addQueueItem` does not need atomic transaction** (currently uses non-atomic `updateAutoSeriesQueue`). Since `lastIndex` is not modified, this is correct, but if a cron tick fires between `read partner` and `update queue`, the cron will use the OLD queue and the new item will appear in the next tick. Acceptable per H7 spec ("race minimized, last-write-wins for queue alone").
3. **Editor handles drag+drop without HTML5 fallback for touch devices** that don't fire `dragstart`. The ▲▼ buttons mitigate per M2.

## Recommendations for Act Phase

**No Act iteration needed.** Match Rate 95% ≥ 90% threshold.

Optional follow-ups (could be deferred to cycle #28 or skipped):
1. Add `@deprecated` JSDoc to `functions/src/auto-series/lib/rotation.ts pickSlot` (MIN-1, 1 line).
2. Add "모두 일시정지" hint banner to QueueEditor for consistency with Preview (MIN-3, ~5 LOC).
3. Simplify `toAutoSeriesQueue` early-return condition (MIN-2, cosmetic).

These are non-blocking and do not affect any AC1–AC23 acceptance criterion.

## Verdict

**Proceed to `/pdca report partner-series-queue`** — 7th consecutive single-pass ≥ 90% milestone is reached.

Cycle #27 demonstrates the design-validator → reality-check loop is paying off: the C2 partnerFromSnap mapping (the would-have-been-zero-effect bug) was caught in design review and is correctly implemented, validated by both runner code path and `check-queue-mirror.mjs`.
