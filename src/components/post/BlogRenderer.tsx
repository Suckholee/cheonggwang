import { renderMarkdown } from "@/lib/markdown";
import {
  shouldShowAiFooter,
  AI_FOOTER_MARKDOWN,
} from "@/lib/seo/ai-footer";
import type { Post } from "@/types/post";

/**
 * v1.12 cycle #25 partner-content-formats · §5.5 (H3 결의).
 * v1.16 cycle #29 (M3 결의 + N8 sanitize 통과):
 *   prop을 { body } → { post }로 변경. partner-promo + isAutoSeries 시 footer markdown으로 append.
 *
 * cycle #19 PostDetailView의 본문 markdown 렌더 부분을 추출한 server component.
 * `prose-promo` class + sanitize-html된 HTML div.
 *
 * 사용처: PostBodyRenderer 내부 (format='blog' 분기 + partner-promo 외 postType 모두).
 */
export function BlogRenderer({ post }: { post: Post }) {
  // N8: footer를 markdown 단계에서 append → renderMarkdown sanitize 파이프라인 통과 (XSS 방어)
  const md =
    post.bodyMarkdown +
    (shouldShowAiFooter(post) ? AI_FOOTER_MARKDOWN : "");
  const html = renderMarkdown(md);
  return (
    <div
      className="prose-promo space-y-4 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
      // eslint-disable-next-line react/no-danger -- sanitize-html로 안전화
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
