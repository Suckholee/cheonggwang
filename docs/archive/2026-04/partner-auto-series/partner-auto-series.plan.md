# Plan · partner-auto-series

> **Status**: Draft v1.0 (Plan Plus completed)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.13
> **Author**: Seokho Lee
> **Date**: 2026-04-27
> **PDCA Cycle**: #26
> **Method**: Plan Plus (Phases 0–5 completed)
> **Streak Target**: 6번째 single-pass 90s% 검증

---

## 1. Summary

### 1.1 한 줄 요약
파트너가 GO만 누르면 시스템이 **정해진 요일·시각마다 angle/format을 라운드 로빈으로 자동 생성·발행**. 사장님은 매장 정보만 잘 채워두면 잠자는 동안에도 매장 마케팅이 자동으로 돌아간다.

### 1.2 배경
- **cycle #19 partner-promo**: AI 파이프라인 + AutoPublish 윈도우. 그러나 **자동 발행은 사장님이 글을 능동적으로 만들었을 때만** 동작 — 시각 맞춰 알아서 글을 만드는 기능은 없음.
- **cycle #25 partner-content-formats**: blog/card-news multi-format + 카드뉴스 시각 디자인 + admin contentTemplates 12건 시드. 그러나 모든 글은 사장님이 능동 작성. 시리즈 자동 운영 X.
- **사용자 요구** (2026-04-27): "여기 의뢰업체 홍보는 설정한대로 일정 요일 및 시각마다 자동생성되는 구조야?" → 현재는 자동 발행만(반자동), 진짜 자동 시리즈 구현 필요.
- **자동화 효과**: 사장님이 매주 글을 만들 시간 없어도 시리즈가 자율 운영 → 매장 마케팅 일관성 유지 + 운영 부담 0.

### 1.3 목표
1. Cloud Functions Scheduled Trigger로 **매시간 09–18시 KST cron** 실행
2. autoSeries.enabled=true 파트너 대상으로 partner.autoPublish 윈도우 + 중복 발행 방지 체크 후 자동 발행
3. **AUTO_SERIES_ROTATION_POOL** 10 slot (5 angle × 2 format)을 라운드 로빈으로 순환
4. angle별 keyword/photo는 partner.profile에서 자동 도출 (사장님 입력 0)
5. cycle #19 `generatePartnerPromoDraft` 시그니처 불변 (R1, **6번째 invariant 검증**)
6. /partner/series 진행 현황 페이지 + /admin/auto-series 모니터링
7. 자동 발행 글에 🤖 UI 배지 (transparency)

### 1.4 비목표
- **사장님이 직접 angle 풀 등록**: 시스템 기본 풀만 (v2 OOS — Phase 1 Q2 결의)
- **AI 자율 angle 결정**: 라운드 로빈만 (v2 OOS, 비용·복잡도 ↑)
- **캘린더 모드 (사장님 미리 일정 짜기)**: OOS — Phase 1 Q1 옵션 C 미선택
- **이메일·푸시 알림**: OOS (인프라 추가 필요)
- **시리즈 통계 대시보드 풀 분석**: admin 기본 모니터링만 (v2 풀 analytics OOS)
- **사진 업로드 자동화**: partner.profile.photoUrls가 0이면 시리즈 일시 중지 알림만 (자동 사진 보강은 OOS)

---

## 2. User Intent Discovery (Phase 1)

### 2.1 Core Purpose
**파트너가 매장 정보만 잘 채워두면 시스템이 매주 자율적으로 다양한 angle·format의 홍보글을 자동 생성·발행해주는 무인 마케팅 시스템.**

> 사용자 발화:
> - "여기 의뢰업체 홍보는 설정한대로 일정 요일 및 시각마다 자동생성되는 구조야?"
> - cycle #25 진행 중: "파트너들이 한 가지의 내용만 가지고 올리고 싶지 않을거거든. 몇 가지의 사전틀로 블로그글, 카드뉴스 등등 여러 형태와 내용으로 돌려가면서 올리고 싶어할거라 생각해"

### 2.2 Target Users
- **파트너 (매장 운영자)**: GO/STOP 토글 + /partner/series에서 진행 현황 확인
- **방문 손님**: /community/p/{slug}에서 자동 발행된 글 확인 (🤖 배지로 transparency)
- **admin**: /admin/auto-series에서 전체 모니터링·통계
- **시스템 (Cloud Functions)**: 매시간 cron으로 자동 트리거

### 2.3 Q1·Q2 답변 (Plan Plus)
| Q | 결정 |
|---|---|
| Q1 자동화 수준 | **자동 생성 + 자동 발행 (완전 자율)** — 사장님은 GO/STOP만 |
| Q2 로테이션 방식 | **시스템 기본 angle 풀 + 라운드 로빈** — 사장님 부담 0, format도 blog↔card-news 번갈아 |

### 2.4 Success Criteria
| ID | 기준 | 측정 |
|---|---|---|
| SC1 | autoSeries.enabled=true 파트너의 다음 윈도우에 자동 글 1건 생성·발행 | E2E: 시드 후 cron 1tick 검증 |
| SC2 | 라운드 로빈 lastIndex가 윈도우마다 1씩 증가 (atomic) | Firestore lastIndex 추적 |
| SC3 | 같은 윈도우 안 중복 발행 X | recentlyPublishedInWindow 가드 |
| SC4 | hygiene-fail 시 skip + 다음 angle로 진행 (블로킹 X) | seriesHistory 'hygiene-fail' + lastIndex 진행 |
| SC5 | cycle #19 generatePartnerPromoDraft 시그니처 변경 0 | git diff (R1, 6번째 검증) |
| SC6 | 자동 발행 글이 PartnerPostCard·PostDetailView에 🤖 배지로 식별 | UI 검증 |
| SC7 | seriesHistory append-only (firestore.rules 차단) | rules unit test |
| SC8 | partner.autoSeries write 권한 — enabled·brandTone만 self-write 허용, lastIndex는 server-only | rules 검증 |
| SC9 | /partner/series에서 다음 발행 예정 (요일·시각·angle·format) 미리보기 정확 | UI 캡처 |
| SC10 | /admin/auto-series에서 전체 partner별 lastTickAt·success/fail 24h 카운트 표시 | UI 검증 |

---

## 3. Alternatives Explored (Phase 2)

### Approach A — 자동 생성 + 자동 발행 (완전 자율) ✅ **Selected (Phase 1 Q1)**
- cron이 정해진 윈도우에 angle 라운드 로빈 + AI 생성 + hygiene 통과 시 즉시 발행
- **Pros**: 사장님 부담 0, 매장 마케팅 자율 운영, cycle #19 hygiene-fail 차단 그대로 활용
- **Cons**: 부적절 콘텐츠 발행 risk (단, hygiene-guard로 차단되므로 cycle #19 수준 안전)

### Approach B — 자동 생성 + draft 저장 ❌
- cron이 글만 만들고 발행은 사장님 수동 클릭
- **Cons**: 사장님 검토 의무 → 자율성 결여, "잠자는 동안 자동 운영" 의도 미충족

### Approach C — 캘린더 모드 (사장님이 일정 짜기) ❌
- 사장님이 /partner/series-calendar에서 정밀 angle 배치
- **Cons**: 사장님 부담 ↑, "정해진 요일·시각마다 자동" 의도와 거리

→ **A 선택**. cycle #19 isInAutoPublishWindow + hygiene-guard 자산 그대로 활용해 안전하게 자율 운영.

---

## 4. YAGNI Review (Phase 3 — In/Out)

### 4.1 v1 In Scope
| # | 기능 | 출처 |
|---|------|------|
| 1 | Cloud Functions Scheduled Trigger (every 1 hour 09-18 KST) | 핵심 인프라 |
| 2 | partner.autoSeries 모델 (enabled / lastIndex / brandTone / lastTickAt) | 핵심 |
| 3 | AUTO_SERIES_ROTATION_POOL 10 slot 정의 | 핵심 |
| 4 | derive-inputs (angle별 keyword/photo 자동 도출) | 핵심 |
| 5 | seriesHistory append-only collection | 핵심 |
| 6 | atomic lastIndex transaction (race 방지) | 핵심 |
| 7 | partner.autoPublish 윈도우 결합 (cycle #19 재사용) | 핵심 |
| 8 | 같은 윈도우 중복 발행 방지 | 핵심 |
| 9 | hygiene-fail skip + 다음 angle 이동 | Phase 3 multiselect |
| 10 | /partner/series 진행 현황 페이지 (GO/STOP·다음 발행 미리보기·이력 20건) | Phase 3 multiselect |
| 11 | /admin/auto-series 모니터링 (24h 통계·partner별 상태) | Phase 3 multiselect |
| 12 | 🤖 자동 배지 (PartnerPostCard·PostDetailView) | Phase 3 multiselect |
| 13 | togglePartnerAutoSeries server action | 핵심 |
| 14 | partner/layout.tsx '시리즈' nav 추가 | UI 진입점 |

### 4.2 Out of Scope
| # | 미적용 | 사유 |
|---|--------|------|
| O1 | 사장님이 angle 풀 직접 편집 | 시스템 기본 풀만 v1, 편집은 v2 |
| O2 | AI 자율 angle 결정 | 비용·복잡도 ↑, v2 후보 |
| O3 | 캘린더 모드 (정밀 일정) | Phase 1 Q1 미선택 |
| O4 | 이메일·푸시 알림 | 인프라 추가 필요 |
| O5 | 풀 통계 대시보드 (대시보드 그래프, 유입 추적) | admin 기본만 |
| O6 | 매장 사진 자동 보강 (외부 API) | partner.profile.photoUrls 부족 시 알림만 |
| O7 | format 빈도 사장님 조정 (blog 비중 70/30 등) | 50/50 고정 |
| O8 | 자동 발행 글 사장님 즉시 철회 알림 | 사장님 직접 /partner/posts에서 처리 |

---

## 5. Architecture Decisions (Phase 4 합의)

### 5.1 핵심 결정 (5건)
| ID | 결정 | 사유 |
|----|------|------|
| AD1 | **Cloud Functions Scheduled Trigger** every 1 hour from 09:00 to 18:00 KST | functions/src에 신규 모듈, 한 번만 깔고 partner별 윈도우 check |
| AD2 | **R1 invariant 6번째 검증**: `generatePartnerPromoDraft` 시그니처 불변, Cloud Functions에서 동일 entry 사용 | cycle #19/#24/#25 자산 무영향 |
| AD3 | **자동 input은 partner.profile에서 derivation** | 사장님 keyword 입력 0 — 매장 정보만 갖춰두면 자동 |
| AD4 | **lastIndex atomic transaction** | 동시 cron 실행 race 방지 |
| AD5 | **autoSeries.enabled + autoPublish window 둘 다 만족해야 발행** | cycle #19 윈도우 자산 재사용, 시간대 정밀 컨트롤 |

### 5.2 보안·invariant
- **R1**: `generatePartnerPromoDraft` 시그니처 불변 (cycle #19/#24/#25과 동일 패턴, 6번째)
- **R2**: lastIndex atomic update (Firestore transaction)
- **R3**: window double-check (autoPublish + autoSeries 둘 다)
- **R4**: 같은 윈도우 안 중복 발행 방지 (recentlyPublishedInWindow)
- **R5**: hygiene-fail은 skip — 발행 차단, lastIndex 진행
- **R6**: seriesHistory append-only (firestore.rules)
- **R7**: partner write — `autoSeries.enabled`/`brandTone`만 self-write, lastIndex는 server-only

### 5.3 Data Flow 핵심 (Phase 4 합의)
```
[cron tick 매시간 09–18 KST]
  ↓ for each partner with autoSeries.enabled=true:
    ├─ window check (autoPublish 윈도우 안?)
    ├─ duplicate check (이번 윈도우 이미 발행?)
    ├─ atomic transaction: lastIndex++
    ├─ slot = POOL[lastIndex] = (angle, format)
    ├─ deriveAutoInputs(partner, angle) → keywords/photoUrls
    ├─ generatePartnerPromoDraft({...derived, format})  [cycle #25 그대로]
    └─ if hygiene passed:
         postRepository.create(isAutoSeries: true, isAutoPublishedSeries: true)
         seriesHistory.append({status: 'published'})
       else:
         seriesHistory.append({status: 'hygiene-fail'})
         (skip — lastIndex 이미 진행됨)
```

### 5.4 ROTATION_POOL 10 slot (시스템 기본)
```
0: usp     × blog          (강점·차별점 SEO 블로그)
1: menu    × card-news     (메뉴·가격 카드뉴스)
2: review  × blog          (고객 후기 블로그)
3: event   × card-news     (이벤트·할인 카드뉴스)
4: story   × blog          (매장 이야기 블로그)
5: usp     × card-news     (강점 카드뉴스)
6: menu    × blog          (메뉴 SEO 블로그)
7: review  × card-news     (후기 카드뉴스)
8: event   × blog          (이벤트 블로그)
9: story   × card-news     (이야기 카드뉴스)
```
→ 5 angle × 2 format. 매주 화·목 발행 시 5주 만에 한 사이클 종료, 6주 차에 다시 0번부터.

---

## 6. Brainstorming Log (Phase 1–4 결정 요약)

| Phase | 결정 | 트리거 |
|-------|------|--------|
| Phase 0 | partner-auto-series 신규, functions/src에 research infra 일부 깔려있음 (cycle #20 자산) | 사이클 시작 가능 |
| Phase 1 Q1 | "자동 생성 + 자동 발행 (완전 자율)" 선택 | 3 옵션 중 |
| Phase 1 Q2 | "시스템 기본 angle 풀 + 라운드 로빈" 선택 | 3 옵션 중 |
| Phase 3 | 부가 4개 모두 선택 (시리즈 페이지·이벤트 로그·skip·🤖 배지) | multiselect |
| Phase 4 Architecture | cron + atomic lastIndex + window double-check 승인 | "진행" |
| Phase 4 Components | 18개 신규/수정 컴포넌트 승인 (Cloud Functions·domain·UI·actions) | "Components 승인" |
| Phase 4 Data flow | 5개 핵심 흐름 (cron tick·partner 처리·/series 페이지·admin·🤖 배지) 승인 | "진행" |

---

## 7. Implementation Roadmap (high-level)

| Step | 작업 | 의존성 |
|------|------|--------|
| S1 | domain 신규: AutoSeriesAngle + ROTATION_POOL · partner.autoSeries 타입 | 없음 |
| S2 | Post.isAutoSeries 필드 + post-repository read/write 매핑 | 없음 |
| S3 | derive-inputs.ts (angle → keywords/photoUrls 도출 로직) | S1 |
| S4 | auto-series-repository (seriesHistory + lastIndex transaction) | S1 |
| S5 | functions/src/auto-series/runner.ts + index.ts (cron entry) | S3·S4 |
| S6 | togglePartnerAutoSeries server action | S1·S4 |
| S7 | /partner/series page + PartnerAutoSeriesPanel + SeriesHistoryList | S6·S4 |
| S8 | /admin/auto-series + AutoSeriesDashboard | S4 |
| S9 | PartnerPostCard·PostDetailView 🤖 배지 추가 | S2 |
| S10 | partner/layout.tsx '시리즈' nav 추가 | S7 |
| S11 | firestore.rules: autoSeries write 제한 + seriesHistory append-only | S1 |
| S12 | 더미 시드: 강남 코워킹 1명에 autoSeries.enabled=true (시연용) | S1 |

총 12 step. 예상 작업량: cycle #25보다 작음 (~1,500–2,000 LOC, Cloud Functions가 작은 모듈).

---

## 8. Risks & Mitigations

| Risk | 영향 | Mitigation |
|------|------|-----------|
| cron 동시 실행으로 lastIndex race | 같은 angle 중복 또는 슬롯 스킵 | Firestore atomic transaction (R2) |
| hygiene-fail 반복으로 시리즈 정체 | 사장님 이상 인지 못하고 발행 안됨 | seriesHistory에 fail 기록 + admin 모니터링에서 감지 (R5) |
| 매장 사진(photoUrls) 0건 파트너 | Vision API 호출 실패 → 매번 error | autoSeries.enabled 토글 시 photoUrls.length>=1 검증, 0이면 토글 거부 |
| Cloud Functions cold start 지연 | 09시 첫 tick이 09:30+ 발생 | every 1 hour 빈도 충분 (윈도우는 분 단위 정밀, 하지만 시간대 정밀 컨트롤이 우선) |
| 자동 발행 글 부적절 | hygiene-guard 통과해도 사장님 의도와 다를 수 있음 | 🤖 배지로 손님 transparency + 사장님 즉시 /partner/posts에서 철회 가능 |
| Functions 비용 증가 | partner 1000명 × 매시간 cron = 일 24,000회 | 윈도우 안 partner만 처리 (대부분 빠른 return) + Firebase Functions 무료 티어 충분 |
| seriesHistory 커지는 collection | partner당 수백~수천 doc | 처음부터 append-only, 90일 이상 doc 자동 cleanup은 v2 OOS (현재는 listHistory limit=20만 사용) |

---

## 9. Next Steps

1. **`/pdca design partner-auto-series`** → Design 문서 v0.1 생성
2. **design-validator agent** 호출 → Critical/High/Medium/Low 발굴 → v0.2 보강 (5사이클 일관 패턴, 6번째 검증)
3. v0.2 승인 후 **`/pdca do`** → S1~S12 구현
4. **`/pdca analyze`** → gap-detector ≥ 90% 검증
5. ≥ 90% 즉시 **`/pdca report`** → **6사이클 연속 single-pass 90s%** 패턴 검증 완료

---

## 10. Cross-Cycle 영향

| Cycle | 영향 | 설명 |
|-------|------|------|
| #19 partner-promo | generatePartnerPromoDraft 호출만 추가, 시그니처 불변 | R1 invariant 6번째 검증 |
| #24 partner-rag-system | partner.profile (description·usps·priceItems·photoUrls·industry) 자동 derive 입력으로 활용 ↑ | R2 모델 변경 0 |
| #25 partner-content-formats | format(blog/card-news) ROTATION_POOL에서 활용 + Post.isAutoSeries 추가만 | format 인프라 검증 |
| #20 quote-trend-keywords | functions/src/research 인접 모듈로 cron 패턴 재사용 학습 | 인프라 공유 |
