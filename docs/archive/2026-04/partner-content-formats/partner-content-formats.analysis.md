# Analysis · partner-content-formats

> **Status**: Check phase complete (gap-detector v1)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.12
> **Author**: Seokho Lee (analyzed by gap-detector agent)
> **Date**: 2026-04-27
> **PDCA Cycle**: #25
> **Plan**: `docs/01-plan/features/partner-content-formats.plan.md` (v1.0)
> **Design**: `docs/02-design/features/partner-content-formats.design.md` (v0.2, 25 issues resolved)
> **Implementation**: commits `8d6cd1a` + `ffdb434`

---

## 1. Match Rate Summary

| Category | Score | Status |
|----------|:-----:|:------:|
| File Inventory Coverage (§1.1 + §1.2) | 100% | ✅ |
| R1–R5 Invariants | 100% | ✅ |
| Implementation Steps S1–S11 | 100% | ✅ |
| Acceptance Criteria AC1–AC14 | 100% | ✅ |
| Open Questions OQ1–OQ12 | 100% | ✅ |
| Design API/signature fidelity | 95% | ✅ |
| **Overall Match Rate** | **~97%** | **✅** |

**Verdict**: Single-pass success. **5번 연속** ≥90% 달성 (cycles #21·#22·#23·#24·#25). Plan Plus + design-validator 패턴이 프로젝트 mature PDCA 메소드로 검증됨.

---

## 2. File Inventory Coverage

### 2.1 신규 파일 (12 + 1 actions = 13) — 100% 충족

| # | 경로 | Status |
|---|------|:------:|
| 1 | `src/domain/post-format.ts` | ✅ |
| 2 | `src/lib/post/post-format-fallback.ts` | ✅ |
| 3 | `src/lib/post/extract-excerpt.ts` | ✅ |
| 4 | `src/lib/post/parse-card-news-slides.ts` | ✅ |
| 5 | `src/lib/llm/card-news-generator.ts` | ✅ |
| 6 | `src/lib/llm/template-context.ts` | ✅ |
| 7 | `src/components/post/PostBodyRenderer.tsx` | ✅ |
| 8 | `src/components/post/BlogRenderer.tsx` | ✅ |
| 9 | `src/components/post/CardNewsViewer.tsx` | ✅ |
| 10 | `src/components/post/CardNewsPaginator.tsx` | ✅ |
| 11 | `src/components/partner/PartnerPostCard.tsx` | ✅ |
| 12 | `src/components/partner/PartnerPostsNewWizard.tsx` | ✅ |
| +1 | `src/app/actions/partner-templates-actions.ts` | ✅ |

### 2.2 수정 파일 (9) — 100% 충족

| 파일 | Status |
|------|:------:|
| `src/types/post.ts` | ✅ format/templateId/templateScenarios + GenerationMeta.templateTags/cardNewsValidationFailed |
| `src/lib/llm/partner-promo-generator.ts` | ✅ R1 invariant 보존, retry+fallback chain |
| `src/app/api/partner/posts/route.ts` | ✅ FormData parser 확장, type-guard cheat protection |
| `src/components/partner/PartnerPostsList.tsx` | ✅ 카드 그리드 + resolveCardHref 단일 경로 |
| `src/app/partner/posts/page.tsx` | ✅ partnerCover prop |
| `src/app/partner/posts/new/page.tsx` | ✅ Wizard 사용 |
| `src/components/community/PostDetailView.tsx` | ✅ body div → PostBodyRenderer (헤더 보존) |
| `src/components/partner/PartnerPromoDraftForm.tsx` | ✅ format/templateId props + FormData append |
| `src/lib/firebase/post-repository.ts` | ✅ CreatePostInput·toPost·create 확장 |

---

## 3. R1–R5 Invariant Checks

### R1 — composeDraft + generatePartnerPromoDraft 시그니처 불변
**Status**: ✅ Honored.

- `partner-promo-generator.ts` `composeDraft` args object: 기존 6 required (visionDescs, businessName, keywords, slogan, brandTone, styleRefs) + ragContextSection? (cycle #24) 위치/타입/이름 모두 보존. 신규 templateContext?, format?만 8·9번째 optional 추가.
- `GeneratePartnerPromoInput`도 동일 패턴. 미지정 시 `format='blog'` → cycle #24와 100% 동일 동작 (regression 0).

### R2 — ContentTemplate 모델 변경 0
**Status**: ✅ Honored.

`src/types/content-template.ts` cycle #24 그대로. `firestore.indexes.json`·`firestore.rules` 무수정.

### R3 — published 글은 별도 redirect 없이 /community/p/[slug] 정상 흐름
**Status**: ✅ Honored.

별도 `/partner/posts/[id]/preview` 페이지 신설 X. `app/community/p/[slug]/page.tsx`가 publishStatus 분기를 자체 처리 (cycle #19 기존 구현).

### R4 — owner 검증
**Status**: ✅ Honored.

`/community/p/[slug]/page.tsx`의 `tryVerifySessionCookie` + `providerOwnerUid !== uid` → `notFound()` (cycle #19 그대로).

### R5 — 카드 클릭 라우팅 단일 경로
**Status**: ✅ Honored.

`PartnerPostsList.resolveCardHref`는 모든 status에 대해 `/community/p/${p.slug}` 단일 반환.

---

## 4. Implementation Order S1–S11

| Step | Status |
|------|:------:|
| S1 Post 모델 + post-format type + fallback | ✅ |
| S2 utils (extract-excerpt, parse-card-news-slides) | ✅ |
| S3 card-news-generator + template-context | ✅ |
| S4 composeDraft + generatePartnerPromoDraft 확장 (R1) | ✅ |
| S5 BlogRenderer + CardNewsViewer + CardNewsPaginator | ✅ |
| S6 PostBodyRenderer + PostDetailView body swap | ✅ |
| S7 listTemplatesForPartner action | ✅ |
| S8 PartnerPostsNewWizard (3-step) | ✅ |
| S9 /api/partner/posts route 확장 | ✅ |
| S10 PartnerPostCard + 카드 그리드 | ✅ |
| S11 seed-card-news-samples (idempotent + FORCE) | ✅ |

---

## 5. Acceptance Criteria (14/14)

| AC | 검증 결과 |
|----|----------|
| AC1 post.format 저장 | ✅ route.ts saves format · post-repository persists |
| AC2 card-news → CardNewsViewer | ✅ PostBodyRenderer 분기 |
| AC3 카드 모든 시각 요소 | ✅ PartnerPostCard cover/badge/scenarios/excerpt/status/date |
| AC4 단일 라우팅 | ✅ resolveCardHref single path |
| AC5 draft/withdrawn noindex 배너 | ✅ /community/p/[slug] 기존 구현 |
| AC6 다른 파트너 → notFound | ✅ ownership check |
| AC7 레거시 → blog fallback | ✅ postFormatFallback |
| AC8 cycle #24 동일 동작 | ✅ format ?? 'blog' default |
| AC9 Wizard skip → templateId 없이 | ✅ onSkip + FormData omit |
| AC10 card-news 실패 → blog fallback + flag | ✅ retry chain + cardNewsValidationFailed |
| AC11 rate-limit 1회 차감 | ✅ 단일 HTTP roundtrip |
| AC12 non-partner-promo는 blog 강제 | ✅ PostBodyRenderer 분기 |
| AC13 industry='other' fallback | ✅ listTemplatesForPartner |
| AC14 ArrowLeft/Right 키보드 | ✅ CardNewsPaginator keydown listener |

---

## 6. Open Questions OQ1–OQ12

모든 12개 OQ가 design v0.2의 잠정 답대로 구현됨. 상세 코드 인용은 §6과 §7의 코드 경로 참조.

| OQ | Status |
|----|:------:|
| OQ1~OQ12 | ✅ 12/12 |

---

## 7. Gap Categories

### 🔴 Missing files / functions
**없음.** §1.1 신규 12 + §1.3 actions 1 + §1.2 수정 9 모두 존재 + 책임 매칭.

### 🟠 Implementation diverges from design (3건, 모두 acceptable)

1. **`queryByIndustry` 시그니처 불일치 (§4.2)**: design은 positional `queryByIndustry(industry, type, MAX)` 가정했지만, 실제 cycle #24 구현은 `queryByIndustry(industry, { maxPerType })`. `partner-templates-actions.ts`에서 query 후 `t.type === parsed.type` 클라이언트 사이드 필터링으로 보정. **순동작은 design 의도와 동일** + R2 invariant 보존.

2. **`PartnerPostsNewWizard` props 변경**: design은 `<PartnerPostsNewWizard partner={partner} />` 단일 prop, 실제는 `{ industry, inAutoPublishWindow }` 두 scalar prop. 스칼라만 넘기는 패턴이라 더 깔끔. 기능 동일.

3. **zod schema 우회**: design은 `z.enum(PARTNER_INDUSTRIES)` 사용 가정, 실제는 `z.string()` + 수동 type guard (isPartnerIndustry, isContentTemplateType). PARTNER_INDUSTRIES가 mutable array인 TypeScript 한계 우회. 보안적으로 동등 (invalid input → empty array).

### 🟡 Incomplete coverage
**없음.** 모든 AC, OQ, R-invariant 충족.

### 🟢 Post-design v0.3 enhancements (commit ffdb434)

design v0.2 승인 후 추가된 visual polish — gap 아님:

1. **CardNewsPaginator 재디자인** — 4:5 종횡비, 사진 배경 + 그라디언트 오버레이, 시리얼 카운터, 매장명 워터마크, 슬라이드 마커
2. **`prose-cardnews` CSS** — globals.css에 노란 헤드라인 + 형광펜 italic
3. **SLIDE_INSTRUCTION 강화** — bold/italic 패턴 가이드 + few-shot 예시 3슬라이드
4. **CardNewsViewer props 확장** — Post 전체 받아 photoPool/companyName 전달
5. **시드 보강 + FORCE 모드**

cycle #24와 동일한 post-design polish 패턴.

---

## 8. Section-by-Section Coverage

| Design Section | Coverage |
|---|:--:|
| §0 R1–R5 Reconciliation | ✅ 100% |
| §1.1 신규 파일 (12) | ✅ 100% |
| §1.2 수정 파일 (9) | ✅ 100% |
| §1.3 server actions | ✅ 100% |
| §1.4 인프라 (rules/indexes) | ✅ 100% (no change) |
| §1.5 env / deps | ✅ 100% (no new deps) |
| §2.1–2.4 Data Model | ✅ 100% |
| §3.1 composeDraft (R1) | ✅ 100% |
| §3.2 card-news instruction | ✅ 100% (+ enhancement) |
| §3.3 buildComposePrompt | ✅ 100% |
| §3.4 templateContext | ✅ 100% |
| §3.5 H5 fallback | ✅ 100% |
| §4.1 route.ts 확장 | ✅ 100% |
| §4.2 listTemplatesForPartner | ✅ 95% (signature adapted) |
| §5.1 PartnerPostCard | ✅ 100% |
| §5.2 PartnerPostsList | ✅ 100% |
| §5.3 CardNews server+client 분리 | ✅ 100% (+ enhancement) |
| §5.4 PostBodyRenderer | ✅ 100% |
| §5.5 BlogRenderer | ✅ 100% |
| §5.6 Wizard | ✅ 100% |
| §6.1–6.4 Pages | ✅ 100% |
| §6.5 No /preview page (C5) | ✅ 100% |
| §7 Routing & guards | ✅ 100% |
| §8 Storage/Firestore | ✅ 100% (no change) |
| §10 Implementation Order | ✅ 100% |
| §11 Acceptance Criteria | ✅ 100% |
| §12 Migration & Rollback | ✅ 100% |

---

## 9. Cross-Cycle Streak

| Cycle | Match Rate | Pattern |
|---|:--:|---|
| #21 partner-application | 99% | Plan Plus + design-validator → single pass |
| #22 partner-issue-from-users | 97% | 동일 패턴 |
| #23 hotfix signup-then-apply | (hotfix, 미적용) | — |
| #24 partner-rag-system | 97% | 동일 패턴, 역대 최대 (4,469 LOC) |
| #25 **partner-content-formats** | **97%** | **5번 연속 single-pass 90s%** |

Plan Plus + design-validator 패턴이 mature PDCA 메소드로 검증됨.

---

## 10. Recommendations

### Match Rate ≥ 90% → /pdca report 진행

```
/pdca report partner-content-formats
```

Report 핵심 포인트:

1. **5사이클 연속 single-pass**: cycle #21~#25 모두 ≥ 90% 달성. Plan Plus + design-validator workflow가 프로젝트의 정착된 PDCA 메소드.
2. **Post-design v0.3 enhancements** (commit ffdb434): cycle #24와 동일한 post-design polish 디시플린.
3. **Zero invariant violations**: cycle #19 (composeDraft) + cycle #24 (ContentTemplate) 모두 100% 보존.
4. **Cross-cycle leverage**: `/community/p/[slug]` 재사용 결정(C5)으로 ~150 LOC 절감 + ownership/preview UX 단일 진입점 강화.
5. **카드뉴스 시각 디자인**: 단순 텍스트 박스 → 핀터레스트·인스타 패턴 (4:5 종횡비, 노란 헤드라인, 형광펜 highlight, 시리얼/워터마크).

### 선택적 polish (블로커 X)

- `PARTNER_INDUSTRIES`를 `readonly [...]` tuple로 노출하면 `z.enum()` 직접 사용 가능. 외관상 이슈만.
- design v0.2 §4.2의 outdated `queryByIndustry` 시그니처 예시는 cycle #26+ 참조용으로 정확화 권장.

---

## 11. Phase Status

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ (97%) → [Act] (skip, ≥90%) → [Report] 🎯 next
```

**Next**: `/pdca report partner-content-formats`
