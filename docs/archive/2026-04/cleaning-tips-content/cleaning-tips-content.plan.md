# cleaning-tips-content · Plan (cycle #30 v1.17)

> Plan Plus 4-phase output. Brainstorming-enhanced PDCA planning.
> Generated: 2026-04-28
> Streak target: 10th consecutive single-pass ≥ 90%

---

## 0. Summary

청광 v1.17 cycle #30. **/community/tips 패널 자동 채우기 시스템**. 현재 patbel은 비어있음(0건) — partner-promo 글로만 community 피드 운영 중. tips는 운영진이 작성하는 청소 노하우 콘텐츠로, 검색 트래픽 + AI 답변 엔진 인용을 노린 evergreen content.

핵심 가치:
1. **/community/tips 빠르게 채움** — 신규 tips-generator로 카테고리×시즌×intent 매트릭스에서 자동 생성
2. **운영진 톤 + 광고 X** — partner-promo와 분리. universal cleaning know-how
3. **AEO/SEO 인프라 100% 재사용** — cycle #28 FAQPage·BreadcrumbList·Article @graph + 질문형 H2 + TL;DR
4. **Admin 검토 필수** — 모든 tip은 'draft'로 시작 → admin이 publish 토글 (R16)
5. **R15 cycle #19 generator 0줄 변경 10번째 검증** — 신규 tips-generator.ts 별도 작성

---

## 1. User Intent Discovery (Phase 1)

### Q1. Core Strategy
**선택**: A. AI 자동 생성 + admin 검토 지속 발행

이유: tip 패널을 빠르게 채우면서도 운영진 검토를 거쳐 신뢰도 확보. cycle #29 publishMode 'draft-only' 패턴과 일관성. AEO/FAQPage 자동 생성으로 검색 트래픽 노출 효과.

### Q2. Implementation Approach
**선택**: A. 신규 tips-generator (partner-promo와 분리)

이유: R1 cycle #19 generator 9-streak 보존 → 10번째 검증. tips 도메인 특화 (universal know-how, partner 무관). cycle #19 패턴 참고하되 별도 파일.

### Target Users
- **Primary**: 검색 엔진(Google/Naver) + AI 답변 엔진(Perplexity/ChatGPT/AI Overview) — 트래픽 유입
- **Secondary**: 청광 손님 (cleaning know-how 검색 → 청광 인지 → 견적 요청 funnel)
- **Tertiary**: 운영진 (admin) — draft 검토 → 점차 sample 누적 후 자동 publish 모드 도입 가능 (cycle #31+)

### Success Criteria
- AC1: Cloud Functions `tipsTick`이 매일 09:00 KST 실행되어 1건 draft 생성
- AC2: 모든 tip post는 publishStatus='draft' + postType='tip' + isAutoSeries=false로 저장
- AC3: tips-generator의 prompt에 cycle #28 AEO 패턴 (TL;DR + 질문형 H2 + ## 자주 묻는 질문) 포함
- AC4: RAG anti-drift — composeDraft prompt에 최근 20개 tip의 title 전달, 중복 회피
- AC5: photoless 모드 — coverImageUrl=null인 tip은 PostDetailView가 cover 영역 omit
- AC6: Admin /admin/tips dashboard — draft list + 카테고리/시즌 filter + stat 카드 4개
- AC7: Admin /admin/tips/generate — manual trigger form
- AC8: Admin이 publish 클릭 시 cycle #19 setPublishStatus 그대로 호출 (R13)
- AC9: scripts/check-queue-mirror.mjs에 tips-generator + topic-pool mirror 2 신규 check 추가
- AC10: cycle #19 partner-promo-generator 함수 시그니처 0 변경 (R15 10번째)

---

## 2. Alternatives Explored (Phase 2)

### Approach A — 신규 tips-generator (선택됨) ✅
- 새 `src/lib/llm/tips-generator.ts` — cycle #19 패턴 참고하되 독립
- Input: `{ topic, category, season?, intent?, recentTitles? }` — partner 무관
- AEO 인프라 100% 재사용 (cycle #28 prompt + JSON-LD)
- ~600 LOC
- **Pros**: R1 streak 보존, 도메인 분리 깔끔, 이중 generator 유지보수 가능
- **Cons**: 코드 중복 ~150 LOC (compose 보일러플레이트)

### Approach B — 기존 generator 일반화 (postType-aware)
- cycle #19 partner-promo-generator에 postType 인자 추가
- R1 streak 종료 (9사이클 무수정 record 깨짐)
- ~400 LOC
- **out of scope cycle #30**

### Approach C — Admin keyword 수동 입력 wrapper
- Cron 없음. Admin이 매번 keyword 입력 → 즉시 generate
- ~250 LOC. 운영 비용 높음
- **out of scope cycle #30** (manual trigger는 A2 add-on으로 포함됨)

---

## 3. YAGNI Review (Phase 3)

### In-scope (cycle #30)

**핵심 (자동 포함)**:
| ID | 항목 | LOC |
|---|---|---:|
| S1 | topic-pool.ts (~30 토픽 카테고리×시즌×intent 매트릭스) | 80 |
| S2 | tips-generator.ts (compose + hygiene + AEO 패턴) | 250 |
| S3 | functions tipsTick cron (매일 N건 draft 자동 생성) | 180 |
| S4 | /admin/tips dashboard (draft 검토 + publish 토글) | 200 |

**Add-ons (사용자 선택 — 모두 포함)**:
| ID | 항목 | LOC |
|---|---|---:|
| A1 | Photoless 모드 (커버 이미지 없는 tip 렌더 분기) | 120 |
| A2 | /admin/tips/generate manual trigger form + server action | 250 |
| A3 | RAG anti-drift (이전 tip 글 주제 중복 회피 prompt) | 80 |
| A4 | Stat 조회 (이번 달 N건 / draft / published / 실패율) | 80 |

**Tests + Mirror + Lint**:
| ID | 항목 | LOC |
|---|---|---:|
| T1 | tips-generator.test.ts (4 cases) | 100 |
| T2 | Mirror — functions 측 tips-generator + topic-pool | 330 |
| T3 | check-queue-mirror.mjs lint 2 신규 | 30 |
| T4 | firestore.indexes.json composite index 추가 | 10 |
| | **합계** | **~1,710** |

### Deferred to cycle #31+
- **publishMode 'auto' for trusted topics** — 일정 기간 ≥90% admin publish 통과율 도달 시 'auto' 전환
- **Tip 시리즈 grouping** — "에어컨 청소 시리즈 5부작" 같은 multi-part 콘텐츠
- **외부 SEO keyword research API 연동** — Google trends + Naver datalab으로 토픽 우선순위 결정
- **이미지 검색 통합** — Unsplash search API로 topic 기반 자동 이미지 매칭
- **Tips 카드뉴스 format 지원** — 현재 R18 blog only
- **Admin 글 본문 직접 편집 UI** — 현재는 publish 토글만, 본문 수정 X

### Permanent out-of-scope
- AI prompt에 footer 강제 (cycle #29 R14 — tip은 광고법 적용 X로 footer 미적용)
- partner-promo와 generator 통합 (R15 streak 보존)
- 손님이 tip 작성 (UGC 모델 — 청광 신뢰도 모델과 어긋남)

---

## 4. Architecture (Phase 4)

### 4.1 Topic 선정 흐름

```
Cron (매일 09:00 KST) 또는 Admin 수동 트리거
    ↓
src/lib/tips/topic-pool.ts에서 라운드 로빈 1건 선택
    + RAG anti-drift (최근 20 tip의 title과 중복 회피)
    + 시즌 필터 (현재 KST 월 → spring/summer/fall/winter)
    ↓ { topic, category, season?, intent? }
src/lib/llm/tips-generator.ts:composeDraft
    ↓ AI compose (Gemini 3 Flash, cycle #28 AEO 패턴)
hygiene check (cycle #19 hygiene-guard 재사용)
    ↓
postRepository.create({
  postType: 'tip',
  publishStatus: 'draft',  // 항상 draft (R16)
  providerId: 'cheonggwang-staff',
  providerOwnerUid: 'admin',
  companyName: '청광',
  title, summary80, bodyMarkdown,
  coverImageUrl: photoless ? null : pickStockImage(category),
  isAutoSeries: false,  // R17 — tip은 footer 미적용
  format: 'blog',  // R18 — card-news 미지원
})
```

### 4.2 Admin 검토 dashboard

```
/admin/tips page (수정):
  - tipRepository.getTipMonthlyStats() [aggregation]
    → stat 카드 4개 (이번 달 generated / drafted / published / hygiene fail)
  - tipRepository.listDrafts(limit=20)
    → Post[] 카드 그리드
  - 카테고리/시즌 필터 (in-memory)
  - 각 카드에 ▶️ "검토 후 publish" 버튼 (cycle #19 setPublishStatus 재사용 — R13)
```

### 4.3 Manual trigger (A2)

```
/admin/tips/generate (수정):
  Form fields: topic input + category dropdown + intent dropdown + photoless checkbox
    ↓ Submit
  server action triggerTipGeneration({ topic, category, intent, photoless })
    requireAdminApi()
    zod validation
    tips-generator.composeDraft (RAG anti-drift 미적용 — admin 의도적 입력)
    postRepository.create
    revalidatePath('/admin/tips')
    redirect /admin/tips?recent-generated=N
```

### 4.4 Photoless 분기 (A1)

```
PostDetailView (수정):
  if (post.coverImageUrl) {
    <Image src={post.coverImageUrl} ... />
  }
  // null이면 cover area 자체 조건부 omit

community/p/[slug]/page.tsx:
  og:image: post.coverImageUrl ?? `${base}/logo.png`  // fallback
```

### 4.5 RAG anti-drift (A3)

```
tips-generator.composeDraft({ recentTitles?: string[] }):
  if (recentTitles && recentTitles.length > 0) {
    promptBlock += `\n[최근 다룬 주제 — 중복 회피]\n${recentTitles.slice(0, 10).join('\n')}`
  }
  → AI가 같은 주제 재생산 회피
```

### 4.6 Stat aggregation (A4)

```
src/lib/firebase/tip-repository.ts (NEW):
  async getTipMonthlyStats(): Promise<TipStats> {
    const monthStart = firstDayOfMonth();
    const [generated, drafted, published, hygieneFailed] = await Promise.all([
      col().where('postType','==','tip').where('createdAt','>=', monthStart).count().get(),
      col().where('postType','==','tip').where('publishStatus','==','draft').count().get(),
      col().where('postType','==','tip').where('publishStatus','==','published').where('createdAt','>=', monthStart).count().get(),
      // hygieneFailed는 별도 tipHistory에서 조회 (post 생성 안 됐으니까)
    ]);
    return { generated, drafted, published, hygieneFailed };
  }
```

Firestore composite index 필요: (postType, publishStatus, createdAt DESC)

### 4.7 핵심 결정

- **R15 cycle #19 generator 0줄 변경 10번째** — 신규 tips-generator.ts 별도 작성 (R1 streak 보존)
- **R13 cycle #19 publish 토글 재사용** — admin draft → published 전환은 cycle #19 setPublishStatus 그대로
- **R16 (NEW) tip은 항상 'draft' 시작** — cycle #29 publishMode 'draft-only' 유사 의미. tip postType 자체가 'admin 검토 필수'이므로 옵션 없음
- **R17 (NEW) tip은 isAutoSeries=false** — R14 AI footer 미적용 (운영진 톤, 광고 X)
- **R18 (NEW) tip은 format='blog'만** — card-news 미지원 (cycle #30 scope)
- **Option A 코드 복제 5번째 사이클** — Cloud Functions ↔ Next.js mirror

---

## 5. Components / Files

### 5.1 신규 파일 (10개)
| 파일 | 역할 | LOC |
|---|---|---:|
| `src/lib/tips/topic-pool.ts` | ~30 토픽 (카테고리 × 시즌 × intent) | 80 |
| `src/lib/llm/tips-generator.ts` | composeDraft + hygiene + AEO 패턴 | 250 |
| `src/lib/llm/tips-generator.test.ts` | 4 cases | 100 |
| `src/lib/firebase/tip-repository.ts` | listRecentTipTitles + listDrafts + getTipMonthlyStats | 80 |
| `src/app/admin/tips/page.tsx` | dashboard — filter + stat + draft list | 200 |
| `src/app/admin/tips/generate/page.tsx` | manual trigger form (Next 16 async searchParams) | 150 |
| `src/app/actions/admin-tips-actions.ts` | triggerTipGeneration server action | 100 |
| `functions/src/tips/index.ts` | tipsTick scheduled function export | 30 |
| `functions/src/tips/runner.ts` | runTipsTick (RAG anti-drift + 라운드 로빈) | 150 |
| `functions/src/tips/lib/tips-generator.ts` | mirror | 250 |
| `functions/src/tips/lib/topic-pool.ts` | mirror | 80 |

### 5.2 수정 파일 (8개)
| 파일 | 변경 |
|---|---|
| `src/components/community/PostDetailView.tsx` | photoless 분기 (coverImageUrl null이면 cover area omit) |
| `src/components/community/CommunityCard.tsx` | photoless 카드 fallback |
| `src/app/community/p/[slug]/page.tsx` | og:image fallback `logo.png` |
| `functions/src/index.ts` | tipsTick export |
| `firebase.json` | tipsTick scheduled config 추가 |
| `firestore.indexes.json` | composite (postType, publishStatus, createdAt) |
| `scripts/check-queue-mirror.mjs` | tips-generator + topic-pool mirror 2 신규 |
| `package.json` | `pnpm test:tips` script 추가 |

### 5.3 CI lint 확장 (10 → 12)
```js
{
  title: "tips-generator AEO 패턴 (TL;DR + FAQ) 양 패키지",
  files: ["src/lib/llm/tips-generator.ts", "functions/src/tips/lib/tips-generator.ts"],
  test: (src) => /자주\s*묻는\s*질문/.test(src) && /TL;DR|첫\s*단락/.test(src),
},
{
  title: "topic-pool 양 패키지 동일 export",
  files: ["src/lib/tips/topic-pool.ts", "functions/src/tips/lib/topic-pool.ts"],
  test: (src) => /export const TIPS_TOPIC_POOL/.test(src),
},
```

---

## 6. Implementation Order (S1–S17)

```
S1. topic-pool.ts — ~30 토픽 정의 (카테고리 × 시즌 × intent)
S2. tip-repository.ts — listRecentTipTitles + listDrafts + getTipMonthlyStats
S3. tips-generator.ts (Next.js side) + 단위 테스트 4 cases
S4. functions/tips/lib/topic-pool.ts mirror
S5. functions/tips/lib/tips-generator.ts mirror
S6. functions/tips/runner.ts — runTipsTick (RAG anti-drift + 라운드 로빈)
S7. functions/tips/index.ts + functions/src/index.ts export
S8. firebase.json — tipsTick scheduled config
S9. admin-tips-actions.ts — triggerTipGeneration server action
S10. /admin/tips/page.tsx — dashboard (filter + stat + draft list)
S11. /admin/tips/generate/page.tsx — manual trigger form
S12. PostDetailView photoless 분기 + CommunityCard fallback
S13. community/p/[slug]/page.tsx — og:image fallback
S14. firestore.indexes.json composite index
S15. scripts/check-queue-mirror.mjs — 2 신규 stricter check
S16. firebase deploy --only firestore:indexes (composite 빌드)
S17. typecheck + build + tests + lint:mirror + functions deploy + 통합 검증
```

격리: S1·S2·S3·S9는 독립. S4-S5는 mirror 페어. S6-S8은 functions side. S10-S11은 admin UI. S12-S13은 photoless render.

---

## 7. Acceptance Criteria

위 §1.3 AC1~AC10 + 추가 invariants:
- **R15 (10번째) cycle #19 generator 무수정**
- **R13 cycle #19 publish 토글 재사용**
- **R16 tip 항상 draft 시작**
- **R17 tip isAutoSeries=false (R14 footer X)**
- **R18 tip format='blog'만**

---

## 8. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| AI가 같은 주제 반복 생산 | RAG anti-drift (A3) — 최근 20 tip 제외 prompt | M |
| Topic pool 30개 다 사용하면? | 라운드 로빈 + season filter로 1년 cycle. cycle #31+에서 pool 확장 | L |
| photoless 글 og:image 누락 → SNS 공유 깨짐 | logo.png fallback (A1) | L |
| Admin이 검토 안 하면 draft 누적 | cycle #29 헤더 빨간 배지 (already 적용) — admin 측 별도 빨간 배지 추가 (cycle #31+) | M |
| Stock 이미지 카테고리 매칭 부실 | category별 N개 photo 라운드 로빈 + admin이 manual generate 시 photo URL 입력 가능 | L |
| hygiene-guard가 tip 콘텐츠 거부 | 운영진 톤이라 partner-promo보다 hygiene 통과율 높을 것. fallback retry는 미적용 (간단화) | L |
| Cron 발화 partner-promo와 충돌 | 같은 09-18 KST 윈도우 + 다른 schedule 이름이라 분리됨 | L |

---

## 9. Test Plan

### 9.1 단위 테스트

#### tips-generator.test.ts (4 cases)
1. 정상 generate — { topic, category, intent } 입력 → { title, summary80, bodyMarkdown, coverImageAlt } 출력
2. RAG anti-drift — recentTitles 입력 시 prompt에 포함됨
3. hygiene-fail — 가짜 가격 단정 입력 → hygiene check 실패
4. photoless mode — coverImageAlt 옵셔널

### 9.2 통합 검증
- pnpm exec tsc --noEmit (Next.js + functions): exit 0
- pnpm exec next build: full prerender
- pnpm lint:mirror: 12/12 (cycle #29 10 + cycle #30 신규 2)
- 단위 테스트 모두 pass
- 시나리오: cron 발화 → /admin/tips 접근 → draft 1건 표시 → publish 토글 → /community/tips에 새 글 표시

### 9.3 회귀 보호
- cycle #29 단위 테스트 (61/61) 모두 유지
- partner-promo cron tick 정상 동작 유지 (R15 generator 0줄 변경)

---

## 10. Out of Scope

### Permanent
- AI prompt에 footer 강제 (R14 — tip은 광고 X)
- partner-promo와 generator 통합 (R15 streak 보존)
- 손님 UGC tip 작성

### Deferred to cycle #31+
- publishMode 'auto' for trusted topics (admin 통과율 ≥90% 시점 자동화)
- Tip 시리즈 grouping (multi-part 콘텐츠)
- 외부 SEO keyword research (Google trends + Naver datalab)
- 이미지 검색 통합 (Unsplash search API category 매칭)
- Tips 카드뉴스 format 지원 (R18 cycle #30 scope)
- Admin 글 본문 직접 편집 UI

---

## 11. Brainstorming Log

### Q1 (Strategy)
선택 A — AI 자동 생성 + admin 검토. 빠른 채움 + 신뢰도 확보 균형. cycle #29 publishMode 패턴 일관성.

### Q2 (Implementation)
선택 A — 신규 tips-generator. R1 streak 10번째 검증 + 도메인 분리 + AEO 인프라 100% 재사용.

### Q3 (Add-ons)
A1+A2+A3+A4 모두 선택. photoless + manual trigger + RAG anti-drift + stat 모두 in-scope. 운영 효율성 + 콘텐츠 품질 + admin UX 균형.

### 핵심 결정
- R15 cycle #19 generator 10번째 무수정 (별도 generator)
- R16 tip 항상 'draft' (admin 검토 필수)
- R17 tip isAutoSeries=false (R14 footer X — 광고법 미적용)
- R18 tip format='blog' (cycle #30 scope, card-news 미지원)
- Option A 코드 복제 5번째 사이클

---

## 12. Streak Context

cycles #21~#29 모두 ≥ 90% Match Rate (cycle #29 = 99% 역대 최고). cycle #30 = **10th attempt**.

large scope (~1,710 LOC, 18 files = 10 신규 + 8 수정) — 9-streak 가장 큰 cycle. surgical 변경 + cycle #29 publishMode 패턴 + cycle #28 AEO 인프라 + cycle #19 hygiene-guard 모두 재사용. 신규 generator는 cycle #19 패턴 미러 (compose + hygiene + sanitize).

10-streak 도전은 9-streak 통계적 검증 완료에 더해 **로직 새 도메인(tips) 적용 가능성** 추가 검증.

---

## 13. Next Step

```
/pdca design cleaning-tips-content
```

design-validator agent로 reality-check (실제 파일 grep + 인용). v0.1 → v0.2 iteration. 그 후 /pdca do로 Do phase.
