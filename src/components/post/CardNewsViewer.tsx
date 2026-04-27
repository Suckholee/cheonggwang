import { renderMarkdown } from "@/lib/markdown";
import { parseCardNewsSlides } from "@/lib/post/parse-card-news-slides";
import { CardNewsPaginator } from "./CardNewsPaginator";

/**
 * v1.12 cycle #25 partner-content-formats · §5.3 (H1 결의).
 *
 * **Server component wrapper** — `\n@@SLIDE@@\n` sentinel로 슬라이드 분할 후
 * 각 슬라이드를 server-only `renderMarkdown`으로 미리 HTML 처리.
 * 결과 HTML 배열을 client component `CardNewsPaginator`에 prop으로 전달.
 *
 * 이 분리 패턴으로 server-only 마크다운 렌더러를 유지하면서도
 * 클라이언트 인터랙션(스와이프·dots·키보드)을 지원.
 */
export function CardNewsViewer({ body }: { body: string }) {
  const slides = parseCardNewsSlides(body);

  // 슬라이드 0건이면 (parser 실패) BlogRenderer fallback 효과를 위해 통째 렌더
  if (slides.length === 0) {
    const html = renderMarkdown(body);
    return (
      <div
        className="prose-promo space-y-4 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const slideHtmls = slides.map((s) => renderMarkdown(s));

  return <CardNewsPaginator slideHtmls={slideHtmls} />;
}
