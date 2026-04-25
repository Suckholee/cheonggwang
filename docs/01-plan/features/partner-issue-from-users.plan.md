# Plan · partner-issue-from-users

> **Status**: Draft v1.0 (Plan Plus completed)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.10
> **Author**: Seokho Lee
> **Date**: 2026-04-26
> **PDCA Cycle**: #22
> **Method**: Plan Plus (Phases 0-5 completed)

---

## 1. Summary

### 1.1 한 줄 요약
운영자가 청광 회원(client) 명단과 가입 신청자 명단을 한 화면에서 토글하면서 카드 클릭으로 즉시 의뢰업체 발급/승인할 수 있는 콘솔.

### 1.2 배경
- **cycle #20**: `/admin/partners/new`에 "이메일 검색 → uid 발급" 폼 도입 (PartnerIssueForm). 사용자가 이메일을 외워서 직접 입력해야 함.
- **cycle #21**: `/signup-partner` 공개 가입 채널 + `/admin/partners` 상단 "대기 신청" 섹션. 자율 가입자가 있어야 명단이 채워짐 — 가입자 0명이면 텅 빔.
- **사용자 의도**(2026-04-26): "의뢰업체 명단이 누가 있는지를 확인하고 그 업체를 누르면서 파트너 등록 절차가 진행되는게 UX상 더 편할거같아"
- 즉 **admin-driven 발급 흐름** — 회원 명단을 보면서 직접 골라서 발급. 자율 가입과 공존.

### 1.3 목표
1. `/admin/partners/new`를 **명단 클릭 → 모달 발급** 형태로 전면 개편
2. 자율 가입(`/signup-partner` + 대기 신청 섹션)은 **그대로 보존** — 두 경로 공존
3. 운영자가 한 화면에서 **연속 발급**할 수 있는 UX (검색·페이지 상태 보존)
4. 카드 클릭으로 발급 진행이 cycle #20·#21에서 만든 발급 API를 변경 없이 재활용

### 1.4 비목표
- API 레이어 변경 (cycle #20 POST `/api/admin/partners`, cycle #21 approve route 모두 그대로)
- `users` 컬렉션 스키마 변경
- 발급 흐름 자체 변경 (DEFAULT_AUTO_PUBLISH 강제, status='active' 등 cycle #20 invariant 유지)
- 자율 가입 흐름(`/signup-partner`) 변경

---

## 2. User Intent Discovery (Phase 1)

### 2.1 Core Purpose
**운영자가 회원 명단(또는 신청자 명단)에서 직접 클릭으로 의뢰업체 발급**

> 사용자 답변: "전체 명단과 신청자 명단을 패널 전환하면서 확인할수 있게"

이메일 검색 폼은 명단에 없는 사용자(예: Firebase Auth만 있고 firestore users doc 없는 케이스) 발급용 폴백으로 격하.

### 2.2 Target Users
**Admin only** — 운영자(`admin/test6274`) 1명. cycle #20 admin-console의 인증 흐름 그대로.

### 2.3 Success Criteria
| ID | 기준 | 측정 방법 |
|---|---|---|
| SC1 | 운영자가 명단에서 클릭 → 발급 완료까지 **≤ 3 클릭** | UX flow 테스트 |
| SC2 | 발급 후 명단으로 즉시 복귀 + 다음 발급 가능 (router.refresh) | 모달 닫힘 + 명단 갱신 확인 |
| SC3 | 이미 partner/applicant인 사용자는 클릭으로 중복 발급 불가 | 카드 disabled + 배지 |
| SC4 | 페이지 새로고침해도 회원 명단 1페이지 정확히 로드 | cursor pagination 결정성 |
| SC5 | cycle #20·#21 API 변경 0건 | git diff 확인 |

### 2.4 Constraints
- **Auth**: cycle #20 admin session cookie (jose HS256)
- **Firestore**: users 컬렉션의 readability — admin claim 또는 server-only 호출만
- **회원 수 가정**: v1에서 청광 회원 수 ≤ 수백 명. cursor + 20건/page로 충분.
- **Next.js 16 cacheComponents**: 페이지는 Suspense + connection() 패턴

---

## 3. Alternatives Explored (Phase 2)

### Approach A — 단일 페이지 + 모달 ✅ **Selected**
- 명단 그리드 + 카드 클릭 시 모달 오픈 → 발급 폼 → POST 후 모달 닫고 명단 복귀
- **Pros**: SPA-like UX, 명단 검색 상태 보존, 연속 발급에 유리
- **Cons**: 모달 ↔ 명단 동기화 (router.refresh) 필요, URL 공유 불가

### Approach B — 명단 페이지 + 별도 발급 페이지
- `/admin/partners/new`(명단) → 카드 클릭 → `/admin/partners/new/issue/[uid]`(발급 폼)
- **Pros**: URL 공유 가능, 새로고침 안전
- **Cons**: 페이지 이동 → 명단의 검색·페이지·패널 상태 초기화. 연속 발급 시 매번 뒤로가기

### Approach C — 모달 + URL query 동기화
- A + `?uid=...&applicantId=...` 쿼리로 모달 상태 영속화
- **Pros**: A의 UX + 새로고침 안전 + 공유 가능
- **Cons**: 코드 복잡도 ↑, "발급 행위" URL 공유 가치 낮음 (1회성 admin 액션)

**선택 이유**: cycle #20 PartnerIssueForm Step 2(추가 필드 입력)를 모달로 재포장하는 게 가장 적은 변경. 발급은 "공유성"보다 "빠른 연속 처리"가 가치 높은 admin 액션.

---

## 4. YAGNI Review (Phase 3)

### 4.1 In-Scope (v1)

#### 기본 (필수, 질문 외 자동 포함)
- B1 3-탭 토글 (전체 명단 | 신청자 명단 | 이메일 검색)
- B2 카드 그리드 + 발급 상태 배지 + disabled 처리
- B3 발급 모달 (매장명·카테고리·지역·소개 입력)
- B4 발급 후 명단 복귀 + 성공 toast (router.refresh)
- B5 신청자 카드 클릭 = cycle #21 approve API 재사용
- B6 전체 명단 카드 클릭 = cycle #20 POST `/api/admin/partners` 재사용

#### 사용자 multiSelect 선택 (전체 명단 패널)
- F1 페이징 (20건/page, cursor)
- F2 정렬 토글 (최신 가입순 ↔ 이름순)
- F3 createdAt 범위 필터 ("최근 7일" 등)

#### 사용자 multiSelect 선택 (신청자·모달·폴백)
- F4 신청자 카드 preview (매장명·카테고리·지역·신청일)
- F5 신청자 prefill 모달 (read-only preview, R2)
- F6 contactPhone 표시 (카드·모달)
- F7 이메일 검색 폴백 탭 유지 (cycle #20 PartnerIssueForm 재포장)

### 4.2 Out of Scope (deferred to v2+)
| ID | 항목 | 사유 |
|---|---|---|
| O1 | 이메일·이름 substring 검색 | v1 회원 수 ≤ 수백 가정. 늘어나면 v2 |
| O2 | 신청자 모달에서 정보 수정 후 발급 | cycle #21 approve route는 신청서 그대로 변환. 수정하려면 route 수정 + body 수용 필요. v2. v1은 read-only preview |
| O3 | 발급 시 autoPublish 옵션 설정 | cycle #20 R10 — DEFAULT_AUTO_PUBLISH 강제. 발급 후 partner 편집 페이지에서 변경 |
| O4 | isCheonggwangPartner(이미 청광 청소 받은 client) 강조 | 발급 후보로서 의미 있을 수 있으나 v1에서 우선순위 낮음 |
| O5 | 다국어 | 한국어 단일 |
| O6 | 신청자 거절 액션 (모달에서) | cycle #21에서 이미 `/admin/partners/applicants/[id]`에 있음 — 중복 |
| O7 | 키보드 navigation (Enter·ESC 단축키) | 접근성은 aria 속성 + Tab만으로 v1 충분. v2 |
| O8 | 발급 결과 partner 상세로 자동 redirect | 명단 복귀가 연속 발급에 유리. 사용자가 명시적으로 상세 보고 싶으면 명단의 ✅ 카드 클릭 (= 이미 발급된 partner 상세로 navigate v2) |
| O9 | URL query 동기화 (Approach C) | 발급 행위는 1회성 admin 액션, 공유 가치 낮음 |
| O10 | 검색 결과 즉시 발급 (검색 박스에 이메일 + Enter) | F1 검색 자체가 v1 OOS이므로 자동 OOS |

---

## 5. Architecture & Components (Phase 4)

### 5.1 아키텍처 개요
```
/admin/partners/new (server component, requireAdminPage)
  └── <IssuanceConsole /> (client, 상태·모달 관리)
        ├── 탭: [전체 명단] [신청자 명단] [이메일 검색]
        ├── <ClientUsersPanel> (default)
        │     server action: listClientsPage(cursor, sort, dateRange)
        │     → 카드 그리드 + 페이징·정렬·날짜 필터
        │     카드 클릭 → IssueModal(kind='fresh', user)
        ├── <PendingApplicantsPanel>
        │     server action: listPendingApplicantsForIssuance()
        │     → 신청자 카드 (매장명·카테고리·지역 preview)
        │     카드 클릭 → IssueModal(kind='approve', applicant)
        └── <EmailLookupFallbackPanel>
              기존 PartnerIssueForm 그대로 (cycle #20 검증 흐름)

  <IssueModal />
    kind='fresh'   → POST /api/admin/partners (cycle #20)
    kind='approve' → POST /api/admin/partners/applicants/[id]/approve (cycle #21)
    성공 → toast + 모달 닫기 + router.refresh()
```

### 5.2 신규 파일 (6)
| 파일 | 역할 |
|------|------|
| `src/types/admin-issuance.ts` | `ClientWithIssuanceStatus = UserProfile & { partnerId | null; applicantStatus | null }` |
| `src/app/actions/partner-issuance-actions.ts` | server action `listClientsPage`, `listPendingApplicantsForIssuance` (state join) |
| `src/components/admin/IssuanceConsole.tsx` | 3-탭 토글 + 모달 상태 (client) |
| `src/components/admin/ClientUsersPanel.tsx` | 카드 그리드 + 페이징·정렬·날짜 필터 (client) |
| `src/components/admin/PendingApplicantsPanel.tsx` | 신청자 카드 (preview · prefill 트리거) (client) |
| `src/components/admin/IssueModal.tsx` | 발급 모달, kind 분기 (client) |

### 5.3 수정 파일 (3)
| 파일 | 변경 |
|------|------|
| `src/lib/firebase/user-repository.ts` | `listClientsPage(cursor, sort, dateRange)` 메서드 추가 |
| `src/app/admin/partners/new/page.tsx` | `<IssuanceConsole />` 호스팅 (Suspense + connection) |
| `src/components/admin/PartnerIssueForm.tsx` | 폴백 탭 안에 그대로 wrap (외부 wrapper만 추가) |

### 5.4 재활용 (변경 없음)
- `partnerRepository.listAll` / `getByOwnerUid`
- `partnerApplicantRepository.listPending` / `getById`
- `POST /api/admin/partners` (cycle #20 발급 API)
- `POST /api/admin/partners/applicants/[applicantId]/approve` (cycle #21 승인 API)

### 5.5 Firestore 신규 인덱스
| 인덱스 | 용도 |
|--------|------|
| `users (displayName asc)` | 이름순 정렬 (단일 필드 — 자동 인덱스로 충분할 수도) |
| `users (createdAt desc)` | 최신 가입순 (자동 인덱스) |
| `users` array-contains 'client' + `createdAt desc` | client role 필터 + 정렬 (compound 필요할 수도) |

> array-contains와 orderBy 조합은 Firestore 자동 인덱스로 처리되는 경우 많음 — 실제 deploy 시 콘솔이 필요한 인덱스 안내. P1 단계에서 firebase deploy --dry-run 검증.

---

## 6. Data Flow (Phase 4-3)

### 6.1 전체 명단 발급 흐름
1. `/admin/partners/new` 진입 → IssuanceConsole 마운트
2. server action `listClientsPage({cursor:null, sort:'latest', dateRange:null})`
   - users where roles array-contains 'client', orderBy createdAt desc, limit 21
   - 병렬: partnerRepository.listAll() + partnerApplicantRepository.listPending()
   - uid → {partnerId | applicantStatus} 머지 → ClientWithIssuanceStatus[20]
   - nextCursor = base64(`${lastDoc.createdAtMs}:${lastDoc.uid}`)
3. 카드 그리드 렌더 (배지·disabled)
4. 운영자가 활성 카드 클릭 → IssueModal(kind='fresh', user)
5. 매장명·카테고리·지역·소개 입력 → POST /api/admin/partners (cycle #20)
6. 201 응답 → toast + 모달 닫기 + router.refresh()
7. 명단 갱신 (방금 발급한 사용자는 ✅ 배지 + disabled)

### 6.2 신청자 발급 흐름
1. "신청자 명단" 탭 클릭 → server action `listPendingApplicantsForIssuance()`
2. 카드: 매장명·카테고리·지역·신청일·이메일·연락처
3. 카드 클릭 → IssueModal(kind='approve', applicant) — read-only preview
4. [승인] → POST /api/admin/partners/applicants/[id]/approve (cycle #21, 변경 없음)
5. 201 응답 → toast + 모달 닫기 + router.refresh()
6. 신청자 패널에서 사라지고, 전체 명단 패널에서 ✅ 배지로 표시

### 6.3 이메일 검색 폴백
1. "이메일 검색" 탭 클릭 → 기존 PartnerIssueForm 노출 (cycle #20 흐름 그대로)
2. firestore users doc 없는 Auth-only 사용자 발급용 escape hatch

---

## 7. Plan Reconciliation (R1–R6)

| ID | Invariant | 영향 |
|---|---|---|
| R1 | cycle #20·#21 발급 API 변경 0건 | UI 레이어만 변경, 기존 검증된 흐름 보존 |
| R2 | 신청자 모달은 read-only preview | cycle #21 approve route는 신청서 그대로 변환. admin 수정은 v2 OOS |
| R3 | listClientsPage 안에서 partners·applicants 한 번씩만 fetch | N+1 회피. partners·applicants ≤ 수백 가정 |
| R4 | cursor 인코딩 = base64(`${createdAtMs}:${uid}`) | 정렬·dateRange 변경 시 cursor 무효화 |
| R5 | dateRange 활성 시 sort='latest' 강제 | Firestore inequality + orderBy 호환성 회피, 명시적 룰 |
| R6 | 발급 직후 router.refresh() | Suspense 재실행으로 명단 즉시 동기화 (낙관적 UI 미사용) |

---

## 8. Implementation Order (S1 ~ S5)

### S1 — Domain & Repository
- `src/types/admin-issuance.ts` 신규 (ClientWithIssuanceStatus 타입)
- `src/lib/firebase/user-repository.ts` 수정 (listClientsPage 메서드)

### S2 — Server Actions
- `src/app/actions/partner-issuance-actions.ts` 신규
  - `listClientsPage(cursor, sort, dateRange)` — admin 가드 + listClientsPage + state join
  - `listPendingApplicantsForIssuance()` — partnerApplicantRepository.listPending 래퍼

### S3 — UI Panels
- `src/components/admin/ClientUsersPanel.tsx` 신규
- `src/components/admin/PendingApplicantsPanel.tsx` 신규

### S4 — Modal & Console
- `src/components/admin/IssueModal.tsx` 신규
- `src/components/admin/IssuanceConsole.tsx` 신규 (3-탭 + 모달 상태)

### S5 — Integration
- `src/app/admin/partners/new/page.tsx` 수정 (IssuanceConsole 호스팅)
- `src/components/admin/PartnerIssueForm.tsx`는 폴백 탭 안에 그대로 wrap (수정 최소)
- 빌드 + tsc 검증 + git push (Vercel auto-deploy)

---

## 9. Acceptance Criteria

### 9.1 Functional (12)
| ID | 기준 |
|----|------|
| AC1 | `/admin/partners/new` 진입 시 "전체 명단" 탭 default로 활성, client 회원 카드 그리드 표시 |
| AC2 | 카드에 displayName · email · createdAt · contactPhone(있으면) 표시 |
| AC3 | 이미 partner 발급된 사용자 카드: ✅ 배지 + disabled (클릭 차단) |
| AC4 | pending applicant인 사용자 카드: ⏳ 배지 + disabled |
| AC5 | 페이징 [이전][다음] 정상 동작, 20건/page, cursor 결정성 |
| AC6 | 정렬 토글 클릭 시 sort 변경 + cursor 무효화 + 페이지 1로 리셋 |
| AC7 | createdAt 범위 필터 적용 시 sort='latest' 자동 강제 + cursor 리셋 |
| AC8 | "신청자 명단" 탭 전환 시 pending applicants 카드 그리드 표시 (매장명·카테고리·지역 preview) |
| AC9 | 신청자 카드 클릭 → 모달 prefill (read-only) → [승인] → cycle #21 approve API 호출 → 201 → toast + 명단 갱신 |
| AC10 | 전체 명단 카드 클릭 → 모달 (빈 입력란) → 매장명 입력 후 [발급] → cycle #20 API 호출 → 201 → toast + 명단 갱신 |
| AC11 | "이메일 검색" 탭에서 기존 PartnerIssueForm 흐름 그대로 동작 |
| AC12 | 발급/승인 후 같은 페이지에서 다음 발급 즉시 진행 가능 (검색·페이지·정렬 상태 보존) |

### 9.2 Non-functional (3)
| ID | 기준 |
|----|------|
| AC13 | tsc·build 성공, 0 errors |
| AC14 | cycle #20·#21 발급 API 코드 변경 0건 (git diff `/api/admin/partners*` empty) |
| AC15 | cycle #21 자율 가입 흐름(`/signup-partner` + `/admin/partners` 대기 신청 섹션) 회귀 없음 |

---

## 10. Open Questions

| ID | 질문 | 잠정 결정 |
|----|------|-----------|
| OQ1 | 회원 수 1000+ 도달 시 검색 박스 추가 시점 | v2 트리거: 페이지 1 카드 그리드에서 원하는 사용자 못 찾는 비율 ≥ 30% 또는 회원 수 ≥ 500 |
| OQ2 | 신청자 모달에서 거절 액션 (cycle #21 reject API 호출) 추가 여부 | v1 OOS — cycle #21 `/admin/partners/applicants/[id]` 페이지에 이미 있음. v2에 동일 모달에서 거절 가능하게 통합 검토 |
| OQ3 | 발급 후 명단 복귀 vs 상세 redirect 옵션 | v1 명단 복귀 default. v2에서 사용자 토글 옵션 |
| OQ4 | "이메일 검색" 탭 사용 빈도가 낮으면 v2에서 제거 | v1 그대로 유지 — Auth-only 사용자에 대한 escape hatch로 가치 있음 |

---

## 11. Brainstorming Log

### Phase 1
- Q1: 후보 풀 → "전체 명단과 신청자 명단을 패널 전환" (사용자 custom answer, 두 풀 모두 노출)
- Q2: 전체 명단 = client roles only
- Q3: 발급/신청 상태 = 배지 + disabled

### Phase 2
- Approach A 선택 (단일 페이지 + 모달) — 빠른 연속 발급 우선

### Phase 3
- multiSelect (전체 명단): F1 페이징 + F2 정렬 + F3 dateRange
- multiSelect (신청자·모달·폴백): F4 신청자 preview + F5 prefill + F6 contactPhone + F7 폴백 폼 유지
- 명시적 deselected: 이메일·이름 검색 (회원 수 가정)

### Phase 4
- 4-1 Architecture: 적절함 통과
- 4-2 컴포넌트 구조: 6 신규 + 3 수정 — 적절함 통과
- 4-3 데이터 흐름: R1~R6 invariant 동의 — Plan 문서 작성 진행

---

## 12. Next Steps

```
/pdca design partner-issue-from-users
```

Plan Plus 결과를 기반으로 design 문서 작성 → design-validator 검증 → Do.
