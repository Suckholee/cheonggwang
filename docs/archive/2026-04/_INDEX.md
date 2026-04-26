# Archive Index — 2026-04

## Features

### partner-rag-system — 매장 RAG 자료 + admin 컨텐츠 템플릿 (Marketplace v1.11 · #24 · 🎯 97% single-pass · 역대 최대)

- **완료일**: 2026-04-26
- **Match Rate**: **97%** (Critical 0 · High 0 · Medium 1 · Low 1)
- **PDCA 사이클**: #24 (Plan Plus → Design v0.2 post-validator 25/25 → Do S1–S8 → Check 97% → Report → Archive)
- **레벨**: Dynamic (Next.js 16 · Firebase Admin SDK · Gemini Vision 캐시 · 3-tier RAG context)
- **방향**: cycle #19 partner-promo의 RAG가 "다른 글 anti-drift"만 사용하던 한계 → 매장 자체 정보(profile) + admin curated 컨텐츠 템플릿(industry별 블로그·카드뉴스) 통합. 사장님이 한 번 등록하면 후속 글마다 매장 톤·일관성 자동 반영. admin은 검토 큐·강제 토글·라이브러리 운영으로 거버넌스.
- **경로**: [partner-rag-system/](./partner-rag-system/)

**문서**
- [Plan](./partner-rag-system/partner-rag-system.plan.md) (Plan Plus 4 phase · YAGNI 21 in-scope · admin 템플릿 사용자 추가 요구)
- [Design](./partner-rag-system/partner-rag-system.design.md) (v0.2 · validator 5 Critical + 8 High + 7 Medium + 5 Low 결의 · score 76→95+)
- [Analysis](./partner-rag-system/partner-rag-system.analysis.md) (97% · Medium 1 G2 / Low 1 G1 모두 documentation·operations)
- [Report](./partner-rag-system/partner-rag-system.report.md)

**핵심 결정**
- **R1 cycle #19 진입점 변경 0건** — `composeDraft` 시그니처 그대로 (`ragContextSection?: string` 옵셔널만 추가). `generatePartnerPromoDraft` export 변경 0. dynamic import로 circular dependency 회피. 기존 호출자(`/api/partner/posts/route.ts`) 변경 0줄
- **getRagContext 단일 entry (R2)** — partner profile + admin templates(industry/type 매칭) + cycle #19 anti-drift 3단을 단일 함수에 통합. cycle #19 자산(`retrievePartnerStyleReferences`, `describePhoto`, `hygieneGuard`) 100% 재사용
- **profile.suspended 가드 (R3·R4)** — `partner-rag-context.ts:57-61` `status in ['auto-approved','approved'] AND !suspended` 정확. cycle #19 fallback compose 흐름 보존
- **photoAnalysisSummary 캐시 (H2·H3)** — Vision API 비용 폭주 회피의 핵심 결정. profile photoUrls 변경 detect 시만 1회 분석 후 텍스트 1500자 요약 캐시. 글 발행마다는 텍스트만 prompt에 inject. 글당 Vision call은 cycle #19의 글 단건 사진(1~5장)만
- **firestore.rules 더 엄격한 deviation (G1)** — design v0.2의 partial allowlist(`onlyProfileEditableFieldsChanged`) 대신 `partners write: if false` (Admin SDK only). 사장님이 status·suspended·hygieneScore·version 자가 수정 차단. R3·R6 보호 강화
- **ragHistory append-only (R6)** — `firestore.rules` `allow create, update, delete: if false`. server action(Admin SDK)만 진입 가능. audit trail 무결성
- **contentTemplates Admin SDK only write (R7)** — `allow read: if true; allow write: if false`. partner-promo generator는 read 가능, 사장님 직접 수정 불가
- **photoUrls path validation (R8·H1)** — `decodeURIComponent` 후 regex 매칭으로 URL-encoded(`%2F`) 형식과 raw path 둘 다 처리. fake URL 차단
- **AdminBottomBar 6탭 (H6)** — 5탭 → 6탭. font 9px / icon 16px / 한글 2-3자 라벨로 480px 모바일 폭 / 6 = 80px/tab 표시
- **reporter anonymize (M4)** — ragHistory.actorUid는 SHA-256 hash, 원본 reporterUid는 admin-only `reports/{reportId}` collection. 사장님 view 가능성 대비 신원 보호
- **24h rate-limit on report (H8)** — 동일 reporter가 동일 partner에 대해 24h 1회 cap. cycle #20 `checkAndIncrement` helper 재사용

**구조 (역대 최대)**
- **21 신규** — types(2) + domain(3) + repository(2) + LLM(1) + server-actions(2) + 사장님 UI(3) + admin UI(7) + helper(1: hash) + seed(1)
- **8 수정** — types/partner.ts(profile field), llm/partner-promo-generator.ts(R1 진입점 보존), admin/layout.tsx, admin/partners/[id]/page.tsx, admin/AdminBottomBar.tsx(6탭), admin/AdminNav.tsx, admin/StatsWidgets.tsx(8카드), lib/admin/stats.ts
- **인프라** — firestore.rules(ragHistory + contentTemplates + reports), firestore.indexes.json(contentTemplates composite), storage.rules(기존 wildcard로 profile 자동 매칭)
- **시드** — scripts/seed-content-templates.mjs 12건 (cafe·restaurant·hair-salon·academy·office·pet-clinic·optical·bakery·other × blog/card-news 조합) — production firestore에 시드 완료
- **신규 라우트** — `/partner/profile`, `/admin/rag-review`, `/admin/content-templates`
- **LOC** — 4,469 insertions

**Gap 결의 흐름**
- v0.1 → v0.2: design-validator 25건 결의 (5 Critical + 8 High + 7 Medium + 5 Low). C1~C5 핵심 보안 invariant 모두 반영. H2·H3 photoAnalysisSummary 캐시 도입으로 Vision 비용 폭주 회피
- v0.2 → final: G1 (firestore.rules) intentional deviation — design partial allowlist 대신 `if false`로 더 엄격한 보호. 단일 패스 97%

**Learnings**
- **R1 invariant의 누적 효과** — cycle #19 자산을 4 cycle 동안 진입점 변경 0건으로 재사용. dynamic import로 circular dependency 회피하면서 cycle #24의 RAG 통합을 cycle #19 호출자에게 투명하게 (호출자는 변경 없음). 회귀 위험 누적 차단
- **photoAnalysisSummary 캐시 패턴** — "변경 detect 시만 비용 호출" 패턴이 generative AI 비용 통제에 효과적. JSON.stringify 비교로 photoUrls 배열 변경만 감지 → 단순 + 정확
- **Plan Plus + design-validator 4 cycle 누적 일관성** — #19 96→100% / #21 99% / #22 97% / #24 97%. cycle 크기와 무관하게 90%대 후반 달성 (#24는 4,469 insertions로 역대 최대). 결의 항목 25건이 첫 분석에 100% 반영
- **firestore.rules safer deviation 패턴** — design intent보다 더 엄격한 구현 채택은 acceptable deviation으로 archive에 명시. 향후 v2에 "partial allowlist 다시 도입"이 필요해질 시 명확한 트레이드오프 비교 가능
- **getRagContext 단일 entry의 확장성** — 3단 RAG context를 한 함수에 통합. 향후 score-based ranking(O4) 도입 시 단일 변경점. retrievePartnerStyleReferences·describePhoto·hygieneGuard 모두 cycle #19 자산 그대로 재사용
- **시드 스크립트 lower-bound 전략 (G2)** — 9업종 × 평균 1.3건 = 12건 lower-bound 충족 + admin이 `/admin/content-templates`에서 직접 등록. v2에 batch 시드 36건 풀 라이브러리 확장 또는 admin 운영 누적
- **Followup**: G2 시드 36건 확장 / OQ8 React `cache(getRagContext)` / OQ10 신고 Slack 알림 / O1 PDF·MD 첨부 / O4 score-based RAG ranking / O6 다국어

---

### partner-issue-from-users — admin 회원 명단 클릭 발급 콘솔 (Marketplace v1.10 · #22 · 🎯 97% single-pass)

- **완료일**: 2026-04-26
- **Match Rate**: **97%** (Critical 0 · High 0 · Medium 0 · Low 3)
- **PDCA 사이클**: #22 (Plan Plus → Design v0.2 post-validator → Do S1–S5 → Check 97% → Report → Archive)
- **레벨**: Dynamic (Next.js 16 · Firebase Admin SDK · server actions · Firestore composite indexes)
- **방향**: cycle #20 admin-console에서 만든 `/admin/partners/new`의 단일 이메일 검색 폼을 **3-탭 콘솔**로 전면 개편. 운영자가 회원 명단·신청자 명단을 보면서 카드 클릭으로 즉시 발급. cycle #20·#21 발급 API 변경 0건으로 회귀 위험 제거.
- **경로**: [partner-issue-from-users/](./partner-issue-from-users/)

**문서**
- [Plan](./partner-issue-from-users/partner-issue-from-users.plan.md) (Plan Plus · YAGNI 7개 in-scope · Approach A 단일 페이지+모달)
- [Design](./partner-issue-from-users/partner-issue-from-users.design.md) (v0.2 · validator 5 Critical + 8 High + 7 Medium + 5 Low 결의)
- [Analysis](./partner-issue-from-users/partner-issue-from-users.analysis.md) (97% · Low 3건 documentation/UX deferral)
- [Report](./partner-issue-from-users/partner-issue-from-users.report.md)

**핵심 결정**
- **API 변경 0건 (R1)** — cycle #20 `POST /api/admin/partners` + cycle #21 approve route 그대로 재활용. UI 레이어만 추가 → 회귀 위험 제거. PartnerIssueForm은 "이메일 검색" 폴백 탭에 그대로 wrap (외부 wrapper만 추가, 코드 변경 없음)
- **3-탭 콘솔** — `[전체 명단] [신청자 명단] [이메일 검색]` 토글. role=tablist + aria-selected. 두 발급 경로(자율 가입 검토 vs admin-driven)를 한 화면에서 선택
- **신청자 모달 read-only (R2)** — cycle #21 approve route는 신청서 그대로 변환이므로 admin 수정 입력 OOS. dl/dt preview + [승인하고 발급] 버튼만. 정보 수정 필요 시 cycle #21 `/admin/partners/applicants/[id]`에서 거절 후 재신청 안내
- **server action 1회 = partners·applicants 각 1회 fetch (R3)** — `Promise.all([listAll(200), listPending(100)])` in-memory join. request-scope cache 명시적 OFF (v1 회원 수 ≤ 수백 가정). v2 React `cache()` 도입 검토
- **Cursor encoding (R4)** — base64(`${primary}:${uid}`). sort='latest'은 createdAtMs, sort='name'은 displayName. lastIndexOf(":")로 split, displayName 빈 문자열일 때도 `idx === 0` valid (`if (idx < 0)`). uid는 Firebase Auth UID(alphanumeric)라 콜론 없음 보장
- **dateRange + sort (R5)** — Firestore inequality + orderBy 호환성 회피 위해 dateRange 활성 시 sort='latest' 강제. zod superRefine + UI sort dropdown disabled로 이중 차단
- **router.refresh + setReloadTick (R6)** — 발급 직후 둘 다 호출. server data와 client useEffect cache 양쪽 갱신. Plan에서는 router.refresh()만이었으나 design-validator H2 결의로 보강
- **Firestore composite indexes 2건 사전 명시** — `users (roles array-contains + createdAt desc + __name__ desc)`, `users (roles array-contains + displayName asc + __name__ asc)`. firestore.indexes.json에 사전 추가 + `firebase deploy` 완료
- **disabled 카드 키보드 접근성 (M3)** — `<button disabled>` + `tabIndex={-1}` + `aria-disabled="true"`. focus 안 잡힘
- **dateRange UI client-side guard (M4)** — from > to 입력 시 [적용] disabled + 인라인 에러 텍스트. 서버 zod refine과 이중 검증

**구조**
- **6 신규** — types(1) · server actions(1) · components(4: IssuanceConsole·ClientUsersPanel·PendingApplicantsPanel·IssueModal)
- **3 수정** — `user-repository.ts`(listClientsPage 메서드), `app/admin/partners/new/page.tsx`(IssuanceConsole 호스팅), `firestore.indexes.json`(composite 2건)
- **재활용 (변경 없음)** — `partnerRepository.listAll`, `partnerApplicantRepository.listPending`, `POST /api/admin/partners`(cycle #20), `POST /api/admin/partners/applicants/[id]/approve`(cycle #21), `PartnerIssueForm.tsx`(cycle #20)

**Gap 결의 흐름**
- v0.1 → v0.2: design-validator 25건 (Critical 5 + High 8 + Medium 7 + Low 5) 모두 결의 후 Do 진입
- Single-pass 97% — Iterate 페이즈 미실행 (Critical/High/Medium 0건, Low 3건은 모두 documentation 또는 v1.1 deferral)

**Learnings**
- **API 변경 0건의 가치** — UI 레이어 추가만으로 새 발급 흐름 구축. cycle #20·#21에서 검증된 TX·zod·error handling이 100% 그대로 보존됨. PR diff가 깔끔해서 코드 리뷰 부담 최소화
- **Plan Plus + design-validator 2단계 일관성** — cycle #19 96% → cycle #21 99% → cycle #22 97%. 사이클이 누적될수록 첫 분석에서 결의 항목이 더 많아지지만(11→17→25) 결과 품질은 90%대 후반 유지
- **request-scope cache 명시적 OFF의 정당성** — design 단계에서 "v1 회원 수 가정상 비용 미미"로 명시한 결정이 PR 리뷰에서 자체 검증 가능. v2 React `cache()` 도입 시 동일 결정 트레이드오프를 다시 평가 가능
- **Cursor edge case 사전 발견** — design-validator가 displayName 빈 문자열 케이스(`if (idx < 0)`)를 design 단계에서 잡아냄. Do에서 발견했다면 데이터 마이그레이션 필요했을 것
- **3-tab UX 효과** — cycle #21 "대기 신청" 섹션을 명시적 탭으로 노출 + 전체 명단 추가 + 폴백 탭 escape hatch. 운영자가 두 발급 경로를 시각적으로 구분 가능
- **Followup**: G1 totalApprox 타입 필드 / G2 401 자동 redirect (v1.1) / G3 toast 라이브러리 / OQ1 substring 검색 (회원 1000+ 시) / OQ8 listPending 페이지네이션 / OQ9 displayName 빈 문자열 default fallback

---

### partner-application — 의뢰업체 공개 가입/심사 채널 (Marketplace v1.9 · #21 · 🎯 99% single-pass)

- **완료일**: 2026-04-26
- **Match Rate**: **99%** (Critical 0 · High 0 · Medium 0 · Low 1)
- **PDCA 사이클**: #21 (Plan Plus → Design v0.2 post-validator → Do S1–S8 → Check 99% → Report → Archive)
- **레벨**: Dynamic (Next.js 16 · Firebase Auth · Firestore Admin SDK TX · onSnapshot 실시간 알림)
- **방향**: 운영자가 CLI로 직접 발급하던 partners를 **공개 가입 채널**로 전환. `/admin/partners/new`가 admin이 본 화면으로 보였던 cycle #20 직후의 자연스러운 후속 — 의뢰업체 사장님이 직접 가입 → 운영자 검토(승인/거절) → 승인 시 partners doc 자동 생성 흐름.
- **경로**: [partner-application/](./partner-application/)

**문서**
- [Plan](./partner-application/partner-application.plan.md) (Plan Plus · 11 YAGNI 통과 · Approach A signup=가입 · 메일→onSnapshot 대체)
- [Design](./partner-application/partner-application.design.md) (v0.2 · validator 3 Critical + 8 High + 4 Medium + 2 Low 결의)
- [Analysis](./partner-application/partner-application.analysis.md) (99% · Low 1건 G1)
- [Report](./partner-application/partner-application.report.md)

**핵심 결정**
- **외부 의존성 0** — 메일/SMS 알림 대신 onSnapshot 기반 in-app 실시간 알림. Resend·Sendgrid 등 인프라 의존성 회피, 외부 sender domain·SPF/DKIM·rate plan 모두 OOS
- **client-first auth pattern (R1)** — `createUserWithEmailAndPassword` (client) + `getIdToken` → server action `submitPartnerApplication` (verifyIdToken + TX) → `createSessionCookie` 즉시 발급. cycle #18 provider-signup 검증 흐름 그대로 재사용
- **synthetic email 차단 (R2/C2)** — `@cheonggwang.auth` 도메인은 admin/test 전용이라 가입 시 INVALID_INPUT
- **TX 강화** — approve(`partners.create + applicants.update` 단일 TX) + reject(`status==='pending'` 검증 + update 단일 TX, C3 fix) 모두 race-safe single-transaction. `tx.get(query)` 패턴 활용
- **rejected reopen (R14)** — 동일 ownerUid의 기존 doc을 `status·rejectReason·reviewedAt·reviewedBy·partnerId` reset + `appliedAt` 갱신. 신규 doc 생성 회피 → doc proliferation 방지
- **rate-limit email key 단일 (R8/H8)** — `signup-partner:e:${email}` 3건/h. server action에서 IP 추출 어려워 v2로 분리 deferred (OQ-1)
- **applicant 가드 분기 (R3)** — `requirePartnerPage`에 `applicant-pending`·`applicant-rejected` reason 추가, submitted 페이지로 redirect

**구조**
- **15 신규** — types(1) · domain schema(1) · repository(1) · server action(1) · auth pages(2) · auth components(2) · admin pages(1) · admin API routes(2) · admin components(2) · landing component(1) · home edit
- **5 수정** — `app/page.tsx`(A3 CTA), `app/admin/partners/page.tsx`(B1 대기 신청), `lib/auth/require-partner.ts`(A4 redirect), `lib/admin/stats.ts`(H6 pendingCount), `components/admin/StatsWidgets.tsx`(7번째 카드)
- **인프라 변경** — `firestore.rules` partnerApplicants 컬렉션(owner+admin read · write false), `firestore.indexes.json` 2건 (`(status,appliedAt)` admin, `(ownerUid,appliedAt)` client onSnapshot)
- **신규 라우트** — `/signup-partner`, `/signup-partner/submitted`, `/admin/partners/applicants/[applicantId]`, `/api/admin/partners/applicants/[applicantId]/{approve,reject}`

**Gap 결의 흐름**
- v0.1 → v0.2: design-validator 3 Critical (C1 `clientDb` import / C2 synthetic 도메인 정정 / C3 reject TX wrap) + 8 High (H1 admin 파일 카운트 / H2 userSnap.exists / H3 tx.get(query) / H4 helper bypass + serverTimestamp / H5 partnerId back-link 필드 / H6 AdminStats 확장 / H7 7-card grid / H8 email-only rate-limit) + 4 Medium (M1 empty submitted state / M2 users.roles arrayUnion / M3 orphan Auth user 자동 복구 / M4 appendEvent best-effort) + 2 Low (L1 robots noindex / L3 event from:'invited')
- single-pass 99% — Iterate 페이즈 미실행

**Learnings**
- **Plan Plus + Design Validator 결합 효과** — 첫 분석 99% (#19 96% → #21 99%, +3%p). Plan Plus의 YAGNI multiSelect로 11 항목으로 압축 → design-validator가 17건 결의로 사전 보강 → Do 단계에서 추가 발견 거의 없음
- **외부 의존성 회피의 가치** — "메일 알림 = 사용자 편의" 1차 가정을 버리고 "onSnapshot 기반 in-app" 채택 → Resend SDK·도메인·SPF·rate plan·테스트 모두 회피 + 사용자 경험은 더 즉각적 (5초 자동 redirect는 오히려 메일보다 빠름)
- **TX 패턴 강화** — cycle #20 admin-console에서는 reject가 단순 update였으나 cycle #21에서 design-validator C3 지적으로 reject도 TX wrap. "두 admin 동시 액션 race"가 실제로 일어날 수 있음을 사전 catch
- **rejected reopen 패턴 (R14)** — 신규 doc 생성하지 않고 기존 doc reset. doc proliferation 방지 + reapplyCount 추적(v2)에 자연스러운 위치
- **provider-signup 패턴 exact reuse** — `createUser → getIdToken → server action → sessionCookie` 흐름이 #18에서 검증된 그대로 #21에 적용. cycle 간 패턴 누적 효과 확인
- **Followup**: G1 `setStatus` 헬퍼 v2 활용 명시 / OQ-1 IP rate-limit (v2 API 분리) / OQ-5 reapplyCount 추적 / L3 PartnerEvent type `'created-from-applicant'` 추가 (v2)

---

### partner-promo — 의뢰업체(B2B 파트너) AI 보조 홍보글 게시 + 자동발행 윈도우 (Marketplace v1.7 · #19 · 🏁 100%)

- **완료일**: 2026-04-25
- **Match Rate**: **100% (39/39)** (P1–P7 추가형 → 92.3% → preview gating 보강 94.9% → P8/P9 → rules `if` 보강 → 100%)
- **PDCA 사이클**: #19 (Plan Plus → Design v0.2 post-validator → Do P1–P7 → Check 94.9% → Act P8/P9 → Re-Check 100% → Report)
- **레벨**: Dynamic (Next.js 16 · cacheComponents · Firebase Admin SDK TX · Gemini Vision + Pro · KST autoPublish window)
- **방향**: customer-story 패널 폐기 → B2B 파트너 셀프 작성 흐름 도입. 운영진이 인증한 파트너만 사진+키워드 → AI 초고 → 본인 편집 → 발행. 옵션으로 요일·시간 윈도우에서 hygiene 통과 시 즉시 자동발행
- **경로**: [partner-promo/](./partner-promo/)

**문서**
- [Plan](./partner-promo/partner-promo.plan.md) (Plan Plus · 13 YAGNI · Approach A · F5 autoPublish 추가)
- [Design](./partner-promo/partner-promo.design.md) (v0.2 · validator 4 Critical + 7 High 결의 · OQ-3·OQ-4 결정)
- [Analysis](./partner-promo/partner-promo.analysis.md) (v0.1 92.3% → 보강 94.9% / v0.2 post-P8/P9 100%)
- [Report](./partner-promo/partner-promo.report.md) (P8/P9 addendum 포함)

**핵심 결정**
- **customer-story 완전 대체** — `PostType` union 3-way (`tip | provider | partner-promo`), `/community/stories` 308 → `/community/partners`, story-* 파일 삭제 + cron 비활성화 (storyScrapbook은 M16 v2 deferral)
- **저장 책임 분리** — `partner-promo-generator.ts`는 draft 객체만 반환, autoPublish 분기·저장은 Route Handler 책임 (story-generator 패턴과 차별)
- **autoPublish 윈도우** — 파트너별 `{enabled, weekdays, startMinute, endMinute, timezone:'Asia/Seoul'}`, hygiene ≥0.7 필수, 자정 넘김 v1 미지원, 17/17 단위 테스트
- **트랜잭션 read-then-CAS** — `setPublishStatus`가 `runTransaction` 내 `isAllowedTransition` 검증 (`draft→withdrawn` 차단 등)
- **publishedAt 정책 (H1)** — `draft→published` & `withdrawn→published` 모두 재발급 (RSS pubDate 신선도), `published→withdrawn`는 보존
- **H2 cleanup race** — `POST /api/partner/posts`에서 업로드 후 모든 실패 경로에 `cleanupPartnerPostPhotos` 보장
- **H3 RAG anti-drift** — partner-promo + provider 두 개 평행 쿼리 (IN-query 회피), provider 가중치 +0.1, 본인 글 제외
- **H6 DELETE 순서** — Firestore 우선, Storage best-effort
- **R10 autoPublish defaults** — CLI 발급 시 `DEFAULT_AUTO_PUBLISH` 강제 (입력 무시)
- **Next 16 cacheComponents 제약** — 보호 영역은 Suspense + 자식 async + `connection()` 패턴 (`force-dynamic` 사용 불가)
- **Firebase 검증 통합** — `firebase deploy --only firestore:rules,firestore:indexes,storage --dry-run`으로 deploy 전 syntax 검증 (`tsc`/`lint`로는 `.rules` 못 잡음)

**구조**
- **23 신규** — types(2) · repositories(1) · auth guard(1) · LLM(2) · API routes(4) · partner UI(5) · components(4) · community/partners(2) · CLI(1) · test(1)
- **수정** — post/types/repository, panel-config, hygiene-guard, article-jsonld, sitemap, robots, errors, /community/p/[slug] (preview gating)
- **삭제** — story-generator/rag, /api/cron/generate-stories, vercel.json cron 스케줄
- **Redirect 보존** — /community/stories(page+rss) 308 → /community/partners
- **P9 deploy 아티팩트** — firestore.rules(publishStatus + partners + events), firestore.indexes.json(4 신규), storage.rules(/partners/{uid}/{postId}/)

**Gap 결의 흐름**
- v0.1 → v0.2: design-validator 4 Critical(C1–C4 모두 mechanical) + 7 High(H1–H7) + OQ-3·OQ-4 결정
- v0.1 → v0.2 (post-Do): preview gating 누락 즉시 보강
- v0.2 → final: gap-detector v0.2가 `firestore.rules`의 `if` 키워드 누락 발견 → 즉시 수정 → `firebase deploy --dry-run` ✓

**Learnings**
- **Plan Plus의 진가** — 단순 `/pdca plan`에서는 못 잡았을 "customer-story 대체 vs 공존" 결정이 사용자 1회 답변으로 명확화 → cycle 후반 destructive migration까지 일관 진행
- **Validator 응답이 구현으로 직결** — H1·H2·H4·H6·H7 등 hard-decided behaviors가 1:1로 코드에 정확히 도착 (트랜잭션 CAS·cleanup·DELETE 순서 등 패턴 자동 매칭)
- **Static analysis(tsc/lint)의 사각지대** — `.rules` syntax는 `firebase deploy --dry-run`만 검증 가능. 향후 cycle은 P9 종료 직전에 dry-run 필수
- **추가형(P1–P7) → destructive(P8) 분리 전략** — 빌드 깨짐 없이 점진 진행, OQ 점검(DB 5건) 후에만 destructive 단계 진입
- **Next 16 cacheComponents 패턴 정착** — `connection()` 단독으로는 부족 → Suspense + 자식 async가 표준
- **Followup**: H-1 STATUS_BY_CODE 4 라우트 dedup · L4 URL parse 기반 cover validation · CI에 단위 테스트 추가 · M16 storyScrapbook v2 정리 · OQ-7 rebrand cascade

---

### provider-promo-content — AI 홍보 콘텐츠 생성 + 커뮤니티 피드 게시 (Marketplace v1.4 #1 · 🎯 7연속 99%+)

- **완료일**: 2026-04-21
- **Match Rate**: **99%** (Design 99% / Architecture 100% / Convention 100%)
- **PDCA 사이클**: #16 (single-pass · Plan Plus → Design v0.2 post-validator → Do 12-step → 99%)
- **레벨**: Dynamic (Next.js 16 · Firebase · Gemini 2.5 Flash · marked + sanitize-html)
- **방향**: 청광의 첫 **AI 콘텐츠 자동화** · 고객 진입 경로 확대 (🅒 커뮤니티 1차 + 🅐 프로필 2차) · 공급자가 tone/slogan 세팅 후 버튼 클릭 → Gemini 블로그 생성 → `/community` 피드 + `/providers/{id}` NewsSection 게시
- **경로**: [provider-promo-content/](./provider-promo-content/)

**문서**
- [Plan](./provider-promo-content/provider-promo-content.plan.md) (Plan Plus · 22 MVP · 배치 전략 🅒+🅐)
- [Design](./provider-promo-content/provider-promo-content.design.md) (v0.2 · validator 97%+)
- [Analysis](./provider-promo-content/provider-promo-content.analysis.md) (99% · Medium 1건 G1)
- [Report](./provider-promo-content/provider-promo-content.report.md)

**핵심 결정**
- **🅒+🅐 배치 전략** — 커뮤니티 피드 공개(고객 유입 허브) + 프로필 NewsSection(전환 가속)
- **7일 쿨다운 · Gemini 실패 시 쿨다운 미소모** — `providers.lastPromoPostAt` · try/catch로 `LLM_FAILURE` throw before TX
- **TX reads-before-writes** — provider/workCases/reviews fetch는 TX 밖 · `runTransaction`은 `posts.create + providers.update` 쓰기만
- **Denormalization snapshot at creation** — `companyName · categories · regionLabel · brandTone · providerOwnerUid` 고정 (공급자 프로필 변경 무관 피드 일관성)
- **Markdown sanitization** — marked + sanitize-html whitelist (h2/h3/p/ul/ol/li/strong/em/a/br) + `https` only + `rel="noopener noreferrer"` + `target="_blank"` transform
- **시스템 프롬프트 3중 방어** — 보험책임 격리 · 비방금지 · 기술집중 (archived promo-page 패턴 재사용)
- **Zod 이중 검증** — 입력 `updatePromoSettingsInputSchema` + `createPromoPostInputSchema` · Gemini 출력 `geminiPostOutputSchema.parse`
- **Firestore rules 2중 방어** — posts `read=true` (공개) · `write=false` (Admin SDK only)
- **Firestore 복합 인덱스** — `providerId + createdAt DESC` (단일 `createdAt DESC`는 자동 인덱스 사용)
- **React `cache()` request-scope dedup** — `postRepository.get`에 적용 (/community/[postId] 메타데이터 + 본문 중복 호출 방지)
- **DTO 경계** — `PostFeedCardDTO.createdAtMs: number` · Timestamp 누출 없음
- **seed 3건** — 입주청소 가이드 · 에어컨 청소 · 단골 후기 모음 (10/20/30일전 createdAt)

**구조**
- **17 신규** — types/post · promo-schemas · promo-prompt · lib(gemini · slug · markdown) · post-repository · promo-actions · /community/[postId] · community/* (6) · NewsSection · PromoTab/* (4)
- **6 수정** — types/provider · provider-repository (toProvider 3 필드) · /community (shell) · /providers/[id] (NewsSection) · ProfileEditorTabs (EditorTabKey 확장) · /provider/profile (VALID_TABS "promo" 추가)
- **12 컴포넌트** — Server 7 / Client 5
- **2 Server Actions** — `updatePromoSettings` · `createPromoPost`
- **3 deps** — marked@18 · sanitize-html@2.17 · @types/sanitize-html@2.16

**Gap (1건 · 기능 정상)**
- G1 (Medium) · 단일 필드 `createdAt DESC` 인덱스 선언 누락 (Firestore 자동 생성) → Design §3.3 문구만 수정 권장

**Learnings**
- **Plan Plus + design-validator + gap-detector 조합** 정착 → 7연속 99%+ 달성 (#10-#16)
- **재사용 자산 전략** — content-research-pipeline (Gemini 호출 패턴) · archived promo-page (3중 방어 격리) · archived promo-feed (Netflix 레이아웃)
- **AI 콘텐츠 첫 고객 노출** — 홍보글이 단순 공급자 마케팅이 아닌 **커뮤니티 콘텐츠**로 작동 (v1.5 검색/추천 확장 여지)
- **Follow-up**: quoteTrendKeywords v1.5a · Rich text · Image generation · Feed filters · SNS 공유 (총 14건)

---

### booking — 일정 확정 + 작업 관리 (Marketplace v1.3 #1 · 🏆 마켓 루프 종결)

- **완료일**: 2026-04-21
- **Match Rate**: **99%** 🏆 (15 cycles 연속 99%+ · #12-#14 연속 100% 후 2 intentional minor)
- **PDCA 사이클**: #15 (single-pass · Plan Plus → Design v0.2 post-validator → Do → 99%)
- **레벨**: Dynamic (Next.js 16 · Firebase Admin SDK TX · chat onSnapshot 자동 반영 · KST-aware day bucket)
- **방향**: chat-centric 1-step 일정 확정 · `bookings/{id}` 컬렉션 신규 · MessageType `"text"|"system"` 확장 · `/provider/works` placeholder 교체 · `/received/{requestId}` 배지 추가 · **마켓 루프 "제출→응답→비교→수락→협의→일정확정" end-to-end 종결**
- **경로**: [booking/](./booking/)

**문서**
- [Plan](./booking/booking.plan.md) (Plan Plus · 20 MVP · 10 out-of-scope · Approach A chat-centric)
- [Design](./booking/booking.design.md) (v0.2 · validator 96%→ 10건 fix)
- [Analysis](./booking/booking.analysis.md) (99% · Positive Divergences 7건)
- [Report](./booking/booking.report.md)

**핵심 결정**
- **chat-centric 1-step** · 청명 "📅 일정 확정" → Modal → Server Action `confirmBooking` → TX 3R/5W → 양쪽 onSnapshot 실시간 반영
- **Status 단일 `confirmed`** · v1.3b에서 `in_progress/completed/cancelled` 전이 분리
- **TX 3R/5W idempotent**:
  - reads = thread · quote · request
  - writes = booking.create · quote.update(status='booked' · acceptedAt fallback) · request.update(status='booked') · message.create(type='system') · thread.update(lastMessage* · unreadByClient++)
  - 재확정 차단: quote.status='booked' → INVALID_STATE
  - 취소 견적 거부: quote.status ∉ ['sent','accepted'] → INVALID_STATE
- **MessageType `"text"|"system"` 확장** · 기존 chat 메시지 완전 호환 · MessageBubble 중앙 gray + icon prefix 분기
- **KST-aware 5-bucket grouping** (today/tomorrow/thisWeek/later/past) · 빈 섹션 자동 숨김
- **Zod loose datetime** + client `toISOString()` serialize (datetime-local 호환)
- **Denormalization**: companyName · clientDisplayName · category · regionLabel · totalAmount snapshot at creation · TX 내부 fail-fast (누락 시 INTERNAL_ERROR)
- **Firestore rules 2중 방어**: bookings 참가자 only read · Admin SDK only write
- **Firestore index**: `providerId + scheduledAt DESC` 1개
- **revalidatePath**: `/provider/works` + `/received/{requestId}` 정적 view · chat은 onSnapshot 자동

**Validator fixes (v0.1 → v0.2 · 10건)**
- (H1) DayBucket 5종 (`later` 추가 · 7일 초과 catch-all 분리)
- (H2) Zod loose datetime + client `toISOString()` serialize 명시
- (M3) TX 3R/5W 정정 (thread.update 포함)
- (M4) MessageBubble system 렌더 스펙 추가 (중앙 · gray · icon)
- (M5) ThreadHeader quoteAmount 대체 + PinnedQuoteCard 독립 유지
- (M6) BookingConfirmModal state pattern (useActionState → useTransition+useState intentional swap)
- (L7) findByQuoteId `.limit(1)` singleton 방어
- (L10) TX denorm fail-fast INTERNAL_ERROR
- Test #23-28 (bucket edges + ISO serialize) 추가

**Archive 재활용 (100%)**
- chat (v1.2 #1) — threadRepository · resolveThreadRole · ThreadDetailClient onSnapshot · MessageBubble (system 확장)
- quote-response (v1.1 #2) — submitQuote TX 패턴 + QuoteStatus 6-state (booked 전이 기존 정의)
- provider-profile-editor (v1.1b #3) — resolveProviderId 패턴
- client-dashboard (v1.1b #5) — day bucket 로직 · KST offset
- quote-repository · quote-request-repository 공통 · received page booking prop 주입

**Positive Divergences (Design v0.3 후보 7건)**
- 🟢 BookingStatusBanner DTO boundary (scheduledAtMs primitive)
- 🟢 WorksEmptyState CTA Link `/provider/requests`
- 🟢 BookingCard ARIA list + listitem
- 🟢 TX `quote.acceptedAt ?? serverTS` idempotent fallback
- 🟢 Zod issues → INVALID_INPUT 친화 에러
- 🟢 BookingConfirmModal default now+1h 10-min rounding (UX)
- 🟢 /provider/works try/catch degrade to empty

**구현 산출물**
- 파일 신규 10 / 수정 9 / dependency 0
- Build: 30 routes (유지)
- Firebase deploy: `firestore:rules,firestore:indexes` 완료
- TS 0 errors · Build 성공

**Pre-production 체크리스트**
- [x] Firestore rules + 1 index 배포
- [x] next build 통과
- [x] TypeScript 0 errors
- [ ] Smoke test: 청명 "일정 확정" → 양쪽 chat onSnapshot 실시간 반영 · /provider/works bucket 정확 · /received 배지

**🏆 Marketplace 마켓 루프 종결**
```
제출 ✅ → 응답 ✅ → 비교 ✅ → 수락 ✅ → 협의 ✅ → 일정 확정 ✅
(v1.0)    (v1.1)    (v1.1)    (v1.1)   (v1.2)    (v1.3)
```

**실서비스 런칭 가능** · 결제는 수동 계좌이체 가능 · v2 payment 도입 시 완전 자동화

**다음 feature**: v1.4 `provider-promo-content` (AI 블로그 커뮤니티 게시) · v2 `payment` (토스페이먼츠) · v2 `review` · v1.3b booking 상태 전이 · v1.2b chat rich types

---

### provider-search — 청명찾기 · 필터 + 정렬 탐색 (Marketplace v1.2 #2 · 🏆 3 cycles 연속 100%)

- **완료일**: 2026-04-21
- **Match Rate**: **100%** 🏆 (3 cycles 연속 · #12 → #13 → #14 퍼펙트)
- **PDCA 사이클**: #14 (single-pass · Plan Plus → Design v0.2 post-validator → Do → 100%)
- **레벨**: Dynamic (Next.js 16 Cache Components + `await connection()` + URL query param + Firestore query + client-side 보정)
- **방향**: `/search` placeholder 교체 · Server-first URL param · 4 필터 + 2 정렬 · 리스트 뷰 only (지도는 v1.2b) · 비로그인 public
- **경로**: [provider-search/](./provider-search/)

**문서**
- [Plan](./provider-search/provider-search.plan.md) (Plan Plus · 18 MVP · 8 out-of-scope · A+A1 Server-first URL param + 리스트만)
- [Design](./provider-search/provider-search.design.md) (v0.2 · validator 97%→ 8건 fix)
- [Analysis](./provider-search/provider-search.analysis.md) (**100%** · Positive Divergences 3건)
- [Report](./provider-search/provider-search.report.md)

**핵심 결정**
- **Server-first + URL query param** · SEO · 공유 가능 URL · 뒤로가기 친화
- **Firestore 2-3 필드 query only**: `isAvailable + optional categories(array-contains) + orderBy(sort) + limit(100)`
- **모든 보조 필터 client-side 보정**: `insuredOnly` · `region` · `minRating` (composite index 폭발 회피 · **FAILED_PRECONDITION 원천 차단**)
- **Composite indexes 2개만 추가** (`isAvailable+categories+repeatRate`, `+rating`) · 기존 `isAvailable+repeatRate+rating+completedWorkCount` 재활용
- **`useUpdateSearchParam` Client hook** (4 sub-control 공용 · `router.replace({scroll:false})`)
- **`parseSearchParams` pure helper** · invalid param null fallback · `sort=wrong` → default "repeatRate"
- **12 components** (Server 3 / Client 9 · Link 필요로 ResetFiltersButton · SearchEmptyState · ProviderSearchCard Client 승격)
- **100 cap + console.warn** · v1.2b paginate 트리거
- **비로그인 public** · `providers.read:true` 이미 public · proxy matcher 변경 없음
- **SortDropdown default 제거 로직** · `v === "repeatRate" ? null : v` URL 오염 방지
- **SearchEmptyState dual-branch** · hasFilters 기반 메시지 + CTA 분기
- **ActiveFiltersSummary hasAnyFilter 0시 `return null`** · 빈 UI 숨김

**Validator fixes (v0.1 → v0.2 · 8건)**
- (H1) 12 components Server 3 / Client 9 spec alignment
- **(H2) `insuredOnly` client-side로 이동** (index 폭발 회피 · FAILED_PRECONDITION 예방)
- (M3) `useUpdateSearchParam` hook `lib/search/use-update-search-param.ts` 별도 파일
- (L6) RegionFilter 14 옵션 (전체 + 13) 명시
- (L7) `toProviderSearchCardDTO` `SearchResultsSection.tsx` 내부 위치 고정
- (L8) `initialGradient` inline 복제 (2 callers · YAGNI)
- §5.5 DTO Formatters subsection 추가
- Test #21 Firestore index precondition

**Archive 재활용 (100%)**
- client-dashboard (v1.1b #5) — `await connection()` Next.js 16 패턴 · `initialGradient` 로직 (TopProviderCard · 복제)
- provider-dashboard (v1.1b #4) — DTO Server→Client boundary 패턴
- provider-profile-editor (v1.1b #3) — cookies Server shell 패턴
- quote-request (v1.0) — URL query param `?cat=` 패턴 재활용 (Link 타겟)

**Positive Divergences (Design v0.3 후보 3건)**
- 🟢 SortDropdown default 제거 로직 (URL 오염 방지)
- 🟢 SearchEmptyState dual-branch (hasFilters false 시 별도 메시지)
- 🟢 MinRatingToggle `on:boolean` 얇은 래핑 (threshold 확장 시 재작업 필요)

**구현 산출물**
- 파일 신규 14 / 수정 3 / dependency 0
- Build: 30 routes (/search 기존 경로 · placeholder 교체)
- Firestore: 2 composite indexes 추가 (2026-04-21) · rules 변경 없음 · Storage 변경 없음
- TS 0 errors · Build 성공

**Pre-production 체크리스트**
- [x] Firestore 2 indexes 배포
- [x] next build 통과
- [x] TypeScript 0 errors
- [ ] Smoke test: 필터 조합 URL 공유 · 재계약률 DESC default 정렬 · 결과 0건 empty state · BottomTabNav "청명찾기" navigate

**🏆🏆🏆 3 cycles 연속 퍼펙트**
```
#12 client-dashboard   (100%) ✅ v1.1b 마감
#13 chat               (100%) ✅ v1.2 #1 · onSnapshot 첫 도입
#14 provider-search    (100%) ✅ v1.2 #2 · 탐색 완결 · Firestore optimization
```

**다음 feature**: v1.3 `booking` (일정 확정 · 마켓 루프 종결) · v1.2b `provider-search-map` (Kakao Maps) · v1.2b `chat-rich-types`

---

### chat — 1:1 견적 협의 채널 · Firestore onSnapshot 첫 도입 (Marketplace v1.2 #1 · 🏆 v1.2 진입)

- **완료일**: 2026-04-21
- **Match Rate**: **100%** 🏆 (2 cycles 연속 · #12-#13 퍼펙트)
- **PDCA 사이클**: #13 (single-pass · Plan Plus → Design v0.2 post-validator → Do → 100%)
- **레벨**: Dynamic (Next.js 16 · Firestore onSnapshot v1.2 첫 도입 · Admin SDK TX · Client-heavy listener 패턴)
- **방향**: `/chat` 목록 + `/chat/{threadId}` 상세 2 routes · Quote 기반 thread 자동 생성 (submitQuote TX 확장) · Firestore 실시간 구독 · BottomTabNav unread badge
- **경로**: [chat/](./chat/)

**문서**
- [Plan](./chat/chat.plan.md) (Plan Plus · 20 MVP · out-of-scope 10+ · Approach A 협의 채널)
- [Design](./chat/chat.design.md) (v0.2 · validator 97%→ 5건 fix)
- [Analysis](./chat/chat.analysis.md) (100% · Positive Divergences 4건)
- [Report](./chat/chat.report.md)

**핵심 결정**
- **Firestore onSnapshot v1.2 첫 도입** · Client listener + useEffect cleanup + error handler · revalidatePath 불필요 (자동 반영)
- **Quote 기반 thread 자동 생성** · deterministic `threadId = ${requestId}_${providerId}` · composite ID 패턴 (providerResponses 재활용)
- **Idempotent 재제출** · `existingThread.exists` 분기 · 재제출 시 unread/lastMessage* 보존 · quoteId만 업데이트
- **submitQuote TX 2R/3W → 5R/4W** (reqSnap + prSnap + providerSnap + clientSnap + threadSnap reads)
- **Denormalization** (companyName · clientDisplayName maskName · providerOwnerUid · quoteId) · join 회피 · rules 간소화
- **Firestore rules 2중 방어** · Client onSnapshot read (participant only) + Server Action participant check · Admin SDK only write
- **Firestore indexes 3개** (threads×2 by clientUid/providerOwnerUid + lastMessageAt DESC · messages by threadId + createdAt ASC)
- **BottomTabNav unread badge** · ChatUnreadWrapper (Client onSnapshot aggregate) → TabNavClient prop 주입
- **9 컴포넌트** (Server 2 · Client 7 · Link만 Client)
- **200건 메시지 한도** (v1) · 초과 시 "최신 200건만" disclaimer
- **Rate limit v1 생략** (v1.2b 검토)
- **이미지 첨부 v1.2b 연기** (composer image button disabled + v1.2b title hint)
- **Rich types (quoteCard · scheduleRequest · paymentRequest) v1.3+** (`type: "text"` literal only)

**Validator fixes (v0.1 → v0.2 · 5건)**
- threadId 정규식 tighten `^[a-z0-9]{16}_[A-Za-z0-9]{20}$` + 단일 상수 `THREAD_ID_REGEX` export
- QuoteCompareCard 문의하기 **신규 버튼** 명시 (grep 확인 · 기존 disabled 아님)
- Firestore rules `in` 배열 최적화 (`auth.uid in [clientUid, providerOwnerUid]`)
- submitQuote TX 재제출 unread 보존 분기 로직 (FieldValue.increment 제거 · existingThread.exists → update vs create)
- `formatRelativeTime` 공용 util 추출 (`lib/format/relative-time.ts`) + `RequestPreviewCard` 마이그레이션 (duplicate 제거) · `lastMessageAt: null` 정렬 문서화 · Test #21-23 추가

**Archive 재활용 (100%)**
- provider-profile-editor (v1.1b #3) — `resolveProviderId` 패턴 · `adminStorage` export
- provider-dashboard (v1.1b #4) — `DashboardHero` Server 승격 + DTO 패턴 · `formatRelative` 추출 시 migrate 대상
- provider-profile (v1.1b #2) — `maskName` util (review-repository)
- client-dashboard (v1.1b #5) — `await connection()` 학습 반영 (ThreadBody는 cookies로 자동 dynamic 전환)
- quote-response (v1.1 #2) — composite ID 패턴 (`${providerId}_${requestId}` → `${requestId}_${providerId}`)
- bottom-tab-nav (v1.1b #1) — `tab-definitions.ts` `chat-unread` badgeKey 활용 · BottomTabNav 래퍼 교체

**Positive Divergences** (Design v0.3 후보 4건)
- `ThreadRowDTO.isNew` 필드 (명시적 "새 견적" 배지 렌더)
- `INITIAL_LAST_MESSAGE_PREVIEW` 상수 export (single source of truth)
- `resolveThreadRole(thread, uid)` util export (DRY)
- Design Summary header typo ("Server 3/Client 6" → 실제 2/7)

**구현 산출물**
- 파일 신규 14 / 수정 8 / dependency 0
- Build: 30 routes (`/chat` placeholder 교체 + `/chat/[threadId]` 신규)
- Firestore: rules + 3 indexes 배포 (2026-04-21)
- TS 0 errors · Build 성공

**Pre-production 체크리스트**
- [x] Firestore rules + indexes 배포
- [x] proxy.ts matcher `/chat/:path*` 추가
- [x] next build 통과
- [x] TypeScript 0 errors
- [ ] Smoke test: end-to-end flow (청명 quote 제출 → thread 자동 생성 → 양쪽 실시간 · BottomTabNav 배지 · /chat 목록 · 상세 · markAsRead · sendMessage · 비 participant 차단)

**🏆🏆 Cross-Cycle 2연속 퍼펙트**
```
#12 client-dashboard  (100%) ✅ v1.1b 마감
#13 chat              (100%) ✅ v1.2 #1 · onSnapshot 첫 도입 · 2연속 100%
```

**다음 feature**: v1.2 `provider-search` (`/search` placeholder 교체 · 리스트/지도 · 필터) · v1.3 `booking` (일정 확정) · v1.2b `chat-rich-types` (이미지 · quoteCard inline · ✓✓)

---

### client-dashboard — 고객 홈 확장: 평균가 + Top 5 청명 (Marketplace v1.1b #5 · 🏆 v1.1b 마감)

- **완료일**: 2026-04-21
- **Match Rate**: **100%** 🏆 (Critical 0 / Major 0 / Minor 0 · 12 cycle 중 첫 퍼펙트)
- **PDCA 사이클**: #12 (single-pass · design-validator 생략 선택)
- **레벨**: Dynamic (Next.js 16 Cache Components + Firestore · `await connection()` 패턴 첫 도입)
- **방향**: 홈 `/` 확장 (신규 경로 없음 · Master Plan "홈 확장" 정합) · 2 신규 섹션 (💰 카테고리별 평균가 6개 · 🏆 Top 5 청명) · 비로그인 public · providers 기반 근사치 + v2+ analytics-batch 전환 경로 명시
- **경로**: [client-dashboard/](./client-dashboard/)

**문서**
- [Plan](./client-dashboard/client-dashboard.plan.md) (Plan Plus · 15 MVP · 6 out-of-scope · Approach A 홈 확장)
- [Design](./client-dashboard/client-dashboard.design.md) (v0.1 · 10 Open Q 해소)
- [Analysis](./client-dashboard/client-dashboard.analysis.md) (**100%** · Positive Divergences 4건)
- [Report](./client-dashboard/client-dashboard.report.md)

**핵심 결정**
- **홈 `/` 확장** (신규 경로 없음) · BottomTabNav · proxy matcher · auth 변경 없음
- **Server-first** · 6 컴포넌트 (Server 4 / Client 2 · Link만 Client)
- **Pure function 격리** (`price-aggregator.ts` `computeAveragePrices`) — v2+ analytics-batch 교체 시 **UI 불변 보장**
- **Firestore NULLS LAST 자동 처리** · 신규 청명 자연 후순위 · 명시적 필터 불필요
- **Firestore composite index 1 추가** (isAvailable + repeatRate + rating + completedWorkCount) · 배포 완료
- **`await connection()` 패턴 첫 도입** (Next.js 16 Cache Components) · `randomBytes before accessing uncached data` 에러 해결 · **프로젝트 전체 패턴화 권장**
- **Server→Client DTO primitive only** (`TopProviderCardDTO`) · Timestamp/undefined 누출 원천 차단
- **snap-x snap-mandatory + shrink-0 w-44/w-40** · 모바일 가로 스크롤 UX
- **100 cap `console.warn`** · 운영자 모니터링 시그널 · v1.2+ paginate 트리거
- **비로그인 public** · `providers.read: true` 이미 public · 탐색 focus 정합
- **Seed 5 청명** · priceBook 2~3 · repeatRate 0.3/0.45/0.62/0.78/0.85 · rating 4.2~4.9 · 14 priceBook entry (6 카테고리 전체 커버)

**Positive Divergences (Design v0.2 후보 4건)**
- 🟢 #1 **`await connection()`** · Next.js 16 필수 · Critical fix · **프로젝트 전체 패턴화**
- 🟢 #2 0-sample 카테고리도 per-card EmptyDataCard · 6-card grid 폭 일관
- 🟢 #3 TopProvidersSection disclaimer 2줄 · 투명성 일관
- 🟢 #4 `#rank` 배지 overlay · UX 시맨틱 강화

**Archive 재활용 (100%)**
- quote-request — QUOTE_CATEGORIES · `/quote/new?cat=` query pattern
- provider-profile (reader) — profileImage gradient fallback 패턴
- provider-dashboard — Firestore composite index 추가 패턴 · Server Component pure helper 격리
- provider-profile-editor — providerRepository.update 공통

**구현 산출물**
- 파일 신규 9 / 수정 4 / dependency 0
- Build: 29 routes (`/` 확장 · 신규 경로 없음)
- Firestore: indexes 1 추가 · rules 불변 · Storage 불변
- TS 0 errors · 신규 코드 lint error 0
- Smoke test: 2 섹션 렌더 · 5 청명 rank 정렬 확인 ✅

**Pre-production 체크리스트**
- [x] Firestore composite index 배포 · Enabled 확인
- [x] Seed 실행 (5 청명 · 14 priceBook · 5 demo users)
- [x] next build 통과
- [x] TypeScript 0 errors
- [x] Smoke test: 홈 / 2 섹션 노출 · 비로그인/로그인 양쪽

**Follow-ups (cosmetic · 향후 Design v0.2 반영 권장)**
- `await connection()` Design §11 표준 패턴 명문화 (모든 Server Component with Firestore fetch 대상)
- TopProvidersSection disclaimer Design §5.3 mockup 반영
- `#rank` 배지 Design §5.3 mockup 업데이트

**🏆 Marketplace v1.1b 5/5 완료 — 마감**
```
#8  bottom-tab-nav            (99%)  ✅ role-aware 5탭 shell
#9  provider-profile          (99%)  ✅ 청명 reader
#10 provider-profile-editor   (99%)  ✅ 청명 editor
#11 provider-dashboard        (99%)  ✅ 청명 홈
#12 client-dashboard         (100%)  ✅ 고객 홈 · 첫 퍼펙트
───────────────────────────────────────
Marketplace v1.1b 완료 → v1.2 진입 준비
```

**다음 feature**: v1.2 `chat` (onSnapshot 첫 도입 · quote-response 협의 채널) · v1.2 `provider-search` (`/search` placeholder 교체 · 리스트/지도)

---

### provider-dashboard — 청명 홈 대시보드 (Marketplace v1.1b #4)

- **완료일**: 2026-04-21
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 2 cosmetic)
- **PDCA 사이클**: #11 (single-pass)
- **레벨**: Dynamic (Next.js 16 Cache Components · Server Actions · Firestore `.count()` aggregation)
- **방향**: `/provider/home` 신규 경로 · 청명 오늘의 운영 허브 (Q1=A 운영 포커스) · Adaptive UX (Q2=C · Q3=B 수신 요청 개수 기반) · Server-rendered vertical feed (Approach A)
- **경로**: [provider-dashboard/](./provider-dashboard/)

**문서**
- [Plan](./provider-dashboard/provider-dashboard.plan.md) (Plan Plus · 12 MVP · 6 out-of-scope · Approach A)
- [Design](./provider-dashboard/provider-dashboard.design.md) (v0.2 · validator 97%→ 6건 피드백 반영)
- [Analysis](./provider-dashboard/provider-dashboard.analysis.md) (99% · Minor 2 cosmetic)
- [Report](./provider-dashboard/provider-dashboard.report.md)

**핵심 결정**
- 신규 `/provider/home` 경로 · BottomTabNav "홈" 탭 재배치 (`/provider/profile` → `/provider/home` · `exact:true`)
- Server-first + 섹션 Suspense · 8 컴포넌트 (Server 4 / Client 4)
- Adaptive UX: `activeRequests.length === 0` → EmptyRequestsHint (2 CTA: 프로필/카테고리) · >=1 → RequestPreviewCard × 3 + "전체 N건 →"
- `.count()` aggregation (Admin SDK · 리드 1건 비용) · `limit(3)` + 병렬 Promise.all
- `QuoteRequestPreviewDTO` 신규 · Firestore Timestamp → Server Date → Client ms 체인 완결 (hydration mismatch 원천 차단)
- DashboardHero Server 승격 (v0.2 validator fix) · getGreeting KST offset 서버 계산
- `/provider/profile` editor는 ShortcutGrid 전용 진입점으로 역할 분리 (Q7)
- 기존 `category+status+createdAt` composite index 재사용 (quote-response triage와 공유)
- Firestore rules 불변 · `providers.update: false` 유지 (Admin SDK 독점)
- Auth guards 3-tier (비로그인/no-providerId/no-provider) · `/signup-provider` redirect fallback
- Test Plan 20건 (validator v0.2에서 DTO/greeting/>10 categories 방어 케이스 추가)

**Validator fixes (v0.1 → v0.2 · 6건)**
- 컴포넌트 카운트 8개 일관화 (Summary / §5.3 / §8 / §10.1)
- DashboardHero Client → Server 승격 (hydration 안전) + greeting prop 주입
- `QuoteRequestPreviewDTO` 신규 (Timestamp serialization 방지)
- getGreeting dead 라인 제거 + 서버 단일 계산
- `categories.length > 10` 방어 문서화 + Test #18
- Test #19 DTO 매핑 · #20 greeting hydration 추가

**Archive 재활용 (100%)**
- provider-profile-editor — providerRepository.update · resolveProviderId 패턴
- provider-profile (reader) — providerRepository.get cache · userRepository.get cache
- bottom-tab-nav — PROVIDER_TABS 재배치 · exact 매칭 로직
- quote-response — `category+status+createdAt` composite index 공유

**Positive Divergences** (Design 상회 개선)
- DashboardSkeleton Suspense fallback 구체화
- 모든 섹션 `aria-labelledby` 일관 · AvailabilityToggle `role=switch` + `aria-checked` + `aria-label` + `disabled` 4종
- ShortcutGrid badge `aria-label="{label} {count}건"` 접근성
- `formatRelative` 7일 초과 `toLocaleDateString("ko-KR")` fallback
- EmptyRequestsHint `emphasizeCategories`/`emphasizeProfile` dual-branch indigo 강조
- **Bonus bug fix**: TriageClient BottomTabNav 겹침 수정 (`bottom: var(--bottom-nav-height) · z-30 · pb-32` + toast lift)

**구현 산출물**
- 파일 신규 11 / 수정 3 / dependency 0
- Build: 29 routes (`/provider/home` 신규)
- Firestore rules / indexes 불변
- TS 0 errors · 신규 코드 lint error 0

**Pre-production 체크리스트**
- [x] next build 통과
- [x] TypeScript 0 errors
- [x] BottomTabNav 재배치 smoke test
- [ ] Smoke test: adaptive UX 분기 (empty/1/5+) · Toggle on/off · Shortcut badge · Hero greeting KST 전환

**Follow-ups (Minor · cosmetic)**
- m1: EmptyRequestsHint "카테고리 넓히기" CTA 타겟 `?tab=basic` 동일 · 경로 일관 (기능 영향 없음)
- m2: "전체 N건 →" 문구 vs heading 옆 `({totalCount}건)` 분리 표시 (정보량 동등)
- tech debt: `resolveProviderId` helper shared util 추출 (provider-profile-editor와 중복 — v1.2)

**🏆 Marketplace v1.1b 4/5 완료**
```
#8  bottom-tab-nav          (99%) ✅ role-aware 5탭 shell
#9  provider-profile        (99%) ✅ 청명 reader
#10 provider-profile-editor (99%) ✅ 청명 editor
#11 provider-dashboard      (99%) ✅ 청명 홈
```

**다음 feature**: v1.1b 마지막 `client-dashboard` (Figma 고객 홈 · 평균가 · Top5) · v1.2 `chat` / `provider-search`

---

### provider-profile-editor — 청명 자기 프로필 3-tab 편집기 (Marketplace v1.1b #3)

- **완료일**: 2026-04-21
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 3 cosmetic)
- **PDCA 사이클**: #10 (single-pass)
- **레벨**: Dynamic (Next.js 16 + Firebase Admin SDK + RHF useFieldArray + Controller)
- **방향**: `/provider/profile` stub 완전 교체 · 3-tab 편집기 (기본정보 · 서비스 단가 · 포트폴리오) · 4 Server Actions · PhotoUpload maxPhotos 확장으로 단일 이미지 필드 지원 · Storage rules 2 blocks 추가
- **경로**: [provider-profile-editor/](./provider-profile-editor/)

**문서**
- [Plan](./provider-profile-editor/provider-profile-editor.plan.md) (Plan Plus · 15 MVP · 10 out-of-scope · Approach A 3-tab)
- [Design](./provider-profile-editor/provider-profile-editor.design.md) (v0.2 · validator 99% GO · 6건 피드백 반영)
- [Analysis](./provider-profile-editor/provider-profile-editor.analysis.md) (99% · Minor 3 cosmetic)
- [Report](./provider-profile-editor/provider-profile-editor.report.md)

**핵심 결정**
- 3-tab URL state (`?tab=basic|price|portfolio`) · back button 친화 · parseTab fallback
- PhotoUpload `maxPhotos?: number` prop 확장 (default MAX_PHOTOS=3 · 기존 caller regression 0)
- Pre-issued nanoid(16) workCaseId · Storage path와 Firestore id 일관성 (quote-request 패턴)
- `profileImage: null = 명시적 삭제` 시맨틱 확정 (v0.2 Q9) · oldPath best-effort Storage 정리
- `completedAt = serverTimestamp()` 고정 (v0.2 Q10 · completedDaysAgo 제거)
- Firestore rules 불변 (`providers.update: false` + `workCases.write: false`) · Admin SDK 독점
- Storage rules 2 blocks: `profile-images/{uid}/{pageId}/*` + `work-photos/{uid}/{workCaseId}/*` · owner uid + 5MB + image mime
- 4 Server Actions: updateProfileBasic(8-step) · upsertPriceBook(5-step) · createWorkCase(5-step) · deleteWorkCase(7-step)
- resolveProviderId + deleteStorageSafely helpers
- ownership verify 2-branch FORBIDDEN (not-exists vs not-owner)
- providerRepository.toProvider 11 필드 매핑 확장 (profileImage · priceBook · insuranceAmount · reviewCount · responseTimeMinutes · completedWorkCount · repeatRate · verified · yearsOfExperience · isAvailable · profileImagePath)

**Validator fixes (초안 → v0.2 · 6건)**
- Issue #1 profileImage null 시맨틱 확정 (명시적 삭제) · Q9 추가
- Issue #2 completedDaysAgo 필드 제거 (MVP scope creep 방지) · Q10 추가
- Issue #3 PhotoUpload regression Test #15 추가
- Issue #4 profile-images pageId `profile` 센티넬 (가독성)
- Issue #5 Tab fallback TabKey 타입 내로잉
- revalidatePath 스텝 `upsertPriceBook`/`updateProfileBasic` 명시 · Test #16 orphan + #17 교체 old path 추가

**Archive 재활용 (100%)**
- PhotoUpload (promo-page) — pathPrefix + maxPhotos 확장으로 재활용
- auth-admin.ts (promo-page) — verifySessionCookie
- errors.ts (promo-page) — AppError · ActionResult · toActionError
- provider-signup — TX 패턴 · providerRepository 공통
- provider-profile (v1.1b #2) — workCaseRepository · reviewRepository 공통

**Positive Divergences** (Design 상회 개선)
- WorkCaseCard `confirm()` 오삭제 방지
- WorkCaseUploadForm nextId 재발급 + reset — 연속 업로드 UX
- PhotoUpload counter `{maxPhotos}` 동적 대응
- EditorSkeleton Suspense fallback
- parseTab util 분리
- deleteWorkCase FORBIDDEN 2-branch 분리

**구현 산출물**
- 파일 신규 11 / 수정 6 / dependency 0
- Build: 28 routes (변경 없음, `/provider/profile` 교체)
- Firebase deploy: storage rules 배포 완료 (firestore rules/indexes 변경 없음)
- TS 0 errors · lint error 0 (신규 코드) · build 성공

**Pre-production 체크리스트**
- [x] Storage rules 배포 (`firebase deploy --only storage`)
- [x] next build 통과
- [x] TypeScript 0 errors
- [ ] Smoke test: 3 탭 모두 save → /providers/{id} reader 반영 확인 · workCase Before/After 업로드 → 삭제 (Storage 파일 정리)

**Follow-ups (Minor · cosmetic)**
- m1: FORM_REGION_OPTIONS 수치 notation ("14개" → "13개" doc만)
- m2: PriceBookTab append `basePrice` 기본값 양수 placeholder 검토
- m3: RegionCheckboxGrid label에 "1~5개" 병기 검토

**🏆 Marketplace v1.1b 3/5 완료**
```
#8  bottom-tab-nav          (99%) ✅ role-aware 5탭 shell
#9  provider-profile        (99%) ✅ 청명 reader
#10 provider-profile-editor (99%) ✅ 청명 editor
```

**다음 feature**: v1.1b `provider-dashboard` (Figma 청명 홈 탭) 또는 `client-dashboard` (Figma 고객 홈) · v1.2 `chat` / `provider-search`

---

### provider-profile — 청명 프로필 상세 reader (Marketplace v1.1b #2)

- **완료일**: 2026-04-21
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 2 cosmetic)
- **PDCA 사이클**: #9 (single-pass)
- **레벨**: Dynamic (Next.js 16 · Firestore · OG image dynamic · localStorage · React Server Components)
- **방향**: `/providers/{id}` stub 대체 · Figma 1:1 7섹션 (Hero·Meta·Stats·PriceBook·WorkGallery·Reviews·CTA) + OG image + /quote/new?providerId= 통합
- **경로**: [provider-profile/](./provider-profile/)

**문서**
- [Plan](./provider-profile/provider-profile.plan.md) (Plan Plus · 13 MVP · 7 섹션 전체)
- [Design](./provider-profile/provider-profile.design.md) (v0.1 · validator 97% GO · M1-M4 Do 반영)
- [Analysis](./provider-profile/provider-profile.analysis.md) (99% · Minor 2 cosmetic)
- [Report](./provider-profile/provider-profile.report.md)

**핵심 결정**
- Figma 7 섹션 전체 구현 (empty state 통일 EmptySection)
- workCases/reviews top-level 컬렉션 (cross-provider 쿼리 용이)
- Server→Client boundary 최소화 (primitive prop)
- localStorage FavoriteButton (비로그인 허용)
- OG image nodejs runtime · conditional separator
- maskName util (1자 · X* · X*X)
- seed 확장 (priceBook 3 · workCases 3 · reviews 2 · demo users 2)
- /quote/new providerId 통합 (🎯 배지 · category lock · 매칭 맨 앞)
- types/provider.ts 3 필드 확장

**Validator fixes (97% → 99%)**
- M1/M2 types/provider.ts 3 필드 · M3 N+1 주석 · M4 OG conditional separator

**Positive Divergences**
- FavoriteButton z-10 · BottomCTA encodeURIComponent · ReviewList formatRelativeDate · WorkGallery "최근 N건"

**구현 산출물**
- 파일 신규 14 / 수정 6 / dependency 0
- Build: 28 routes (27 → 28)
- Firebase deploy: firestore:rules + 2 indexes 완료

**Pre-production**
- [x] rules + indexes 배포 · [x] build 통과
- [ ] seed 실행 + smoke test

**Follow-ups (cosmetic)**
- m1 line-clamp-3 · m2 "리뷰 0" 표시

**다음**: v1.1b `provider-profile-editor` (3-tab · workCases 업로드 · priceBook CRUD)

**Marketplace v1.1b 진행도**: 2/5 (bottom-tab-nav ✅ · provider-profile ✅)

---

### bottom-tab-nav — 공통 하단 탭 네비게이션 shell (Marketplace v1.1b #1)

- **완료일**: 2026-04-21
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 2 informational)
- **PDCA 사이클**: #8 (single-pass)
- **레벨**: Dynamic (Next.js 16 + React cache + Suspense + Server/Client boundary)
- **방향**: v1.1 루프 폐쇄 이후 Figma 완성도 보강 · role-aware 5탭 shell (고객 vs 청명 탭 구성 다름) · 미구현 feature placeholder
- **경로**: [bottom-tab-nav/](./bottom-tab-nav/)

**문서**
- [Plan](./bottom-tab-nav/bottom-tab-nav.plan.md) (Plan Plus · 9 MVP · Approach A role-aware 5탭)
- [Design](./bottom-tab-nav/bottom-tab-nav.design.md) (v0.1 · validator 93% GO · M1/M2 Do 반영)
- [Analysis](./bottom-tab-nav/bottom-tab-nav.analysis.md) (99% · Minor 2 doc only · user-repository bug fix)
- [Report](./bottom-tab-nav/bottom-tab-nav.report.md)

**핵심 결정**
- role-aware 5탭 (고객: 홈·청명찾기·받은견적·채팅·커뮤니티 / 청명: 홈·요청·작업·채팅·설정)
- Server→Client boundary: `tabSetKey` 문자열만 전달 (LucideIcon serialization 회피)
- React `cache()` 이중 적용 (user.get + resolveRole)
- Suspense wrap in layout (Cache Components 준수)
- URL pathname active 감지 (exact vs prefix)
- Placeholder 5 페이지 (/search · /chat · /community · /provider/works · /provider/settings)
- 인증 페이지 RegExp 4개 자동 숨김
- CSS 변수 `--bottom-nav-height: 64px` + env(safe-area-inset-bottom)
- ARIA 완전 (aria-current · aria-label · aria-hidden)

**🐛 Positive Side Effect (user-repository bug fix)**
- Before: `userRepository.get()`이 `providerId`·`contactPhone`·`roles` 필드 미반환 → provider-aware 페이지 모두 undefined 처리 버그
- After: 3 필드 명시 return + `cache()` 적용
- **영향**: provider-signup #5, quote-response #6, received-quotes #7 archived feature들 자동 개선 · 배포 즉시 반영

**Scope Creep (허용)**
- `/logout` route handler 추가 (scope 외) — 고객 5탭에 "설정" 없어 로그아웃 진입점 부재 · UX 필수
- Plan v0.2 notation 권장

**Archive 재활용 (100%)**
- auth-admin.ts (tryVerifySessionCookie)
- user-repository.ts (bug fix + cache 적용)
- Tailwind + lucide-react 기존 패턴
- React cache() (Next.js 표준)

**Validator fixes (93% → Match 99%)**
- M1 Suspense wrapper · M2 Server→Client boundary 전부 Do 반영
- m1-m7 doc polish

**구현 산출물**
- 파일 신규 10 / 수정 3 / 신규 dependency 0
- Build: 27 routes (22 → 27)
- Firestore/Storage 변경 없음

**Pre-production 체크리스트**
- [x] next build 통과
- [x] user-repository bug fix
- [ ] Smoke test: 고객/청명 role별 5탭 렌더 확인 · hidden paths nav 미노출

**Follow-ups (Minor · doc only)**
- m1: Plan v0.2 `/logout` route notation
- m2: Design v0.2 M1/M2 구현 완료 Implementation Notes

**다음 feature**: v1.1b `provider-profile` (reader) / `provider-dashboard` / `client-dashboard` 또는 v1.2 `chat` / `provider-search`

---

### received-quotes — 의뢰인 받은견적 비교·수락 (Marketplace v1.1 루프 폐쇄 🏆)

- **완료일**: 2026-04-21
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 1 informational)
- **PDCA 사이클**: #7 (single-pass)
- **레벨**: Dynamic (Next.js 16 + Firestore TX + Server Actions)
- **방향**: v1.1 3번째 feature · 의뢰인이 자기 요청의 받은 견적을 2-tab 목록 + 상세 비교 + 수락. Figma 받은견적 탭 1:1 + 4-step QuoteStepper + acceptQuote TX + /providers/{id} stub
- **경로**: [received-quotes/](./received-quotes/)
- **🏆 마일스톤**: Marketplace v1.1 마켓 루프 폐쇄 cycle. quote-request → provider-signup → quote-response → received-quotes 4 feature 99%+ 유지

**문서**
- [Plan](./received-quotes/received-quotes.plan.md) (Plan Plus · 12 MVP · Approach A Server shell + Client accept)
- [Design](./received-quotes/received-quotes.design.md) (v0.1 · validator 97% GO · M1/M2/M3 전부 Step 6-7 inline fix)
- [Analysis](./received-quotes/received-quotes.analysis.md) (99% · Minor 1 · formatWon 중복 v1.2)
- [Report](./received-quotes/received-quotes.report.md)

**핵심 결정**
- Server shell + Suspense + Client accept 버튼 (Next.js 16 Cache Components 일관)
- 신규 컬렉션 0 — quotes.status · quoteRequests.status 전이만
- acceptQuote 9-step TX (tx.get×2 guard + tx.update×2 atomic)
- 2-tab URL state `?tab=active|completed`
- QuoteStepper 4단계 + cancelled=-1 특수 처리
- 가격 범위 실 집계 (추정 아님)
- sentAt asc FIFO 공정성 + listByRequest({order}) backward compat
- 수락 후 다른 quotes 'sent' 유지 (경쟁 보존)
- Role guard 2-tier (Server Action FORBIDDEN + page notFound)
- Repository 수정 최소 (optional param만)

**Archive 재활용 (100%)**
- promo-page: auth-admin.ts, errors.ts
- quote-request: quoteRequestRepository.listForClient
- provider-signup: 2-tier role guard 패턴
- quote-response: quote-repository.ts, acceptQuote은 기존 파일 추가

**Validator fixes (97% → Match 99%)**
- M1 TodayCard latestCategory prop drop · M2 TabBar counts 명시 · M3 proxy matcher 전부 Step 6-7 inline

**구현 산출물**
- 파일 신규 9 / 수정 5 / 신규 dependency 0
- Build: 22 routes (19 → 22) · /received, /received/[id], /providers/[id]
- Firestore rules/indexes 변경 없음

**Pre-production 체크리스트**
- [x] next build 통과
- [x] proxy.ts matcher 확장
- [ ] Smoke test: end-to-end flow (의뢰인 제출 → 청명 응답 → 의뢰인 수락)

**Follow-ups (Minor only)**
- m1: formatWon util 3 파일 중복 → `lib/format.ts` 추출 (v1.2)
- KST offset util 추출 (v1.2)

**🏆 Marketplace v1.1 Loop Closure**
```
#2 quote-request  (99%) ✅ 의뢰인 제출
#5 provider-signup (99%) ✅ 청명 온보딩
#6 quote-response (99%) ✅ 청명 응답
#7 received-quotes (99%) ✅ 의뢰인 비교·수락
───────────────────────────────────────
End-to-end: 제출 → 응답 → 수락 → negotiating 전이
```

**다음 feature**: v1.1b `bottom-tab-nav` (공통 5탭 shell)

---

### quote-response — 청명 견적 응답 (Marketplace Track #3 · v1.1)

- **완료일**: 2026-04-21
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 3 runtime-zero-impact)
- **PDCA 사이클**: #6 (single-pass)
- **레벨**: Dynamic (Next.js 16 + Firebase Firestore TX + RHF useFieldArray)
- **방향**: v1.1 2번째 feature · 청명 Figma Tinder-like triage + 항목 분해 견적 작성. quotes/providerResponses 컬렉션 + QuoteStatus 6-state 확장으로 v1.2 chat / v1.3 booking 기반 제공.
- **경로**: [quote-response/](./quote-response/)

**문서**
- [Plan](./quote-response/quote-response.plan.md) (Plan Plus · 13 MVP · Approach A Tinder-like)
- [Design](./quote-response/quote-response.design.md) (v0.1 · validator 95% GO · M2/M4 해결)
- [Analysis](./quote-response/quote-response.analysis.md) (99% · Minor 3 무영향)
- [Report](./quote-response/quote-response.report.md)

**핵심 결정**
- Figma Tinder-like 1-by-1 triage (Approach A) + 3-action bar (pass/ask-disabled/propose)
- 항목별 분해 견적 폼 · useFieldArray min 1 max 10 · 실시간 totalAmount
- `category in` 쿼리 (QuoteCategory 6 ≤ 10 한도)
- Server totalAmount 재계산 (Zod schema에서 totalAmount 제외)
- TX atomic 3-write (quotes.create + providerResponses.set + quoteRequests.update idempotent)
- ProviderResponse composite id `${providerId}_${requestId}` 자연스러운 1:1 unique
- QuoteStatus 6-state (submitted→quoted→negotiating→booked→completed+cancelled)
- normalizeQuoteStatus alias (legacy 'responded' → 'quoted' defense)
- 2-tier role guard (proxy + page level)
- 거리 근사 라벨 (동네/같은시/다른지역, Geocoding 부재 대체)
- 문의 버튼 disabled (chat v1.2 대기)

**Archive 재활용 (100%)**
- promo-page: auth-admin.ts, errors.ts
- quote-request: rate-limit.ts 3-arg, quote-request-repository.ts 확장, QUOTE_CATEGORIES
- provider-signup: 2-tier role guard 패턴, TX atomic pattern (M2 경험)

**Validator fixes (95% → Match 99%)**
- M2 quoteRequests.update 명시 블록 (firestore.rules:95)
- M4 TX create body 12 필드 + server totalAmount recalc
- M1 · M3 · M5: doc-only noted

**구현 산출물**
- 파일 신규 13 / 수정 6 / 신규 dependency 0
- Build: 19 routes (17 → 19) · /provider/requests · /provider/requests/[id]/propose 추가
- Firebase deploy: firestore:rules + 3 indexes (2026-04-21)

**Pre-production 체크리스트**
- [x] Firebase rules + indexes 배포
- [x] next build 통과
- [ ] Firestore 인덱스 빌드 완료 확인 (1~3분 auto)
- [ ] Smoke test: 청명 로그인 → /provider/requests triage → pass + propose 테스트

**Follow-ups (Design doc update only, no code)**
- G1: `proposalFormSchema.requestId` 제거를 Design v0.2에 반영
- G2: RequestCard 사진 slice 2장 명시
- G3: `upsertQuoted` 메서드 제거 (TX 내부 tx.set가 최종)

**다음 feature**: [Master Plan](../../00-vision/marketplace-master-plan.md) v1.1 3번째 = `received-quotes` (의뢰인 받은견적 탭)

---

### provider-signup — 청명 Self-serve 회원가입 (Marketplace Track #2 · v1.1)

- **완료일**: 2026-04-20
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 2 informational)
- **PDCA 사이클**: #5 (single-pass, iterate 없음)
- **레벨**: Dynamic (Next.js 16 + Firebase Auth + Firestore TX + Resend)
- **방향**: v1.1 첫 feature · 청명이 admin 승인 없이 Firebase Auth + providers doc 생성. quote-response / provider-profile-editor / received-quotes blocker 해소.
- **경로**: [provider-signup/](./provider-signup/)

**문서**
- [Plan](./provider-signup/provider-signup.plan.md) (Plan Plus · 14 MVP · 12 out-of-scope · Approach A single-page)
- [Design](./provider-signup/provider-signup.design.md) (v0.1 · design-validator 96% → M1-M4 Do에서 전부 해결)
- [Analysis](./provider-signup/provider-signup.analysis.md) (99% · Minor 2 informational)
- [Report](./provider-signup/provider-signup.report.md)

**핵심 결정**
- Single-page signup (vs 2-step / Upgrade flow 기각)
- Client firebase/auth + Server atomic TX (3-write + back-fill)
- 1:1 user-provider 관계 (`users.providerId` ↔ `providers.ownerUid`)
- Firestore transaction으로 race-safe (`tx.get(ownerQuery)` 중복체크 + `tx.get(userRef)` createdAt 보존)
- Rate limit `signup:{email}` 1hr 3건 (기존 `rate-limit.ts` 3-arg overload 재활용)
- 이메일 fire-and-forget + Promise.allSettled graceful failure
- Role-aware `/dashboard` redirect (legacy promo-page 대시보드 제거 · bridge)

**Validation fixes (design-validator 94% → Match 99%)**
- M1 TX closure `globalThis` 안티패턴 → 외부 `let providerId` capture
- M2 ALREADY_REGISTERED race → TX 내부 `tx.get(query)` 이동
- M3 `createdAt` 덮어쓰기 → `tx.get(userRef)` + `!snap.exists` 조건부 set
- M4 users.update rules → `roles`/`providerId`/`contactPhone` 차단 추가

**Archive 재활용 (100%)**
- promo-page: `auth-admin.ts`(session cookie), `errors.ts`(AppError/ActionResult)
- quote-request: `rate-limit.ts` 3-arg overload, `lib/email/resend.ts` + `escapeHtml`, `QUOTE_CATEGORIES` enum

**구현 산출물**
- 파일 신규 10 / 수정 7 / 신규 dependency 0
- Build: 17 routes (13 → 17) · /signup-provider, /provider/profile, /terms, /privacy 추가
- Firebase deploy: firestore:rules 완료

**Pre-production 체크리스트 (운영자)**
- [x] Firebase rules 배포 (providers.create owner + users.update 확장)
- [ ] `.env.local`에 RESEND_API_KEY, EMAIL_FROM, OPERATOR_EMAIL=peter15975345@gmail.com, APP_URL 추가
- [ ] 테스트 가입 + welcome/admin 이메일 도착 확인

**다음 feature**: [Master Plan](../../00-vision/marketplace-master-plan.md) v1.1 2번째 = `quote-response` (청명 intake + 견적 작성)

---

### quote-request — 청소 견적 요청 제출 플로우 (Marketplace Track #1)

- **완료일**: 2026-04-20
- **Match Rate**: 99% (Critical 0 / Major 0 / Minor 3 — design-doc only)
- **PDCA 사이클**: #4 (single-pass, iterate 없음)
- **레벨**: Dynamic (Next.js 16 + Firebase + Resend + Google AI Studio)
- **방향**: 청광 Marketplace Track 첫 feature · 의뢰인 견적 요청 submit + 청명 이메일 알림
- **경로**: [quote-request/](./quote-request/)

**문서**
- [Plan](./quote-request/quote-request.plan.md) (Plan Plus + Vision marketplace.md 기반 · 11 MVP 항목)
- [Design](./quote-request/quote-request.design.md) (v1.2, design-validator 94% → Do에서 전부 해결)
- [Analysis](./quote-request/quote-request.analysis.md) (99% · Minor 3 · iterate 없음)
- [Report](./quote-request/quote-request.report.md)

**핵심 결정**
- Server Action + Resend 동기 이메일 (Firestore Trigger async 기각)
- Pre-issued requestId (`nanoid(16)`) — 사진 업로드·Firestore id 일관성
- rate-limit backward-compat overload: `checkAndIncrement(key, limit?, windowMs?)` 1-arg/3-arg 동시 지원
- PhotoUpload `pathPrefix` prop 확장 (기본 `photos` → quote는 `quote-photos`), 래퍼 불필요
- Home shell in-flight 확장: Figma 대응 TopBar + TodayCard + lucide 아이콘 + 파스텔 tile (Plan/Design 업데이트 후 구현)
- REGION_PRESETS 공유 추출 (promo-feed와 신규 QuoteForm 공유)

**Archive 재활용**
- promo-feed/RegionSelect의 REGION_PRESETS
- promo-page/PhotoUpload (pathPrefix prop 확장 방식)
- promo-page/errors.ts AppError + ActionResult
- content-research-pipeline/email-notifier.ts Resend 호출 패턴

**Validation fixes 처리** (design-validator 94% → Match 99%)
- M1 rate-limit backward-compat
- M2 PhotoUpload pathPrefix prop
- m1 Zod 타입 cast · m2 Date 변환 · m3 rules defense-in-depth · m4 escapeHtml 일관성

**Follow-up 추적 (모두 design 문서만, 코드 수정 없음)**
- MN-1: 비로그인 홈 TodayCard 동작 spec 업데이트 (숨김 → 로그인 유도 CTA)
- MN-2: CategoryGrid 파스텔 tone spec (`{color}-50/600` + dark mode variant)
- MN-3: TodayCard 부가 정보 spec (24시간 연락 안내 + count badge)

**Pre-production 체크리스트**
- [x] Firebase rules + indexes + storage 배포 (2026-04-20)
- [ ] `.env.local`에 `RESEND_API_KEY`, `EMAIL_FROM` 추가
- [ ] `scripts/seed-first-provider.mjs` 실행 (첫 청명 시드)
- [ ] Firestore `rateLimits.ttlExpiresAt` TTL 정책 활성화 확인

**다음 feature**: [Master Plan](../../00-vision/marketplace-master-plan.md) v1.1 = `provider-signup` (청명 가입)

---

### content-research-pipeline — 주간 콘텐츠 리서치 자동화 파이프라인

- **완료일**: 2026-04-20
- **Match Rate**: 96% (Critical 0 / Major 0 / Minor 9)
- **PDCA 사이클**: #2 (iterate 없음)
- **레벨**: Dynamic (Firebase Functions 2nd gen + Gemini AI Studio API + Resend)
- **역할**: promo-page/promo-feed가 소비하는 `trendKeywords/{category}` + `templates/{category}/proposals/{weekKey}` 공급
- **경로**: [content-research-pipeline/](./content-research-pipeline/)

**문서**
- [Plan](./content-research-pipeline/content-research-pipeline.plan.md) (Plan Plus, T1/T2/T3 법적 티어 분리)
- [Design](./content-research-pipeline/content-research-pipeline.design.md) (v0.1, LLM Vertex→AI Studio 전환)
- [Analysis](./content-research-pipeline/content-research-pipeline.analysis.md)
- [Report](./content-research-pipeline/content-research-pipeline.report.md)

**핵심 결정**
- Firebase Functions 2nd gen + Cloud Scheduler (매주 월 09:00 KST, Asia/Seoul, 1GiB, 60min)
- 3 adapters (Naver Search API + Tistory RSS + WordPress RSS) — 모두 T1 안전 티어
- 4 analyzers (section structure + tone + CTA + keyword TF-IDF hybrid)
- LLM hybrid: 로컬 TF-IDF 상위 100 → Gemini 정제 30 (비용 최소화)
- Write-isolation: `functions/` → `src/` 임포트 0건 (쓰기 격리)
- 청결 어휘 2중 방어 (프롬프트 + post-filter)

**Follow-up 추적 (배포 전)**
- M1: onCall export명 `rerunResearchCategory` 통일
- M2: `admin-rerun.ts` 별도 파일 분리 (또는 설계 §14.1 업데이트)
- M4: 화요일 자동 재시도 Scheduled Fn (v1.1)
- M5: Gemini 기본 모델 `gemini-3-flash-preview`로 env 설정
- M6/M7/M8/M9: 설계 문서 cosmetic 정정

**운영 체크리스트**
- `firebase functions:secrets:set` 4개 (Naver id/secret, Google AI, Resend)
- Firestore TTL: `researchSources.ttlExpiresAt` 90일
- 운영자 UID에 `admin: true` custom claim
- Resend 도메인 SPF/DKIM
- Tistory/WordPress 큐레이션 피드 (운영자 PR)
- `firebase deploy --only firestore:rules,functions`

---

### promo-feed — Netflix 스타일 레일 기반 피드 (플랫폼 매체화)

- **완료일**: 2026-04-20
- **Match Rate**: 97% (Critical 0 / Major 0 / Minor 5) — 최고 점수
- **PDCA 사이클**: #3 (1회 반복, iterate 없음)
- **레벨**: Dynamic (Next.js 16 + Firebase + Gemini AI Studio)
- **방향 전환**: promo-page(랜딩 빌더) → promo-feed(피드 매체)
- **경로**: [promo-feed/](./promo-feed/)

**문서**
- [Plan](./promo-feed/promo-feed.plan.md) (Plan Plus + 웹 리서치)
- [Design](./promo-feed/promo-feed.design.md) (v0.2, design-validator 반영)
- [Analysis](./promo-feed/promo-feed.analysis.md)
- [Report](./promo-feed/promo-feed.report.md)

**핵심 결정**
- Netflix 2단 랭킹 (row + within-row) 경량 구현
- 하드코딩 태그 16개 (시간 5·동반자 6·분위기 5), 레일 11개
- 동적 시간대 레일 1개 (KST 시간별 자동) + 정적 6개
- Server shell + Client leaves (Server auth-aware → Client URL-synced)
- 청결 어휘 3중 방어를 태그 추출 파이프라인에 확장

**Follow-up 추적**
- MIN-1: `CategoryTabs` 네비 정책 통일 (Link vs router.replace)
- I1: time-context SSR→CSR swap (현 stale-within-60s 수용)
- 설계 문서 sync: §5.5 FeedControls layer, §15.1a search snippet
- v1.1: browser geolocation, admin rail UI, ARIA(horizontal scroll), 방문 통계, Kakao login, `/p/{slug}` 톤 조정

---

### promo-page — 고객용 홍보 페이지 빌더

- **완료일**: 2026-04-19
- **Match Rate**: 93% (Critical 0 / Major 1 / Minor 7)
- **PDCA 사이클**: #1 (1회 반복, iterate 없음)
- **레벨**: Dynamic (Next.js 16 + Firebase + Gemini AI Studio API)
- **경로**: [promo-page/](./promo-page/)

**문서**
- [Plan](./promo-page/promo-page.plan.md)
- [Design](./promo-page/promo-page.design.md) (v0.3)
- [Analysis](./promo-page/promo-page.analysis.md)
- [Report](./promo-page/promo-page.report.md)

**핵심 피벗**
- 2026-04-19 청소 어휘 격리 — 3중 방어 체계
- LLM 공급자: Vertex AI → Google AI Studio API
- 카카오 로그인 v1.1 이연

**Follow-up 추적 (프로덕션 배포 전)**
- MJ-1: `GET /api/health` 엔드포인트 추가
- MN-1: `initializeAppCheck` 클라이언트 초기화 (블로커)
- MN-3: `opengraph-image.tsx` 구현
- MN-7: `lib/map/naver-embed.ts` 구현
