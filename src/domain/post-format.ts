/**
 * v1.12 cycle #25 partner-content-formats · §2.1 — 콘텐츠 형식.
 *
 * - 'blog'      : 마크다운 본문 (cycle #19 기존 형식, 800~1200자)
 * - 'card-news' : `\n@@SLIDE@@\n`으로 구분된 슬라이드 시퀀스 (6~10개, 각 80~150자)
 *
 * 레거시 post(필드 없음)는 `postFormatFallback`이 'blog'로 매핑.
 */

export type PostFormat = "blog" | "card-news";

export const POST_FORMATS: PostFormat[] = ["blog", "card-news"];

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  blog: "블로그글",
  "card-news": "카드뉴스",
};

export const POST_FORMAT_EMOJI: Record<PostFormat, string> = {
  blog: "📝",
  "card-news": "🖼️",
};

export function isPostFormat(v: unknown): v is PostFormat {
  return v === "blog" || v === "card-news";
}
