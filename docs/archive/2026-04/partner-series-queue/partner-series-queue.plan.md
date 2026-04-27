# Plan · partner-series-queue

> **Status**: Draft v1.0 (Plan Plus completed)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.14
> **Author**: Seokho Lee
> **Date**: 2026-04-28
> **PDCA Cycle**: #27
> **Method**: Plan Plus (Phases 0–5 completed)
> **Streak Target**: 🎯 7번째 single-pass 90s%

---

## 1. Summary

### 1.1 한 줄 요약
사장님이 cycle #26 자동 시리즈의 발행 큐(시나리오 목록)를 **직접 추가·삭제·일시정지·순서 변경**하여 자기 매장 마케팅을 정밀하게 컨트롤할 수 있게 한다.

### 1.2 배경
- **cycle #26 partner-auto-series**: 자동 시리즈 + ROTATION_POOL 10 slot이 코드에 hardcode. 사장님은 GO/STOP만 가능, 어떤 시나리오로 어떤 순서 발행될지 통제 불가.
- **사용자 요구** (2026-04-28): "자동 발행을 위해 세팅되어 있는 상태들의 목록을 관리하고 싶다" — 발행 큐 가시화·편집 필요
- **현 시점 한계**:
  - "다음 발행 예정" 1개 슬롯만 미리보기. 그 다음 N개 큐는 안 보임
  - 사장님이 특정 angle (예: 이벤트) 일시 비활성화하고 싶을 때 방법 없음
  - 같은 시나리오 반복 또는 특정 시나리오 우선 발행 불가능

### 1.3 목표
1. 사장님이 cycle #26 자동 시리즈 큐를 **시각화 + 편집**할 수 있는 UI (`/partner/series` 통합)
2. **5가지 편집 액션**: 항목 추가 / 영구 삭제 / 일시정지 / ▲▼ 순서 변경 / drag-and-drop
3. **다음 N개 발행 예정 미리보기** (시각·시나리오 함께)
4. **빈 큐 fallback**: 사장님이 모든 항목 삭제·일시정지해도 시스템 자동으로 ROTATION_POOL 사용 (안전망)
5. **R1 invariant 7번째 검증**: cycle #19 generator 0줄 변경 + cycle #26 자체 복제본도 변경 0
6. **R2 invariant 신규**: cycle #26 ROTATION_POOL은 fallback default로 보존 (기존 partner 동작 100% 호환)

### 1.4 비목표
- **admin이 partner 큐 강제 reset 권한**: 사장님 자율, admin은 모니터링만 (cycle #28 후보)
- **큐 변경 history audit log**: cycle #24 ragHistory 패턴 가능하지만 v1 OOS
- **사장님 custom angle/keyword 직접 입력**: Phase 1 Q1에서 "시스템 angle만" 선택 — Option C OOS
- **admin contentTemplates에서 가져오기**: Phase 1 Q1에서 미선택 — Option B OOS
- **큐 size 강제 제한**: 코드 enforce X (UI 가이드만, 10개 권장)
- **drag handle on PC**: ▲▼ 버튼만 충분 (다만 v1에서 mobile drag-and-drop은 포함)

---

## 2. User Intent Discovery (Phase 1)

### 2.1 Core Purpose
**사장님이 자동 시리즈로 어떤 시나리오가 어떤 순서로 발행될지 직접 큐를 관리할 수 있게 하여 매장 마케팅 정밀 통제.**

> 사용자 발화:
> - "이건 이미 발행된 글 아니야? 나는 자동 발행을 위해 세팅되어 있는 상태들의 목록을 관리하고 싶은데"

### 2.2 Target Users
- **파트너 (매장 운영자)**: `/partner/series` 안 큐 관리 UI에서 직접 편집
- **시스템 (Cloud Functions runner)**: effectiveQueue 함수로 큐 또는 ROTATION_POOL fallback 자동 결정
- **admin**: 변경 없음 (모니터링만, 큐 자체는 사장님 자율)

### 2.3 Q1 답변 (Plan Plus)
| Q | 결정 |
|---|---|
| Q1 큐 source | **시스템 기본 angle 5종 × format 2종 조합만 (10 slot)** — Option A. cycle #26 ROTATION_POOL을 partner-specific하게 변환 |
| Q2 (skipped) | Phase 3 multiselect로 통합 |

### 2.4 Success Criteria
| ID | 기준 | 측정 |
|---|---|---|
| SC1 | 사장님이 큐 항목 추가하면 다음 윈도우부터 적용 | Firestore partner.autoSeriesQueue 갱신 + 다음 cron tick 동작 |
| SC2 | 일시정지 항목은 cron이 skip (큐에는 남음) | seriesHistory 검증 |
| SC3 | 영구 삭제 시 lastIndex 보정 정확 | atomic transaction 검증 |
| SC4 | 순서 변경(▲▼ 또는 drag-and-drop) 시 즉시 큐 갱신 | UI 클릭 → server action → Firestore |
| SC5 | 빈 큐 시 ROTATION_POOL fallback 정상 동작 | autoSeriesQueue=[] 또는 모두 enabled=false 시 fallback 검증 |
| SC6 | 다음 5개 발행 미리보기가 큐+윈도우 기반으로 정확 | UI 검증 |
| SC7 | cycle #19/#26 호출자 영향 0 (R1 7번째) | git diff 검증 |
| SC8 | 기존 cycle #26 partner (autoSeriesQueue undefined)는 변경 없이 동작 | 기존 partner 시뮬레이션 |
| SC9 | 같은 angle×format 중복 추가 차단 (UI에서 미사용 항목만 노출) | AddDialog 검증 |
| SC10 | 큐 변경 시 partner self-write 정책 위반 0 (server action 경유) | rules 검증 |

---

## 3. Alternatives Explored (Phase 2)

### Approach A — 시스템 angle 5종 × format 2종 (10 slot) ✅ **Selected**
- ROTATION_POOL을 partner-specific으로 변환. 사장님은 10 slot 중 선택·순서·일시정지
- **Pros**: cycle #26 자산 그대로 활용, YAGNI, 작업량 최소
- **Cons**: 사장님 통제력 medium (커스텀 시나리오 불가)

### Approach B — A + admin contentTemplates 통합 ❌
- A + cycle #24 시드 12개 템플릿도 큐 항목으로 가능
- **Cons**: cycle #24 자산 활용도 ↑이지만 복잡도 증가, sparse industry 매칭 issue

### Approach C — full custom (사장님이 angle/keyword 직접 작성) ❌
- B + 사장님이 custom angle 만들 수 있음
- **Cons**: 작업량 가장 큼, 검증·hygiene 추가 필요

→ **A 선택**. 가장 단순 + cycle #26 ROTATION_POOL fallback과 자연스럽게 호환.

---

## 4. YAGNI Review (Phase 3)

### 4.1 v1 In Scope (확정)
| # | 기능 | 출처 |
|---|------|------|
| 1 | 큐 항목 추가 (10 slot 중 미사용 선택) | 핵심 |
| 2 | 큐 항목 영구 삭제 | 핵심 |
| 3 | ▲▼ 순서 변경 | 핵심 |
| 4 | 일시정지 토글 (cron skip + 큐에 남김) | Phase 3 |
| 5 | drag-and-drop reorder (▲▼ 추가) | Phase 3 |
| 6 | 다음 5개 발행 미리보기 (시각 + 시나리오) | Phase 3 |
| 7 | 빈 큐 시 ROTATION_POOL fallback (안전망) | Phase 3 |
| 8 | partner.autoSeriesQueue undefined → fallback (cycle #26 호환) | 마이그레이션 |
| 9 | server action 4개 (add/remove/toggle/reorder) | 핵심 |
| 10 | runner의 effectiveQueue 함수 (queue 또는 fallback 결정) | 핵심 |

### 4.2 Out of Scope
| # | 미적용 | 사유 |
|---|--------|------|
| O1 | admin이 partner 큐 강제 reset | 사장님 자율, cycle #28 후보 |
| O2 | 큐 변경 history audit (cycle #24 ragHistory 패턴) | v1 OOS, 필요 시 cycle #28 |
| O3 | custom angle/keyword 직접 입력 | Phase 1 Q1 미선택 (Option C) |
| O4 | admin contentTemplates 가져오기 | Phase 1 Q1 미선택 (Option B) |
| O5 | 큐 size 코드 강제 (예: 최대 20) | UI 가이드만, 코드 enforce X |
| O6 | 큐 항목별 frequency 설정 (예: 이 시나리오는 2배 자주) | v1 단순 라운드 로빈만 |
| O7 | A/B 테스트 모드 | v2 후보 |

---

## 5. Architecture Decisions (Phase 4 합의)

### 5.1 핵심 결정 (5건)
| ID | 결정 | 영향 |
|----|------|------|
| AD1 | **마이그레이션 친화 fallback** — `autoSeriesQueue === undefined` 또는 빈 효과 큐 → ROTATION_POOL fallback | 기존 cycle #26 partner 영향 0 (R2 새 invariant) |
| AD2 | **R1 invariant 7번째**: cycle #19 generator·#26 자체 복제본 모두 0줄 변경. effectiveQueue 함수만 신규 | 누적 자산 보존 |
| AD3 | **R3 atomic transaction 보존**: cycle #26 lastIndex update 흐름 그대로, effective array.length만 fallback과 일치 | race 방지 동일 |
| AD4 | **server action만 self-write** — partners write `if false` 유지, 큐 편집은 4개 action 경유 | R7 정책 일관 |
| AD5 | **lastIndex 보정 정책** — 삭제·재정렬 시 active item이 새 위치로 매핑. 일시정지는 lastIndex 무관 (효과 큐가 enabled만 포함) | 사용자 직관과 일치 |

### 5.2 보안·invariant
- **R1**: cycle #19 partner-promo-generator 0줄 변경 (7번째 검증)
- **R2 (신규)**: cycle #26 ROTATION_POOL fallback default — 기존 partner 영향 0
- **R3**: atomic transaction (lastIndex) 그대로
- **R4**: window double-check + recentlyPublishedInWindow 그대로 (cycle #26)
- **R5**: skip-and-continue 정책 그대로 (cycle #26)
- **R6**: server action 화이트리스트 — 큐 편집만 self-write
- **R7**: partner self-write 정책 — `partners write: if false` 유지

### 5.3 Data Flow 핵심
```
[cron tick]
  effective = partner.autoSeriesQueue
                 ?.filter(q => q.enabled).length > 0
              ? partner.autoSeriesQueue.filter(q => q.enabled)
              : ROTATION_POOL  // R2 fallback
  
  pickSlot(lastIndex, effective.length) → effective[next]
  → cycle #26 흐름 그대로 (deriveAutoInputs · generate · post)

[큐 편집]
  사장님 [+/🗑️/⏸/▲▼/drag]
    → server action (zod 화이트리스트)
    → partnerRepository.updateAutoSeriesQueue (Admin SDK)
    → revalidatePath("/partner/series")
```

---

## 6. Brainstorming Log

| Phase | 결정 | 트리거 |
|---|---|---|
| Phase 0 | partner-series-queue 신규, cycle #26 직후 자연스러운 후속 | 사이클 시작 |
| Phase 1 Q1 | "시스템 기본 angle 5종 × format 2종 조합만" 선택 | 3 옵션 중 |
| Phase 3 | 부가 4개 모두 ✓ (일시정지·drag·미리보기·fallback) | multiselect |
| Phase 4 | Architecture / Components / Data flow 모두 승인 | "승인" 3회 |

---

## 7. Implementation Roadmap

| Step | 작업 | 의존성 | 예상 LOC |
|------|------|--------|----------|
| S1 | QueueItem type + Partner.autoSeriesQueue 필드 추가 | — | 50 |
| S2 | partnerRepository: toPartner 매핑 + updateAutoSeriesQueue + helper 메서드 | S1 | 150 |
| S3 | effectiveQueue 함수 (Next.js + functions 미러) | S1 | 60 |
| S4 | queue-preview 함수 (다음 N개 시각 + 시나리오) | S1·S3 | 80 |
| S5 | server actions 4개 (add/remove/toggle/reorder) + lastIndex 보정 | S2 | 200 |
| S6 | functions/auto-series/runner.ts effectiveQueue 적용 + lib mirror 동기화 | S3 | 80 |
| S7 | PartnerSeriesQueueEditor (client, drag-and-drop + ▲▼) | S5 | 350 |
| S8 | PartnerSeriesQueueAddDialog (client, 미사용 slot 표시) | S5·S7 | 150 |
| S9 | PartnerSeriesQueuePreview (server, 다음 5개 미리보기) | S4 | 120 |
| S10 | /partner/series page 통합 (3 컴포넌트 추가) | S7·S8·S9 | 60 |
| S11 | scripts/check-queue-mirror.mjs (CI lint, cycle #26 패턴 재사용) | S3·S6 | 80 |

**총 예상: ~1,380 LOC** (cycle #25·#26보다 작음, UI 위주)

---

## 8. Risks & Mitigations

| Risk | 영향 | Mitigation |
|------|------|-----------|
| 사장님이 모든 항목 삭제 | 시리즈 정지로 오해 | ROTATION_POOL fallback (R2) — 사장님이 명시적으로 시리즈 OFF 누르기 전엔 안전 default 운영 |
| lastIndex 보정 버그 | 다음 발행 시 invalid slot | lastIndex >= effective.length면 modulo로 wrap. 단위 테스트로 검증 |
| drag-and-drop 모바일 미지원 브라우저 | 일부 사용자 reorder 안 됨 | ▲▼ 버튼은 폴백, 항상 동작 보장 |
| 같은 angle×format 중복 추가 | 사장님이 의도치 않게 같은 시나리오 두 번 | AddDialog가 미사용 slot만 표시 (10 - 현재 큐 길이) |
| 큐 갱신 race (사장님 동시 두 탭) | 마지막 write 우선 | 일반적 업데이트 정책 (last-write-wins). audit log 없는 v1 trade-off |
| revalidatePath 누락 | 큐 변경 후 UI stale | 모든 4개 server action에서 revalidate 호출 |

---

## 9. Next Steps

1. **`/pdca design partner-series-queue`** — Design v0.1
2. **design-validator** — Critical/High/Medium/Low 발굴 → v0.2 보강 (cycle #21~26 일관 패턴, 7번째 검증)
3. v0.2 승인 → **`/pdca do`** → S1~S11 구현
4. **`/pdca analyze`** → gap-detector ≥ 90% 검증
5. ≥ 90% 즉시 **`/pdca report`** → **🎯 7사이클 연속 single-pass 90s%** 마일스톤 도달

---

## 10. Cross-Cycle Impact

| Cycle | 영향 | 검증 |
|-------|------|------|
| #19 partner-promo | generator 0줄 변경 (R1 7번째) | git diff |
| #26 partner-auto-series | runner effectiveQueue 사용으로 변경 (~10 LOC). ROTATION_POOL은 fallback default 보존 (R2) | runner 단위 테스트 |
| #25 partner-content-formats | format(blog/card-news) 그대로 큐 항목에 사용 | 영향 없음 |
| #24 partner-rag-system | partner.profile derive는 변경 없음 (cycle #26 그대로) | 영향 없음 |
| #28 (예정) admin auto-series management | 본 사이클 큐 모델을 admin이 read+reset할 수 있게 확장 | 후속 사이클 의존 |
