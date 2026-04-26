# Plan · partner-rag-system

> **Status**: Draft v1.0 (Plan Plus completed)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.11
> **Author**: Seokho Lee
> **Date**: 2026-04-26
> **PDCA Cycle**: #24
> **Method**: Plan Plus (Phases 0-5 completed)

---

## 1. Summary

### 1.1 한 줄 요약
파트너(매장 운영자)가 자기 매장 RAG 자료(매장 정보·영구 사진)를 입력하면 AI 홍보글이 매장 톤에 맞춰 생성되고, admin은 검토 큐와 업종별 컨텐츠 템플릿 라이브러리로 RAG 시스템을 거버넌스한다.

### 1.2 배경
- **cycle #19 partner-promo**: AI 파이프라인 (Gemini Vision + RAG + hygiene-guard). 단 RAG 소스는 "다른 글" anti-drift만 — 매장 자체 정보는 없음.
- **cycle #21·#22·#23**: 파트너 가입·발급·등록 흐름 완성. 그러나 발급된 파트너가 매장 정보를 추가 입력할 곳 없음.
- **사용자 요구** (2026-04-26): 매장 RAG 자료를 어디에 두고, admin은 어떻게 거버넌스할지 명확화 필요. + admin이 업종별 컨텐츠 템플릿 라이브러리도 보유.

### 1.3 목표
1. 사장님이 자기 매장 RAG 자료(설명·강점·메뉴·영구 사진)를 입력
2. 자동 hygiene-guard 1차로 즉시 사용 가능 (admin 부담 ↓)
3. admin이 검토 큐·풀 편집권·매장 단위 정지·신고 처리로 거버넌스
4. admin이 업종별 컨텐츠 템플릿(블로그·카드뉴스) 라이브러리 보유 → AI 글 생성에 활용
5. 글 발행 시 RAG context 3단 통합 (profile + templates + cycle #19 anti-drift)
6. ragSourceIds 스냅샷으로 감사 추적

### 1.4 비목표
- PDF·MD 첨부 문서 (v2 OOS — 텍스트 + 사진만)
- 풀 텍스트 snapshot (ragSourceIds 메타만)
- 자율 등록·사후 신고 only (자동 1차 + admin 큐 패턴 유지)
- cycle #19 generator/composeDraft 진입점 변경 (회귀 위험 최소화)

---

## 2. User Intent Discovery (Phase 1)

### 2.1 Core Purpose
**매장 RAG 자료로 AI 글의 일관성·정확도·차별화 향상 + admin 거버넌스**

> 사용자 발화: "의뢰업체의 rag 문서와 사진들은 어디에 배치되는게 맞을까?"  
> "admin에서는 어떻게 연결되고 관리되게끔 하는게 좋을까?"  
> "admin에서는 의뢰업체가 템플릿으로 사용할만한 업종별 블로그글 및 카드뉴스 컨텐츠에 대한 템플릿을 연구해서 보유하고 있어야 함"

### 2.2 Target Users
- **사장님 (파트너)**: `/partner/profile` 매장 RAG 자료 입력
- **admin (운영자)**: `/admin/rag-review` 검토 큐 + `/admin/content-templates` 라이브러리 + `/admin/partners/{id}` 풀 권한
- **AI 파이프라인**: 글 생성 시 RAG context 3단 통합

### 2.3 Q1·Q2·Q3 답변 (사용자 결정)
| Q | 결정 |
|---|---|
| Q1 RAG 자료 형식 | **텍스트 + 영구 매장 사진** (PDF·MD 첨부 v2) |
| Q2 검토 정책 | **자동 1차 + admin 큐 실패만** |
| Q3 Snapshot 정책 | **ragSourceIds + summary 스냅샷** |

### 2.4 Success Criteria
| ID | 기준 | 측정 |
|---|---|---|
| SC1 | 사장님이 한 번 RAG 자료 입력하면 후속 글에 자동 반영 | profile.version bump → 다음 발행 글의 ragSourceIds에 포함 |
| SC2 | 자동 hygiene-guard 1차 통과 시 admin 큐 미발생 | admin 큐 등록률 ≤ 30% (production 추적) |
| SC3 | admin이 부적절 자료 사후 회수 가능 | profile.status='rejected' 갱신 시 미래 글에 반영 안 함 |
| SC4 | 글 발행 시 ragSourceIds 스냅샷으로 추적 가능 | posts.generationMeta.ragSourceIds 검증 |
| SC5 | cycle #19 generator/composeDraft 진입점 코드 변경 0건 | git diff 검증 |
| SC6 | admin 컨텐츠 템플릿이 generator prompt에 포함됨 | 시드 템플릿 1건으로 통합 검증 |

---

## 3. Alternatives Explored (Phase 2)

### Approach A — 부분 통합 ✅ **Selected**
- `partners.profile` nested + cycle #19 prompt에 `getRagContext` 1단 추가
- **Pros**: 변경 영역 좁음, cycle #19 자산 보존, 회귀 위험 ↓
- **Cons**: 매장당 ragDocs 늘면 partners doc 비대 (v2 분리 검토)

### Approach B — 전면 통합
- partner-rag 신규 모듈 + generator·hygiene-guard 재설계
- **Pros**: 깔끔한 RAG abstraction, 미래 확장성
- **Cons**: 변경 범위 ↑↑, cycle #19 회귀 위험

### Approach C — Subcollection 분리
- `partners/{id}/ragDocs/{docId}` subcollection
- **Pros**: 매장당 ragDocs 무한 확장, doc 크기 통제
- **Cons**: 쿼리 추가, server-side join 필요

**선택 이유**: Approach A — v1 회원 수·자료 수 가정상 nested로 충분. cycle #19 RAG 자산 100% 보존.

---

## 4. YAGNI Review (Phase 3)

### 4.1 In-Scope (v1)

#### Profile 필드 (사용자 multiSelect 전부 선택)
- F1 **description** (필수, 매장 자세 소개)
- F2 **usps[]** (강점·차별점 키워드)
- F3 **priceItems[]** ({name, price} 메뉴·가격)
- F4 **photoUrls[]** (영구 매장 사진 1~10장)
- F5 **industry** (cafe·restaurant·hair-salon·academy·office·pet-clinic·optical 등 enum)
- F6 **ragHistory** subcollection (audit log, append-only)

#### admin 거버넌스 (사용자 multiSelect 전부 선택)
- F7 **`/admin/rag-review` 큐** (자동 hygiene 실패 자료)
- F8 **매장 단위 RAG 일시 정지** (`profile.suspended` boolean)
- F9 **`/admin` 대시보드 '검토 대기 RAG' 카드** (StatsWidgets 8번째)
- F10 **AdminBottomBar 'RAG 검토' 6번째 탭** (빨간 카운트 뱃지)
- F11 **사후 신고 처리** (다른 사용자 → admin 처리, 신고 폼 + 모달)

#### admin 컨텐츠 템플릿 (사용자 추가 요구)
- F12 **contentTemplates 컬렉션** (admin curated 업종별)
- F13 **`/admin/content-templates` 라이브러리** (블로그·카드뉴스 type 분류, industry 분류, 검색·필터)
- F14 **scripts/seed-content-templates.mjs** (업종별 starter 5-10건 시드)

#### LLM·API 통합
- F15 **`getRagContext(partnerId)` 신규** — profile + templates + cycle #19 통합
- F16 **`buildComposePrompt`에 RAG context 1단 추가** (cycle #19 진입점은 그대로)
- F17 **`posts.generationMeta.ragSourceIds[]`** 스냅샷
- F18 **profile.suspended → RAG 미사용 fallback** (cycle #19 RAG 실패 시 fallback compose 흐름 재사용)

#### 사장님 UI
- F19 **`/partner/profile` 페이지** (requirePartnerPage 가드)
- F20 **PartnerProfileForm** (description·usps·priceItems·photoUrls·industry)
- F21 **PartnerProfilePhotoUpload** (Storage 직접 업로드 + URL list 관리)

### 4.2 Out of Scope (v2+)

| ID | 항목 | 사유 |
|---|---|---|
| O1 | PDF·MD 첨부 문서 | pdf-parse 의존성, 광고법·저작권 검열 부담 ↑↑. v2 |
| O2 | 풀 텍스트 snapshot | ragSourceIds로 추적 충분, doc 크기 부담 회피 |
| O3 | 자율 등록·신고 only | 자동+admin 큐 패턴 유지 (Q2 결정) |
| O4 | RAG context retrieval 가중치 튜닝 | v1은 단순 list, v2에 score-based ranking |
| O5 | profile 변경 시 과거 글 재생성 | snapshot이 일관성 보장, 재생성 v2 |
| O6 | 다국어 RAG | ko-KR 단일 |
| O7 | 사장님이 contentTemplates 직접 변경 | admin only (운영 통제 유지) |

---

## 5. Architecture & Components (Phase 4)

### 5.1 데이터 모델

#### `partners/{partnerId}` (cycle #19 확장)
```ts
interface Partner {
  // ... cycle #19 필드 (id, ownerUid, businessName, category, regionLabel, status, autoPublish, ...)
  profile?: PartnerProfile; // v1.11 신규
}

interface PartnerProfile {
  description: string;          // 매장 자세 소개 (max 2000자)
  usps: string[];               // 강점 키워드 (max 10개, 각 50자)
  priceItems: PriceItem[];      // 메뉴·가격 (max 30건)
  photoUrls: string[];          // 영구 매장 사진 (max 10장)
  industry: PartnerIndustry;    // enum
  status: 'auto-approved' | 'approved' | 'pending-review' | 'rejected';
  suspended: boolean;           // 매장 단위 RAG 정지 (admin)
  hygieneScore: number;         // 자동 hygiene 1차 점수
  version: number;              // 변경 시 increment (snapshot용)
  updatedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectReason?: string;
}

interface PriceItem { name: string; price: number; }
type PartnerIndustry =
  | 'cafe' | 'restaurant' | 'hair-salon' | 'academy' | 'office'
  | 'pet-clinic' | 'optical' | 'bakery' | 'other';
```

#### `partners/{id}/ragHistory/{eventId}` subcollection (audit, append-only)
```ts
interface RagHistoryEvent {
  type: 'profile-updated' | 'reviewed' | 'suspended' | 'reported';
  actor: 'partner' | 'admin' | 'reporter';
  actorUid?: string;
  payload: Record<string, unknown>; // 변경 diff 또는 사유
  at: Date;
}
```

#### `contentTemplates/{templateId}` 컬렉션 (admin curated)
```ts
interface ContentTemplate {
  id: string;
  type: 'blog' | 'card-news';
  industry: PartnerIndustry;    // 매장 업종 매칭
  title: string;                 // 템플릿 제목 (admin 식별용)
  body: string;                  // 템플릿 본문 (RAG context로 사용)
  tags: string[];                // 'opening', 'seasonal', 'review-event' 등
  scenarios: string[];           // 사용 시나리오 설명
  createdBy: string;             // admin 식별자
  createdAt: Date;
  updatedAt: Date;
}
```

#### `posts.generationMeta` 확장 (cycle #19)
```ts
generationMeta: {
  hygieneScore: number;
  ragSourceIds: string[];  // v1.11 신규: ['profile/{partnerId}@v{N}', 'template/{tid}', 'post/{otherId}']
  // ... cycle #19 기존 필드
}
```

### 5.2 신규 파일 (≈18)

| 카테고리 | 파일 |
|---|---|
| Types | `src/types/partner-profile.ts`, `src/types/content-template.ts` |
| Domain | `src/domain/partner-industry.ts`, `partner-profile-schema.ts`, `content-template-schema.ts` |
| Repository | `src/lib/firebase/partner-profile-repository.ts`, `content-template-repository.ts` |
| Server Actions | `src/app/actions/partner-profile-actions.ts`, `content-template-actions.ts` |
| LLM | `src/lib/llm/partner-rag-context.ts` (getRagContext) |
| 사장님 UI | `src/app/partner/profile/page.tsx`, `components/partner/PartnerProfileForm.tsx`, `PartnerProfilePhotoUpload.tsx` |
| admin UI | `src/app/admin/rag-review/page.tsx`, `RagReviewList`, `RagReviewItem`, `src/app/admin/content-templates/page.tsx`, `ContentTemplateList`, `ContentTemplateEditor`, `components/admin/PartnerProfileEditor.tsx` |
| 시드 | `scripts/seed-content-templates.mjs` |

### 5.3 수정 파일 (≈8)

| 파일 | 변경 |
|---|---|
| `src/types/partner.ts` | Partner.profile field 추가 |
| `src/types/post.ts` | generationMeta.ragSourceIds 필드 |
| `src/lib/llm/partner-promo-generator.ts` | buildComposePrompt에 getRagContext 통합 (진입점은 그대로) |
| `src/components/admin/AdminBottomBar.tsx` | 6번째 'RAG 검토' 탭 + 빨간 뱃지 |
| `src/components/admin/AdminNav.tsx` | '템플릿' 메뉴 추가 |
| `src/lib/admin/stats.ts` | pendingRagReviewCount + AdminStats 확장 |
| `src/components/admin/StatsWidgets.tsx` | 8번째 카드 '검토 대기 RAG' |
| `src/app/admin/partners/[partnerId]/page.tsx` | profile/RAG 섹션 통합 |

### 5.4 인프라

| 자산 | 변경 |
|---|---|
| `firestore.rules` | partners.profile 권한 (owner write·admin write) + contentTemplates (Admin SDK only write) + ragHistory (admin only) |
| `firestore.indexes.json` | `contentTemplates (industry asc, type asc)` 신규 |
| `storage.rules` | `/partners/{uid}/profile/{img}` (owner write·all read) + `/partners/{uid}/rag/{file}` (owner write·admin read) 신규 |
| 환경 변수 | 추가 없음 |
| 의존성 | 추가 없음 (lucide-react·zod·firebase-admin 그대로) |

---

## 6. Data Flow (Phase 4-3)

### 6.1 사장님 RAG 입력
1. `/partner/profile` 진입 → requirePartnerPage 가드
2. PartnerProfileForm 입력 (description·usps·priceItems·industry)
3. PartnerProfilePhotoUpload — Storage `/partners/{uid}/profile/{img}` 직접 업로드
4. server action `savePartnerProfile(input)`:
   - requirePartnerApi
   - zod 검증 + Storage path 유효성
   - 자동 hygiene-guard 1차 (cycle #19 재사용, 텍스트 통합 score)
   - status 결정: ≥0.7 'auto-approved' / <0.7 'pending-review'
   - partners.profile update + version++
   - ragHistory append (type='profile-updated', actor='partner')
5. UI 응답 표시

### 6.2 admin 거버넌스
- `/admin/content-templates` — saveContentTemplate (admin CRUD)
- `/admin/rag-review` — listPendingRagReviews + reviewPartnerRag (status·reason)
- `/admin/partners/{id}` — togglePartnerRagSuspended + 강제 편집권
- 신고 처리 — reportPartnerRag(partnerId, reason, link)

### 6.3 글 발행 시 RAG context 3단
1. `/partner/posts/new` (cycle #19 그대로)
2. `POST /api/partner/posts` → `composeDraft` 호출
3. `buildComposePrompt` 내부에서 `getRagContext(partnerId)` 신규 호출:
   - profile (status in ['auto-approved','approved'] AND !suspended) → text + Vision
   - contentTemplates where industry == partner.profile.industry → type별 retrieval
   - cycle #19 retrievePartnerStyleReferences (anti-drift)
   - 통합 context + ragSourceIds 수집
4. Gemini compose with 3-tier RAG context
5. `posts.create({ generationMeta: { hygieneScore, ragSourceIds } })`
6. autoPublish 윈도우 + hygiene → publish or draft (cycle #19 그대로)

---

## 7. Plan Reconciliation (R1–R8)

| ID | Invariant | 영향 |
|---|---|---|
| R1 | cycle #19 generator/composeDraft 진입점 변경 0건 | buildComposePrompt에 getRagContext 호출만 1줄 추가 |
| R2 | `getRagContext(partnerId)` 신규 — profile + templates + cycle #19 통합 | 단일 entry point로 RAG 통합 |
| R3 | profile.status in ['auto-approved','approved'] 만 RAG 사용 | rejected/pending-review는 미반영 |
| R4 | profile.suspended === true → 매장 RAG 미사용 (cycle #19 fallback) | admin 긴급 정지 시 즉시 효과 |
| R5 | ragSourceIds 스냅샷 (Q3 결정) | snapshot 형식: `profile/{id}@v{N}` · `template/{id}` · `post/{id}` |
| R6 | ragHistory append-only (audit) | firestore.rules에서 admin SDK only write |
| R7 | contentTemplates Admin SDK only write | firestore.rules, partner는 read 불가 |
| R8 | photoUrls path validation — `/partners/{uid}/profile/` 만 허용 | server action에서 검증, fake URL 차단 |

---

## 8. Implementation Order (S1 ~ S8)

### S1 — Domain & Types
- partner-industry enum + labels
- PartnerProfile, ContentTemplate types
- zod schemas

### S2 — Repository
- partnerProfileRepository (CRUD + ragHistory append)
- contentTemplateRepository (CRUD + industry/type 쿼리)

### S3 — LLM 통합
- partner-rag-context.ts (getRagContext 신규)
- partner-promo-generator.ts buildComposePrompt에 1줄 추가
- profile.suspended fallback 검증

### S4 — Server Actions
- partner-profile-actions: savePartnerProfile + reviewPartnerRag + togglePartnerRagSuspended + reportPartnerRag
- content-template-actions: saveContentTemplate + deleteContentTemplate

### S5 — 사장님 UI
- /partner/profile 페이지 + PartnerProfileForm + PartnerProfilePhotoUpload

### S6 — admin UI
- /admin/rag-review 큐 + RagReviewList/Item
- /admin/content-templates 라이브러리 + ContentTemplateEditor
- /admin/partners/[id] 상세 profile/RAG 섹션 통합

### S7 — 인프라 + 시드
- firestore.rules · indexes.json · storage.rules 갱신
- AdminBottomBar 6탭 + StatsWidgets 8카드 + AdminNav '템플릿'
- scripts/seed-content-templates.mjs (업종별 5-10건)

### S8 — 통합 검증
- tsc + build + firebase deploy --dry-run
- 시드 1건으로 글 발행 시 ragSourceIds 검증
- profile.suspended 시 RAG 미사용 검증

---

## 9. Acceptance Criteria

### 9.1 Functional (15)
| ID | 기준 |
|----|------|
| AC1 | `/partner/profile` 진입 시 description·usps·priceItems·industry 입력 폼 표시 |
| AC2 | 영구 매장 사진 1~10장 업로드 가능 (Storage `/partners/{uid}/profile/`) |
| AC3 | 입력 시 자동 hygiene-guard ≥0.7 → status='auto-approved', <0.7 → 'pending-review' |
| AC4 | partners.profile.version 자동 증가 |
| AC5 | partners/{id}/ragHistory에 'profile-updated' event 기록 |
| AC6 | `/admin/rag-review`에 pending-review 큐 표시 |
| AC7 | admin 승인 시 status='approved', 거절 시 'rejected' + reason 저장 |
| AC8 | profile.suspended=true → RAG context에서 profile 미포함 |
| AC9 | `/admin/content-templates`에 type·industry 분류된 템플릿 CRUD |
| AC10 | scripts/seed-content-templates.mjs로 업종별 5-10건 시드 |
| AC11 | 글 발행 시 generationMeta.ragSourceIds에 profile·template·post ID 스냅샷 |
| AC12 | AdminBottomBar 6번째 탭 'RAG 검토' + 빨간 카운트 뱃지 (pending-review > 0) |
| AC13 | StatsWidgets 8번째 카드 '검토 대기 RAG' |
| AC14 | 신고 처리 폼·모달 동작 (reportPartnerRag 호출) |
| AC15 | partner.profile.industry 매칭으로 contentTemplates retrieval |

### 9.2 Non-functional (3)
| AC | 기준 |
|----|------|
| AC16 | tsc·build 0 errors |
| AC17 | git diff `lib/llm/partner-promo-generator.ts:composeDraft` 함수 시그니처 변경 0 |
| AC18 | cycle #19 partner-promo 흐름 회귀 없음 (사진 업로드·hygiene·autoPublish 모두 정상) |

---

## 10. Open Questions

| ID | 질문 | 잠정 결정 |
|----|------|-----------|
| OQ1 | 영구 매장 사진 업로드 max 장 수 | v1 10장. v2 늘릴 수 있음 |
| OQ2 | priceItems의 가격은 number vs string ("협의" 같은 케이스) | v1 number, "협의" 등은 description에 작성 |
| OQ3 | contentTemplates의 body 길이 limit | v1 10000자 (zod max). v2 PDF 첨부 시 별도 |
| OQ4 | hygiene-guard 점수 threshold (0.7) 적정성 | cycle #19 default 그대로. production 추적 후 조정 |
| OQ5 | profile.industry == 'other' 시 templates retrieval 어떻게? | type만 매칭, industry 무시. v2 fallback 강화 |
| OQ6 | AdminBottomBar 6탭이 모바일 폭에 빠듯 | 모바일에서만 6탭 노출, 데스크탑은 md:hidden 그대로 |
| OQ7 | ragSourceIds 길이 폭발 방어 | v1 max 20개로 캡 |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| cycle #19 generator 회귀 | R1·R7 invariant + AC17·18 | 
| profile 비대로 partners doc 크기 ↑ | photoUrls는 URL만 저장 (실 파일은 Storage), description max 2000자 |
| contentTemplates 부적절 사용 | admin only write, sa-key 외부 노출 시 영향. cycle #20 admin auth 강화 그대로 |
| RAG context 너무 길어 prompt token limit | v1 cap: profile description 2000자 + templates body 5000자 + 다른 글 3건 |
| 자동 hygiene-guard false negative (부적절 자료 통과) | 사후 신고 + admin 강제 토글로 회수 가능 (R4 suspended) |

---

## 12. Brainstorming Log

### Phase 1
- Q1 RAG 자료: 텍스트 + 영구 매장 사진 (PDF v2 OOS)
- Q2 검토: 자동 1차 + admin 큐 실패만
- Q3 Snapshot: ragSourceIds + summary

### Phase 2
- Approach A (부분 통합) 선택 — cycle #19 자산 보존, 회귀 위험 ↓

### Phase 3
- Profile 필드 4개 + admin 거버넌스 4개 모두 in-scope
- 사용자 추가 요구: admin 컨텐츠 템플릿 라이브러리 → cycle #24 통합

### Phase 4
- 4-1 Architecture: profile + ragHistory + contentTemplates + getRagContext 신규
- 4-2 컴포넌트: 신규 18 + 수정 8 — 적절함 통과
- 4-3 데이터 흐름: R1~R8 invariant 동의 → Plan 문서 작성

---

## 13. Next Steps

```
/pdca design partner-rag-system
```

Plan Plus 결과를 기반으로 design 문서 작성 → design-validator 검증 → Do (S1~S8).
