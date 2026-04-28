import type { PostType } from "@/types/post";
import { PANELS, type PanelSlug } from "./panel-config";

/**
 * v1.15 cycle #28 partner-aeo-boost · §3.4 (M6 결의).
 *
 * postType ↔ panel slug/label 매퍼. BreadcrumbList JSON-LD 빌더 + 기타 panel-aware UI에서 사용.
 */

const POST_TYPE_TO_PANEL_SLUG: Record<PostType, PanelSlug> = {
  tip: "tips",
  provider: "providers",
  "partner-promo": "partners",
};

export function postTypeToPanelSlug(postType: PostType): PanelSlug {
  return POST_TYPE_TO_PANEL_SLUG[postType];
}

export function panelLabelForPost(post: { postType: PostType }): string {
  return PANELS[postTypeToPanelSlug(post.postType)].label;
}
