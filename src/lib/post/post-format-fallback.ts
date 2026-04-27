import { isPostFormat, type PostFormat } from "@/domain/post-format";
import type { Post } from "@/types/post";

/**
 * v1.12 cycle #25 · R1 안전망.
 *
 * Post의 format 필드가 누락되었거나 미지원 값일 때 'blog' 기본값을 반환.
 * partner-promo 외 postType은 format 무시 — 항상 'blog' 렌더링 (cycle #19/#20 회귀 방지).
 */
export function postFormatFallback(post: Post): PostFormat {
  if (post.postType !== "partner-promo") return "blog";
  if (isPostFormat(post.format)) return post.format;
  return "blog";
}
