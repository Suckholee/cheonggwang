/**
 * v1.6 — 샘플 계정 + 커뮤니티 포스트 시드.
 *
 * 생성물:
 *   - 청명(provider) 15명: Firebase Auth + users/{uid} + providers/{providerId}
 *   - 고객(customer) 20명: Firebase Auth + users/{uid}
 *   - 각 청명당 커뮤니티 포스트 1개 (Gemini 생성, storyCategory 분산)
 *   - customer-story 포스트 5개 (고객 스토리, 사진 없이 텍스트 기반)
 *
 * 모든 문서에 `isSample: true` · UI 배지로 투명 고지.
 *
 * 사용:
 *   node --env-file=.env.local scripts/seed-sample-data.mjs          # dry-run
 *   node --env-file=.env.local scripts/seed-sample-data.mjs --apply  # 실제 실행
 *
 * 출력:
 *   실행 종료 시 "scripts/.sample-credentials.txt" 에 아이디/비밀번호 테이블 덤프.
 */
import { initializeApp, cert } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const APPLY = process.argv.includes("--apply");

// ─── Admin SDK ───────────────────────────────────────────
const b64 = process.env.FIREBASE_ADMIN_SA_BASE64;
if (!b64) {
  console.error("FIREBASE_ADMIN_SA_BASE64 not set");
  process.exit(1);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
initializeApp({ credential: cert(sa), projectId: sa.project_id });
const db = getFirestore();
const auth = getAuth();

// ─── Gemini ──────────────────────────────────────────────
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const MODEL =
  process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-2.5-flash";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ─── 데이터 시드 ─────────────────────────────────────────
const PROVIDERS = [
  ["new_spring_home", "새봄홈서비스", ["move-in", "move-out"], [["서울특별시", "용산구"], ["서울특별시", "성동구"]], "friendly", "새봄처럼 깨끗한 시작"],
  ["bright_world", "깨끗한세상", ["regular", "office"], [["서울특별시", "마포구"], ["서울특별시", "서대문구"]], "friendly", "매일이 청결한 세상"],
  ["sparkle_house", "반짝이는집", ["regular"], [["서울특별시", "강남구"]], "playful", "반짝반짝 기분 좋은 집"],
  ["cleaning_master", "청결마스터", ["aircon", "special"], [["서울특별시", "서초구"]], "professional", "에어컨과 특수청소 전문"],
  ["sky_cleaning", "하늘청소", ["move-in"], [["경기도", "성남시 분당구"]], "friendly", "구름 한 점 없는 청소"],
  ["smile_cleanup", "미소청소", ["regular", "move-out"], [["서울특별시", "송파구"]], "friendly", "미소가 번지는 청소"],
  ["perfect_order", "완벽한정리", ["move-in", "office"], [["서울특별시", "강서구"]], "professional", "빈 틈 없는 정리 정돈"],
  ["gentle_touch", "꼼꼼한손길", ["special", "aircon"], [["서울특별시", "관악구"]], "friendly", "손끝까지 꼼꼼하게"],
  ["cleaning_365", "365청소", ["regular"], [["서울특별시", "영등포구"]], "friendly", "매일 돌보는 365 케어"],
  ["prime_homecare", "프라임홈케어", ["move-in"], [["서울특별시", "성북구"]], "professional", "프라임 입주청소 솔루션"],
  ["cheongdam_clean", "청담클리닝", ["regular", "office"], [["서울특별시", "강남구"]], "professional", "강남 정기청소 노하우"],
  ["shiny_twice", "반짝반짝", ["move-out"], [["경기도", "고양시 덕양구"]], "playful", "두 번 반짝이는 마무리"],
  ["lighthouse_clean", "라이트하우스", ["aircon"], [["서울특별시", "동작구"]], "friendly", "에어컨 숨통을 틔워요"],
  ["green_clean", "그린클린", ["special"], [["경기도", "수원시 영통구"]], "friendly", "초록으로 안전하게"],
  ["clear_air_co", "맑은공기", ["aircon", "office"], [["서울특별시", "중구"]], "professional", "공기의 질을 설계합니다"],
];

const CUSTOMERS = [
  ["minsu_kim", "김민수"],
  ["jh_lee", "이정화"],
  ["sy_park", "박서연"],
  ["jh_choi", "최지훈"],
  ["yj_jung", "정유진"],
  ["sw_han", "한상욱"],
  ["ja_yoon", "윤지아"],
  ["hw_cho", "조현우"],
  ["ye_jang", "장예은"],
  ["dh_seo", "서도현"],
  ["mj_kang", "강민재"],
  ["hn_im", "임하늘"],
  ["js_oh", "오지수"],
  ["yb_no", "노유빈"],
  ["jh_moon", "문재희"],
  ["hn_koo", "구하나"],
  ["sh_baek", "백승호"],
  ["yr_shin", "신예린"],
  ["ty_hwang", "황태윤"],
  ["de_jin", "진다은"],
];

const STORY_CATEGORY_ROTATION = ["field", "howto", "gear", "life", "field", "howto", "gear", "life", "field", "howto", "gear", "life", "field", "howto", "gear"];

const CUSTOMER_STORY_SEEDS = [
  { authorCustomer: 0, category: "living", titleHint: "봄맞이 대청소 후 집이 이렇게 달라졌어요" },
  { authorCustomer: 3, category: "office", titleHint: "사무실 정기청소 6개월째 느낀 점" },
  { authorCustomer: 7, category: "aircon", titleHint: "여름 전 에어컨 청소 맡기고 효과 본 후기" },
  { authorCustomer: 10, category: "kitchen", titleHint: "주방 기름때 대청소하고 나서 요리가 즐거워졌다" },
  { authorCustomer: 14, category: "moving", titleHint: "이사 전 입주청소, 진짜 해야 하는 이유" },
];

// ─── 보조: 랜덤 비번 / 슬러그 ───────────────────────────
function genPassword() {
  return randomBytes(9).toString("base64").replace(/[/+]/g, "a").slice(0, 12);
}

function slugify(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30) || "post";
}

// ─── Gemini 포스트 생성 ──────────────────────────────────
const QUOTE_LABEL = {
  "move-in": "입주청소",
  office: "사무실청소",
  aircon: "에어컨청소",
  "move-out": "이사청소",
  special: "특수청소",
  regular: "정기청소",
};

const TONE_GUIDE = {
  friendly: "친근한 반말체",
  professional: "정중한 존댓말",
  playful: "유머 섞인 친근",
};

const CATEGORY_GUIDE = {
  field: { label: "현장 이야기", hint: "1인칭 시점 현장 체험기 · 지역·평수·상태 묘사" },
  howto: { label: "청소 노하우", hint: "구체 문제 정의 + 팁 3-5개" },
  gear: { label: "도구·약품 리뷰", hint: "써본 경험 · 장단점 균형" },
  life: { label: "청명 일상", hint: "작은 에피소드 + 짧은 소회" },
};

const postSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "20-50자 제목" },
    bodyMarkdown: {
      type: "string",
      description: "마크다운 본문 800-1200자",
    },
    summary80: { type: "string", description: "80자 이내 요약" },
  },
  required: ["title", "bodyMarkdown", "summary80"],
};

async function generatePost({ provider, storyCategory }) {
  if (!genAI) {
    return {
      title: `[${provider.companyName}] ${CATEGORY_GUIDE[storyCategory].label} 샘플 포스트`,
      bodyMarkdown: `## 샘플 포스트\n\n${CATEGORY_GUIDE[storyCategory].hint}\n\n실제 데모용 텍스트입니다.`,
      summary80: `${provider.companyName}의 ${CATEGORY_GUIDE[storyCategory].label} 샘플`,
    };
  }

  const cat = CATEGORY_GUIDE[storyCategory];
  const regions = provider.regions
    .slice(0, 2)
    .map((r) => `${r.city} ${r.district}`)
    .join(", ");
  const cats = provider.categories.map((c) => QUOTE_LABEL[c]).join(", ");
  const tone = TONE_GUIDE[provider.brandTone] || TONE_GUIDE.friendly;

  const system = `당신은 "${provider.companyName}" 청소 업체 운영자로서 커뮤니티 포스트 1개를 씁니다.
카테고리: ${cat.label} (${cat.hint})
톤: ${tone}
길이: 800-1200자
금지: 지어낸 수치·상호·인증·최저가 과장
JSON으로만 응답: { "title": "...", "bodyMarkdown": "...", "summary80": "..." }`;
  const user = `[청명 정보]
- 업체명: ${provider.companyName}
- 카테고리: ${cats}
- 지역: ${regions}
- 슬로건: ${provider.slogan}

${cat.label} 카테고리에 맞는 커뮤니티 포스트 1개를 써주세요. 지어낸 사실 없이 경험을 토대로.`;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: postSchema,
      temperature: 0.8,
    },
  });
  const result = await model.generateContent(user);
  const parsed = JSON.parse(result.response.text());
  return {
    title: String(parsed.title || "").slice(0, 60),
    bodyMarkdown: String(parsed.bodyMarkdown || ""),
    summary80: String(parsed.summary80 || "").slice(0, 120),
  };
}

async function generateCustomerStory(customerName, titleHint) {
  if (!genAI) {
    return {
      title: `${customerName}의 일상 — ${titleHint}`,
      bodyMarkdown: `## 샘플 고객 스토리\n\n${titleHint} 에 대한 짧은 일상 기록 샘플.`,
      summary80: titleHint,
    };
  }
  const system = `당신은 청광 플랫폼을 이용한 일반 고객으로서 자기 일상 이야기를 씁니다.
업체 홍보가 아닌 개인적인 생활 기록. 600-1000자. 친근한 반말체.
지어낸 수치·브랜드명 금지.
JSON: { "title": "...", "bodyMarkdown": "...", "summary80": "..." }`;
  const user = `[주제 힌트] ${titleHint}\n고객 이름: ${customerName}\n\n자연스러운 일상 블로그 포스트 1개를 작성해 주세요.`;
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: postSchema,
      temperature: 0.85,
    },
  });
  const result = await model.generateContent(user);
  const parsed = JSON.parse(result.response.text());
  return {
    title: String(parsed.title || "").slice(0, 60),
    bodyMarkdown: String(parsed.bodyMarkdown || ""),
    summary80: String(parsed.summary80 || "").slice(0, 120),
  };
}

// ─── 실행 ────────────────────────────────────────────────
async function createAccount(username, displayName, opts = {}) {
  const email = `${username}@cheonggwang.auth`;
  const password = genPassword();

  if (!APPLY) {
    return { uid: `dryrun_${username}`, email, password };
  }

  let existing;
  try {
    existing = await auth.getUserByEmail(email);
  } catch {
    /* 없으면 새로 생성 */
  }

  let uid;
  if (existing) {
    uid = existing.uid;
    // 비번 갱신
    await auth.updateUser(uid, { password, displayName });
  } else {
    const user = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });
    uid = user.uid;
  }

  const userPayload = {
    email: "",
    username,
    displayName,
    isSample: true,
    isCheonggwangPartner: false,
    updatedAt: FieldValue.serverTimestamp(),
    ...(opts.providerId ? { providerId: opts.providerId } : {}),
  };
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        ...userPayload,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { uid, email, password };
}

async function createProviderDoc({ uid, meta }) {
  const [username, companyName, categories, regionTuples, brandTone, slogan] =
    meta;
  const regions = regionTuples.map(([city, district]) => ({ city, district }));
  const providerRef = db.collection("providers").doc();
  const providerId = providerRef.id;

  if (APPLY) {
    await providerRef.set({
      ownerUid: uid,
      companyName,
      categories,
      regions,
      contactEmail: "",
      contactPhone: "010-0000-0000",
      description: slogan,
      isCheonggwangOwned: false,
      insured: false,
      insuranceAmount: null,
      verified: false,
      pageId: null,
      rating: 4.6 + Math.random() * 0.4, // 4.6 ~ 5.0
      reviewCount: 3 + Math.floor(Math.random() * 20),
      responseTimeHours: null,
      responseTimeMinutes: 5 + Math.floor(Math.random() * 30),
      completedWorkCount: 10 + Math.floor(Math.random() * 200),
      repeatRate: 0.5 + Math.random() * 0.4,
      yearsOfExperience: 1 + Math.floor(Math.random() * 10),
      isAvailable: true,
      priceBook: [],
      brandTone,
      slogan,
      lastPromoPostAt: null,
      isSample: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // users doc에 providerId 링크 + roles
  if (APPLY) {
    await db.collection("users").doc(uid).set(
      {
        providerId,
        roles: FieldValue.arrayUnion("provider"),
      },
      { merge: true },
    );
  }

  return {
    providerId,
    provider: { companyName, categories, regions, brandTone, slogan },
  };
}

async function createPostDoc({ providerId, ownerUid, companyName, categories, regions, storyCategory, gen }) {
  if (!APPLY) return { skipped: true };
  const postsCol = db.collection("posts");
  const postRef = postsCol.doc();
  const postId = postRef.id;
  const slug = `${slugify(gen.title)}-${postId.slice(0, 6)}`;
  const regionLabel = regions[0] ? `${regions[0].city} ${regions[0].district}` : null;
  await postRef.set({
    providerId,
    providerOwnerUid: ownerUid,
    companyName,
    categories,
    regionLabel,
    title: gen.title,
    slug,
    coverImageUrl: null,
    coverImageAlt: gen.title,
    bodyMarkdown: gen.bodyMarkdown,
    summary80: gen.summary80,
    topicHint: null,
    brandTone: "friendly",
    postType: "provider",
    storyCategory,
    isSample: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { postId, slug };
}

async function createCustomerStoryDoc({ customerUid, customerName, gen }) {
  if (!APPLY) return { skipped: true };
  const postsCol = db.collection("posts");
  const postRef = postsCol.doc();
  const postId = postRef.id;
  const slug = `${slugify(gen.title)}-${postId.slice(0, 6)}`;
  await postRef.set({
    providerId: "customer",
    providerOwnerUid: customerUid,
    companyName: customerName,
    categories: [],
    regionLabel: null,
    title: gen.title,
    slug,
    coverImageUrl: null,
    coverImageAlt: gen.title,
    bodyMarkdown: gen.bodyMarkdown,
    summary80: gen.summary80,
    topicHint: null,
    brandTone: "friendly",
    postType: "customer-story",
    isSample: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { postId, slug };
}

(async () => {
  console.log(`mode: ${APPLY ? "APPLY" : "DRY-RUN"} · model: ${MODEL}`);
  const credRows = ["type\tusername\tdisplayName\tpassword"];

  // Phase 1: customers (AI 응답 없이 빠름)
  console.log(`\n[Phase 1/4] 고객 계정 ${CUSTOMERS.length}명 생성`);
  const customers = [];
  for (const [username, displayName] of CUSTOMERS) {
    const { uid, password } = await createAccount(username, displayName);
    customers.push({ uid, username, displayName, password });
    credRows.push(`customer\t${username}\t${displayName}\t${password}`);
    console.log(`  ✓ ${displayName} (${username})`);
  }

  // Phase 2: providers (auth + users + providers docs)
  console.log(`\n[Phase 2/4] 청명 계정 ${PROVIDERS.length}명 생성`);
  const providers = [];
  for (const meta of PROVIDERS) {
    const [username, displayName] = meta;
    const { uid, password } = await createAccount(username, displayName);
    const { providerId, provider } = await createProviderDoc({ uid, meta });
    providers.push({ uid, username, displayName, password, providerId, ...provider });
    credRows.push(`provider\t${username}\t${displayName}\t${password}`);
    console.log(`  ✓ ${displayName} (${username}) · providerId=${providerId.slice(0, 8)}`);
  }

  // Phase 3: provider 포스트 (Gemini 호출 × 15)
  console.log(`\n[Phase 3/4] 청명 포스트 생성 (Gemini × ${providers.length})`);
  for (let i = 0; i < providers.length; i++) {
    const p = providers[i];
    const storyCategory = STORY_CATEGORY_ROTATION[i % STORY_CATEGORY_ROTATION.length];
    console.log(`  [${i + 1}/${providers.length}] ${p.companyName} → ${storyCategory}`);
    try {
      const gen = await generatePost({ provider: p, storyCategory });
      if (gen.bodyMarkdown.length < 400) {
        console.warn(`    WARN body=${gen.bodyMarkdown.length}자 · 저장은 진행`);
      }
      const r = await createPostDoc({
        providerId: p.providerId,
        ownerUid: p.uid,
        companyName: p.companyName,
        categories: p.categories,
        regions: p.regions,
        storyCategory,
        gen,
      });
      if (!r.skipped) console.log(`    → /${r.slug.slice(0, 40)} · ${gen.bodyMarkdown.length}자`);
    } catch (err) {
      console.error(`    FAIL:`, err?.message || err);
    }
  }

  // v1.7 P8: customer-story 패널 제거됨 — Phase 4 비활성화.
  // partner-promo 시드는 v1.8에서 별도 추가 (partners 컬렉션 + partner-promo 글 묶음).
  console.log(`\n[Phase 4/4] (skipped — customer-story removed in v1.7 P8)`);

  // 자격증명 덤프
  const credPath = "/Users/VIBRA_PETER/dev/cheonggwang/scripts/.sample-credentials.txt";
  writeFileSync(credPath, credRows.join("\n") + "\n", "utf8");
  console.log(`\ncredentials written: ${credPath}`);

  console.log(`\n✅ done · mode=${APPLY ? "APPLY" : "DRY-RUN"}`);
  process.exit(0);
})().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
