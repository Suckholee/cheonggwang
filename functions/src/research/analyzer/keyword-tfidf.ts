import { SchemaType, type Schema } from "@google/generative-ai";
import type { GeminiClient } from "../lib/gemini";
import type { NormalizedSource } from "../types/source";
import type { KeywordEntry } from "../types/insight";
import {
  HYGIENE_KEYWORDS,
  CATEGORY_LABELS,
  type Category,
} from "../types/shared";

/**
 * 경량 한국어·영어 토크나이저.
 * - 한글: 2~10자 syllable 시퀀스
 * - 영어: 3~15자 alphanumeric
 * - 숫자·구두점·이모지는 제거
 */
const KOREAN_RE = /[가-힣]{2,10}/g;
const ENGLISH_RE = /[a-zA-Z]{3,15}/g;

const STOPWORDS = new Set<string>([
  // 한국어 빈출 불용어
  "그리고",
  "하지만",
  "그래서",
  "오늘",
  "어제",
  "내일",
  "정말",
  "진짜",
  "아주",
  "매우",
  "너무",
  "조금",
  "많이",
  "약간",
  "이번",
  "저번",
  "다음",
  "이것",
  "저것",
  "그것",
  "여기",
  "저기",
  "거기",
  "그냥",
  "근데",
  "해서",
  "같이",
  "정도",
  "때문",
  "경우",
  "무엇",
  "어떤",
  "어느",
  "전부",
  "모두",
  "좋은",
  "나쁜",
  "있는",
  "없는",
  "하는",
  "되는",
  "보는",
  "가는",
  "오는",
  "먹는",
  "사는",
  "입니다",
  "합니다",
  "됩니다",
  "습니다",
  // 영어 stopwords
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "have",
  "been",
  "will",
  "would",
  "could",
  "should",
  "into",
  "onto",
  "about",
  "after",
  "before",
]);

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const korean = text.match(KOREAN_RE) ?? [];
  const english = text.match(ENGLISH_RE) ?? [];
  for (const t of korean) tokens.push(t);
  for (const t of english) tokens.push(t.toLowerCase());
  return tokens;
}

interface Scored {
  term: string;
  score: number;
}

/**
 * 각 샘플을 문서로 취급해 TF-IDF 상위 100개 후보 산출.
 * score = sum over docs (tf * log(N / (1 + df)))
 */
export function computeLocalTfidf(samples: NormalizedSource[]): Scored[] {
  const docs: Map<string, number>[] = samples.map((s) => {
    const text = [s.title, s.snippet, s.body ?? ""].join(" ");
    const freq = new Map<string, number>();
    for (const tok of tokenize(text)) {
      if (STOPWORDS.has(tok)) continue;
      freq.set(tok, (freq.get(tok) ?? 0) + 1);
    }
    return freq;
  });

  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of doc.keys()) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const N = docs.length || 1;
  const scores = new Map<string, number>();
  for (const doc of docs) {
    for (const [term, tf] of doc) {
      const dfn = df.get(term) ?? 1;
      const tfidf = tf * Math.log(N / (1 + dfn));
      scores.set(term, (scores.get(term) ?? 0) + tfidf);
    }
  }

  return Array.from(scores.entries())
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);
}

const SYSTEM = `당신은 한국 지역 상권 소상공인 마케팅 키워드를 선별하는 데이터 분석가입니다.
입력된 TF-IDF 후보 중 마케팅 문구 생성에 실제로 유용할 용어만 골라냅니다.
주관적 평가 금지, 기계적 필터링 원칙.`;

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    topKeywords: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          term: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
        },
        required: ["term", "score"],
      },
    },
  },
  required: ["topKeywords"],
};

/**
 * 로컬 TF-IDF 상위 100개 → Gemini가 30개 정제.
 * §7.4 원칙:
 *   - 일반어 제외 (stopwords는 로컬에서 1차 필터)
 *   - 개인정보 제외
 *   - §1.2 hygiene 격리: 청결 어휘는 절대 포함 금지
 */
export async function analyzeKeywords(
  samples: NormalizedSource[],
  category: Category,
  gemini: GeminiClient
): Promise<KeywordEntry[]> {
  const candidates = computeLocalTfidf(samples);
  if (candidates.length === 0) return [];

  const forbidden = HYGIENE_KEYWORDS.join(", ");
  const candidateList = candidates.map((c) => c.term).join(", ");

  const prompt = `업종: ${CATEGORY_LABELS[category]}
TF-IDF 상위 후보 ${candidates.length}개:
${candidateList}

조건:
- 일반 부사·연결어 등 의미 없는 단어 제외
- 사람 이름·전화번호 등 개인정보 제외
- 다음 어휘는 절대 포함 금지 (promo-page §1.2 위생 격리): ${forbidden}
- 업종 마케팅 문구 생성에 실제 도움이 되는 용어만 선별
- 상위 30개를 score 내림차순으로 반환 (score는 입력 후보의 상대적 중요도 0~1)`;

  const result = await gemini.call<{ topKeywords: KeywordEntry[] }>({
    systemInstruction: SYSTEM,
    prompt,
    schema: SCHEMA,
    temperature: 0.1,
  });

  // 2차 방어: Gemini가 실수로 청결 어휘를 포함하면 서버에서 제거
  return (result.topKeywords ?? [])
    .filter((k) => k.term && !HYGIENE_KEYWORDS.includes(k.term))
    .slice(0, 30)
    .map((k) => ({ term: String(k.term).slice(0, 30), score: Number(k.score) || 0 }));
}
