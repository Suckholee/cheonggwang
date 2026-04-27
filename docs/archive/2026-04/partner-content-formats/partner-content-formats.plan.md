# Plan · partner-content-formats

> **Status**: Draft v1.0 (Plan Plus completed)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.12
> **Author**: Seokho Lee
> **Date**: 2026-04-27
> **PDCA Cycle**: #25
> **Method**: Plan Plus (Phases 0–5 completed)

---

## 1. Summary

### 1.1 한 줄 요약
파트너가 매장 RAG 자료로 **블로그·카드뉴스 두 형식**을 자유롭게 골라 작성하고, 작성한 글을 **카드 그리드 + 미리보기 페이지**로 한눈에 확인할 수 있게 한다.

### 1.2 배경
- **cycle #19 partner-promo**: AI 파이프라인 — 단일 blog markdown 형식만 생성
- **cycle #24 partner-rag-system**: admin이 업종별 ContentTemplate (`type: 'blog' | 'card-news'`) 12건을 시드. 그러나 **파트너 측에 format 선택·angle 선택·카드뉴스 렌더러가 없어** 사실상 모든 글이 단일 blog 형태
- **사용자 요구** (2026-04-27): "파트너들이 한 가지의 내용만 가지고 올리고 싶지 않을 거다. 몇 가지의 사전틀(angle)로 블로그글·카드뉴스 등 여러 형태와 내용으로 돌려가면서 올리고 싶어할 것"
- 현재 `/partner/posts`는 단순 텍스트 리스트(제목+날짜)라 **글이 어떻게 보일지 미리 확인하기 어려움**

### 1.3 목표
1. 파트너가 **format(blog / card-news)** 을 선택해서 글 작성 가능
2. cycle #24 admin **contentTemplates를 추천 카드**로 제시 → angle 선택의 진입점
3. **카드뉴스 렌더러**(슬라이드 뷰어) 신규 — 공개페이지·미리보기에서 동일 컴포넌트 사용
4. `/partner/posts` 카드 그리드로 개편: 커버·발췌·format 배지·angle tags·상태 배지·작성일
5. **`/partner/posts/{id}/preview`** 신규 — 초고/철회 글을 실제 발행 모습 그대로 미리보기 (published는 공개페이지로 redirect)
6. cycle #19 `composeDraft` 진입점 시그니처 invariant (R1 유지)

### 1.4 비목표
- **AutoPublish 시리즈 자동 로테이션** (다음 사이클 cycle #26 후보)
- **카드뉴스 디자인 템플릿** (지금은 기본 슬라이드, 디자인 v2)
- **angle 분류체계 확장**: cycle #24 ContentTemplate.tags 그대로 활용. 신규 angle 메타 도입 X
- **발행/철회 액션을 미리보기 페이지에서 수행**: 미리보기는 read-only + 편집 진입만

---

## 2. User Intent Discovery (Phase 1)

### 2.1 Core Purpose
**파트너가 한 매장 정보로 다양한 형식·앵글의 콘텐츠를 시리즈로 운영할 수 있게 하고, 작성된 글의 실제 모습을 즉시 확인할 수 있게 한다.**

> 사용자 발화:
> - "이 내용대로 생성되는 글들에 대해서 내가 미리보기로 확인할수 있는 목록이 필요해"
> - "파트너들이 한 가지의 내용만 가지고 올리고 싶지 않을거거든? 그래서 몇 가지의 내용 중심의 사전틀을 가지고서 블로그글, 카드뉴스 등등 여러 형태와 내용으로 돌려가면서 올리고 싶어할거라 생각해"

### 2.2 Target Users
- **파트너 (매장 운영자)**: `/partner/posts/new` 3-step Wizard에서 format·template 선택, `/partner/posts`에서 카드 미리보기
- **방문 손님**: `/community/p/{slug}` 공개페이지에서 카드뉴스/블로그 둘 다 정상 렌더링

### 2.3 Q1·Q2 답변 (Plan Plus)
| Q | 결정 |
|---|---|
| Q1 핵심 목적 | **내 글 카드 미리보기** (이미 만든 글 카드 그리드 + 풀 미리보기) |
| Q2 미리보기 UX | **공개페이지 + draft 미리보기 전용 페이지** (모달·인라인 X) |
| Q-deep 핵심 가치 | **blog·card-news 형식 둘 다 사용** (사이클 범위 확장 → partner-content-formats로 명명) |

### 2.4 Success Criteria
| ID | 기준 | 측정 |
|---|---|---|
| SC1 | 파트너가 글 작성 시 format 선택 → DB에 정확히 저장 | post.format ∈ {'blog','card-news'} 100% |
| SC2 | format='card-news'로 작성한 글이 슬라이드 뷰어로 렌더링 | CardNewsViewer가 `'---'` 구분자로 분할 후 N슬라이드 |
| SC3 | 카드 그리드에 커버·발췌·format 배지·tags 배지·상태·날짜 노출 | UI 검증 |
| SC4 | draft·withdrawn 카드 클릭 → /partner/posts/{id}/preview 도달 | 라우팅 검증 |
| SC5 | published 카드 클릭 → /community/p/{slug} 도달 (preview 페이지 차단) | 라우팅 검증 + redirect 가드 |
| SC6 | 미리보기에서 본 모습 = 공개페이지 모습 | 동일 PostBodyRenderer 컴포넌트 재사용 |
| SC7 | cycle #19 composeDraft 시그니처 변경 0건 (R1) | git diff 검증 |
| SC8 | cycle #24 ContentTemplate 모델 변경 0건 (R2) | git diff 검증 |

---

## 3. Alternatives Explored (Phase 2)

### Approach A — 미리보기 카드 그리드만 ❌
- 카드 그리드 + preview 페이지만 추가, format/angle은 다음 사이클
- **Pros**: 작업량 작음, 빠른 출시
- **Cons**: "여러 형식·내용으로 돌려가며 올리고 싶다"는 사용자 핵심 의도 미충족

### Approach B — 풀 multi-format 시스템 ✅ **Selected**
- 미리보기 + format(blog/card-news) + 카드뉴스 렌더러 + admin 템플릿 추천 통합
- **Pros**: 사용자 핵심 의도 즉시 충족, cycle #24 자산 즉시 활용
- **Cons**: 사이클 #24와 비슷한 작업량 (~3,000+ insertions 예상)

### Approach C — AutoPublish 시리즈 자동 로테이션 포함 ❌
- B + AutoPublish가 angle 로테이션 자동 발행
- **Cons**: cycle #26 별도 사이클로 분리 (현 사이클에 너무 큼)

---

## 4. YAGNI Review (Phase 3 — In/Out)

### 4.1 v1 In Scope (확정)
| # | 기능 | 출처 |
|---|------|------|
| 1 | 카드에 커버 이미지 표시 | Phase 3 multiselect |
| 2 | 카드 본문 발췌 (첫 2~3줄, 80~120자) | Phase 3 multiselect |
| 3 | 카드 상태 배지 + 작성일 | Phase 3 multiselect |
| 4 | 카드 RAG 반영 표시 (USP/메뉴 개수 또는 templateTags) | Phase 3 multiselect |
| 5 | `/partner/posts/{id}/preview` 신규 페이지 | Phase 3 multiselect |
| 6 | 미리보기 페이지 상단 '편집' 액션 | Phase 3 multiselect |
| 7 | 발행된 글은 공개페이지로 이동 | Phase 3 multiselect |
| 8 | format 선택 (blog/card-news) | Phase deep |
| 9 | 카드뉴스 슬라이드 렌더러 (CardNewsViewer) | Phase deep |
| 10 | /partner/posts/new 3-step Wizard (format → template → keyword) | Phase deep |
| 11 | admin contentTemplates 추천 카드 그리드 (industry × format 매칭) | Phase deep |
| 12 | Post 모델 확장: format, templateId, templateTags | Phase deep |

### 4.2 Out of Scope (다음 사이클 후보)
| # | 미적용 항목 | 사유 |
|---|------------|------|
| O1 | 검색·필터 UI | v1 글 수 적음 → v2 |
| O2 | 페이지네이션 / 무한스크롤 | listMyPosts(uid, 100) 한도 충분 |
| O3 | status별 그룹핑 제거(통합 그리드) | 현 그룹핑이 명료 → 유지 |
| O4 | AutoPublish 시리즈 자동 로테이션 | cycle #26 후보 |
| O5 | 카드뉴스 슬라이드 디자인 템플릿 | v2 (기본 슬라이드만) |
| O6 | 발행/철회 액션을 미리보기 페이지에서 | /edit에서만 |
| O7 | angle 분류체계 신규 도입 | cycle #24 templateTags 재사용 |

---

## 5. Architecture Decisions (Phase 4 합의)

### 5.1 핵심 결정 (3건)
| ID | 결정 | 사유 |
|----|------|------|
| AD1 | **R1 invariant 유지**: composeDraft 시그니처 불변, format은 optional 인자만 추가 | cycle #19 회귀 위험 차단 |
| AD2 | **PostBodyRenderer 단일 진입점**: format 분기를 한 컴포넌트에서 — preview·공개페이지 동일 사용 | "preview에서 본 모습 = 손님이 보는 모습" 신뢰성 |
| AD3 | **'---' 구분자**: 카드뉴스 슬라이드 분할은 markdown 표준 구분자 활용 | LLM이 자연스럽게 생성 가능, 별도 syntax 학습 불필요 |

### 5.2 보안·invariant
- **R1**: composeDraft required 인자 불변 (format은 optional)
- **R2**: ContentTemplate 스키마 불변 (cycle #24 모델 그대로)
- **R3**: published 글은 /preview 차단 (서버에서 redirect 가드)
- **R4**: 본인 글 또는 admin만 /preview 접근 (`requirePartnerPage`)
- **R5**: 카드 클릭 라우팅: published → 공개페이지 / draft·withdrawn → preview

### 5.3 Data Flow 핵심 (Phase 4 합의)
```
[작성] new Wizard → Step1 format → Step2 template → Step3 keyword
       → composeDraft(payload, ragContext, format)
       → postRepository.create({...result, format, templateId, templateTags})

[미리보기] /partner/posts → 카드 그리드 (status별)
       → published click → /community/p/{slug}
       → draft|withdrawn click → /partner/posts/{id}/preview
       → PostBodyRenderer (format 분기) → BlogRenderer | CardNewsViewer
```

---

## 6. Brainstorming Log (Phase 1–4 결정 요약)

| Phase | 결정 | 트리거 |
|-------|------|--------|
| Phase 1 Q1 | "내 글 카드 미리보기" 선택 | 4 옵션 중 |
| Phase 1 Q2 | "공개페이지 + draft 미리보기 전용 페이지" 선택 | 3 옵션 중 |
| Phase 3 카드 정보 | 4개 multiselect 모두 ✓ (커버·발췌·상태·RAG 표시) | 풍부한 카드 |
| Phase 3 페이지 구조 | preview 전용 페이지 ✓, 발행됨은 공개페이지 ✓, 편집 액션 ✓ | status별 그룹핑 유지 |
| Phase deep | 사용자 인사이트: "여러 형식·내용으로 돌려가며" → blog/card-news 둘 다 | 사이클 이름 변경 |
| Phase 4 | Architecture·Components·Data flow 모두 승인 | "Architecture 승인", "승인" |

---

## 7. Implementation Roadmap (high-level)

| Step | 작업 | 의존성 |
|------|------|--------|
| S1 | Post 모델 확장: format, templateId, templateTags | 없음 |
| S2 | utils: extract-excerpt, parse-card-news-slides | 없음 |
| S3 | composeDraft에 format optional + card-news-generator 헬퍼 | S1 |
| S4 | CardNewsViewer 컴포넌트 + PostBodyRenderer 분기 진입점 | S2 |
| S5 | /partner/posts/new 3-step Wizard (PostFormatPicker, TemplateRecommendCards) | S1, S3 |
| S6 | PartnerPostCard + PartnerPostsList 카드 그리드 개편 | S2 |
| S7 | /partner/posts/{id}/preview 페이지 | S4, R3·R4 가드 |
| S8 | /community/p/{slug} 공개페이지에 PostBodyRenderer 적용 | S4 |
| S9 | 더미 데이터 시드 보강 (cycle #22 partners 3명에 card-news 글 1건씩) | S1, S5 |

총 9 step. 예상 작업량: cycle #24와 비슷 (~2,500–3,500 insertions).

---

## 8. Risks & Mitigations

| Risk | 영향 | Mitigation |
|------|------|-----------|
| composeDraft 시그니처 회귀 | cycle #19 partner-promo·provider-stories 깨짐 | format optional only, default behavior 동일 |
| 레거시 post에 format 필드 없음 | 기존 글 렌더링 실패 | PostBodyRenderer fallback: format ?? 'blog' |
| '---' 구분자가 markdown 가로줄과 충돌 | 의도치 않은 슬라이드 분할 | parser는 `\n---\n` (앞뒤 newline) 패턴만 분리 — markdown HR과 동일하지만 card-news 한정 적용 |
| LLM이 format='card-news' 시 슬라이드 형식으로 생성 안 함 | 단일 본문으로 출력 | card-news-generator 프롬프트 강제 ("각 슬라이드는 80–120자, '---'로 구분") + post-process 검증 |
| ContentTemplate fallback 실패 (industry='other'에 매칭 없음) | Step 2가 빈 화면 | "직접 입력" 버튼 항상 표시 — 사용자가 우회 가능 |

---

## 9. Next Steps

1. **`/pdca design partner-content-formats`** 실행 → Design 문서 생성
2. **design-validator agent** 호출 → Critical/High/Medium 이슈 발굴 후 Design v0.2로 보강 (cycle #21–24 일관 패턴)
3. Design v0.2 승인 후 **`/pdca do`** → 구현
4. 구현 완료 후 **`/pdca analyze`** → gap-detector ≥ 90% 검증
5. 99%+ 시 즉시 **`/pdca report`** → 5사이클 연속 90s% single-pass 패턴 유지

---

## 10. Cross-Cycle 영향

| Cycle | 영향 | 설명 |
|-------|------|------|
| #19 partner-promo | composeDraft optional arg 추가만, 기존 호출자 무영향 | R1 invariant |
| #24 partner-rag-system | ContentTemplate 모델 활용도 ↑, 모델 변경 0 | R2 invariant |
| #21 partner-application | 영향 없음 | — |
| #22 partner-issue-from-users | 영향 없음 | — |
| #26 (예정) partner-auto-series | 본 사이클의 format/templateTags를 AutoPublish 로테이션 키로 사용 | 후속 사이클 의존 |
