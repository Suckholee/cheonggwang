import type { Post } from "@/types/post";

/**
 * v1.16 cycle #29 partner-editorial-oversight · §3.3 (G2).
 *
 * AI 작성 명시 footer — 한국 광고법 2026년 초 시행 대비.
 *
 * R14 (footer scope):
 *   isAutoSeries === true && postType === 'partner-promo' 만 표시.
 *   사장님 직접 작성 글, tip/provider postType은 footer 없음 (광고법은 AI 작성에만 적용).
 *
 * N8 결의: AI_FOOTER_MARKDOWN으로 markdown 단계 append → renderMarkdown sanitize 파이프라인 통과.
 *   향후 footer parameterize 시 XSS 방어.
 */

export const AI_FOOTER_TEXT =
  "이 글은 AI가 매장이 제공한 정보를 바탕으로 작성한 후 매장에서 검토했습니다";

/**
 * markdown으로 append → marked + sanitize-html이 안전한 HTML로 변환.
 * `---` (horizontal rule) + 기울기 italic으로 본문과 자연스러운 구분.
 */
export const AI_FOOTER_MARKDOWN = `\n\n---\n\n*${AI_FOOTER_TEXT}*`;

export function shouldShowAiFooter(
  post: Pick<Post, "isAutoSeries" | "postType">,
): boolean {
  return post.isAutoSeries === true && post.postType === "partner-promo";
}
