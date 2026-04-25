---
template: design
version: 0.1
feature: bottom-tab-nav
date: 2026-04-21
author: Seokho Lee
project: cheonggwang
version-proj: 0.1.0
---

# bottom-tab-nav Design Document

> **Summary**: v1.1 마켓 루프 완성 후 Figma 완성도 최종 조각. role-aware 5탭 하단 네비게이션 · 고객(홈·청명찾기·받은견적·채팅·커뮤니티) vs 청명(홈·요청·작업·채팅·설정) · 미구현 feature placeholder 페이지. Server 경계에서 role 판단 + Client에서 usePathname active 감지.
>
> **Project**: cheonggwang
> **Version**: 0.1.0
> **Status**: Draft
> **Plan**: [bottom-tab-nav.plan.md](../../01-plan/features/bottom-tab-nav.plan.md)
> **Master Plan**: [marketplace-master-plan.md](../../00-vision/marketplace-master-plan.md)

---

## 0. Open Questions 해소 (Plan §8)

| Q | 해소 |
|---|------|
| **Q1** layout.tsx에서 auth 페이지 감지 | Server Component는 `usePathname()` 불가 → Client wrapper `TabNavClient`에서 `usePathname()` 판단. hidden path면 `return null` (전체 nav 렌더 생략). Server는 role만 결정. |
| **Q2** users.get dedup (`cache()`) | **MVP 포함**. `lib/firebase/user-repository.ts` `get()`을 React `cache(fn)`으로 래핑 — request-level dedup. 이미 /received, /provider/requests 등에서 같은 호출. |
| **Q3** active 매칭 — exact vs prefix | `isActiveTab(pathname, tab)`: `exact: true` (고객 홈 `/`) 이면 `===`, 아니면 `startsWith(tab.href + '/' OR ===)`. `/received/{id}` → `/received` 탭 active. |
| **Q4** `pb-16` padding 일관화 | `globals.css`에 CSS 변수 `--bottom-nav-height: 64px` 정의 + Tailwind arbitrary class 또는 `pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]` 사용. 각 페이지 컨테이너는 기존 `pb-16` 유지 (64px)하고 **TabNavClient에 `env(safe-area-inset-bottom)` 추가로 iOS 홈 인디케이터 여백 확보**. |
| **Q5** iOS safe-area | `padding-bottom: env(safe-area-inset-bottom, 0)` — TabNavClient nav 바 내부 bottom padding에 삽입. |
| **Q6** 로그아웃 상태 nav 노출 | **No**. BottomTabNavServer에서 `role === null`이면 Client wrapper에 `role=null` 전달 → TabNavClient에서 null 렌더. |
| **Q7** 청명 "홈" 탭 URL | `/provider/profile` 유지. v1.1b provider-dashboard에서 `/provider`로 리팩토링 후 redirect 처리 예정. |
| **Q8** chat 공용 `/chat` | 양 role 공통 `/chat` placeholder. v1.2 chat feature에서 role-aware 분기 내부 처리. |

---

## 1. Overview

### 1.1 Design Goals
- role-aware 5탭 Figma 1:1 렌더링
- 모든 인증 페이지에 전역 삽입 · 인증 제외 페이지는 자동 숨김
- Server-Client 경계 명확 (Server: role + 데이터 · Client: pathname + 인터랙션)
- 향후 unread 배지 · feature 추가 시 탭 구성 변경 용이

### 1.2 Design Principles
- **Server → Client hand-off**: role fetch는 Server · pathname·active는 Client
- **React cache()**: user-repository.get을 request scope로 dedup — 모든 페이지에서 재호출 방지
- **CSS 변수**: `--bottom-nav-height` 단일 값으로 padding 일관화
- **Zero scope creep**: unread count 자리만 만들고 v1.2 chat에서 실 연결
- **Reuse over rewrite**: auth-admin.ts (verifySessionCookie) · user-repository.ts · lucide-react 전부 재활용

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────┐
│ RootLayout (Server)                                │
│  <body className="flex flex-col">                  │
│    <main className="flex-1 pb-nav">                │
│      {children}                                    │
│    </main>                                         │
│    <BottomTabNavServer />  ← 항상 렌더, 내부에서 판단 │
│  </body>                                           │
└────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────┐
│ BottomTabNavServer (Server Component)              │
│  const role = await resolveRole();                 │
│  if (role === null) return null;                   │
│  const tabs = role === 'provider' ? PROVIDER_TABS  │
│                                    : CLIENT_TABS;  │
│  return <TabNavClient role={role} tabs={tabs} />; │
└────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────┐
│ TabNavClient (Client Component)                    │
│  'use client'                                      │
│  const pathname = usePathname();                   │
│  if (isHiddenPath(pathname)) return null;          │
│  return (                                           │
│    <nav className="fixed bottom-0 ...">            │
│      {tabs.map((t) =>                              │
│        <TabItem                                    │
│          key={t.href}                              │
│          tab={t}                                   │
│          active={isActiveTab(pathname, t)}        │
│        />                                          │
│      )}                                            │
│    </nav>                                          │
│  )                                                 │
└────────────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────┐
│ TabItem (Client Component)                         │
│  <Link href={tab.href}>                            │
│    <Icon />                                        │
│    <span>{tab.label}</span>                        │
│    {tab.badgeKey === 'chat-unread' &&              │
│      badgeCount > 0 && <UnreadDot />}              │
│  </Link>                                           │
└────────────────────────────────────────────────────┘
```

### 2.2 role 결정 로직 (Server)

```ts
import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, tryVerifySessionCookie } from "@/lib/firebase/auth-admin";
import { userRepository } from "@/lib/firebase/user-repository";

export const resolveRole = cache(async (): Promise<'client' | 'provider' | null> => {
  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE_NAME)?.value;
  const uid = await tryVerifySessionCookie(session);
  if (!uid) return null;
  const user = await userRepository.get(uid);
  const providerId = (user as { providerId?: string } | null)?.providerId;
  return providerId ? 'provider' : 'client';
});
```

`cache()`로 request-level dedup. 같은 요청에서 여러 번 호출돼도 실 호출은 1회.

### 2.3 Hidden path 판단 (Client)

```ts
const HIDDEN_PATTERNS: readonly RegExp[] = [
  /^\/login(\/|$)/,
  /^\/signup-provider(\/|$)/,
  /^\/terms(\/|$)/,
  /^\/privacy(\/|$)/,
];

function isHiddenPath(pathname: string): boolean {
  return HIDDEN_PATTERNS.some((p) => p.test(pathname));
}
```

### 2.4 Active 매칭 (Client)

```ts
function isActiveTab(pathname: string, tab: TabDefinition): boolean {
  if (tab.exact) {
    return pathname === tab.href;
  }
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}
```

- `/` 탭: exact → 홈 페이지만 (`/received`는 매칭 안 됨)
- `/received` 탭: `/received` or `/received/{id}` 모두 active
- `/provider/profile` 탭: `/provider/profile` or `/provider/profile/edit` 등

---

## 3. Data Model

변경 없음. 기존 `users.providerId` 필드로 role 판단.

### 3.1 Tab Definition Schema

```ts
// src/components/nav/tab-definitions.ts
import type { LucideIcon } from 'lucide-react';
import { Home, Search, ClipboardList, MessageCircle, Users, Inbox, Briefcase, Settings } from 'lucide-react';

export type TabBadgeKey = 'chat-unread';

export interface TabDefinition {
  href: string;
  label: string;
  Icon: LucideIcon;
  badgeKey?: TabBadgeKey;
  exact?: boolean;
}

export const CLIENT_TABS: readonly TabDefinition[] = [
  { href: '/',           label: '홈',        Icon: Home,            exact: true },
  { href: '/search',     label: '청명찾기',  Icon: Search },
  { href: '/received',   label: '받은견적',  Icon: ClipboardList },
  { href: '/chat',       label: '채팅',      Icon: MessageCircle,   badgeKey: 'chat-unread' },
  { href: '/community',  label: '커뮤니티',  Icon: Users },
] as const;

export const PROVIDER_TABS: readonly TabDefinition[] = [
  { href: '/provider/profile',   label: '홈',    Icon: Home },
  { href: '/provider/requests',  label: '요청',  Icon: Inbox },
  { href: '/provider/works',     label: '작업',  Icon: Briefcase },
  { href: '/chat',               label: '채팅',  Icon: MessageCircle, badgeKey: 'chat-unread' },
  { href: '/provider/settings',  label: '설정',  Icon: Settings },
] as const;
```

---

## 4. Layout 통합 전략

### 4.1 RootLayout 수정

```tsx
// src/app/layout.tsx
import { BottomTabNavServer } from '@/components/nav/BottomTabNav';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`... h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <main className="flex-1 pb-[var(--bottom-nav-height)]">
          {children}
        </main>
        <BottomTabNavServer />
      </body>
    </html>
  );
}
```

### 4.2 globals.css

```css
/* src/app/globals.css 추가 */
:root {
  --bottom-nav-height: 64px;
}

/* iOS safe area 대응 */
.bottom-tab-nav {
  padding-bottom: max(0px, env(safe-area-inset-bottom));
}
```

### 4.3 기존 페이지 내부 padding 전략

기존 페이지들은 이미 `pb-16` (64px) 또는 `pb-24` 등 사용 중. 선택지:

**A. 그대로 유지** (권장 · Plan §3.3와 일치)
- `<main>` 에 `pb-[var(--bottom-nav-height)]` 적용
- 내부 페이지의 `pb-16`·`pb-24`는 건드리지 않음
- 일부 페이지는 여유 공간 약간 더 있을 수 있음 (무해)

**B. 전역 정리**
- 모든 페이지 컨테이너의 `pb-*` 제거 → `main`에서 단일 통제
- 변경 파일 많음 · 회귀 위험
- v1.2 리팩토링 후보

**채택: A**.

---

## 5. UI / UX Design

### 5.1 Nav Bar 레이아웃

```
┌─────────────────────────────────────────────┐
│  [페이지 컨텐츠 · main]                      │
│  ...                                         │
│  ...                                         │
│                                              │
│                                              │
│                                              │
├─────────────────────────────────────────────┤  fixed bottom-0
│  [홈] [청명찾기] [받은견적] [채팅·🔴] [커뮤니티] │  h-16 (64px)
└─────────────────────────────────────────────┘
```

**Tailwind 스펙**:
- 컨테이너: `fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95`
- 내부: `mx-auto max-w-xl h-16 px-2 grid grid-cols-5 gap-1`
- 각 TabItem: `flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[11px] font-medium transition-colors`
- Active 색: Icon·Label `text-indigo-600 dark:text-indigo-400`
- Inactive 색: Icon·Label `text-zinc-500 dark:text-zinc-400`
- Badge: `absolute right-3 top-1.5 h-2 w-2 rounded-full bg-rose-500` (채팅 탭 unread > 0 시)

### 5.2 Placeholder 페이지 구조

```tsx
// 공통 헬퍼 또는 개별 파일
export default function SearchPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-xl flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="text-5xl" aria-hidden>🔍</span>
      <h1 className="text-xl font-bold">청명찾기</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        지도·필터로 청명을 탐색하는 기능이 곧 추가됩니다 (v1.2).
      </p>
    </div>
  );
}
```

각 placeholder 페이지의 이모지·설명만 다르게:
- `/search` 🔍 청명찾기 (v1.2)
- `/chat` 💬 채팅 (v1.2)
- `/community` 👥 커뮤니티 (v2+)
- `/provider/works` 📋 작업 관리 (v1.3 booking 후)
- `/provider/settings` ⚙️ 설정 (v1.1c)

### 5.3 Component List

| Component | Type | Location |
|-----------|------|----------|
| `BottomTabNavServer` | Server | `components/nav/BottomTabNav.tsx` (default export) |
| `TabNavClient` | Client | `components/nav/BottomTabNav.tsx` or 분리 |
| `TabItem` | Client | `components/nav/TabItem.tsx` |
| `tab-definitions.ts` | TS module | `components/nav/tab-definitions.ts` |
| `resolveRole` util | Server | `components/nav/BottomTabNav.tsx` 내부 또는 `lib/auth/role.ts` 분리 |
| Placeholder pages | Server | 5 files (search/chat/community/provider-works/provider-settings) |

**결정**: `BottomTabNav.tsx` 단일 파일에 Server (`BottomTabNavServer`) + Client (`TabNavClient`) 함께 정의. `'use client'` 지시어는 분리가 안되므로 **TabNavClient는 별도 파일** `TabNavClient.tsx`, TabItem도 별도 파일.

### 5.4 Rendering 예시 (의뢰인 `/received` 접속 시)

```
[홈]     [청명찾기]  [받은견적]   [채팅]    [커뮤니티]
 Home    Search     Clipboard   Message   Users
 zinc    zinc       indigo ✓    zinc      zinc
 (회색)  (회색)     (활성)      (회색)    (회색)
```

---

## 6. Error Handling

| 시나리오 | 처리 |
|----------|------|
| 세션 쿠키 없음 | `tryVerifySessionCookie` null → role=null → nav 렌더 안 함 |
| 세션 쿠키 invalid | tryVerifySessionCookie null → 위와 동일 |
| users doc 없음 | providerId undefined → client 취급 (5탭 client 렌더) |
| Firestore 오류 | userRepository.get 실패 → try/catch로 client 기본값 fallback |
| 알 수 없는 pathname | active 탭 없음 — 모두 회색 (안전) |

### 6.1 Fallback 로직

```ts
export const resolveRole = cache(async (): Promise<'client' | 'provider' | null> => {
  try {
    const jar = await cookies();
    const session = jar.get(SESSION_COOKIE_NAME)?.value;
    const uid = await tryVerifySessionCookie(session);
    if (!uid) return null;
    const user = await userRepository.get(uid);
    const providerId = (user as { providerId?: string } | null)?.providerId;
    return providerId ? 'provider' : 'client';
  } catch (e) {
    console.warn('[bottom-tab-nav] role resolve 실패', e);
    return null;
  }
});
```

---

## 7. Security Considerations

- **세션 cookie 읽기 전용**: Server Component에서만 접근. Client에는 전달 안 함.
- **providerId 노출**: role 판단용. Client는 'client'|'provider'|null만 받음. uid 등 개인정보 누설 X.
- **nav 자체는 공개 정보**: 탭 구조는 사용자 role 외엔 민감 아님.
- **pathname client**: `usePathname()` 사용은 Next.js 공식. 보안 영향 없음.
- **CSP**: 인라인 style 없음. Tailwind static classes만 사용.

---

## 8. Clean Architecture

| Layer | 파일 |
|-------|------|
| **Presentation (Server)** | `BottomTabNav.tsx` (BottomTabNavServer default export) · Placeholder pages |
| **Presentation (Client)** | `TabNavClient.tsx`, `TabItem.tsx` |
| **Domain** | 없음 (순수 UI feature) |
| **Infrastructure** | 재활용 — `lib/firebase/auth-admin.ts`, `lib/firebase/user-repository.ts` |

`cache()`는 React 내장 — 별도 layer 아님. `resolveRole()`은 Presentation Server 내부 유틸.

---

## 9. Coding Convention Recap

- 컴포넌트 PascalCase (`BottomTabNav.tsx`, `TabNavClient.tsx`, `TabItem.tsx`)
- utility/lib kebab-case (`tab-definitions.ts`)
- Client: `'use client'`
- Import 순서: external → `@/...` → relative → type
- `readonly` 배열 (`CLIENT_TABS`, `PROVIDER_TABS`) · `as const`
- 접근성: `aria-label`, `aria-current="page"` 등 — **Plan에 명시되지 않았지만 Design에서 추가**

---

## 10. Implementation Guide

### 10.1 File Structure (신규 + 수정)

```
src/
├── components/nav/                              🆕 폴더
│   ├── BottomTabNav.tsx                          🆕 Server (resolveRole + render TabNavClient)
│   ├── TabNavClient.tsx                          🆕 Client (usePathname + hidden check + map)
│   ├── TabItem.tsx                               🆕 Client (Link + Icon + Label + optional badge)
│   └── tab-definitions.ts                        🆕 CLIENT_TABS / PROVIDER_TABS
├── app/
│   ├── layout.tsx                                🔄 BottomTabNavServer 전역 삽입
│   ├── globals.css                               🔄 --bottom-nav-height + safe-area CSS
│   ├── search/page.tsx                           🆕 placeholder
│   ├── chat/page.tsx                             🆕 placeholder
│   ├── community/page.tsx                        🆕 placeholder
│   ├── provider/works/page.tsx                   🆕 placeholder
│   └── provider/settings/page.tsx                🆕 placeholder

firestore.rules                                   (변경 없음)
proxy.ts                                          (변경 없음)
```

### 10.2 Implementation Order (6 steps)

1. **Domain & Definitions**: `tab-definitions.ts` (CLIENT_TABS · PROVIDER_TABS 배열 정의)
2. **Helper util**: `resolveRole` (Server) + `isHiddenPath`·`isActiveTab` (Client)
3. **Components**: `TabItem.tsx` → `TabNavClient.tsx` → `BottomTabNav.tsx`
4. **Placeholder pages (5)**: /search, /chat, /community, /provider/works, /provider/settings
5. **Layout integration**: `layout.tsx` + `globals.css` CSS 변수
6. **Build + 시각 확인**

### 10.3 Pre-flight 체크리스트

- [ ] 비로그인 시 / 접속 → nav 숨김 (홈은 비로그인 가능 · TopBar에 로그인 유도)
- [ ] /login 접속 → nav 숨김
- [ ] 고객 로그인 상태 / → 홈 탭 active
- [ ] 고객 /received → 받은견적 탭 active
- [ ] 고객 /received/{id} → 받은견적 탭 여전히 active (prefix 매칭)
- [ ] 청명 로그인 → 청명 5탭 렌더
- [ ] 청명 /provider/requests → 요청 탭 active
- [ ] 청명 /provider/requests/{id}/propose → 요청 탭 active
- [ ] 미구현 탭 클릭 → placeholder 페이지 표시
- [ ] 채팅 탭 배지 위치 확인 (현재 항상 0 · 숨김)

---

## 11. Next.js 16 Specific Patterns

### 11.1 Server → Client boundary

`BottomTabNav.tsx` (Server, async):
```tsx
import { TabNavClient } from './TabNavClient';
import { CLIENT_TABS, PROVIDER_TABS } from './tab-definitions';

export async function BottomTabNavServer() {
  const role = await resolveRole();
  if (role === null) return null;
  const tabs = role === 'provider' ? PROVIDER_TABS : CLIENT_TABS;
  return <TabNavClient role={role} tabs={tabs} />;
}
```

Server Component가 `readonly TabDefinition[]` (lucide icon component 포함)을 Client Prop으로 전달 — 컴포넌트 타입은 Client로 serializable하지 않으나 **Next.js가 `LucideIcon`은 reference 기반으로 전달** (Client가 직접 import한 값이라 identity match).

**주의**: `CLIENT_TABS` 정의를 Client 파일(`tab-definitions.ts`)로 두고 Server·Client 양쪽에서 import. ES module singleton이라 reference 동일.

### 11.2 Cache Components 준수

- `BottomTabNav.tsx` 내부 `cookies()` 호출 — layout에 Suspense 래핑 필요? **No**. layout 자체가 render deferred 가능. 다만 layout이 async이어야 함.
- 대안: `<Suspense fallback={<NavSkeleton/>}><BottomTabNavServer /></Suspense>` — 안전한 방어.
- Design: **Suspense로 래핑** (layout에서).

```tsx
// layout.tsx
import { Suspense } from 'react';

<body ...>
  <main ...>{children}</main>
  <Suspense fallback={null}>
    <BottomTabNavServer />
  </Suspense>
</body>
```

fallback=null이면 nav 없이 화면만 보임 → 즉시 나타남.

### 11.3 usePathname

`TabNavClient.tsx`:
```tsx
'use client';
import { usePathname } from 'next/navigation';
```

### 11.4 React `cache()`

`resolveRole`과 `userRepository.get` 전부 `cache()`로 감싸면 layout + 페이지에서 동일 데이터 요청 시 실제 호출은 1회. 이미 페이지들이 user-repository.get을 직접 호출하므로, `user-repository.ts`에서 `cache` 적용:

```ts
// user-repository.ts (수정)
import { cache } from 'react';
// ...
async function getInner(uid: string): Promise<UserProfile | null> { ... }
export const userRepository = {
  get: cache(getInner),
  // ...
};
```

이러면 전체 앱에서 user.get은 request-level 1회.

**영향**: 기존 caller (/dashboard, /provider/profile, /provider/requests 등)가 user.get을 여러 번 호출해도 동일 결과 캐시.

---

## 12. Test Plan

| # | 시나리오 | 기대 결과 |
|---|----------|----------|
| 1 | 비로그인 홈 `/` | nav 숨김 (role=null) |
| 2 | /login 접속 | nav 숨김 (hidden path) |
| 3 | /signup-provider 접속 | nav 숨김 |
| 4 | /terms, /privacy | nav 숨김 |
| 5 | 고객 로그인 후 `/` | 고객 5탭 · 홈 active (indigo) |
| 6 | 고객 /search | 고객 5탭 · 청명찾기 active + placeholder 페이지 |
| 7 | 고객 /received?tab=completed | 받은견적 탭 active (queryparam 영향 없음) |
| 8 | 고객 /received/{id} | 받은견적 탭 active (prefix 매칭) |
| 9 | 청명 로그인 후 /provider/profile | 청명 5탭 · 홈 active |
| 10 | 청명 /provider/requests/{id}/propose | 요청 탭 active |
| 11 | 청명 /chat | 청명 5탭 · 채팅 active + placeholder |
| 12 | role 변경 감지 (로그아웃 → 재로그인) | 재렌더 후 새 role 반영 |
| 13 | 알 수 없는 pathname (/foo) | 모든 탭 inactive (회색) |
| 14 | `cache()` dedup | 페이지+layout에서 user.get 중복 호출 시 실 fetch 1회 (dev console 확인) |
| 15 | iOS safe-area | iPhone 모바일 nav 바 홈 인디케이터 아래 여백 확보 |

---

## 13. Version History

| Ver | Date | 변경 | 작성자 |
|-----|------|------|-------|
| 0.1 | 2026-04-21 | Design 초안. Open Questions 8건 해소. Server(role resolve + cache) → Client(pathname active) 경계. CSS 변수 `--bottom-nav-height`. Placeholder 페이지 5개. 6-step 구현 순서. Test 15 시나리오. | Seokho Lee |
