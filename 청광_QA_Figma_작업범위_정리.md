# 청광 — QA & Figma 기능명세 작업범위 정리

> 용역자(QA·Figma 기능명세 담당) 핸드오프 문서
> 작성 기준: 실제 코드베이스(`src/app`) 스냅샷 · 2026-06-05
> 대상: 청광 웹앱(Next.js 16 App Router + Firebase). 페이지 총 60개, 역할 5종.

---

## 0. 먼저 읽어주세요 (요약)

청광은 **청소 특화 역경매 매칭 플랫폼**으로 시작했지만, 현재 코드는 매칭 외에 **홍보페이지 빌더 · AI 콘텐츠(팁) 발행 · 파트너 시스템**까지 포함하도록 확장돼 있습니다. 그래서 QA와 화면설계를 "역할(계정 유형)" 단위로 끊어서 진행하는 것이 가장 깔끔합니다.

작업은 아래 5개 역할 그룹으로 나뉩니다.

| # | 역할 그룹 | 한 줄 정의 | 페이지 수 |
|---|---|---|---|
| A | 의뢰인(고객) — 매칭 플로우 | 견적요청 → 받은견적 → 청명찾기 → 채팅 | 약 10 |
| B | 의뢰인(고객) — 빌더/스토리 | 홍보페이지 만들기, 사진→AI블로그 스크랩북 | 약 5 |
| C | 청명(provider) | 받은요청 확인 → 견적제안, 작업이력/프로필 | 약 6 |
| D | 파트너(partner) + 커뮤니티/콘텐츠 | 글·시리즈 발행, 공개 커뮤니티, AI 팁 | 약 17 |
| E | 관리자(admin) | 파트너 승인, 청명·게시물 관리, 팁 생성/스케줄 | 약 18 |

> **QA 시작 전 필수**: `/sample-accounts` 페이지(코드 364줄)에 역할별 테스트 계정이 정리돼 있습니다. QA·화면확인의 진입점으로 여기를 먼저 쓰세요.

---

## 1. 기술 스택 / 작업 시 주의사항

- **Frontend**: Next.js 16 (App Router, Server Actions), React 19, Tailwind v4
- **Auth/DB/Storage**: Firebase 12 (client) + firebase-admin 13 (server), Firestore
- **AI**: Google Generative AI (`@google/generative-ai`) — 팁/블로그 자동 생성에 사용
- **모바일**: Capacitor (iOS/Android 래핑 존재)
- **폼/검증**: react-hook-form + zod (도메인 스키마는 `src/domain/*-schema.ts`)
- ⚠️ **Next.js 16 주의**: 루트 `AGENTS.md`에 명시돼 있듯 이 버전은 라우팅·캐시·서버액션 규약이 일반적인 Next와 다릅니다. 코드 수정/구현 검증 시 `node_modules/next/dist/docs/`를 먼저 확인하세요. (QA·화면설계만이면 영향 적음)

핵심 폴더 지도:

```
src/app/          페이지(라우트) + api/ + actions/(서버액션)
src/components/    역할별 UI 컴포넌트 (admin, chat, provider, partner, community, editor …)
src/domain/        zod 스키마 · 상수 · 카테고리/지역 정의 (기능 규칙의 원천)
src/lib/           firebase, llm, tips, quote, chat, feed, seo 등 도메인 로직
src/types/         엔티티 타입 (quote, chat, provider, partner, post, page …)
```

---

## 2. 역할별 페이지 인벤토리 (QA & Figma 대상 목록)

각 행 = 화면 1개. **QA**는 "이 화면을 테스트", **Figma**는 "이 화면을 그린다"로 동일 목록을 공유합니다.
우선순위 P0(핵심·먼저) / P1(중요) / P2(후순위) 표기.

### 공통 / 비로그인 (모든 역할 진입점)

| 라우트 | 화면 | 우선 |
|---|---|---|
| `/` | 랜딩(홈) — 가장 큰 페이지(410줄), 서비스 소개·진입 | P0 |
| `/(auth)/login` | 로그인 | P0 |
| `/(auth)/signup-provider` | 청명 회원가입 | P0 |
| `/(auth)/signup-partner` · `/submitted` | 파트너 신청 · 신청완료 | P1 |
| `/sample-accounts` | QA용 테스트 계정 안내 | P0(QA진입) |
| `/search` · `/discover` | 청명 검색 · 둘러보기 | P1 |
| `/terms` · `/privacy` | 약관 · 개인정보 | P2 |
| `/logout` | 로그아웃 처리 | P2 |

### A. 의뢰인(고객) — 매칭 플로우 [P0 최우선 그룹]

| 라우트 | 화면 | 우선 |
|---|---|---|
| `/quote/new` | 견적 요청 작성 (유형×주기 매트릭스) | P0 |
| `/quote/thanks` | 견적 요청 완료 | P0 |
| `/received` | 받은 견적 목록 | P0 |
| `/received/[requestId]` | 받은 견적 상세 / 비교 | P0 |
| `/chat` · `/chat/[threadId]` | 채팅 목록 · 1:1 대화 | P0 |
| `/providers/[providerId]` | 청명 공개 상세(프로필·포트폴리오·리뷰) | P0 |

### B. 의뢰인(고객) — 빌더/스토리 `(customer)` 그룹 [P1]

> 사업주(식당·미용실·카페)용 홍보페이지/콘텐츠 생성 기능. 매칭과 별개 제품 라인.

| 라우트 | 화면 | 우선 |
|---|---|---|
| `/(customer)/dashboard` | 고객 대시보드 | P1 |
| `/(customer)/editor/new` | 업종 선택 후 새 홍보페이지 시작 | P1 |
| `/(customer)/editor/[pageId]` | 홍보페이지 에디터 | P1 |
| `/(customer)/stories` | 내 스크랩북(사진→AI블로그) | P1 |
| `/(customer)/stories/new` | 사진 업로드 | P1 |
| `/p/[slug]` | 완성된 홍보페이지 공개 뷰 | P1 |

### C. 청명(provider) [P0]

| 라우트 | 화면 | 우선 |
|---|---|---|
| `/provider/home` | 청명 홈 대시보드 | P0 |
| `/provider/requests` | 받은 견적 요청 목록 | P0 |
| `/provider/requests/[id]/propose` | 견적 제안 작성 | P0 |
| `/provider/works` | 작업 이력 / Before·After 포트폴리오 | P1 |
| `/provider/profile` | 청명 프로필 편집 | P1 |
| `/provider/settings` | 청명 설정 | P2 |

### D. 파트너(partner) + 커뮤니티/콘텐츠 [P1~P2]

| 라우트 | 화면 | 우선 |
|---|---|---|
| `/partner/posts` · `/posts/new` · `/posts/[postId]/edit` | 파트너 글 목록·작성·수정 | P1 |
| `/partner/series` | 시리즈(연재) 관리 | P2 |
| `/partner/profile` · `/partner/settings` | 파트너 프로필 · 설정 | P2 |
| `/community` · `/community/[postId]` | 커뮤니티 홈 · 글 상세 | P1 |
| `/community/p/[slug]` | 커뮤니티 글(슬러그) | P2 |
| `/community/partners` · `/providers` · `/stories` · `/tips` | 탭별 피드 | P2 |
| `/community/stories/upload` | 스토리 업로드 | P2 |

### E. 관리자(admin) [P1, 내부용]

| 라우트 | 화면 | 우선 |
|---|---|---|
| `/admin/login` · `/admin` | 관리자 로그인 · 대시보드 | P1 |
| `/admin/partners` · `/new` · `/[partnerId]` | 파트너 관리 | P1 |
| `/admin/partners/applicants` · `/[applicantId]` | 파트너 신청 승인/반려 | P1 |
| `/admin/providers` | 청명 관리 | P1 |
| `/admin/posts` | 게시물 관리(승인/회수) | P1 |
| `/admin/tips` · `/generate` · `/schedule` · `/topics`(+`new`,`[topicId]`) | AI 팁 생성·스케줄·주제풀 | P2 |
| `/admin/auto-series` · `/content-templates` · `/rag-review` | 자동 시리즈 · 템플릿 · RAG 검수 | P2 |

---

## 3. 기능 그룹(도메인) — 화면을 묶는 백엔드 단위

QA 시 "화면 따로 + 기능 흐름 따로"를 같이 봐야 빠집니다. 서버액션(`src/app/actions`)·도메인 스키마 기준 핵심 기능 묶음:

1. **인증/온보딩** — `auth-actions`, `provider-signup-schema`, `partner-application-schema`
2. **견적 역경매(핵심)** — `quote-actions`, `quote-response-actions`, `quote-schemas`, `quote-status`, `booking-*`
3. **채팅** — `chat-actions`, `chat-schemas`
4. **청명 대시보드/프로필** — `provider-dashboard-actions`, `provider-editor-actions`, `provider-profile-actions`
5. **홍보페이지 빌더** — `page-actions`, `promo-actions`, `provider-editor-schema`, `promo-schemas`
6. **스토리(사진→AI블로그)** — `story-scrapbook`, `stories` 라우트, `llm`
7. **커뮤니티/피드** — `feed`, `post`, `community` 컴포넌트
8. **AI 팁 생성·스케줄** — `admin-tips-actions`, `admin-tips-config-actions`, `lib/tips`, `lib/llm`
9. **파트너 시스템** — `partner-application/profile/issuance/auto-series/templates-actions`
10. **콘텐츠 템플릿 / 자동 시리즈** — `content-template-actions`, `auto-series`
11. **SEO** — `lib/seo`, `community/*/rss.xml`, `slug`

---

## 4. 권장 진행 순서 (QA + Figma 공통 로드맵)

플랫폼 양면(고객↔청명)의 **거래 1바퀴**가 핵심이므로, 거기서 시작합니다.

**1차 (P0 · 거래 핵심 루프)**
- A. 의뢰인 매칭: `/quote/new` → `/quote/thanks` → `/received` → `/received/[requestId]` → `/chat`
- C. 청명: `/provider/home` → `/provider/requests` → `/provider/requests/[id]/propose`
- 공통: `/`, `/login`, `/signup-provider`, `/providers/[providerId]`, `/sample-accounts`
- → 이 묶음이 "견적 요청부터 청명이 제안하고 채팅까지" 한 바퀴. **QA·Figma 모두 여기 먼저.**

**2차 (P1 · 보조 핵심)**
- C. 청명 `/provider/works`, `/provider/profile`
- B. 빌더/스토리 `(customer)/*`, `/p/[slug]`
- E. 관리자 승인 흐름 `/admin`, `/admin/partners*`, `/admin/providers`, `/admin/posts`
- D. 파트너 글쓰기 `/partner/posts*`, `/community` 메인

**3차 (P2 · 운영/콘텐츠/설정)**
- AI 팁 `/admin/tips/*`, 자동시리즈·템플릿·RAG 검수
- 커뮤니티 세부 탭·RSS, 각종 `settings`, `terms`/`privacy`

---

## 5. QA 체크 항목 (각 화면 공통 기준)

용역자가 화면별로 동일하게 적용할 점검 틀:

- **계정 유형 분기**: 비로그인 / 의뢰인 / 청명 / 파트너 / 관리자 — 각 역할에서 접근 가능/차단이 올바른가 (라우트 가드)
- **상태(state) 커버리지**: 빈 상태 / 로딩 / 데이터 있음 / 에러 / 권한 없음
- **폼 검증**: `src/domain/*-schema.ts`의 zod 규칙대로 정상·경계·오류 입력 처리
- **핵심 액션 결과**: 견적 제출, 견적 수락, 메시지 전송, 승인/반려 등 서버액션 성공·실패 후 리다이렉트/토스트
- **모바일(Capacitor) 뷰**: 주요 화면 모바일 폭에서 깨짐 여부
- **권한/보안**: 남의 `requestId`·`threadId`·`providerId` 직접 접근 시 차단되는가 (Firestore Rules와 일치)

> 화면별 상세 QA 항목 표(엑셀)가 필요하면 이 문서 기준으로 바로 만들어 드릴 수 있습니다.

---

## 6. Figma 기능명세 시 참고 자료(기존 문서)

코드와 별개로 레포에 이미 쌓인 기획 산출물이 있습니다. 화면을 그릴 때 1차 레퍼런스로 쓰되, **최신 진실은 코드**임을 유의(문서 일부는 4월 작성으로 코드가 더 진화).

- `청광_IA_화면플로우.md` / `.docx` — IA 트리·유저플로우(고객 기준, 숨고 레퍼런스)
- `청광_기능_명세서.md` (59KB, 5/15) — 기능 ID별 API·스키마·검증 (가장 상세, 개발/QA 시드)
- `청광_기능_정의서.md` — 기능 단위·트리거·상태 (65개 기능 ID)
- `청광_디자인_정의서.md` — 디자인 토큰·컴포넌트
- `청광_화면기획서_*.md` — 화면별 기획서(HOME-01, FIND-01, CHAT-01, REQUEST-01, QUOTES-01, PROV-* 등)
- `청광_유저_페르소나.md` / `청광_페르소나_UX_시나리오.md` — 사용자 시나리오
- `청광_코드베이스_분석서.md` — 코드 구조 분석(4/19, 일부 구버전)

---

## 7. 용역자에게 넘길 때 한 문장 요약

> "청광은 5개 역할(의뢰인·청명·파트너·관리자 + 공개)로 구성된 60화면 규모의 Next.js/Firebase 앱입니다. **거래 핵심 루프(견적요청→받은견적→청명제안→채팅)를 P0로 먼저** QA·화면설계하고, 이후 빌더/스토리·관리자 승인·콘텐츠/팁 순으로 진행합니다. 테스트 진입은 `/sample-accounts`, 기능 규칙의 원천은 `src/domain/*-schema.ts`와 `청광_기능_명세서.md`입니다."
