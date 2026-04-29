# tips-admin-config · Plan (cycle #31 v1.18)

> Plan Plus 4-phase output (cleaning-tips-content cycle #30 다음 cycle).
> Generated: 2026-04-28
> Streak target: **11번째 consecutive single-pass ≥ 90% Match Rate**.

---

## §1. User Intent Discovery (Phase 1)

### 1.1 Core Problem

cycle #30에서 cleaning-tips-content 자동 발행 시스템이 production 배포됐지만 admin이 **운영 자율성 일체** 없이 모든 설정이 코드에 hardcoded:
- ON/OFF 토글 X — 비상시 cron 중단 불가능
- Topic pool (30개) hardcoded — 운영팀이 새 주제 추가하려면 dev 작업 필요
- Schedule (`30 9-17 * * *`) admin이 못 바꿈 — read-only로 표시만 필요
- 발행 history admin이 못 봄 — 어제 어떤 주제 발행됐는지/실패했는지 추적 불가능

사용자 트리거: 사용자가 cycle #30 archive 후 "/admin/tips에 자동 설정이 없어"라고 지적 — 운영팀이 cron을 통제할 수 있어야 함.

### 1.2 Target Users

- **Primary**: 청광 admin (운영팀, 컨텐츠 매니저).
- **Secondary 영향**: tipsTick cron runtime — Firestore config 추가 read 1건/tick (~10ms 추가 latency).
- **End user 영향**: 0 (community/tips 패널 동작은 그대로).

### 1.3 Success Criteria

V1 시점:
- Admin이 `/admin/tips` 한 페이지에서 ON/OFF 토글로 자동 발행 즉시 정지/재개 가능
- Admin이 `/admin/tips/topics`에서 topic 추가/제거/active 토글/시즌 변경
- Admin이 다음 발행 예정 시각을 한눈에 확인 (예: "14:30 KST")
- Admin이 최근 10건 tipsTick 결과(success/skip/fail 사유) 확인
- 기존 cycle #30 동작 0 regression — Firestore config 미존재 시 fallback으로 cycle #30 그대로

---

## §2. Alternatives Explored (Phase 2)

### Approach A: Firestore + Cloud Scheduler API (rejected)
- 모든 설정 admin 편집 가능 (schedule 포함)
- Pros: 완전 자율성. Cons: Cloud Scheduler API + zod + ~1,500 LOC. 11-streak 가장 큰 scope, single-pass 부담.

### Approach B: Firestore + 코드 schedule (✅ Selected)
- ON/OFF + topic pool admin 편집. Schedule은 코드 + admin UI read-only.
- Pros: 700~1,650 LOC. functions deploy 0 for daily ops. R15 11번째 무수정 안전.
- Cons: schedule 변경은 dev 작업 필요 (빈도 낮으니 trade-off 수용).

### Approach C: ON/OFF 토글만 (rejected)
- 가장 작음 (~200 LOC) but 사용자 의도 (운영 자율성 일체)와 mismatch — topic pool 편집 X.

---

## §3. YAGNI Review (Phase 3)

### Included in V1 (모두 사용자 multiSelect 선택)

| ID | Item | 사용자 의도 |
|---|---|---|
| **S2** | 자동 발행 ON/OFF Firestore toggle | 1순위 — 비상시 즉시 중단 |
| **S4+S5** | Topic pool CRUD (Firestore collection + isActive 토글) | 2순위 — 새 주제 dev 의존성 제거 |
| **S7** | Schedule read-only + 다음 예정 시각 표시 | Approach B 약속 — admin이 "어제 안 나온 이유 = 17:30 이후 cron 미발화" 즉시 이해 |
| **S8** | tipsHistory subcollection + 최근 10건 표시 | cycle #30 deferred 항목. 발행 추적 — 운영 가시성 |

### Deferred to cycle #32+

| ID | Item | 이유 |
|---|---|---|
| S3 | dailyLimit 1→2/3 변경 | 사용자 V1 multiSelect 미선택. cycle #32+ 검토 |
| Schedule editor | cron pattern admin 편집 | Approach B에서 의도적 제외 (Approach A는 큰 cycle) |
| Topic CRUD audit log | 누가 언제 무슨 topic 변경 | 작은 운영팀 — YAGNI |
| Topic 삭제 (hard delete) | isActive=false soft delete로 대체 | 데이터 손실 방지 — soft delete 충분 |
| `/admin/tips/topics/[topicId]/history` | 특정 topic이 발행된 history 필터 | 전체 tipsHistory에서 필터 가능 — 별도 페이지 불필요 |

### Permanent rejection

- AI prompt 자체 admin 편집 — 안전성 + brand voice 일관성 (R6 cycle #19 patterns에 근거)
- 사용자 UGC topic 제안 — 운영진 톤 보존 (cycle #30 G1 결의)
- card-news format 자동 발행 — cycle #30 R18 (tip format='blog'만)

---

## §4. Selected Approach: Firestore + 코드 schedule (B)

### 4.1 Architecture (Phase 4 Step 1)

```
[Firestore — 3 신규 영역]
system/tipsAutoConfig (single doc)
  ├─ enabled: boolean (default: true)        ← S2
  ├─ updatedAt, updatedBy

tipsTopicPool/{topicId} (collection 신규)    ← S4+S5
  ├─ label, category, season, intent, photoless
  ├─ isActive: boolean (default: true)
  ├─ order: number (sort key — Date.now() 기반)
  ├─ createdAt, updatedAt, createdBy

tipsHistory/{tickId} (collection 신규)       ← S8
  ├─ at: serverTimestamp
  ├─ status: 'published-draft' | 'skip-disabled' | 'skip-already-today'
              | 'skip-no-topic' | 'compose-fail' | 'hygiene-fail'
  ├─ topicId, postId, postSlug, hygieneScore, reason
```

### 4.2 Back-compat (R12 cycle #29 패턴 재사용)

- `tipsAutoConfig` doc 미존재 → `enabled: true` fallback (cycle #30 동작 유지)
- `tipsTopicPool` 빈 collection → static `TIPS_TOPIC_POOL` 사용 (cycle #30 30개 그대로)
- `tipsHistory` 새 시작 — 기존 데이터 없음

### 4.3 Functions runner 변경 (5 surgical 추가)

`functions/src/tips/runner.ts` (cycle #30 파일):
1. 시작 부분에 config read + enabled gate (없으면 skip-disabled)
2. 일일 1건 제한 가지에 `tipsHistory.append({status: "skip-already-today"})`
3. topic 선택 시 dynamic-topic-pool helper 호출 (Firestore 우선 + static fallback)
4. compose/hygiene/no-topic 각 종료 path에 history append
5. 성공 path에 history append { status: "published-draft" }

### 4.4 Next.js admin UI

`/admin/tips` (page.tsx) — 기존 cycle #30 dashboard에 4 sections 추가:
- AutoConfigToggle (S2 — client component, server action 호출)
- ScheduleInfo (S7 — server, next-tick-time 계산)
- HistoryTable (S8 — server, tipsConfigRepository.listHistory)
- TopicsLink (`/admin/tips/topics` 진입 버튼)

`/admin/tips/topics` (NEW) — topic 목록 + isActive 토글 + new 진입 + edit 진입
`/admin/tips/topics/new` (NEW) — 신규 topic 추가 form
`/admin/tips/topics/[topicId]` (NEW) — 기존 topic 편집 form

---

## §5. Component Inventory (Phase 4 Step 2)

### 5.1 신규 파일 (15개)

| # | 파일 | 역할 | LOC |
|---|---|---|---:|
| 1 | `src/lib/tips/tips-config.ts` | TipsAutoConfig type + DEFAULT + zod | 60 |
| 2 | `src/lib/tips/dynamic-topic-pool.ts` | Firestore pool fetch + static fallback (Next.js side) | 100 |
| 3 | `src/lib/tips/next-tick-time.ts` | cron `30 9-17 * * *` → 다음 발화 KST 시각 | 70 |
| 4 | `src/lib/tips/next-tick-time.test.ts` | 4 cases (정시 전/후, 17:30 후, 09:30 전) | 80 |
| 5 | `src/lib/firebase/tips-config-repository.ts` | get/upsertConfig + topic CRUD + listHistory + cache | 200 |
| 6 | `src/components/admin/AdminTipsAutoConfigToggle.tsx` | client S2 toggle | 80 |
| 7 | `src/components/admin/AdminTipsHistoryTable.tsx` | server S8 history table | 70 |
| 8 | `src/components/admin/AdminTipsTopicForm.tsx` | client S4 form (zod + react-hook-form) | 200 |
| 9 | `src/app/admin/tips/topics/page.tsx` | Topic 목록 (server) + active 토글 | 250 |
| 10 | `src/app/admin/tips/topics/new/page.tsx` | 신규 topic form 페이지 | 60 |
| 11 | `src/app/admin/tips/topics/[topicId]/page.tsx` | topic 편집 form 페이지 | 80 |
| 12 | `src/app/actions/admin-tips-config-actions.ts` | toggleEnabled + addTopic + updateTopic + setTopicActive | 200 |
| 13 | `functions/src/tips/lib/tips-config.ts` | mirror — config read at runtime | 50 |
| 14 | `functions/src/tips/lib/dynamic-topic-pool.ts` | mirror — Firestore topic pool fetch | 80 |
| 15 | `functions/src/tips/lib/tips-history.ts` | tipsHistory append helper | 80 |

### 5.2 수정 파일 (6개)

| 파일 | 변경 |
|---|---|
| `src/app/admin/tips/page.tsx` | Toggle + Schedule + History sections 추가 |
| `functions/src/tips/runner.ts` | config gate + dynamic pool + history append (5 path) |
| `firestore.indexes.json` | `tipsTopicPool (isActive ASC, order ASC)` + `tipsHistory (at DESC)` |
| `firestore.rules` | tipsAutoConfig + tipsTopicPool + tipsHistory admin-only write 규칙 |
| `scripts/check-queue-mirror.mjs` | 13 → 15 (tips-config + dynamic-topic-pool 양 패키지 검증) |
| `package.json` | `pnpm test:tips` 확장 — next-tick-time.test 포함 |

**총합 예상**: ~1,650 LOC. cycle #30 다음 큰 scope (10-streak 시 가장 큰 cycle 처리 검증 완료한 후 11-streak 도전).

---

## §6. Data Flow (Phase 4 Step 3)

### Flow A — Cron 자동 발행 (Functions runner)

```
tipsTick 발화 (매 시각 :30 KST)
  ↓
runTipsTick(now)
  ├─ adminDb.system.tipsAutoConfig.get()
  │   └─ enabled === false ? → tipsHistory.append({status:"skip-disabled"}) → return
  ├─ 일일 1건 제한 (KST today)
  │   └─ exists ? → tipsHistory.append({status:"skip-already-today"}) → return
  ├─ RAG anti-drift (recent 20 titles)
  ├─ Dynamic topic pool fetch
  │   ├─ tipsTopicPool.where(isActive==true).limit(50)
  │   ├─ 빈 collection ? → static TIPS_TOPIC_POOL fallback (cycle #30)
  │   └─ pickNextTopic({ recentTitles, seasonNow })
  │       └─ null ? → tipsHistory.append({status:"skip-no-topic"}) → return
  ├─ composeTipDraft → throw ? → history append "compose-fail" → return
  ├─ hygiene check → fail ? → history append "hygiene-fail" → return
  └─ posts.create({...draft}) → history append "published-draft"
```

### Flow B — Admin Topic CRUD (Next.js)

```
/admin/tips/topics/new submit
  → admin-tips-config-actions.addTopic(formData)
    ├─ requireAdminApi()
    ├─ zod validate
    ├─ tipsConfigRepository.addTopic({ ..., isActive:true, order: Date.now() })
    └─ revalidatePath("/admin/tips/topics") → redirect

/admin/tips/topics/[id] edit submit
  → admin-tips-config-actions.updateTopic(topicId, formData)
    ├─ requireAdminApi()
    ├─ zod validate
    └─ tipsConfigRepository.updateTopic(topicId, partial)

/admin/tips/topics row toggle
  → admin-tips-config-actions.setTopicActive(topicId, value)
    └─ tipsTopicPool.doc(topicId).update({ isActive:value })
```

### Flow C — Admin S2 Toggle

```
/admin/tips Toggle component
  → admin-tips-config-actions.toggleAutoEnabled(value)
    ├─ requireAdminApi()
    ├─ system.tipsAutoConfig.set({ enabled:value, updatedAt, updatedBy }, {merge:true})
    └─ revalidatePath("/admin/tips")
```

### Flow D — Schedule read-only (S7)

```
calculateNextTickTime(now) — cycle #28 toKstWallClock 재사용
  ├─ KST hours < 9 → today 09:30
  ├─ < 17 && minutes < 30 → today HH:30
  ├─ < 17 → today (HH+1):30
  ├─ == 17 && minutes < 30 → today 17:30
  └─ else → 다음날 09:30

display:
  "schedule: `30 9-17 * * *` Asia/Seoul (read-only)"
  "다음 발행 예정: 2026-04-29 (수) 09:30 KST"
```

### Flow E — History 조회 (S8)

```
AdminTipsHistoryTable (server)
  → tipsConfigRepository.listHistory(10)
    └─ tipsHistory.orderBy("at", "desc").limit(10).get()

table:
  | 시각 | 상태 | topic | post | hygiene |
  | 14:30 | published-draft | 욕실 곰팡이 | preview | 0.95 |
  | 13:30 | skip-already-today | — | — | — |
  | 12:30 | hygiene-fail | 주방 후드 | — | 0.55 |
```

---

## §7. Critical Invariants (R series)

| ID | Invariant | Status |
|---|---|---|
| **R15** | `partner-promo-generator.ts` 0줄 변경 | **11번째 cycle 도전** |
| **R1** | `functions/src/auto-series/runner.ts` 0줄 변경 | 13번째 cycle 도전 |
| **R12** | back-compat fallback (config 미존재 시 cycle #30 동작) | **NEW-R23** 도입 |
| **R14** | tipsTick AI footer scope (cycle #29) | 영향 없음 |
| **R16** | tip post 항상 'draft' 시작 | 그대로 |
| **R17** | tip isAutoSeries=false 명시 | 그대로 |
| **R18** | tip format='blog'만 | 그대로 |
| **R19** | cron offset (autoSeriesTick :00 ↔ tipsTick :30) | 그대로 |
| **R20** | toPost export | 그대로 |
| **NEW-R23** | 모든 runTipsTick 종료 path는 tipsHistory 1건 append (skip/error/success) | **신규** |
| **NEW-R24** | dynamic topic pool은 Firestore 우선 + static fallback (configure 실수 방어) | **신규** |
| **Option A** | 코드 복제 6번째 cycle (tips-config + dynamic-topic-pool 양 패키지) | mirror 검증 13 → 15 |

---

## §8. Implementation Order (S1–S16, Design 단계에서 확정)

대략 흐름:
- S1~S5: lib/tips/* 신규 (config, dynamic-pool, next-tick-time + test)
- S6: tips-config-repository (Next.js firebase access)
- S7~S9: admin UI components (Toggle, HistoryTable, TopicForm)
- S10~S13: admin/tips/topics/* 페이지 + admin-tips-config-actions
- S14~S15: functions/tips/runner.ts 수정 + functions/tips/lib/* mirror
- S16: firestore.indexes + firestore.rules + lint:mirror 13→15 + 통합 검증

---

## §9. Risk Table

| Risk | Mitigation | Severity |
|---|---|:---:|
| Firestore config missing → cron 무한 skip | back-compat fallback `enabled: true` | L |
| Topic pool 빈 collection → cron skip-no-topic 영구 | back-compat → static fallback (cycle #30) | L |
| tipsHistory 무한 증가 → Firestore 비용 증가 | listHistory limit(10) UI에서. cycle #32+ TTL/cleanup 검토 | M |
| Topic CRUD race (admin 편집 중 cron 발화) | Firestore atomic write — race 안전 | L |
| isActive=false topic을 admin이 실수로 모두 비활성화 → 영구 skip-no-topic | UI에서 active count 표시 + 마지막 1개 비활성화 시 경고 (deferred to design) | M |
| schedule 변경 안내 무시 → admin이 hardcoded schedule 모름 | UI label 강조 + tooltip with sample dev 요청 텍스트 | L |
| AI footer 영향 (cycle #29 R14) | 영향 없음 — partner-promo postType만 footer (tip 미적용 cycle #29 결의 그대로) | L |

---

## §10. Open Questions (Design 단계에서 결의 예정)

| ID | Question | Tentative |
|----|---|---|
| OQ1 | tipsTopicPool migration script — 기존 30 static topic을 Firestore에 import? | NO — back-compat fallback으로 충분. Admin이 필요한 것만 수동 추가 |
| OQ2 | tipsHistory TTL 정책? | NO V1 — cycle #32+ retention policy 검토 |
| OQ3 | Topic CRUD revalidatePath scope (`/admin/tips/topics`만 vs `/community/tips`까지)? | `/admin/tips/topics`만 — cron이 다음 tick에 반영. /community/tips revalidate은 publish 토글 시점만 |
| OQ4 | functions runner config read 빈도 — 매 tick fetch vs 캐시? | 매 tick fetch (config 변경 즉시 반영, 비용 무시) |
| OQ5 | Topic edit history (cycle #32+)? | NO V1 — `updatedAt` 1 field만 기록, 누구·뭐 변경은 audit log 별도 cycle에서 |
| OQ6 | Topic order 변경 (drag-and-drop)? | NO V1 — `order: Date.now()` 단순 timestamp. cycle #32+ explicit reorder UI 검토 |
| OQ7 | enabled=false 시 cron이 발화는 하되 즉시 return — Cloud Scheduler 비용 발생? | YES but minimal (Cloud Scheduler 무료 tier 한도 안). 비용 우려 시 cycle #32 schedule editor 검토 |
| OQ8 | Schedule 표시 timezone — KST 고정 vs 사용자 timezone? | KST 고정 (운영팀 한국 기준) |

---

## §11. Streak Context

cycles #21~#30 모두 ≥ 90% Match Rate single-pass. cycle #30 = 98.5% (10-streak 마일스톤 달성).

cycle #31 = **11-streak 도전**:
- cycle #30과 비슷한 scope (~1,650 LOC, 21 files)
- Firestore schema 도입 + 6 mirror 파일 + admin CRUD UI — multi-domain
- R15 invariant 11번째 cycle 무수정 (architecture 누적 효과 두 자리수 + 1)
- back-compat fallback 패턴 (R12 cycle #29 재사용) 검증

---

## §12. Next Step

```
/pdca design tips-admin-config
```

Design 단계에서 OQ1~OQ8 결의 + S1~S16 implementation order 확정 + design-validator reality-check.
