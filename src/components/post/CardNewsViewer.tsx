import { renderMarkdown } from "@/lib/markdown";
import { parseCardNewsSlides } from "@/lib/post/parse-card-news-slides";
import { CardNewsPaginator } from "./CardNewsPaginator";
import {
  shouldShowAiFooter,
  AI_FOOTER_TEXT,
  AI_FOOTER_MARKDOWN,
} from "@/lib/seo/ai-footer";
import type { Post } from "@/types/post";

/**
 * v1.12 cycle #25 partner-content-formats · §5.3 (H1 결의 + 디자인 보완 v0.3).
 *
 * **Server component wrapper** — `\n@@SLIDE@@\n` sentinel로 슬라이드 분할 후
 * 각 슬라이드를 server-only `renderMarkdown`으로 미리 HTML 처리.
 *
 * v0.3 디자인 보완: post 전체를 받아 슬라이드별 배경 이미지(라운드 로빈) +
 * 매장명·시리얼 넘버 워터마크를 paginator에 전달. 핀터레스트·인스타 카드뉴스 패턴.
 */
export function CardNewsViewer({ post }: { post: Post }) {
  const slides = parseCardNewsSlides(post.bodyMarkdown);
  const showFooter = shouldShowAiFooter(post);

  // 슬라이드 0건이면 (parser 실패) 본문 통째 markdown 렌더 fallback
  // v1.16 cycle #29 (N9 결의): parser-fail branch도 footer 표시 + Fragment wrapping
  if (slides.length === 0) {
    const md = post.bodyMarkdown + (showFooter ? AI_FOOTER_MARKDOWN : "");
    const html = renderMarkdown(md);
    return (
      <div
        className="prose-promo space-y-4 text-[15px] leading-7 text-zinc-800 dark:text-zinc-200"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const slideHtmls = slides.map((s) => renderMarkdown(s));

  // 슬라이드 배경 이미지: sourcePhotos > coverImageUrl 라운드 로빈
  const photoPool: string[] = [];
  if (post.sourcePhotos && post.sourcePhotos.length > 0) {
    photoPool.push(...post.sourcePhotos);
  } else if (post.coverImageUrl) {
    photoPool.push(post.coverImageUrl);
  }

  return (
    <>
      <CardNewsPaginator
        slideHtmls={slideHtmls}
        photoPool={photoPool}
        companyName={post.companyName}
      />
      {showFooter && (
        <p className="mt-6 px-4 text-center text-xs italic text-zinc-500 dark:text-zinc-400">
          {AI_FOOTER_TEXT}
        </p>
      )}
    </>
  );
}
