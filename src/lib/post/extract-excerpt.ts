/**
 * v1.12 cycle #25 partner-content-formats · §1.1 #3.
 *
 * markdown 본문에서 plain text 발췌 추출.
 * 카드 그리드에서 `post.summary80`이 비어있을 때 폴백.
 *
 * Strategy:
 *  - markdown heading(#)·list 마크(-, *, 1.) 제거
 *  - 코드 펜스(```) 블록 통째 제거
 *  - 링크 [text](url) → text
 *  - 이미지 ![alt](url) → 제거
 *  - bold/italic/inline-code → 텍스트만 남김
 *  - card-news sentinel `@@SLIDE@@` → 공백
 *  - 연속 whitespace → 단일 공백
 *  - max 길이로 truncate, '…' 부착
 */
export function extractExcerpt(body: string, max = 100): string {
  if (!body) return "";

  let text = body;

  // 코드 펜스 블록 제거
  text = text.replace(/```[\s\S]*?```/g, "");
  // 인라인 코드
  text = text.replace(/`([^`]+)`/g, "$1");
  // 이미지
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  // 링크
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // heading
  text = text.replace(/^#{1,6}\s+/gm, "");
  // list 마크
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");
  // bold·italic
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  // card-news sentinel
  text = text.replace(/@@SLIDE@@/g, " ");
  // 가로줄
  text = text.replace(/^---+$/gm, "");
  // 연속 whitespace
  text = text.replace(/\s+/g, " ").trim();

  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}
