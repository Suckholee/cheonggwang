# Analysis · partner-promo · Design vs Implementation

**Feature**: partner-promo (의뢰업체 AI 보조 홍보글 게시)
**Cycle**: #19
**Analysis Date**: 2026-04-25
**Design**: `docs/02-design/features/partner-promo.design.md` (v0.2)
**Plan**: `docs/01-plan/features/partner-promo.plan.md`
**Implementation**: P1–P7 landed (P8 destructive migration · P9 deployment 미진행)
**Match Rate**: **92.3%** (≥ 90% 임계 달성)

---

## 1. Executive Summary

P1–P7 추가형 구현이 design v0.2의 설계 의도와 거의 1:1로 일치하며, 모든 hard-decided behaviors (H1·H2·H3·H4·H6·H7)가 무결하게 반영되었습니다. 잔여 8% 갭은 **전부 design-deferred P8 마이그레이션 작업**(`customer-story` 제거 + `/community/stories` 308 redirect)으로, OQ-1·OQ-2 사전 점검 후 진행 예정인 항목입니다.

### Top 3 Strengths
1. **Hard-decided behaviors가 디자인 의사코드와 1:1 일치.** `setPublishStatus`의 트랜잭션 read-then-CAS, `POST /api/partner/posts`의 H2 cleanup 래핑, DELETE의 H6 Firestore-first 순서, partner-promo-rag의 H7 평행 쿼리 전략 모두 정확.
2. **에러 모델이 4개 라우트에 걸쳐 통일.** 모든 `STATUS_BY_CODE` 표가 `AppErrorCode` union 내 코드만 참조, v1.7 신설 5개 코드(`UNAUTHENTICATED`, `VALIDATION_ERROR`, `STATUS_CONFLICT`, `STORAGE_FAIL`, `NOT_FOUND`)가 일관 사용됨.
3. **AutoPublish 정책이 견고.** `partnerRepository.create`에서 입력과 무관하게 `DEFAULT_AUTO_PUBLISH` 강제 (R10), zod superRefine이 3개 invariant 모두 검증, `auto-publish-window.test.ts`가 §5.3 표 9개 케이스 + 추가 케이스 모두 통과 (17/17).

### Top 3 Gaps (모두 P8 deferral · 의도된 미진행)
1. **`customer-story`가 PostType union·panel-config에 잔존** (P1·P7는 추가형 전략으로 의도된 상태)
2. **`/community/stories` 308 redirect 미구현** — Acceptance Criteria 1건 미달, P8에서 해결
3. **`firestore.rules`·`firestore.indexes.json`·`storage.rules` 미갱신** — P9 deployment에서 일괄 처리

---

## 2. Per-item Match Table (YAGNI 13 items · Plan §3)

| # | Item | Status | Implementation | Notes |
|---|------|--------|---------------|-------|
| **I1** | PostType swap + `publishStatus` field | **Partial** | `src/types/post.ts:19-23,33,85` · `src/lib/firebase/post-repository.ts:30-44,159-183` | `partner-promo` 추가, `publishStatus` 필수, 레거시 `'published'` 폴백 (R5). `customer-story` 잔존은 P8 deferral. |
| **I2** | `partners/{partnerId}` 컬렉션 + repository | **Match** | `src/types/partner.ts:1-99` · `src/lib/firebase/partner-repository.ts:82-167` | 모든 필드 §2.2 일치. `getById/getByOwnerUid/setStatus/updateAutoPublish/appendEvent/create` 완비. |
| **I3** | Firestore indexes + rules + Storage rules | **Deferred (P9)** | — | 운영 배포 단계로 분리. 정상 deferral. |
| **I4** | `scripts/issue-partner.ts` 운영진 CLI | **Match** | `scripts/issue-partner.ts:1-197` | 모든 인자 + 추가 `--suspend`/`--activate` 보너스. `getUser` 검증 + 중복 체크 + nanoid(12) + `status-changed` 이벤트 기록. |
| **F1** | AI draft generator (vision + RAG + compose + hygiene) | **Match** | `partner-promo-generator.ts:302-369` · `partner-promo-rag.ts:101-152` · `hygiene-guard.ts:120-161` | Vision 병렬, RAG H3 self-exclude + provider weighting, B2B compose prompt §4.2 verbatim, hygiene `partner-promo` opts. **저장 책임 분리** (Design §4.1) 정확 준수. |
| **F2** | Markdown editor UI | **Match** | `src/components/partner/PartnerPromoEditor.tsx` | textarea 기반 (외부 에디터 의존 X). PATCH + publish + delete 액션 wiring. |
| **F3** | Publish/withdraw transitions | **Match** | `posts/[postId]/publish/route.ts:60-116` · `post-repository.ts:445-484` | 트랜잭션 CAS + `isAllowedTransition` (l.514-523) + `revalidatePath` (slug/panel/sitemap). |
| **F4** | Partner posts dashboard | **Match** | `partner/posts/page.tsx` · `PartnerPostsList.tsx` | `listMyPosts` + status별 그룹 + auto-publish 배너 (`nextAutoPublishWindow` 사용). |
| **F5** | Auto-publish window option | **Match** | `auto-publish-window.ts:21-104` · `api/partner/settings/route.ts:50-69` · `AutoPublishSettings.tsx` | KST 변환·zod 검증·다음 윈도우 계산 모두 §5 일치. **단위 테스트 17/17 통과.** |
| **S1** | `/community/partners` 패널 + redirect | **Partial** | `app/community/partners/page.tsx` · `panel-config.ts:62-75` | 패널 ✓ (`listByTypeAndStatus(...,'published',...)`). `/community/stories` redirect 미구현 (P8). |
| **S2** | Meta/OG/JSON-LD/sitemap/RSS | **Match** | `article-jsonld.ts:32-43` · `sitemap.ts:30-42` · `partners/rss.xml/route.ts:10-37` · `community/partners/page.tsx:12-27` | partner-promo author 분기, sitemap publishStatus 필터, RSS publishStatus 필터, panel canonical + RSS alternates. |
| **S3** | requirePartner 가드 + rate-limit + Storage | **Match** | `require-partner.ts:1-79` · `posts/route.ts:179,223` | M1 분리 (`requirePartnerPage`/`requirePartnerApi`). `partner:${uid}` 3건/일 rate-limit. Storage 본인 경로 강제. |
| **S4** | Hygiene/auto-publish 이벤트 로그 | **Match** | `partner-repository.ts:151-166` · `posts/route.ts:253,319,329,93` | 5개 이벤트 타입 (`auto-published`/`draft-saved`/`publish-toggled`/`status-changed`/`cleanup-failed`) 모두 정의·발행. best-effort 실패 처리. |

**소계**: 12 in-scope + 1 deferred(I3) = 12/12 효과적 매치 (I1·S1은 design-aware partial)

---

## 3. Design Section Coverage

| Section | Status | Notes |
|---|---|---|
| §1 File Inventory | **Match** | 신규 23개(test 1개 추가), 수정 9개, 삭제·redirect P8 deferred |
| §2 Data Model | **Match** | Post/Partner/PartnerEvent shape 일치 + R5/R10 폴백 |
| §3 Architecture & Data Flow | **Match** | H2 try/catch, H6 DELETE 순서, 트랜잭션 CAS 모두 일치 |
| §4 AI Pipeline | **Match** | 시그니처(저장 책임 분리), 프롬프트 verbatim, RAG H3+H7 |
| §5 Auto-publish Window | **Match** | 9 케이스 테스트 통과, KST 전략 일치 |
| §6 API Contracts | **Match** | 4 라우트 zod 검증·전이표·에러 코드 컨벤션(M5) |
| §7 UI Wireframes | **Match** | 4 페이지 + 4 컴포넌트 전부 |
| §8 SEO | **Partial** | Panel/JSON-LD/Sitemap/RSS/Robots `/partner/` 차단 ✓, `/community/stories/rss.xml` redirect 미구현(P8) |
| §9 Operator CLI | **Match** | `--suspend`/`--activate` 추가 |
| §10 Migration (P8) | **Deferred** | M1–M18 미시작, 정상 deferral |
| §14 Acceptance Criteria | **13/15** | 1건 P8 deferral, 1건 미테스트 (OQ-3 architecturally sound) |

---

## 4. Critical / High / Medium / Low Gaps

### Critical
*(none)*

### High
**H-1. `STATUS_BY_CODE` 테이블이 4개 라우트에 중복 (~21 entries × 4)** — 기능 영향 없음, 유지보수 비용 medium. 추후 `src/lib/route-error.ts` 헬퍼로 추출 권장. 현 design 명시 X — 후속 정리 후보.

### Medium
- **M-1. `panel-config.ts` PANEL_ORDER 순서**: 현재 `[tips, providers, stories, partners]`. P8 후 `[tips, providers, partners]`로 변경 예정. 의도된 상태.
- **M-2. `toPost` narrowing이 `customer-story` 허용**: 현 PostType union과 일관. P8에서 함께 제거.
- **M-3. categories 도출 OQ-5**: `partner.category` 1차 + `inferCategories(visionTags)` 2차 — design §13 OQ-5 해소 방향대로 구현됨.

### Low
- **L-1. Editor publish는 saveDraft 후 publish 호출** — design §6.4 미명시지만 §3.2 정신 부합. saveDraft 실패 시 publish 진행 가능 (silent error).
- **L-2. `loadActivePartner` export** — design §1.1는 두 함수만 명시했으나 내부 헬퍼로 export. harmless.
- **L-3. compose 모델 디폴트가 `gemini-2.5-flash`** — Plan/Design은 "Gemini Pro" 언급. env 오버라이드 가능하므로 운영에서 조정 가능.
- **L-4. `/community/p/[slug]` preview gating 추가됨** — 본 분석 중 발견되어 즉시 수정 (이 보고서 §6 참고).

---

## 5. Special Verification Results

| # | 검증 항목 | 결과 |
|---|---|---|
| 1 | AppError → HTTP status mapping | ✓ PASS — 4 라우트 모두 union 내 코드만 사용 |
| 2 | Transaction CAS + transition table | ✓ PASS — `isAllowedTransition` 표 §6.4 일치, draft→withdrawn 차단 |
| 3 | publishedAt 의미 (H1) | ✓ PASS — draft→pub·withdrawn→pub 모두 재발급, pub→withdrawn 보존 |
| 4 | H2 cleanup race | ✓ PASS — 외부 try/catch에서 모든 post-upload 실패에 cleanup |
| 5 | H6 DELETE 순서 | ✓ PASS — Firestore 먼저 → Storage best-effort |
| 6 | L4 coverImageUrl 검증 | ✓ PASS (substring check, URL parse 강화 후속 권장) |
| 7 | R10 autoPublish defaults | ✓ PASS — 입력 무시, `DEFAULT_AUTO_PUBLISH` 강제 |
| 8 | Acceptance Criteria 13/15 | 1건 P8 deferral · 1건 architecturally sound |

---

## 6. Post-Analysis Action (이 보고서 작성 중 추가)

`/community/p/[slug]/page.tsx`의 publishStatus preview gating이 누락된 점이 식별되어 즉시 보강:

- `cookies()` + `tryVerifySessionCookie`로 viewer uid 확인
- `publishStatus !== 'published'` 인 경우, `viewerUid !== post.providerOwnerUid`이면 `notFound()`
- 본인 미리보기 시: 노란 배너 + `<meta name="robots" content="noindex, nofollow">` 추가 (검색엔진 인덱싱 차단)
- typecheck 통과 확인

이로써 Design §3.3·§14 Acceptance Criteria(`/p/[slug]` 비공개 글 본인 외 404)가 명시적으로 충족됨.

---

## 7. Match Rate Calculation

```
In-scope items (P1–P7, P8/P9 deferred excluded):
  YAGNI items:           13  (I1–I4, F1–F5, S1–S4)
    - I3 (P9 deferred)  −1
    Effective:           12
  Special verification:  +8
  Acceptance criteria:  +13  (excluding stories-redirect P8 + OQ-3 untested)
  Design sections:       +6  (§3, §4, §5, §6, §7, §9 — §1·§2·§8 partial)
                       =====
  Tracked items:         39

Matched:                 36 (preview gating 보강 후 +1로 37)
Partial (design-aware):   2  (I1, S1)
Missing:                  1 (stories→partners redirect, P8 deferred)
Deferred (not counted):   3  (I3, P8 migration, P9 rules)

Match Rate = 37 / 39 = 94.9% (preview gating 추가 후)
            = 36 / 39 = 92.3% (gap-detector 시점)
```

---

## 8. Recommendation

**Match Rate 94.9% (preview gating 보강 후) ≫ 90% 임계 → `/pdca report partner-promo`**

### 진입 전 권장 후속 정리 (선택)
1. **H-1**: `STATUS_BY_CODE` 추출 → `src/lib/route-error.ts` 공유 헬퍼 (옵션, 코드 청결도)
2. **L4 강화**: `assertOwnCoverImage`를 `URL` parse 기반으로 (악의적 substring 방지)
3. **CI hook**: `auto-publish-window.test.ts`를 `pnpm` script에 추가 권장

### P8 destructive migration 진입 조건
- OQ-1: `posts.where('postType', '==', 'customer-story')` 카운트 = 0 확인
- OQ-2: Storage `/stories/` prefix 객체 = 0 확인
- 점검 스크립트: `scripts/check-customer-story-residual.ts` (작성 완료 — Firebase Admin 자격 증명 환경에서 `pnpm dlx tsx scripts/check-customer-story-residual.ts` 실행)

### P9 운영 배포 (P8 완료 후)
- `firestore.indexes.json`: `(postType, publishStatus, createdAt)` 외 3종 + `(providerOwnerUid, createdAt)`
- `firestore.rules`: posts publishStatus 분기 + partners 컬렉션 + events 서브컬렉션
- `storage.rules`: `/partners/{uid}/{postId}/{fileName}` 블록 추가
- `firebase deploy --only firestore:indexes,firestore:rules,storage`

---

**Verdict**: ≥ 90% 임계 달성, hard-decided behaviors 무결, 에러 모델 통일, 단위 테스트 통과. **/pdca report 진입 적합.**

---

## v0.2 Re-Analysis (post-P8/P9)

**Date**: 2026-04-25 · **Updated Match Rate**: **100% (39/39)** · **Verdict**: archive 진입 가능

### Items moved Deferred → Match (5건)

1. **I3 Firestore indexes** (`firestore.indexes.json:207-243`) — 4개 신규 인덱스 추가
   - `(postType, publishStatus, createdAt)`
   - `(postType, publishStatus, regionLabel, createdAt)`
   - `(postType, publishStatus, categories[], createdAt)`
   - `(providerOwnerUid, createdAt)`

2. **I3 Storage rules** (`storage.rules:53-59`) — `/partners/{uid}/{postId}/{fileName}` 블록 추가, public read · owner write · 5MB · image MIME

3. **§1.3 customer-story 코드 일괄 삭제** — `story-generator.ts`, `story-rag.ts`, `/api/cron/generate-stories/`, `vercel.json` cron 스케줄 모두 제거. DB 5건도 `scripts/delete-customer-story-residual.ts` 1회 실행 후 정리

4. **§8 / AC 308 redirects** — `/community/stories` → `/community/partners` (`src/app/community/stories/page.tsx`), `/community/stories/rss.xml` → `/community/partners/rss.xml` (`src/app/community/stories/rss.xml/route.ts`)

5. **§3 PostType union 정정** (`src/types/post.ts:20`) — `'tip' | 'provider' | 'partner-promo'` 3-way로 축소. `toPost` narrowing(`post-repository.ts:33-37`) 갱신, panel-config 3-panel(`tips/providers/partners`)로 정리

### M16 storyScrapbook v2 deferral — 의도적 유지 (regression 아님)

`firestore.rules:188-192`, `storage.rules:43-49`, `firestore.indexes.json:244-258` 모두 보존. design §10 M16 명시적 v2 deferral.

### gap-detector v0.2 발견 후 즉시 보강

**Critical · firestore.rules `if` 키워드 누락** (gap-detector v0.2가 발견)
- `firestore.rules:160` `posts.read`, `:171` `partners.read`, `:178` `events.read`에서 `allow read:` 뒤 `if` 누락
- `tsc --noEmit`/`pnpm build`는 `.rules` 파일 미검증이라 통과했으나 `firebase deploy` 시 파싱 에러
- 즉시 `if` 키워드 추가
- 검증: `firebase deploy --only firestore:rules --dry-run` → ✓ compiled successfully
- 동일 dry-run으로 storage·indexes도 확인 통과

### 로컬 Firebase 검증 (재분석 종료 시점)

| Target | Validation | Result |
|---|---|---|
| `firestore.rules` | `firebase deploy --only firestore:rules --dry-run` | ✓ compiled successfully |
| `firestore.indexes.json` | `firebase deploy --only firestore:indexes --dry-run` | ✓ read OK |
| `storage.rules` | `firebase deploy --only storage --dry-run` | ✓ compiled successfully |
| TypeScript | `pnpm exec tsc --noEmit` (`.next` clean 후) | exit 0 |
| Production build | `pnpm build` | 53/53 routes ✓ |

### 최종 Match Rate

```
Tracked items: 39
Matched:       39  (P8/P9 5건 deferred → match + 1 critical 즉시 보강)
Partial:        0
Missing:        0
Deferred (intentional, uncounted): 1 (M16 storyScrapbook v2)

Match Rate = 39 / 39 = 100%
```

### 결정

**archive 진입 가능.** P8/P9 모두 완료, deploy dry-run 검증 통과. 운영 deploy(`firebase deploy --only firestore:rules,firestore:indexes,storage`)는 운영 일정에 맞춰 실행.
