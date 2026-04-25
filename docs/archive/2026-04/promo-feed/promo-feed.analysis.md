# promo-feed — Design vs Implementation Gap Analysis

> **Feature**: promo-feed
> **Analysis Date**: 2026-04-20
> **Analyst**: bkit:gap-detector
> **Design**: [promo-feed.design.md](../02-design/features/promo-feed.design.md) (v0.2)
> **Plan**: [promo-feed.plan.md](../01-plan/features/promo-feed.plan.md)
> **Previous validation**: design-validator 88/100 (v0.1 → v0.2 fixes)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | **96%** | ✅ |
| Architecture Compliance (§12.1) | **100%** | ✅ |
| Convention Compliance (§13) | **100%** | ✅ |
| Scope Discipline (no §3.2 leakage) | **100%** | ✅ |
| **Overall Match Rate** | **97%** | ✅ Ready for Report |

**Verdict**: 3개 사이클 중 최고 매치율. 설계 구현 정합성·아키텍처·컨벤션 전부 우수. 5건 Minor 중 3건은 설계 문서가 구현에 맞춰 업데이트되어야 할 경우(구현이 더 나음), 1건은 cosmetic 중복, 1건(MIN-1)만 실제 행동 차이.

---

## 2. 12 Critical Constraints Verification

| # | 제약 | 결과 | 근거 |
|---|------|:-:|------|
| 1 | 🧹 Hygiene 3중 방어 | ✅ | (A) `TAG_SYSTEM` 금지 명시 `prompt-builder.ts:255` (B) `responseSchema.enum: TAG_ENUM(16)` `:270-279` (C) `sanitizeTags` 정규식 `tags.ts:54-67` |
| 2 | Next.js 16 패턴 | ✅ | async searchParams (`page.tsx:34`), `'use cache'+cacheTag+cacheLife` (`feed-service.ts:22-24`), `revalidateTag(tag,'max')` 5개소 |
| 3 | Cache tag 전략 (feed + page:{slug}) | ✅ | `feed-service.ts:23` feed · `page-service.ts:36` page:{slug}. 발행·발행취소·삭제·저장·섹션저장 5군데에서 둘 다 revalidate |
| 4 | I2 parseRegion 3-level | ✅ | `region.ts:84-89` — `DO_NAMES`로 도 분기, 경기/강원/충청/전라/경상/제주 정확 처리 |
| 5 | I3 search #strip + trim-first | ✅ | `search.ts:5` — 구현이 설계 스니펫보다 올바름 (MIN-3 참고) |
| 6 | I5 FEED_LIMIT=500 + console.warn | ✅ | `feed-service.ts:10, 34-38` |
| 7 | I6 solo rail `['#혼밥']`만 | ✅ | `rails.ts:74-78` |
| 8 | Within-row ranking 공식 | ✅ | `ranking.ts:48-53` matchCount×10 + freshness(7d+1) / `:63-67` diversity |
| 9 | LLM structured output w/ enum:TAG_ENUM(16) | ✅ | `prompt-builder.ts:267-280`, temperature 0.2 |
| 10 | Region 파싱 실패 시 null + 레일 제외 | ✅ | `region.ts:80,86,93` / `ranking.ts:15-19` |
| 11 | URL state sync (router.replace) | ⚠️ | `SearchInput`·`RegionSelect`는 준수, `CategoryTabs`는 `<Link>` 사용 → **MIN-1** |
| 12 | Auth-aware FeedHeader | ✅ | `page.tsx:49-63` async Server + `tryVerifySessionCookie` + authSlot 주입 |

11/12 완벽, 1/12 부분 준수 (navigation 정책 비일관).

---

## 3. Plan §3.1 MVP 12개 항목 Trace — **12/12 전부 구현**

| # | 항목 | 증거 |
|---|---|---|
| 1 | `/` 홈 → FeedPage | `src/app/page.tsx:34-47` |
| 2 | Rail + Card | `components/feed/{Rail,PostCard}.tsx` |
| 3 | 태그 16개 (5+6+5) | `domain/tags.ts:1-30` |
| 4 | `/api/generate` 태그 추출 | `generate-service.ts:141-161`, `route.ts:36-37` |
| 5 | Firestore `pages.tags` 저장 | `page-repository.ts:45, 111` |
| 6 | Region 파싱 | `domain/region.ts:76-94` |
| 7 | `pages.region` + composite index | `page-repository.ts:24-30, 46, 112`; `firestore.indexes.json:37-46` |
| 8 | 레일 7개 | `rails.ts:33-94` + `FeedRails.tsx:32-33` 시간대 필터링 |
| 9 | 지역 드롭다운 + 업종 탭 + 검색 바 | `{RegionSelect, CategoryTabs, SearchInput}.tsx` |
| 10 | 빈 레일 처리 | `EmptyFeed.tsx` + `FeedRails.tsx:28-30, 45-47` |
| 11 | 검색 300ms debounce | `SearchInput.tsx:6, 29-36` |
| 12 | Gemini 프롬프트 + 서버 필터 | 3중 방어 (위 #1 참고) |

---

## 4. Plan §3.2 Scope Leakage — **0건**

| Out-of-scope | 누출? |
|---|:-:|
| 브라우저 geolocation | ❌ |
| 태그 클릭 → 필터 페이지 | ❌ |
| 관리자 레일 관리 UI | ❌ |
| 태그 수동 편집 UI | ❌ |
| 인기순·조회수 | ❌ |
| `/p/{slug}` 블로그 톤 조정 | ❌ |
| 지도 기반 탐색 | ❌ |
| 댓글·좋아요 | ❌ |
| 카카오톡 알림 | ❌ |

깔끔.

---

## 5. Gaps by Severity

### 🔴 CRITICAL — 0
### 🟠 Major — 0

### 🟡 Minor — 5

| ID | 항목 | 위치 | 비고 |
|---|---|---|---|
| **MIN-1** | `CategoryTabs`가 `<Link>` 사용 (나머지는 `router.replace`) | `CategoryTabs.tsx:33-44` | 유일한 실 행동 드리프트. 네비 정책 통일 필요 |
| **MIN-2** | `FeedControls`가 Server(설계는 Client) | `FeedControls.tsx` | 구현이 Server shell + Client leaves로 **더 나음** — 설계 §5.5/§12.1 업데이트 |
| **MIN-3** | `normalizeSearchQuery` trim-first (설계 snippet과 순서 다름) | `search.ts:5` | I3 fix 의도 반영 — 설계 §15.1a 스니펫 업데이트 |
| **MIN-4** | `TAG_ENUM`이 `ALL_TAGS` 재복제 | `prompt-builder.ts:261-265` | `[...ALL_TAGS]`로 단일 소스화 가능 |
| **MIN-5** | `RegionSelect` 경기 분당구/판교 중복 value | `RegionSelect.tsx:18, 20` | 코스메틱 |

---

## 6. Architecture (§12.1) — 100% 준수

- 순수 도메인 (tags, region, 타입) — 외부 의존 0 ✓
- `server-only` sentinel: feedService, generateService, prompt-builder, repos, auth-admin ✓
- Presentation → Application → Domain ← Infrastructure 경로 위반 없음 ✓
- `matchesRail`/`rankRailPosts`는 순수 함수, 테스트 용이 ✓

## 7. Convention (§13) — 100% 준수

- 파일: kebab-case 유틸, PascalCase `.tsx` 컴포넌트 ✓
- 상수: UPPER_SNAKE (TAG_TIME, FEED_LIMIT, WEEK_MS, DEBOUNCE_MS 등 전부) ✓
- Import 순서: node → external → internal → type ✓
- URL query: lowercase, region pipe-delimited `서울특별시|강남구` ✓

---

## 8. Recommended Actions

### 즉시 (1줄 fix, 5분) — ✅ 분석 직후 적용 완료
1. ~~**MIN-4**~~: ✅ `TAG_ENUM = [...ALL_TAGS]`로 단일 소스화 (`prompt-builder.ts:262-264`)
2. ~~**MIN-5**~~: ✅ `경기 판교` 중복 제거, `경기 성남시 분당구`/`경기 용인시`로 재구성 (`RegionSelect.tsx:18-20`)

### 설계 문서 업데이트 (코드가 진실)
3. **MIN-2**: 설계 §5.5 table `FeedControls` row를 Server → "Server shell + Client leaves" 설명
4. **MIN-3**: 설계 §15.1a 스니펫 `raw.trim().replace(/^#+/, "")`로 반영

### v1.1 Follow-up
5. **MIN-1**: `CategoryTabs`도 `router.replace`로 통일 — 또는 정책 문서화

---

## 9. Verdict

**97% — `/pdca report promo-feed` 진입 가능.**

3사이클 매치율 추이:
| Feature | Match Rate | Critical | Major | Minor |
|---------|:-:|:-:|:-:|:-:|
| promo-page | 93% | 0 | 1 | 7 |
| content-research-pipeline | 96% | 0 | 0 | 9 |
| **promo-feed** | **97%** | **0** | **0** | **5** |

매 사이클마다 향상 — Plan Plus · design-validator · 이전 사이클의 학습 누적 효과.

pdca-iterator 불필요. MIN-1만 리포트 팔로우업으로 추적.
