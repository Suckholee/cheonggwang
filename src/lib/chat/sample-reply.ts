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

async function callGemini(system: string, prompt: string): Promise<string> {
  if (!genAI) return "메시지 감사합니다. 자세한 건 방문이나 전화로 안내드릴게요.";
  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings: SAFETY,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: replySchema,
      temperature: 0.85,
      maxOutputTokens: 256,
    },
  });
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  try {
    const parsed = JSON.parse(raw) as { text?: string };
    const text = (parsed.text ?? "").trim();
    return text.slice(0, 300) || "네, 알겠습니다.";
  } catch {
    return "네, 알겠습니다. 방문 견적이 필요해서 전화로 이어서 말씀드릴게요.";
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

    const text = await callGemini(
      buildSystemPrompt(provider),
      buildUserPrompt(history, latestText),
    );
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
        lastMessagePreview: text.slice(0, 80),
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
    const text = await callGemini(system, prompt);
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
        lastMessagePreview: text.slice(0, 80),
        lastMessageSenderUid: thread.clientUid,
        unreadByProvider: FieldValue.increment(1),
      });
    });
  } catch (err) {
    console.warn("[sample-customer-reply] trigger failed", err);
  }
}
