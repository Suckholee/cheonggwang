/**
 * 일회성 — 이미 submitted 상태인 모든 quoteRequest에 샘플 견적 주입.
 * 최근 로그인 고객이 제출한 "요청 중" 건이 바로 살아나게.
 *
 * 사용:  node --env-file=.env.local scripts/trigger-sample-quotes-once.mjs
 */
import { initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} from "@google/generative-ai";

const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const MODEL =
  process.env.GOOGLE_GENERATIVE_AI_CHAT_MODEL ||
  process.env.GOOGLE_GENERATIVE_AI_MODEL ||
  "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI(apiKey);

const QUOTE_LABEL = {
  "move-in": "입주청소",
  office: "사무실청소",
  aircon: "에어컨청소",
  "move-out": "이사청소",
  special: "특수청소",
  regular: "정기청소",
};

function priceHint(cat, p) {
  const sz = p && p > 0 ? p : 20;
  switch (cat) {
    case "move-in": return [sz * 7000, sz * 11000];
    case "move-out": return [sz * 6000, sz * 9500];
    case "regular": return [150000, 320000];
    case "office": return [200000, 500000];
    case "aircon": return [100000, 160000];
    case "special": return [300000, 800000];
    default: return [150000, 300000];
  }
}

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          price: { type: SchemaType.INTEGER },
          note: { type: SchemaType.STRING },
        },
        required: ["label", "price", "note"],
      },
    },
    estimatedWorkHours: { type: SchemaType.INTEGER },
    message: { type: SchemaType.STRING },
  },
  required: ["items", "estimatedWorkHours", "message"],
};

async function generate(provider, req) {
  const [lo, hi] = priceHint(req.category, req.size);
  const catLabel = QUOTE_LABEL[req.category];
  const system = `당신은 "${provider.companyName}" 청소 업체 운영자입니다.
[가격 가이드] ${catLabel} 총액 범위: ${lo.toLocaleString()}원 ~ ${hi.toLocaleString()}원
- items: 기본(70~85%) + 옵션 1~2개, 합이 범위 안, 1000원 단위
- message: 80자 이내 친근한 존댓말 1~2문장
JSON으로만 응답.`;
  const user = `[요청] ${catLabel} · ${req.region?.city} ${req.region?.district} · ${req.size || "미지정"}${req.size ? "평" : ""} · 메모: ${req.note || "(없음)"}`;
  const model = genAI.getGenerativeModel({
    model: MODEL,
    safetySettings: SAFETY,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });
  const result = await model.generateContent(user);
  const p = JSON.parse(result.response.text());
  p.items = (p.items || []).map((i) => ({
    label: String(i.label || "기본").slice(0, 30),
    price: Math.max(10000, Math.min(10000000, Number(i.price) || 0)),
    note: String(i.note || "").slice(0, 100),
  }));
  if (p.items.length === 0) {
    p.items = [{ label: `${catLabel} 기본`, price: Math.round((lo + hi) / 2 / 1000) * 1000, note: "" }];
  }
  p.estimatedWorkHours = Math.max(1, Math.min(12, Number(p.estimatedWorkHours) || 4));
  p.message = String(p.message || "견적 확인 후 연락드리겠습니다.").slice(0, 200);
  return p;
}

function threadId(requestId, providerId) {
  return `${requestId}__${providerId}`;
}

function mask(name) {
  if (!name) return "고객";
  if (name.length <= 2) return name[0] + "*";
  return name[0] + "*" + name.slice(-1);
}

async function processOne(req) {
  const reqId = req.id;
  const data = req.data;
  console.log(`\n== req ${reqId} · ${data.category} ${data.size || "?"}평 · ${data.region?.district}`);

  const snap = await db
    .collection("providers")
    .where("isSample", "==", true)
    .where("categories", "array-contains", data.category)
    .get();
  const candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(() => Math.random() - 0.5).slice(0, 3);
  console.log(`  candidates: ${candidates.map((c) => c.companyName).join(", ")}`);

  const clientSnap = await db.collection("users").doc(data.clientUid).get();
  const clientName = clientSnap.exists ? (clientSnap.data().displayName || null) : null;

  for (const p of candidates) {
    try {
      const gen = await generate(
        { companyName: p.companyName, categories: p.categories, regions: p.regions, slogan: p.slogan },
        { category: data.category, region: data.region, size: data.size, note: data.note },
      );
      const totalAmount = gen.items.reduce((s, it) => s + it.price, 0);
      const quoteRef = db.collection("quotes").doc();
      const quoteId = quoteRef.id;
      const prRef = db.collection("providerResponses").doc(`${p.id}_${reqId}`);
      const reqRef = db.collection("quoteRequests").doc(reqId);
      const tid = threadId(reqId, p.id);
      const threadRef = db.collection("threads").doc(tid);
      const msgRef = threadRef.collection("messages").doc();
      const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      await db.runTransaction(async (tx) => {
        // 모든 READ 먼저
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists) return;
        const prSnap = await tx.get(prRef);
        if (prSnap.exists && prSnap.data().status === "quoted") return;
        const threadSnap = await tx.get(threadRef);
        const threadExists = threadSnap.exists;
        const currentStatus = String(reqSnap.data().status || "");
        // 이하 WRITE
        tx.create(quoteRef, {
          requestId: reqId, providerId: p.id, clientUid: data.clientUid,
          items: gen.items.map((i) => ({ label: i.label, price: i.price, note: i.note || null })),
          scheduledAt: Timestamp.fromDate(scheduledAt),
          estimatedWorkHours: gen.estimatedWorkHours,
          totalAmount,
          insured: true,
          insuranceAmount: 500000000,
          status: "sent",
          sentAt: FieldValue.serverTimestamp(),
          acceptedAt: null, rejectedAt: null,
          isSampleAi: true,
        });
        tx.set(prRef, {
          providerId: p.id, requestId: reqId, status: "quoted",
          respondedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        if (currentStatus === "submitted") {
          tx.update(reqRef, { status: "quoted" });
        }
        const threadBase = {
          clientUid: data.clientUid,
          providerId: p.id,
          providerOwnerUid: p.ownerUid,
          requestId: reqId,
          quoteId,
          companyName: p.companyName,
          clientDisplayName: mask(clientName || data.clientUid.slice(0, 6)),
        };
        if (threadExists) {
          tx.update(threadRef, {
            ...threadBase,
            lastMessageAt: FieldValue.serverTimestamp(),
            lastMessagePreview: gen.message.slice(0, 80),
            lastMessageSenderUid: p.ownerUid,
            unreadByClient: FieldValue.increment(1),
          });
        } else {
          tx.create(threadRef, {
            ...threadBase,
            lastMessageAt: FieldValue.serverTimestamp(),
            lastMessagePreview: gen.message.slice(0, 80),
            lastMessageSenderUid: p.ownerUid,
            unreadByClient: 2,
            unreadByProvider: 0,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        tx.create(msgRef, {
          threadId: tid,
          senderUid: p.ownerUid,
          senderRole: "provider",
          type: "text",
          text: gen.message,
          createdAt: FieldValue.serverTimestamp(),
          isSampleAi: true,
        });
      });
      console.log(`  ✓ ${p.companyName} · ${totalAmount.toLocaleString()}원`);
    } catch (err) {
      console.warn(`  ✗ ${p.companyName} FAIL:`, err?.message || err);
    }
  }
}

(async () => {
  const snap = await db.collection("quoteRequests").where("status", "==", "submitted").limit(20).get();
  console.log(`submitted: ${snap.size}`);
  for (const d of snap.docs) {
    await processOne({ id: d.id, data: d.data() });
  }
  console.log("\ndone");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
