import sanitizeHtml from "sanitize-html";

/**
 * HTML을 평문으로 정제. 태그 전부 제거 + 다공백 1칸으로 압축.
 */
export function cleanHtml(html: string): string {
  const stripped = sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return stripped.replace(/\s+/g, " ").trim();
}

const PHONE_RE = /\b\d{2,3}-\d{3,4}-\d{4}\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

/**
 * 개인정보(전화번호·이메일) 마스킹.
 * 원본 수집 직후 Normalizer에서 적용해 Firestore에 PII가 저장되지 않도록 한다.
 */
export function maskPII(text: string): string {
  return text.replace(PHONE_RE, "[PHONE]").replace(EMAIL_RE, "[EMAIL]");
}

export function cleanAndMask(html: string): string {
  return maskPII(cleanHtml(html));
}
