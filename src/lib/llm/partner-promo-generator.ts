import "server-only";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { adminStorage, getStorageBucketName } from "@/lib/firebase/admin";
import { retrievePartnerStyleReferences } from "./partner-promo-rag";
import { checkMarkdownHygiene } from "./hygiene-guard";
import {
  buildCardNewsInstruction,
  patchComposeSchemaForCardNews,
  validateCardNewsBody,
} from "./card-news-generator";
import { AppError } from "@/lib/errors";
import type { BrandTone, Post } from "@/types/post";
import type { PostFormat } from "@/domain/post-format";

/**
 * v1.7 partner-promo · §4 — partner-promo AI 초고 생성.
 *
 * story-generator와의 차이 (Design §4.1):
 *   - **저장 책임 분리**: 이 모듈은 draft 객체만 반환. 저장(autoPublish 분기 포함)은 API handler 책임.
 *   - 입력: Storage URLs는 호출자가 미리 업로드한 결과를 전달
 *   - 키워드/슬로건/brandTone은 파트너 입력
 *   - hygiene 결과(passed/score/reasons)도 그대로 반환 — handler가 422 응답 결정
 */

const VISION_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_VISION_MODEL ||
  process.env.GOOGLE_GENERATIVE_AI_MODEL ||
  "gemini-2.5-flash";
const COMPOSE_MODEL =
  process.env.GOOGLE_GENERATIVE_AI_COMPOSE_MODEL ||
  process.env.GOOGLE_GENERATIVE_AI_MODEL ||
  "gemini-2.5-flash";

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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
    caption: {
      type: SchemaType.STRING,
      description: "사진의 핵심을 1-2문장으로.",
    },
    tags: {
      type: SchemaType.ARRAY,
      description: "핵심 키워드 5~10개 (한국어 권장).",
      items: { type: SchemaType.STRING },
    },
  },
  required: ["caption", "tags"],
};

/** v1.11 cycle #24 — partner-rag-context에서 재사용 */
export async function fetchImageAsInline(
  url: string,
): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new AppError(
      "VISION_FETCH",
      `이미지 다운로드 실패: ${res.status}`,
    );
  }
  const mimeType =
    res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buf.toString("base64") };
}

/** v1.11 cycle #24 — partner-rag-context에서 재사용 */
export async function describePhoto(url: string): Promise<PhotoDescription> {
  if (!genAI)
    throw new AppError(
      "LLM_FAILURE",
      "GOOGLE_GENERATIVE_AI_API_KEY 미설정",
    );
  const model = genAI.getGenerativeModel({
    model: VISION_MODEL,
    safetySettings: SAFETY_SETTINGS,
    systemInstruction:
      "당신은 사진을 관찰해 자연스러운 한국어 캡션과 키워드를 추출하는 비전 어시스턴트입니다. 허위 정보를 지어내지 마세요.",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: visionSchema,
      temperature: 0.3,
    },
  });
  const inline = await fetchImageAsInline(url);
  const result = await model.generateContent([
    { inlineData: inline },
    {
      text: "사진을 보고 caption과 tags를 JSON으로 반환하세요.",
    },
  ]);
  const text = result.response.text();
  const parsed = JSON.parse(text) as PhotoDescription;
  return {
    caption: String(parsed.caption ?? ""),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
  };
}

// ─── Compose (B2B 파트너 톤) ─────────────────────────────

interface PartnerDraft {
  title: string;
  summary80: string;
  bodyMarkdown: string;
  coverImageAlt: string;
}

const composeSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "30자 이내, 검색 유입에 유리한 한국어 제목.",
    },
    summary80: {
      type: SchemaType.STRING,
      description: "80자 이내 요약.",
    },
    bodyMarkdown: {
      type: SchemaType.STRING,
      description:
        "800~1200자 한국어 홍보 블로그 본문 (markdown — h2/h3/p/blockquote/ul/li/strong/em 허용).",
    },
    coverImageAlt: {
      type: SchemaType.STRING,
      description: "커버 이미지 대체 텍스트 (80자 이내).",
    },
  },
  required: ["title", "summary80", "bodyMarkdown", "coverImageAlt"],
};

function buildComposePrompt(args: {
  visionDescs: PhotoDescription[];
  businessName: string;
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  styleRefs: Post[];
  /** v1.11 cycle #24 — partner-rag-context 통합. 옵셔널 (호환). */
  ragContextSection?: string;
  /** v1.12 cycle #25 — admin contentTemplate 직렬화 텍스트. 옵셔널. */
  templateContext?: string;
  /** v1.12 cycle #25 — 'blog' (default) | 'card-news'. 옵셔널. */
  format?: PostFormat;
}): string {
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

  const styleBlock =
    args.styleRefs.length > 0
      ? `\n[참고 문체 — 톤만 참고, 내용 복사 금지]\n${args.styleRefs
          .map(
            (p, i) =>
              `예시 ${i + 1}: "${p.summary80}" ... ${p.bodyMarkdown.slice(
                0,
                180,
              )}…`,
          )
          .join("\n")}\n`
      : "";

  const ragBlock = args.ragContextSection
    ? `\n${args.ragContextSection}\n`
    : "";

  const templateBlock = args.templateContext
    ? `\n${args.templateContext}\n`
    : "";

  const isCardNews = args.format === "card-news";
  const formatRule = isCardNews
    ? buildCardNewsInstruction()
    : "- 800~1200자 한국어 본문 (markdown — h2/h3/p/blockquote/ul/li/strong/em 허용).";

  // v1.15 cycle #28 partner-aeo-boost · §3.1 (G1, H1) — AEO 콘텐츠 패턴.
  // blog format에만 적용 (카드뉴스는 슬라이드 형식 미적합).
  const aeoRule = isCardNews
    ? ""
    : `
- **첫 단락(2-3줄)**: 핵심 메시지를 직설적으로 답변 (독자가 답을 바로 알도록).
- **H2 헤더**: "{서비스} 비용은?", "어떻게 {서비스}하나요?" 처럼 자연어 질문 형식 1~2개 포함.
- **마지막에 [자주 묻는 질문] 섹션**: \`## 자주 묻는 질문\` + \`### Q1./Q2./Q3.\` 형식 + 답변은 단락으로.
- **구조**: 답변(첫 단락) → 근거(중단 H2들) → 자주 묻는 질문 (마지막).
- **네이버 블로그 감성의 글 스타일**:
  - 모바일 가독성을 높이기 위해 각 문단(paragraph)은 1~3줄로 매우 짧게 구성하고 줄바꿈을 자주 하세요.
  - 강조하고 싶은 단어, 핵심 장소, 고객 혜택 등에는 이탤릭체(\`*텍스트*\` 즉, em 태그)를 사용하여 본문 내 형광펜 하이라이트 효과를 연출하세요.
  - 중요한 메시지, 슬로건, 업체 이름 강조, 주의 사항 등은 인용구(\`> 텍스트\` 즉, blockquote 태그)를 적극적으로 활용하여 큰 따옴표 인용구 블록(“ ... ”)으로 만들어 진짜 블로그 본문처럼 느껴지게 구성하세요.
- FAQ 답변에서도 가격·할인율·전화번호를 사실로 단정하지 않습니다 (예: "가격은 매장에 문의" OK).`;

  return `[사진 설명]
${photoBlock}

[파트너 입력]
- 매장/서비스명: ${args.businessName}
${keywordBlock}
${sloganBlock}
- brandTone: ${args.brandTone}
${styleBlock}${ragBlock}${templateBlock}
위 사진 설명과 파트너 입력만 근거로 자연스러운 한국어 홍보 ${isCardNews ? "카드뉴스" : "블로그 글"}를 쓰세요.
규칙:
- 사진에 없는 가격·전화번호·할인율을 지어내지 않습니다.
- 자기 매장 상호명(${args.businessName})은 자연스럽게 1~2회 언급.
- 청광·경쟁업체 직접 언급/비방 금지.
- "최저가", "업계 1위", "만족도 100%" 등 단정 광고 표현 금지.
- "[사진 1]", "[사진 2]" 같은 사진 번호 placeholder 본문에 쓰지 않습니다 (블로그는 단일 커버만).${aeoRule}
${formatRule}
- 결과를 JSON으로 반환.`;
}

async function composeDraft(args: {
  visionDescs: PhotoDescription[];
  businessName: string;
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  styleRefs: Post[];
  /** v1.11 cycle #24 */
  ragContextSection?: string;
  /** v1.12 cycle #25 — admin contentTemplate 직렬화 텍스트. */
  templateContext?: string;
  /** v1.12 cycle #25 — 'blog' (default) | 'card-news'. */
  format?: PostFormat;
}): Promise<PartnerDraft> {
  if (!genAI)
    throw new AppError(
      "LLM_FAILURE",
      "GOOGLE_GENERATIVE_AI_API_KEY 미설정",
    );
  const isCardNews = args.format === "card-news";
  const responseSchema = isCardNews
    ? patchComposeSchemaForCardNews(composeSchema)
    : composeSchema;
  const systemInstruction = isCardNews
    ? "당신은 사진과 파트너 입력을 바탕으로 SEO 친화적 B2B 매장 홍보 카드뉴스를 쓰는 한국어 카피라이터입니다. 주어진 자료만 근거로 슬라이드형 짧은 텍스트를 작성하며, 허위 정보(가격·전화번호·약속·과장)를 절대 쓰지 않습니다."
    : "당신은 사진과 파트너 입력을 바탕으로 SEO 친화적 B2B 매장 홍보 블로그를 쓰는 한국어 카피라이터입니다. 주어진 자료만 근거로 글을 쓰며, 허위 정보(가격·전화번호·약속·과장)를 절대 쓰지 않습니다.";

  const model = genAI.getGenerativeModel({
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
      String(parsed.title ?? "").slice(0, 30) || `${args.businessName} 매장 이야기`,
    summary80: String(parsed.summary80 ?? "").slice(0, 80),
    bodyMarkdown: String(parsed.bodyMarkdown ?? ""),
    coverImageAlt: String(parsed.coverImageAlt ?? "").slice(0, 80),
  };
}

// ─── Cleanup helper (H2) ─────────────────────────────────

/**
 * Storage `/partners/{uid}/{postId}/` 디렉터리 일괄 삭제.
 * - hygiene fail / Vision·Compose 실패 / Firestore.create 실패 시 호출
 * - DELETE draft 라우트에서도 사용 (Firestore 삭제 후 호출, H6)
 */
export async function cleanupPartnerPostPhotos(
  uid: string,
  postId: string,
): Promise<void> {
  try {
    const bucket = adminStorage.bucket(getStorageBucketName());
    const prefix = `partners/${uid}/${postId}/`;
    await bucket.deleteFiles({ prefix });
  } catch (e) {
    console.warn("[partner-promo cleanup] 실패", { uid, postId, e });
    // 비동기 best-effort — 실패해도 main flow에 throw하지 않음
  }
}

// ─── Orchestration ───────────────────────────────────────

export interface GeneratePartnerPromoInput {
  uid: string;
  partnerId: string;
  postId: string; // pre-allocated nanoid (Storage 경로와 일관)
  photoUrls: string[];
  keywords: string[];
  slogan: string | null;
  brandTone: BrandTone;
  businessName: string;
  /** v1.12 cycle #25 — 'blog' (default) | 'card-news'. R1: optional, 미지정 시 cycle #24 동일 동작. */
  format?: PostFormat;
  /** v1.12 cycle #25 — admin contentTemplate 직렬화 텍스트 (선택된 템플릿 있을 때만). */
  templateContext?: string;
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
  /** v1.12 cycle #25 — 결과 형식. 입력 format 또는 fallback 결과 ('card-news' 검증 실패 시 'blog'). */
  format: PostFormat;
  /** v1.12 cycle #25 — card-news 검증 실패 후 blog로 fallback 재compose된 경우 true. */
  cardNewsValidationFailed?: boolean;
}

/**
 * Vision → RAG → Compose → Hygiene. **저장하지 않음** — 결과만 반환.
 *
 * v1.11 cycle #24 — partner profile + admin templates를 RAG context 1단으로 추가.
 * 진입점/시그니처 변경 0건 (R1). input·output 모두 cycle #19 그대로.
 */
export async function generatePartnerPromoDraft(
  input: GeneratePartnerPromoInput,
): Promise<PartnerPromoDraftResult> {
  // 1. Vision 병렬
  const visionDescs = await Promise.all(
    input.photoUrls.map(describePhoto),
  );
  const allTags = Array.from(
    new Set(
      visionDescs
        .flatMap((d) => d.tags)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ).slice(0, 20);

  // 2. RAG (자기 자신 제외 — H3)
  const ragPosts = await retrievePartnerStyleReferences(allTags, {
    excludeOwnerUid: input.uid,
    limit: 5,
  });

  // v1.11 cycle #24 — partner profile + templates 통합 RAG context
  // 동적 import로 cycle #19 코드 변경 영향 최소화
  const { partnerProfileRepository } = await import(
    "@/lib/firebase/partner-profile-repository"
  );
  const { getRagContext, buildRagContextSection } = await import(
    "./partner-rag-context"
  );
  const profile = await partnerProfileRepository.getProfile(input.partnerId);
  // visionTags·excludeOwnerUid는 안 넘김 — cycle #19 ragPosts를 이미 위에서 retrieve해서 중복 회피.
  const ragContext = await getRagContext({
    partnerId: input.partnerId,
    profile,
  });
  const ragContextSection = buildRagContextSection(ragContext);

  // 3. Compose (RAG 실패/빈 결과면 fallback 재시도)
  // v1.12 cycle #25: format/templateContext 전달 + card-news 검증 + fallback chain (H5·H6)
  const requestedFormat: PostFormat = input.format ?? "blog";
  const baseArgs = {
    visionDescs,
    businessName: input.businessName,
    keywords: input.keywords,
    slogan: input.slogan,
    brandTone: input.brandTone,
    templateContext: input.templateContext,
  };

  let draft: PartnerDraft;
  let resultFormat: PostFormat = requestedFormat;
  let cardNewsValidationFailed = false;

  try {
    draft = await composeDraft({
      ...baseArgs,
      styleRefs: ragPosts,
      ragContextSection,
      format: requestedFormat,
    });
  } catch (e) {
    console.warn(
      "[partner-promo-generator] compose failed, retrying without RAG",
      e,
    );
    draft = await composeDraft({
      ...baseArgs,
      styleRefs: [],
      ragContextSection: "",
      format: requestedFormat,
    });
  }

  // card-news post-process 검증 + 1회 retry + blog fallback (H5)
  if (requestedFormat === "card-news") {
    const v1 = validateCardNewsBody(draft.bodyMarkdown);
    if (!v1.ok) {
      console.warn(
        `[partner-promo-generator] card-news validation failed (${v1.reason}), retrying`,
      );
      try {
        draft = await composeDraft({
          ...baseArgs,
          styleRefs: ragPosts,
          ragContextSection,
          format: "card-news",
        });
        const v2 = validateCardNewsBody(draft.bodyMarkdown);
        if (!v2.ok) {
          console.warn(
            `[partner-promo-generator] card-news retry failed (${v2.reason}), falling back to blog`,
          );
          // blog로 재compose
          draft = await composeDraft({
            ...baseArgs,
            styleRefs: ragPosts,
            ragContextSection,
            format: "blog",
          });
          resultFormat = "blog";
          cardNewsValidationFailed = true;
        }
      } catch (e) {
        console.warn(
          "[partner-promo-generator] card-news retry threw, falling back to blog",
          e,
        );
        draft = await composeDraft({
          ...baseArgs,
          styleRefs: [],
          ragContextSection: "",
          format: "blog",
        });
        resultFormat = "blog";
        cardNewsValidationFailed = true;
      }
    }
  }

  // 4. Hygiene (partner-promo 룰 포함)
  const hygiene = checkMarkdownHygiene(
    draft.bodyMarkdown,
    draft.title,
    draft.summary80,
    { postType: "partner-promo" },
  );

  // v1.11 cycle #24 — ragSourceIds = profile + templates + style (max 20)
  // cycle #19 ragPosts는 generator가 이미 retrieve했으므로 여기서 합산.
  const ragSourceIds = [
    ...ragContext.ragSourceIds, // profile/{id}, template/{id}
    ...ragPosts.map((p) => `post/${p.id}`),
  ].slice(0, 20);

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
