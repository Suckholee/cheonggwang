# partner-aeo-boost · Plan (cycle #28 v1.15)

> Plan Plus 4-phase output. Brainstorming-enhanced PDCA planning.
> Generated: 2026-04-28
> Streak target: 8th consecutive single-pass ≥90%

---

## 0. Summary

청광 v1.15 cycle #28. **AEO(Answer Engine Optimization) + SEO 부스트 + cycle #19 timezone latent gap 핫픽스**를 단일 medium-large 사이클로 묶음.

핵심 가치:
1. **AI 답변 엔진 인용률 +35~70%** — Perplexity/ChatGPT Search/Google AI Overview에서 청광 글이 인용 답변으로 발견되는 빈도 상승
2. **지역 검색 노출 +30~40%** — "강남 청소 서비스" 등 LocalBusiness 매핑
3. **timezone 버그 회복** — recentlyPublishedInWindow 정상 동작 (한 윈도우 한 번 invariant), 미리보기 시간 표시 정상화

---

## 1. User Intent Discovery (Phase 1)

### Q1. Core Purpose — 사이클 #28 범위
**선택**: AEO + SEO + timezone 핫픽스 묶음

### 동기 (사용자 인사이트)
- cycle #27 partner-series-queue 배포 후 발견된 **2가지 문제**:
  1. AEO/SEO 진단 종합 69/100 (C+) — AI 답변 엔진 시대에 콘텐츠가 발견 안 됨
  2. setKstClock 9시간 오프셋 버그 (cycle #19 잠복) — UTC 호스트(Vercel/Cloud Functions)에서 미리보기 시각 오기재 + recentlyPublishedInWindow 무력화 (한 윈도우 다회 발행 위험)
- 두 문제 모두 사장님 실측 운영 단계에서 드러남 → 즉시 처리 필요

### Target Users
- **Primary**: 검색 엔진 봇 (Google, Naver, Yandex) + AI 답변 엔진 (Perplexity, ChatGPT Search, Google AI Overview, Gemini)
- **Secondary**: 청소 서비스 검색하는 손님 (지역명 + 서비스명 검색 → 청광 매장 페이지/글 노출)
- **Tertiary**: 사장님 (자동 발행 시간 정확 표시, 중복 발행 방지)

### Success Criteria
- AC1: 발행된 글 페이지에 FAQPage JSON-LD가 출력 (Google Rich Results Test 통과)
- AC2: 매장 페이지 `/p/[partnerId]`에 LocalBusiness JSON-LD 출력
- AC3: 전역 layout에 Organization JSON-LD 출력
- AC4: 모든 페이지 og:image가 절대 URL (metadataBase 작동)
- AC5: AI 생성 글에 `## 자주 묻는 질문` 섹션 + `### Q1./Q2./Q3.` 형식 포함률 ≥ 95%
- AC6: AI 생성 글의 H2가 자연어 질문 형식 비율 ≥ 70%
- AC7: setKstClock unit test 6개 모두 통과 (UTC 호스트 + KST 호스트 시뮬레이션)
- AC8: recentlyPublishedInWindow 정상 동작 (lastTickAt > windowStart KST 06:00 → TRUE 반환) 검증
- AC9: 카드뉴스 슬라이드 alt 자동 생성 (`alt=""` 0건)
- AC10: sitemap.xml에 `<image:image>` 태그 + `/p/[partnerId]` URL 포함

---

## 2. Alternatives Explored (Phase 2)

### Approach A — Surgical Prompt + Regex 파싱 (선택됨) ✅
- **Pros**:
  - 데이터 모델 변경 0 → Firestore 마이그레이션 X
  - 기존 published 글에도 자동 효과 (article-jsonld.ts가 매번 파싱)
  - rollback 쉬움 (프롬프트 string + JSON-LD 함수만 교체)
  - 7-streak 유지 가능 (medium scope)
- **Cons**:
  - regex 파싱이 AI 출력 일관성에 의존 → graceful fallback 필요 (R9)
  - FAQ를 별도 UI 편집/표시하려면 cycle #29+ 추가 작업

### Approach B — Structured FAQ 필드 (post 모델 확장)
- AI가 `faqs: Array<{q,a}>` 별도 JSON 반환 → Post 모델에 저장
- robust + 미래 확장성 좋음
- 마이그레이션 필요 + scope ~750 LOC → 7-streak 부담 ↑
- **Out of cycle #28**: cycle #29 또는 #30에서 검토

### Approach C — LLM-as-judge (별도 LLM call)
- 두 번째 LLM call로 SEO 데이터 추출
- 비용 +50%, latency +10s
- **영구 out-of-scope**: 비용 정당화 어려움

---

## 3. YAGNI Review (Phase 3)

### In-scope (cycle #28)
| ID | 항목 | LOC |
|---|---|---:|
| S1 | AI 프롬프트 개선 (TL;DR + 질문형 H2 + FAQ 섹션) | ~80 |
| S2 | FAQPage JSON-LD 자동 추출 + @graph 통합 | ~120 |
| S3 | metadataBase 설정 (layout.tsx) | ~20 |
| S4 | setKstClock timezone 핫픽스 + 단위 테스트 | ~80 |
| A1 | LocalBusiness JSON-LD (매장 페이지) | ~100 |
| A2 | Organization JSON-LD (전역 brand) | ~40 |
| A3 | 카드뉴스 슬라이드 alt 자동 생성 | ~30 |
| A4 | BreadcrumbList JSON-LD + 이미지 sitemap | ~80 |
| | 단위 테스트 + CI lint | ~100 |
| | 미러 (functions side) | ~100 |
| | **합계** | **~750** |

### Deferred to cycle #29+
- **author/정확 날짜 UI 노출** — E-E-A-T 시각화. 영향 작음, 별도 사이클 가능
- **HTML 비교 테이블 sanitize 허용** — markdown table 파싱 + sanitize-html 화이트리스트 확장
- **이미지 검색 sitemap 별도 파일** (`/sitemap-images.xml`)
- **JSON-LD 단위 테스트 fixture 라이브러리**

### Permanent out-of-scope
- LLM-as-judge 별도 호출 (비용 정당화 X)
- 사장님이 FAQ 직접 편집하는 UI (post 모델 확장 필요)
- aggregateRating in LocalBusiness (리뷰 데이터 없음)
- Schema.org `Service` 카테고리 매핑 (분류 체계 별도 설계 필요)

---

## 4. Architecture (Phase 4)

### 4.1 AEO 콘텐츠 흐름
```
AI 프롬프트(개선) → markdown 본문
  ├─ [TL;DR] 첫 단락 2-3줄 (직접 답변)
  ├─ 질문형 H2 ("OO 비용은?", "어떻게 ...?")
  └─ ## 자주 묻는 질문 (### Q1./Q2./Q3. + 답변)
  ↓ Firestore 저장 (Post)
  ↓ 글 페이지 렌더 시
article-jsonld.ts (수정)
  ├─ FAQ regex 추출 (faq-extractor.ts NEW)
  ├─ BreadcrumbList 빌드
  └─ @graph: [Article, FAQPage, BreadcrumbList]
  ↓
<script type="application/ld+json"> @graph </script>
```

### 4.2 매장 페이지 흐름
```
/p/[partnerId] → partner.profile
  ↓
local-business-jsonld.ts (NEW)
  ├─ name, image, address (fallback null)
  ├─ telephone (fallback null)
  └─ openingHoursSpecification
  ↓
<script type="application/ld+json"> LocalBusiness </script>
```

### 4.3 전역 흐름
```
RootLayout (server)
  ├─ metadataBase = new URL(NEXT_PUBLIC_BASE_URL)
  └─ organization-jsonld.ts (NEW)
       ├─ logo (절대 URL)
       ├─ sameAs (instagram/facebook)
       └─ areaServed: KR
```

### 4.4 카드뉴스 alt 흐름
```
CardNewsPaginator render
  ↓
slideHtmls.forEach((html, i) => 
  alt = `${companyName} 카드뉴스 슬라이드 ${i+1}: ${stripHtml(html).slice(0, 60)}`)
```

### 4.5 Timezone 핫픽스 흐름
```
setKstClock(base, minute) 재구현
  - 이전: base.setHours(h, m) (host TZ 의존)
  - 현재: Date.UTC(base.getUTCFullYear(), getUTCMonth(), getUTCDate(), h-9, m)
                                                            ^^^ KST=UTC+9 명시 산술
  ├─ Next.js: src/lib/partner/auto-publish-window.ts
  └─ Functions: functions/src/auto-series/lib/window.ts (mirror)

회복 효과:
  - recentlyPublishedInWindow 정상 동작 (R3·M3 invariant 회복)
  - /partner/series 미리보기 시각 정상 표시 (KST 06:00 → AM 06:00)
  - 한 윈도우 다회 발행 위험 차단
```

---

## 5. Components / Files

### 5.1 신규 파일 (8개)
| 파일 | 역할 | LOC |
|---|---|---:|
| `src/lib/seo/faq-extractor.ts` | markdown FAQ 섹션 정규식 파서 (pure) | 60 |
| `src/lib/seo/local-business-jsonld.ts` | LocalBusiness 빌더 | 80 |
| `src/lib/seo/organization-jsonld.ts` | Organization 빌더 | 40 |
| `src/lib/seo/breadcrumb-jsonld.ts` | BreadcrumbList 빌더 | 50 |
| `src/lib/seo/faq-extractor.test.ts` | 8개 단위 테스트 | 120 |
| `src/lib/seo/article-jsonld.test.ts` | @graph 통합 4개 테스트 | 80 |
| `src/lib/partner/auto-publish-window.test.ts` | setKstClock 신규 6 케이스 | 100 |
| `functions/src/auto-series/lib/window.test.ts` | mirror 동일 | 100 |

### 5.2 수정 파일 (10개)
| 파일 | 변경 |
|---|---|
| `src/lib/llm/partner-promo-generator.ts` | buildComposePrompt 재구성 |
| `functions/src/auto-series/lib/generator.ts` | 동일 프롬프트 mirror |
| `src/lib/seo/article-jsonld.ts` | @graph 통합 (FAQPage + BreadcrumbList) |
| `src/app/community/p/[slug]/page.tsx` | Breadcrumb + FAQ JSON-LD render |
| `src/app/p/[partnerId]/page.tsx` | LocalBusiness JSON-LD render |
| `src/app/layout.tsx` | metadataBase + Organization JSON-LD |
| `src/app/sitemap.ts` | image:image + /p/[partnerId] |
| `src/components/post/CardNewsPaginator.tsx` | alt 자동 생성 |
| `src/lib/partner/auto-publish-window.ts` | setKstClock fix |
| `functions/src/auto-series/lib/window.ts` | setKstClock fix mirror |

### 5.3 CI lint 확장
```js
// scripts/check-queue-mirror.mjs 추가 체크:
{
  title: "setKstClock host TZ 무관 산술",
  files: [...auto-publish-window.ts, ...window.ts],
  test: (src) => /Date\.UTC\(/.test(src) && !/setHours\(/.test(src),
}
```

### 5.4 환경 변수 (Vercel)
```
NEXT_PUBLIC_BASE_URL=https://cheonggwang.app
NEXT_PUBLIC_BRAND_SAME_AS=https://www.instagram.com/cheonggwang_official  (optional)
```

---

## 6. Implementation Order (S1–S13)

| Step | 작업 | 의존성 |
|---:|---|---|
| S1 | `faq-extractor.ts` + 단위 테스트 8개 | 없음 |
| S2 | `local-business-jsonld.ts` + `organization-jsonld.ts` + `breadcrumb-jsonld.ts` | 없음 |
| S3 | `article-jsonld.ts` 수정 (@graph 통합) + 테스트 4개 | S1, S2 |
| S4 | `setKstClock` fix (Next.js side) + 테스트 6개 | 없음 |
| S5 | `setKstClock` fix (functions mirror) + 테스트 6개 | S4 |
| S6 | `partner-promo-generator.ts` 프롬프트 수정 | 없음 |
| S7 | `functions/.../generator.ts` 프롬프트 mirror | S6 |
| S8 | `layout.tsx` metadataBase + Organization JSON-LD | S2 |
| S9 | `sitemap.ts` image:image + 매장 페이지 포함 | 없음 |
| S10 | `community/p/[slug]/page.tsx` JSON-LD 통합 | S3 |
| S11 | `p/[partnerId]/page.tsx` LocalBusiness JSON-LD | S2 |
| S12 | `CardNewsPaginator.tsx` alt 자동 생성 | 없음 |
| S13 | CI lint(`check-queue-mirror.mjs`) 확장 + typecheck + build + 통합 검증 | 모두 |

---

## 7. Acceptance Criteria

### AC1~AC10 (위 §1.3)

추가 invariants (cycle #28 결의):
- **R9 graceful fallback**: FAQ 정규식 매칭 실패해도 Article schema는 정상 출력
- **R10 host-TZ-agnostic**: setKstClock 결과가 Node 22 UTC 환경 + macOS KST 환경에서 동일
- **R11 cycle #19 generator 0줄 변경 (8번째)**: 함수 시그니처/구조 무수정, 프롬프트 string만 교체

---

## 8. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| AI 출력 형식 일관성 부족 (FAQ 섹션 누락) | regex graceful fallback (R9) + hygiene check 강화 | M |
| FAQ regex 매칭 실패시 silent (사장님 모름) | console.warn + admin 모니터링 카운터 | L |
| LocalBusiness 데이터 부족 (address/telephone null) | optional 필드 처리, schema 스펙 준수 (null 누락 허용) | L |
| Vercel 환경 변수 누락 | layout.tsx에서 fallback URL ('https://cheonggwang.app') | L |
| sitemap 매장 페이지 추가로 사이즈 폭증 | 5000개 제한 유지, partners ≤ 수백 가정 | L |
| timezone 핫픽스 회귀 (다른 시계열 로직 영향) | 단위 테스트 6개 + 통합 시나리오 검증 | M |
| Cloud Functions Node 22 ↔ Vercel Node 22 차이 | mirror 단위 테스트 + CI lint | L |

---

## 9. Test Plan

### 9.1 단위 테스트 (must-pass)
- `faq-extractor.test.ts` — 8 케이스 (정상 / Q 누락 / A 누락 / 마크다운 변형 / 빈 본문 / 다중 H2 / utf-8 한국어 / 특수문자)
- `auto-publish-window.test.ts` — 신규 6 케이스 (KST 호스트 / UTC 호스트 / setKstClock 결과 검증 / recentlyPublishedInWindow 양성 / 음성 / 윈도우 경계)
- `article-jsonld.test.ts` — 4 케이스 (FAQ 있음 / 없음 / Breadcrumb 빌드 / @graph 결합)

### 9.2 통합 검증
- pnpm exec tsc --noEmit (Next.js + functions 모두 exit 0)
- pnpm exec next build (full prerender 성공)
- pnpm lint:mirror (3개 mirror check 모두 통과)
- /community/p/[slug] 1개 글 → Google Rich Results Test 수동 검증

### 9.3 timezone 회귀 검증 (수동)
- gcloud trigger 후 functions log 확인 — recentlyPublishedInWindow가 두 번째 호출에서 TRUE 반환하는지

---

## 10. Out of Scope (영구 + 다음 사이클 이월)

### 영구 out
- LLM-as-judge 별도 호출
- 사장님 FAQ 직접 편집 UI
- aggregateRating
- Schema.org Service 분류

### 다음 사이클 이월 (#29+)
- author/정확 날짜 UI 노출 (E-E-A-T 시각화)
- HTML 비교 테이블 sanitize 허용
- /sitemap-images.xml 분리
- 매장 페이지 aggregateRating (리뷰 시스템 도입 후)
- 카드뉴스 슬라이드별 WebContent JSON-LD 구조화

---

## 11. Brainstorming Log

### Q1 결정
사용자 가이드: "AEO와 SEO 최적화에 대한 부분이 적용되있는지 확인해줘" → 진단 결과 종합 69/100 (C+) 받음. AEO 영역만 45/100 (D+)이라 가장 큰 손실. timezone 버그도 같은 testing session에서 발견. 두 가지를 한 사이클에 묶는 것이 효율적이라고 판단 → Recommended Option A 선택.

### Q2 결정
Surgical 접근 (regex 파싱) vs Structured 접근 (post 모델 확장). cycle #28은 7-streak 유지 + 실용적 배포 우선이므로 Surgical 선택. 미래 사장님 편집 UI가 필요해지면 cycle #29-#30에서 모델 확장.

### Q3 결정
모든 add-on (LocalBusiness + Organization + 카드뉴스 alt + Breadcrumb + 이미지 sitemap) 다 포함. 사용자 의도: 한 번 손댈 때 SEO 인프라 완비. scope 750 LOC로 medium-large지만 대부분 surgical 변경.

### 핵심 invariant 결정
- R1 cycle #19 generator 0줄 변경 8번째 시도 (라이브러리 자산 보존)
- R9 graceful fallback (regex 깨져도 Article 정상)
- R10 host-TZ-agnostic setKstClock (UTC + KST 환경 단일 결과)
- R11 프롬프트 string만 수정 (함수 시그니처 0 변경)

### 위험 식별
- AI 출력 일관성 변동 → R9로 mitigation
- timezone fix가 다른 시계열에 영향 → 단위 테스트 + 통합 시나리오로 격리

---

## 12. Streak Context

cycles #21~#27 모두 ≥ 90% Match Rate 단일 사이클 통과 (7번 연속). cycle #28은 8th attempt. medium-large scope (~750 LOC)이지만 모두 surgical 변경 + 데이터 모델 0 변경 + 기존 코드 미러 패턴 재사용 → Plan Plus + design-validator 패턴으로 8-streak 도전 가능.

---

## 13. Next Step

```
/pdca design partner-aeo-boost
```

Design 단계에서:
- 24~30개 §12 결의 매트릭스 생성 (C/H/M/L)
- design-validator 에이전트로 reality-check (실제 파일 grep + 인용)
- 모든 issue 0건 될 때까지 v0.1 → v0.2 iteration
- 그 후 /pdca do 로 Do phase 시작
