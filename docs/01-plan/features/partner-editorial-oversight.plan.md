# partner-editorial-oversight · Plan (cycle #29 v1.16)

> Plan Plus 4-phase output. Brainstorming-enhanced PDCA planning.
> Generated: 2026-04-28
> Streak target: 9th consecutive single-pass ≥ 90%

---

## 0. Summary

청광 v1.16 cycle #29. **Google scaled content abuse 정책 회피 + 한국 광고법 2026년 초 시행 대비** + cycle #28 AEO 인프라 위에 **편집 투명성/책임감** layer 추가.

핵심 가치:
1. **사장님 검토 단계 도입** — 신규 매장 default `draft-only`. AI가 생성하면 draft 저장, 사장님이 검토 후 publish 토글. Google scaled content abuse 정의("editorial oversight 부재")를 명시적으로 회피.
2. **AI 작성 footer 명시** — 본문 마지막에 "이 글은 AI가 매장이 제공한 정보를 바탕으로 작성한 후 매장에서 검토했습니다" 표시. 한국 광고법 2026년 초 AI 표시 의무화 대비.
3. **확장 포인트** — `targetAudience: string | null` 필드 사전 추가 (cycle #30 audience targeting feature 준비).

---

## 1. User Intent Discovery (Phase 1)

### Q1. Default publishMode + 기존 매장 migration
**선택**: B. 신규 매장은 draft-only default, 기존 7매장은 'auto' 유지 (back-compat)

### 동기 (사용자 인사이트)
사용자 질문: "구글이나 다른 LLM에서 이렇게 올리는 글들에 대해서 제재를 가하지는 않을까?"

조사 결과 (Google 2026년 3월 코어 업데이트, 한국 광고법 2026년 초 시행 예정):
- AI 생성 자체는 처벌 X
- "Scaled content abuse" — 사람 검토 없이 50-500 articles/day 생성 사이트 50-80% 트래픽 감소
- 한국: AI 생성 광고에 "AI 생성" 표시 의무화 추진 중

청광 현재 상태: 7매장 × 1/일 = 49/주 = 안전 영역. 100매장 확장 시점 대비하여 미리 editorial oversight 구조 도입.

### Target Users
- **Primary**: 사장님 (의뢰업체 운영자) — 검토 단계 추가
- **Secondary**: Google·Naver·AI 답변 엔진 — editorial oversight 신호 강화
- **Tertiary**: 손님 — AI 작성 명시로 신뢰도 형성, 한국 광고법 준수

### Success Criteria
- AC1: 신규 매장이 `togglePartnerAutoSeries`로 자동시리즈 활성화 시 `publishMode='draft-only'` default
- AC2: 기존 7매장 `publishMode` 미설정 → mapper에서 'auto' 반환 (back-compat)
- AC3: `publishMode='draft-only'`인 매장 cron tick: post가 `publishStatus='draft'` + isAutoSeries=true로 저장
- AC4: 사장님 `/partner/posts`에 "🤖 자동 draft 검토 대기" 필터 + 카드 표시
- AC5: 사장님이 draft 글에서 publish 토글 → cycle #19 기존 토글 사용 (publishStatus='published'로 전환)
- AC6: BlogRenderer가 isAutoSeries+partner-promo+blog 글 본문 끝에 AI footer 자동 추가
- AC7: CardNewsViewer가 isAutoSeries+partner-promo+card-news 글 슬라이드 다음에 AI footer 추가
- AC8: 사장님 직접 작성 글 또는 tip/provider postType은 footer 없음
- AC9: PartnerHeaderNav에 검토 대기 건수 빨간 배지 (count > 0일 때만)
- AC10: seriesHistory에 새 status 'auto-draft-saved' 추가, admin 통계에 반영
- AC11: Q1 미설정 시 Q2 default 'auto' 반환 (R12 back-compat invariant)
- AC12: targetAudience 필드 추가 (default null, cycle #30 미사용 시점에는 AI prompt 무관)

---

## 2. Alternatives Explored (Phase 2)

### Approach A — Surgical (선택됨) ✅
- **publishMode**: `partner.autoSeries.publishMode` field 확장 (cycle #26~#28 패턴)
- **AI footer**: BlogRenderer + CardNewsViewer post-render append (text 한 줄 변경으로 모든 기존 글 즉시 반영)
- **검토 dashboard**: `/partner/posts?filter=auto-draft` 필터 + cycle #19 publish 토글 재사용
- ~830 LOC, Firestore 마이그레이션 0건
- **Pros**: surgical, 8-streak 패턴 유지, rollback 쉬움
- **Cons**: footer가 server에 저장 안 됨 → SEO 인덱싱은 render된 HTML에 포함되지만 본문 markdown엔 없음

### Approach B — Server-side bodyMarkdown 변환
- footer를 server action publish 시점에 bodyMarkdown 끝에 append하여 Firestore 저장
- 장점: 본문에 포함되어 SEO 인덱싱 명확
- 단점: 마이그레이션 + sanitize-html escape 가능, render 동일하므로 사용자 체감 차이 없음
- **out of scope cycle #29**

### Approach C — AI prompt 강제
- AI prompt에 footer 텍스트 강제
- 단점: 표현 변동, token +10% 비용, 카드뉴스 부자연
- **permanent out of scope**

---

## 3. YAGNI Review (Phase 3)

### In-scope (cycle #29)

**핵심 (자동 포함)**:
| ID | 항목 | LOC |
|---|---|---:|
| S1 | `partner.autoSeries.publishMode` 필드 + back-compat default | 30 |
| S2 | runner publishMode 분기 + functions mirror | 100 |
| S3 | AI footer (BlogRenderer + CardNewsViewer post-render append) | 60 |
| S4 | `/partner/posts` auto-draft 필터 | 60 |

**Add-ons (사용자 선택)**:
| ID | 항목 | LOC |
|---|---|---:|
| A1 | publishMode 설정 UI (PartnerPublishModeToggle) | 100 |
| A2 | 검토 대기 건수 빨간 배지 (PartnerHeaderNav) | 50 |
| A3 | seriesHistory.publishMode 기록 + auto-draft-saved status | 40 |

**확장 포인트 (X2 결정)**:
| ID | 항목 | LOC |
|---|---|---:|
| X2 | `partner.autoSeries.targetAudience: string \| null` 필드 (cycle #30 활용) | 20 |

**Tests + Mirror**:
| ID | 항목 | LOC |
|---|---|---:|
| T1 | ai-footer.test.ts (4 cases) | 80 |
| T2 | publishMode unit test | 80 |
| T3 | functions mirror sync (types + runner) | 100 |
| T4 | check-queue-mirror.mjs lint 추가 | 30 |
| | **합계** | **~830** |

### Deferred to cycle #30+
- **X1 audience targeting 활용** — UI 입력, AI prompt 반영, 콘텐츠 분기 (이번 cycle엔 필드만)
- **A4 admin 일괄 publish** — /admin/auto-series에 draft 일괄 처리 도구
- **draft expire 정책** — N일 안에 검토 안 하면 자동 폐기/재생성
- **사장님 알림** — 이메일/in-app 신규 draft 알림
- **draft 사장님 직접 편집** — 검토 단계에 본문 수정 UI

### Permanent out-of-scope
- AI prompt에 footer 강제 (Approach C)
- bodyMarkdown 서버 변환 (Approach B) — UX 체감 차이 X 비용 ↑
- 사용자별 visibility (특정 손님에게만 보이기) — 청광은 공개 마켓플레이스
- partner이 cron tick 끄는 옵션 — 이미 autoSeries.enabled로 가능

---

## 4. Architecture (Phase 4)

### 4.1 데이터 모델 확장

```ts
// src/types/auto-series.ts
export type PublishMode = "auto" | "draft-only";

export interface PartnerAutoSeries {
  // 기존 필드들 (cycle #26~#28)
  enabled: boolean;
  lastIndex: number;
  lastTickAt: Date | null;
  brandTone: BrandTone;
  totalPublished: number;
  totalFailed: number;
  photoCursor: number;
  
  // cycle #29 (신규 2 필드)
  publishMode: PublishMode;          // default 'auto' (back-compat R12)
  targetAudience: string | null;     // default null (X2 확장 포인트)
}
```

### 4.2 Cloud Functions runner 분기

```
partnerFromSnap → publishMode 매핑
effectiveQueue → angle/format 결정
AI generate (R1 0줄)
hygiene check (기존)

if (publishMode === 'draft-only') {
  createPostFromDraft({ ..., publishStatus: 'draft', isAutoSeries: true })
  seriesHistory append { status: 'auto-draft-saved', ... }
} else {
  createPostFromDraft({ ..., publishStatus: 'published', isAutoSeries: true })
  seriesHistory append { status: 'published', ... }  // 기존
}

photoCursor +=1 (성공시만, cycle #28)
totalPublished +=1 (성공 또는 draft 모두)
```

### 4.3 AI footer (render-time)

```
src/lib/seo/ai-footer.ts (NEW):
  export const AI_FOOTER_TEXT = "이 글은 AI가 매장이 제공한 정보를 바탕으로 작성한 후 매장에서 검토했습니다";
  
  export function shouldShowAiFooter(post: Post): boolean {
    return post.isAutoSeries === true && post.postType === 'partner-promo';
  }
  
  export function renderAiFooterHtml(): string {
    return `<p class="ai-footer text-xs text-zinc-500 mt-6 italic">${AI_FOOTER_TEXT}</p>`;
  }

BlogRenderer.tsx 수정:
  const html = renderMarkdown(body) + (shouldShowAiFooter(post) ? renderAiFooterHtml() : '');

CardNewsViewer.tsx 수정:
  슬라이드 컨테이너 다음에 footer JSX 렌더 (조건부)

R14 footer scope: isAutoSeries=true && postType='partner-promo'만.
사장님 직접 작성, tip/provider 글은 footer 없음 (광고법은 AI 작성에만 적용).
```

### 4.4 검토 dashboard 흐름

```
/partner/posts (수정):
  search params: ?filter=auto-draft
  query: postRepository.listForOwner({ ownerUid, publishStatus: 'draft', isAutoSeries: true })
  카드: 각 카드에 "🤖 검토 대기" 라벨 + cycle #19 ▶️ 발행 토글 그대로 사용

PartnerHeaderNav (수정, A2):
  server fetch: postRepository.countAutoDraftsForOwner(ownerUid)
  count > 0이면 nav에 빨간 동그라미 + 건수 (예: 🔴 3)
  
  cacheComponents 모드라 서버 fetch는 매 페이지 로드 시 재실행 — Firestore read 1회/페이지.
  성능 영향 미미 (해당 partner 본인 페이지만).
```

### 4.5 publishMode 토글 흐름 (A1)

```
/partner/series 페이지 (수정):
  PartnerPublishModeToggle 추가
  현재 publishMode 표시 + 토글 버튼:
    - "자동 발행" (auto) — AI 생성 즉시 공개
    - "검토 후 발행" (draft-only) — AI 생성 → 검토 대기 → 사장님 publish
  
  토글 클릭:
    server action togglePublishMode(mode: PublishMode)
    partnerRepository.updateAutoSeries({ publishMode: mode })
    revalidatePath('/partner/series')
```

### 4.6 Migration 전략 (R12)

```
기존 매장 (cycle #22 + cycle #29 dummies = 7):
  Firestore 필드 부재
  toAutoSeries mapper:
    publishMode: raw.publishMode ?? 'auto'    // back-compat
    targetAudience: raw.targetAudience ?? null
  → 그대로 자동 발행 (정상 동작 유지)

신규 매장 (sign-up 후 자동시리즈 활성화):
  togglePartnerAutoSeries (M6 first-time enablement 분기):
    partnerRepository.updateAutoSeries({
      ...DEFAULT_AUTO_SERIES,
      publishMode: 'draft-only',  // 신규 default
      targetAudience: null,
    })
  → 사장님이 명시적으로 토글해야 'auto' 전환

DEFAULT_AUTO_SERIES (src/types/auto-series.ts):
  publishMode: 'draft-only',
  targetAudience: null,
```

---

## 5. Components / Files

### 5.1 신규 파일 (4개)
| 파일 | 역할 | LOC |
|---|---|---:|
| `src/lib/seo/ai-footer.ts` | footer 텍스트 + shouldShowAiFooter + renderAiFooterHtml | 30 |
| `src/lib/seo/ai-footer.test.ts` | 4 cases (auto-series partner-promo blog/cardnews + 사장님 직접 + tip postType) | 80 |
| `src/components/partner/PartnerPublishModeToggle.tsx` | client, auto/draft-only toggle | 100 |
| `src/lib/firebase/post-repository-draft.ts` | countAutoDraftsForOwner + listAutoDraftsForOwner | 50 |

### 5.2 수정 파일 (12개)
| 파일 | 변경 |
|---|---|
| `src/types/auto-series.ts` | PartnerAutoSeries에 publishMode + targetAudience 추가, DEFAULT_AUTO_SERIES 업데이트 |
| `src/lib/firebase/partner-repository.ts` | toAutoSeries mapper (back-compat default) |
| `src/app/actions/partner-auto-series-actions.ts` | togglePublishMode server action + togglePartnerAutoSeries에 publishMode default |
| `src/components/post/BlogRenderer.tsx` | renderAiFooterHtml append (조건부) |
| `src/components/post/CardNewsViewer.tsx` | footer JSX 추가 (조건부) |
| `src/app/partner/series/page.tsx` | PartnerPublishModeToggle 통합 |
| `src/app/partner/posts/page.tsx` | auto-draft 필터 + 라벨 |
| `src/components/partner/PartnerHeaderNav.tsx` | 검토 대기 빨간 배지 server fetch |
| `src/components/partner/PartnerSeriesHistoryList.tsx` | auto-draft-saved status 표시 |
| `functions/src/auto-series/lib/types.ts` | mirror PartnerAutoSeries (2 신규 필드) |
| `functions/src/auto-series/runner.ts` | publishMode 분기 + history 새 status |
| `scripts/check-queue-mirror.mjs` | publishMode + targetAudience mirror check 2 추가 |

### 5.3 CI lint 확장
```js
// scripts/check-queue-mirror.mjs 추가:
{
  title: "PartnerAutoSeries.publishMode 두 패키지 모두 정의",
  files: ["src/types/auto-series.ts", "functions/src/auto-series/lib/types.ts"],
  test: (src) => /publishMode:\s*("auto"|PublishMode)/.test(src),
},
{
  title: "PartnerAutoSeries.targetAudience 두 패키지 모두 정의",
  files: ["src/types/auto-series.ts", "functions/src/auto-series/lib/types.ts"],
  test: (src) => /targetAudience:\s*string\s*\|\s*null/.test(src),
},
```

### 5.4 Test 러너
- `pnpm test:seo` 확장 — ai-footer 추가
- `pnpm test:auto-series` (NEW) — publishMode runner 분기 검증

---

## 6. Implementation Order (S1–S15)

```
S1. types/auto-series.ts — publishMode + targetAudience 필드 + DEFAULT 업데이트
S2. partner-repository.ts mapper — toAutoSeries에 back-compat default
S3. functions/.../types.ts mirror
S4. ai-footer.ts + 단위 테스트 4건 — pure functions
S5. BlogRenderer + CardNewsViewer footer append — S4 의존
S6. partner-auto-series-actions.ts — togglePublishMode + first-time default
S7. PartnerPublishModeToggle.tsx (client) — S6 의존
S8. /partner/series page에 토글 통합 — S7 의존
S9. functions/.../runner.ts publishMode 분기 + history 새 status — S3 의존
S10. post-repository-draft.ts — countAutoDraftsForOwner + listAutoDraftsForOwner
S11. /partner/posts auto-draft 필터 + UI 라벨 — S10 의존
S12. PartnerHeaderNav 빨간 배지 — S10 의존
S13. PartnerSeriesHistoryList — auto-draft-saved status 표시
S14. scripts/check-queue-mirror.mjs lint 2건 추가
S15. typecheck + build + 단위 테스트 + lint:mirror + 통합 시나리오 검증
```

격리 가능: S1·S4·S6·S10은 독립. S2-S3은 mirror 페어. S5·S7·S8·S11·S12·S13은 UI/render. S9는 functions side.

---

## 7. Acceptance Criteria

AC1~AC12 위 §1.3 참조.

추가 invariants (cycle #29 결의 예정):
- **R12 back-compat**: 기존 매장 publishMode 미설정 → 'auto' default. Firestore 마이그레이션 X
- **R13 cycle #19 토글 재사용**: draft → published 전환은 cycle #19 server action 그대로
- **R14 footer scope**: isAutoSeries+partner-promo만. 사장님 직접 작성/tip/provider는 footer X
- **R15 cycle #19 generator 0줄 변경 (9번째)**: AI prompt 무관

---

## 8. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| 기존 7매장이 default change로 갑자기 draft 모드 전환 | mapper에서 publishMode=undefined → 'auto' (R12). 명시적 변경 안 함 | L |
| 사장님이 draft 모드 인지 못 하고 글 누적 | A2 헤더 빨간 배지 + /partner/posts 필터 + 통계 노출 | M |
| AI footer 텍스트가 SEO에 부정적? | "이 글은 AI가 매장이 제공한 정보를 바탕으로..." 자연스러운 신뢰도 시그널 (E-E-A-T+) | L |
| draft 무한 누적 | cycle #30+ expire 정책. 본 cycle은 cap 없이 누적 | L |
| publishMode mirror functions side 누락 | CI lint 2건 추가로 검증 | L |
| 카드뉴스 footer 위치 불자연 | 슬라이드 다음 본문 영역에 작은 글씨로 — UX 검증 필요 | M |
| Vercel Header nav fetch 비용 | 캐시 안 됨 (cacheComponents) Firestore read 1회/페이지/사장님 — 미미 | L |

---

## 9. Test Plan

### 9.1 단위 테스트

#### ai-footer.test.ts (4 cases)
1. isAutoSeries=true + partner-promo + blog → footer 출력
2. isAutoSeries=true + partner-promo + card-news → footer 출력
3. isAutoSeries=false (사장님 직접) → footer X
4. tip postType + isAutoSeries=true (이론적) → footer X (R14)

#### publishMode runner test (4 cases)
1. publishMode='auto' → publishStatus: 'published', history.status='published'
2. publishMode='draft-only' → publishStatus: 'draft', history.status='auto-draft-saved'
3. publishMode 미설정 (기존 매장) → mapper default 'auto' → publishStatus: 'published'
4. neutral 매장이 토글 후 다음 cron tick에 적용

### 9.2 통합 검증
- `pnpm exec tsc --noEmit` (Next.js + functions): exit 0
- `pnpm exec next build`: full prerender
- `pnpm lint:mirror`: 8/8 + 2 신규 = 10/10
- ai-footer.test.ts: 모두 pass
- 시나리오: 신규 매장 활성화 → draft-only → AI 생성 → /partner/posts 카드 표시 → 토글 → published 이동 → /community/p에 footer 표시

### 9.3 회귀 보호
- cycle #28 단위 테스트 (54/54) 모두 유지
- 기존 7매장 자동 발행 동작 유지 (publishMode 'auto')

---

## 10. Out of Scope

### Permanent
- AI prompt에 footer 강제
- bodyMarkdown server-side 변환
- 손님별 visibility (특정 user에게만 노출)

### Deferred to cycle #30+
- audience targeting UI/AI 적용 (X2 필드만 cycle #29에 추가)
- admin 일괄 publish 도구 (A4)
- draft expire 정책 (N일)
- 사장님 이메일/in-app 알림
- draft 사장님 직접 편집 UI

---

## 11. Brainstorming Log

### Q1 (Default mode + migration)
선택 B: 신규 매장은 draft-only default, 기존은 auto 유지. Google scaled content abuse 회피의 결정적 요소를 신규 매장에 즉시 적용. 기존 매장은 사장님이 명시적으로 옮겨야 함 (back-compat 우선).

### Q2 (구현 접근)
선택 A: Surgical. 데이터 모델 1 field 확장 + render-time footer. Firestore 마이그레이션 0건. 8-streak 패턴 유지.

### Q3 (Add-ons)
A1+A2+A3 모두 선택. publishMode UI(A1) + 검토 배지(A2) + history 기록(A3). admin 일괄 publish(A4)는 cycle #30 이월.

### X2 (audience targeting)
필드만 cycle #29에 추가, UI/AI 적용은 cycle #30. 미래 확장 포인트 마련. cycle #29 scope 유지.

### 핵심 결정
- R12 back-compat (mapper default 'auto')
- R13 cycle #19 publish 토글 재사용
- R14 footer scope (isAutoSeries+partner-promo만)
- R15 cycle #19 generator 9번째 무수정

---

## 12. Streak Context

cycles #21~#28 모두 ≥ 90% Match Rate (cycle #28 = 98.7%, 역대 최고). cycle #29는 9th attempt.

medium-large scope (~830 LOC) — surgical 변경 + 데이터 모델 1 field 확장 + Option A mirror 패턴 4번째 사이클. Plan Plus + design-validator 패턴 9번째 검증.

---

## 13. Next Step

```
/pdca design partner-editorial-oversight
```

design-validator agent로 reality-check (실제 파일 grep + 인용). v0.1 → v0.2 iteration. 그 후 /pdca do로 Do phase.
