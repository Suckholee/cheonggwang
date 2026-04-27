import { postFormatFallback } from "@/lib/post/post-format-fallback";
import { BlogRenderer } from "./BlogRenderer";
import { CardNewsViewer } from "./CardNewsViewer";
import type { Post } from "@/types/post";

/**
 * v1.12 cycle #25 partner-content-formats · §5.4 (H2 결의).
 *
 * Post의 format에 따라 BlogRenderer 또는 CardNewsViewer로 분기하는 단일 진입점.
 *
 * - postType !== 'partner-promo' → 항상 BlogRenderer (cycle #19/#20 회귀 방지)
 * - partner-promo + format='card-news' → CardNewsViewer (슬라이드)
 * - partner-promo + format='blog' (또는 누락 fallback) → BlogRenderer
 *
 * 사용처: PostDetailView 본문 영역 + (필요 시) preview/edit 미리보기 영역.
 * "사장님이 미리보기에서 본 모습 = 손님이 공개페이지에서 보는 모습"의 단일 보장.
 */
export function PostBodyRenderer({ post }: { post: Post }) {
  if (post.postType !== "partner-promo") {
    return <BlogRenderer body={post.bodyMarkdown} />;
  }
  const format = postFormatFallback(post);
  if (format === "card-news") {
    return <CardNewsViewer body={post.bodyMarkdown} />;
  }
  return <BlogRenderer body={post.bodyMarkdown} />;
}
