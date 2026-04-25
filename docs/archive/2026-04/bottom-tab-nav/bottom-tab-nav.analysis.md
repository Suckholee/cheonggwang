---
template: analysis
version: 1.0
feature: bottom-tab-nav
date: 2026-04-21
author: gap-detector (bkit v1.5.8)
---

# bottom-tab-nav Gap Analysis

> **Project**: cheonggwang (v0.1.0) · Marketplace Track v1.1b 1번째 feature (PDCA cycle #8)
> **Plan**: [bottom-tab-nav.plan.md](../01-plan/features/bottom-tab-nav.plan.md) (v0.1 · 9 MVP)
> **Design**: [bottom-tab-nav.design.md](../02-design/features/bottom-tab-nav.design.md) (v0.1 · validator 93% GO · Major 2 / Minor 7)
> **Master Plan**: [marketplace-master-plan.md](../00-vision/marketplace-master-plan.md)

---

## Overall Match Rate: **99%**

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 99%                    │
├─────────────────────────────────────────────┤
│  MVP 9/9:            100%                   │
│  Out-of-Scope 8/8:     0% leakage           │
│  M1 Suspense fix:    ✅                     │
│  M2 Server→Client boundary fix: ✅          │
│  Validator 13-check: 100% (13/13)           │
│  Architecture / Convention: 100%            │
│  Side effect positive: user-repository BUG fix  │
│  Minor: 2 (doc polish · /logout scope notation)  │
└─────────────────────────────────────────────┘
```

**Critical**: 0 / **Major**: 0 / **Minor**: 2 (informational)
**Status**: ✅ >= 90% · iterate 불필요 · `/pdca report` 대기

---

## 1. MVP 9 Items — 9/9 (100%)

| # | 항목 | 구현 |
|---|------|------|
| 1 | BottomTabNavServer | `src/components/nav/BottomTabNav.tsx:32` async + cache(resolveRole) |
| 2 | TabNavClient | `TabNavClient.tsx:18` 'use client' + usePathname |
| 3 | TabItem | `TabItem.tsx` strokeWidth active 토글 + aria-current |
| 4 | 고객 5탭 | `tab-definitions.ts:24-35` (홈·청명찾기·받은견적·채팅·커뮤니티) |
| 5 | 청명 5탭 | `tab-definitions.ts:37-48` (홈·요청·작업·채팅·설정) |
| 6 | layout 통합 | `layout.tsx:33-38` main pb + Suspense wrap |
| 7 | placeholder 5 페이지 | /search·/chat·/community·/provider/works·/provider/settings |
| 8 | unread 배지 UI | `TabItem.tsx:15` showBadge · 기본값 0 |
| 9 | pathname active 감지 | `isActiveTab` exact/prefix 로직 |

---

## 2. Out-of-scope 누수 — 0/8 (0%)

- 실 unread count ❌ · scroll hide/show ❌ · 커스터마이징 ❌ · 애니메이션 ❌ · safe-area 심화 ❌ · 복수 role ❌ · 알림 센터 ❌ · 검색 통합 ❌

---

## 3. Validator Fix Verification

| ID | 항목 | 결과 |
|----|------|:---:|
| **M1** | layout Suspense wrapper | `layout.tsx:36-38` `<Suspense fallback={null}>` ✅ |
| **M2** | Server→Client boundary · LucideIcon serialization 회피 | `BottomTabNav.tsx:35-36` tabSetKey 문자열만 전달 + `TabNavClient.tsx:22` getTabs(key) 로컬 호출 ✅ |
| m1-m7 | Plan/Design doc polish | 구현 영향 없음 |

---

## 4. 13-Check Verify

| # | 항목 | Status |
|---|------|:---:|
| 1 | MVP 9/9 traceability | ✅ |
| 2 | Out-of-scope 8/8 | ✅ |
| 3 | M1 Suspense wrapper | ✅ |
| 4 | M2 Server→Client boundary | ✅ |
| 5 | cache() dedup (user.get + resolveRole) | ✅ 이중 적용 |
| 6 | **user-repository BUG fix** (providerId/contactPhone/roles 반환) | ✅ **side effect positive** |
| 7 | Hidden paths RegExp 4개 | ✅ `(\/|$)` alternation |
| 8 | Active 매칭 exact/prefix | ✅ `/` exact, 나머지 prefix |
| 9 | ARIA (aria-current·aria-label·aria-hidden) | ✅ 완전 |
| 10 | Safe-area env(safe-area-inset-bottom) | ✅ |
| 11 | `/logout` route (scope creep) | ⚠️ Minor · UX 필수 허용 |
| 12 | Build 22→27 routes | ✅ |
| 13 | Plan-Design 일관성 | ✅ |

---

## 5. 🐛 User-Repository Bug Fix (Positive Side Effect)

이번 cycle에서 `BottomTabNavServer`가 `user.providerId` 기반 role 판단을 필요로 하면서 기존 숨은 버그가 드러남:

**Before (v1.1까지 전 사이클)**
- `userRepository.get()` 반환 객체에 `providerId`, `contactPhone`, `roles` 필드 **미포함**
- 모든 caller (`/dashboard`, `/provider/profile`, `/provider/requests`, `/provider/requests/[id]/propose`) 에서 `user.providerId` 접근 시 **항상 undefined**
- 이론적으로 provider-aware 페이지들 모두 `/signup-provider` redirect로 fallback 중

**After (이번 cycle)**
- `user-repository.ts:21-34` 에서 `roles`, `providerId`, `contactPhone` 전부 명시 return
- `cache(getUserInner)` 적용으로 request-scope dedup

**영향받는 archived feature들이 이제 실제 동작**: provider-signup #5, quote-response #6, received-quotes #7 모두 배포 즉시 개선. 별도 re-analysis 불필요.

---

## 6. Scope Creep (허용)

`/logout` route handler 추가:
- Plan §3.1 MVP 9 항목 외
- 이유: 고객 5탭에 "설정"이 없어 로그아웃 진입점 부재 → UX 필수
- **조치**: Plan v0.2 업데이트 권장 (MVP 10번째 항목으로 추가 기록)

---

## 7. Architecture · Convention

| 항목 | Status |
|------|:---:|
| Server Component → Infrastructure(userRepo)·Auth | ✅ |
| Client Component → Domain types only | ✅ |
| Server→Client primitive string prop (LucideIcon 회피) | ✅ |
| Pure functions (isActiveTab·isHiddenPath·getTabs) | ✅ |
| Component PascalCase / util camelCase / const UPPER_SNAKE | ✅ |
| Import 순서 | ✅ |
| 폴더 구조 (components/nav/) | ✅ |

---

## 8. Minor Gaps (2건, informational)

| # | 항목 | Impact |
|---|------|------|
| m1 | Plan §3.1에 `/logout` route 추가 (Plan v0.2 notation) | doc only |
| m2 | Design v0.2에 M1/M2 구현 완료 명시 (Implementation Notes) | doc only |

---

## 9. Deployment Status

- ✅ `next build` — 27 routes (22 → 27 · 5 placeholder + /logout handler)
- ✅ Firestore rules/indexes 변경 없음
- ⏳ Smoke test 대기: 고객·청명 role별 5탭 렌더, 숨김 페이지 (/login·/signup-provider·/terms·/privacy) nav 미노출 확인

---

## 10. Next Steps

1. ✅ Check phase 완료 (99%)
2. → `/pdca report bottom-tab-nav`
3. → `/pdca archive bottom-tab-nav --summary`
4. → 다음 feature (Master Plan 기준):
   - v1.1b `provider-profile` reader (`/providers/{id}` stub 교체)
   - v1.1b `provider-dashboard` (청명 홈 Figma)
   - v1.1b `client-dashboard` (평균가·Top5 shell)
   - v1.2 `chat` (수락 후 실 협의 · 마켓 activation)
   - v1.2 `provider-search` (청명찾기 리스트/지도)

---

## Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 1.0 | 2026-04-21 | Gap analysis 완료 · Match Rate 99% · Critical 0 · Major 0 · Minor 2 (doc only) · M1/M2 fix 반영 확인 · user-repository BUG fix positive side effect 기록 | gap-detector |
