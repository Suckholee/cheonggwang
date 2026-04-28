import "server-only";

/**
 * v1.15 cycle #28 partner-aeo-boost · §3.4 (S2).
 *
 * BreadcrumbList JSON-LD 빌더. position은 1-based (schema.org spec).
 * community/p/[slug] 글 페이지에서만 사용 (M9 — /p/[slug] 매장은 LocalBusiness 단독).
 */

export interface BreadcrumbListNode {
  "@type": "BreadcrumbList";
  itemListElement: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }>;
}

export function buildBreadcrumbListNode(
  items: Array<{ name: string; url: string }>,
): BreadcrumbListNode {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
