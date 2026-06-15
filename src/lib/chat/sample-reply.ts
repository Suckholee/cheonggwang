import "server-only";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { QUOTE_CATEGORY_LABELS } from "@/domain/quote-category";
import type { Provider } from "@/types/provider";

/**
 * v1.6 — 샘플 청명 계정용 AI 자동 응답.
 *
 * 고객이 샘플 청명에게 메시지를 보내면 해당 청명 오너 UID로 Gemini가 생성한 응답을
 * 같은 thread의 messages 서브컬렉션에 삽입. 실사용자 응답과 동일한 경로로 흐름.
 *
 * 조건:
 *  - thread의 providerOwnerUid 에 해당하는 user가 `isSample: true`
 *  - 메시지 sender 는 client 측 (청명 → 고객 방향에는 응답하지 않음)
 *
 * 호출 컨텍스트: `sendMessage` server action 의 TX 커밋 직후.
 * 실패해도 원본 메시지 흐름엔 영향 없음 (try/catch + 로그).
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

interface ThreadMeta {
  threadId: string;
  clientUid: string;
  providerOwnerUid: string;
  providerId: string;
  companyName: string;
}

interface SenderMeta {
  uid: string;
  role: "client" | "provider";
}

interface HistoryItem {
  senderRole: "client" | "provider" | "system";
  text: string;
  type?: string;
}

async function isSampleOwner(providerOwnerUid: string): Promise<boolean> {
  const snap = await adminDb
    .collection("users")
    .doc(providerOwnerUid)
    .get();
  if (!snap.exists) return false;
  const data = snap.data() as { isSample?: unknown } | undefined;
  return data?.isSample === true;
}

async function fetchProvider(providerId: string): Promise<Provider | null> {
  const snap = await adminDb.collection("providers").doc(providerId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as Omit<Provider, "id">) };
}

async function fetchRecentMessages(
  threadId: string,
  limit = 8,
): Promise<HistoryItem[]> {
  const snap = await adminDb
    .collection("threads")
    .doc(threadId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs
    .map((d) => {
      const data = d.data() as {
        senderRole?: unknown;
        text?: unknown;
        type?: unknown;
      };
      return {
        senderRole: (data.senderRole as HistoryItem["senderRole"]) ?? "system",
        text: String(data.text ?? ""),
        type: typeof data.type === "string" ? data.type : undefined,
      };
    })
    .reverse();
}

const replySchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    text: {
      type: SchemaType.STRING,
      description: "고객에게 보낼 자연스러운 응답 (1~3문장, 50~200자)",
    },
  },
  required: ["text"],
};

function buildSystemPrompt(provider: Provider): string {
  const categories = (provider.categories || [])
    .map((c) => QUOTE_CATEGORY_LABELS[c])
    .filter(Boolean)
    .join(", ");
  const regions = (provider.regions || [])
    .slice(0, 3)
    .map((r) => `${r.city} ${r.district}`)
    .join(", ");

  return `당신은 한국 청소 마켓플레이스 '청광'에서 "${provider.companyName}" 업체 운영자입니다.
고객의 문의 채팅에 답변합니다.

[업체 정보]
- 업체명: ${provider.companyName}
- 서비스 카테고리: ${categories || "일반 청소"}
- 활동 지역: ${regions || "서울/경기"}
- 소개: ${provider.description ?? "없음"}
- 슬로건: ${provider.slogan ?? ""}

[대화 규칙]
- 친근한 존댓말 · 1~3 문장 · 50~200자
- 확정되지 않은 가격·일정을 단정하지 않음. "방문 견적이 필요해요" 등으로 완곡.
- 지어낸 인증·보험·수치 금지. 카탈로그/홍보 멘트 금지.
- 이모지는 최대 1개.
- 고객이 이미 충분히 얘기하면 짧게 맞장구만 쳐도 됨.
- 이 채팅은 샘플 데모이므로 실제 예약/결제는 유도하지 않음. 작업·가격·일정은 "방문·통화로 확인"으로 유도.

JSON 으로만 응답:
{ "text": "답변 본문" }`;
}

function buildUserPrompt(history: HistoryItem[], latestText: string): string {
  const excerpts = history
    .map((h) => {
      if (h.senderRole === "system") return `[시스템] ${h.text}`;
      const who = h.senderRole === "client" ? "고객" : "청명(나)";
      return `${who}: ${h.text}`;
    })
    .join("\n");

  return `[최근 대화]
${excerpts || "(첫 메시지)"}

[방금 고객이 보낸 메시지]
${latestText}

위 대화 맥락에 맞춰 청명(나)로서 자연스럽게 답장하세요. JSON으로만.`;
}

function cleanAndParseJson(raw: string): any {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && start < end) {
      const jsonCandidate = trimmed.substring(start, end + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerErr: any) {
        throw new Error(`Failed to parse JSON candidate: ${innerErr.message}`);
      }
    }
    throw e;
  }
}

function generateCustomerFallbackReply(
  latestText: string,
  customerName: string,
  persona: SamplePersona,
  history: HistoryItem[]
): string {
  const text = latestText.toLowerCase();
  const clientMsgCount = history.filter(h => h.senderRole === "client").length;
  
  const isGreeting = /안녕|반갑|문의|제안|견적|의뢰|확인/.test(text);
  const isSchedule = /일정|날짜|시간|예약|언제|주말|평일|요일|요일/.test(text);
  const isPricing = /추가|요금|비용|금액|결제|현금|카드|부가세|돈|만원/.test(text);
  const isScope = /범위|창틀|베란다|곰팡이|오염|세제|탈거|분리|피톤치드|스팀/.test(text);
  const isContact = /전화|통화|번호|연락|휴대폰/.test(text);

  let templates: string[] = [];

  if (isContact) {
    templates = [
      `네, 연락처는 010-1234-5678입니다. 편하신 시간대에 전화 주시면 상세내용 안내받을게요!`,
      `지금은 근무 중이라 전화를 받기 조금 어려워요. 궁금한 사항은 여기 채팅으로 남겨주시면 확인 후 바로 답장드리겠습니다.`,
      `방문 견적이 필요하시다면 주말 중에 가능한 시간대를 알려주세요. 직접 상태를 보고 말씀 나누는 게 정확할 것 같아요.`
    ];
  } else if (isSchedule) {
    templates = [
      `일정의 경우 다음 주 주말 오전 시간대(토요일 아침 9시쯤)를 희망하는데, 혹시 진행 가능하신가요?`,
      `혹시 평일 이른 아침 시간에도 시작할 수 있나요? 이삿짐 들어오는 시간 전에 청소를 완료하고 싶어서요.`,
      `일정은 아직 정확히 정해지지 않았는데, 혹시 예약 후에 일정 변경이나 취소 규정은 어떻게 되는지 알려주세요.`
    ];
  } else if (isPricing) {
    templates = [
      `상세히 견적 안내해 주셔서 감사합니다. 혹시 카드 결제나 현금영수증 발행 시 추가 수수료가 붙는지 궁금해요.`,
      `예산이 조금 빠듯해서 그런데, 혹시 베란다 쪽 청소를 제외하면 견적 금액을 조금 더 낮출 수 있을까요?`,
      `현장 오염도가 높다고 해서 당일에 갑자기 추가 요금이 많이 청구되는 것은 아닌지 조금 걱정스럽네요.`
    ];
  } else if (isScope) {
    templates = [
      `환풍기 탈거나 싱크대 하단 걸레받이 안쪽까지도 전부 분리해서 내부 세척을 해 주시는 범위인가요?`,
      `창틀 오염이 심하고 다용도실 쪽에 곰팡이가 조금 쓸어 있는데, 이것도 추가금 없이 닦아주시는 건지 알고 싶어요.`,
      `저희 집에 어린아이이가 있어서 그런데, 청소할 때 친환경 인증 세제를 사용하시나요?`
    ];
  } else if (isGreeting) {
    const householdDetail = persona.household ? `저희 집은 ${persona.household}이고, ` : "";
    templates = [
      `안녕하세요! ${householdDetail}보내주신 견적 잘 확인했습니다. 꼼꼼히 청소 잘해주실 수 있는지 궁금해요.`,
      `안녕하세요, 견적서 감사합니다! 금액은 합리적인 것 같아 다른 곳들과도 비교해 보는 중입니다. 보통 하루에 한 팀만 예약 받으시나요?`,
      `네, 확인 감사해요. 서비스 진행하실 때 세제 잔여물 남지 않게 깨끗하게 마무리 잘 해주시는지 물어보고 싶어요.`
    ];
  } else {
    templates = [
      `자세하게 설명해 주셔서 감사해요. 알려주신 내용 바탕으로 가족들과 의논해 보고 오늘 저녁 내로 확정해서 연락드릴게요!`,
      `네, 잘 알겠습니다. 그럼 예약을 정식으로 확정하려면 화면에 있는 일정 확정 버튼을 바로 누르면 되나요?`,
      `아, 그렇군요! 이해했습니다. 당일 작업 시작 시점과 완료 시점에 제가 현장에 꼭 동반해야 하는지 여쭤봅니다.`
    ];
  }

  const index = clientMsgCount % templates.length;
  return templates[index];
}

function generateProviderFallbackReply(
  latestText: string,
  provider: Provider,
  history: HistoryItem[]
): string {
  const text = latestText.toLowerCase();
  const providerMsgCount = history.filter(h => h.senderRole === "provider").length;

  const isGreeting = /안녕|견적|의뢰|문의|확인/.test(text);
  const isSchedule = /일정|날짜|시간|예약|언제|주말|평일|요일|요일/.test(text);
  const isPricing = /추가|요금|비용|금액|결제|현금|카드|만원|얼마/.test(text);
  const isScope = /범위|창틀|베란다|곰팡이|오염|세제|탈거|분리|스팀/.test(text);
  const isContact = /전화|통화|번호|연락|핸드폰/.test(text);

  let templates: string[] = [];

  if (isContact) {
    templates = [
      `유선 연결이나 방문 견적 일정을 위해 통화를 원하시면 채팅창의 연락처로 전화 주시거나 편하신 통화 시간대를 말씀해 주세요. 빠르게 전화드리겠습니다.`,
      `네, 고객님! 통화로 자세한 상황을 설명드리면 오해 없이 깔끔한 진행이 가능합니다. 언제든 편하신 시간대에 연락 남겨주시면 통화 도와드릴게요.`
    ];
  } else if (isSchedule) {
    templates = [
      `고객님께서 희망하시는 일정에 최대한 맞춰드릴 수 있습니다. 구체적인 날짜와 원하시는 시간대를 말씀해 주시면 스케줄을 즉시 확인해 드리겠습니다.`,
      `주말과 공휴일 일정은 인기가 많아 조기 예약 마감될 수 있습니다. 일정이 정해지셨다면 주저 마시고 일정을 미리 등록해 주세요!`
    ];
  } else if (isPricing) {
    templates = [
      `저희 견적은 기본 범위를 포함하고 있으나, 현장의 특수 오염이나 심한 곰팡이, 다용도실 비확장 등에 따라 약간의 추가 요금이 발생할 수 있으니 양해 부탁드립니다.`,
      `네, 고객님. 세금계산서 및 현금영수증 발행, 카드 결제 모두 투명하게 지원하고 있으니 원하시는 방식으로 결제해 주시면 됩니다.`
    ];
  } else if (isScope) {
    templates = [
      `기본 청소 범위에는 탈거 가능한 모든 서랍장 내부, 싱크대 하단, 전등 커버, 창틀 및 베란다가 포함되며, 고온 스팀 장비로 찌든 때를 말끔히 살균 세척합니다.`,
      `안전하고 검증된 친환경 친화성 전문 세제를 사용하여 인체에 무해하며, 청소 후 냄새나 잔여 세제가 남지 않도록 맑은 물로 꼼꼼하게 여러 번 반복 청소합니다.`
    ];
  } else if (isGreeting) {
    templates = [
      `안녕하세요! 꼼꼼하고 깨끗한 청소 서비스를 약속드리는 "${provider.companyName}"입니다. 문의주신 견적에 대해 궁금하신 점이 있으시면 편하게 물어보세요!`,
      `소중한 고객님의 공간을 내 집처럼 깨끗하고 위생적으로 케어해 드리겠습니다. 추가 요청 사항이나 조율할 부분이 있다면 언제든 알려주세요.`
    ];
  } else {
    templates = [
      `네, 고객님! 무엇이든 편하게 상의해 주시고, 예약을 확정하고 싶으실 때는 화면 상단의 '일정 확정' 버튼을 탭해 주시면 즉시 일정이 홀딩됩니다. 감사합니다!`,
      `상세한 예약 절차나 궁금하신 부분은 언제든지 물어봐 주세요. 친절하고 꼼꼼하게 준비하여 만족스러운 청소 결과로 보답하겠습니다.`
    ];
  }

  const index = providerMsgCount % templates.length;
  return templates[index];
}

async function callGemini(system: string, prompt: string): Promise<string | null> {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      safetySettings: SAFETY,
      systemInstruction: system,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: replySchema,
        temperature: 0.85,
        maxOutputTokens: 2048,
      },
    });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = cleanAndParseJson(raw) as { text?: string };
    return (parsed.text ?? "").trim().slice(0, 300) || null;
  } catch (err) {
    console.warn("[callGemini] failed", err);
    return null;
  }
}

/**
 * 메시지 전송 직후 호출. 수신자가 샘플 청명이면 Gemini 응답 생성 후 thread에 insert.
 * 실패해도 원본 메시지 흐름엔 영향 X (throw 하지 않음).
 */
export async function maybeTriggerSampleReply(
  thread: ThreadMeta,
  sender: SenderMeta,
  latestText: string,
): Promise<void> {
  try {
    // 청명 → 고객 방향 메시지는 자동 응답 X (무한 루프 방지)
    if (sender.role !== "client") return;

    const isSample = await isSampleOwner(thread.providerOwnerUid);
    if (!isSample) return;

    const [provider, history] = await Promise.all([
      fetchProvider(thread.providerId),
      fetchRecentMessages(thread.threadId, 8),
    ]);
    if (!provider) return;

    let text = await callGemini(
      buildSystemPrompt(provider),
      buildUserPrompt(history, latestText),
    );
    if (!text) {
      text = generateProviderFallbackReply(latestText, provider, history);
    }
    if (!text) return;

    const threadRef = adminDb.collection("threads").doc(thread.threadId);
    const messageRef = threadRef.collection("messages").doc();
    await adminDb.runTransaction(async (tx) => {
      tx.create(messageRef, {
        threadId: thread.threadId,
        senderUid: thread.providerOwnerUid,
        senderRole: "provider",
        type: "text",
        text,
        createdAt: FieldValue.serverTimestamp(),
        isSampleAi: true,
      });
      tx.update(threadRef, {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: text!.slice(0, 80),
        lastMessageSenderUid: thread.providerOwnerUid,
        unreadByClient: FieldValue.increment(1),
      });
    });
  } catch (err) {
    console.warn("[sample-reply] trigger failed", err);
  }
}

// ─── 반대 방향: provider → sample customer AI 응답 ─────
// 청명이 샘플 고객에게 메시지 보낼 때 고객 페르소나로 Gemini 응답 생성.

interface SamplePersona {
  age?: number;
  occupation?: string;
  household?: string;
  region?: string;
  goal?: string;
  interestedCategories?: string[];
  monthlyBudget?: number;
  oneLiner?: string;
}

async function fetchCustomerPersona(
  uid: string,
): Promise<{ displayName: string; persona: SamplePersona } | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as Record<string, unknown>;
  if (data.isSample !== true) return null;
  const p = data.persona as Record<string, unknown> | undefined;
  if (!p) return null;
  return {
    displayName: String(data.displayName ?? "고객"),
    persona: {
      age: typeof p.age === "number" ? p.age : undefined,
      occupation:
        typeof p.occupation === "string" ? p.occupation : undefined,
      household:
        typeof p.household === "string" ? p.household : undefined,
      region: typeof p.region === "string" ? p.region : undefined,
      goal: typeof p.goal === "string" ? p.goal : undefined,
      interestedCategories: Array.isArray(p.interestedCategories)
        ? (p.interestedCategories as string[])
        : undefined,
      monthlyBudget:
        typeof p.monthlyBudget === "number" ? p.monthlyBudget : undefined,
      oneLiner:
        typeof p.oneLiner === "string" ? p.oneLiner : undefined,
    },
  };
}

function buildCustomerSystemPrompt(
  name: string,
  persona: SamplePersona,
): string {
  return `당신은 한국 청소 마켓플레이스 '청광'을 이용하는 고객 "${name}" 입니다.
청명(청소업체)에게 답장하는 상황이고, 아래 페르소나를 일관되게 유지해야 합니다.

[페르소나]
- 나이: ${persona.age ?? "비공개"}
- 직업: ${persona.occupation ?? "비공개"}
- 가구 구성: ${persona.household ?? "비공개"}
- 거주/공간: ${persona.region ?? "비공개"}
- 청소 서비스 이용 동기: ${persona.goal ?? "생활 편의"}
- 월 예산: ${persona.monthlyBudget ? Math.round(persona.monthlyBudget / 10000) + "만원 내외" : "미정"}
- 한줄 특징: ${persona.oneLiner ?? ""}

[대화 규칙]
- 친근한 존댓말 · 1~2문장 · 50~180자
- 위 페르소나가 느끼는 관심/우려/시간 제약을 자연스럽게 녹일 것
- 이 채팅은 샘플 데모이므로 실제 결제·확정은 유도하지 않음
- 구체 일정·가격은 "나중에 다시 말씀드릴게요" 식으로 여지 두기
- 이모지 최대 1개
- 청명이 보낸 메시지에 맞춰 자연스럽게 반응

JSON 으로만 응답:
{ "text": "답변 본문" }`;
}

export async function maybeTriggerSampleCustomerReply(
  thread: {
    threadId: string;
    clientUid: string;
    providerOwnerUid: string;
    providerId: string;
    companyName: string;
  },
  sender: { uid: string; role: "client" | "provider" },
  latestText: string,
): Promise<void> {
  try {
    // provider → customer 방향만 (루프 방지)
    if (sender.role !== "provider") return;

    const customer = await fetchCustomerPersona(thread.clientUid);
    if (!customer) return;

    const history = await fetchRecentMessages(thread.threadId, 8);
    const system = buildCustomerSystemPrompt(
      customer.displayName,
      customer.persona,
    );
    const prompt = buildUserPrompt(history, latestText);
    let text = await callGemini(system, prompt);
    if (!text) {
      text = generateCustomerFallbackReply(
        latestText,
        customer.displayName,
        customer.persona,
        history
      );
    }
    if (!text) return;

    const threadRef = adminDb.collection("threads").doc(thread.threadId);
    const messageRef = threadRef.collection("messages").doc();
    await adminDb.runTransaction(async (tx) => {
      tx.create(messageRef, {
        threadId: thread.threadId,
        senderUid: thread.clientUid,
        senderRole: "client",
        type: "text",
        text,
        createdAt: FieldValue.serverTimestamp(),
        isSampleAi: true,
      });
      tx.update(threadRef, {
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessagePreview: text!.slice(0, 80),
        lastMessageSenderUid: thread.clientUid,
        unreadByProvider: FieldValue.increment(1),
      });
    });
  } catch (err) {
    console.warn("[sample-customer-reply] trigger failed", err);
  }
}
