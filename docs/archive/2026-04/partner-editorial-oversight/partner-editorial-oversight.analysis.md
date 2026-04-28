# partner-editorial-oversight · Gap Analysis (Cycle #29 Check)

> v1.16 cycle #29 partner-editorial-oversight — PDCA Check phase
> Generated: 2026-04-28 by gap-detector agent
> Source: `docs/02-design/features/partner-editorial-oversight.design.md` v0.2 (18 issues all resolved)

## Executive Summary

cycle #29 partner-editorial-oversight implementation has been verified against Design v0.2. **18 §12 결의 매트릭스 issue 모두 1:1 매핑 verified at exact file:line locations**. surgical philosophy 보존 (2 신규 필드, 0 Firestore migration, 0 AI prompt 변경, cycle #19 publish 토글 재사용). 모든 검증 게이트 통과:

- tsc 0 (Next.js + functions)
- next build full prerender 성공 (cacheComponents 호환)
- pnpm lint:mirror 10/10 (cycle #28 8 + cycle #29 신규 2)
- ai-footer.test.ts 7/7 + cycle #21~#28 회귀 테스트 모두 통과
- Firestore composite index 배포 + Cloud Functions 배포 완료

**🏆 9th consecutive single-pass ≥ 90% milestone 달성** — Plan Plus + design-validator 패턴 9번 연속 검증 성공.

## Match Rate

| Category | Score | Status |
|---|:---:|:---:|
| Design Match | 99% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 100% | ✅ |
| Test coverage gates | 100% | ✅ |
| **Overall Match Rate** | **99%** | ✅ |

Gate counts: Critical = 0, Major = 0, Minor = 2 (target: Critical 0, Major ≤ 1, Minor ≤ 5 — within budget).

## §12 결의 매트릭스 — 18 items verified

### Critical (2/2)

| ID | 결의 | Verified at |
|---|---|---|
| C1 | createPostFromDraft publishStatus 인자 + draft 시 publishedAt omit | `functions/src/auto-series/lib/post-writer.ts:36, 60, 102, 109-113` (default 'published', if (status === 'published') publishedAt 설정, else omit) |
| N1 | runner.ts:partnerFromSnap mapper 명시적 코드 | `functions/src/auto-series/runner.ts:65-72` (publishMode + targetAudience as const) |

### High (5/5)

| ID | 결의 | Verified at |
|---|---|---|
| H1 | layout.tsx Suspense + PartnerHeaderWithBadge | `src/app/partner/layout.tsx:21-51, 64-69` (sync layout + async server component in Suspense) |
| H2 | post-writer publishedAt omit (cycle #19 convention) | `functions/src/auto-series/lib/post-writer.ts:109-113` (명시적 주석 포함) |
| H3 | Firestore Admin SDK count() + React cache() | `src/lib/firebase/post-repository.ts:463-479` (cache 래퍼 + try/catch fallback) |
| N2 | runner SeriesHistoryAppend literal 'auto-draft-saved' | `functions/src/auto-series/runner.ts:338-354` |
| N3+N13 | targetAudience null persistence (mapper absent → null 통합) | `partner-repository.ts:120-122, 228-230` |

### Medium (5/5)

| ID | 결의 | Verified at |
|---|---|---|
| M1 | list 필터 in-memory + count aggregation 분리 | `partner/posts/page.tsx:91-97` (in-memory) + `post-repository.ts:463-479` (aggregation) |
| N4 | CI lint stricter regex | `scripts/check-queue-mirror.mjs:80-98` (`/publishMode\s*:\s*PublishMode/` + `/export type PublishMode\s*=/`) |
| N6 | post-repository 단일 확장 (별도 파일 X) | `post-repository.ts:463-479` (countAutoDraftsForOwner 추가, post-repository-draft.ts 미생성) |
| N8 | footer markdown sanitize pipeline 통과 | `ai-footer.ts:23` (markdown) + `BlogRenderer.tsx:20-23` (renderMarkdown 통과) |
| N10 | Next 16 async searchParams Promise → Suspense child | `partner/posts/page.tsx:19-36, 82-89` (page level await X) |

### Low (6/6)

| ID | 결의 | Verified at |
|---|---|---|
| M3 | BlogRenderer prop 변경 caller 영향 | `BlogRenderer.tsx:18` + `PostBodyRenderer.tsx:20, 26` (2 caller 모두 업데이트) |
| N5 | pnpm test:auto-series script 미존재 | 직접 npx tsx 실행 — `ai-footer.test.ts:11` doc comment |
| N7 | footer HTML class Design 버전 채택 | `CardNewsViewer.tsx:55-58` (mt-6 + dark mode + italic) |
| N9 | CardNewsViewer Fragment + parser-fail branch + footer 두 곳 모두 | `CardNewsViewer.tsx:20-62` (양 branch 모두 footer) |
| N11 | postType tip/provider defensive test | `ai-footer.test.ts:48-58` (Case 3, Case 4) |
| N12 | Implementation Order S list deploy 단계 | Cloud Functions deployed + Firestore indexes deployed (`firestore.indexes.json:244-252`) |

## Strengths

1. **Zero deviation from §12 결의 매트릭스** — 18 issue 모두 file:line 정확 매핑.
2. **CI guards stricter than Design** — `/export type PublishMode\s*=/` regex가 type alias declaration 강제 (사용만으로는 불충분).
3. **Defense-in-depth** — `countAutoDraftsForOwner` try/catch fallback (index unavailable 시 0 반환, 헤더 안 깨짐).
4. **Test coverage exceeds Design** — ai-footer.test.ts 7 assertions (Design: 4 cases). Case 2b (undefined) + 2 invariant assertion 추가.
5. **Optimistic UI in toggle** — PartnerPublishModeToggle 실패 시 state 롤백 (UX 우수).
6. **Verification gates** — tsc/build/lint:mirror/tests 모두 그린.

## Risks

| Risk | Severity | Notes |
|---|:---:|---|
| targetAudience null 지속성 모호 | L | N3/N13 결의 — mapper에서 absent ≡ null 동등. cycle #30 audience UI 동등 취급 필요 |
| Firestore composite index 빌드 지연 | L | try/catch fallback (count 0 반환, 배지 비표시) |
| 기존 7매장 변동 없음 | L (의도됨) | R12 back-compat — publishMode 미설정 → 'auto' (cycle #28 동작 유지) |

## Gap List

### Critical (0)
없음.

### Major (0)
없음.

### Minor (2)

**MN-1**: CardNewsViewer parser-fail branch — Design §3.3에서 Fragment wrapping을 명시했으나 구현은 footer를 markdown append로 처리하여 Fragment 불필요. 기능적으로 Design 의도와 동일하지만 stylistic 차이. **권장**: Design v0.3 patch — markdown-append 접근법이 더 elegant (BlogRenderer와 일관). Non-blocking.

**MN-2**: layout.tsx 이중 connection() 호출 — `PartnerNameLabel`(cycle #28) + `PartnerHeaderWithBadge`(cycle #29) 두 async server component가 각각 `requirePartnerPage()` 호출. cache()'d 이지만 같은 layout에서 두 번 connection() trigger. 기존 패턴이고 cycle #29 introduced 아님 — flagged for awareness only.

## Recommendations

1. **즉시 조치 없음** — Match Rate 99% ≥ 90% 충족. `/pdca report partner-editorial-oversight` 진행 가능.
2. **Documentation update 제안 (cycle #30)**:
   - Design v0.3 patch — CardNewsViewer parser-fail branch markdown-append 접근법 명시
   - layout.tsx dual connection() 패턴 문서화 (cache()'d으로 비용 미미)
3. **cycle #30 preparation**:
   - targetAudience UI 구현 (N3·N13 결의 따라 null ≡ unset 동등 취급)
   - draft expire 정책 (cycle #29 risk table 4번)
   - admin 일괄 publish 도구

## Verification Gate Summary

| Gate | Result |
|---|:---:|
| `pnpm exec tsc --noEmit` (Next.js) | ✅ exit 0 |
| `pnpm exec tsc --noEmit` (functions) | ✅ exit 0 |
| `pnpm exec next build` | ✅ full prerender |
| `pnpm lint:mirror` | ✅ 10/10 |
| ai-footer.test.ts | ✅ 7/7 |
| faq-extractor (#28 regression) | ✅ 14/14 |
| article-jsonld (#28 regression) | ✅ 11/11 |
| auto-publish-window (#28 regression) | ✅ 22/22 |
| correctLastIndex (#27 regression) | ✅ 7/7 |
| firebase deploy --only firestore:indexes | ✅ |
| firebase deploy --only functions | ✅ |

## Verdict

**Proceed to `/pdca report partner-editorial-oversight`** — 9th consecutive single-pass ≥ 90% milestone 달성. Match Rate 99% (cycle #28 98.7% 기록 경신). cycle #29는 Plan Plus + design-validator 패턴이 9번 연속 ≥ 90% 통과한 통계적으로 의미있는 데이터포인트 — 메소드 검증 완료.

추가로 validator의 stricter standards (CI lint regex 강화, defense-in-depth fallback, test coverage exceeds Design)가 자연스럽게 반영되어 Match Rate 99% (cycle #28 보다 +0.3%) 달성.
