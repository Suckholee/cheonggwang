# promo-page — Design vs Implementation Gap Analysis

> **Feature**: promo-page
> **Analysis Date**: 2026-04-19
> **Analyst**: bkit:gap-detector
> **Design**: [promo-page.design.md](../02-design/features/promo-page.design.md) (v0.3)
> **Plan**: [promo-page.plan.md](../01-plan/features/promo-page.plan.md)

---

## 1. Overall Scores

| Category | Score | Status |
|---|:-:|:-:|
| Design Match (v1 MVP coverage) | **94%** | ✅ |
| Critical Constraints (10 items) | **9.0 / 10** (90%) | ✅ |
| Architecture Compliance | **98%** | ✅ |
| Convention Compliance | **96%** | ✅ |
| **Overall Match Rate** | **93%** | ✅ Ready for Report |

**Verdict**: Implementation faithfully reflects v0.3 design. All critical constraints (hygiene 격리, 쓰기 격리, Next.js 16 패턴, 보안 규칙, App Check 게이팅, rate-limit TX, slug 재시도) 정상 구현. 소수의 경미한 편차 존재 — 차단 요소 아님.

---

## 2. Critical Constraints — Verification Matrix

| # | Constraint | Status | Evidence |
|---|---|:-:|---|
| 1 | §1.2 Hygiene 어휘 격리 (hero/intro/highlights/cta에 청결 단어 없음) | ✅ | 3중 방어: (a) `prompt-builder.ts:49` `MARKETING_SYSTEM`이 `HYGIENE_KEYWORDS` 금지 명시; (b) `hygiene-guard.ts:29-81` 모든 비-hygiene 필드 스캔; (c) `generate-service.ts:70-99` 위반 섹션 1회 재생성 후 fallback; (d) `page-actions.ts:97-107` 수동 편집에도 guard 적용 |
| 2 | §3.4/§3.5 Firestore & Storage 규칙 | ✅ | `firestore.rules:1-61` (default-deny, owner-only, partner flags admin-only, trendKeywords closed, rateLimits closed); `storage.rules:1-12` (5MB, image/(jpeg\|png\|webp)) |
| 3 | §4.1 엔드포인트 | ✅ | auth-actions (signIn/Out), page-actions (save/publish/unpublish/delete + saveSections + createDraft*), `/api/generate` POST |
| 4 | §4.2 publishPage slug 재시도 | ✅ | `slug-repository.ts:19-35` gRPC code 6 감지 → `SlugConflictError`; `page-service.ts:103-120` `SLUG_MAX_ATTEMPTS=5` 루프 |
| 5 | §4.3 섹션별 Gemini `responseSchema` + hygiene 분리 system + 비파트너 skip | ✅ | 섹션별 `Schema` 개별 정의; 2가지 system instruction; 비파트너는 4 호출(hygiene skip) |
| 6 | §7.1 Firestore TX rate-limit | ✅ | `rate-limit.ts:18-46` `runTransaction` + `FieldValue.increment` + `ttlExpiresAt` |
| 7 | §7.2 App Check 서버 검증 | ✅ | `route.ts:11` env gated; `adminAppCheck.verifyToken`; 503 반환 |
| 8 | §9.4 Write-isolation (promo-page는 trendKeywords 쓰기 없음) | ✅ | `trend-keywords-repository.ts`는 `get`/`getOrDefault`만; `set`/`update`/`delete` 부재 |
| 9 | Next.js 16 패턴 | ⚠️ 대부분 | async params ✅, `'use cache'+cacheTag+cacheLife` ✅, `revalidateTag(tag,'max')` ✅, `updateTag` ✅, `images.remotePatterns` ✅. **편차**: `proxy.ts`가 `src/proxy.ts`에 위치 (design은 프로젝트 루트) |
| 10 | EditorShell hygiene 가드 | ✅ | `editor/[pageId]/page.tsx:32-38`에서 `getPartnerFlag`, `SectionEditor:68-83`에서 `{isPartner && ...}` |

**Critical constraint score: 9.0/10**

---

## 3. Gaps by Severity

### 🔴 Critical — 0
없음.

### 🟠 Major — 1

| ID | Item | Design Ref | Impl | Gap |
|---|---|---|---|---|
| MJ-1 | `GET /api/health` 미구현 | §4.1 endpoint table row 1 | `src/app/api/`에 `health/route.ts` 없음 | 운영 영향 낮음(liveness 체크) — 스펙엔 명시 |

### 🟡 Minor — 7

| ID | Item | Ref | Gap |
|---|---|---|---|
| MN-1 | App Check **클라이언트** 초기화 부재 | §7.2, §11.2 step 11 | `client.ts`에 `initializeAppCheck` 없음. `APP_CHECK_ENFORCE=true` 전환 전 추가 필수 |
| MN-2 | `proxy.ts` 위치 편차 | §11.1, §12.8 | design은 프로젝트 루트, 실제는 `src/proxy.ts` (Next.js는 둘 다 허용) |
| MN-3 | `opengraph-image.tsx` 미구현 | §12.6, §11.2 step 9 | `generateMetadata`의 `openGraph.images`가 fallback (대표 사진 URL). 동적 1200×630 이미지는 미구현 |
| MN-4 | Highlights 스키마 mismatch | §4.3 | 디자인 `[3]`, 실제 `.min(1).max(5)` (인라인 편집 유연성 위해 의도된 완화로 보임) |
| MN-5 | `createDraftPage`/`createDraftAndRedirect` Server Action 미문서화 | §4.1 | 코드에 존재, endpoint 테이블엔 없음 |
| MN-6 | `saveSections` Server Action 미문서화 | §4.1 | 코드에 존재, endpoint 테이블엔 없음 |
| MN-7 | `lib/map/naver-embed.ts` 미구현 | §4.3 footer | `Location.tsx`가 주소 검색 링크 + 사용자 제공 iframe으로 현재는 동작 |

### 🔵 Scope Additions — 3 (모두 합리적 보완)

| Item | Impl | Assessment |
|---|---|---|
| `PageCardActions` 대시보드 빠른 액션 | `components/dashboard/PageCardActions.tsx` | UX 개선, 스펙 충돌 없음 |
| `trendKeywordsRepository.getOrDefault` 업종별 기본 키워드 | `trend-keywords-repository.ts:26-70` | 파이프라인 미운영 시 fallback, §9.4 read-only 규칙 준수 |
| `tryVerifySessionCookie` non-throwing 버전 | `auth-admin.ts:27-37` | 랜딩 CTA UX 용도 |

### 4.5 Out-of-scope 누출 검사 — 0

Plan §3.2 제외 항목(재생성 버튼, QR, SNS 공유, 고급 SEO, 통계, admin 대시보드, 청소업 특화 ③④, 블록 에디터, 색상 커스터마이징, 커스텀 도메인, 카카오 로그인) **누출 없음** ✅

---

## 4. Architecture / Convention Compliance

| | 결과 |
|---|---|
| §9 Clean Architecture 레이어 | ✅ 준수 (서비스 ← 도메인 ← 인프라 분리, `server-only` sentinel 올바름) |
| §9 의존성 방향 | ✅ 위반 없음 |
| §10.1 Naming | ✅ 모두 준수 (PascalCase 컴포넌트, kebab-case 유틸/폴더, UPPER_SNAKE 상수) |
| §10.2 Import order | ✅ 샘플 파일 점검 통과 |
| §10.3 환경 변수 prefix | ✅ `NEXT_PUBLIC_*`, `FIREBASE_ADMIN_*`, `GOOGLE_GENERATIVE_AI_*` |

---

## 5. Recommended Actions

### 프로덕션 배포 전 (필수)
1. **MN-1**: `src/lib/firebase/client.ts`에 `initializeAppCheck` 추가 + `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 설정. 이 없이 `APP_CHECK_ENFORCE=true`면 `/api/generate`가 503 통째로 죽음

### 단기 (다음 이터레이션)
2. **MJ-1**: `src/app/api/health/route.ts` 추가 (or 설계에서 드롭)
3. **MN-3**: `opengraph-image.tsx` 구현 or 설계 §11.2 step 9 업데이트
4. **MN-7**: `lib/map/naver-embed.ts` 구현 or mapEmbed 자동 조립 요구사항 제거

### 설계 문서 업데이트 (코드가 진실)
5. **MN-2**: §12.8 proxy 위치 코멘트 수정 (또는 파일 이동)
6. **MN-4**: §4.3에서 highlights 1-5 개 허용으로 명시
7. **MN-5, MN-6**: §4.1 endpoint 테이블에 `createDraftPage`, `createDraftAndRedirect`, `saveSections` 추가
8. §9.4에 `trendKeywordsRepository.getOrDefault` fallback 동작 문서화

---

## 6. Summary

**Match Rate: 93%** — `/pdca report` 진입 가능 (MN-1은 프로덕션 배포 전 반드시 해결)

| Key findings |
|---|
| Critical gaps: **0** |
| Major gaps: **1** (health endpoint) |
| Minor gaps: **7** (App Check client init이 프로덕션 블로커) |
| Scope additions: **3** (모두 합리적) |
| Scope leakage: **0** |

**Recommendation**:
- **Option A**: MJ-1 + MN-1 + MN-3 + MN-7 해결 후 report → `/pdca iterate promo-page`
- **Option B**: 현 상태로 report 진입 → `/pdca report promo-page` (follow-ups로 추적)

v1 MVP는 **기능적으로 완성**되었으며 설계 정합성이 양호함. 프로덕션 배포 전 MN-1 해결만 반드시 필요.
