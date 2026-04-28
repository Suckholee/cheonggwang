/**
 * v1.15 cycle #28 partner-aeo-boost · §3.1 (S1).
 *
 * markdown 본문에서 [자주 묻는 질문] 섹션을 정규식으로 파싱해 Q/A 쌍 추출.
 *
 * 호환 입력 (헤더 변형):
 *   "## 자주 묻는 질문" / "## 자주묻는 질문" (공백 변형)
 *   "### Q1. 질문..." / "### Q1: 질문..." / "### Q1) 질문..."
 *
 * 답변은 다음 ### 또는 다음 ## (섹션 종료) 또는 EOF까지의 단락.
 *
 * graceful fallback (R9): 매칭 0개 → 빈 배열. 호출자는 FAQPage @graph item 추가 안 함.
 *
 * v1 한국어 한정 (L2 — cycle #29+에서 다국어 확장).
 */

export interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ_SECTION_HEADER = /^##\s*자주\s*묻는\s*질문\s*$/m;
const QUESTION_LINE_RE =
  /^###\s*Q\s*\d+\s*[.:)]\s*(.+?)\s*$/gim;
const NEXT_H2_OR_END = /\n##\s+/;

export function extractFaqsFromMarkdown(body: string): FaqEntry[] {
  if (!body || typeof body !== "string") return [];

  const sectionMatch = FAQ_SECTION_HEADER.exec(body);
  if (!sectionMatch) return [];

  const sectionStart = sectionMatch.index + sectionMatch[0].length;
  const rest = body.slice(sectionStart);
  const terminator = NEXT_H2_OR_END.exec(rest);
  const sectionEnd = terminator
    ? sectionStart + terminator.index
    : body.length;
  const section = body.slice(sectionStart, sectionEnd);

  // 질문 매칭 위치 모두 수집
  const matches: Array<{ q: string; headerStart: number; headerEnd: number }> =
    [];
  QUESTION_LINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = QUESTION_LINE_RE.exec(section)) !== null) {
    matches.push({
      q: m[1].trim(),
      headerStart: m.index,
      headerEnd: m.index + m[0].length,
    });
  }
  if (matches.length === 0) return [];

  // 각 질문의 답변: 자기 헤더 끝 ~ 다음 질문 헤더 시작 (또는 섹션 끝)
  const result: FaqEntry[] = [];
  for (let i = 0; i < matches.length; i++) {
    const answerStart = matches[i].headerEnd;
    const answerEnd =
      i + 1 < matches.length ? matches[i + 1].headerStart : section.length;
    const answer = section.slice(answerStart, answerEnd).trim();
    if (answer.length === 0) continue; // 빈 답변은 제외 (case 6)
    result.push({ question: matches[i].q, answer });
  }
  return result;
}
