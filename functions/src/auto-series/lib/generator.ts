/**
 * v1.13 cycle #26 partner-auto-series · §3.2 — Cloud Functions 측 generator.
 *
 * ⚠️ MIRROR of src/lib/llm/partner-promo-generator.ts — keep in sync (cycle #26 R1)
 * Source synced: cycle #26 (this PR)
 *
 * Differences from source (Option A 복제 trade-off):
 *  1. Removed `import "server-only"` (functions runtime — no Next.js bundler)
 *  2. Replaced `@/*` path alias with relative imports inside functions/src
 *  3. Self-contained — Vision + composeDraft + hygiene 단순화 핵심 로직만 포함
 *  4. cycle #19 retrievePartnerStyleReferences 호출 생략 — 자동 시리즈는 partner.profile 기반 derivation으로 매장 특화 충분
 *  5. cycle #24 RAG context는 profile + 선택적 templateContext만 사용 (admin templates는 functions가 자체적으로 fetch 안 함, 단순화)
 *
 * 동일 보존:
 *  - 입력 시그니처 (uid, partnerId, postId, photoUrls, keywords, slogan, brandTone, businessName, format?)
 *  - 출력 shape (PartnerPromoDraftResult: title, summary80, bodyMarkdown, coverImageAlt, visionTags, ragSourceIds, hygieneScore, passed, reasons, format, cardNewsValidationFailed?)
 *  - cycle #25 card-news 형식 + retry chain
 */

import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { BrandTone, PostFormat } from "./types";

const VISION_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_VISION_MODEL ||
  process.env.GOOGLE_GENERATIVE_AI_MODEL ||
  "gemini-2.5-flash";
const COMPOSE_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ||
  process.env.GOOGLE_GENERATIVE_AI_MODEL ||
  "gemini-2.5-flash";

function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_FAILURE: GOOGLE_GENERATIVE_AI_API_KEY 미설정");
  }
  return new GoogleGenerativeAI(apiKey);
}

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
  },
];

// ─── Vision ──────────────────────────────────────────────

export interface PhotoDescription {
  caption: string;
  tags: string[];
}

const visionSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    caption: { type: SchemaType.STRING, description: "사진 핵심 1-2문장." },
    tags: {
      type: SchemaType.ARRAY,
      description: "핵심 키워드 5~10개 (한국어 권장).",
      items: { type: SchemaType.STRING },
    },
  },
  required: ["caption", "tags"],
};

async function fetchImageAsInline(
  url: string,
): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`STORAGE_FAIL: image fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  return { mimeType, data: buf.toString("base64") };
}

async function describePhoto(url: string): Promise<PhotoDescription> {
  const model = getGenAI().getGenerativeModel({
    model: VISION_MODEL,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: visionSchema,
      temperature: 0.3,
    },
  });
  const inline = await fetchImageAsInline(url);
  const result = await model.generateContent([
    { inlineData: inline },
    { text: "이 사진을 caption + tags JSON으로 설명하세요." },
  ]);
  const text = result.response.text();
  const parsed = JSON.parse(text) as PhotoDescription;
  return {
    caption: String(parsed.caption ?? "").slice(0, 200),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
  };
}

// ─── Compose ─────────────────────────────────────────────

interface PartnerDraft {
  title: string;
  summary80: string;
  bodyMarkdown: string;
  coverImageAlt: string;
}

const composeSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "30자 이내 제목" },
    summary80: { type: SchemaType.STRING, description: "80자 이내 요약" },
    bodyMarkdown: {
      type: SchemaType.STRING,
      description: "800~1200자 한국어 홍보 블로그 본문 (markdown).",
    },
    coverImageAlt: {
      type: SchemaType.STRING,
      description: "커버 이미지 대체 텍스트 (80자 이내).",
    },
  },
  required: ["title", "summary80", "bodyMarkdown", "coverImageAlt"],
};

const CARD_NEWS_INSTRUCTION = `

[형식: 카드뉴스]
- 6~10개 슬라이드. 각 슬라이드는 \`@@SLIDE@@\`만 적은 줄로 구분
- 각 슬라이드 80–150자
- 첫 슬라이드: 후크, 마지막 슬라이드: CTA
- **굵은 강조 헤드라인** + 본문 + *키워드* italic 권장
`;

function patchSchemaForCardNews(schema: Schema): Schema {
  const obj = schema as unknown as {
    properties?: Record<string, { description?: string; type?: unknown }>;
    [k: string]: unknown;
  };
  if (!obj.properties) return schema;
  const bodyMd = obj.properties.bodyMarkdown ?? {};
  return {
    ...obj,
    properties: {
      ...obj.properties,
      bodyMarkdown: {
        ...bodyMd,
        description:
          "6~10개 슬라이드를 '@@SLIDE@@'로 구분한 카드뉴스 본문. 각 80~150자. 마크다운 헤더(#) 금지.",
      },
    },
  } as unknown as Schema;
}

function validateCardNewsBody(body: string): {
  ok: boolean;
  reason?: string;
} {
  const slides = body
    .split(/\n[ \t]*@@SLIDE@@[ \t]*\n/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (slides.length < 4) return { ok: false, reason: "슬라이드 4개 미만" };
  if (slides.length > 12) return { ok: false, reason: "슬라이드 12개 초과" };
  if (slides.some((s) => s.length > 250)) {
    return { ok: false, reason: "슬라이드 길이 초과" };
  }
  return { ok: true };
}

interface ComposeArgs {
  visionDescs: PhotoDescription[];
  businessName: string;
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  ragContextSection?: string;
  templateContext?: string;
  format?: PostFormat;
}

function buildComposePrompt(args: ComposeArgs): string {
  const photoBlock = args.visionDescs
    .map(
      (d, i) =>
        `사진 ${i + 1}:\n- 캡션: ${d.caption}\n- 태그: ${d.tags.join(", ")}`,
    )
    .join("\n\n");
  const keywordBlock =
    args.keywords.length > 0
      ? `- 키워드: ${args.keywords.join(", ")}`
      : "- 키워드: (없음)";
  const sloganBlock = args.slogan
    ? `- 슬로건: ${args.slogan}`
    : "- 슬로건: (없음)";
  const ragBlock = args.ragContextSection
    ? `\n${args.ragContextSection}\n`
    : "";
  const tplBlock = args.templateContext ? `\n${args.templateContext}\n` : "";
  const formatRule =
    args.format === "card-news"
      ? CARD_NEWS_INSTRUCTION
      : "- 800~1200자 한국어 본문 (markdown — h2/h3/p/ul/li/strong 허용).";

  return `[사진 설명]
${photoBlock}

[파트너 입력]
- 매장/서비스명: ${args.businessName}
${keywordBlock}
${sloganBlock}
- brandTone: ${args.brandTone}
${ragBlock}${tplBlock}
위 사진 설명과 파트너 입력만 근거로 자연스러운 한국어 홍보 ${args.format === "card-news" ? "카드뉴스" : "블로그 글"}를 쓰세요.
규칙:
- 사진에 없는 가격·전화번호·할인율을 지어내지 않습니다.
- 매장 상호명(${args.businessName})은 자연스럽게 1~2회 언급.
- 청광·경쟁업체 직접 언급/비방 금지.
- "최저가", "업계 1위", "만족도 100%" 등 단정 광고 표현 금지.
${formatRule}
- 결과를 JSON으로 반환.`;
}

async function composeDraft(args: ComposeArgs): Promise<PartnerDraft> {
  const isCardNews = args.format === "card-news";
  const responseSchema = isCardNews
    ? patchSchemaForCardNews(composeSchema)
    : composeSchema;
  const systemInstruction = isCardNews
    ? "당신은 사진과 파트너 입력을 바탕으로 SEO 친화적 B2B 매장 홍보 카드뉴스를 쓰는 한국어 카피라이터입니다. 주어진 자료만 근거로 슬라이드형 짧은 텍스트를 작성하며, 허위 정보를 절대 쓰지 않습니다."
    : "당신은 사진과 파트너 입력을 바탕으로 SEO 친화적 B2B 매장 홍보 블로그를 쓰는 한국어 카피라이터입니다. 주어진 자료만 근거로 글을 쓰며, 허위 정보를 절대 쓰지 않습니다.";

  const model = getGenAI().getGenerativeModel({
    model: COMPOSE_MODEL,
    safetySettings: SAFETY_SETTINGS,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });
  const prompt = buildComposePrompt(args);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as PartnerDraft;
  return {
    title:
      String(parsed.title ?? "").slice(0, 30) ||
      `${args.businessName} 매장 이야기`,
    summary80: String(parsed.summary80 ?? "").slice(0, 80),
    bodyMarkdown: String(parsed.bodyMarkdown ?? ""),
    coverImageAlt: String(parsed.coverImageAlt ?? "").slice(0, 80),
  };
}

// ─── Hygiene 단순화 (cycle #19 핵심만) ──────────────────────

const FORBIDDEN_PHRASES = [
  "최저가",
  "업계 1위",
  "만족도 100%",
  "100% 보장",
  "절대 후회",
  "필수",
];

function checkHygieneSimple(
  body: string,
  title: string,
): { passed: boolean; score: number; reasons: string[] } {
  const reasons: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    if (body.includes(phrase) || title.includes(phrase)) {
      reasons.push(`금지 표현: "${phrase}"`);
    }
  }
  // 길이 체크
  if (body.length < 200) reasons.push("본문 너무 짧음 (200자 미만)");
  if (body.length > 5000) reasons.push("본문 너무 김 (5000자 초과)");

  const score = reasons.length === 0 ? 1.0 : Math.max(0, 1 - reasons.length * 0.3);
  return { passed: reasons.length === 0, score, reasons };
}

// ─── RAG context 단순화 (profile만) ─────────────────────────

function buildProfileRagSection(
  profile: { description?: string; usps?: string[]; photoAnalysisSummary?: string } | undefined,
  partnerId: string,
): { section: string; ragSourceIds: string[] } {
  if (!profile) return { section: "", ragSourceIds: [] };
  const lines: string[] = ["[매장 RAG 자료]"];
  if (profile.description) lines.push(`소개: ${profile.description}`);
  if (profile.usps && profile.usps.length > 0) {
    lines.push(`강점: ${profile.usps.join(" · ")}`);
  }
  if (profile.photoAnalysisSummary) {
    lines.push(`사진 분석:\n${profile.photoAnalysisSummary}`);
  }
  return {
    section: lines.join("\n"),
    ragSourceIds: [`profile/${partnerId}@v1`],
  };
}

// ─── Orchestration ───────────────────────────────────────

export interface GeneratePartnerPromoInput {
  uid: string;
  partnerId: string;
  postId: string;
  photoUrls: string[];
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  businessName: string;
  format?: PostFormat;
  templateContext?: string;
  /** Cloud Functions 측 추가 — Next.js 측은 partnerProfileRepository.getProfile 호출하지만, 여기는 caller가 미리 조회 */
  profile?: {
    description?: string;
    usps?: string[];
    photoAnalysisSummary?: string;
  };
}

export interface PartnerPromoDraftResult {
  title: string;
  summary80: string;
  bodyMarkdown: string;
  coverImageAlt: string;
  visionTags: string[];
  ragSourceIds: string[];
  hygieneScore: number;
  passed: boolean;
  reasons: string[];
  format: PostFormat;
  cardNewsValidationFailed?: boolean;
}

export async function generatePartnerPromoDraft(
  input: GeneratePartnerPromoInput,
): Promise<PartnerPromoDraftResult> {
  // 1. Vision 병렬
  const visionDescs = await Promise.all(input.photoUrls.map(describePhoto));
  const allTags = Array.from(
    new Set(
      visionDescs.flatMap((d) => d.tags).map((t) => t.trim()).filter(Boolean),
    ),
  ).slice(0, 20);

  // 2. RAG context (profile only — 단순화)
  const { section: ragSection, ragSourceIds } = buildProfileRagSection(
    input.profile,
    input.partnerId,
  );

  // 3. Compose with format support + retry/fallback chain
  const requestedFormat: PostFormat = input.format ?? "blog";
  const baseArgs: ComposeArgs = {
    visionDescs,
    businessName: input.businessName,
    keywords: input.keywords,
    slogan: input.slogan,
    brandTone: input.brandTone,
    ragContextSection: ragSection,
    templateContext: input.templateContext,
    format: requestedFormat,
  };

  let draft = await composeDraft(baseArgs);
  let resultFormat: PostFormat = requestedFormat;
  let cardNewsValidationFailed = false;

  if (requestedFormat === "card-news") {
    const v1 = validateCardNewsBody(draft.bodyMarkdown);
    if (!v1.ok) {
      try {
        draft = await composeDraft(baseArgs);
        const v2 = validateCardNewsBody(draft.bodyMarkdown);
        if (!v2.ok) {
          // blog로 fallback compose
          draft = await composeDraft({ ...baseArgs, format: "blog" });
          resultFormat = "blog";
          cardNewsValidationFailed = true;
        }
      } catch {
        draft = await composeDraft({
          ...baseArgs,
          format: "blog",
          ragContextSection: "",
        });
        resultFormat = "blog";
        cardNewsValidationFailed = true;
      }
    }
  }

  // 4. Hygiene
  const hygiene = checkHygieneSimple(draft.bodyMarkdown, draft.title);

  return {
    title: draft.title,
    summary80: draft.summary80,
    bodyMarkdown: draft.bodyMarkdown,
    coverImageAlt: draft.coverImageAlt,
    visionTags: allTags,
    ragSourceIds,
    hygieneScore: hygiene.score,
    passed: hygiene.passed,
    reasons: hygiene.reasons,
    format: resultFormat,
    cardNewsValidationFailed: cardNewsValidationFailed || undefined,
  };
}
