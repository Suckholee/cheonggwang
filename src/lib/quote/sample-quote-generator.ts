import "server-only";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { adminDb } from "@/lib/firebase/admin";
import { buildThreadId } from "@/domain/chat-schemas";
import {
  buildThreadPayload,
  INITIAL_LAST_MESSAGE_PREVIEW,
} from "@/lib/quote/thread-upsert";
import { buildProviderResponseId } from "@/types/provider-response";
import { QUOTE_CATEGORY_LABELS, type QuoteCategory } from "@/domain/quote-category";

/**
 * v1.6 — 고객 견적 요청에 대해 샘플 청명들이 AI 견적을 자동 제출.
 *
 * 호출: submitQuoteRequest TX 커밋 직후.
 * 동작:
 *   1. 요청 카테고리에 맞는 isSample=true 청명 최대 3명 선택
 *   2. 각 청명별 Gemini 호출 → items · scheduledAt · message 생성
 *   3. 실제 submitQuote와 동일한 TX (quotes.create + providerResponses.set + quoteRequests.update + threads.upsert)
 *   4. thread에 첫 인사 메시지(provider 측) 자동 insert
 *
 * 타임아웃: 전체 30s 안에 반환. 각 Gemini 호출 개별 10s.
 * 실패해도 호출부 흐름엔 영향 없음 (try/catch + 로그).
 */

const MODEL =
  process.env.GOOGLE_GENERATIVE_AI_CHAT_MODEL ||
  process.env.GOOGLE_GENERATIVE_AI_MODEL ||
  "gemini-2.5-flash";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ─── 가격 가이드 (KRW) ──────────────────────────────────
// 실제 평균 근거는 없으나 시장 조사 기반 대략치. AI 편향 방지용.
function priceHintRange(category: QuoteCategory, sizePyeong: number | null): [number, number] {
  const p = sizePyeong && sizePyeong > 0 ? sizePyeong : 20;
  switch (category) {
    case "residential":
      return [Math.round(p * 10000), Math.round(p * 15000)];
    case "regular":
      return [150000, 320000]; // 월
    case "construction":
      return [Math.round(p * 15000), Math.round(p * 25000)];
    case "exterior":
      return [300000, 700000];
    case "sanitation":
      return [80000, 150000];
    case "specialist":
      return [100000, 160000]; // 1대 기준
    case "lodging":
      return [30000, 60000];
    case "industrial":
      return [500000, 1500000];
    case "special":
      return [300000, 800000];
    case "etc":
    default:
      return [150000, 300000];
  }
}

// ─── Gemini 스키마 ──────────────────────────────────────
const quoteSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      description: "견적 항목 2~3개 (기본 + 옵션)",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: {
            type: SchemaType.STRING,
            description: "항목 이름 (예: '기본 입주청소', '베란다 특화')",
          },
          price: {
            type: SchemaType.INTEGER,
            description: "해당 항목 가격 (KRW, 1000원 단위)",
          },
          note: {
            type: SchemaType.STRING,
            description: "짧은 설명 (선택, 없으면 빈 문자열)",
          },
        },
        required: ["label", "price", "note"],
      },
    },
    estimatedWorkHours: {
      type: SchemaType.INTEGER,
      description: "예상 작업 시간 (시간 단위, 1~12)",
    },
    message: {
      type: SchemaType.STRING,
      description: "고객에게 보낼 첫 인사 메시지 (1~2문장, 80자 내외)",
    },
  },
  required: ["items", "estimatedWorkHours", "message"],
};

interface GeminiQuote {
  items: Array<{ label: string; price: number; note: string }>;
  estimatedWorkHours: number;
  message: string;
}

async function generateQuoteForProvider(params: {
  provider: {
    companyName: string;
    categories: QuoteCategory[];
    regions: Array<{ city: string; district: string }>;
    slogan?: string | null;
    brandTone?: string | null;
  };
  request: {
    category: QuoteCategory;
    size: number | null;
    region: { city: string; district: string };
    note: string | null;
  };
}): Promise<GeminiQuote> {
  const [priceLow, priceHigh] = priceHintRange(params.request.category, params.request.size);
  const catLabel = QUOTE_CATEGORY_LABELS[params.request.category];
  const catList = params.provider.categories.map((c) => QUOTE_CATEGORY_LABELS[c]).join(", ");
  const regionStr = `${params.request.region.city} ${params.request.region.district}`;
  const providerRegions = params.provider.regions
    .slice(0, 3)
    .map((r) => `${r.city} ${r.district}`)
    .join(", ");

  if (!genAI) {
    // Fallback: 중간값 단일 항목
    const price = Math.round((priceLow + priceHigh) / 2 / 1000) * 1000;
    return {
      items: [{ label: `${catLabel} 기본`, price, note: "" }],
      estimatedWorkHours: 4,
      message: `안녕하세요, ${params.provider.companyName}입니다. 견적 확인 후 연락드리겠습니다.`,
    };
  }

  const system = `당신은 "${params.provider.companyName}" 청소 업체 운영자입니다.
고객 견적 요청에 대한 답변으로 견적(총액 1000원 단위)과 짧은 첫인사 메시지를 작성합니다.

[업체 정보]
- 업체명: ${params.provider.companyName}
- 서비스: ${catList}
- 지역: ${providerRegions}
- 슬로건: ${params.provider.slogan ?? ""}

[가격 가이드]
${catLabel} 기준 총액 범위: ${priceLow.toLocaleString()}원 ~ ${priceHigh.toLocaleString()}원 사이에서 결정.
- items[0]: 기본 서비스 (가장 큰 금액, 전체의 70~85%)
- items[1..]: 옵션 1~2개 (작은 금액)
- 총합(sum(items.price))이 위 범위 안.
- 1000원 단위로 반올림.

[메시지 가이드]
- 친근한 존댓말, 80자 내외, 1~2문장
- 이미 지어낸 인증/보장 문구 금지
- 이모지 최대 1개

JSON으로만 응답.`;

  const user = `[고객 요청]
- 카테고리: ${catLabel}
- 지역: ${regionStr}
- 평수: ${params.request.size ?? "미지정"}${params.request.size ? "평" : ""}
- 메모: ${params.request.note ?? "(없음)"}

위 요청에 맞는 견적 1개를 작성하세요.`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings: SAFETY,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: quoteSchema,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  const result = await model.generateContent(user);
  const parsed = JSON.parse(result.response.text()) as GeminiQuote;

  // 안전판: items 빈 배열 방지
  if (!parsed.items || parsed.items.length === 0) {
    const price = Math.round((priceLow + priceHigh) / 2 / 1000) * 1000;
    parsed.items = [{ label: `${catLabel} 기본`, price, note: "" }];
  }
  // 가격 clamp (AI가 벗어나지 않도록)
  parsed.items = parsed.items.map((it) => ({
    label: String(it.label || "기본").slice(0, 30),
    price: Math.max(10000, Math.min(10_000_000, Number(it.price) || 0)),
    note: String(it.note || "").slice(0, 100),
  }));
  parsed.estimatedWorkHours = Math.max(
    1,
    Math.min(12, Number(parsed.estimatedWorkHours) || 4),
  );
  parsed.message = String(parsed.message || "").slice(0, 200);

  return parsed;
}

// ─── Timeout helper ─────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number, name: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${name} timeout ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ─── 메인 API ───────────────────────────────────────────
export interface TriggerSampleQuotesInput {
  requestId: string;
  clientUid: string;
  category: QuoteCategory;
  region: { city: string; district: string };
  size: number | null;
  note: string | null;
  maxProviders?: number;
}

export async function triggerSampleQuotes(
  input: TriggerSampleQuotesInput,
): Promise<{ submitted: number; failed: number }> {
  const MAX = input.maxProviders ?? 3;
  try {
    // 1. 샘플 청명 카테고리 매칭 — 최대 MAX명
    const providersCol = adminDb.collection("providers");
    const snap = await providersCol
      .where("isSample", "==", true)
      .where("categories", "array-contains", input.category)
      .limit(20)
      .get();

    // 무작위로 MAX개 선택
    interface ProviderCandidate {
      id: string;
      ownerUid: string;
      companyName: string;
      categories: QuoteCategory[];
      regions: Array<{ city: string; district: string }>;
      slogan: string | null;
      brandTone: string | null;
    }
    const candidates: ProviderCandidate[] = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          ownerUid: String(data.ownerUid ?? ""),
          companyName: String(data.companyName ?? "청광 청명"),
          categories: Array.isArray(data.categories)
            ? (data.categories as QuoteCategory[])
            : [],
          regions: Array.isArray(data.regions)
            ? (data.regions as Array<{ city: string; district: string }>)
            : [],
          slogan: (data.slogan as string | null | undefined) ?? null,
          brandTone: (data.brandTone as string | null | undefined) ?? null,
        };
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX);

    if (candidates.length === 0) {
      console.log("[sample-quotes] no matching sample providers", {
        category: input.category,
      });
      return { submitted: 0, failed: 0 };
    }

    // 2. 고객 displayName 사전 조회 (thread 생성용)
    const clientSnap = await adminDb
      .collection("users")
      .doc(input.clientUid)
      .get();
    const clientDisplayNameRaw = clientSnap.exists
      ? ((clientSnap.data()?.displayName as string | undefined) ?? null)
      : null;

    // 3. 각 샘플 청명별 Gemini + TX (병렬)
    const tasks = candidates.map(async (p) => {
      const providerId = p.id;
      const ownerUid = p.ownerUid;
      const companyName = p.companyName;
      const providerCategories = p.categories;
      const providerRegions = p.regions;
      const slogan = p.slogan;
      const brandTone = p.brandTone;

      try {
        const gen = await withTimeout(
          generateQuoteForProvider({
            provider: {
              companyName,
              categories: providerCategories,
              regions: providerRegions,
              slogan,
              brandTone,
            },
            request: {
              category: input.category,
              region: input.region,
              size: input.size,
              note: input.note,
            },
          }),
          12_000,
          `gen(${companyName})`,
        );

        // 4. TX: quote · providerResponse · quoteRequest · thread · first message
        const quoteRef = adminDb.collection("quotes").doc();
        const quoteId = quoteRef.id;
        const prRef = adminDb
          .collection("providerResponses")
          .doc(buildProviderResponseId(providerId, input.requestId));
        const reqRef = adminDb
          .collection("quoteRequests")
          .doc(input.requestId);
        const threadId = buildThreadId(input.requestId, providerId);
        const threadRef = adminDb.collection("threads").doc(threadId);
        const firstMessageRef = threadRef
          .collection("messages")
          .doc();

        const totalAmount = gen.items.reduce((s, it) => s + it.price, 0);
        const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3일 뒤

        await adminDb.runTransaction(async (tx) => {
          // v1.6: Firestore TX — 모든 READ 를 먼저, WRITE 는 뒤에 묶어서.
          const reqSnap = await tx.get(reqRef);
          if (!reqSnap.exists) return;
          const prSnap = await tx.get(prRef);
          if (prSnap.exists && prSnap.data()?.status === "quoted") {
            // 이미 quoted — skip
            return;
          }
          const threadSnap = await tx.get(threadRef);
          const threadExists = threadSnap.exists;
          const currentStatus = String(reqSnap.data()?.status ?? "");

          tx.create(quoteRef, {
            requestId: input.requestId,
            providerId,
            clientUid: input.clientUid,
            items: gen.items.map((i) => ({
              label: i.label,
              price: i.price,
              note: i.note || null,
            })),
            scheduledAt: Timestamp.fromDate(scheduledAt),
            estimatedWorkHours: gen.estimatedWorkHours,
            totalAmount,
            insured: true,
            insuranceAmount: 500_000_000, // 5억 (청광 공통)
            status: "sent",
            sentAt: FieldValue.serverTimestamp(),
            acceptedAt: null,
            rejectedAt: null,
            isSampleAi: true,
          });

          tx.set(
            prRef,
            {
              providerId,
              requestId: input.requestId,
              status: "quoted",
              respondedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );

          if (currentStatus === "submitted") {
            tx.update(reqRef, { status: "quoted" });
          }

          // thread upsert (threadSnap은 이미 TX 위에서 조회됨)
          const threadBase = buildThreadPayload({
            clientUid: input.clientUid,
            providerId,
            providerOwnerUid: ownerUid,
            requestId: input.requestId,
            quoteId,
            companyName,
            clientDisplayNameRaw,
          });

          if (threadExists) {
            tx.update(threadRef, {
              ...threadBase,
              lastMessageAt: FieldValue.serverTimestamp(),
              lastMessagePreview: gen.message.slice(0, 80),
              lastMessageSenderUid: ownerUid,
              unreadByClient: FieldValue.increment(1),
            });
          } else {
            tx.create(threadRef, {
              ...threadBase,
              lastMessageAt: FieldValue.serverTimestamp(),
              lastMessagePreview: gen.message.slice(0, 80),
              lastMessageSenderUid: ownerUid,
              unreadByClient: 2, // 견적 + 첫 메시지
              unreadByProvider: 0,
              createdAt: FieldValue.serverTimestamp(),
            });
          }

          // 첫 환영 메시지 (provider → client)
          tx.create(firstMessageRef, {
            threadId,
            senderUid: ownerUid,
            senderRole: "provider",
            type: "text",
            text: gen.message || INITIAL_LAST_MESSAGE_PREVIEW,
            createdAt: FieldValue.serverTimestamp(),
            isSampleAi: true,
          });
        });

        return { ok: true as const, providerId, companyName, totalAmount };
      } catch (err) {
        console.warn(
          `[sample-quotes] ${companyName} failed:`,
          (err as Error)?.message ?? err,
        );
        return { ok: false as const, providerId, companyName };
      }
    });

    const results = await Promise.allSettled(tasks);
    let submitted = 0;
    let failed = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.ok) submitted++;
      else failed++;
    });
    console.log(
      `[sample-quotes] requestId=${input.requestId} submitted=${submitted} failed=${failed}`,
    );
    return { submitted, failed };
  } catch (err) {
    console.warn("[sample-quotes] fatal", err);
    return { submitted: 0, failed: 0 };
  }
}
