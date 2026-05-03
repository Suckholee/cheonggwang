# Archive Index — 2026-05

## Features

### tips-schedule-editor — Tips 발행 스케줄 admin 편집 (Marketplace v1.19 · #32 · 🏆🏆🏆 98.3% · **12번 연속 single-pass · 두 자릿수 + 2 마일스톤**)

- **완료일**: 2026-05-03
- **Match Rate**: **98.3%** — Critical 0 · Major 0 · Minor 6 (모두 None impact — 문서 보강 권고만)
- **PDCA 사이클**: #32 (Plan Plus → Design v0.2 post-validator 15/15 → Do S1–S23 → Check 98.3% → Simplify F1–F4 → Report → Archive)
- **Streak**: 🏆🏆🏆 **12사이클 연속 single-pass 90s%** (cycles #21~#32). **두 자릿수 + 2 마일스톤** — cycles #27~#32 평균 **98.08%**
- **레벨**: Dynamic (Next.js 16 cacheComponents · Firebase Cloud Functions v2 · 1 신규 Firestore collection · 7번째 Option A mirror cycle · `React.cache` page-load dedup 신규 도입)
- **방향**: cycle #31 보고서 §2.6에서 명시한 후속 cycle "schedule editor Approach A (1,500 LOC)" 실행. 사용자 의도(Plan Plus Q1) "스케줄 admin 편집". **Approach A** (Wide cron `30 * * * *` + Firestore `shouldTickNow` gate) 채택 — Approach B (Cloud Scheduler API) / C (`*/15` cron) 거부. cycle #30/#31 generator·topic-pool·dynamic-topic-pool·repository 7 메서드·admin UI 본체 0줄 변경 surgical (`getConfig` 1 surgical patch만 예외 — schedule 4번째 return field, R-H5)
- **경로**: [tips-schedule-editor/](./tips-schedule-editor/)

**문서**
- [Plan](./tips-schedule-editor/tips-schedule-editor.plan.md) (Plan Plus 4 phase · Q1 스케줄 타이밍 · Q2 시각+요일 mask · Q3 Approach A 채택 · Q4 audit + 30일 캘린더 multiSelect)
- [Design](./tips-schedule-editor/tips-schedule-editor.design.md) (v0.2 · validator 2 Critical + 5 High + 5 Medium + 3 Low = 15 결의 · OQ1~OQ17)
- [Analysis](./tips-schedule-editor/tips-schedule-editor.analysis.md) (98.3% · R-* 14.5/15 · AC 11/11 · OQ 17/17 · mirror lint 18/18)
- [Report](./tips-schedule-editor/tips-schedule-editor.report.md) (21 섹션 · simplify F1~F4 포함)

**핵심 결정**
- **R15 cycle #19 generator 0줄 변경 (12번째 검증 통과)** — `partner-promo-generator.ts` 함수 시그니처 0 변경. **두 자릿수 + 2 cycle**. 12사이클 동안 architecture 누적 효과 검증
- **R1 cycle #26 auto-series runner 0줄 변경 (14번째 cycle)** — functions/auto-series/runner.ts 미접촉 (NEW-C5 `nanoid16` 로컬 복제 0줄 보존)
- **NEW-H6 :30 cron offset 영구 보존** — cron 문자열은 `30 9-17 * * *` → `30 * * * *`로 변경됐지만 `:30` invariant는 (a) cron 자체 + (b) 런타임 `shouldTickNow`(`minutes !== 30 → false`) 이중 강제. autoSeriesTick :00와 영구 offset
- **R-C1 결의 — cycle #30/#31 6 patch 보존** — cycle #31 PATCH 1·2·3·4·4b·5 모두 의미 보존. cycle #32에서 PATCH 0a (schedule gate) 삽입 + PATCH 1을 1a(fetch line 60 보존) / 1b(enabled check 이동) split (R-M5). 결과: 7 patch 구조
- **R-C2 결의 — naming asymmetry invariant** — Next.js은 repo method `tipsConfigRepository.getConfig()` (인자 없음), functions은 free function `readTipsAutoConfig(db)`. cycle #31 비대칭 패턴 그대로 보존
- **R-H3 결의 — functions 측 toKstWallClock import path** — `../auto-series/lib/window` (Next.js의 `auto-publish-window.ts`와 다른 파일명). validator reality-check 없이는 catch 불가능했을 import-path bug
- **R-H5 결의 — getConfig 1 surgical patch** — schedule 4번째 return field 추가. 다른 7 메서드(setEnabled / listTopics / getTopic / addTopic / updateTopic / setTopicActive / listHistory) 본문 0줄 변경 — cycle #31 immutability 1번째 검증
- **C-G4 결의 — `parseScheduleOrDefault` 가드** — corrupt 값(예: hour=25, daysOfWeek=[7,99])이라도 graceful fallback. 양 패키지 mirror
- **R12 (cycle #29) back-compat fallback 4번째 cycle 적용** — `tipsAutoConfig.schedule` 필드 미존재 → `DEFAULT_SCHEDULE = {hour:9, daysOfWeek:[0..6]}` 매일 09:30. 0 regression 보장
- **NEW-R23 cycle #31 패턴 강화** — 모든 종료 path tipsHistory append. cycle #32에서 7번째 status `skip-out-of-schedule` 추가. wide cron 24/일 발화 중 ~23/일이 schedule out 통계 추적 가능
- **OQ8 결의 — functions next-tick-time mirror 유지** — runner는 직접 호출 X여도 일관성 + 향후 metric/log 용도 확장 대비
- **M7 결의 (cycle #31) 재사용** — `firestore.rules` `tipsScheduleAudit` `read/write: if false` (Admin SDK only). quoteTrendKeywords 패턴 일치
- **Option A 코드 복제 7번째 사이클 (4 mirror pair)** — tips-config 확장 + schedule-gate (NEW) + next-tick-time (NEW mirror) + tips-history Status literal 7개. CI lint 16 → 18 (2 신규 + 2 갱신)

**/simplify F1~F4 phase (Report 직전 적용)**
- **F1 (Quality M1+M2 + Eff m1)**: schedule-form.tsx 단순화 — `useTransition` + `void action()` wrapper 제거 → `action={updateTipsSchedule}` 직접 binding (server action redirect/revalidate 안전 동작). `Set<number>` → `number[]` 단순화. **dirty check** 추가로 동일 schedule 재저장 시 audit noise 차단
- **F2 (Eff M1)**: `tipsConfigRepository.getConfig`을 `React.cache(...)` wrap → `/admin/tips/schedule` 페이지 로드 시 Firestore reads **3× → 1×** (CurrentScheduleCard + ScheduleFormSection + SchedulePreview30 dedup)
- **F3 (Quality m12)**: runner.ts `out-of-schedule` console.log 제거 — wide cron 24/일 발화 중 ~23/일 noise 회피 (history append만 유지, NEW-R23 추적 가능)
- **F4 (Reuse M2)**: `normalizeDaysOfWeek(dows)` helper 추출 — 양 패키지 mirror에서 4곳 사용 (setSchedule / parseScheduleOrDefault Next.js + functions)

**12-streak 마일스톤 (cycles #21~#32 평균 #27~#32 = 98.08%)**:
- cycle #21 (auto-publish-window) ~ cycle #32 (tips-schedule-editor) 누적 **12 single-pass 통과** — 0 Act iteration
- design-validator가 cycle #32에서 15 issue 발견 (2 Critical + 5 High + 5 Medium + 3 Low). 그중 **R-C1 (5 patch vs 6 patch 표기 오류) + R-C2 (functions/Next.js 명명 비대칭) + R-H3 (`window.ts` vs `auto-publish-window.ts` 파일명 차이) + R-H5 (getConfig 0줄 주장과 schedule field 추가 충돌) + R-M5 (PATCH 1을 1a/1b split 명시)** 5건은 reality-check 없이는 functional/typecheck-time bug로 발견됐을 issue. Design v0.1 → v0.2 결의 매트릭스가 ~150 LOC rework 사전 방지
- **R15 invariant 12사이클 연속** — 두 자릿수 + 2 milestone. 12 cycles 동안 partner-promo-generator.ts library처럼 보존
- **/simplify phase가 11 cycles 동안의 quality drift 차단** — F1 (`useTransition` mis-use), F2 (`React.cache` 미적용 over-fetch), F3 (production log noise), F4 (mirror DRY) 모두 cycle 내에서 catch
- 통합 검증: pnpm exec tsc(2 packages) + pnpm build full prerender (`/admin/tips/schedule` PPR ◐) + pnpm test:tips 32/32 (cycle #30 8 + cycle #32 24) + pnpm lint:mirror 18/18

---

(이전 cycles는 [docs/archive/2026-04/_INDEX.md](../2026-04/_INDEX.md) 참조)
