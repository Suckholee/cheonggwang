import type { Page } from "@/types/page";

/** 양쪽 whitespace 정리 후 leading `#` 제거. */
export function normalizeSearchQuery(raw: string): string {
  return raw.trim().replace(/^#+/, "");
}

/**
 * 빈 쿼리는 전체 통과. 대소문자 무시. 태그는 leading `#` 제거하고 비교.
 * v0.2 (I3 fix).
 */
export function matchesSearch(post: Page, query: string): boolean {
  const q = normalizeSearchQuery(query).toLowerCase();
  if (!q) return true;
  if (post.businessName.toLowerCase().includes(q)) return true;
  if (post.tags.some((t) => t.replace(/^#/, "").toLowerCase().includes(q)))
    return true;
  const subtitle = post.sections.hero.subtitle ?? "";
  if (subtitle.toLowerCase().includes(q)) return true;
  return false;
}
