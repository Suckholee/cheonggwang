---
template: plan-plus
version: 0.1
feature: bottom-tab-nav
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
---

# Plan: 공통 하단 탭 네비게이션 (bottom-tab-nav)

> 생성: 2026-04-21
> 방법론: bkit Plan Plus (brainstorming-enhanced)
> 소속 Track: **Marketplace** ([Master Plan](../../00-vision/marketplace-master-plan.md))
> PDCA 사이클: #8 (v1.1b 첫 feature)
> 선행 사이클: received-quotes (v1.1 #3 · Match 99% archived · v1.1 루프 폐쇄 🏆)
> 다음 단계: `/pdca design bottom-tab-nav`

---

## 1. User Intent Discovery

### 1.1 배경
v1.1 마켓 루프 완성 후 Figma 의뢰인/청명 완성도 최종 조각. 사용자가 앱 내 모든 핵심 섹션(홈·청명찾기·받은견적·채팅·커뮤니티) 사이 이동을 자연스럽게 할 수 있도록 **cross-cutting shell**. 현재 의뢰인은 홈 `/`의 TodayCard 링크로만 /received 진입 가능 · 청명은 provider/profile 링크로만 /provider/requests 진입 가능. 탭 nav가 없어 UX 파편화.

### 1.2 핵심 목적
**role-aware 5탭 shell 구현** (Recommended · 고객·청명 다른 탭 구성)
- 고객: 홈 · 청명찾기 · 받은견적 · 채팅 · 커뮤니티
- 청명: 홈 · 요청 · 작업 · 채팅 · 설정
- 미구현 feature 탭은 "준비 중" placeholder
- Figma 1:1 (아이콘 + 라벨 + indigo active)

### 1.3 타겟 사용자
- **1차**: 앱을 반복 사용하는 모든 사용자 (고객 · 청명)
- **2차**: 개발자 (향후 feature 추가 시 탭에 즉시 연결)
- **3차**: 청광 운영자 (탭 구조 관측)

### 1.4 MVP 경계
- ✅ BottomTabNav Server shell (role 감지 + pathname 감지)
- ✅ 고객 role: 홈/청명찾기/받은견적/채팅/커뮤니티 5탭
- ✅ 청명 role: 홈/요청/작업/채팅/설정 5탭
- ✅ URL pathname 기반 active 자동 감지
- ✅ 미구현 feature placeholder 페이지 5개 (/search · /chat · /community · /provider/works · /provider/settings)
- ✅ 인증 필요 페이지에만 nav 노출 (로그인·약관·개인정보 제외)
- ✅ 채팅 탭 unread 배지 위치 (항상 0 표시 · v1.2에서 실 데이터 연결)
- ❌ 실 unread count (chat v1.2 의존)
- ❌ 탭 hide on scroll (모바일 UX 고도화 v1.2+)
- ❌ 탭 커스터마이징 (v2+)
- ❌ iOS safe-area 폴백 심화 (기본 `env(safe-area-inset-bottom)` CSS는 포함)
- ❌ 애니메이션 전환 (탭 간 fade/slide)

### 1.5 성공 기준
- 모든 role의 사용자가 5개 핵심 섹션 1-tap 이동 가능
- active 탭 시각 일관성 100% (Figma 일치)
- 미구현 탭 클릭 시 404 아닌 "준비 중" 안내 전달
- 인증 페이지(로그인·약관)에는 nav 표시 안 함 (clean landing UX)
- 향후 feature 추가 시 탭 구성에 대응 가능한 확장성

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | **role-aware 5탭 · placeholder 페이지** | **채택** |
| B | 고객 전용 nav (청명 별도 레이아웃) | 기각 |
| C | 단일 nav · role에 따라 탭 hide/disable | 기각 (UX 어색) |

### 2.1 채택 사유 (A)
- Figma 고객·청명 양쪽 1:1 구현 가능
- role-aware이 Master Plan route group 설계와 일치 (`(client)` vs `(provider)`)
- placeholder 페이지가 404보다 친절한 UX
- 향후 chat/community 등 실 구현 시 placeholder만 교체

### 2.2 기각 사유
**B 고객 전용 + 청명 별도 레이아웃**: 코드 중복 · 공통 shell 사라짐 · 향후 유지보수 비용
**C 단일 nav · 분기 hide**: role별 탭 구성이 달라 "홈"/"청명찾기"/"요청"이 공존 불가 · UI 어색

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함 (9개)
1. **BottomTabNav Server shell** — role + pathname 받아 TabNavClient 렌더
2. **TabNavClient Client component** — usePathname 기반 active 감지
3. **TabItem Client** — Link + Icon + Label + (optional) unread badge
4. **고객 5탭 정의** — 홈(/) · 청명찾기(/search) · 받은견적(/received) · 채팅(/chat) · 커뮤니티(/community)
5. **청명 5탭 정의** — 홈(/provider/profile) · 요청(/provider/requests) · 작업(/provider/works) · 채팅(/chat) · 설정(/provider/settings)
6. **layout.tsx 통합** — 인증 페이지 제외하고 전역 nav 삽입
7. **placeholder 페이지 5개** — /search · /chat · /community · /provider/works · /provider/settings
8. **채팅 unread 배지 placeholder** — 항상 0 · v1.2 실 연결 준비
9. **URL pathname active 감지** — 현재 경로 → 해당 탭 indigo 표시

### 3.2 Out of Scope → v1.1b 이상
| 항목 | 이동 이유 |
|------|----------|
| 실 unread count | chat (v1.2) 의존 |
| scroll 감지 hide/show | 모바일 UX 고도화 (v1.2+) |
| 탭 커스터마이징 | 사용자 설정 (v2+) |
| 애니메이션 전환 | 성능·복잡도 증가 |
| iOS safe-area 심화 | 기본 CSS로 충분 |
| 복수 role (client+provider 동시) | 1:1 관계 유지 (v2+ 1:N 시 검토) |
| 알림 센터 탭 | 알림 시스템 v2+ |
| 검색 통합 | 청명찾기 feature v1.2+ |

### 3.3 기존 기능 영향
- **layout.tsx**: RootLayout에 BottomTabNav 삽입 (pathname 체크로 인증 페이지에서만 hide)
- **(auth) 그룹 레이아웃**: 영향 없음 (인증 페이지에는 nav 표시 안 함 로직)
- **기존 페이지**: `pb-16` (56px bottom padding) 내부 컨테이너에 적용 (이미 `/`, `/quote/*`, `/received/*` 등에서 사용 중 — 일부는 `pb-24` · 확인 후 일관화)
- **proxy.ts**: matcher 변경 없음 (placeholder 페이지도 `/search`, `/chat`, `/community`는 공개, `/provider/*`는 기존 matcher 유지)
- **Firestore**: 변경 없음
- **Firebase rules**: 변경 없음

---

## 4. Architecture

### 4.1 스택
- Next.js 16 App Router + React 19 + Tailwind 4
- lucide-react (provider-signup 이후 도입)
- `usePathname()` from `next/navigation` (Client only)

### 4.2 파일 구조

```
src/
├── components/nav/                      🆕 폴더
│   ├── BottomTabNav.tsx                  🆕 Server shell (role + pathname 판단 + Client hand-off)
│   ├── TabNavClient.tsx                  🆕 Client wrapper (usePathname active 감지)
│   ├── TabItem.tsx                       🆕 단일 탭 (Link + Icon + Label + Badge)
│   └── tab-definitions.ts                🆕 고객·청명 탭 데이터 (label·href·icon·badge 키)
├── app/
│   ├── layout.tsx                        🔄 BottomTabNav 전역 삽입 (auth 페이지 제외 로직)
│   ├── search/page.tsx                   🆕 placeholder
│   ├── chat/page.tsx                     🆕 placeholder
│   ├── community/page.tsx                🆕 placeholder
│   ├── provider/works/page.tsx           🆕 placeholder
│   └── provider/settings/page.tsx        🆕 placeholder
└── lib/
    └── (변경 없음)

firestore.rules                           (변경 없음)
firestore.indexes.json                    (변경 없음)
proxy.ts                                  (변경 없음 — 기존 /provider/:path*로 works/settings 보호됨)
```

### 4.3 데이터 흐름

```
[RootLayout]
  → children render
  → <BottomTabNav pathname={current}>  (Server)
       │ cookies() + verifySessionCookie + userRepository.get(uid)
       │ role 판단 (providerId 있음 → provider, 없음 → client, 세션 없음 → null)
       │ auth 페이지 감지 (/login, /signup-provider, /terms, /privacy) → 렌더 안 함
       │
       └─ <TabNavClient role=... items=... />  (Client 경계)
             │ usePathname() → active 탭 매칭
             │ .map(item => <TabItem ...active={isActive} />)
             │
             └─ <TabItem> (Client)
                  <Link href={item.href}>
                    <Icon ... className={active ? 'indigo-600' : 'zinc-500'}/>
                    <label>{item.label}</label>
                    {item.badgeCount > 0 && <Badge>{item.badgeCount}</Badge>}
                  </Link>
```

### 4.4 role 판단 로직

```ts
// BottomTabNav.tsx (Server)
async function resolveRole(): Promise<'client' | 'provider' | null> {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const uid = await verifySessionCookie(session);
    const user = await userRepository.get(uid);
    const providerId = (user as { providerId?: string } | null)?.providerId;
    return providerId ? 'provider' : 'client';
  } catch {
    return null;
  }
}

const HIDDEN_PATHS = ['/login', '/signup-provider', '/terms', '/privacy'];
function isHiddenPath(pathname: string): boolean {
  return HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
```

### 4.5 active 탭 매칭

`usePathname()` 으로 현재 경로 획득. 각 TabItem의 `match` 규칙으로 판단:
- exact: `/` (홈)만 exact match
- prefix: `/received/123`도 `/received` 탭 active 로 판단

```ts
function isActiveTab(currentPath: string, item: TabItem): boolean {
  if (item.href === '/') return currentPath === '/';
  if (item.href === '/provider/profile') return currentPath.startsWith('/provider/profile');
  return currentPath.startsWith(item.href);
}
```

### 4.6 탭 데이터 구조

```ts
// components/nav/tab-definitions.ts
import { Home, Search, ClipboardList, MessageCircle, Users, Inbox, Briefcase, Settings } from 'lucide-react';

export interface TabDefinition {
  href: string;
  label: string;
  Icon: LucideIcon;
  badgeKey?: 'chat-unread';   // 동적 데이터 키 (현재는 항상 0)
  exact?: boolean;
}

export const CLIENT_TABS: TabDefinition[] = [
  { href: '/', label: '홈', Icon: Home, exact: true },
  { href: '/search', label: '청명찾기', Icon: Search },
  { href: '/received', label: '받은견적', Icon: ClipboardList },
  { href: '/chat', label: '채팅', Icon: MessageCircle, badgeKey: 'chat-unread' },
  { href: '/community', label: '커뮤니티', Icon: Users },
];

export const PROVIDER_TABS: TabDefinition[] = [
  { href: '/provider/profile', label: '홈', Icon: Home },
  { href: '/provider/requests', label: '요청', Icon: Inbox },
  { href: '/provider/works', label: '작업', Icon: Briefcase },
  { href: '/chat', label: '채팅', Icon: MessageCircle, badgeKey: 'chat-unread' },
  { href: '/provider/settings', label: '설정', Icon: Settings },
];
```

### 4.7 Placeholder 페이지 구조

```tsx
// 공통 패턴 (/search, /chat, /community, /provider/works, /provider/settings)
export default function SearchPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="mb-2 text-2xl font-bold">청명찾기</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        준비 중입니다. v1.2에 추가됩니다.
      </p>
    </div>
  );
}
```

---

## 5. Data Model

변경 없음. 기존 users.providerId 필드로 role 판단.

---

## 6. 주요 플로우

### 6.1 role 감지 + 탭 렌더
1. Layout에서 `<BottomTabNav />` 렌더 (Server)
2. Server: cookies → uid → providerId → role 결정
3. auth 페이지 확인 → 숨김 OR 렌더
4. Client: `usePathname()` + 탭 데이터로 active 표시
5. TabItem: Link + Icon(role-based) + Label + Badge(0)

### 6.2 사용자 이동
- 고객이 "청명찾기" 탭 클릭 → `/search` → placeholder 표시
- 청명이 "설정" 탭 클릭 → `/provider/settings` → placeholder
- 미구현 feature에도 클릭 가능하지만 "준비 중" 안내

### 6.3 pathname 변경 시
- Link 이동 → URL 변경 → `usePathname()` 업데이트 → 해당 탭 indigo → 기존 탭 gray

---

## 7. 비용·성능

### 7.1 성능
- BottomTabNav Server: verifySessionCookie + userRepository.get = ~80ms (캐시 가능 · v1.2에서 React cache() 적용 후보)
- TabNavClient: pathname 변경마다 re-render (값만 다르므로 경량)
- Layout에 삽입되므로 모든 페이지에 공통 cost

### 7.2 비용
- Firestore read: users 1회/페이지 (세션 유지 중). 월 1000 사용자 × 100페이지 이동 = 100k read ≈ $0.06
- React cache()로 request-level 캐싱 시 페이지당 1회로 제한 가능

---

## 8. Open Questions (Design 단계에서 해소)

| # | 질문 | 기본 방향 |
|---|------|----------|
| Q1 | layout.tsx에서 auth 페이지 감지 방법 | `usePathname` 사용 불가 (Server Layout) → `next/navigation` `headers()`/`cookies()` 활용 or children을 Client에서 감지. 대안: auth group layout에 별도 BottomTabNav 삽입 안 함 |
| Q2 | React cache()로 users.get dedup | MVP 포함 vs v1.1c 이연. **기본: MVP 포함** (`cache(fn)` 적용 한 줄) |
| Q3 | 활성 탭 매칭 — exact vs prefix 구별 | Design 단계에서 `isActiveTab()` util 확정 |
| Q4 | `pb-16` padding 일관화 | 기존 페이지에 `pb-16`/`pb-24` 혼재. Design에서 `--bottom-nav-height` CSS 변수 + `pb-nav` util 제안 가능 |
| Q5 | iOS safe-area | `env(safe-area-inset-bottom)` 적용. 기본 padding 유지 |
| Q6 | 로그아웃 상태에서도 nav 노출? | **No**. 비로그인 시 null return (nav 숨김) |
| Q7 | 청명 role "홈" 탭 — /provider/profile vs /provider (인덱스) | /provider/profile 유지 (현재 stub, v1.1b provider-dashboard에서 교체) |
| Q8 | chat placeholder 공용 /chat | 고객·청명 모두 /chat 사용 → chat feature 자체가 role-aware로 구현될 예정 (v1.2) |

---

## 9. Brainstorming Log

### Phase 1 결정
- role-aware 5탭 채택
- placeholder 페이지 방식 (disabled/hide 기각)

### Phase 2
- A 채택 (role-aware) · B/C 기각

### Phase 3 YAGNI
- MVP 9 · Out-of-scope 8 확정
- 채팅 unread 배지 placeholder 포함 (v1.2 준비)
- pathname 기반 auto detect

### Phase 4
- 파일 구조 승인 (BottomTabNav Server + TabNavClient + TabItem)

---

## 10. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Plan Plus 초안. role-aware 5탭 (client·provider 다른 구성). 9 MVP · 8 out-of-scope. placeholder 페이지 5개. URL pathname 기반 active 감지. 다음: `/pdca design bottom-tab-nav` | Seokho Lee |
