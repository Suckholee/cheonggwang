# partner-aeo-boost · Design v0.2 (cycle #28 v1.15)

> Source plan: `docs/01-plan/features/partner-aeo-boost.plan.md`
> v0.1 → v0.2: design-validator agent reality-check 결과 26개 issue 모두 결의 (§12 결의 매트릭스 참조)
> Generated: 2026-04-28
> Streak target: 8th consecutive single-pass ≥ 90%

---

## §1. Overview

### 1.1 Background
청광 v1.14 cycle #27까지 완성된 AI 자동 발행 파이프라인은 **콘텐츠 생성 + 발행 자동화**는 견고하지만, **검색 엔진/AI 답변 엔진(AEO)에서 발견·인용되는 콘텐츠**라는 마케팅 효과 측면에서 약점이 발견됨:

- **AEO 진단 종합 69/100 (C+)** — 구조화 데이터 영역 45/100 (D+), AEO 콘텐츠 패턴 55/100 (D)
- **잠복 timezone bug**: cycle #19부터 `setKstClock`이 host TZ(Vercel/Cloud Functions UTC)에서 9시간 오프셋. `recentlyPublishedInWindow` 무력화 → 한 윈도우 다회 발행 위험 + 미리보기 시각 오기재. **C1·H7 결의**: setDate도 동일 root cause이므로 `nextAutoPublishWindow` + `nextNAutoPublishWindows` + `currentWindowStart` + `setKstClock` 4개 함수 모두 `toKstWallClock` 기반으로 host-TZ-agnostic 마이그레이션

### 1.2 Why a single cycle
두 영역(AEO + timezone)을 하나의 cycle로 묶는 이유:
- 동일 testing session에서 발견됨 → 사장님 운영 단계 차질 최소화
- 영향 영역 분리 가능 (AEO=콘텐츠 layer, timezone=runtime layer) → surgical 변경
- 7-streak 유지 도전 (Plan Plus + design-validator 패턴 8번째 검증)

### 1.3 Surgical philosophy
- 데이터 모델 0 변경 → Firestore 마이그레이션 X
- cycle #19 generator 함수 시그니처 0 변경 (R11, 8번째 시도)
- regex graceful fallback (R9): FAQ 추출 실패해도 Article schema는 정상 유지

---

## §2. Goals / Non-goals

### 2.1 Goals (in-scope)
| ID | Goal | 영향 |
|---|---|---|
| G1 | AI 프롬프트에 TL;DR + 질문형 H2 + FAQ 섹션 강제 | AI 인용률 +35~50% |
| G2 | FAQPage JSON-LD 자동 추출 + @graph 통합 | AEO 답변 인용 +40~60% |
| G3 | LocalBusiness JSON-LD (매장 페이지 `/p/[slug]`) — **Page 모델 기반** | 지역 검색 +30~40% |
| G4 | Organization JSON-LD (전역 layout) | 브랜드 신호 강화 |
| G5 | metadataBase 설정 | SNS 공유 og:image 안정화 |
| G6 | BreadcrumbList JSON-LD (글 페이지) | 검색 결과 풍부화 |
| G7 | 카드뉴스 슬라이드 alt 자동 생성 | 이미지 검색 노출 |
| G8 | sitemap.xml에 `images:string[]` + 매장 페이지(Page slug) 포함 | 이미지 검색 + 매장 발견성 |
| G9 | setKstClock + window 함수 4개 host-TZ-agnostic 핫픽스 (toKstWallClock) | recentlyPublishedInWindow 정상화 |

### 2.2 Non-goals (deferred or permanent)
- **Deferred to cycle #29+**: author/정확 날짜 UI 노출, HTML 비교 테이블 sanitize 허용, sitemap-images.xml 분리, aggregateRating, LocalBusiness `@type` 더 구체화 (Restaurant/BeautySalon/CafeOrCoffeeShop, schema.org per-Page.category)
- **Permanent out-of-scope**: LLM-as-judge 별도 호출, Post 모델에 faqs 필드 추가, 사장님 FAQ UI 편집, Schema.org Service 분류

---

## §3. Architecture

### 3.1 AEO Content Pipeline (G1, G2)

```
[A] AI 프롬프트 (cycle #19 generator, R11 무수정)
    src/lib/llm/partner-promo-generator.ts:168-241  (buildComposePrompt)
    functions/src/auto-series/lib/generator.ts (mirror, ~line 200)
    
    개선 영역: buildComposePrompt() return string의 `규칙:` 블록
    
    추가 지시 (blog format에만 — H1·M9 결의):
      "- **첫 단락(2-3줄)**: 핵심 메시지를 직설적으로 답변.
       - **H2 헤더**: "{서비스} 비용은?" "어떻게 {서비스}하나요?" 처럼 자연어 질문 형식 1~2개.
       - **마지막에 [자주 묻는 질문] 섹션**: ## 자주 묻는 질문 + ### Q1./Q2./Q3. 형식, 답변은 단락으로.
       - **구조**: 답변(첫 단락) → 근거(중단 H2들) → 자주 묻는 질문 (마지막).
       - FAQ 답변에서도 가격·할인율을 사실로 단정하지 않습니다. (예: "가격은 매장에 문의" OK, "20% 할인" X)"
    
    카드뉴스 (formatRule === 'card-news') 분기에서는 위 4줄 미적용 — 슬라이드 형식 미적합 (H1 결의)

[B] 본문 → JSON-LD 변환
    src/lib/seo/article-jsonld.ts (수정, @graph 마이그레이션 — H5 결의)
    src/lib/seo/faq-extractor.ts (NEW, pure function)
    src/lib/seo/breadcrumb-jsonld.ts (NEW)
    src/lib/feed/post-panel.ts (NEW — M6 결의)

    flow:
      buildArticleGraphJsonLd(post, opts?: {breadcrumb?: BreadcrumbContext})
        → ArticleGraphJsonLd { "@context": "https://schema.org", "@graph": [...] }
        @graph items:
          1. Article (기존 + dateModified)
          2. (post.format !== 'card-news' && faqs.length > 0) ? FAQPage : []
          3. (opts.breadcrumb) ? BreadcrumbList : []
      
      faq-extractor.ts:
        extractFaqsFromMarkdown(body: string): Array<{q, a}>
          - regex(섹션 시작): /^##\s*자주\s*묻는\s*질문\s*$/m
          - regex(질문 H3): /^###\s*Q\d+[.):]\s*(.+?)$/gm
          - 다음 ###나 다음 ##(섹션 종료) 사이를 답변으로 추출
          - 0개 매칭 → [] 빈 배열 (graceful, R9)
      
      post-panel.ts (M6 결의):
        export function postTypeToPanelSlug(postType: PostType): PanelSlug
          { 'tip' → 'tips', 'provider' → 'providers', 'partner-promo' → 'partners' }
        export function panelLabelForPost(post: Pick<Post, 'postType'>): string
          PANELS[postTypeToPanelSlug(post.postType)].label

[C] 글 페이지에서 사용 (community/p)
    src/app/community/p/[slug]/page.tsx:96
    
    변경: const jsonLd = await buildArticleJsonLd(post)
       → const jsonLd = await buildArticleGraphJsonLd(post, {
            breadcrumb: { 
              panelLabel: panelLabelForPost(post),
              panelSlug: postTypeToPanelSlug(post.postType),
            }
          })
    
    M9 결의: breadcrumb은 community/p에서만. /p/[slug] 매장 페이지는 LocalBusiness 단독.
```

### 3.2 매장 페이지 LocalBusiness (G3) — **Page 모델 기반 (C3 결의)**

**v0.1 잘못 가정**: `/p/[slug]`가 `Partner` 모델 사용. 실제로는 **`Page` 모델 (B2C 사장님 홍보 페이지)**.

`getPublicPageView(slug)` (src/services/page-service.ts:32-45) 반환:
```ts
PublicPageView = { page: Page, partner: PartnerFlag }
```
- `Page` (`src/types/page.ts:68-86`): 매장 페이지의 모든 정보 — businessName, address, phone, region, category, sections, photos, slug
- `PartnerFlag` (`src/lib/firebase/user-repository.ts:14-17`): isCheonggwangPartner 플래그만 (B2B 의뢰업체와 무관)

```
src/app/p/[slug]/page.tsx:53-57 (수정)
src/lib/seo/local-business-jsonld.ts (NEW)

flow:
  PromoContent → getPublicPageView(slug) → {page, partner}
    ↓
  buildLocalBusinessJsonLd(page: Page, slug: string, base: string)  ← Page 입력 (C3)
    @type: "LocalBusiness"
    name: page.businessName
    image: page.photos[0]?.url ?? null  (있을 때만 출력)
    url: ${base}/p/${encodeURIComponent(slug)}  (M5 결의 — slug encoding)
    description: page.sections.intro.body?.slice(0, 300) ?? undefined
    address: page.address ? {
      "@type": "PostalAddress",
      streetAddress: page.address,
      addressLocality: page.region?.district,
      addressRegion: page.region?.city,
      addressCountry: "KR",
    } : undefined
    telephone: page.phone || undefined
    areaServed: page.region 
      ? `${page.region.city ?? ""} ${page.region.district ?? ""}`.trim() 
      : undefined
    
    optional 필드 omit (null/undefined 출력 X — schema.org 권장)
    ↓
  <JsonLdScript data={localBusinessJsonLd} />
```

### 3.3 Organization JSON-LD (G4) + metadataBase (G5)

```
src/app/layout.tsx (수정)
src/lib/seo/organization-jsonld.ts (NEW)

H3 결의: layout.tsx의 export const metadata는 sync. getBaseUrl() Promise 호출 불가능.
환경변수 직접 사용 + fallback:

import { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cheonggwang.app';

export const metadata: Metadata = {
  title: "청광",
  description: "청소 견적 마켓플레이스",
  metadataBase: new URL(BASE_URL),
};

RootLayout body 안:
  <Suspense fallback={null}>
    <BottomTabNavServer />
  </Suspense>
  <JsonLdScript data={buildOrganizationJsonLd()} />  ← 추가

organization-jsonld.ts:
  export function buildOrganizationJsonLd(): OrganizationJsonLd {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://cheonggwang.app').replace(/\/$/, '');
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "청광",
      url: base,
      logo: `${base}/logo.png`,  // L4 — favicon.ico 대신
      description: "청소 견적 마켓플레이스",
      areaServed: "KR",
      sameAs: parseSameAs(),  // M7 결의
    };
  }
  
  function parseSameAs(): string[] {  // M7 결의
    try {
      const raw = process.env.NEXT_PUBLIC_BRAND_SAME_AS;
      if (!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
    } catch {
      return [];
    }
  }

note: M2 — 모든 페이지에 한 번씩 출력 (admin/partner 등 비공개 페이지에도 출력되지만 robots:noindex라 인덱싱 X). 트래픽 영향 < 1KB/page → 허용 가능
```

### 3.4 BreadcrumbList JSON-LD (G6)

```
src/lib/seo/breadcrumb-jsonld.ts (NEW)
src/lib/feed/post-panel.ts (NEW — M6 결의)

buildBreadcrumbJsonLd(items: Array<{name, url}>): BreadcrumbListJsonLd
  @type: "BreadcrumbList"
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,  // L3 — 1-based 확인됨
    name: it.name,
    item: it.url
  }))

호출 (community/p/[slug]/page.tsx, M6 결의 헬퍼 활용):
  const panelSlug = postTypeToPanelSlug(post.postType);
  const panelLabel = panelLabelForPost(post);
  buildBreadcrumbJsonLd([
    { name: "청광", url: `${base}/` },
    { name: panelLabel, url: `${base}/community/${panelSlug}` },
    { name: post.title, url: `${base}/community/p/${post.slug}` },
  ])

→ buildArticleGraphJsonLd의 opts.breadcrumb에 결합되어 @graph로 렌더 (M9 결의: community/p에만 출력)
```

### 3.5 Sitemap 확장 (G8) — **Page 모델 기반 (H4 결의)**

**v0.1 잘못 가정**: `partnerRepository.listAll()`로 매장 페이지 enumerate.

**v0.2**: 매장 페이지 = `Page` 모델 (slug 발급된 사장님 페이지). 신규 메서드 `pageRepository.listPublishedSlugsForSitemap(limit)` 추가:

```
src/app/sitemap.ts (수정)
src/services/page-service.ts 또는 src/lib/firebase/page-repository.ts (확장)

신규 메서드 (page-repository.ts):
  async listPublishedSlugsForSitemap(limit = 5000): Promise<Array<{slug: string, updatedAt: Date}>>
    .where('published', '==', true)
    .where('slug', '!=', null)
    .orderBy('slug').limit(limit)
    .get()
    → docs.map(d => ({slug: d.data().slug, updatedAt: d.data().updatedAt}))

sitemap.ts:
  const pageEntries = await tryFetch(() => pageRepository.listPublishedSlugsForSitemap());
  for (const p of pageEntries) {
    entries.push({
      url: `${base}/p/${encodeURIComponent(p.slug)}`,  // M5 — slug encoding
      lastModified: p.updatedAt,
      priority: 0.7,
      changeFrequency: "weekly",
    });
  }
  
  // posts 부분 (기존 + image 추가, M3 결의):
  for (const p of postEntries) {
    if (!p.slug || p.publishStatus !== "published") continue;
    entries.push({
      url: `${base}/community/p/${p.slug}`,
      lastModified: p.updatedAt ?? p.createdAt,
      priority: 0.6,
      changeFrequency: "weekly",
      images: p.coverImageUrl ? [p.coverImageUrl] : undefined,  // M3 — string[]
    });
  }
  
  // M8 결의 — pages와 posts try/catch 격리
  function tryFetch<T>(fn: () => Promise<T>): Promise<T | []> {
    return fn().catch((e) => {
      console.warn('[sitemap]', e);
      return [];
    });
  }
```

### 3.6 카드뉴스 alt 자동 생성 (G7)

```
src/components/post/CardNewsPaginator.tsx:119 (수정)

before: alt=""
after:  alt={makeSlideAlt(slideHtmls[i], companyName, i + 1)}

inline helper (CardNewsPaginator.tsx 내부 또는 src/lib/post/card-news-utils.ts):
  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }
  function makeSlideAlt(html: string, companyName: string, n: number): string {
    const text = stripHtml(html).slice(0, 60);
    return `${companyName} 카드뉴스 슬라이드 ${n}: ${text}`;
  }
```

### 3.7 Timezone 핫픽스 (G9, R10) — **확장됨 (C1 + H7 통합)**

**v0.1 잘못 가정**: setKstClock 함수 하나만 수정.
**v0.2**: setDate · setHours 모두 host-TZ 의존이므로 **window helper 4개 함수 모두 마이그레이션**.

#### Root cause
- `toKST(now)`가 host에 따라 다른 UTC value 반환:
  - UTC host: kst의 UTC value = KST wall clock (이상해 보이지만 getHours/getDay가 KST 반환)
  - KST host: kst의 UTC value = real UTC of input now
- `getDay()`, `getHours()`, `setHours()`, `setDate()` 모두 host TZ에서 해석 → host 차이가 그대로 결과 차이로 누적

#### 해결: toKstWallClock + 모든 함수 wall clock parts 기반 산술

```
src/lib/partner/auto-publish-window.ts (수정)
functions/src/auto-series/lib/window.ts (mirror)

신규 helper (export):
  interface KstWallClock {
    year: number;     // 4-digit
    month: number;    // 0-based (Date.UTC 호환)
    date: number;     // 1-based
    day: number;      // 0=Sun..6=Sat
    hours: number;    // 0..23
    minutes: number;  // 0..59
  }
  
  /**
   * host TZ 무관: Intl.DateTimeFormat으로 KST wall clock 컴포넌트 추출.
   * Asia/Seoul = UTC+9 고정 (DST 없음).
   */
  export function toKstWallClock(d: Date): KstWallClock {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric", month: "2-digit", day: "2-digit",
      weekday: "short", hour: "2-digit", minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return {
      year: parseInt(get("year"), 10),
      month: parseInt(get("month"), 10) - 1,
      date: parseInt(get("day"), 10),
      day: weekdayMap[get("weekday")] ?? 0,
      hours: parseInt(get("hour"), 10) % 24,  // hour12: false에서 24 → 0 fix
      minutes: parseInt(get("minute"), 10),
    };
  }
  
  /**
   * KST wall clock(year, month, date)에서 `minute` 분 시각의 real UTC Date.
   * KST = UTC+9 → real UTC time at (h-9):m.
   * h-9가 음수면 Date.UTC가 자동으로 전날로 정규화 (안전).
   */
  function setKstClock(wall: KstWallClock, minute: number): Date {
    const h = Math.floor(minute / 60);
    const mi = minute % 60;
    return new Date(Date.UTC(wall.year, wall.month, wall.date, h - 9, mi, 0, 0));
  }

영향받는 함수 마이그레이션 (Next.js + functions mirror):
  
  isInAutoPublishWindow(cfg, now):
    const wall = toKstWallClock(now);
    if (!cfg.weekdays.includes(wall.day)) return false;
    const minute = wall.hours * 60 + wall.minutes;
    return minute >= cfg.startMinute && minute < cfg.endMinute;
  
  currentWindowStart(cfg, now):
    const wall = toKstWallClock(now);
    if (!cfg.weekdays.includes(wall.day)) return null;
    const minute = wall.hours * 60 + wall.minutes;
    if (minute < cfg.startMinute || minute >= cfg.endMinute) return null;
    return setKstClock(wall, cfg.startMinute);
  
  nextAutoPublishWindow(cfg, now):
    const wall = toKstWallClock(now);
    const todayMin = wall.hours * 60 + wall.minutes;
    // 현재 윈도우 내 또는 오늘 시작 전
    if (cfg.weekdays.includes(wall.day) && todayMin < cfg.endMinute) {
      return {
        startsAt: setKstClock(wall, cfg.startMinute),
        endsAt: setKstClock(wall, cfg.endMinute),
      };
    }
    // 다음 7일 내 가장 가까운 활성 요일
    for (let i = 1; i <= 7; i++) {
      const targetDow = (wall.day + i) % 7;
      if (!cfg.weekdays.includes(targetDow)) continue;
      const targetWall = addDaysToWall(wall, i);  // 신규 helper
      return {
        startsAt: setKstClock(targetWall, cfg.startMinute),
        endsAt: setKstClock(targetWall, cfg.endMinute),
      };
    }
    return { startsAt: null, endsAt: null };
  
  nextNAutoPublishWindows(cfg, now, n):  
    동일 패턴 — wall clock 기반 + addDaysToWall로 day arithmetic
  
  addDaysToWall(wall, days):
    // KST date 산술 (host TZ 무관). 윤년/월 경계는 Date.UTC로 정규화.
    const tmp = new Date(Date.UTC(wall.year, wall.month, wall.date + days));
    return {
      ...wall,
      year: tmp.getUTCFullYear(),
      month: tmp.getUTCMonth(),
      date: tmp.getUTCDate(),
      day: tmp.getUTCDay(),
    };
  
  recentlyPublishedInWindow: 변경 없음 (currentWindowStart 결과를 그대로 사용)
```

회복 효과:
- recentlyPublishedInWindow 정상 동작 (R3·M3 invariant 회복)
- /partner/series 미리보기 시각 정상 표시 (KST 06:00 → AM 06:00)
- 한 윈도우 다회 발행 위험 차단

### 3.8 데이터 의존성 (확인됨, v0.2 정정)

#### Post 모델 (변경 없음)
- `post.bodyMarkdown`: AI가 markdown 본문 작성 시 FAQ 섹션 포함되어 저장됨
- `post.companyName`: cycle #19부터 매장명 스냅샷 (Article author용)
- `post.coverImageUrl`: sitemap images용 (M3 — string[])
- `post.publishedAt`, `post.createdAt`: Article datePublished용
- `post.updatedAt`: dateModified용 (M4 — R5 보존됨)
- `post.format` (optional): faq-extractor gate ('card-news' 면 추출 X, 그 외 전부 추출 시도)
- `post.postType`: 'tip' | 'provider' | 'partner-promo' (M6 — postTypeToPanelSlug)

#### Page 모델 (변경 없음, C3 정정)
- `page.businessName`: LocalBusiness name
- `page.address` (직접 필드, optional): LocalBusiness streetAddress
- `page.phone` (직접 필드, optional): LocalBusiness telephone
- `page.region: { city, district } | null`: addressLocality/addressRegion
- `page.category: 'restaurant'|'salon'|'cafe'`: 본 cycle 미사용 (L8 deferred)
- `page.sections.intro.body`: LocalBusiness description (300자 슬라이스)
- `page.photos[0]?.url`: LocalBusiness image
- `page.published`: sitemap 필터 (true만)
- `page.slug`: sitemap URL + JSON-LD url (M5 — encodeURIComponent)

#### Partner 모델 (변경 없음)
- 본 cycle 미사용 (C3 결의로 Page 모델 사용)
- partner-promo 글 발행 주체이지만 `/p/[slug]` 매장 페이지와 직교

#### Listing endpoints (필요)
- `pageRepository.listPublishedSlugsForSitemap(limit)` — H4 결의로 신규 추가
- `postRepository.listAllForSitemap(5000)` — 기존, 변경 없음

---

## §4. Component / Module Inventory (v0.2 — M6, C4 결의)

### 4.1 신규 파일 (10개, v0.2에서 +2)

| # | 파일 | 역할 | LOC |
|---|---|---|---:|
| 1 | `src/lib/seo/faq-extractor.ts` | markdown FAQ regex 파서 (pure) | 60 |
| 2 | `src/lib/seo/local-business-jsonld.ts` | Page → LocalBusiness 빌더 | 80 |
| 3 | `src/lib/seo/organization-jsonld.ts` | Organization 빌더 (sameAs 환경변수) | 50 |
| 4 | `src/lib/seo/breadcrumb-jsonld.ts` | BreadcrumbList 빌더 | 40 |
| 5 | `src/lib/feed/post-panel.ts` (NEW v0.2 — M6) | postType → panel slug/label 매퍼 | 30 |
| 6 | `src/lib/seo/faq-extractor.test.ts` | 8 케이스 단위 테스트 | 120 |
| 7 | `src/lib/seo/article-jsonld.test.ts` | @graph 통합 5 케이스 (H6 추가) | 100 |
| 8 | `src/lib/partner/auto-publish-window.test.ts` | 신규 8 케이스 (toKstWallClock + 마이그레이션 함수) | 150 |
| 9 | `functions/src/auto-series/lib/window.test.ts` | mirror 단위 테스트 | 150 |
| 10 | `functions/tsconfig.test.json` (NEW v0.2 — C4) | functions 테스트 전용 tsconfig | 15 |

### 4.2 수정 파일 (12개, v0.2에서 +2)

| # | 파일 | 변경 영역 |
|---|---|---|
| 1 | `src/lib/llm/partner-promo-generator.ts` | buildComposePrompt return string `규칙:` 블록 (formatRule 분기 보존, H1) |
| 2 | `functions/src/auto-series/lib/generator.ts` | 동일 프롬프트 mirror |
| 3 | `src/lib/seo/article-jsonld.ts` | `ArticleJsonLd` 유지 (deprecate) + 신규 `buildArticleGraphJsonLd` (H5) |
| 4 | `src/app/community/p/[slug]/page.tsx` | buildArticleGraphJsonLd 호출, breadcrumb opt 전달 |
| 5 | `src/app/p/[slug]/page.tsx` | LocalBusiness JSON-LD render |
| 6 | `src/app/layout.tsx` | metadataBase + Organization JSON-LD |
| 7 | `src/app/sitemap.ts` | pages + posts 별도 try/catch + images string[] (H4, M3, M8) |
| 8 | `src/lib/firebase/page-repository.ts` | `listPublishedSlugsForSitemap` 메서드 추가 (H4) |
| 9 | `src/components/post/CardNewsPaginator.tsx` | alt 자동 생성 |
| 10 | `src/lib/partner/auto-publish-window.ts` | toKstWallClock + 4개 함수 마이그레이션 (C1, H7) |
| 11 | `functions/src/auto-series/lib/window.ts` | mirror |
| 12 | `functions/tsconfig.json` (수정 v0.2 — C4) | exclude `**/*.test.ts` 추가 |

### 4.3 CI lint 확장
```js
// scripts/check-queue-mirror.mjs 추가:
{
  title: "setKstClock host TZ 무관 (Date.UTC 사용 + setHours 금지)",
  files: [
    "src/lib/partner/auto-publish-window.ts",
    "functions/src/auto-series/lib/window.ts",
  ],
  test: (src) => /Date\.UTC\(/.test(src) && !/\.setHours\(/.test(src),
},
{
  title: "toKstWallClock 두 패키지에 모두 export됨",
  files: [
    "src/lib/partner/auto-publish-window.ts",
    "functions/src/auto-series/lib/window.ts",
  ],
  test: (src) => /export function toKstWallClock/.test(src),
},
```

### 4.4 환경 변수 (Vercel + Cloud Functions)
- `NEXT_PUBLIC_BASE_URL=https://cheonggwang.app` (이미 있을 수도, 확인. 없으면 hardcoded fallback)
- `NEXT_PUBLIC_BRAND_SAME_AS=["https://www.instagram.com/cheonggwang_official"]` (optional, JSON array string)

### 4.5 Test 러너 (C4 결의)
- **Next.js 측**: `pnpm exec node --import tsx scripts/run-test.mjs <test-path>` 또는 `npx tsx <test>` (cycle #27 패턴 그대로)
- **Functions 측**: `cd functions && npx tsx test/<name>.test.ts` 또는 자체 `pnpm --filter cheonggwang-functions exec tsx ...`
- 통합 명령: `pnpm test:seo` (faq-extractor + article-jsonld) + `pnpm test:window` (Next.js + functions 모두)
- package.json scripts 추가:
  ```
  "test:seo": "tsx src/lib/seo/faq-extractor.test.ts && tsx src/lib/seo/article-jsonld.test.ts",
  "test:window": "tsx src/lib/partner/auto-publish-window.test.ts && cd functions && tsx test/window.test.ts"
  ```
- functions 테스트는 `functions/test/` 디렉터리 또는 동일 위치 + tsconfig exclude로 빌드 산출물 제외

---

## §5. API contracts (JSON-LD 스펙)

### 5.1 Article + FAQPage + BreadcrumbList @graph (H5 — 신규 type interface)

```ts
// src/lib/seo/article-jsonld.ts
export interface ArticleNode {
  "@type": "Article";
  headline: string;
  description: string;
  image?: string[];
  datePublished: string;
  dateModified?: string;  // OQ4 — Post.updatedAt이 다르면 출력
  author: { "@type": "Organization" | "Person"; name: string };
  publisher: { "@type": "Organization"; name: string; logo: { "@type": "ImageObject"; url: string } };
  mainEntityOfPage: string;
}

export interface FaqPageNode {
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}

export interface BreadcrumbListNode {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

export interface ArticleGraphJsonLd {
  "@context": "https://schema.org";
  "@graph": Array<ArticleNode | FaqPageNode | BreadcrumbListNode>;
}

/** @deprecated v1.15 cycle #28 — use buildArticleGraphJsonLd. */
export interface ArticleJsonLd { /* 기존 그대로 보존, 호출자 0명 (H2 검증) */ }
```

JSON-LD 출력 예시:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Article", "headline": "...", "datePublished": "...", "dateModified": "...", "image": ["..."], "author": {...}, "publisher": {...}, "mainEntityOfPage": "..." },
    { "@type": "FAQPage", "mainEntity": [
      { "@type": "Question", "name": "Q1...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
    ] },
    { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "청광", "item": "..." },
      { "@type": "ListItem", "position": 2, "name": "의뢰업체 홍보", "item": "..." },
      { "@type": "ListItem", "position": 3, "name": "글 제목", "item": "..." }
    ] }
  ]
}
```

### 5.2 LocalBusiness (C3 — Page 모델 기반)

```ts
// src/lib/seo/local-business-jsonld.ts
export interface LocalBusinessJsonLd {
  "@context": "https://schema.org";
  "@type": "LocalBusiness";
  name: string;
  image?: string;
  url: string;
  description?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry: "KR";
  };
  telephone?: string;
  areaServed?: string;
}
```

### 5.3 Organization (전역 layout)
```ts
export interface OrganizationJsonLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: "청광";
  url: string;
  logo: string;
  description: string;
  areaServed: "KR";
  sameAs?: string[];  // 빈 배열이면 omit (M7)
}
```

### 5.4 AI 프롬프트 추가 규칙 (return string, blog format only — H1)
```
- **첫 단락(2-3줄)**: 핵심 메시지를 직설적으로 답변 (독자가 답을 바로 알도록).
- **H2 헤더**: "{서비스} 비용은?" "어떻게 {서비스}하나요?" 처럼 자연어 질문 형식 1~2개.
- **마지막에 [자주 묻는 질문] 섹션**: ## 자주 묻는 질문 + ### Q1./Q2./Q3. 형식 + 답변은 단락으로.
- **구조**: 답변(첫 단락) → 근거(중단 H2들) → 자주 묻는 질문 (마지막).
- FAQ 답변에서도 가격·할인율·전화번호를 사실로 단정하지 않습니다.
```

card-news format 분기 (`buildCardNewsInstruction()`)에서는 위 5줄 미적용 — 슬라이드 텍스트 형식 미적합 (H1 결의).

---

## §6. UI Changes (시각적 변화 없음)

본 cycle은 거의 전부 SEO/AEO 인프라. 사용자 가시 변화:
- **카드뉴스**: 슬라이드 alt가 자동으로 생성됨. 시각 변화 없음 (alt는 스크린리더+검색엔진용)
- **글 페이지 본문**: AI 생성 신규 글에 [자주 묻는 질문] 섹션이 자연스럽게 포함됨
- **/partner/series 미리보기 시각**: PM 03:00 → AM 06:00 (정상화)

---

## §7. Security & Privacy

- 변경 영역에 인증/권한 변경 없음
- LocalBusiness JSON-LD: `Page` 모델 기반 — Page는 사장님이 publish=true로 설정한 공개 페이지. address/phone/region 모두 *공개 정보*로 노출 OK
- AI 프롬프트는 cycle #19 invariant 그대로: 가격·전화번호·할인율 지어내지 않음. FAQ 답변도 동일 규칙
- Organization sameAs: 환경변수에서 try/catch JSON parse, 잘못된 형식이면 빈 배열 (M7)

---

## §8. Implementation Order (S1–S15, v0.2)

```
S1. faq-extractor.ts + 단위 테스트 8개 — 의존성 없음
S2. local/organization/breadcrumb JSON-LD 빌더 3개 — 의존성 없음
S3. post-panel.ts (postTypeToPanelSlug + panelLabelForPost) — 의존성 없음
S4. article-jsonld.ts → ArticleGraphJsonLd 마이그레이션 + 테스트 5개 — S1, S2, S3 의존
S5. toKstWallClock + window 함수 4개 마이그레이션 (Next.js side) + 테스트 8개 — 의존성 없음
S6. window 함수 mirror (functions side) + 테스트 8개 — S5 mirror
S7. partner-promo-generator.ts 프롬프트 수정 (formatRule 분기 보존) — 의존성 없음
S8. functions/.../generator.ts 프롬프트 mirror — S7 mirror
S9. layout.tsx metadataBase + Organization JSON-LD — S2 의존
S10. page-repository.ts listPublishedSlugsForSitemap 추가 — 의존성 없음
S11. sitemap.ts pages + posts try/catch 격리 + images string[] — S10, M3 의존
S12. community/p/[slug]/page.tsx ArticleGraphJsonLd 통합 — S4, S3 의존
S13. p/[slug]/page.tsx LocalBusiness JSON-LD — S2 의존
S14. CardNewsPaginator.tsx alt 자동 생성 — 의존성 없음
S15. functions/tsconfig 테스트 exclude + CI lint 확장 + typecheck + build + 통합 검증
```

각 step은 가능한 격리. 의존성은 명시.

---

## §9. Test Plan

### 9.1 단위 테스트 (must-pass)

#### faq-extractor.test.ts (8 cases)
1. 정상: `## 자주 묻는 질문\n### Q1. ...\n답변...\n### Q2. ...` → 2개
2. ## 헤더 부재 → 빈 배열 (graceful)
3. 헤더 변형 ("자주묻는 질문" 공백 없음) → 추출 OK
4. ### Q 변형 (Q1./Q1:/Q1)) 처리
5. 빈 본문 → 빈 배열
6. Q는 있으나 답변 빈 줄 → 해당 Q 제외, 나머지만 반환
7. utf-8 한국어 + 특수문자 → 정상 추출
8. 중간 H2가 끼인 경우 (FAQ 섹션 끝까지만) → 다른 ##에서 종료

#### auto-publish-window.test.ts (8 cases — host TZ 시뮬레이션 산술 검증)
1. toKstWallClock(real UTC 23:08:13 4/27 = KST 08:08 4/28) → {year:2026, month:3, date:28, day:2(Tue), hours:8, minutes:8}
2. setKstClock({y:2026,m:3,d:28,...}, 360) → expect: real UTC 21:00:00 4/27 (= KST 06:00 4/28)
3. setKstClock({y:2026,m:3,d:28,...}, 1080) → expect: real UTC 09:00:00 4/28 (= KST 18:00 4/28)
4. nextAutoPublishWindow with start=06:00, today=Tue, todayMin=08:08, weekdays=[2,4,5,6] → today 06:00 KST (window)
5. nextAutoPublishWindow with todayMin >= endMinute → next active day 06:00 KST
6. recentlyPublishedInWindow: lastTick=real UTC 23:08:13 4/27, now=real UTC 00:00 4/28(KST 09:00 4/28), startMinute=360 → expect TRUE
7. recentlyPublishedInWindow: lastTick=null → expect FALSE
8. nextNAutoPublishWindows(n=5, weekdays=[2,4,5,6]) → 5 entries with KST dates 4/28, 4/30, 5/1, 5/2, 5/5

#### article-jsonld.test.ts (5 cases — H6 추가)
1. FAQ 있는 본문 → @graph에 Article + FAQPage 둘 다 (graceful 정상)
2. FAQ 없는 본문 → @graph에 Article만 (graceful, R9)
3. breadcrumb opt → BreadcrumbList 포함
4. card-news post (post.format === 'card-news') → FAQPage 추출 안 함 (gate)
5. **(H6)** hygiene check 통과한 FAQ 본문 (가격·할인율 단정 없음) → schema 정상 + Rich Results Test 통과

### 9.2 통합 검증
- `pnpm exec tsc --noEmit` (Next.js + functions 모두 exit 0)
- `pnpm exec next build` (full prerender 성공, 모든 페이지)
- `pnpm lint:mirror` (5개 mirror check 모두 통과 — 기존 + 2 신규)
- `pnpm test:seo`, `pnpm test:window` (모두 exit 0)
- 1개 실제 글 → Google Rich Results Test 수동 검증 (Article + FAQPage + Breadcrumb 인식)

### 9.3 통합 시나리오 검증 (수동, K2 결의)
- gcloud trigger 후 cron 로그에서 recentlyPublishedInWindow가 두 번째 호출에서 TRUE 반환
- /partner/series 미리보기 시각이 KST 06:00 = AM 06:00로 정상 표시
- 새 발행 글 → /community/p/{slug} → view-source → JSON-LD에 FAQPage @graph 확인
- /p/{slug} 매장 페이지 → view-source → LocalBusiness JSON-LD 확인
- 모든 페이지 view-source → Organization JSON-LD 확인

---

## §10. Risk Table (v0.2)

| Risk | Mitigation | Severity |
|---|---|:---:|
| AI 출력 형식 일관성 부족 (FAQ 섹션 누락 또는 형식 변형) | regex graceful fallback (R9) + hygiene check 강화 (H6) | M |
| FAQ regex 매칭 실패 silent | console.warn (cycle #29+ admin dashboard로 정밀화) | L |
| Page 모델 데이터 부족 (address/phone null) | optional 필드 omit (schema.org spec 준수, C3) | L |
| Vercel 환경 변수 누락 | layout.tsx에서 fallback URL ('https://cheonggwang.app') | L |
| sitemap pages 폭증 | 5000개 한도 + Page count ≤ 수백 가정 | L |
| timezone 핫픽스 회귀 (다른 시계열 영향) | 단위 테스트 8개 + KST/UTC 호스트 산술 시뮬레이션 (C1, H7) | H |
| Cloud Functions Node 22 ↔ Vercel Node 22 차이 | mirror 단위 테스트 + CI lint 2개 추가 | L |
| Google Rich Results Test 거부 | 1개 글로 사전 수동 검증 + JSON-LD ts type 강제 | M |
| functions test build 산출물 오염 (C4) | tsconfig exclude + tsconfig.test.json 분리 | L |
| LocalBusiness sitemap이 Page 발견성 의존 | pageRepository.listPublishedSlugsForSitemap 신규 메서드 (H4) | L |
| sameAs JSON.parse throw로 layout prerender 깨짐 | try/catch 명시적 코드 (M7) | M |

---

## §11. Open Questions (자체 답변 + Default 명시)

| ID | Question | Resolution / Default |
|----|---|---|
| OQ1 | 카드뉴스도 FAQ 섹션 포함? | NO — H1 결의. blog format에만 적용 |
| OQ2 | sameAs 빈 배열일 때 omit? | YES — M7. 빈 배열 노출보다 omit이 schema.org 권장 |
| OQ3 | LocalBusiness type 더 구체화 (CleaningService)? | NO — L8. cycle #29+로 deferred |
| OQ4 | dateModified 모든 Article에 추가? | YES — Post.updatedAt이 createdAt과 다르면 출력 (M4) |
| OQ5 | breadcrumb categoryLabel 한국어 vs slug? | 한국어 (panelLabelForPost) — UX consistency, M6 결의 |
| OQ6 | regex 깨졌을 때 admin 알림? | NO — cycle #29+ dashboard. 본 cycle은 console.warn |
| OQ7 | LocalBusiness aggregateRating? | NO — 리뷰 시스템 미존재 (cycle #29+) |
| OQ8 | Organization contactPoint? | NO — 별도 사이클 |

---

## §12. 결의 매트릭스 (v0.1 → v0.2 — 26개 issue 모두 결의)

### Critical (4개)

| ID | Issue | 결의 |
|---|---|---|
| **C1** | KST host에서 `toKST` 후 `getUTCDate` 산술 잘못 (자체 식별, validator 검증) | §3.7 재작성. `toKstWallClock` Intl.DateTimeFormat 기반 host-agnostic 헬퍼 도입. KST=UTC+9 명시 산술로 setKstClock 재구현 |
| **C2** | reality-check 영역 (panelLabel, partnerRepository.listAll, profile fields) | (a) panelLabel/Slug 헬퍼 부재 → M6로 reclassify (post-panel.ts NEW). (b) partnerRepository.listAll 존재하나 본 cycle 사용 안 함 (Page 모델 사용, C3 결의). (c) PartnerProfile.address/telephone은 Partner 모델에는 있으나 /p/[slug]에는 부적합 (C3 결의) |
| **C3** | /p/[slug]는 Page 모델, design v0.1의 Partner 가정 잘못 | §3.2 완전 재작성. `buildLocalBusinessJsonLd(page: Page, slug, base)` 시그니처. Page.address/phone/region/businessName/sections.intro.body 직접 매핑 |
| **C4** | functions/tsconfig가 *.test.ts를 빌드 산출물에 포함 | §4.2 #12 tsconfig 수정 — exclude `**/*.test.ts` 추가 + `tsconfig.test.json` 분리 (§4.5 test 러너 명시) |

### High (7개)

| ID | Issue | 결의 |
|---|---|---|
| **H1** | 프롬프트 추가가 card-news에도 영향 (formatRule 한 줄 차이) | §3.1, §5.4 — 추가 5줄을 `규칙:` 블록 내 blog 전용 위치에 명시. card-news는 buildCardNewsInstruction()이 별도 path로 가지므로 영향 안 받음 (검증) |
| **H2** | buildArticleJsonLd 호출자 grep | 검증 결과 1곳만 (community/p/[slug]/page.tsx). deprecate + 신규 buildArticleGraphJsonLd 도입 안전 |
| **H3** | metadataBase async 불가 (export const metadata sync) | §3.3 — `process.env.NEXT_PUBLIC_BASE_URL` 직접 사용 + hardcoded fallback `'https://cheonggwang.app'` |
| **H4** | sitemap에서 partnerRepository.listAll로 매장 페이지 enumerate 잘못 (Partner ≠ Page) | §3.5 재작성. `pageRepository.listPublishedSlugsForSitemap(limit)` 신규 메서드 + `published===true && slug !== null` 필터 |
| **H5** | ArticleJsonLd interface → ArticleGraphJsonLd 마이그레이션 미정의 | §5.1 — 신규 type interface (`ArticleNode`, `FaqPageNode`, `BreadcrumbListNode`, `ArticleGraphJsonLd` union). 기존 `ArticleJsonLd` deprecate 마킹 |
| **H6** | hygiene-guard FAQ 답변 가격 단정 → fail 가능 | §3.1 프롬프트에 "FAQ 답변에서도 가격·할인율·전화번호 단정 금지" 라인 추가. §9.1 article-jsonld.test.ts case 5에 hygiene+FAQ 통합 케이스 |
| **H7** | setDate host-TZ 의존 (C1 영향 범위 확장) | §3.7 — nextAutoPublishWindow + nextNAutoPublishWindows + currentWindowStart 모두 toKstWallClock 기반으로 마이그레이션. addDaysToWall helper로 KST date 산술 명시화 |

### Medium (9개)

| ID | Issue | 결의 |
|---|---|---|
| **M1** | post.format gate 정확성 | faq-extractor 호출자(article-jsonld.ts)에서 `post.format !== 'card-news'`로 gate. undefined 글 (legacy)도 추출 시도 (대부분 blog) |
| **M2** | Organization on all pages | 허용. <head> 안 1KB/page 비용 < CLS/LCP 영향. 비공개 페이지(robots:noindex)에도 출력되지만 인덱싱 X |
| **M3** | sitemap images: string[] (객체 배열 X) | §3.5, §4.2 #7 — `images: p.coverImageUrl ? [p.coverImageUrl] : undefined` |
| **M4** | dateModified Post.updatedAt 보존 invariant 검증 | post-repository.ts 검증 — updatedAt은 본문 변경시만 갱신, 단순 read는 갱신 X. R5 invariant 보존됨 |
| **M5** | slug encoding (한국어 slug 대비) | §3.2, §3.5 — `${base}/p/${encodeURIComponent(slug)}` 명시 |
| **M6** | post-panel 헬퍼 부재 | §4.1 #5 신규 파일 `src/lib/feed/post-panel.ts` (postTypeToPanelSlug + panelLabelForPost) |
| **M7** | sameAs JSON.parse throw → layout prerender 깨짐 | §3.3 명시적 try/catch parseSameAs 함수. 잘못된 형식이면 [] |
| **M8** | sitemap 부분 실패 처리 | §3.5 — pages와 posts 별도 try/catch (tryFetch helper) |
| **M9** | breadcrumb scope 명확화 | §3.4, §13 명시 — community/p/[slug]만. /p/[slug]는 LocalBusiness 단독 |

### Low (6개)

| ID | Issue | 결의 |
|---|---|---|
| **L1** | NEXT_PUBLIC_BRAND_SAME_AS 형식 검증 | M7과 통합 결의 |
| **L2** | faq-extractor 한국어만 가정 | v1 한국어 limit 명시 (cycle #29+ 다국어) |
| **L3** | BreadcrumbList position 1-based | schema.org spec 확인 — 1-based 맞음 |
| **L4** | JsonLdScript 위치 명시 | §3.3 — 기존 컴포넌트 `src/components/seo/JsonLdScript.tsx` 그대로 사용 |
| **L8** | LocalBusiness type 더 구체화 (Restaurant 등) | OQ3 — cycle #29+로 deferred |
| **L9** | plan §6 test count vs design §4.1 sync | plan §6 S4를 8개로 업데이트 권장 (post-cycle, 미세) |

---

## §13. Streak Context

cycles #21~#27 모두 ≥ 90% Match Rate 단일 사이클 통과 (7번 연속). cycle #28은 8th attempt.

medium-large scope (~830 LOC + 10개 신규 + 12개 수정 = 22 files) — 26개 issue 모두 v0.2에서 결의. surgical 변경 + 데이터 모델 0 변경 + Option A 코드 복제 미러 패턴 재사용. host-TZ-agnostic 마이그레이션이 가장 큰 surgery (4개 함수 + 신규 helper) 지만 unit test로 격리됨.

---

## §14. Next Step

```
/pdca do partner-aeo-boost
```

S1~S15 순차 진행. 격리된 step부터 (S1·S2·S3·S5·S7·S10·S14는 의존성 없음, 병렬 가능). mirror 페어(S5-S6, S7-S8)는 짝.

R1 invariant 8번째 검증 (cycle #19 generator 0줄 변경) + Plan Plus + design-validator 패턴 8-streak 도전.
