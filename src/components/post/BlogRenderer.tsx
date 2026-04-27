import { renderMarkdown } from "@/lib/markdown";

/**
 * v1.12 cycle #25 partner-content-formats · §5.5 (H3 결의).
 *
 * cycle #19 PostDetailView의 본문 markdown 렌더 부분을 추출한 server component.
 * `prose-promo` class + sanitize-html된 HTML div.
 *
 * 사용처: PostBodyRenderer 내부 (format='blog' 분기 + partner-promo 외 postType 모두).
 */
export function BlogRenderer({ body }: { body: string }) {
  const html = renderMarkdown(body);
  return (
    <div
      className="prose-promo space-y-4 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
      // eslint-disable-next-line react/no-danger -- sanitize-html로 안전화
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
