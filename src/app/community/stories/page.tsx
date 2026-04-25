import { permanentRedirect } from "next/navigation";

/**
 * v1.7 P8 — `/community/stories` 패널은 partner-promo 패널로 대체됨.
 * 기존 SEO 자산(외부 링크·Google 인덱싱) 유지를 위해 308 permanent redirect.
 */
export default function DeprecatedCommunityStoriesPage(): never {
  permanentRedirect("/community/partners");
}
