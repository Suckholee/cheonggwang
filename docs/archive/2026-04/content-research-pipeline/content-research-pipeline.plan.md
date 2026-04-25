# Plan: 콘텐츠 연구 파이프라인 (content-research-pipeline)

> 생성: 2026-04-19
> 방법론: bkit Plan Plus
> 상위 기능: [promo-page](./promo-page.plan.md)
> 역할: promo-page의 템플릿·트렌드 키워드 공급원
> 다음 단계: `/pdca design content-research-pipeline`

---

## 1. User Intent Discovery

### 1.1 배경 — promo-page 방향 전환 (2026-04-19)
홍보글 본문은 **업종 표준 마케팅 톤**이어야 한다. "청소했다"를 강조하는 톤은 고객(건물주/상가)의 마케팅 목적과 어긋난다. 청소업 특화 요소는 **신뢰 배지(🧹①)** 로만 유지되고, 콘텐츠 품질 경쟁력은 본 파이프라인에서 공급하는 **업종별 템플릿 + 트렌드 키워드**로 확보한다.

### 1.2 핵심 목적
네이버 블로그·티스토리·워드프레스 등 공개 플랫폼의 성공적 홍보 글을 **합법 범위에서 자동 수집**하여 패턴을 추출하고, promo-page의 LLM 생성 품질을 높이는 **템플릿 스키마 + 트렌드 키워드 풀**을 주기적으로 산출한다.

### 1.3 최종 산출물 (둘 다)
- **A. 템플릿 스키마 제안** — 업종별 "어떤 섹션을 어떤 순서로" 정의 → `templates/[category].ts`에 운영자 검수 후 반영
- **B. LLM 프롬프트 재료** — 업종별 트렌드 키워드 TOP30 → `trendKeywords/{category}` 자동 갱신

### 1.4 성공 기준
- 주 1회 자동 실행이 95% 이상 성공률로 동작
- 수집 → 산출물 반영까지 파이프라인이 사람 손 없이 완주 (템플릿 PR 머지 제외)
- promo-page 생성 품질(사용자 편집률) 개선 여부 측정 가능 (v2에서 수치화)

---

## 2. Alternatives Explored

| # | 접근 | 결과 |
|---|------|------|
| A | 수동 큐레이션 (운영자 100% 수집) | 기각 (확장성 없음) |
| B | **T1+T2 풀자동 (공식 API + RSS + robots.txt 허용 웹 크롤링)** | **채택** |
| C | T1+T2+T3 (무단 크롤링 포함) | 기각 (약관 위반·IP 차단·법적 분쟁 소지) |

**채택 근거**: 사용자 요청 "합법 범위 풀자동"을 그대로 실현. 한국 B2B 로컬 마케팅 패턴 80%+ 커버 가능.

### 법적 티어 원칙 (엄수)

| 티어 | 사용 | 비고 |
|------|------|------|
| T1 | 네이버 검색 API · 티스토리 RSS · 워드프레스 RSS | v1 채택 |
| T2 | robots.txt 허용 경로 공개 웹 (rate-limit, UA 명시) | v2에서 도입 |
| T3 | 네이버 블로그 본문 크롤링 · 인스타 개인 피드 · 당근마켓 | **금지** |

---

## 3. YAGNI Review

### 3.1 v1 MVP 포함
1. **수집 어댑터 3개**: NaverSearchAdapter · TistoryRssAdapter · WordPressRssAdapter
2. **정규화 레이어** — 공통 스키마 매핑, HTML 정제, urlHash(sha1) 중복 제거, 업종 분류(LLM 1-shot + 키워드 fallback)
3. **Firestore 원본 저장** — `researchSources/{category}/raw` (TTL 90일)
4. **Gemini 분석 4종** — 섹션 구조, 톤 프로파일, CTA 패턴, 키워드 TF-IDF
5. **자동 출력 A**: `trendKeywords/{category}` 주간 덮어쓰기
6. **검수 대기 출력 B**: `templates/{category}/proposals/{weekKey}` 저장 + 이메일 알림 → 운영자 검토 후 git 수동 반영
7. **Cloud Scheduler 주 1회 실행** — Firebase Cloud Functions (scheduled)
8. **이메일 알림** (Firebase Extension: Trigger Email or Resend)

### 3.2 Out of Scope → v2
- 인스타그램 Graph API 어댑터 (비즈니스 계정·앱 심사 필요)
- Google Places API 어댑터
- Google Custom Search 어댑터
- T2 공개 웹 크롤러 (robots.txt 파서 + rate-limit)
- 검수 대시보드 UI
- 성과 피드백 루프 (발행 페이지 방문 통계 선결 필요)
- 실시간/일간 수집 (주간으로 충분)
- 업종 5개 이상 확장 (v1은 3개)
- **카카오톡 알림톡** (비즈채널·템플릿 심사 2주 가량 소요)

---

## 4. Architecture

### 4.1 스택
- **실행 환경**: Firebase Cloud Functions (TypeScript, 2nd gen, scheduled)
- **스케줄러**: Cloud Scheduler (매주 월 09:00 KST)
- **LLM**: Gemini 1.5 Flash via Vertex AI SDK
- **Storage**: Firestore (TTL 정책 활성화)
- **알림**: Firebase Extension "Trigger Email" 또는 Resend API
- **비밀키**: GCP Secret Manager (네이버 API Client ID/Secret, Resend API Key)

### 4.2 6단계 레이어

```
① Scheduler        Cloud Scheduler (cron: 0 9 * * 1)
                         ↓ HTTPS trigger
② Source Adapters  NaverSearchAdapter | TistoryRssAdapter | WordPressRssAdapter
                         ↓
③ Normalizer       HTML 제거 · 공통 스키마 · urlHash 중복제거 · 업종 분류
                         ↓
④ Raw Store        researchSources/{category}/raw/{urlHash}  (TTL 90d)
                         ↓ 최신 200건 샘플링
⑤ Analyzer         Gemini × 4: 섹션 구조 · 톤 · CTA · 키워드
                         ↓
⑥ Writers
   ├─ trendKeywords/{category}                (자동)
   └─ templates/{category}/proposals/{weekKey} (검수 대기)
                         ↓
⑦ Email 알림 → 운영자 검수 → 수동 git PR → templates/[category].ts 업데이트
```

### 4.3 디렉토리 구조 (Firebase Functions 프로젝트 내)
```
functions/src/research/
├── index.ts                       # scheduled entry point
├── adapters/
│   ├── naver-search.ts
│   ├── tistory-rss.ts
│   └── wordpress-rss.ts
├── normalize/
│   ├── html-cleaner.ts
│   ├── schema-mapper.ts
│   └── category-classifier.ts    # Gemini 1-shot + 키워드 fallback
├── analyzer/
│   ├── section-structure.ts
│   ├── tone-profile.ts
│   ├── cta-patterns.ts
│   └── keyword-tfidf.ts
├── writers/
│   ├── trend-keywords-writer.ts
│   ├── template-proposal-writer.ts
│   └── email-notifier.ts
├── lib/
│   ├── gemini.ts
│   ├── firestore-admin.ts
│   ├── url-hash.ts
│   └── retry.ts
└── types/
    ├── source.ts
    ├── insight.ts
    └── proposal.ts
```

---

## 5. Data Model (Firestore)

```
researchJobs/{jobId}
  category, startedAt, finishedAt
  status: 'running'|'completed'|'failed'
  sourceCount, errors[]

researchSources/{category}/raw/{urlHash}
  sourceType: 'naver'|'tistory'|'wordpress'
  url, urlHash
  title, snippet, body?, tags[]
  author?, publishedAt
  collectedAt, ttlExpiresAt         # Firestore TTL 90일
  rawPayload                         # 원본 API 응답 스냅샷

researchInsights/{category}/weekly/{weekKey}   # weekKey = "2026-W17"
  sectionStructure: {
    commonOrder: string[]            # ['hero','intro','menu','review','info']
    lengthDistribution: map          # 섹션별 평균 글자 수
  }
  toneProfile: {
    politenessLevel: 'formal'|'casual'
    emojiDensity: number
    avgSentenceLength: number
  }
  ctaPatterns: [{ type, example, frequency }]
  topKeywords: [{ term, score }]     # TF-IDF 상위 50

trendKeywords/{category}
  keywords: string[30]               # 공개 읽기 (promo-page가 ISR 시 조회)
  updatedAt, sourceWeek

templates/{category}/proposals/{weekKey}
  proposedStructure: SectionDefinition[]
  diff: string                       # 기존 templates/[category].ts와의 diff
  status: 'pending'|'approved'|'rejected'
  createdAt, reviewedAt?, reviewerUid?
```

### 5.1 보안 규칙 요지
- `researchJobs/**`, `researchSources/**`, `researchInsights/**`, `**/proposals/**` → **Admin SDK만** (클라이언트 접근 금지)
- `trendKeywords/{category}` → **공개 읽기**, 쓰기는 Admin만

---

## 6. Key Flow (주간 실행)

```
[매주 월요일 09:00 KST]
 └─ Cloud Scheduler → Firebase Function runResearchPipeline
     │
     └─ for each category in ['restaurant','salon','cafe']  (병렬)
         ├─ researchJobs/{jobId} 생성 (running)
         ├─ 수집 (Promise.allSettled — 어댑터 개별 실패 격리)
         ├─ 정규화 + urlHash 중복제거
         ├─ researchSources/{category}/raw 배치 쓰기 (TTL 90d)
         ├─ 최신 200건 샘플링 → Gemini 분석 4종 (재시도 3회)
         ├─ researchInsights/{category}/weekly/{weekKey} 저장
         ├─ trendKeywords/{category} ← TOP30 자동 덮어쓰기
         ├─ templates/{category}/proposals/{weekKey} ← 구조 diff 저장
         ├─ 운영자에게 이메일 발송
         │   (본문: 수집 건수 · TOP5 키워드 · 템플릿 diff 요약 + 검수 링크)
         └─ researchJobs/{jobId} → completed
```

### 6.1 에러 처리·재실행
- 어댑터 단위 실패 → 해당 소스만 skip, 나머지 진행
- Gemini 실패 → exponential backoff × 3회
- 잡 단위 실패 → 화요일 09:00 자동 재시도 1회
- 수동 재실행: `POST /admin/research/rerun?category=X&week=Y` (Firebase Auth 관리자 토큰 필요)

### 6.2 promo-page와의 연결점
```
lib/llm/prompt-builder.ts
├── loadTrendKeywords(category)    → trendKeywords/{category}  (파이프라인이 자동 공급)
└── loadTemplate(category)          → templates/[category].ts   (운영자 검수 후 git 커밋)
```

---

## 7. 비용·성능

| 항목 | 추정 | 비고 |
|------|------|------|
| 네이버 검색 API | 주간 ~300 쿼리 | 일일 무료 25k 내 |
| Gemini 1.5 Flash | 주간 800 호출, ~1.6M 토큰 | **≈ $0.3/주** |
| Firebase Functions 2nd gen | 주간 실행 시간 15~20분 | 무료 할당 내 |
| Firestore R/W | 주간 수천 건 | 무료 티어 내 |
| Firebase Storage | 미사용 | — |
| **합계** | **~$1.5/월** (업종 3개) | 업종 N개 선형 증가 |

---

## 8. Risks & Open Questions

### 8.1 리스크

| 리스크 | 완화 |
|--------|------|
| 네이버 검색 API 쿼리 품질 편차 (업종별 블로그 Top 10이 광고·체험단 위주) | 쿼리 튜닝 + LLM 분류기가 광고성 글 필터 |
| Gemini 분석 결과의 업종 편향 | weekKey별 insights 보관 → 시계열 비교로 드리프트 감지 |
| TF-IDF 계산이 한국어 형태소 분석 필요 | kiwi-nlp 또는 mecab-ko 경량 라이브러리, 실패 시 Gemini 정제만으로 대체 |
| 템플릿 구조 제안이 기존 UI와 충돌 (새 섹션 타입 제안 등) | 제안 스키마는 고정된 SectionType enum 내로 제약 |
| Cloud Functions timeout (9분 1st gen) | 2nd gen으로 60분 제한 확보 |
| 이메일 스팸 필터링 | Resend API 사용 시 SPF/DKIM 자동, 도메인 인증 필요 |
| 개인정보 포함된 소스 (연락처·주소) | Normalizer에서 PII 정규식 기반 마스킹 |

### 8.2 Open Questions → `/pdca design`에서 해소
- 네이버 검색 API 쿼리 세트 (업종별 5~10개 쿼리 설계)
- 큐레이션된 티스토리/워드프레스 피드 목록 (운영자가 수기로 20개씩 선정)
- Gemini 분석 프롬프트 4종의 초안 + few-shot 예시
- SectionType enum 확정 (promo-page 컴포넌트와 싱크)
- 이메일 템플릿 디자인

---

## 9. Brainstorming Log

| 단계 | 결정 | 근거 |
|------|------|------|
| Q1 산출물 | 구조 + 패턴 둘 다 | 사용자 답변 |
| Phase 2 법적 티어 | T1+T2 풀자동 (T3 제외) | 사용자 "윤리 원칙 안에서 풀자동" 요청에 대해 TOS·저작권 명확화 후 티어 분리 |
| Phase 3 YAGNI | 인스타/Places/Custom Search·크롤러·대시보드는 v2 | 초기 3 어댑터만으로 80%+ 커버 |
| Phase 4-1 스케줄러 | Firebase Functions + Cloud Scheduler | Firestore 권한·장시간 실행에 유리, Vercel Cron과 비교 설명 후 선택 |
| Phase 4-3 알림 | v1 이메일 + v2 카카오톡 | 카카오 알림톡 심사 부담 |

---

## 10. Next Steps

- [ ] `/pdca design content-research-pipeline` — 상세 설계
  - 어댑터별 쿼리 세트 · RSS 큐레이션 목록
  - Gemini 분석 프롬프트 4종 초안 + few-shot
  - SectionType enum · 이메일 템플릿
  - Firestore 보안 규칙 전체 작성
- [ ] `/pdca do content-research-pipeline` — Firebase Functions 프로젝트 구축 + 어댑터 구현
- [ ] promo-page의 `lib/llm/prompt-builder.ts`가 본 파이프라인의 `trendKeywords/{category}`를 소비하도록 연동
- [ ] `/pdca analyze content-research-pipeline` — 주간 실행 결과 Gap analysis
- [ ] `/pdca report content-research-pipeline`
