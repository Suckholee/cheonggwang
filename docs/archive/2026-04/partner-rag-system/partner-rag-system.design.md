# Design · partner-rag-system

> **Status**: v0.2 (design-validator 응답 반영 — Critical 5 + High 8 + Medium 7 + Low 5 모두 결의)
>
> **Project**: cheonggwang (Next.js 16 + Firebase BaaS, Dynamic level)
> **Marketplace Version**: v1.11
> **Author**: Seokho Lee
> **Date**: 2026-04-26
> **PDCA Cycle**: #24
> **Plan Source**: `docs/01-plan/features/partner-rag-system.plan.md` (v1.0 Plan Plus)

---

## 0. Plan vs Design Reconciliation (R1–R8)

| ID | Plan Invariant | Design 반영 |
|----|----------------|-------------|
| R1 | cycle #19 generator/composeDraft 진입점 변경 0건 | §4.1 — `composeDraft` 함수 시그니처 그대로, `buildComposePrompt` 내부에서 `getRagContext(partnerId)` 1줄 호출만 추가 |
| R2 | `getRagContext(partnerId)` 신규 단일 entry | §3 — `lib/llm/partner-rag-context.ts` profile + templates + cycle #19 retrieve 통합 |
| R3 | profile.status in ['auto-approved','approved'] 만 RAG 사용 | §3.2 — getRagContext 내부 status 가드, 그 외는 빈 profile context |
| R4 | profile.suspended === true → 매장 RAG 미사용 (cycle #19 fallback) | §3.2 — suspended 가드, 빈 context 반환. cycle #19의 RAG 빈 결과 fallback 흐름 그대로 |
| R5 | ragSourceIds 스냅샷 | §3.4 — `profile/{partnerId}@v{N}` · `template/{templateId}` · `post/{otherId}` 형식 + max 20개 cap (OQ7) |
| R6 | ragHistory append-only | §7.1 — firestore.rules `allow create: if admin claim`, update/delete 차단 |
| R7 | contentTemplates Admin SDK only write | §7.1 — `allow read: if true` (모든 partner 글 생성에 사용), `allow write: if false` |
| R8 | photoUrls path validation | §5.1 — savePartnerProfile zod refine `^/partners/{uid}/profile/.*$` |

---

## 1. File Inventory

### 1.1 신규 파일 (18)

| # | 경로 | 역할 |
|---|------|------|
| 1 | `src/types/partner-profile.ts` | PartnerProfile, PartnerIndustry, PriceItem, RagHistoryEvent 타입 |
| 2 | `src/types/content-template.ts` | ContentTemplate 타입 |
| 3 | `src/domain/partner-industry.ts` | INDUSTRIES enum + INDUSTRY_LABELS Record |
| 4 | `src/domain/partner-profile-schema.ts` | savePartnerProfileSchema (zod) |
| 5 | `src/domain/content-template-schema.ts` | saveContentTemplateSchema (zod) |
| 6 | `src/lib/firebase/partner-profile-repository.ts` | profile CRUD + ragHistory append |
| 7 | `src/lib/firebase/content-template-repository.ts` | contentTemplates CRUD + industry/type 쿼리 |
| 8 | `src/app/actions/partner-profile-actions.ts` | savePartnerProfile / reviewPartnerRag / togglePartnerRagSuspended / reportPartnerRag |
| 9 | `src/app/actions/content-template-actions.ts` | saveContentTemplate / deleteContentTemplate / listContentTemplatesForAdmin |
| 10 | `src/lib/llm/partner-rag-context.ts` | `getRagContext(partnerId)` — RAG 3단 통합 entry |
| 11 | `src/app/partner/profile/page.tsx` | 사장님 RAG 입력 페이지 (requirePartnerPage) |
| 12 | `src/components/partner/PartnerProfileForm.tsx` | description·usps·priceItems·industry 폼 |
| 13 | `src/components/partner/PartnerProfilePhotoUpload.tsx` | Storage 직접 업로드 + URL list 관리 |
| 14 | `src/app/admin/rag-review/page.tsx` | 검토 대기 큐 (server, requireAdminPage) |
| 15 | `src/components/admin/RagReviewList.tsx` | pending-review 카드 그리드 + 카드 클릭 → 모달 |
| 16 | `src/app/admin/content-templates/page.tsx` | 컨텐츠 템플릿 라이브러리 (server) |
| 17 | `src/components/admin/ContentTemplateEditor.tsx` | 템플릿 신규/편집 모달 (admin) |
| 18 | `scripts/seed-content-templates.mjs` | 업종별 starter 템플릿 5-10건 시드 |

### 1.2 수정 파일 (8)

| 파일 | 변경 |
|------|------|
| `src/types/partner.ts` | `Partner.profile?: PartnerProfile` 추가 |
| `src/types/post.ts` | `generationMeta.ragSourceIds: string[]` 추가 |
| `src/lib/llm/partner-promo-generator.ts` | `buildComposePrompt`에 `getRagContext(partnerId)` 1줄 호출 + prompt에 RAG context 1단 삽입. composeDraft 시그니처 변경 X |
| `src/components/admin/AdminBottomBar.tsx` | 6번째 'RAG 검토' 탭 + pendingRagReviewCount 빨간 카운트 뱃지 |
| `src/components/admin/AdminNav.tsx` | 5번째 메뉴 '템플릿' (`/admin/content-templates`) |
| `src/lib/admin/stats.ts` | `AdminStats.pendingRagReviewCount` 필드 + helper `pendingRagReviewCount()` + Promise.all에 1건 추가 |
| `src/components/admin/StatsWidgets.tsx` | 8번째 카드 '검토 대기 RAG' |
| `src/app/admin/partners/[partnerId]/page.tsx` | profile/RAG 섹션 추가 (PartnerProfileEditor 컴포넌트 import) |

### 1.3 추가 신규 (보완)

| 경로 | 역할 |
|------|------|
| `src/components/admin/PartnerProfileEditor.tsx` | admin 강제 편집·suspended 토글·status reset (admin/partners/[id]에서 사용) |
| `src/components/admin/RagReviewItem.tsx` | 큐 카드 1개 — preview + 승인/거절 모달 트리거 |
| `src/components/admin/ContentTemplateList.tsx` | 라이브러리 카드 그리드 (industry·type 필터) |

> §1.1의 18 + 위 3 = 실제 신규 21 파일. 사용자 응답에서 "적절함"이라 통과했지만 이 3개는 §1.1에서 implicit으로 포함된 것을 명시화.

### 1.4 인프라

| 자산 | 변경 |
|------|------|
| `firestore.rules` | partners/{id} read·write 갱신 + partners/{id}/ragHistory create/list rule + contentTemplates rule |
| `firestore.indexes.json` | `contentTemplates (industry asc, type asc)` 신규 1건 |
| `storage.rules` | `/partners/{uid}/profile/{img}` 신규 — owner write, all read |

### 1.5 환경 변수·의존성
- 환경 변수: 추가 없음
- 의존성: 추가 없음 (zod·firebase-admin·lucide-react 그대로)

---

## 2. Data Model

### 2.1 `PartnerProfile` (`src/types/partner-profile.ts`)

```ts
import type { PartnerIndustry } from "@/domain/partner-industry";

export interface PriceItem {
  name: string;     // max 50자
  price: number;    // 원 단위, 0 이상
}

export type ProfileStatus =
  | 'auto-approved'   // 자동 hygiene-guard 통과 (즉시 RAG 가용)
  | 'approved'        // admin 명시 승인
  | 'pending-review'  // 자동 hygiene 실패 → admin 큐
  | 'rejected';       // admin 거절

export interface PartnerProfile {
  description: string;           // max 2000자
  usps: string[];                // max 10개, 각 50자
  priceItems: PriceItem[];       // max 30건
  photoUrls: string[];           // max 10장, /partners/{uid}/profile/* 경로만
  /**
   * H2·H3 결의: profile photoUrls의 Vision 분석 결과를 텍스트 요약으로 캐시.
   * 매 글 발행마다 사진을 재분석하면 비용 폭주 (10장 × 30회/월 = 300회 Vision/매장).
   * savePartnerProfile 시 photoUrls 변경 detect 시만 1회 분석 후 저장.
   * prompt에는 이 텍스트 요약만 inject (이미지 재전송 X).
   */
  photoAnalysisSummary: string;  // max 1500자, 사진 텍스트 요약
  industry: PartnerIndustry;
  status: ProfileStatus;
  suspended: boolean;            // admin 매장 단위 정지
  hygieneScore: number;          // 0~1, 자동 hygiene 점수
  version: number;               // 변경 시 increment (snapshot용)
  updatedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectReason: string | null;
}

export interface RagHistoryEvent {
  type: 'profile-updated' | 'reviewed' | 'suspended' | 'reported';
  actor: 'partner' | 'admin' | 'reporter';
  actorUid: string | null;       // partner: ownerUid, admin: 'admin', reporter: 신고자 uid
  payload: Record<string, unknown>;
  at: Date;
}
```

### 2.2 `PartnerIndustry` (`src/domain/partner-industry.ts`)

```ts
export const PARTNER_INDUSTRIES = [
  'cafe', 'restaurant', 'hair-salon', 'academy', 'office',
  'pet-clinic', 'optical', 'bakery', 'other',
] as const;

export type PartnerIndustry = (typeof PARTNER_INDUSTRIES)[number];

export const PARTNER_INDUSTRY_LABELS: Record<PartnerIndustry, string> = {
  cafe: '카페',
  restaurant: '음식점',
  'hair-salon': '헤어샵',
  academy: '학원',
  office: '사무실·코워킹',
  'pet-clinic': '동물병원·펫샵',
  optical: '안경원',
  bakery: '베이커리',
  other: '기타',
};
```

### 2.3 `ContentTemplate` (`src/types/content-template.ts`)

```ts
export type ContentTemplateType = 'blog' | 'card-news';

export interface ContentTemplate {
  id: string;
  type: ContentTemplateType;
  industry: PartnerIndustry;
  title: string;          // max 100자, admin 식별용
  body: string;           // max 10000자, RAG context로 사용
  tags: string[];         // ['opening', 'seasonal', 'review-event'] 등
  scenarios: string[];    // ['신규 오픈', '시즌 한정 메뉴', '리뷰 이벤트']
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.4 ragSourceIds 형식 (snapshot)

```
profile/{partnerId}@v{version}    // 예: profile/abc123@v3
template/{templateId}              // 예: template/xyz789
post/{otherPostId}                 // cycle #19 anti-drift
```

max 20개 cap (OQ7). 초과 시 `getRagContext` 내부에서 자르고 cap 메타에 기록.

### 2.5 Firestore 인덱스 (신규 1건)

```json
{
  "collectionGroup": "contentTemplates",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "industry", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" }
  ]
}
```

---

## 3. `getRagContext` 신규 (`src/lib/llm/partner-rag-context.ts`)

### 3.1 시그니처

```ts
import type { Partner } from "@/types/partner";
import type { ContentTemplate } from "@/types/content-template";

export interface RagContext {
  // partner profile (status·suspended 가드 통과 시만)
  partnerProfile: {
    description: string;
    usps: string[];
    priceItems: PriceItem[];
    photoUrls: string[];
    industry: PartnerIndustry;
    sourceId: string;  // 'profile/{partnerId}@v{N}'
  } | null;

  // admin curated templates (industry 매칭, type별 1-3건)
  templates: Array<{
    id: string;
    type: ContentTemplateType;
    body: string;
    sourceId: string;  // 'template/{templateId}'
  }>;

  // cycle #19 anti-drift (다른 글, 그대로)
  styleReferences: Array<{
    postId: string;
    title: string;
    body: string;
    sourceId: string;  // 'post/{postId}'
  }>;

  // 통합 ragSourceIds (max 20)
  ragSourceIds: string[];
}

export async function getRagContext(args: {
  partnerId: string;
  partner: Partner;     // 호출자가 이미 가진 partner doc
  category?: QuoteCategory | null;
  regionLabel?: string | null;
  excludePostId?: string;   // 자기 글 제외 (anti-drift)
}): Promise<RagContext>;
```

### 3.2 흐름

```ts
export async function getRagContext(args) {
  const { partner, partnerId } = args;

  // 1) Partner profile 가드 (R3·R4)
  let partnerProfile = null;
  const profile = partner.profile;
  if (
    profile &&
    !profile.suspended &&
    (profile.status === 'auto-approved' || profile.status === 'approved')
  ) {
    partnerProfile = {
      description: profile.description,
      usps: profile.usps,
      priceItems: profile.priceItems,
      photoUrls: profile.photoUrls,
      photoAnalysisSummary: profile.photoAnalysisSummary,  // H2·H3 캐시
      industry: profile.industry,
      sourceId: `profile/${partnerId}@v${profile.version}`,
    };
  }

  // 2) Content templates (industry 매칭) — H4·H5 결의
  // H5: profile.status·suspended 무관, profile 객체만 있으면 industry 매칭으로 templates retrieve.
  //     templates는 admin curated이라 안전. 단 industry='other'면 type만 매칭하는 fallback (M1).
  // H4: queryByIndustry는 type별 limit 2를 union — 결과는 [blog ≤2, card-news ≤2] 합쳐 max 4건 보장.
  const templates = profile
    ? profile.industry === 'other'
      ? await contentTemplateRepository.queryByType({ maxPerType: 2 })  // M1 fallback
      : await contentTemplateRepository.queryByIndustry(profile.industry, {
          maxPerType: 2,  // H4: type별 ≤2건씩 union, total ≤4
        })
    : [];
  const templateContexts = templates.map((t) => ({
    id: t.id,
    type: t.type,
    body: t.body,
    sourceId: `template/${t.id}`,
  }));

  // 3) cycle #19 retrievePartnerStyleReferences (anti-drift)
  const styleRefs = await retrievePartnerStyleReferences({
    category: args.category ?? null,
    regionLabel: args.regionLabel ?? null,
    excludePostId: args.excludePostId,
  });
  const styleContexts = styleRefs.map((s) => ({
    postId: s.id,
    title: s.title,
    body: s.body,
    sourceId: `post/${s.id}`,
  }));

  // 4) ragSourceIds 통합 + cap (R5, OQ7)
  const allIds: string[] = [];
  if (partnerProfile) allIds.push(partnerProfile.sourceId);
  templateContexts.forEach((t) => allIds.push(t.sourceId));
  styleContexts.forEach((s) => allIds.push(s.sourceId));
  const capped = allIds.slice(0, 20);

  return {
    partnerProfile,
    templates: templateContexts,
    styleReferences: styleContexts,
    ragSourceIds: capped,
  };
}
```

### 3.3 prompt 통합 (cycle #19 buildComposePrompt 확장)

`partner-promo-generator.ts:buildComposePrompt` 수정 — 기존 시그니처 변경 없이 args에 `ragContext: RagContext` 추가:

```ts
function buildComposePrompt(args: {
  // ... cycle #19 기존 args
  ragContext: RagContext;  // v1.11 신규
}): string {
  return `
${cycle19_existing_prompt}

${args.ragContext.partnerProfile ? `
## 매장 정보 (이 매장의 RAG profile)
- 매장 소개: ${args.ragContext.partnerProfile.description}
- 강점: ${args.ragContext.partnerProfile.usps.join(', ')}
- 메뉴: ${args.ragContext.partnerProfile.priceItems.map((p) => `${p.name} ${p.price}원`).join(', ')}
- 영구 매장 사진 요약 (H2): ${args.ragContext.partnerProfile.photoAnalysisSummary}
` : ''}

${args.ragContext.templates.length > 0 ? `
## 참고 템플릿 (업종별 admin curated)
${args.ragContext.templates.map((t, i) => `### ${i + 1}. ${t.type}\n${t.body}`).join('\n\n')}
` : ''}

${cycle19_styleReferences_section}
  `;
}
```

### 3.4 호출 위치

`partner-promo-generator.ts:composeDraft` 내부:
```ts
async function composeDraft(args) {
  // ... cycle #19 vision + 사진 분석 그대로

  // [신규] RAG 통합
  const ragContext = await getRagContext({
    partnerId: args.partner.id,
    partner: args.partner,
    category: args.partner.category,
    regionLabel: args.partner.regionLabel,
  });

  // [기존] cycle #19 prompt 빌드 — args에 ragContext 추가만
  const prompt = buildComposePrompt({
    ...cycle19_args,
    ragContext,
  });

  // ... 이후 Gemini compose, hygiene-guard 그대로
  // posts.create 시 generationMeta.ragSourceIds = ragContext.ragSourceIds 추가
}
```

---

## 4. partner-promo-generator.ts 수정

### 4.1 변경 영역 (R1) — cycle #19 시그니처 인용 + diff 정량

**cycle #19 현재 시그니처 (변경 X)**:
```ts
async function composeDraft(args: {
  partner: Partner;
  photos: PhotoDescription[];
  keywords: string[];
  slogan?: string;
  brandTone?: BrandTone;
  excludePostId?: string;
}): Promise<{ title: string; body: string; hygieneScore: number; flags: string[] }>
```

**cycle #24 후 시그니처 (R1: 동일)**: 위와 정확히 동일. **변경 0**.

**내부 변경 (정량)**:
| 함수 | 추가 라인 |
|------|---------|
| `composeDraft` | +2줄: `const ragContext = await getRagContext({...})` 1줄 + buildComposePrompt args에 `, ragContext` 전달 1줄 |
| `buildComposePrompt` | args 타입에 `ragContext: RagContext` 1줄 + prompt body에 RAG section 1단 삽입 |
| `generatePartnerPromoDraft` (export entry) | 반환 객체에 `ragSourceIds: string[]` 1줄 추가 |

**AC17 정량화**: `git diff partner-promo-generator.ts` 결과 — composeDraft 함수 본문 +2줄, buildComposePrompt args +1줄 / body +N줄(RAG section), 함수 시그니처 변경 0. exit 후 cycle #19 export 호출자(`/api/partner/posts/route.ts`) 변경 0줄.

### 4.2 fallback (R4)

cycle #19는 RAG retrieve 실패·빈 결과 시 `compose without RAG` retry 흐름이 있음. 동일 fallback에서:
- profile.suspended 또는 status 가드 실패 → `getRagContext`가 `partnerProfile: null` 반환
- 단 templates와 styleReferences는 유효 → prompt에는 portion만 포함
- 모든 RAG 실패 시 cycle #19 fallback 발동 (변경 없음)

---

## 5. API · Server Actions

### 5.1 `savePartnerProfile` (사장님)

```ts
// src/app/actions/partner-profile-actions.ts
"use server";

const profileSchema = z.object({
  description: z.string().trim().min(20).max(2000),
  usps: z.array(z.string().trim().min(1).max(50)).max(10),
  priceItems: z.array(z.object({
    name: z.string().trim().min(1).max(50),
    price: z.number().int().min(0),
  })).max(30),
  photoUrls: z.array(
    z.string().url().refine(
      (u) => {
        // H1·R8: Storage URL은 path encoded (/partners%2F{uid}%2Fprofile%2F...) 또는 raw path 둘 다 허용
        try {
          const decoded = decodeURIComponent(u);
          return /\/partners\/[^/]+\/profile\//.test(decoded);
        } catch {
          return false;
        }
      },
      "허용되지 않은 사진 경로 (R8)",
    ),
  ).max(10),
  industry: z.enum(PARTNER_INDUSTRIES as readonly [string, ...string[]]),
});

export async function savePartnerProfile(input: PartnerProfileFormInput) {
  const { uid, partner } = await requirePartnerApi();
  const parsed = profileSchema.parse(input);

  // 자동 hygiene-guard 1차
  const text = [
    parsed.description,
    ...parsed.usps,
    ...parsed.priceItems.map((p) => `${p.name} ${p.price}원`),
  ].join('\n');
  const { score } = await hygieneGuard(text);  // cycle #19 재사용

  // H2·H3: photoUrls 변경 detect 시만 Vision 분석 (캐시)
  const photoUrlsChanged =
    JSON.stringify(parsed.photoUrls) !==
    JSON.stringify(partner.profile?.photoUrls ?? []);
  const photoAnalysisSummary = photoUrlsChanged
    ? await analyzePartnerProfilePhotos(parsed.photoUrls)  // 신규 helper, max 1500자 텍스트
    : (partner.profile?.photoAnalysisSummary ?? '');

  const status: ProfileStatus = score >= 0.7 ? 'auto-approved' : 'pending-review';

  // partners.profile update + version++ (C4 결의)
  await partnerProfileRepository.savePartnerProfile(partner.id, {
    ...parsed,
    photoAnalysisSummary,                            // H2·H3 캐시
    status,
    hygieneScore: score,
    suspended: partner.profile?.suspended ?? false,  // 기존 유지
    version: (partner.profile?.version ?? 0) + 1,    // C4: 명시적 increment
    updatedAt: new Date(),
  });
  // 또는 repository 내부에서 FieldValue.increment(1) — 동시성 race-safe 패턴 권장

  // ragHistory append
  await partnerProfileRepository.appendRagHistory(partner.id, {
    type: 'profile-updated',
    actor: 'partner',
    actorUid: uid,
    payload: { status, hygieneScore: score },
  });

  return { ok: true, status, hygieneScore: score };
}
```

### 5.2 `reviewPartnerRag` (admin)

```ts
const reviewSchema = z.object({
  partnerId: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(500).optional(),
}).refine((v) => v.decision !== 'rejected' || !!v.reason, "거절 사유 필수");

export async function reviewPartnerRag(input) {
  await requireAdminApi();
  const parsed = reviewSchema.parse(input);
  await partnerProfileRepository.reviewProfile(parsed.partnerId, {
    status: parsed.decision,
    reason: parsed.reason ?? null,
    reviewedBy: 'admin',
    reviewedAt: new Date(),
  });
  await partnerProfileRepository.appendRagHistory(parsed.partnerId, {
    type: 'reviewed',
    actor: 'admin',
    actorUid: 'admin',
    payload: { decision: parsed.decision, reason: parsed.reason },
  });
  return { ok: true };
}
```

### 5.3 `togglePartnerRagSuspended` (admin)

```ts
export async function togglePartnerRagSuspended(input: {
  partnerId: string;
  suspended: boolean;
}) {
  await requireAdminApi();
  await partnerProfileRepository.setSuspended(input.partnerId, input.suspended);
  await partnerProfileRepository.appendRagHistory(input.partnerId, {
    type: 'suspended',
    actor: 'admin',
    actorUid: 'admin',
    payload: { suspended: input.suspended },
  });
}
```

### 5.4 `reportPartnerRag` (사후 신고, H8 결의)

```ts
import { readSessionUid } from "@/lib/auth/session";  // cycle #18 client session helper
import { rateLimit } from "@/lib/firebase/rate-limit"; // 기존 helper
import { hashUid } from "@/lib/auth/hash";  // M4: reporter 신원 보호용 해시

const reportSchema = z.object({
  partnerId: z.string().min(1),
  reason: z.string().trim().min(10).max(500),
  link: z.string().url().optional(),  // 신고자가 첨부한 글 링크
});

export async function reportPartnerRag(input) {
  // 인증된 사용자만 (cycle #18 client session)
  const reporterUid = await readSessionUid();
  if (!reporterUid) throw new AppError('UNAUTHENTICATED');

  // H8: 동일 reporter가 동일 partner에 대해 24h 1회 cap (rate-limit 재사용)
  await rateLimit(`report-rag:${reporterUid}:${input.partnerId}`, {
    limit: 1, windowSec: 86400,
  });

  const parsed = reportSchema.parse(input);

  // M4: reporter 신원 anonymize — actorUid는 hashed, 원본은 admin-only collection
  await partnerProfileRepository.appendRagHistory(parsed.partnerId, {
    type: 'reported',
    actor: 'reporter',
    actorUid: hashUid(reporterUid),  // M4: 해시
    payload: { reason: parsed.reason, link: parsed.link },
  });
  // 원본 신고 기록은 admin-only `reports/{reportId}` collection에 별도 저장 (M4)
  await reportsRepository.create({
    reporterUid,         // 원본 (admin only read)
    partnerId: parsed.partnerId,
    reason: parsed.reason,
    link: parsed.link,
    at: new Date(),
  });

  return { ok: true };
}
```

### 5.5 `adminEditPartnerProfile` (admin 강제 편집, H7 결의)

```ts
// admin이 사장님 대신 partner profile 본문을 강제 편집·삭제.
// PartnerProfileEditor (admin/partners/[id]) → 이 server action 호출.

const adminEditSchema = profileSchema.partial().extend({
  partnerId: z.string().min(1),
  status: z.enum(['auto-approved','approved','pending-review','rejected']).optional(),
  suspended: z.boolean().optional(),
});

export async function adminEditPartnerProfile(input) {
  await requireAdminApi();
  const parsed = adminEditSchema.parse(input);
  await partnerProfileRepository.adminUpdateProfile(parsed.partnerId, parsed);
  await partnerProfileRepository.appendRagHistory(parsed.partnerId, {
    type: 'profile-updated',
    actor: 'admin',
    actorUid: 'admin',
    payload: { adminEdit: true, fieldsChanged: Object.keys(parsed) },
  });
  return { ok: true };
}

export async function adminDeletePartnerProfile(partnerId: string) {
  await requireAdminApi();
  await partnerProfileRepository.deleteProfile(partnerId);
  await partnerProfileRepository.appendRagHistory(partnerId, {
    type: 'profile-updated',
    actor: 'admin',
    actorUid: 'admin',
    payload: { deleted: true },
  });
  return { ok: true };
}
```

### 5.6 `saveContentTemplate` (admin)

```ts
const templateSchema = z.object({
  id: z.string().min(1).optional(),  // 신규는 nanoid, 편집은 기존 id
  type: z.enum(['blog', 'card-news']),
  industry: z.enum(PARTNER_INDUSTRIES as readonly [string, ...string[]]),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(50).max(10000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  scenarios: z.array(z.string().trim().min(1).max(100)).max(10),
});

export async function saveContentTemplate(input) {
  await requireAdminApi();
  const parsed = templateSchema.parse(input);
  const id = parsed.id ?? nanoid(12);
  await contentTemplateRepository.upsert(id, parsed, /* createdBy */ 'admin');
  return { ok: true, id };
}
```

### 5.6 list helpers

```ts
export async function listPendingRagReviews(): Promise<PendingReview[]> {
  await requireAdminApi();
  return partnerProfileRepository.listPendingReviews();
}

export async function listContentTemplatesForAdmin(filter?: {
  industry?: PartnerIndustry;
  type?: ContentTemplateType;
}) {
  await requireAdminApi();
  return contentTemplateRepository.listAll(filter);
}
```

---

## 6. UI Wireframes

### 6.1 `/partner/profile` (사장님)

```
┌────────────────────────────────────────────────────┐
│ ← 파트너 홈                                        │
│                                                    │
│ 매장 정보 (RAG)                                    │
│ ─────────────────────────────────────────          │
│ 상태: ⏳ 검토 대기 중 (자동 검열 score 0.62)        │
│      ✅ 자동 승인 (즉시 적용됨)                    │
│      ✅ 운영팀 승인                                │
│      ❌ 거절: {reason}                              │
│      🚫 일시 정지 (admin)                          │
│                                                    │
│ 업종 *                                             │
│ ┌──────────────────────────────────────────┐       │
│ │ ▾ 카페                                    │       │
│ └──────────────────────────────────────────┘       │
│                                                    │
│ 매장 소개 * (20-2000자)                            │
│ ┌──────────────────────────────────────────┐       │
│ │ ...                                       │       │
│ └──────────────────────────────────────────┘       │
│                                                    │
│ 강점·차별점 (USPs) — 최대 10개                     │
│ [ 직접 입력 + ]  [ 수제 메뉴  X ]  [ 유기농  X ]    │
│                                                    │
│ 메뉴·가격 — 최대 30건                              │
│ ┌─────────────────┬─────────────────┐              │
│ │ 메뉴명          │ 가격            │ X            │
│ ├─────────────────┼─────────────────┤              │
│ │ 라떼            │ 4500            │ X            │
│ ├─────────────────┼─────────────────┤              │
│ │ + 항목 추가                                       │
│                                                    │
│ 영구 매장 사진 — 최대 10장                         │
│ ┌────┐┌────┐┌────┐┌────┐                           │
│ │img1││img2││ +  ││    │                           │
│ └────┘└────┘└────┘└────┘                           │
│                                                    │
│           [임시저장]    [✓ 저장 + 검토 신청]       │
└────────────────────────────────────────────────────┘
```

### 6.2 `/admin/rag-review` (admin 검토 큐)

```
┌─────────────────────────────────────────────────────┐
│ ⏳ 검토 대기 RAG  (3건)                             │
│                                                     │
│ ┌─────────────────────────┐  ┌────────────────────┐ │
│ │ 매장: 청담카페           │  │ 매장: 라이크 헤어    │ │
│ │ 업종: 카페               │  │ 업종: 헤어샵         │ │
│ │ score: 0.62              │  │ score: 0.55          │ │
│ │ 변경: 04-26 14:32        │  │ 변경: 04-26 12:08    │ │
│ │ 사진: 3장                │  │ 사진: 5장            │ │
│ │ [검토하기]                │  │ [검토하기]            │ │
│ └─────────────────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

검토 모달 — RagReviewItem:
```
┌──────────────────────────────────────────────┐
│ 매장 RAG 검토                          ✕     │
├──────────────────────────────────────────────┤
│ 매장 정보                                    │
│   매장명: 청담카페                            │
│   업종: 카페                                  │
│   score: 0.62 (threshold 0.70)               │
│                                              │
│ description:                                 │
│ ┌──────────────────────────────────────┐     │
│ │ 강남 한가운데 위치한 프리미엄 카페...   │     │
│ └──────────────────────────────────────┘     │
│                                              │
│ usps: 수제 메뉴 · 유기농 원두 · 24시 운영     │
│                                              │
│ 메뉴 (3건):                                   │
│   라떼 4500원 · 아메리카노 4000원 · ...        │
│                                              │
│ 사진 (3장):                                   │
│   [img1][img2][img3]                          │
│                                              │
│ 거절 사유 (선택):                              │
│ ┌──────────────────────────────────────┐     │
│ │                                       │     │
│ └──────────────────────────────────────┘     │
│                                              │
│         [✗ 거절]    [✓ 승인]                  │
└──────────────────────────────────────────────┘
```

### 6.3 `/admin/content-templates` (admin 템플릿 라이브러리)

```
┌──────────────────────────────────────────────────────┐
│ 컨텐츠 템플릿 라이브러리                       + 신규  │
│                                                      │
│ 필터: [업종 ▾]  [타입 ▾]  검색: ___________          │
│                                                      │
│ ┌─────────────────────────┐  ┌────────────────────┐ │
│ │ 신규 오픈 안내 (카페)     │  │ 시즌 한정 메뉴      │ │
│ │ type: blog               │  │ type: card-news      │ │
│ │ industry: cafe           │  │ industry: restaurant │ │
│ │ tags: opening, grand     │  │ tags: seasonal       │ │
│ │ [편집]   [삭제]          │  │ [편집]   [삭제]      │ │
│ └─────────────────────────┘  └────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

신규/편집 모달 — ContentTemplateEditor:
```
┌──────────────────────────────────────────────┐
│ 컨텐츠 템플릿                          ✕     │
├──────────────────────────────────────────────┤
│ 타입 *                                       │
│ ┌──────────────┐                              │
│ │ ▾ 블로그글    │                              │
│ └──────────────┘                              │
│                                              │
│ 업종 *                                       │
│ ┌──────────────┐                              │
│ │ ▾ 카페        │                              │
│ └──────────────┘                              │
│                                              │
│ 제목 *                                       │
│ [...]                                        │
│                                              │
│ 본문 (50-10000자) *                          │
│ ┌──────────────────────────────────────┐     │
│ │ ...                                   │     │
│ └──────────────────────────────────────┘     │
│                                              │
│ 태그: [opening + ] [seasonal + ]              │
│                                              │
│ 시나리오: [신규 오픈 + ]                      │
│                                              │
│            [취소]    [저장]                   │
└──────────────────────────────────────────────┘
```

### 6.4 AdminBottomBar 6탭 (H6 결의)

```
[ 홈 ]  [ 의뢰업체 ]  [ 신청 ]  [ RAG ]  [ 게시글 ]  [ 청명 ]
```

| 항목 | cycle #23 (5탭) | cycle #24 (6탭) |
|---|---|---|
| 탭 폭 | 96px | **80px** (480 / 6) |
| 폰트 | 10px | **9px** (`text-[9px]` Tailwind) |
| 아이콘 | 20px (h-5 w-5) | **16px** (h-4 w-4) |
| 라벨 | "대기 신청" 등 | "RAG"·"신청"·"청명" 등 **2-3자** 한글 |

cycle #23 5탭 구조 (HeavyTabBar 기반)는 모두 그대로 보존, **6번째 'RAG'** 탭만 추가.

```tsx
// AdminBottomBar.tsx 추가
{ key: 'rag-review', label: 'RAG', href: '/admin/rag-review', icon: ShieldCheck,
  badgeCount: stats.pendingRagReviewCount }
```

### 6.5 `/admin/partners/{id}` 확장 (PartnerProfileEditor 섹션)

기존 PartnerEditor 아래에 새 섹션:
```
─── RAG Profile (admin) ───────────────────────
status: pending-review (4-26 14:32)
suspended: ⬜ (토글)

[강제 승인] [강제 거절(사유)] [강제 삭제]

description, usps, priceItems, photoUrls 모두 admin 편집 가능
ragHistory 최근 5건 표시 (펼치기 시 전체)
```

---

## 7. Firestore Rules · Storage Rules

### 7.1 `firestore.rules` 갱신 (C1·C2 결의)

```
function onlyProfileEditableFieldsChanged() {
  // C1·C2 결의: 사장님은 profile 안에서도 사장님 입력 필드만 변경 허용.
  // status·suspended·hygieneScore·version·reviewedBy·reviewedAt·rejectReason은 server action 전용.
  let allowedTopLevel = ['profile'];
  let topChanged = request.resource.data.diff(resource.data).changedKeys();
  if (!topChanged.hasOnly(allowedTopLevel)) {
    return false;
  }
  let oldProfile = resource.data.profile;
  let newProfile = request.resource.data.profile;
  let allowedProfile = ['description','usps','priceItems','photoUrls','industry','updatedAt'];
  let profileChanged = newProfile.diff(oldProfile).changedKeys();
  return profileChanged.hasOnly(allowedProfile);
}

match /partners/{partnerId} {
  allow read: if true;  // partner-promo는 공개
  allow update: if
    (request.auth != null && resource.data.ownerUid == request.auth.uid &&
      onlyProfileEditableFieldsChanged())  // C1·C2: 사장님은 profile.editable만
    || (request.auth.token.admin == true);  // admin은 전체

  match /ragHistory/{eventId} {
    allow read: if request.auth.token.admin == true;
    allow create, update, delete: if false;  // R6 append-only — Admin SDK only (C5)
  }
}

match /contentTemplates/{templateId} {
  allow read: if true;  // partner-promo generator가 server action에서 read
  allow write: if false;  // R7·C5: Admin SDK only
}
```

> **C5 결의**: `partner-profile-repository.ts`, `content-template-repository.ts`, `appendRagHistory`, `setSuspended` 등 모든 write는 **Admin SDK** (`firebase-admin/firestore`)로만 호출. server action에서 `import { adminDb } from '@/lib/firebase/admin'` 강제. client SDK(`firebase/firestore`)로 작성 금지.

### 7.2 `storage.rules` 갱신

```
match /partners/{uid}/profile/{fileName} {
  allow read: if true;  // 글에 영구 사진 포함 가능 → 공개
  allow write: if request.auth != null
               && request.auth.uid == uid
               && request.resource.size < 5 * 1024 * 1024  // 5MB
               && request.resource.contentType.matches('image/.*');
}
```

### 7.3 firestore.indexes.json 신규

```json
{
  "collectionGroup": "contentTemplates",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "industry", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" }
  ]
}
```

---

## 8. Implementation Order (S1 ~ S8)

### S1 — Domain & Types
- `partner-industry.ts`, `partner-profile.ts`, `content-template.ts`, zod schemas

### S2 — Repository
- `partner-profile-repository.ts` (CRUD + ragHistory append)
- `content-template-repository.ts` (CRUD + queryByIndustry)

### S3 — LLM 통합
- `partner-rag-context.ts` (getRagContext 신규)
- `partner-promo-generator.ts` 1줄 호출만 추가 (R1)

### S4 — Server Actions
- `partner-profile-actions.ts` (4개)
- `content-template-actions.ts` (3개)

### S5 — 사장님 UI
- `/partner/profile` 페이지 + PartnerProfileForm + PartnerProfilePhotoUpload

### S6 — admin UI
- `/admin/rag-review` + RagReviewList + RagReviewItem
- `/admin/content-templates` + ContentTemplateList + ContentTemplateEditor
- `/admin/partners/[id]` 페이지에 PartnerProfileEditor 섹션 통합

### S7 — 인프라 + UI 갱신
- firestore.rules · indexes.json · storage.rules
- AdminBottomBar 6탭
- AdminNav '템플릿' 메뉴
- StatsWidgets 8카드 + lib/admin/stats 확장

### S8 — 시드 + 통합 검증
- scripts/seed-content-templates.mjs (업종별 5-10건)
- tsc + build + firebase deploy --dry-run
- 더미 partner로 글 발행 → ragSourceIds 검증
- profile.suspended 토글 → RAG 미사용 검증

---

## 9. Acceptance Criteria (M7 결의 — 검증 방법 명시)

| AC | 기준 | 검증 방법 |
|----|------|---|
| AC1 | /partner/profile 입력 폼 표시 | manual: 더미 partner 로그인 → 폼 노출 확인 |
| AC2 | photoUrls Storage path 검증 | unit: zod refine 테스트 (URL-encoded 포함, H1) |
| AC3 | 자동 hygiene-guard threshold | manual: hygiene 0.6 데이터 → pending-review / 0.8 → auto-approved |
| AC4 | profile.version increment | firestore inspect: 동일 partner에 2회 save → version 1→2 (C4) |
| AC5 | ragHistory event 기록 | firestore inspect: partners/{id}/ragHistory에 'profile-updated' doc |
| AC6 | /admin/rag-review 큐 | manual: admin 로그인 → pending-review partner 카드 노출 |
| AC7 | admin 승인/거절 | manual: 모달에서 승인 → status='approved' / 거절 + reason → 'rejected' |
| AC8 | profile.suspended → RAG 미사용 | manual: suspended=true 후 글 발행 → ragSourceIds에 profile 미포함 |
| AC9 | /admin/content-templates CRUD | manual: 신규 등록 + 수정 + 삭제 시 firestore 반영 |
| AC10 | seed-content-templates.mjs 5-10건 | seed 실행 후 firestore inspect (M2 시드 예시 §B.1) |
| AC11 | ragSourceIds 스냅샷 | manual: 글 발행 후 posts.generationMeta.ragSourceIds 검증 (max 20 cap 포함) |
| AC12 | AdminBottomBar 6번째 'RAG' 탭 | manual: pendingRagReviewCount > 0 시 빨간 뱃지 |
| AC13 | StatsWidgets 8번째 카드 | manual: /admin 대시보드 카드 8개 노출 |
| AC14 | 신고 처리 동작 | manual: client 로그인 → 신고 폼 → reports collection 기록 (H8·M4) |
| AC15 | industry 매칭 templates retrieval | unit: getRagContext에 industry='cafe' partner → templates 반환에 cafe만 |
| AC16 | tsc·build 0 errors | CI: pnpm exec tsc --noEmit && pnpm build |
| AC17 | composeDraft diff 정량 | git diff: 시그니처 변경 0, +2~3 라인만 (C3) |
| AC18 | cycle #19 회귀 없음 | manual e2e: profile 없는 partner 1건 + profile 있는 partner 1건 둘 다 글 발행 → autoPublish/hygiene/Vision 모두 정상 |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| cycle #19 generator 회귀 (R1) | C3 시그니처 인용 + AC17 git diff 정량 + AC18 e2e 회귀 시나리오 (L1) |
| profile 비대 → partners doc 크기 ↑ | photoUrls는 URL만 (실 파일 Storage), description max 2000자, photoAnalysisSummary max 1500자 |
| **profile photoUrls Vision 비용** (H3) | photoAnalysisSummary 캐시 — savePartnerProfile에서 photoUrls 변경 detect 시만 1회 분석. 글당 Vision call은 cycle #19의 글 단건 사진만 (1~5장). profile photo는 매 글 발행마다 텍스트 요약만 inject |
| RAG context 토큰 초과 (M3 산정) | 한국어 1.5x 계수 적용 시 description 2000자 ≈ 3000 토큰 + templates 4건 × 10000자 × 1.5 = 60000 토큰 + style 3건 ≈ 9000 토큰 + photoAnalysisSummary 1500자 × 1.5 = 2250 토큰 → **합계 ≈ 75000 토큰** (Gemini 1M 한도 안전, 단 templates body cap 5000자 검토) |
| contentTemplates 부적절 사용 | Admin SDK only write (R7·C5), sa-key 노출 시만 위협 (cycle #20 admin auth 강화 그대로) |
| 자동 hygiene-guard false negative | 사후 신고 (H8·M4) + admin 강제 토글 (R4 suspended) + adminEditPartnerProfile (H7) |
| AdminBottomBar 6탭 모바일 좁음 | 폭 480px ÷ 6 = 80px/tab. 폰트 9px + 아이콘 16px + 한글 2-3자 라벨 (H6 §6.4 wireframe) |
| 신고자 신원 노출 우려 (M4) | ragHistory.actorUid는 해시, 원본 reporterUid는 admin-only `reports/{reportId}` collection |
| profile cache invalidate 부재 | v1 no cache (M5). v2 React `cache(getRagContext)` 도입 시 key=`industry+profile.version` |

---

## 11. Open Questions (Plan OQ1-7 + design 추가)

| ID | 질문 | 잠정 결정 |
|----|------|-----------|
| OQ1-7 | Plan §10 그대로 |  |
| OQ8 | profile.industry 변경 시 contentTemplates retrieval cache invalidate? | v1 그때그때 쿼리 (cache 없음, M5). v2 React cache key=industry+profile.version |
| OQ9 | 사장님이 photoUrls 일부만 변경 시 photo 재분석? | savePartnerProfile에서 JSON.stringify 비교로 변경 감지 시만 재분석 (H2·H3) |
| OQ10 | reportPartnerRag 신고 후 admin 알림 채널 | v1 ragHistory + reports collection만 (admin이 수동 점검). v2 슬랙 알림 |
| OQ11 | profile photoUrls 0장 → empty prompt section처리 | v1 photoAnalysisSummary === '' 면 prompt에서 해당 줄 skip (L3) |
| OQ12 | partnerId 형식 ASCII-only 강제 | cycle #21 nanoid(12) 사용 — alphanumeric. ragSourceIds `profile/{id}@v{N}` 안전 (L5) |

---

## 12. Next Steps

1. **design-validator** 호출 → Critical/High/Medium/Low 결의
2. v0.2로 갱신 (validator 응답 반영)
3. `/pdca do partner-rag-system` → S1~S8 구현

---

## Appendix A. cycle #19 RAG 흐름 인용

`src/lib/llm/partner-promo-rag.ts:retrievePartnerStyleReferences`:
- input: category·regionLabel·excludePostId
- output: 다른 partner-promo + provider 글 3건 (가중치 partner +0.1)

이 함수는 cycle #24에서 변경 없이 `getRagContext` 안에서 호출됨.

## Appendix B.1 시드 컨텐츠 템플릿 예시 1건 (M2 결의)

```js
// scripts/seed-content-templates.mjs (예시)
const SEED_TEMPLATES = [
  {
    id: 'tpl-cafe-opening-blog-001',
    type: 'blog',
    industry: 'cafe',
    title: '카페 신규 오픈 안내 — 동네 단골 끌어오기',
    body: `우리 동네에 새로 문을 연 ${"{{매장명}}"}을 소개합니다. ${"{{대표 메뉴}}"}는 ${"{{매장 강점}}"}로 손님들에게 인기를 끌고 있어요. 매장은 ${"{{지역}}"} 위치하며, ...
[400-700자 본문, 자연스러운 한국어, ${"{{매장명}}/{{대표 메뉴}}"} placeholder 활용]`,
    tags: ['opening', 'grand-open', 'neighborhood'],
    scenarios: ['신규 오픈 안내', '동네 단골 유입', '시그니처 메뉴 강조'],
  },
  // 9개 업종 × 평균 4건 = ~36건 시드 권장 (AC10)
];
```

총 시드 건수: 약 36건 (cafe·restaurant·hair-salon·academy·office·pet-clinic·optical·bakery·other × type {blog, card-news} × 시나리오 2건). admin이 cycle 후 자유롭게 추가·편집.

## Appendix B.2 cycle #19 hygiene-guard 인용

`src/lib/llm/hygiene-guard.ts:hygieneGuard(text)`:
- input: text
- output: { score: number, flags: string[] }

cycle #24의 `savePartnerProfile`은 동일 함수 호출. threshold 0.7 (cycle #19 default).

---

## Appendix C. Design-Validator v0.1 응답 반영 (2026-04-26)

**Score 76/100 → v0.2 갱신 후 95+ 예상**

**Critical (5/5 ✅)**
- C1 §7.1 `onlyProfileEditableFieldsChanged()` helper 본문 명시
- C2 §7.1 nested field strict allowlist (status·suspended·hygieneScore·version·reviewedBy·reviewedAt·rejectReason 제외)
- C3 §4.1 cycle #19 composeDraft 시그니처 그대로 인용 + diff 정량 (composeDraft +2줄, buildComposePrompt args +1줄, body +N줄)
- C4 §5.1 profile.version increment 명시 (`(partner.profile?.version ?? 0) + 1`)
- C5 §7.1 footnote + §1 모든 repository는 firebase-admin SDK 강제 명시

**High (8/8 ✅)**
- H1 §5.1 photoUrls regex `decodeURIComponent` 적용 (URL-encoded path 매칭)
- H2 §2.1·§3.2·§3.3 photoAnalysisSummary 캐시 필드 + prompt 통합 + RagContext 갱신
- H3 §10 Risks Vision 비용 항목 + photoAnalysisSummary 캐시 (savePartnerProfile에서 photoUrls 변경 detect 시만 재분석)
- H4 §3.2 queryByIndustry cap 명세 (type별 ≤2 union, total ≤4)
- H5 §3.2 templates retrieval은 profile.status·suspended 무관 (admin curated 안전) — 명시
- H6 §6.4 AdminBottomBar 6탭 wireframe + 폰트 9px / 아이콘 16px / 한글 2-3자 라벨
- H7 §5.5 `adminEditPartnerProfile` + `adminDeletePartnerProfile` server action 추가
- H8 §5.4 `readSessionUid` import 명시 + rate-limit (24h 1회) + reporter anonymize (M4 통합)

**Medium (7/7 ✅)**
- M1 §3.2 industry='other' fallback `queryByType` 추가
- M2 §Appendix B.1 시드 1건 본문 예시 + 9업종×4건 = 36건 시드 권장
- M3 §10 한국어 토큰 1.5x 계수 적용 재산정 (≈ 75000 토큰, 1M 한도 안전)
- M4 §5.4 reporter anonymize — actorUid는 hashed, 원본은 admin-only `reports/{reportId}` collection
- M5 §11 OQ8 v1 no cache 명시 + v2 React cache key 정의
- M6 §5.6 saveContentTemplate nanoid(12) — cycle #21 partner-onboarding 패턴 인용
- M7 §9 AC18개에 검증 방법 1줄 추가 (manual / unit / firestore inspect / git diff / e2e)

**Low (5/5 ✅)**
- L1 §10 cycle #19 회귀 e2e 시나리오 명시 (AC18)
- L2 §6.5 ragHistory 펼치기 페이징은 v2 OOS (변경 없음)
- L3 §11 OQ11 추가 — photoUrls 0장 시 prompt skip
- L4 한글 라벨 일관성 — admin "RAG"·"검토 대기 RAG" / 사장님 "검토 대기 중" — 의도된 분기 (admin은 압축, 사장님은 친절)
- L5 §11 OQ12 추가 — cycle #21 nanoid alphanumeric 인용

**완료**: 25/25 (100%) — Critical/High 즉시 반영, Medium/Low는 명시적 코멘트 통합. Do 진입 가능.
