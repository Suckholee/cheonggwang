---
template: plan-plus
version: 0.1
feature: provider-promo-content
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 청명 AI 홍보 콘텐츠 자동 생성 (provider-promo-content)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #16 (**v1.4 신규 track · 콘텐츠 마케팅**)
> 선행: booking (v1.3 #1 · Match 99% archived 대기)
> 다음: `/pdca design provider-promo-content`

---

## 1. User Intent Discovery

### 1.1 배경
v1.3 booking 완료로 **마켓 루프 종결** ("제출 → 응답 → 비교 → 수락 → 협의 → 일정 확정"). 이제 **수요 유입 확대**가 과제. 기존 홈/청명찾기는 견적 탐색 의도 고객만 캡처 · **탐색 이전 단계**(브랜드 인지 · 청소 정보 소비) 유입 채널 부재. BottomTabNav "커뮤니티" 탭은 placeholder 방치.

청명 입장에서는 자기 프로필에 priceBook/workCases 채웠어도 **마케팅 도구 없음** · 외부 블로그·SNS 운영은 부담.

→ **AI가 청명 데이터(priceBook · workCases · reviews · 트렌드)를 바탕으로 블로그 포스트를 자동 생성해 커뮤니티 피드에 게시**. 고객은 커뮤니티에서 포스트 읽다가 해당 청명에게 견적 요청.

### 1.2 핵심 목적 — 콘텐츠 마케팅 루프 (Q1)
**청명이 한 번 사전 정보만 세팅하면 AI가 블로그 포스트를 자동 작성 · 커뮤니티 피드에 게시**하여 고객 유입 확대.

- 생성 위치: `/provider/profile` 4번째 탭 "홍보"
- 배포 위치: `/community` (primary · 모든 고객) + `/providers/{id}` "새소식" 섹션 (secondary · 프로필 방문자)
- 전환: 포스트 상세 → 청명 프로필 or 견적 요청 CTA

### 1.3 포스트 형식 (Q1=A)
**블로그 long-form 1종만** — Gemini Flash 생성 · title + coverImage + bodyMarkdown + summary80
- 카드뉴스 · 비교 포스트는 v1.5b
- 이미지 생성 infrastructure (satori/Canva) 없음 · cover는 workCases.afterPhoto 또는 profileImage 재활용

### 1.4 사전 정보 스코프 (Q2=A)
**최소 2 필드만**:
- `brandTone`: "friendly" | "professional" | "playful" (3 선택)
- `slogan`: 1줄 max 40자

기존 providers 필드 90% 재활용 (companyName · description · regions · categories · priceBook · workCases · reviews)

### 1.5 생성 방식 (Phase 2=A)
**Server Action 내부 Gemini Flash direct call**:
- 청명이 "새 홍보 포스트 만들기" 클릭 → Server Action `createPromoPost`
- 내부에서 Gemini 2.5 Flash 호출 (10~30s 예상)
- 완료 → `posts.create` + `providers.lastPromoPostAt` update → client redirect
- **주 1회 제한** · 7일 cooldown

### 1.6 MVP 경계
- ✅ `posts/{postId}` 컬렉션 (providerId · title · bodyMarkdown · summary80 · coverImageUrl · slug · brandTone · topicHint · createdAt)
- ✅ `providers` 3 필드 추가 (brandTone · slogan · lastPromoPostAt)
- ✅ 2 Server Actions (updatePromoSettings · createPromoPost)
- ✅ Gemini 2.5 Flash client (`lib/gemini.ts` · content-research-pipeline copy)
- ✅ `promo-prompt.ts` builder (system + user · 청결 격리 원칙 하드코딩)
- ✅ `postRepository` (create · get · findBySlug · listRecent · listByProvider)
- ✅ `/provider/profile?tab=promo` 4번째 탭 (PromoTab · PromoSettingsForm · CreatePromoPostButton · MyPromoPostsList)
- ✅ `/community` placeholder 교체 (PostFeedGrid + PostFeedCard + CommunityEmptyState)
- ✅ `/community/{postId}` 상세 페이지 (PostDetailView markdown · PostProviderInfoCard · QuoteCTAButton)
- ✅ `/providers/{id}` reader에 NewsSection 추가
- ✅ Firestore rules (`posts.read:true · write:false`) + 2 indexes
- ✅ 7-day cooldown (lastPromoPostAt + INVALID_STATE)
- ✅ Gemini failure 시 lastPromoPostAt 미변경 (cooldown 소모 방지)
- ✅ Seed 확장 (청광 직영 샘플 포스트 3개)
- ❌ 카드뉴스 이미지 생성 (v1.5b)
- ❌ 댓글 · 좋아요 · 신고 (v2)
- ❌ 운영자 검수 승인 workflow (v2)
- ❌ 자동 주간 생성 (v2 · Firebase Scheduler)
- ❌ SNS 자동 배포 (v2+ · 인스타 Graph API · 카카오톡 채널)
- ❌ Rich text editor 수동 편집 (v1.5b)
- ❌ 포스트 삭제 · 수정 (v1.5b · admin)
- ❌ feed 필터/카테고리/검색 (v1.5b · archived promo-feed Netflix 레일 복원)
- ❌ 포스트 view count · analytics (v2+)
- ❌ 프로모션 할인 DB 분리 (v1.5b · priceBook 자동 추출은 Gemini prompt 안에서 수행)

### 1.7 성공 기준
- 청명이 사전 정보 2 필드 저장 후 1-click으로 포스트 생성 <60초
- Gemini 응답 품질: JSON schema 통과율 ≥95% · 청결 격리 원칙 준수
- 고객이 `/community` 진입 시 seed 3개 + 실 포스트 노출 · cold start 공백 없음
- 포스트 상세 → 견적 요청 CTA 1-click 전환
- 주 1회 제한 정확 (lastPromoPostAt + 7d)
- 15 cycles 연속 99%+ · 3 cycles 연속 100% 기록 유지

---

## 2. Alternatives Explored

### 2.1 UI 부착 위치 (Phase 0)
| # | 접근 | 결과 |
|---|------|------|
| 🅐 | `/providers/{id}` 내부 "새소식" 섹션 only | secondary 채택 |
| 🅑 | 홈 `/` 신규 섹션 | 기각 · 홈 이미 포화 (5 섹션) |
| 🅒 | `/community` 탭 활성화 (Netflix 피드) | **primary 채택** · placeholder 교체 · archived promo-feed 재활용 |
| 🅓 | `/received` 카드 확장 | 기각 · 공간 좁음 |
| 🅔 | `/search` 결과 카드 확장 | 기각 · UI 복잡도 |

### 2.2 포스트 형식 (Q1)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **블로그 long-form 1종** | **채택** · 이미지 파이프라인 없음 · SEO 친화 |
| B | 카드뉴스 only | 기각 · 이미지 생성 infra |
| C | 블로그 + 파생 카드뉴스 2장 | 기각 · v1.5b |
| D | 카드뉴스 5장만 | 기각 · 본문 깊이 부족 |

### 2.3 사전 정보 스코프 (Q2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **최소 brandTone + slogan** | **채택** · 기존 필드 90% 재활용 |
| B | + 이달의 프로모션 + 타겟 고객 | 기각 · Gemini가 priceBook 자동 참조 |
| C | + 금지 키워드 + 샘플 문장 | 기각 · 시스템 프롬프트 하드코딩 |

### 2.4 생성 파이프라인 (Phase 2)
| # | 접근 | 결과 |
|---|------|------|
| **A** | **Server Action direct Gemini Flash** | **채택** · 단순 · content-research-pipeline 재활용 |
| B | Firebase Function async + polling | 기각 · 복잡 · emulator 필요 |
| C | Streaming SSE | 기각 · infra 복잡 · v1 YAGNI |

### 2.5 빈도 제한
| # | 접근 | 결과 |
|---|------|------|
| **v1 주 1회** | **채택** · 스팸 방지 + 운영 안전 |
| 제한 없음 | 기각 · 스팸 위험 |
| v2 자동 주간 | 분리 |

### 2.6 상호작용 (댓글/좋아요)
| # | 접근 | 결과 |
|---|------|------|
| **v1 읽기 only** | **채택** · 모더레이션 복잡도 회피 |
| v1 좋아요만 | 기각 · UX 가치 낮음 (작성자 피드백 약함) |
| v1 full | 기각 · 운영 부담 |

---

## 3. YAGNI Review — 권장 22개 확정

### 3.1 v1 MVP 포함 (22개)

**데이터 모델**
| # | 항목 |
|---|------|
| C1 | `posts/{postId}` 컬렉션 |
| C2 | post 필드 full denorm |
| C3 | `providers` 3 필드 추가 (brandTone · slogan · lastPromoPostAt) |
| C4 | Firestore rules posts (read:true · write:false) |
| C5 | Firestore indexes 2개 (createdAt DESC · providerId+createdAt) |

**Server Actions / Infra**
| # | 항목 |
|---|------|
| C6 | `updatePromoSettings` Server Action |
| C7 | `createPromoPost` Server Action (Gemini + cooldown) |
| C8 | 7일 cooldown check (lastPromoPostAt) |
| C9 | `promo-prompt.ts` builder (system + user · JSON schema) |
| C10 | `postRepository` 5 메서드 |
| C11 | `lib/gemini.ts` (content-research-pipeline copy · TS 변환) |

**청명 UI (생성)**
| # | 항목 |
|---|------|
| C12 | `/provider/profile` 4번째 탭 "홍보" (EditorTabKey 확장) |
| C13 | `PromoSettingsForm` (brandTone select · slogan input) |
| C14 | `CreatePromoPostButton` (cooldown display · Gemini 호출) |
| C15 | `MyPromoPostsList` (최신 3 포스트 Link) |

**고객 UI (소비)**
| # | 항목 |
|---|------|
| C16 | `/community/page.tsx` placeholder → feed shell |
| C17 | `PostFeedCard` (Client Link) |
| C18 | `CommunityEmptyState` |
| C19 | `/community/[postId]/page.tsx` 상세 |
| C20 | `/providers/{id}` reader에 `NewsSection` (3건) |

**Seed · misc**
| # | 항목 |
|---|------|
| C21 | seed-first-provider.mjs 샘플 포스트 3개 (청광 직영) |
| C22 | proxy.ts `/community/*` matcher 추가 **안 함** (public) |

### 3.2 Out of Scope → v1.5b+ / v2+

| 항목 | 이동 이유 |
|------|----------|
| 카드뉴스 이미지 생성 | v1.5b (satori/Canva infra) |
| 댓글 · 좋아요 · 신고 | v2 · 모더레이션 복잡 |
| 운영자 검수 승인 | v2 |
| 자동 주간 생성 Scheduler | v2 |
| SNS 자동 배포 (인스타 · 카톡) | v2+ · Graph API |
| Rich text 수동 편집 | v1.5b |
| 포스트 삭제/수정 | v1.5b admin |
| feed 필터/검색 · Netflix 레일 | v1.5b (archived promo-feed 복원) |
| view count · analytics | v2+ |
| 프로모션 DB 분리 | v1.5b (Gemini가 priceBook에서 자동 추출) |

---

## 4. Architecture Sketch (Phase 4.1 승인)

### 4.1 createPromoPost Flow (Gemini direct · 30~50s)
```
Zod → resolveProviderId → providerRepository.get
  → brandTone/slogan 존재 + cooldown check
  → 병렬 fetch (workCases 3 · reviews 1 · trendKeywords optional)
  → buildPromoPrompt (system + user)
  → callGeminiFlash (JSON schema 강제)
  → geminiPostOutputSchema.parse
  → coverImageUrl 결정 (workCase.after → profileImage → null)
  → slug = titleToSlug + id suffix
TX:
  tx.create(posts/{newId}, {...denorm})
  tx.update(providers/{id}, {lastPromoPostAt: serverTS})
revalidatePath('/community') + revalidatePath(`/providers/${id}`)
return {postId, slug}
```

Gemini 실패 시 `lastPromoPostAt` 미변경 → cooldown 소모 방지.

### 4.2 /community feed
```
Server shell:
  postRepository.listRecent(50) · orderBy createdAt DESC
  → PostFeedGrid posts={posts}
    (posts.length === 0 → CommunityEmptyState)
```

### 4.3 /community/{postId}
```
Server shell:
  post = postRepository.get(postId) · not found → notFound()
  provider = providerRepository.get(post.providerId)
  → PostDetailView · PostProviderInfoCard · QuoteCTAButton
  Link: /quote/new?cat={categories[0]}&providerId={providerId}
```

### 4.4 /providers/{id} 확장
```
기존 fetch + posts = postRepository.listByProvider(id, 3)
  → 기존 섹션 + NewsSection posts={posts}
  (posts.length === 0 → null 반환)
```

---

## 5. Component Tree (Phase 4.2 승인)

```
src/
├── types/post.ts                               🆕 Post + BrandTone + DTOs
├── types/provider.ts                           🔄 3 필드 추가
│
├── domain/
│   ├── promo-schemas.ts                        🆕 Zod (updatePromoSettings · createPromoPost · geminiPostOutput)
│   └── promo-prompt.ts                         🆕 buildPromoPrompt
│
├── lib/
│   ├── gemini.ts                               🆕 Gemini Flash client (copy from functions/)
│   ├── slug.ts                                 🆕 titleToSlug
│   └── markdown.ts                             🆕 renderMarkdown (server-only · sanitize)
│
├── lib/firebase/
│   ├── post-repository.ts                      🆕 5 methods
│   └── provider-repository.ts                  🔄 toProvider 3 필드 매핑
│
├── app/actions/
│   └── promo-actions.ts                        🆕 updatePromoSettings · createPromoPost
│
├── app/community/
│   ├── page.tsx                                🔄 placeholder → feed shell
│   └── [postId]/page.tsx                       🆕 상세
│
├── components/community/                        🆕 6 components
│   ├── PostFeedGrid.tsx                        Server · 2-col grid
│   ├── PostFeedCard.tsx                        Client · Link
│   ├── CommunityEmptyState.tsx                 Client
│   ├── PostDetailView.tsx                      Server · markdown
│   ├── PostProviderInfoCard.tsx                Server
│   └── QuoteCTAButton.tsx                      Client
│
├── components/provider-profile/
│   └── NewsSection.tsx                         🆕 Server · 3 포스트 카드
│
├── components/provider-profile-editor/
│   ├── PromoTab.tsx                            🆕 Client
│   ├── PromoSettingsForm.tsx                   🆕 Client
│   ├── CreatePromoPostButton.tsx               🆕 Client
│   ├── MyPromoPostsList.tsx                    🆕 Server
│   └── ProfileEditorTabs.tsx                   🔄 "홍보" 탭 추가
│
├── app/provider/profile/page.tsx               🔄 tab=promo 분기
├── app/providers/[providerId]/page.tsx         🔄 NewsSection fetch
│
├── firestore.rules                             🔄 posts rules
├── firestore.indexes.json                      🔄 2 indexes
└── scripts/seed-first-provider.mjs             🔄 seed 포스트 3개
```

**17 신규 파일 + 5 기존 수정 + 3 infra + seed** · **Server 9 / Client 8**

---

## 6. Data Flow (Phase 4.3 승인)

7 flows 명세:
1. updatePromoSettings (사전 정보 저장)
2. createPromoPost (핵심 · 30-50s · TX + Gemini)
3. /community feed (Server fetch + grid)
4. /community/{postId} 상세 (Server + markdown render)
5. /providers/{id} 확장 (+ NewsSection)
6. 사전 정보 없는 상태 → disable + INVALID_STATE
7. Gemini 실패 처리 (cooldown 미소모 · error 표시)

---

## 7. Firestore Rules / Indexes

### 7.1 Rules (신규)
```javascript
match /posts/{postId} {
  allow read: if true;      // public feed
  allow write: if false;    // Admin SDK only
}
```

### 7.2 Indexes (신규 2개)
```json
{ "collectionGroup": "posts", "fields": [
  {"fieldPath": "createdAt", "order": "DESCENDING"}
]},
{ "collectionGroup": "posts", "fields": [
  {"fieldPath": "providerId", "order": "ASCENDING"},
  {"fieldPath": "createdAt", "order": "DESCENDING"}
]}
```

### 7.3 proxy.ts
- `/community/*` matcher **추가 안 함** · public route

---

## 8. Open Questions (Design 단계 해소)

| Q | 질문 | 예상 해소 |
|---|------|---------|
| Q1 | Gemini model 선택 (2.5 Flash · Flash-Lite · Pro) | Flash (default) · 비용·속도·품질 balanced · content-research-pipeline 패턴 동일 |
| Q2 | Gemini JSON schema 강제 구조 | `response_mime_type: application/json` + `response_schema` 전달 · `@google/genai` 지원 확인 |
| Q3 | Markdown sanitize 방식 | `marked` + `dompurify/isomorphic-dompurify` · content-research-pipeline에 이미 사용 중이면 그대로 재활용 |
| Q4 | slug collision | `${titleSlug}-${postId.slice(0,6)}` · Firestore auto ID 6 char suffix로 충돌 방지 |
| Q5 | `renderMarkdown` XSS 방어 | 허용 태그 whitelist (h2/h3/p/ul/ol/li/strong/em/a) · href는 same-origin only |
| Q6 | coverImageUrl null 때 feed 카드 렌더 | 이니셜 gradient fallback (기존 initialGradientClass 재활용) |
| Q7 | Zod `geminiPostOutput.summary80` range | min(10) max(120) · 80±20 허용 (Gemini 엄밀 제약 어려움) |
| Q8 | 청결 격리 원칙 system prompt 문구 | archived promo-page 프롬프트 재활용 · 3중 방어 그대로 |
| Q9 | 주 1회 쿨다운 UI 표시 방식 | "다음 생성 가능: 4/28 (화)" 포맷 · formatScheduledLabel 재활용 |
| Q10 | 청명이 brandTone만 저장하고 slogan 안 저장 시 | Zod에서 둘 다 required · 부분 저장 불가 · v1 단순 |
| Q11 | seed 청광 직영 포스트 3개 content | seed 스크립트 내부 하드코딩 markdown 3종 (입주청소 가이드 · 에어컨 청소 시즌 · 단골 후기 모음) |
| Q12 | /community feed 50 posts 정렬 seed 포함 | seed createdAt은 과거 시각 (daysAgo 10/20/30) · 실 포스트보다 하단 배치 |
| Q13 | /community/{postId} SEO (metadata) | generateMetadata · title + og:image (coverImageUrl) |
| Q14 | ProfileEditorTabs에 "홍보" 추가 시 기존 validTabs 배열 업데이트 | `parseTab` 확장 · EditorTabKey 4종으로 |

---

## 9. Implementation Order (예상 Do 단계 · 12 steps)

1. **types/post.ts** + **types/provider.ts 확장** + **firestore.rules** + **firestore.indexes.json** · `firebase deploy`
2. **domain/promo-schemas.ts** + **domain/promo-prompt.ts**
3. **lib/gemini.ts** (content-research-pipeline copy + TS 변환) + **lib/slug.ts** + **lib/markdown.ts**
4. **lib/firebase/post-repository.ts** + **provider-repository.ts toProvider 확장**
5. **app/actions/promo-actions.ts** (updatePromoSettings · createPromoPost)
6. **components/community/** 6 컴포넌트 (Card · Grid · Empty · Detail · Info · CTA)
7. **app/community/page.tsx** 교체 + **app/community/[postId]/page.tsx** 신규
8. **components/provider-profile/NewsSection.tsx** + **app/providers/[providerId]/page.tsx** 확장
9. **components/provider-profile-editor/PromoTab.tsx** + 하위 3 컴포넌트
10. **ProfileEditorTabs.tsx** "홍보" 탭 추가 + **app/provider/profile/page.tsx** tab=promo 분기
11. **scripts/seed-first-provider.mjs** 샘플 포스트 3개 확장 + seed 실행
12. pre-flight + smoke test (설정 저장 · 포스트 생성 · 피드 조회 · 상세 · 쿨다운)

---

## 10. Brainstorming Log

| Phase | 결정 |
|-------|------|
| Phase 0 | 마켓 루프 종결 후 수요 유입 확대 · archived promo-feed/pipeline 자산 재활용 |
| UI 위치 | 🅒 커뮤니티 primary + 🅐 프로필 secondary |
| Phase 1 Q1 | A = 블로그 long-form only (이미지 파이프라인 없음) |
| Phase 1 Q2 | A = 최소 (brandTone + slogan) · 기존 필드 90% 재활용 |
| Phase 2 | A = Server Action direct Gemini Flash |
| Phase 2 | 주 1회 쿨다운 · 읽기 only (댓글/좋아요 v2) |
| Phase 3 | 권장 22 MVP 확정 · out-of-scope 10개 |
| Phase 4.1 | createPromoPost flow + feed + 상세 + 프로필 확장 + 실패 시 쿨다운 미소모 |
| Phase 4.2 | 17 신규 + 5 수정 + 3 infra · Server 9/Client 8 · prompt schema 확정 |
| Phase 4.3 | 7 flows · rules + 2 indexes · proxy 불변 · Test Plan 22건 |

---

## 11. Next Steps

- [ ] `/pdca design provider-promo-content` — Design 문서 (Open Q 14건 해소 + Test Plan 확장)
- [ ] design-validator 호출
- [ ] `/pdca do provider-promo-content` — 12-step 구현
- [ ] `/pdca analyze provider-promo-content` — Gap detection (≥99%)
- [ ] `/pdca report + archive provider-promo-content` · v1.4 track 첫 feature

---

## 12. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. Phase 0-4 완료. 22 MVP · out-of-scope 10 · 14 Open Questions · 12-step implementation order. Approach: 블로그 1종 · Gemini 2.5 Flash Server Action direct · 주 1회 쿨다운 · 읽기 only · 🅒 커뮤니티 primary + 🅐 프로필 secondary · 사전 정보 2 필드 (brandTone·slogan) · 기존 providers 필드 90% 재활용 · Gemini 실패 시 쿨다운 미소모 · posts rules + 2 indexes · content-research-pipeline `lib/gemini.ts` · promo-page prompt 청결 격리 원칙 재활용 | Seokho Lee |
