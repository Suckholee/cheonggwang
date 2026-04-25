/**
 * v1.4 #1 provider-promo-content — 한글 포함 slug 생성.
 * Unicode regex `\p{L}\p{N}` requires ES2018+ target.
 */
export function titleToSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return slug || "post";
}
