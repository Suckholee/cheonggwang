import { permanentRedirect } from "next/navigation";

/**
 * v1.6 Phase 4.5 — 고객 스크랩북 영역(/stories/new)으로 이전됨.
 * 레거시 URL 유지 · 301 리다이렉트.
 */
export default function DeprecatedCommunityStoriesUploadPage() {
  permanentRedirect("/stories/new");
}
