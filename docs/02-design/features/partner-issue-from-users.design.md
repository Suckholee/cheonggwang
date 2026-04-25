# Design · partner-issue-from-users

> **Status**: v0.2 (design-validator 응답 반영 — Critical 5 + High 8 + Medium 7 + Low 5 모두 결의)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.10
> **Author**: Seokho Lee
> **Date**: 2026-04-26
> **PDCA Cycle**: #22
> **Plan Source**: `docs/01-plan/features/partner-issue-from-users.plan.md` (v1.0 Plan Plus)

---

## 0. Plan vs Design Reconciliation (R1–R6)

| ID | Plan Invariant | Design 반영 |
|----|----------------|-------------|
| R1 | cycle #20·#21 발급 API 변경 0건 | §5.2·§5.3 — POST `/api/admin/partners`, POST `/api/admin/partners/applicants/[id]/approve` 모두 그대로 호출. design 문서 내 API 계약 변경 0건 |
| R2 | 신청자 모달 = read-only preview | §6.4 — `<IssueModal kind="approve">`는 input 대신 dl/dt 정보 카드 + [승인]·[취소] 버튼만. cycle #21 approve route는 body 없이 호출 |
| R3 | listClientsPage 안에서 partners·applicants 한 번씩만 fetch | §5.1 — server action 내부에서 `Promise.all([userRepository.listClientsPage, partnerRepository.listAll, partnerApplicantRepository.listPending])` 후 in-memory join. **request-scope 캐시 없음** — 페이지 이동·정렬·dateRange 변경마다 partners·applicants 다시 fetch. v1 회원 수 가정상 비용 미미 (partners ≤ 수백, applicants pending ≤ 수십). v2에 React `cache()` 도입 검토 |
| R4 | cursor = base64(`${createdAtMs}:${uid}`) | §5.1 — `encodeCursor(createdAt, uid)` / `decodeCursor(token)` 헬퍼. 정렬 모드별 인코딩 분기 (sort='name'은 `${displayName}:${uid}`) |
| R5 | dateRange 활성 시 sort='latest' 강제 | §5.1 — server action input zod schema의 superRefine로 검증. UI에서도 dateRange 켜면 sort 토글 disabled |
| R6 | 발급 직후 router.refresh() **+ setReloadTick** (둘 다, OQ6 결의) | §6.5 — IssueModal onSuccess 콜백에서 `router.refresh()` + `setReloadTick(n => n+1)` + `setOpen(false)`. router.refresh()는 server component 재실행, setReloadTick은 client useEffect 강제 재실행 (server data + client cache 양쪽 갱신, R6 강화). H2 결의: Plan §7 R6의 단순 router.refresh()가 IssuanceConsole의 client component에 도달 안 할 가능성 보강 |

---

## 1. File Inventory

### 1.1 신규 파일 (6)

| # | 경로 | 역할 | 의존 |
|---|------|------|------|
| 1 | `src/types/admin-issuance.ts` | `ClientWithIssuanceStatus` 타입 + cursor 인코딩 헬퍼 | UserProfile, PartnerApplicantStatus |
| 2 | `src/app/actions/partner-issuance-actions.ts` | server action `listClientsPage`, `listPendingApplicantsForIssuance` | userRepository, partnerRepository, partnerApplicantRepository, requireAdminApi |
| 3 | `src/components/admin/IssuanceConsole.tsx` | 3-탭 토글 + 모달 상태 관리 (client) | ClientUsersPanel, PendingApplicantsPanel, EmailLookupFallbackPanel, IssueModal |
| 4 | `src/components/admin/ClientUsersPanel.tsx` | 회원 카드 그리드 + 페이징·정렬·dateRange (client) | listClientsPage server action, IssueModal 트리거 콜백 |
| 5 | `src/components/admin/PendingApplicantsPanel.tsx` | 신청자 카드 그리드 (client) | listPendingApplicantsForIssuance server action, IssueModal 트리거 콜백 |
| 6 | `src/components/admin/IssueModal.tsx` | 발급 모달, kind='fresh' \| 'approve' 분기 (client) | QUOTE_CATEGORIES, fetch POST API |

### 1.2 수정 파일 (3)

| 경로 | 변경 |
|------|------|
| `src/lib/firebase/user-repository.ts` | `listClientsPage(input)` 메서드 추가 (server-only). 단일 page fetch + cursor 디코드 + sort/dateRange 분기 |
| `src/app/admin/partners/new/page.tsx` | 기존 `<PartnerIssueForm />` → `<IssuanceConsole />`로 교체. Suspense + connection() 패턴 유지 |
| `src/components/admin/PartnerIssueForm.tsx` | 코드 변경 없음 — IssuanceConsole의 폴백 탭에서 `<PartnerIssueForm />` 그대로 임포트 (외부 wrapper만 추가) |

### 1.3 재활용 (변경 없음, R1)

- `partnerRepository.listAll(limit)` ← cycle #20
- `partnerApplicantRepository.listPending(limit)` ← cycle #21
- `partnerRepository.getByOwnerUid(uid)` ← cycle #19
- `partnerApplicantRepository.getByOwnerUid(uid)` ← cycle #21
- `POST /api/admin/partners` ← cycle #20 (issueSchema 그대로)
- `POST /api/admin/partners/applicants/[applicantId]/approve` ← cycle #21 (body 없음)

### 1.4 환경 변수
없음. 기존 ADMIN_USERNAME·ADMIN_PASSWORD_BCRYPT·ADMIN_SESSION_SECRET (cycle #20) 그대로.

### 1.5 의존성
없음. 기존 zod, firebase-admin, lucide-react 그대로 사용. **M6: lucide-react는 cycle #20 PartnerIssueForm·StatsWidgets·AdminBottomBar 등에서 이미 사용 중 (검증됨)** — `BadgeCheck`·`Clock`·`X` 등 신규 아이콘만 import.

### 1.6 Firestore 인덱스 (C5 결의: composite 3건 사전 명시)

`firestore.indexes.json`에 3건 신규 추가. roles array-contains는 모든 쿼리에 첫 필터로 들어가므로 single-field 자동 인덱스로 처리 안 됨 → composite 필수.

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" },
    { "fieldPath": "__name__", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "roles", "arrayConfig": "CONTAINS" },
    { "fieldPath": "displayName", "order": "ASCENDING" },
    { "fieldPath": "__name__", "order": "ASCENDING" }
  ]
}
```

> 3번째 조합(roles + createdAt range + orderBy createdAt + __name__)은 첫번째 인덱스로 충당 가능 (range·orderBy 같은 필드).

S5 단계: `firebase deploy --only firestore:indexes` 후 콘솔 모니터링. 추가 인덱스 요구 시 indexes.json 재갱신.

---

## 2. Data Model

### 2.1 `ClientWithIssuanceStatus` (`src/types/admin-issuance.ts`)

```ts
import type { UserProfile } from "@/types/page";
import type { PartnerApplicantStatus } from "@/types/partner-applicant";

/**
 * v1.10 partner-issue-from-users — 회원 명단 카드용 데이터.
 * UserProfile + 발급/신청 상태 플래그.
 */
export interface ClientWithIssuanceStatus {
  user: UserProfile;
  /** 이미 partner 발급된 사용자라면 partnerId, 아니면 null */
  partnerId: string | null;
  /** pending applicant 상태이면 'pending', 아니면 null */
  applicantStatus: PartnerApplicantStatus | null;
}

export type ClientSortMode = "latest" | "name";

export interface ClientDateRange {
  /** ISO YYYY-MM-DD (inclusive) */
  fromYmd: string;
  toYmd: string;
}

export interface ListClientsPageInput {
  cursor: string | null;
  sort: ClientSortMode;
  dateRange: ClientDateRange | null;
}

export interface ListClientsPageResult {
  items: ClientWithIssuanceStatus[];
  nextCursor: string | null;
  hasMore: boolean;
  totalApprox: number | null; // count() 비용 회피 — null일 수도
}
```

### 2.2 Cursor encoding (`src/types/admin-issuance.ts`)

```ts
/**
 * Cursor 형식:
 *   sort='latest': base64(`${createdAtMs}:${uid}`)
 *   sort='name':   base64(`${displayName}:${uid}`)
 *
 * 디코드 시 sort 모드와 일치하지 않으면 null 반환 (cursor 무효화 → 페이지 1).
 *
 * H1 결의: displayName에 콜론 포함 시 lastIndexOf(":")가 마지막 콜론을 split point로 사용 (uid는 firestore doc ID라 콜론 없음 보장 — Firebase Auth UID는 alphanumeric).
 * H1 결의: displayName이 빈 문자열일 때도 idx=0이 valid한 split point — 따라서 `if (idx < 0)` 으로 변경 (idx === 0은 displayName="" + uid="abc" 케이스를 valid로 인정).
 */
export function encodeCursor(
  sort: ClientSortMode,
  lastDoc: { createdAt: Date; uid: string; displayName: string },
): string {
  const payload =
    sort === "latest"
      ? `${lastDoc.createdAt.getTime()}:${lastDoc.uid}`
      : `${lastDoc.displayName}:${lastDoc.uid}`;
  return Buffer.from(payload, "utf-8").toString("base64");
}

export function decodeCursor(
  sort: ClientSortMode,
  token: string | null,
): { primary: string | number; uid: string } | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const idx = raw.lastIndexOf(":");
    if (idx < 0) return null; // H1: idx === 0은 빈 displayName + uid 케이스로 valid
    const primary = raw.slice(0, idx);
    const uid = raw.slice(idx + 1);
    if (!uid) return null;
    return {
      primary: sort === "latest" ? Number(primary) : primary,
      uid,
    };
  } catch {
    return null;
  }
}
```

### 2.3 Page size & limits

| 항목 | 값 | 이유 |
|------|-----|------|
| Page size | 20 | UX (모바일·데스크탑 한 화면) + Firestore 비용 |
| Cursor query limit | 21 | hasMore 판별용 1건 더 fetch |
| `partnerRepository.listAll` limit | 200 | cycle #20 default 그대로 |
| `partnerApplicantRepository.listPending` limit | 100 | cycle #21 default 그대로. **H3 가드레일**: pending applicants 100건 초과 시 일부 applicant가 ⏳ 배지 누락 → 운영자가 발급 시도 시 cycle #20 ALREADY_REGISTERED는 partners 검사이므로 차단 안 됨. v1 회원 수 가정상 미발생, OQ8에 v2 페이지네이션 검토 명시 |
| dateRange 최대 폭 | 무제한 | v1 단순화. v2에서 1년 제한 검토 |

---

## 3. UI States Matrix

| 패널 | 상태 | UI |
|-----|------|----|
| 전체 명단 | loading | 카드 그리드 4×n skeleton |
| 전체 명단 | empty (no clients) | "아직 가입한 회원이 없습니다. 명단에 없는 사용자는 [이메일 검색] 탭을 사용하세요." (M2 톤 일관화: 현재 상태 + 다음 액션) |
| 전체 명단 | loaded | 카드 그리드 + 페이징 + 정렬·dateRange 컨트롤 |
| 전체 명단 | error | "명단을 불러오지 못했습니다" + 재시도 버튼 |
| 신청자 명단 | loading | 카드 그리드 skeleton |
| 신청자 명단 | empty | "대기 중인 신청이 없습니다" |
| 신청자 명단 | loaded | 카드 그리드 (매장명·카테고리·지역 preview) |
| 이메일 검색 | always | `<PartnerIssueForm />` 그대로 (cycle #20 검증 흐름) |

카드 자체 상태:
- `idle` (활성, 클릭 가능)
- `disabled-partner` ✅ 배지 (이미 발급)
- `disabled-applicant` ⏳ 배지 (검토 중)
- `loading` (모달 열림 중 — 이중 클릭 방지)

---

## 4. Server Actions (`src/app/actions/partner-issuance-actions.ts`)

### 4.1 입력 zod schemas

```ts
const dateRangeSchema = z
  .object({
    fromYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toYmd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((d) => d.fromYmd <= d.toYmd, "fromYmd > toYmd");

const listClientsPageSchema = z
  .object({
    cursor: z.string().min(1).nullable(), // H6: 빈 문자열 차단 (null 또는 non-empty string)
    sort: z.enum(["latest", "name"]),
    dateRange: dateRangeSchema.nullable(),
  })
  .superRefine((v, ctx) => {
    // R5: dateRange 활성 시 sort='latest' 강제
    if (v.dateRange && v.sort !== "latest") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sort"],
        message: "dateRange 활성 시 sort='latest' 강제 (R5)",
      });
    }
  });
```

### 4.2 `listClientsPage`

```ts
"use server";

export async function listClientsPage(
  input: ListClientsPageInput,
): Promise<ListClientsPageResult> {
  // C1 fix: requireAdminApi(): Promise<void> — 반환값 없음. 인증만 확인.
  await requireAdminApi();

  const parsed = listClientsPageSchema.parse(input);

  // 1) 회원 1페이지 fetch (limit 21 — hasMore 판별)
  const usersPage = await userRepository.listClientsPage({
    cursor: parsed.cursor,
    sort: parsed.sort,
    dateRange: parsed.dateRange,
    pageSize: 21,
  });

  // 2) 병렬: partners·applicants 전체 (≤ 수백 가정)
  const [partners, applicants] = await Promise.all([
    partnerRepository.listAll(200),
    partnerApplicantRepository.listPending(100),
  ]);

  // 3) uid → 상태 map
  const partnerMap = new Map(partners.map((p) => [p.ownerUid, p.id]));
  const applicantMap = new Map(applicants.map((a) => [a.ownerUid, a.status]));

  // 4) hasMore 판별 + 머지
  const hasMore = usersPage.docs.length > 20;
  const items = usersPage.docs.slice(0, 20).map((u) => ({
    user: u,
    partnerId: partnerMap.get(u.uid) ?? null,
    applicantStatus: applicantMap.get(u.uid) ?? null,
  }));

  // 5) nextCursor
  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(parsed.sort, items[items.length - 1].user)
      : null;

  return { items, nextCursor, hasMore, totalApprox: null };
}
```

### 4.3 `listPendingApplicantsForIssuance`

```ts
"use server";

export async function listPendingApplicantsForIssuance(): Promise<PartnerApplicant[]> {
  await requireAdminApi();
  return partnerApplicantRepository.listPending(100);
}
```

cycle #21 listPending 그대로 노출. (server action 단순 wrapper)

### 4.4 오류 케이스

| 케이스 | 처리 |
|--------|------|
| admin 미인증 | requireAdminApi → AppError UNAUTHENTICATED throw → 클라이언트 fetch에서 catch 후 `/admin/login` redirect (router.push) |
| zod parse 실패 | VALIDATION_ERROR throw |
| firestore network error | Promise.all 실패 → server action 자체가 throw → 클라이언트 try/catch + 에러 상태 표시 |
| dateRange + sort='name' 동시 | R5 superRefine 차단 (UI에서도 disabled) |
| `listPendingApplicantsForIssuance` admin 미인증 | requireAdminApi → AppError UNAUTHENTICATED throw → 클라이언트 catch 후 `/admin/login` redirect (listClientsPage와 동일) |
| `listPendingApplicantsForIssuance` firestore 오류 | server action throw → 클라이언트 try/catch + 신청자 패널 에러 상태 |

---

## 5. Repository — `userRepository.listClientsPage`

### 5.1 메서드 시그니처

```ts
async listClientsPage(input: {
  cursor: string | null;
  sort: ClientSortMode;
  dateRange: ClientDateRange | null;
  pageSize: number;
}): Promise<{ docs: UserProfile[] }>;
```

### 5.2 쿼리 빌드

```ts
let q = adminDb
  .collection("users")
  .where("roles", "array-contains", "client");

// dateRange (R5: dateRange 있으면 sort='latest' 강제 — server action에서 보장)
// H4: +09:00 하드코딩 — Asia/Seoul 단일 타임존 (Plan §1.4 다국어 OOS 일치). Vercel 런타임 TZ 무관.
if (input.dateRange) {
  const fromTs = Timestamp.fromDate(new Date(`${input.dateRange.fromYmd}T00:00:00+09:00`));
  const toTs = Timestamp.fromDate(new Date(`${input.dateRange.toYmd}T23:59:59.999+09:00`));
  q = q.where("createdAt", ">=", fromTs).where("createdAt", "<=", toTs);
}

// 정렬 + tiebreaker
if (input.sort === "latest") {
  q = q.orderBy("createdAt", "desc").orderBy("__name__", "desc");
} else {
  q = q.orderBy("displayName", "asc").orderBy("__name__", "asc");
}

// cursor
const decoded = decodeCursor(input.sort, input.cursor);
if (decoded) {
  q = q.startAfter(
    input.sort === "latest"
      ? Timestamp.fromMillis(decoded.primary as number)
      : (decoded.primary as string),
    decoded.uid,
  );
}

q = q.limit(input.pageSize);

const snap = await q.get();
return {
  docs: snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile)),
};
```

### 5.3 잠재 인덱스 요구

| 쿼리 조합 | 필요 인덱스 |
|-----------|------------|
| roles array-contains 'client' + orderBy createdAt desc + __name__ desc | composite (자동 추천될 가능성 높음) |
| roles array-contains 'client' + orderBy displayName asc + __name__ asc | composite |
| roles array-contains 'client' + where createdAt range + orderBy createdAt desc | composite |

> P5 단계 `firebase deploy --only firestore:indexes --dry-run` + 실제 deploy로 부족 인덱스 자동 안내. 수동으로 firestore.indexes.json 갱신.

### 5.4 array-contains 대안

`roles` 필드 자체가 빈 배열이거나 undefined인 사용자(레거시)는 array-contains에 매칭 안 됨 → 자동 제외. v1 의도와 일치 (확실히 client인 사람만 노출). 단 cycle #21에서 partner-application 가입 사용자는 server action이 `roles: FieldValue.arrayUnion("client")`로 자동 client 부여하므로 포함됨.

---

## 6. UI Wireframes

### 6.1 `/admin/partners/new` 전체 레이아웃

```
┌───────────────────────────────────────────────────────────┐
│ ← 목록으로                                                 │
│                                                           │
│ 새 의뢰업체 발급                                          │
│                                                           │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ [전체 명단]   [신청자 명단]   [이메일 검색]            │ │
│ │ ───────                                                │ │
│ │                                                       │ │
│ │  (선택된 패널 컨텐츠)                                  │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

탭 컨테이너는 `aria-tabs` 패턴: `role="tablist"`, 각 탭 `role="tab" aria-selected`, 패널 `role="tabpanel"`.

### 6.2 전체 명단 패널

```
┌────────────────────────────────────────────────────────────────┐
│ 정렬: [최신 가입순 ▼]  날짜 범위: [전체 ▼]   페이지 1            │
│                                                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ 김민수    │ │ 이지영    │ │ 박철수 ✅│ │ 정수아 ⏳│            │
│ │ a@ex.com │ │ b@ex.com │ │ c@ex.com │ │ d@ex.com │            │
│ │ 010-···   │ │ —        │ │ —        │ │ 010-···   │            │
│ │ 04-25 가입│ │ 04-24 가입│ │ 04-20 가입│ │ 04-23 가입│            │
│ └──────────┘ └──────────┘ └─disabled─┘ └─disabled─┘            │
│                                                                │
│ ┌──────────┐ ┌──────────┐ ...                                  │
│                                                                │
│      [이전]   페이지 1 / 더보기 가능   [다음]                   │
└────────────────────────────────────────────────────────────────┘
```

- 카드: `<button>` 또는 `<div role="button" tabindex="0">` — 키보드 접근성
- disabled 카드: `aria-disabled="true"`, **`tabindex="-1"` (M3: focus 안 잡힘)**, opacity-60, cursor-not-allowed, click handler early return. `<button disabled>`로 두면 자동으로 focus 제외됨
- 배지: lucide-react `BadgeCheck`(green) / `Clock`(amber) 아이콘
- contactPhone: 있을 때만 표시, 없으면 "—"
- createdAt: ko-KR localeDate ("MM-DD 가입")
- 정렬 토글: dropdown `<select>`
- 날짜 범위: 두 개 input[type="date"]. **M4 client-side guard: from > to인 경우 [적용] 버튼 disabled + 인라인 에러 텍스트 "시작일이 종료일보다 늦습니다"** (서버 zod refine과 이중 검증)
- 페이징: `[이전]` (prev cursor 스택), `[다음]` (nextCursor)

### 6.3 신청자 명단 패널

```
┌─────────────────────────────────────────────────────────┐
│ 대기 중 신청자 N건                                       │
│                                                         │
│ ┌─────────────────────┐ ┌─────────────────────┐         │
│ │ 매장명: 청담클리닝    │ │ 매장명: 깔끔홈케어    │         │
│ │ 카테고리: 정기/사무  │ │ 카테고리: 입주        │         │
│ │ 지역: 서울 강남구    │ │ 지역: 경기 고양시    │         │
│ │ 신청: 04-25 14:32   │ │ 신청: 04-25 11:08   │         │
│ │ a@example.com       │ │ b@example.com       │         │
│ │ 010-1234-5678       │ │ —                   │         │
│ └─────────────────────┘ └─────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

빈 상태: "대기 중인 신청이 없습니다. 사장님이 `/signup-partner`에서 가입하면 여기에 표시됩니다."

### 6.4 IssueModal — `kind='fresh'` (전체 명단 발급)

```
┌─────────────────────────────────────────────────┐
│ 새 의뢰업체 발급                       ✕        │
├─────────────────────────────────────────────────┤
│ 대상 회원                                        │
│   김민수 (a@example.com · 010-1234-5678)         │
│                                                 │
│ 매장명 *                                         │
│ ┌───────────────────────────────────────────┐   │
│ │                                           │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ 카테고리 (선택)                                  │
│ ┌───────────────────────────────────────────┐   │
│ │ ▾ 선택하지 않음                            │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ 지역 (선택)                                      │
│ ┌───────────────────────────────────────────┐   │
│ │                                           │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ 메모 (선택, 운영자용)                             │
│ ┌───────────────────────────────────────────┐   │
│ │                                           │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│              [취소]    [✨ 발급]                 │
└─────────────────────────────────────────────────┘
```

- 매장명 max 40자 (cycle #20 issueSchema)
- 카테고리 ENUM 6개 + "선택하지 않음" (null로 전송)
- 지역 max 60자
- 메모 max 500자
- 발급 클릭 → `fetch('/api/admin/partners', { method:'POST', body: JSON.stringify({uid, businessName, category?, regionLabel?, notes?}) })`
- 201 응답 `{ partnerId, redirectTo }` → **v1에서 응답 body 사용 안 함** (Plan OQ3 결의: 명단 복귀 default, 상세 redirect는 v2). `toast.success('발급 완료')` + `setOpen(false)` + `router.refresh()` + `setReloadTick(n => n+1)` (R6)
- 4xx 응답 → `setError(json.message)` 모달 내 에러 표시. **H5: ALREADY_REGISTERED 메시지에는 partnerId 노출** (예: "이미 partner가 발급된 uid: ... (partnerId=...)") — admin context이므로 그대로 표시 OK
- ESC 키 → 닫기. Backdrop 클릭 → 닫기. busy 중에는 모달 닫기 차단

### 6.5 IssueModal — `kind='approve'` (신청자 승인)

```
┌─────────────────────────────────────────────────┐
│ 신청 승인                              ✕        │
├─────────────────────────────────────────────────┤
│ 신청자 정보                                      │
│   매장명:    청담클리닝                          │
│   카테고리:  정기청소, 사무실청소                 │
│   지역:      서울 강남구                         │
│   신청자:    a@example.com (010-1234-5678)       │
│   신청 일시: 04-25 14:32                          │
│                                                 │
│   매장 소개:                                     │
│   ┌───────────────────────────────────────┐     │
│   │ 강남 일대 정기·사무실 청소 전문...      │     │
│   └───────────────────────────────────────┘     │
│                                                 │
│ ⓘ 정보 수정이 필요하면 신청 상세 페이지         │
│   (/admin/partners/applicants/[id])에서          │
│   거절하고 사장님이 재신청하도록 안내해주세요.    │
│                                                 │
│            [취소]    [✓ 승인하고 발급]            │
└─────────────────────────────────────────────────┘
```

- 모든 필드 read-only (R2). dl/dt 형식.
- 거절 액션은 모달에 없음 (cycle #21 `/admin/partners/applicants/[id]` 페이지에 있음). "거절" 안내 텍스트만 노출.
- 승인 클릭 → `fetch('/api/admin/partners/applicants/{id}/approve', { method:'POST' })`
- 201 응답 → toast + 모달 닫기 + `router.refresh()`
- cycle #21 reject route 변경 없음

### 6.6 EmailLookupFallbackPanel

```
┌─────────────────────────────────────────────────┐
│ 명단에 없는 사용자에게 발급                       │
│                                                 │
│ Firebase Auth에는 있지만 firestore users        │
│ 컬렉션에 없는 사용자(레거시 가입자) 또는 직접     │
│ 만든 Auth 계정에 발급할 때 사용합니다.            │
│                                                 │
│ ─────────────────────────────────────────────   │
│  <PartnerIssueForm />                           │
│  (cycle #20 컴포넌트 그대로)                     │
└─────────────────────────────────────────────────┘
```

`<PartnerIssueForm />`은 자체 폼 컨테이너를 가지고 있으므로 wrapper에서 안내 텍스트만 추가.

---

## 7. State Management (`<IssuanceConsole />`)

### 7.1 React state

```ts
type Tab = "clients" | "applicants" | "fallback";

interface ConsoleState {
  activeTab: Tab;
  // 전체 명단 패널 상태
  clientsCursor: string | null;
  clientsCursorStack: (string | null)[]; // 이전 페이지 cursor 스택
  clientsSort: ClientSortMode;
  clientsDateRange: ClientDateRange | null;
  // 모달 상태
  modal:
    | null
    | { kind: "fresh"; user: UserProfile }
    | { kind: "approve"; applicant: PartnerApplicant };
}
```

### 7.2 페이지네이션 상태 머신

- `next` 클릭 → cursorStack.push(currentCursor); cursor = nextCursor
- `prev` 클릭 → cursor = cursorStack.pop()
- 정렬 변경 → cursor=null, cursorStack=[]
- dateRange 변경 → cursor=null, cursorStack=[], sort 강제 'latest'
- 발급 성공 후 router.refresh() → 같은 cursor·sort·dateRange 유지

### 7.3 데이터 fetch

`<ClientUsersPanel />` 내부에서 `useEffect`로 cursor/sort/dateRange/reloadTick 변경 시 server action 호출. Loading state 표시.

```ts
// H7: reloadTick을 deps에 명시. 발급 성공 후 IssuanceConsole이 setReloadTick 호출 → 같은 cursor/sort로 강제 재페치.
const [data, setData] = useState<ListClientsPageResult | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
// reloadTick은 prop으로 IssuanceConsole로부터 주입 (props.reloadTick) 또는 context

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  listClientsPage({ cursor, sort, dateRange })
    .then((r) => !cancelled && setData(r))
    .catch((e) => !cancelled && setError(e.message))
    .finally(() => !cancelled && setLoading(false));
  return () => { cancelled = true; };
}, [cursor, sort, dateRange, reloadTick]); // H7: reloadTick 추가
```

### 7.4 router.refresh() 후 갱신

`router.refresh()`는 server component를 재실행하지만 client component의 useEffect는 props 변화 없으면 다시 안 실행됨. 따라서 발급 성공 시 client에서 강제로 fetch 재호출:

```ts
function handleSuccess() {
  setModal(null);
  // 같은 cursor/sort/dateRange로 강제 재페치
  setReloadTick((n) => n + 1);
}
```

`useEffect` deps에 reloadTick 추가.

---

## 8. Auth & Validation Boundary

| 위치 | 검증 |
|------|------|
| Server action `listClientsPage` | requireAdminApi → AppError UNAUTHENTICATED |
| Server action `listPendingApplicantsForIssuance` | requireAdminApi |
| POST /api/admin/partners (재활용) | requireAdminApi (cycle #20) |
| POST /api/admin/partners/applicants/[id]/approve (재활용) | requireAdminApi (cycle #21) |
| 클라이언트 fetch error 401 | router.push('/admin/login?next=/admin/partners/new') |
| Disabled 카드 클릭 | early return (UI 차단). 백엔드 race로 통과 시도해도 cycle #20 ALREADY_REGISTERED 또는 cycle #21 STATUS_CONFLICT로 차단 |

---

## 9. Race Conditions & Defenses

| 시나리오 | 방어 |
|---------|------|
| Admin A·B가 동시에 같은 client 카드 클릭 → 모달 열림 | 둘 다 [발급] 클릭 시 cycle #20 `partnerRepository.create` 내부의 `getByOwnerUid` 검사로 두 번째는 ALREADY_REGISTERED 409. 모달에서 에러 표시 + 모달 자동 닫기 + 명단 갱신. **H5: ALREADY_REGISTERED 메시지에 partnerId 포함 (예: "...partnerId=xyz")** — admin context이므로 그대로 표시, 운영자가 기존 발급 확인 가능 |
| Admin이 모달 열어둔 상태에서 사장님이 자율 가입 → applicant 생성 | 발급 시 cycle #20은 applicants를 모름. partner 발급 후 applicants는 stale (status=pending이지만 partner 이미 있음). v1에서는 무시 (applicants는 자율 가입 흐름의 별도 상태). v2에서 cleanup batch 검토 |
| 신청자 승인 모달 열어둔 사이 같은 신청자가 reject 됨 | cycle #21 approve TX 내부 `data.status !== 'pending'` 체크 → STATUS_CONFLICT 409 → 모달에서 에러 표시 |
| router.refresh 직후 명단 fetch가 이전 cursor로 빈 페이지 반환 | 발급된 사용자는 여전히 명단에 있고 ✅ 배지로 변경되므로 빈 페이지는 거의 발생 안 함. 만약 발생 → "[이전]" 사용 또는 페이지 1로 |

---

## 10. Acceptance Criteria

### 10.1 Functional (12)

| ID | 기준 | 검증 방법 |
|----|------|-----------|
| AC1 | `/admin/partners/new` 진입 시 "전체 명단" 탭 default | E2E 또는 manual |
| AC2 | 카드: displayName · email · createdAt · contactPhone(있으면) | UI 확인 |
| AC3 | 이미 partner인 사용자: ✅ 배지 + disabled | ALREADY_REGISTERED 사용자 시뮬레이션 |
| AC4 | pending applicant 사용자: ⏳ 배지 + disabled | applicantStatus='pending' 시뮬레이션 |
| AC5 | 페이징 [이전][다음], 20건/page, cursor 결정성 | 21건 이상 가입자 시뮬레이션 |
| AC6 | 정렬 토글 시 cursor 무효화 + 페이지 1 리셋 | 토글 후 page 1 확인 |
| AC7 | dateRange 활성 시 sort='latest' 강제, 토글 disabled | UI 확인 |
| AC8 | "신청자 명단" 탭: 매장명·카테고리·지역 preview | cycle #21 신청자 1명 시뮬 |
| AC9 | 신청자 카드 클릭 → 모달 read-only → [승인] → cycle #21 approve | 201 응답 + 명단 갱신 |
| AC10 | 전체 명단 카드 클릭 → 모달 입력 → [발급] → cycle #20 POST | 201 응답 + ✅ 배지 |
| AC11 | "이메일 검색" 탭: 기존 PartnerIssueForm 그대로 동작 | cycle #20 회귀 테스트 |
| AC12 | 발급 후 같은 페이지 연속 발급 (검색·페이지 상태 보존) | UX flow 확인 |

### 10.2 Non-functional (3)

| ID | 기준 |
|----|------|
| AC13 | tsc·build 0 errors |
| AC14 | git diff `src/app/api/admin/partners*` empty (R1) |
| AC15 | cycle #21 자율 가입 흐름 회귀 없음 (`/signup-partner`, 대기 신청 섹션) — **M7 검증 방법**: (1) `/signup-partner` 접근 → 회원가입 폼 정상 노출, (2) 가입 후 `/admin/partners` 상단 "대기 신청" 섹션에 노출 확인, (3) 같은 신청자가 cycle #22의 `/admin/partners/new` 신청자 명단 패널에도 동시 노출, (4) 어느 한 곳에서 승인 시 다른 곳에서도 사라짐 |

---

## 11. Implementation Order (S1 ~ S5)

### S1 — Domain & Repository
- `src/types/admin-issuance.ts` (ClientWithIssuanceStatus, encodeCursor/decodeCursor)
- `src/lib/firebase/user-repository.ts` listClientsPage 메서드 추가
- 단일 단위 테스트는 v1 OOS — 빌드 + 실 페이지 연동으로 검증

### S2 — Server Actions
- `src/app/actions/partner-issuance-actions.ts` (listClientsPage, listPendingApplicantsForIssuance)
- zod schemas, requireAdminApi 통합

### S3 — Panels (UI 1차)
- `src/components/admin/ClientUsersPanel.tsx`
- `src/components/admin/PendingApplicantsPanel.tsx`

### S4 — Modal & Console
- `src/components/admin/IssueModal.tsx`
- `src/components/admin/IssuanceConsole.tsx` (3-탭 + 모달 상태)

### S5 — Integration
- `src/app/admin/partners/new/page.tsx` 수정 (`<IssuanceConsole />` 호스팅)
- 폴백 탭에 PartnerIssueForm wrap (외부 wrapper만)
- `firebase deploy --only firestore:indexes`로 §1.6 신규 composite 인덱스 2건 배포. 콘솔에서 추가 인덱스 안내 시 indexes.json 갱신 후 재배포
- tsc + build + git push (Vercel auto-deploy)
- **L2 deploy 검증**: Vercel deploy 완료 후 `/admin/partners/new` 진입 → 명단 정상 fetch 확인 (인덱스 미생성 시 콘솔 에러 모니터링)

---

## 12. Open Questions

| ID | 질문 | 잠정 결정 |
|----|------|-----------|
| OQ1 | 페이지 1 진입 시 전체 명단 server action을 즉시 호출 vs 사용자 인터랙션(첫 탭 클릭) 후 호출 | 즉시 호출 (default 탭이라 자연스러움). 단점: 명단 비어있으면 빈 fetch 1회 발생 — 무시할 수준 |
| OQ2 | 정렬 모드 변경 시 reloadTick + 페이지 1 리셋 vs URL query 동기화 | React state만 사용 (URL 동기화는 v2). 새로고침하면 페이지 1로 리셋 |
| OQ3 | dateRange UI는 from/to 두 input vs preset (지난 7일/30일/이번 달) | v1 두 input만. preset은 v2 |
| OQ4 | 빈 카드 그리드일 때 "이메일 검색 폴백 사용해보세요" 링크 노출 | YES — UX 도움 (S5에 포함) |
| OQ5 | 신청자 모달의 "거절은 상세 페이지에서" 안내 텍스트는 어떤 톤 | "정보 수정이 필요하면 거절하고 재신청 받아주세요" — 친근하지만 명확 |
| OQ6 | router.refresh() vs setReloadTick() 둘 다 발동해야 하나 | 둘 다 호출 (server data가 layout/page 내에 있을 가능성 + client useEffect 강제 재실행). 안전 우선 |
| OQ7 | 발급 후 partner 상세로 redirect 옵션 | Plan OQ3 결의 재확인 — v1 명단 복귀 default. 응답 `redirectTo` 무시 의도 명시 (§6.4) |
| OQ8 | applicants.listPending limit=100 초과 시 ⏳ 배지 누락 | v1 회원 수 가정상 미발생. v2에 listPending 페이지네이션 또는 별도 query (where ownerUid in [page uids]) 검토 |
| OQ9 | displayName이 빈 문자열인 사용자가 정렬상 최상위로 모임 | v1 OOS — 회원가입 시 displayName 필수 입력으로 강제하면 자연 해결. v2에 default fallback (email prefix 등) 검토 |

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Firestore composite 인덱스 미생성으로 listClientsPage 실패 | S5 단계 `firebase deploy --only firestore:indexes --dry-run` + 첫 deploy 후 콘솔 에러 메시지 따라 indexes.json 갱신 + 재배포 |
| roles 필드 누락된 레거시 사용자 (array-contains 'client' 매칭 실패) | 의도적으로 제외 (v1 시점 client 의향 확실한 사용자만 노출). 폴백 탭에서 직접 발급 가능 |
| ALREADY_REGISTERED race (admin 두 명 동시) | cycle #20 partnerRepository.create 내부 검사. UI는 명시적 에러 + 명단 자동 갱신 |
| 신청자 데이터가 stale한 채 모달 열림 (사장님이 모달 열린 사이 reject 됨) | cycle #21 approve TX 내부 status check → STATUS_CONFLICT → 모달 에러 |
| Cursor로 페이지 N에 있다가 정렬·dateRange 변경 후 이전 페이지 cursor 사용 | reloadTick + cursorStack reset |

---

## 14. Next Steps

1. **design-validator** 호출 → Critical/High/Medium/Low 결의 받기
2. v0.2로 갱신 (validator 응답 반영)
3. `/pdca do partner-issue-from-users` → S1~S5 구현

---

## Appendix A. cycle #20 `issueSchema` (재활용 참고)

```ts
const issueSchema = z.object({
  uid: z.string().min(1),
  businessName: z.string().min(1).max(40),
  regionLabel: z.string().max(60).optional(),
  category: z.enum(QUOTE_CATEGORIES as readonly [string, ...string[]]).optional(),
  logoUrl: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});
```

IssueModal kind='fresh' 폼은 logoUrl 필드를 노출하지 않음 (v1 단순화) — 발급 후 partner 편집 페이지에서 추가.

## Appendix B. cycle #21 approve route (재활용 참고)

`POST /api/admin/partners/applicants/[applicantId]/approve` — body 없음, applicantId만 path param. 내부에서 단일 TX로 partners create + applicants update. Response 201 `{ partnerId, redirectTo }`.

---

## Appendix C. Design-Validator v0.1 응답 반영 (2026-04-26)

**Critical (5/5 ✅)**
- C1: `requireAdminApi()` destructure 제거 (§4.2) — 반환값 없음 (Promise<void>)
- C2: §0 R3 셀에 "request-scope 캐시 없음, 페이지마다 reread 의도" 명시
- C3: cursor displayName 빈 문자열 edge case → §2.2에 명시 + OQ9 추가
- C4: §6.4에 응답 body 무시 의도 명시 (Plan OQ3 결의 재확인)
- C5: §1.6에 Firestore composite 인덱스 2건 사전 명시 (json snippet 포함)

**High (8/8 ✅)**
- H1: §2.2 decodeCursor `if (idx < 0)` (idx === 0 빈 displayName valid 케이스 인정)
- H2: §0 R6 셀 정정 — "router.refresh + setReloadTick 둘 다"로 명시
- H3: §2.3 표 listPending limit=100 가드레일 + OQ8
- H4: §5.2 +09:00 하드코딩 의도 코멘트
- H5: §9 race 표 ALREADY_REGISTERED 메시지 partnerId 노출 OK
- H6: §4.1 cursor schema → `z.string().min(1).nullable()`
- H7: §7.3 코드 블록 직접 갱신 (reloadTick deps 명시)
- H8: §4.4 표에 listPendingApplicantsForIssuance 행 추가

**Medium (7/7 ✅)**
- M1: cursorStack 메모리 영향 미미 (디자인 본문 그대로)
- M2: 빈 상태 톤 일관화 (§3 갱신)
- M3: disabled 카드 tabindex="-1" (§6.2)
- M4: dateRange UI from > to client-side guard (§6.2)
- M5: 신청자 모달 거절 안내 — 상세 페이지 경로 명시 (§6.5)
- M6: §1.5 lucide-react 검증 명시
- M7: AC15 검증 방법 (4단계 회귀 시나리오) 명시

**Low (5/5 ✅)**
- L1: §1.1 PendingApplicantsPanel 의존 표기 — `props.onSelect 콜백`으로 구체화 가능 (구현자 자유)
- L2: §11 S5 deploy 검증 절차 명시
- L3: OQ7 — Plan OQ3 결의 재확인
- L4: import path 검증 통과 (변경 없음)
- L5: 폴백 패널 wrapper (§6.6) 변경 없음 — 그대로 유지

**완료**: 25/25 (100%) — Critical/High 즉시 반영, Medium/Low는 명시적 코멘트로 디자인 본문에 통합.

Score 78/100 → 결의 후 95+ 예상. Do 진입 가능.
