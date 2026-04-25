# Gap Analysis — `provider-promo-content` (PDCA Cycle #16)

**Date**: 2026-04-21
**Feature**: provider-promo-content (v1.4 #1)
**Phase**: Check
**Analyzer**: bkit:gap-detector

---

## Executive Summary

| Metric | Value |
|---|:-:|
| **Match Rate** | **99%** |
| Design Match | 99% |
| Architecture Compliance | 100% |
| Convention Compliance | 100% |
| Critical Gaps | 0 |
| Medium Gaps | 1 |
| Low Gaps | 0 |

**Verdict**: ✅ 리포트 단계 진입 가능 (>= 90% threshold 충족).

---

## Scope

- **Design doc**: `docs/02-design/features/provider-promo-content.design.md`
- **Plan doc**: `docs/01-plan/features/provider-promo-content.plan.md`
- **Implementation**: 17 신규 파일 + 6 수정 파일 + 3 deps + seed 3건

---

## Critical Requirements — 모두 검증 ✅

| # | 요구사항 | 검증 |
|---|---|---|
| 1 | 7일 쿨다운 (`providers.lastPromoPostAt`) | `promo-actions.ts:93-101` — `COOLDOWN_MS = 7d`, Gemini 호출 전 elapsed 체크 |
| 2 | Gemini 실패 → TX 전 throw (쿨다운 미소모) | `promo-actions.ts:119-132` — try/catch로 감싸고 `LLM_FAILURE` throw, line 163 `runTransaction` 진입 전 |
| 3 | TX: posts.create + providers.update (reads-before-writes) | `promo-actions.ts:163-183` — provider/workCases/reviews fetch는 TX 밖, 쓰기만 TX 내부 |
| 4 | Denormalization snapshot at creation | `promo-actions.ts:165-178` — companyName / categories / regionLabel / brandTone / providerOwnerUid |
| 5 | Markdown sanitization (whitelist + https-only) | `lib/markdown.ts:14-35` — `allowedTags`, `allowedSchemes:["https"]`, `rel="noopener noreferrer"` |
| 6 | Server→Client DTO boundary (Timestamp 미누출) | `PostFeedGrid.tsx:4-14` — `toFeedCardDTO` → `createdAtMs: number`. 모든 repo가 Timestamp→Date 변환 |
| 7 | Zod validation at Server Action boundaries | `promo-actions.ts:53, 79, 136` — 입력 2건 + Gemini 출력 재검증 |
| 8 | posts rules: read=true, write=false | `firestore.rules:149-152` |
| 9 | 복합 인덱스 (providerId + createdAt DESC) | `firestore.indexes.json:164-171` |
| 10 | 시스템 프롬프트 3중 방어 | `promo-prompt.ts:30-33` — 보험책임격리/비방금지/기술집중 |

---

## Gaps

### 🟡 G1 (Medium) — 복합 인덱스만 선언, 단일 필드 인덱스 누락

- **Severity**: Medium (기능상 문제 없음 · 스펙/구현 분기)
- **Design 요구**: Plan §7.2 / Design §3.3 — 인덱스 **2개** (단일 `createdAt DESC` + 복합 `providerId + createdAt DESC`)
- **Implementation**: `firestore.indexes.json:164-171` — **복합 인덱스만** 선언, 단일 필드 누락
- **실제 영향**: Firestore는 단일 필드 `orderBy`에 대해 자동 인덱스 생성(ASC/DESC 기본). `postRepository.listRecent()` (`post-repository.ts:87-90`, `orderBy("createdAt","desc").limit(50)`) 는 자동 인덱스로 동작함. **기능 정상 동작** · 문서와 구현만 어긋남.
- **권장 조치**: 
  - 옵션 A: `firestore.indexes.json`에 단일 필드 인덱스 명시 추가
  - 옵션 B (권장): Design §3.3을 "자동 인덱스로 충분"으로 업데이트
  - 이유: Firestore 관례상 단일 필드 인덱스는 명시 불필요. Design 문서 수정이 더 깔끔.

---

## Architecture Compliance (100%)

| Layer | 검증 |
|---|---|
| Presentation (Server) | community/page · [postId]/page · providers/[id]/page · provider/profile/page · PostFeedGrid · PostDetailView · PostProviderInfoCard · NewsSection · MyPromoPostsList ✅ |
| Presentation (Client) | PromoSettingsForm · CreatePromoPostButton · PostFeedCard · CommunityEmptyState · QuoteCTAButton · ProfileEditorTabs — all `"use client"` ✅ |
| Application | `app/actions/promo-actions.ts` — Server Actions ✅ |
| Domain | `types/post.ts` · `domain/promo-schemas.ts` · `domain/promo-prompt.ts` · `lib/slug.ts` — pure ✅ |
| Infrastructure | `lib/firebase/post-repository.ts` · `lib/gemini.ts` · `lib/markdown.ts` — `"server-only"` ✅ |

---

## Convention Compliance (100%)

- Components: PascalCase ✅ (17 신규)
- Utils: camelCase ✅ (`titleToSlug`, `renderMarkdown`, `buildPromoPrompt`, `createGeminiClient`)
- Constants: UPPER_SNAKE_CASE ✅ (`BRAND_TONES`, `COOLDOWN_MS`)
- Import order: external → `@/...` → relative → type ✅
- Folders: kebab-case ✅ (`community/`, `provider-profile-editor/`)
- Directive 배치: `"use client"`, `"use server"`, `"server-only"` ✅

---

## Per-File Verification Matrix

### 신규 17개
| 파일 | 상태 |
|---|:-:|
| src/types/post.ts | ✅ |
| src/domain/promo-schemas.ts | ✅ |
| src/domain/promo-prompt.ts | ✅ |
| src/lib/gemini.ts | ✅ |
| src/lib/slug.ts | ✅ |
| src/lib/markdown.ts | ✅ |
| src/lib/firebase/post-repository.ts | ✅ (React cache() 적용) |
| src/app/actions/promo-actions.ts | ✅ |
| src/app/community/[postId]/page.tsx | ✅ (generateMetadata 포함) |
| src/components/community/* (6개) | ✅ |
| src/components/provider-profile/NewsSection.tsx | ✅ |
| src/components/provider-profile-editor/* (4개) | ✅ |

### 수정 6개
| 파일 | 상태 |
|---|:-:|
| src/types/provider.ts | ✅ brandTone/slogan/lastPromoPostAt 추가 |
| src/lib/firebase/provider-repository.ts:131-139 | ✅ toProvider 매핑 |
| src/app/community/page.tsx | ✅ feed shell |
| src/app/providers/[providerId]/page.tsx:66,78 | ✅ postRepository + NewsSection |
| src/components/provider-profile-editor/ProfileEditorTabs.tsx:5 | ✅ EditorTabKey 확장 |
| src/app/provider/profile/page.tsx:26,126 | ✅ VALID_TABS + PromoTab render |

### 인프라 / Seed
- `firestore.rules:149-152` ✅
- `firestore.indexes.json:164-171` ⚠️ G1
- `package.json` +marked@18 +sanitize-html@2.17 +@types/sanitize-html@2.16 ✅
- `scripts/seed-first-provider.mjs:379-511` — 3 posts (10/20/30일전) ✅

---

## 유의 (Non-Gap 확인)

- **"입력 sanitization"**: design Q8은 "시스템 프롬프트 3중 방어"였고, topicHint / slogan은 Zod로 길이 제약(60/40자). 공격 표면 좁음 — design 요구 사항 없음, 정상.
- **"Reads-before-writes" 패턴**: `tx.get()` 없이 밖에서 읽고 TX 안에서 쓰기만 수행. design §2.1과 일치.

---

## Next Steps

Match Rate 99% ≥ 90% → Report 단계 진입 가능.

1. **권장 즉시 조치**: G1 처리 (Design §3.3 문구만 수정 권장 · 코드 변경 불필요)
2. `/pdca report provider-promo-content` — 완료 리포트 생성
3. `/pdca archive provider-promo-content` — `docs/archive/2026-04/` 로 이관
